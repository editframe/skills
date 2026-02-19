import type { Selectable } from "kysely";

import { logger } from "@/logging";
import { Queue } from "@/queues/Queue";
import type {
  Video2RenderFragments,
  Video2Renders,
} from "@/sql-client.server/kysely-codegen";
import { envInt } from "@/util/env";
import { valkey } from "@/valkey/valkey";

const MAX_WORKER_COUNT = envInt("RENDER_FRAGMENT_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt("RENDER_FRAGMENT_WORKER_CONCURRENCY", 1);

/**
 * Extract segment_id from a fragment jobId.
 * Fragment jobIds follow the pattern: `${renderId}-${segmentId}`
 * e.g. "abc123-init", "abc123-0", "abc123-1"
 */
const extractSegmentId = (jobId: string, workflowId: string): string => {
  const prefix = `${workflowId}-`;
  if (jobId.startsWith(prefix)) {
    return jobId.slice(prefix.length);
  }
  return jobId;
};

export const RenderFragmentQueue = new Queue<{
  render: Selectable<Video2Renders>;
  fragment: Selectable<Video2RenderFragments>;
}>({
  name: "render-fragment",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,

  processStarts: async (messages, db) => {
    for (const msg of messages) {
      const segmentId = extractSegmentId(msg.jobId, msg.workflowId);
      const attemptNumber = Number(msg.attemptNumber);
      try {
        await db
          .insertInto("video2.render_fragments")
          .values({
            render_id: msg.workflowId,
            segment_id: segmentId,
            attempt_number: attemptNumber,
            started_at: new Date(Number(msg.timestamp)),
          })
          .onConflict((oc) =>
            oc.columns(["render_id", "segment_id", "attempt_number"]).doUpdateSet({
              started_at: new Date(Number(msg.timestamp)),
            }),
          )
          .execute();
      } catch (error) {
        logger.error(
          { jobId: msg.jobId, workflowId: msg.workflowId, segmentId, error },
          "Failed to record fragment start",
        );
      }
    }
  },

  processFailures: async (messages, db) => {
    for (const msg of messages) {
      const segmentId = extractSegmentId(msg.jobId, msg.workflowId);
      const attemptNumber = Number(msg.attemptNumber);
      const errorDetail =
        msg.details?.error != null ? String((msg.details.error as any).message ?? msg.details.error) : null;
      try {
        await db
          .insertInto("video2.render_fragments")
          .values({
            render_id: msg.workflowId,
            segment_id: segmentId,
            attempt_number: attemptNumber,
            started_at: new Date(Number(msg.timestamp)),
            failed_at: new Date(Number(msg.timestamp)),
            last_error: errorDetail,
          })
          .onConflict((oc) =>
            oc.columns(["render_id", "segment_id", "attempt_number"]).doUpdateSet({
              failed_at: new Date(Number(msg.timestamp)),
              last_error: errorDetail,
            }),
          )
          .execute();
      } catch (error) {
        logger.error(
          { jobId: msg.jobId, workflowId: msg.workflowId, segmentId, error },
          "Failed to record fragment failure",
        );
      }
    }
  },

  processCompletions: async (messages, db) => {
    for (const msg of messages) {
      const segmentId = extractSegmentId(msg.jobId, msg.workflowId);
      const attemptNumber = Number(msg.attemptNumber);
      try {
        await db
          .updateTable("video2.render_fragments")
          .set({
            completed_at: new Date(Number(msg.timestamp)),
          })
          .where("render_id", "=", msg.workflowId)
          .where("segment_id", "=", segmentId)
          .where("attempt_number", "=", attemptNumber)
          .execute();
      } catch (error) {
        logger.error(
          { jobId: msg.jobId, workflowId: msg.workflowId, segmentId, error },
          "Failed to record fragment completion",
        );
      }
    }
  },
});
