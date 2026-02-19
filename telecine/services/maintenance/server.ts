import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "maintenance" });

import { logger } from "@/logging";
import { createEagerBootServer } from "@/http/createEagerBootServer";
import { valkey } from "@/valkey/valkey";
import { Queue, type QueueStats } from "@/queues/Queue";
import { abortableLoopWithBackoff, RequestSleep } from "@/queues/AbortableLoop";
import type { AbortableLoop } from "@/queues/AbortableLoop";
import { drainLifecycleList } from "@/queues/lifecycle/drainLifecycleList";

// Register all queues and workflows so Queue.byName / Workflow.byName are populated
import "@/queues/units-of-work/Render/RenderInitializerQueue";
import "@/queues/units-of-work/Render/RenderFragmentQueue";
import "@/queues/units-of-work/Render/Finalizer";
import "@/queues/units-of-work/Render/Workflow";
import "@/queues/units-of-work/ProcessHtml/Initializer";
import "@/queues/units-of-work/ProcessHtml/Finalizer";
import "@/queues/units-of-work/ProcessHtml/Workflow";
import "@/queues/units-of-work/ProcessIsobmff";
import "@/queues/units-of-work/IngestImage";

const loops: AbortableLoop[] = [];

/**
 * Lifecycle writer: drains the lifecycle:pending Valkey list
 * and executes the processStarts/processCompletions/processFailures
 * handlers defined on each Queue/Workflow.
 */
function startLifecycleWriter() {
  const loop = abortableLoopWithBackoff({
    spanName: "maintenance.lifecycleWriter",
    backoffMs: 250,
    fn: async () => {
      const drained = await drainLifecycleList(valkey, 500);
      if (drained === 0) return RequestSleep;
    },
  });
  loops.push(loop);
}

/**
 * Stall detector: releases stalled jobs across all queues.
 * A stalled job is one in the claimed stage with a claim timestamp
 * older than 10 seconds (workers extend claims every 5s).
 */
function startStallDetector() {
  const loop = abortableLoopWithBackoff({
    spanName: "maintenance.stallDetector",
    backoffMs: 2_000,
    alwaysSleep: true,
    fn: async () => {
      for (const [, queue] of Queue.byName) {
        await queue.releaseAllStalledJobs();
      }
    },
  });
  loops.push(loop);
}

/**
 * Scaler: reads queue depth from Valkey, computes target instance counts,
 * and PATCHes Cloud Run Worker Pool instanceCount via the Admin API.
 *
 * Fast attack (scale-up is immediate), slow decay (exponential smoothing
 * factor 0.9 on scale-down).
 *
 * In local dev (no GCP_PROJECT), this loop only logs scaling decisions
 * without making API calls.
 */

interface ScalerState {
  smoothedTarget: number;
}

const SCALE_UP_INTERVAL_MS = 1_000;
const SMOOTHING_FACTOR = 0.9;

function startScaler() {
  const stateByQueue = new Map<string, ScalerState>();
  const gcpProject = process.env.GCP_PROJECT;
  const gcpRegion = process.env.GCP_REGION ?? "us-central1";

  const loop = abortableLoopWithBackoff({
    spanName: "maintenance.scaler",
    backoffMs: SCALE_UP_INTERVAL_MS,
    alwaysSleep: true,
    fn: async () => {
      const queueNames = Array.from(Queue.byName.keys());
      if (queueNames.length === 0) return;

      const statsRaw = await valkey.mgetQueueStats(10_000, ...queueNames);
      const allStats = JSON.parse(statsRaw) as Record<string, QueueStats>;

      for (const [queueName, queue] of Queue.byName) {
        const stats = allStats[queueName];
        if (!stats) continue;

        let state = stateByQueue.get(queueName);
        if (!state) {
          state = { smoothedTarget: 0 };
          stateByQueue.set(queueName, state);
        }

        const naturalQueueDepth = stats.queued + stats.claimed - stats.stalled;
        const concurrentQueueDepth = Math.ceil(
          naturalQueueDepth / (queue.workerConcurrency ?? 1),
        );
        const rawTarget = Math.min(queue.maxWorkerCount, concurrentQueueDepth);

        let target: number;
        if (rawTarget > state.smoothedTarget) {
          // Fast attack: scale up immediately
          target = rawTarget;
        } else {
          // Slow decay: exponential smoothing
          target = SMOOTHING_FACTOR * state.smoothedTarget + (1 - SMOOTHING_FACTOR) * rawTarget;
        }
        state.smoothedTarget = target;

        const instanceCount = Math.max(0, Math.round(target));

        if (gcpProject) {
          try {
            const workerPoolName = `telecine-worker-${queueName}`;
            const url = `https://run.googleapis.com/v2/projects/${gcpProject}/locations/${gcpRegion}/workerPools/${workerPoolName}?updateMask=scaling.manualInstanceCount`;
            const token = await getAccessToken();
            const response = await fetch(url, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                scaling: {
                  manualInstanceCount: instanceCount,
                },
              }),
            });

            if (!response.ok) {
              logger.error(
                { queue: queueName, status: response.status, body: await response.text() },
                "Failed to patch Worker Pool instance count",
              );
            } else {
              logger.info(
                { queue: queueName, instanceCount, rawTarget, smoothed: state.smoothedTarget },
                "Scaled Worker Pool",
              );
            }
          } catch (error) {
            logger.error({ queue: queueName, error }, "Error scaling Worker Pool");
          }
        } else {
          logger.debug(
            { queue: queueName, instanceCount, rawTarget, smoothed: state.smoothedTarget, stats },
            "Scaling decision (local, no-op)",
          );
        }
      }
    },
  });
  loops.push(loop);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } },
  );
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

createEagerBootServer({
  serviceName: "maintenance",
  createRequestHandler: async () => {
    startLifecycleWriter();
    startStallDetector();
    startScaler();
    logger.info("Maintenance service started all loops");

    return (_req, res) => {
      res.statusCode = 404;
      res.end();
    };
  },
  onClose: async () => {
    logger.info("Shutting down maintenance service");
    await Promise.all(loops.map((loop) => loop.abort()));
    logger.info("Maintenance service shut down");
  },
});
