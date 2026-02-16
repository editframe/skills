#!/usr/bin/env node
/**
 * Restart a failed render: set status to queued, clear failure, and re-queue the initializer job.
 * Usage: run from telecine with: ./scripts/run tsx scripts/restart-render.ts <render-id>
 */

import { db } from "@/sql-client.server";
import { valkey } from "@/valkey/valkey";
import { getJob, retryJob } from "@/queues/Job";
import { RenderWorkflow } from "@/queues/units-of-work/Render/Workflow";
import { RenderInitializerQueue } from "@/queues/units-of-work/Render/RenderInitializerQueue";

const rawId = process.argv[2];
if (!rawId) {
  console.error("Usage: tsx scripts/restart-render.ts <render-id>");
  process.exit(1);
}
const renderId: string = rawId;

async function main() {
  const render = await db
    .selectFrom("video2.renders")
    .where("id", "=", renderId)
    .select([
      "id",
      "md5",
      "html",
      "org_id",
      "width",
      "height",
      "duration_ms",
      "fps",
      "output_config",
      "metadata",
      "strategy",
      "work_slice_ms",
    ])
    .executeTakeFirst();

  if (!render) {
    console.error("Render not found:", renderId);
    process.exit(1);
  }

  await db
    .updateTable("video2.renders")
    .set({
      status: "queued",
      failed_at: null,
      failure_detail: null,
    })
    .where("id", "=", renderId)
    .execute();

  const jobId = `${renderId}-initializer`;
  const existing = await getJob(valkey, RenderInitializerQueue, jobId);

  if (existing) {
    await retryJob(valkey, existing);
    console.log("Retried initializer job:", jobId);
  } else {
    await RenderWorkflow.enqueueJob({
      queue: RenderInitializerQueue,
      orgId: render.org_id,
      workflowId: render.id,
      jobId,
      payload: render,
    });
    console.log("Enqueued initializer job:", jobId);
  }

  console.log("Render restarted:", renderId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
