import { createReadStream, createWriteStream } from "node:fs";
import {
  unlink,
  mkdir,
  rename,
  access,
  writeFile,
  readFile,
  stat,
  readdir,
  rmdir,
} from "node:fs/promises";
import type { Readable, Writable } from "node:stream";
import { dirname, join } from "node:path";

import pAll from "p-all";
import pRetry from "p-retry";
import mime from "mime-types";

import { execPromise } from "@/util/execPromise";
import { type SaveOptions, Storage } from "@google-cloud/storage";
import { uuidv4 } from "lib0/random";
import { createReadableStreamFromReadable } from "@react-router/node";
import { logger } from "@/logging";
import { WithSpan, setSpanAttributes } from "@/tracing";
import { readIntoBuffer } from "./readIntoBuffer";

const storage = new Storage();
const bucket = storage.bucket(process.env.STORAGE_BUCKET!);
export const UPLOAD_TO_BUCKET = process.env.UPLOAD_TO_BUCKET === "true";

export interface StorageStreamOptions {
  start?: number;
  end?: number;
  contentType?: string;
}

export interface PersistentStorage {
  deletePath(path: string): Promise<void>;
  pathExists(path: string): Promise<boolean>;
  createReadStream(key: string, opts?: StorageStreamOptions): Promise<Readable>;
  createWriteStream(
    key: string,
    opts?: StorageStreamOptions,
  ): Promise<Writable>;
  createResumableWriteStream(key: string, start: number): Promise<Writable>;
  mergePaths(keys: string[], prfix: string, destination: string): Promise<void>;
  serveFile(
    path: string,
    opts?: {
      disposition?: "inline" | "attachment";
      downloadAs?: string;
      mimeType?: string | null;
      range?: string;
    },
  ): Promise<Response>;
  serveVideo(path: string): Promise<Response>;
  writeFile(
    path: string,
    content: string | Buffer,
    options?: SaveOptions,
  ): Promise<void>;
  readFile(path: string): Promise<Buffer>;
  createResumableUploadURI: (key: string) => Promise<string>;
  getLength(path: string): Promise<number>;
}

class OnHostStorage implements PersistentStorage {
  @WithSpan()
  async deletePath(key: string) {
    const path = join(process.cwd(), "data", key);
    setSpanAttributes({ path });
    await unlink(path);

    // Check if directory is empty and remove it if so
    const dirPath = dirname(path);
    const files = await readdir(dirPath);
    if (files.length === 0) {
      try {
        await rmdir(dirPath);
      } catch (error) {
        logger.error(error, "Error removing empty directory");
      }
    }
  }

  @WithSpan()
  async createReadStream(key: string, opts?: StorageStreamOptions) {
    const path = join(process.cwd(), "data", key);
    setSpanAttributes({ path, opts: JSON.stringify(opts) });
    logger.trace({ path, opts }, "Creating read stream for path");
    return createReadStream(path, opts);
  }

  @WithSpan()
  async createResumableUploadURI(key: string) {
    setSpanAttributes({ key });
    return `local:${key}`;
  }

  @WithSpan()
  async createWriteStream(key: string, opts?: StorageStreamOptions) {
    const path = join(process.cwd(), "data", key);
    const tmpPath = `${path}.tmp`;
    setSpanAttributes({ path, opts: JSON.stringify(opts) });
    logger.trace({ path, opts }, "Creating write stream for path");
    await mkdir(dirname(path), { recursive: true });
    const writeStream = createWriteStream(tmpPath, opts);

    writeStream.on("finish", () => {
      logger.trace(`Renaming ${tmpPath} to: ${path}`);
      rename(tmpPath, path)
        .then(() => {
          logger.trace("Renamed file");
          writeStream.emit("finalized");
        })
        .catch((err) => {
          logger.error(err, "Error renaming file");
          writeStream.emit("error", err);
        });
    });

    return writeStream;
  }

  @WithSpan()
  async createResumableWriteStream(key: string, start: number) {
    const path = join(process.cwd(), "data", key);
    const tmpPath = `${path}.tmp`;
    setSpanAttributes({ path, start: String(start) });
    logger.trace({ path }, "Creating write stream for path");
    await mkdir(dirname(path), { recursive: true });
    const writeStream = createWriteStream(tmpPath, {
      start,
      flags: "a",
    });

    writeStream.on("finish", () => {
      logger.trace(`Renaming ${tmpPath} to: ${path}`);
      const readStream = createReadStream(tmpPath);
      const finalWriteStream = createWriteStream(path, {
        start,
        flags: "a",
      });
      readStream.pipe(finalWriteStream);
      finalWriteStream.on("finish", () => {
        logger.trace("Finalized write stream");
        writeStream.emit("finalized");
        unlink(tmpPath);
        logger.trace({ tmpPath }, "Unlinked tmp file");
      });
    });

    return writeStream;
  }

