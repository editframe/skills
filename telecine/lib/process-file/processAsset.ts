import { createReadStream, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

import type { Selectable } from "kysely";
import { v4 } from "uuid";

import { logger } from "@/logging";
import { db } from "@/sql-client.server";
import type { Video2ImageFiles } from "@/sql-client.server/kysely-codegen";
import { executeSpan } from "@/tracing";
import { imageFilePath } from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";
import { writeReadableStreamToWritable } from "@/util/writeReadableStreamToWritable";
import { Probe } from "@editframe/assets";

export interface ImageMetadata {
  id: string;
  md5?: string;
  org_id: string;
  creator_id: string;
  api_key_id: string | null;
  filename: string;
  byte_size: number;
  next_byte?: number;
  expires_at?: Date | null;
}

interface ImageAnalysisResult {
  codec: string;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Acquire any asset locally - download if URL, return path if local file
 * This is the centralized function for handling URL vs local file acquisition
 */
export async function acquireAsset(source: string): Promise<{ path: string, [Symbol.asyncDispose]: () => Promise<void> }> {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    logger.trace({ url: source }, "Downloading asset from URL");

    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to download asset from ${source}`);
    }

    if (!response.body) {
      throw new Error(`${source} has no body`);
    }

    const tempPath = join(tmpdir(), `asset-${v4()}`);

    const tempFile = createWriteStream(tempPath);

    // Convert Web ReadableStream to Node.js Readable
    const nodeStream = Readable.fromWeb(response.body as any);

    await pipeline(nodeStream, tempFile);

    return {
      path: tempPath,
      [Symbol.asyncDispose]: async () => {
        await rm(tempPath);
      }
    }
  }

  return {
    path: source,
    [Symbol.asyncDispose]: async () => { }
  }
}

/**
 * Analyze image to extract metadata
 */
async function analyzeImage(localPath: string): Promise<ImageAnalysisResult> {

  logger.trace({ localPath }, "Analyzing image");
  const probeResult = await Probe.probePath(localPath);

  logger.trace({ probeResult }, "Image probe result");
  const [videoProbe] = probeResult.videoStreams;
  if (!videoProbe) {
    throw new Error("No video stream found in file");
  }

  const codec = videoProbe.codec_name;
  if (!(codec === "svg" || codec === "mjpeg" || codec === "webp" || codec === "png" || codec === "gif")) {
    throw new Error(`Invalid codec for image: ${codec}`);
  }

  const codecNameToMimeType: Record<string, string> = {
    svg: "image/svg+xml",
    mjpeg: "image/jpeg",
    webp: "image/webp",
    png: "image/png",
    gif: "image/gif",
  };

  const mimeType = codecNameToMimeType[codec];
  if (!mimeType) {
    throw new Error(`Invalid codec for image: ${codec}`);
  }

  return {
    codec,
    mimeType,
    width: videoProbe.width,
    height: videoProbe.height,
  };
}

/**
 * Store asset record in appropriate database table
 */
async function storeImageRecord(
  analysis: ImageAnalysisResult,
  metadata: ImageMetadata,
): Promise<Selectable<Video2ImageFiles>> {
  const imageData = {
    id: metadata.id,
    md5: metadata.md5 || null,
    org_id: metadata.org_id,
    creator_id: metadata.creator_id,
    api_key_id: metadata.api_key_id,
    mime_type: analysis.mimeType,
    width: analysis.width,
    height: analysis.height,
    filename: metadata.filename,
    byte_size: metadata.byte_size,
    next_byte: metadata.next_byte || metadata.byte_size,
    complete: true,
    remote_uri: null,
    expires_at: metadata.expires_at || null,
  };

  await db
    .insertInto("video2.image_files")
    .values(imageData)
    .onConflict((conflict) =>
      conflict.column("id").doUpdateSet(imageData)
    )
    .execute();

  logger.info("Inserted image file record");

  return await db
    .selectFrom("video2.image_files")
    .where("id", "=", metadata.id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

/**
 * Persist image file to storage provider
 */
async function persistImage(
  localPath: string,
  metadata: ImageMetadata
): Promise<void> {
  const imagePath = imageFilePath({
    org_id: metadata.org_id,
    id: metadata.id,
  });

  // Copy to storage if not already there
  if (localPath !== imagePath) {
    const imageStream = await storageProvider.createWriteStream(imagePath);
    const readStream = createReadStream(localPath);
    // Convert Node.js ReadStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        readStream.on('data', (chunk) => controller.enqueue(chunk));
        readStream.on('end', () => controller.close());
        readStream.on('error', (err) => controller.error(err));
      }
    });
    await writeReadableStreamToWritable(webStream, imageStream);
  }

  logger.trace({ imagePath }, "Persisted image file");
}

/**
 * Process image from any source (local file or URL)
 */
export async function processImageFile(
  source: string,
  metadata: ImageMetadata
): Promise<Selectable<Video2ImageFiles>> {
  return executeSpan("processImageFile", async (span) => {
    span.setAttributes({
      source,
      imageId: metadata.id,
    });

    logger.info({ source, imageId: metadata.id }, "Processing image");

    // 1. Acquire image locally
    await using asset = await acquireAsset(source);

    // 2. Analyze image
    const analysis = await analyzeImage(asset.path);

    // 3. Store database record
    const dbRecord = await storeImageRecord(analysis, metadata);

    // 4. Persist image file
    await persistImage(asset.path, metadata);

    logger.info({ imageId: metadata.id }, "Image processing complete");

    return dbRecord;
  });
}
