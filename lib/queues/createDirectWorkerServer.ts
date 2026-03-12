import { logger } from "@/logging";
import { createEagerBootServer } from "@/http/createEagerBootServer";
import { executeRootSpan } from "@/tracing";
import type { AbortableLoop } from "./AbortableLoop";
import type { Worker } from "./Worker";

export const createDirectWorkerServer = <Payload>(
  worker: Worker<Payload>,
  PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
) => {
  let workLoops: AbortableLoop[] = [];

  // Startup span: covers process start through work loops running.
  const startupSpanPromise = executeRootSpan("worker.startup", async (span) => {
    span.setAttributes({
      workerType: worker.name,
      "host.name": process.env.HOSTNAME ?? "unknown",
      K_REVISION: process.env.K_REVISION ?? "unknown",
      mode: "direct",
    });

    await new Promise<void>((resolve) => {
      startupReady = resolve;
    });
  });
  startupSpanPromise.catch(() => {});

  let startupReady: (() => void) | null = null;

  const eagerServer = createEagerBootServer({
    port: PORT,
    serviceName: `worker:${worker.name}`,
    createRequestHandler: async () => {
      worker.warmUp().catch((err) => {
        logger.error(
          { queue: worker.name, error: err },
          "Worker warmUp failed",
        );
      });

      logger.info(
        { queue: worker.name, concurrency: worker.concurrency },
        "Starting work loops",
      );
      for (let i = 0; i < worker.concurrency; i++) {
        workLoops.push(worker.workLoop());
      }
      logger.info(
        { queue: worker.name, loopCount: workLoops.length },
        "Work loops started",
      );

      // End startup span: work loops are running.
      if (startupReady) {
        startupReady();
        startupReady = null;
      }

      return (_req, res) => {
        res.statusCode = 404;
        res.end();
      };
    },
    onClose: async () => {
      const drainStartMs = Date.now();
      logger.info(
        { queue: worker.name, event: "drainStarted" },
        "Worker draining",
      );

      const drainSpanResult = executeRootSpan("worker.drain", async (span) => {
        span.setAttributes({
          workerType: worker.name,
          "host.name": process.env.HOSTNAME ?? "unknown",
          K_REVISION: process.env.K_REVISION ?? "unknown",
          hadActiveJob: false,
          mode: "direct",
        });

        logger.info(
          { queue: worker.name, loopCount: workLoops.length },
          "Aborting work loops",
        );
        const loops = workLoops;
        workLoops = [];
        await Promise.all(loops.map((loop) => loop.abort()));

        const drainDurationMs = Date.now() - drainStartMs;
        span.setAttribute("drainDurationMs", drainDurationMs);

        logger.info(
          { queue: worker.name, drainDurationMs, event: "drainCompleted" },
          "Worker drain complete",
        );
      });

      await drainSpanResult;
      await worker.close();
      logger.info({ queue: worker.name }, "Worker shut down");
    },
  });

  return {
    worker,
    server: eagerServer.server,
    waitForServer: eagerServer.waitForServer,
    waitForInitialization: eagerServer.waitForInitialization,
    close: eagerServer.close,
  };
};