  @WithSpan()
  async pathExists(key: string) {
    const path = join(process.cwd(), "data", key);
    setSpanAttributes({ path });
    logger.trace({ path }, "Checking if path exists");
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  @WithSpan()
  async mergePaths(keys: string[], prefix: string, destination: string) {
    const prefixDir = join(process.cwd(), "data", prefix);
    setSpanAttributes({ prefixDir });
    await mkdir(prefixDir, { recursive: true });
    const [finalPath] = await compose(
      keys.map((key) => join(process.cwd(), "data", key)),
      async (keys) => {
        const compositionPath = join(prefixDir, uuidv4());
        await execPromise(`cat ${keys.join(" ")} > ${compositionPath}`);
        return compositionPath;
      },
    );
    await rename(finalPath!, join(process.cwd(), "data", destination));
  }

  @WithSpan()
  async serveFile(
    key: string,
    opts?: {
      disposition?: "inline" | "attachment";
      range?: string;
      downloadAs?: string;
      mimeType?: string | null;
    },
  ) {
    const path = join(process.cwd(), "data", key);
    setSpanAttributes({ path, opts: JSON.stringify(opts) });
    const headers: Record<string, string> = {
      "Content-Type": opts?.mimeType || "application/octet-stream",
    };
    if (opts?.disposition) {
      headers["Content-Disposition"] =
        `${opts.disposition}; filename="${opts.downloadAs || key}"`;
    }

    // Get file stats for total size
    const stats = await stat(path);
    const fileSize = stats.size;

    if (opts?.range) {
      // Parse range header (e.g., "bytes=0-1023")
      const rangeMatch = opts.range.match(/bytes=(\d+)-(\d*)/);
      if (rangeMatch && rangeMatch[1]) {
        const start = parseInt(rangeMatch[1], 10);
        const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;

        // Ensure end doesn't exceed file size
        const actualEnd = Math.min(end, fileSize - 1);
        const contentLength = actualEnd - start + 1;

        const fileStream = createReadStream(path, {
          start,
          end: actualEnd,
        });

        headers["Content-Range"] = `bytes ${start}-${actualEnd}/${fileSize}`;
        headers["Content-Length"] = `${contentLength}`;
        headers["Accept-Ranges"] = "bytes";

        return new Response(createReadableStreamFromReadable(fileStream), {
          status: 206,
          headers,
        });
      }
    }

    // No range request - return entire file
    headers["Content-Length"] = `${fileSize}`;
    headers["Accept-Ranges"] = "bytes";

    const fileStream = createReadStream(path);
    return new Response(createReadableStreamFromReadable(fileStream), {
      status: 200,
      headers,
    });
  }

  @WithSpan()
  async serveVideo(key: string) {
    const path = join(process.cwd(), "data", key);
    setSpanAttributes({ path });
    const fileStream = createReadStream(path);
    const headers: Record<string, string> = {
      "Content-Type": "video/mp4",
      "Content-Disposition": "inline",
    };
    return new Response(createReadableStreamFromReadable(fileStream), {
      status: 200,
      headers,
    });
  }

  @WithSpan()
  async writeFile(
    key: string,
    contents: string | Buffer,
    options?: SaveOptions,
  ) {
    const path = join(process.cwd(), "data", key);
    const filedir = dirname(path);
    // setSpanAttributes({ path, filedir });
    // Ensure directory exists for local writes
    await mkdir(filedir, { recursive: true });
    logger.trace({ path, size: contents.length }, "Writing file");
    return writeFile(path, contents);
  }

  @WithSpan()
  async readFile(key: string): Promise<Buffer> {
    const path = join(process.cwd(), "data", key);
    setSpanAttributes({ path });
    logger.trace({ path }, "Reading file");
    return readFile(path);
  }

  @WithSpan()
  async getLength(key: string) {
    const path = join(process.cwd(), "data", key);
    setSpanAttributes({ path });
    const stats = await stat(path);
    return stats.size;
  }
}

const splitIntoGroups = <T>(items: T[], size = 32) => {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
};

const compose = async <T>(
  items: T[],
  composerFn: (group: T[]) => Promise<T>,
  groupSize = 32,
) => {
  let groups = splitIntoGroups(items, groupSize);
  let nextGroups: T[] = [];
  while (nextGroups.length > 1 || nextGroups.length === 0) {
    nextGroups = await pAll(
      groups.map(
        (group) => () => pRetry(() => composerFn(group), { retries: 3 }),
      ),
    );
    groups = splitIntoGroups(nextGroups, groupSize);
  }
  return nextGroups;
};

class GCSStorage implements PersistentStorage {
  @WithSpan()
  async deletePath(path: string) {
    const file = bucket.file(path);
    setSpanAttributes({ path });
    await file.delete();
  }

  @WithSpan()
  async createResumableUploadURI(key: string) {
    const uri = await createResumableUpload(key, {
      contentType: mime.lookup(key) || "application/octet-stream",
    });
    setSpanAttributes({ uri });
    return uri;
  }

