import { envInt, envString } from "@/util/env";
import { valkey } from "@/valkey/valkey";
import { Queue } from "../Queue";
import { Worker } from "../Worker";
import { ConnectionURLMap } from "../WorkerConnection";
import { logger } from "@/logging";
import { db } from "@/sql-client.server";

// Required to ensure the workflow is registered
import "@/queues/units-of-work/ProcessHtml/Workflow";
import { processImageFile } from "@/process-file/processAsset";

const QUEUE_URL = envString(
  "INGEST_IMAGE_WEBSOCKET_HOST",
  "ws://localhost:3000",
);
const MAX_WORKER_COUNT = envInt("INGEST_IMAGE_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt("INGEST_IMAGE_WORKER_CONCURRENCY", 1);

const ONE_HOUR = 1000 * 60 * 60;

export type IngestImagePayload = {
  url: string;
  creatorId: string;
  apiKeyId: string;
  imageId: string;
};

export const IngestImageQueue = new Queue<IngestImagePayload>({
  name: "ingest-image",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,
});
ConnectionURLMap.set(IngestImageQueue, QUEUE_URL);

export const IngestImageWorker = new Worker({
  storage: valkey,
  queue: IngestImageQueue,
  execute: async (job) => {
    logger.info(job, "Processing image asset");

    if (!URL.canParse(job.payload.url)) {
      throw new Error(`Invalid URL format: ${job.payload.url}`);
    }

    const parsedUrl = new URL(job.payload.url);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error(
        `Invalid URL protocol: Only HTTP/HTTPS URLs are allowed, got: ${parsedUrl.protocol}`,
      );
    }

    // Validate content-length header first (for metadata)
    const response = await fetch(job.payload.url, { method: "HEAD" });
    if (!response.ok) {
      throw new Error(`Failed to access image from ${job.payload.url}`);
    }

    const contentLength = response.headers.get("content-length");
    if (!contentLength) {
      throw new Error(`${job.payload.url} has no content-length header`);
    }

    const byteSize = Number.parseInt(contentLength, 10);

    // processImageFile will use acquireAsset to handle the download
    await processImageFile(job.payload.url, {
      id: job.payload.imageId,
      org_id: job.orgId,
      creator_id: job.payload.creatorId,
      api_key_id: job.payload.apiKeyId || null,
      filename: job.payload.url,
      byte_size: byteSize,
      next_byte: byteSize,
      expires_at: new Date(Date.now() + ONE_HOUR),
    });

    await db
      .updateTable("video2.files")
      .set({ status: "ready" })
      .where("id", "=", job.payload.imageId)
      .execute();
  },
});
