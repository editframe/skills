import { sql } from "kysely";

import { logger } from "@/logging";
import { Queue } from "@/queues/Queue";
import { Worker } from "@/queues/Worker";
import { valkey } from "@/valkey/valkey";
import { RenderInitializerQueue } from "../Render/RenderInitializerQueue";
import { RenderWorkflow } from "../Render/Workflow";
import type { ProcessHTMLWorkflowData } from "./Workflow";
import { envInt } from "@/util/env";

const MAX_WORKER_COUNT = envInt("PROCESS_HTML_FINALIZER_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt(
  "PROCESS_HTML_FINALIZER_WORKER_CONCURRENCY",
  1,
);

export const ProcessHTMLFinalizerQueue = new Queue<ProcessHTMLWorkflowData>({
  name: "process-html-finalizer",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,

  async processCompletions(messages, db) {
    await db
      .updateTable("video2.process_html")
      .set({
        completed_at: sql`now()`,
      })
      .where(
        "id",
        "in",
        messages.map((m) => m.workflowId),
      )
      .execute();
  },
});

export const ProcessHTMLFinalizerWorker = new Worker({
  storage: valkey,
  queue: ProcessHTMLFinalizerQueue,
  execute: async (job) => {
    logger.debug({ job }, "ProcessHTMLFinalizerWorker");
    await RenderWorkflow.setWorkflowData(
      job.payload.render.id,
      job.payload.render,
    );
    await RenderWorkflow.enqueueJob({
      queue: RenderInitializerQueue,
      orgId: job.orgId,
      workflowId: job.payload.render.id,
      jobId: `${job.payload.render.id}-initializer`,
      payload: job.payload.render,
    });
  },
  // Do not process starts, we've already done that in the main queu
});