  @WithSpan()
  async createReadStream(key: string, opts?: StorageStreamOptions) {
    const file = bucket.file(key);
    setSpanAttributes({ key, opts: JSON.stringify(opts) });
    return file.createReadStream({
      start: opts?.start,
      end: opts?.end,
    });
  }

  @WithSpan()
  async createWriteStream(key: string, opts?: StorageStreamOptions) {
    const tmpPath = `${key}.tmp`;
    const file = bucket.file(tmpPath);
    const writeStream = file.createWriteStream({
      resumable: true,
      metadata: { contentType: opts?.contentType },
    });
    setSpanAttributes({ key, tmpPath });
    logger.trace({ tmpPath }, "Created write stream for key");

    writeStream.once("error", (error) => {
      logger.error(`Error writing to stream ${tmpPath}`, error);
    });

    writeStream.on("finish", async () => {
      logger.trace(`Renaming ${tmpPath} to: ${key}`);
      try {
        await file.rename(key);
        writeStream.emit("finalized");
      } catch (error) {
        logger.error(`Error renaming file ${tmpPath}`, error);
        writeStream.emit("error", error);
      }
    });

    return writeStream;
  }

  @WithSpan()
  async createResumableWriteStream(key: string, _start: number) {
    const tmpPath = `${key}.tmp`;
    const file = bucket.file(tmpPath);
    const writeStream = file.createWriteStream({ resumable: true });
    setSpanAttributes({ key, tmpPath });
    logger.trace({ tmpPath }, "Created write stream for key");

    writeStream.once("error", (error) => {
      logger.error(`Error writing to stream ${tmpPath}`, error);
    });

    writeStream.on("finish", async () => {
      logger.trace(`Renaming ${tmpPath} to: ${key}`);
      try {
        await file.rename(key);
        writeStream.emit("finalized");
      } catch (error) {
        logger.error(`Error renaming file ${tmpPath}`, error);
        writeStream.emit("error", error);
      }
    });

    return writeStream;
  }

  @WithSpan()
  async pathExists(key: string) {
    const file = bucket.file(key);
    setSpanAttributes({ key });
    const [exists] = await file.exists();
    return exists;
  }

  @WithSpan()
  async mergePaths(keys: string[], prefix: string, destination: string) {
    setSpanAttributes({ keys: JSON.stringify(keys), prefix, destination });
    const [finalPath] = await compose(keys, async (keys) => {
      const compositionPath = join(prefix, uuidv4());
      await bucket.combine(keys, compositionPath);
      return compositionPath;
    });
    await bucket.file(finalPath!).rename(destination);
  }

  @WithSpan()
  async serveFile(
    key: string,
    _options?: {
      disposition?: "inline" | "attachment";
      mimeType?: string | null;
      downloadAs?: string;
      range?: string;
    },
  ) {
    const file = bucket.file(key);
    setSpanAttributes({ key });
    const EXPIRES_IN_MINUTES = 5;
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + EXPIRES_IN_MINUTES * 60 * 1000,
    });
    return new Response(null, {
      status: 302,
      headers: {
        "Content-Type": _options?.mimeType || "application/octet-stream",
        Location: url,
      },
    });
  }

  @WithSpan()
  async serveVideo(key: string) {
    const file = bucket.file(key);
    setSpanAttributes({ key });
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 5 * 60 * 1000,
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
      },
    });
  }

  @WithSpan()
  async writeFile(
    key: string,
    contents: string | Buffer,
    options?: SaveOptions,
  ) {
    const file = bucket.file(key);
    setSpanAttributes({ key });
    await file.save(contents, options);
  }

  @WithSpan()
  async readFile(key: string): Promise<Buffer> {
    const file = bucket.file(key);
    setSpanAttributes({ key });
    logger.trace({ key }, "Reading file from GCS");
    const readStream = file.createReadStream();
    return readIntoBuffer(readStream);
  }

  @WithSpan()
  async getLength(key: string) {
    const file = bucket.file(key);
    setSpanAttributes({ key });
    const [metadata] = await file.getMetadata();
    if (metadata.size === undefined) {
      throw new Error("Could not find size in file metadata");
    }
    return Number(metadata.size);
  }
}

export const storageProvider = UPLOAD_TO_BUCKET
  ? new GCSStorage()
  : new OnHostStorage();

export const createUploadReadStream = (key: string) => {
  const file = bucket.file(key);
  return file.createReadStream();
};

export const createResumableUpload = async (
  key: string,
  metadata: { contentType: string; contentLength?: number },
) => {
  const file = bucket.file(key);
  const [sessionUri] = await file.createResumableUpload({
    metadata,
  });

  logger.trace(
    { key, sessionUri, metadata },
    "Created resumable upload session",
  );

  return sessionUri;
};
