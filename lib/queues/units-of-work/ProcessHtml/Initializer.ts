import { Queue } from "@/queues/Queue";
import { Worker } from "@/queues/Worker";
import { ConnectionURLMap } from "@/queues/WorkerConnection";
import { processHTML as processHTMLFn } from "@/render/processHTML";
import type { Video2ProcessHtml } from "@/sql-client.server/kysely-codegen";
import { valkey } from "@/valkey/valkey";
import { type Selectable, sql } from "kysely";
import { envInt, envString } from "@/util/env";

const QUEUE_URL = envString(
  "PROCESS_HTML_INITIALIZER_WEBSOCKET_HOST",
  "ws://localhost:3000",
);
const MAX_WORKER_COUNT = envInt("PROCESS_HTML_INITIALIZER_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt(
  "PROCESS_HTML_INITIALIZER_WORKER_CONCURRENCY",
  1,
);

type ProcessHTMLPayload = Selectable<Video2ProcessHtml>;

export const ProcessHTMLInitializerQueue = new Queue<ProcessHTMLPayload>({
  name: "process-html-initializer",
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,
  storage: valkey,
  processStarts: async (messages, db) => {
    await db
      .updateTable("video2.process_html")
      .set({
        started_at: sql`now()`,
      })
      .where(
        "id",
        "in",
        messages.map((m) => m.workflowId),
      )
      .execute();
  },
});
ConnectionURLMap.set(ProcessHTMLInitializerQueue, QUEUE_URL);

export const ProcessHTMLInitializerWorker = new Worker<ProcessHTMLPayload>({
  queue: ProcessHTMLInitializerQueue,
  storage: valkey,
  execute: async (job) => {
    await processHTMLFn({
      api_key_id: job.payload.api_key_id,
      html: job.payload.html,
      org_id: job.payload.org_id,
      process_html_id: job.payload.id,
      render_id: job.payload.render_id,
      creator_id: job.payload.creator_id,
    });
  },
});
