import type { Selectable } from "kysely";

import { graphql } from "@/graphql";
import { adminClient } from "@/graphql.server";
import { logger } from "@/logging";
import { processISOBMFF } from "@/process-file/processISOBMFF";
import { ProgressTracker } from "@/progress-tracking/ProgressTracker";
import type { Video2ProcessIsobmff } from "@/sql-client.server/kysely-codegen";
import { envInt, envString } from "@/util/env";
import { valkey } from "@/valkey/valkey";
import { Queue } from "../Queue";
import { ConnectionURLMap } from "../WorkerConnection";
import { Workflow } from "../Workflow";
import { Worker } from "../Worker";

// Required to ensure the workflow is registered
import "@/queues/units-of-work/ProcessHtml/Workflow";
import { mkdir, rmdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { uuidv4 } from "lib0/random.js";
import { createWriteStream } from "node:fs";
import { writeReadableStreamToWritable } from "@/util/writeReadableStreamToWritable";
import { md5FilePath } from "@editframe/assets";
import { dataFilePath } from "@/util/filePaths";
import { db } from "@/sql-client.server";
import { storageProvider } from "@/util/storageProvider.server";

const QUEUE_URL = envString(
  "PROCESS_ISOBMFF_WEBSOCKET_HOST",
  "ws://localhost:3000",
);
const WORKER_CONCURRENCY = envInt("PROCESS_ISOBMFF_WORKER_CONCURRENCY", 1);
const MAX_WORKER_COUNT = envInt("PROCESS_ISOBMFF_MAX_WORKER_COUNT", 1);

export type ProcessISOBMFFPayload = Selectable<Video2ProcessIsobmff>;

export const ProcessISOBMFFQueue = new Queue<ProcessISOBMFFPayload>({
  name: "process-isobmff",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,

  processStarts: async (messages, db) => {
    await db
      .updateTable("video2.process_isobmff")
      .set({
        started_at: new Date(),
      })
      .where(
        "id",
        "in",
        messages.map((m) => m.jobId),
      )
      .execute();
  },

  processFailures: async (messages, db) => {
    logger.info({ messages }, "Processing isobmff workflow failures");
    const jobIds = messages.map((m) => m.jobId);
    await db
      .updateTable("video2.process_isobmff")
      .set({
        failed_at: new Date(),
      })
      .where("id", "in", jobIds)
      .execute();

    await db
      .updateTable("video2.files")
      .set({ status: "failed" })
      .where("id", "in", jobIds)
      .execute();
  },
  processCompletions: async (messages, db) => {
    const jobIds = messages.map((m) => m.jobId);
    await db
      .updateTable("video2.process_isobmff")
      .set({
        completed_at: new Date(),
      })
      .where("id", "in", jobIds)
      .execute();

    await db
      .updateTable("video2.files")
      .set({ status: "ready" })
      .where("id", "in", jobIds)
      .execute();
  },
});
ConnectionURLMap.set(ProcessISOBMFFQueue, QUEUE_URL);

export const ProcessISOBMFFWorker = new Worker<ProcessISOBMFFPayload>({
  storage: valkey,
  queue: ProcessISOBMFFQueue,
  execute: async (job) => {
    await new ProcessISOBMFFExecutor(job.payload).execute();
  },
});

export const ProcessISOBMFFWorkflow = new Workflow({
  name: "process-isobmff",
  storage: valkey,
});

interface SourceDescriptor {
  path: string;
  md5: string;
  byte_size: number;
  filename: string;
  dispose: () => Promise<void>;
}

class ProcessISOBMFFExecutor {
  tracker: ProgressTracker;

  constructor(private data: ProcessISOBMFFPayload) {
    this.tracker = new ProgressTracker(`process-isobmff:${this.data.id}`);
  }

  loadSource(): Promise<SourceDescriptor> {
    switch (this.sourceType) {
      case "url":
        return this.loadURL();
      case "unprocessed_file":
        return this.loadUnprocessedFile();
      case "file":
        return this.loadFile();
      default:
        throw new Error(`Unknown source type: ${this.sourceType}`);
    }
  }

  get sourceUrl() {
    return this.data.url;
  }

  get sourceType() {
    return this.data.source_type;
  }

  get payload() {
    return this.data;
  }

  async loadURL(): Promise<SourceDescriptor> {
    if (!this.sourceUrl) {
      logger.error({ payload: this.payload }, "URL is required");
      throw new Error("URL is required when loading from URL");
    }
    if (!URL.canParse(this.sourceUrl)) {
      throw new Error(`Invalid URL format: ${this.sourceUrl}`);
    }
    const parsedUrl = new URL(this.sourceUrl);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error(
        `Invalid URL protocol: Only HTTP/HTTPS URLs are allowed, got: ${parsedUrl.protocol}`,
      );
    }

    logger.trace({ payload: this.payload }, "Fetching URL");
    const response = await fetch(this.sourceUrl);
    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
          url: this.sourceUrl,
        },
        "Failed to fetch URL",
      );
      throw new Error(`Failed to fetch URL: ${response.statusText} `);
    }
    const body = response.body;
    if (!body) {
      logger.error({ payload: this.payload }, "No body in response at url");
      throw new Error("No body in response at url");
    }
    const fileLength = Number(response.headers.get("content-length"));
    if (Number.isNaN(fileLength)) {
      logger.error({ payload: this.payload }, "Content length is not a number");
      throw new Error("Content length is not a number");
    }
    const unprocessedFilepath = join(tmpdir(), uuidv4());
    logger.trace({ unprocessedFilepath }, "Writing to unprocessed file");
    const writeStream = createWriteStream(unprocessedFilepath, {
      encoding: "binary",
    });

    const tracker = this.tracker;
    let bytesWritten = 0;
    const reader = response.body.getReader();
    const readableStream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytesWritten += value.length;
          const copyProgress = Math.min(bytesWritten / fileLength, 1);
          tracker.writeProgress(copyProgress * 0.2);
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    await writeReadableStreamToWritable(readableStream, writeStream);
    const md5 = await md5FilePath(unprocessedFilepath);
    return {
      md5,
      path: unprocessedFilepath,
      byte_size: fileLength,
      filename: this.sourceUrl,
      dispose: async () => {
        logger.trace({ unprocessedFilepath }, "Disposing of unprocessed file");
        await unlink(unprocessedFilepath);
      },
    };
  }

  async loadUnprocessedFile(): Promise<SourceDescriptor> {
    const unprocessedFileId = this.payload.unprocessed_file_id;
    if (!unprocessedFileId) {
      logger.error(
        { payload: this.payload },
        "Unprocessed file id is required",
      );
      throw new Error("Unprocessed file id is required");
    }
    const unprocessedFile = await adminClient.requireQuery(
      graphql(`
      query UnprocessedFile($id: uuid!) {
        result: video2_unprocessed_files_by_pk(id: $id) {
          id
          org_id
          creator_id
          api_key_id
          md5
          filename
          byte_size
          completed_at
        }
      }
    `),
      { id: unprocessedFileId },
    );

    if (!unprocessedFile.completed_at) {
      logger.trace("unprocessed_file not completed, skipping processing");
      throw new Error("Unprocessed file not completed, skipping processing");
    }

    const filePath = dataFilePath({
      org_id: unprocessedFile.org_id,
      id: unprocessedFile.id,
    });

    const readStream = await storageProvider.createReadStream(filePath);
    const tempDirPath = join(tmpdir(), unprocessedFile.id);

    await mkdir(tempDirPath, { recursive: true });
    const unprocessedFilepath = join(tempDirPath, unprocessedFile.id);
    const writeStream = createWriteStream(unprocessedFilepath, {
      encoding: "binary",
    });

    let bytesWritten = 0;
    const fileLength = await storageProvider.getLength(filePath);

    readStream.on("data", (chunk: Buffer) => {
      bytesWritten += chunk.length;
      const copyProgress = Math.min(bytesWritten / fileLength, 1);
      // Map 0-1 progress to 0-0.2 range
      this.tracker.writeProgress(copyProgress * 0.2);
    });

    const unprocessedFileWritten = new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });

    readStream.pipe(writeStream);
    logger.trace(`Writing unprocessed file to ${unprocessedFilepath}`);
    await unprocessedFileWritten;
    logger.trace(`Unprocessed file written to ${unprocessedFilepath}`);
    return {
      path: unprocessedFilepath,
      md5: unprocessedFile.md5,
      byte_size: unprocessedFile.byte_size,
      filename: unprocessedFile.filename,
      dispose: async () => {
        logger.trace({ tempDirPath }, "Disposing of temp dir");
        await rmdir(tempDirPath, { recursive: true });
      },
    };
  }

  async loadFile(): Promise<SourceDescriptor> {
    const fileId = this.payload.id;

    const file = await db
      .selectFrom("video2.files")
      .where("id", "=", fileId)
      .select(["id", "org_id", "md5", "filename", "byte_size", "status"])
      .executeTakeFirstOrThrow();

    if (file.status === "created" || file.status === "uploading") {
      throw new Error("File upload not completed, skipping processing");
    }

    if (!file.byte_size) {
      throw new Error("File byte_size is not set");
    }

    const filePath = dataFilePath({
      org_id: file.org_id,
      id: file.id,
    });

    const readStream = await storageProvider.createReadStream(filePath);
    const tempDirPath = join(tmpdir(), file.id);

    await mkdir(tempDirPath, { recursive: true });
    const localFilePath = join(tempDirPath, file.id);
    const writeStream = createWriteStream(localFilePath, {
      encoding: "binary",
    });

    let bytesWritten = 0;
    const fileLength = await storageProvider.getLength(filePath);

    readStream.on("data", (chunk: Buffer) => {
      bytesWritten += chunk.length;
      const copyProgress = Math.min(bytesWritten / fileLength, 1);
      this.tracker.writeProgress(copyProgress * 0.2);
    });

    const fileWritten = new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });

    readStream.pipe(writeStream);
    logger.trace(`Writing file to ${localFilePath}`);
    await fileWritten;
    logger.trace(`File written to ${localFilePath}`);

    return {
      path: localFilePath,
      md5: file.md5 ?? await md5FilePath(localFilePath),
      byte_size: file.byte_size,
      filename: file.filename,
      dispose: async () => {
        logger.trace({ tempDirPath }, "Disposing of temp dir");
        await rmdir(tempDirPath, { recursive: true });
      },
    };
  }

  async execute() {
    const tracker = new ProgressTracker(`process-isobmff:${this.payload.id}`);
    await tracker.writeProgress(0);
    const sourceDescriptor = await this.loadSource();
    try {
      const { id: isobmffFileId } = await processISOBMFF(
        sourceDescriptor.path,
        {
          id: this.payload.id,
          org_id: this.payload.org_id,
          creator_id: this.payload.creator_id,
          api_key_id: this.payload.api_key_id,
          md5: sourceDescriptor.md5,
          filename: sourceDescriptor.filename,
          byte_size: sourceDescriptor.byte_size,
          expires_at: this.payload.isobmff_expires_at,
        },
        tracker,
      );
      return {
        isobmff_file_id: isobmffFileId,
      };
    } finally {
      await sourceDescriptor.dispose();
    }
  }
}
