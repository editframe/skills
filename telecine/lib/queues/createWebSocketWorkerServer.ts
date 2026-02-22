import { logger } from "@/logging";
import { createEagerBootServer } from "@/http/createEagerBootServer";
import { executeRootSpan } from "@/tracing";
import type { AbortableLoop } from "./AbortableLoop";
import type { Worker } from "./Worker";
import { WebSocketServer, type WebSocket } from "ws";

const TRY_AGAIN_LATER = 1013;
const HEARTBEAT_INTERVAL_MS = 30_000;

export const createWebSocketWorkerServer = <Payload>(
  worker: Worker<Payload>,
  PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
) => {
  let wss: WebSocketServer | null = null;
  let activeConnection: WebSocket | null = null;
  const connectionLoops = new Map<WebSocket, AbortableLoop[]>();

  // Track active job state for drain span
  let activeJobId: string | undefined;
  let drainSpanEnd: ((hadActiveJob: boolean, jobId?: string) => void) | null = null;

  // Startup span: covers process start through first scheduler connection (rpcReady).
  // Started here (before warmUp) and ended when the first WebSocket connection arrives.
  let startupSpanEnd: (() => void) | null = null;
  const startupSpanPromise = executeRootSpan("worker.startup", async (span) => {
    span.setAttributes({
      workerType: worker.name,
      "host.name": process.env.HOSTNAME ?? "unknown",
      K_REVISION: process.env.K_REVISION ?? "unknown",
    });

    // The span ends when startupSpanEndFn is called (on first scheduler connection).
    await new Promise<void>((resolve) => {
      startupSpanEnd = resolve;
    });
  });
  // Prevent unhandled rejection if startup span throws (it shouldn't).
  startupSpanPromise.catch(() => {});

  const eagerServer = createEagerBootServer({
    port: PORT,
    serviceName: `worker:${worker.name}`,
    createRequestHandler: async () => {
      worker.warmUp().catch((err) => {
        logger.error({ queue: worker.name, error: err }, "Worker warmUp failed");
      });

      wss = new WebSocketServer({ noServer: true });

      wss.on("connection", (ws) => {
        if (activeConnection) {
          logger.error({ queue: worker.name }, "Rejecting second scheduler connection");
          ws.close(TRY_AGAIN_LATER, "Worker already has an active connection");
          return;
        }
        activeConnection = ws;

        // End the startup span: worker is now rpcReady (scheduler connected).
        if (startupSpanEnd) {
          startupSpanEnd();
          startupSpanEnd = null;
          logger.info({ queue: worker.name }, "Worker startup span ended (rpcReady)");
        }

        logger.info(
          {
            queue: worker.name,
            concurrency: worker.concurrency,
            event: "schedulerConnected",
          },
          "Scheduler connected, starting work loops",
        );

        const loops: AbortableLoop[] = [];
        for (let i = 0; i < worker.concurrency; i++) {
          loops.push(worker.workLoop());
        }
        connectionLoops.set(ws, loops);

        logger.info(
          { queue: worker.name, loopCount: loops.length },
          "Work loops started",
        );

        let isAlive = true;
        const heartbeat = setInterval(() => {
          if (!isAlive) {
            logger.warn({ queue: worker.name }, "Scheduler heartbeat timeout, terminating connection");
            ws.terminate();
            return;
          }
          isAlive = false;
          ws.ping();
        }, HEARTBEAT_INTERVAL_MS);

        ws.on("pong", () => {
          isAlive = true;
        });

        ws.on("close", () => {
          clearInterval(heartbeat);
          logger.info(
            { queue: worker.name, event: "schedulerDisconnected" },
            "Scheduler disconnected, stopping work loops",
          );
          activeConnection = null;
          stopLoops(ws);
        });

        ws.on("error", (err) => {
          logger.warn({ queue: worker.name, error: err.message }, "WebSocket error");
        });
      });

      return (_req, res) => {
        res.statusCode = 404;
        res.end();
      };
    },
    onClose: async () => {
      // SIGTERM drain span: starts when shutdown begins, ends when active job finishes.
      const hadActiveJob = !!activeJobId;
      const jobId = activeJobId;
      const drainStartMs = Date.now();

      logger.info(
        { queue: worker.name, hadActiveJob, jobId: jobId ?? null, event: "drainStarted" },
        "Worker draining",
      );

      const drainSpanResult = executeRootSpan("worker.drain", async (span) => {
        span.setAttributes({
          workerType: worker.name,
          "host.name": process.env.HOSTNAME ?? "unknown",
          K_REVISION: process.env.K_REVISION ?? "unknown",
          hadActiveJob,
          ...(jobId ? { jobId } : {}),
        });

        if (hadActiveJob) {
          // Wait for drain signal (set by job completion hook).
          await new Promise<void>((resolve) => {
            drainSpanEnd = (_hadJob, _jid) => resolve();
          });
        }

        const drainDurationMs = Date.now() - drainStartMs;
        span.setAttribute("drainDurationMs", drainDurationMs);

        logger.info(
          {
            queue: worker.name,
            hadActiveJob,
            jobId: jobId ?? null,
            drainDurationMs,
            event: "drainCompleted",
          },
          "Worker drain complete",
        );
      });

      logger.info(
        { queue: worker.name, connections: connectionLoops.size },
        "Shutting down WebSocket worker server",
      );
      const allAborts: Promise<void>[] = [];
      for (const [ws, loops] of connectionLoops) {
        for (const loop of loops) {
          allAborts.push(loop.abort());
        }
        ws.close();
      }
      connectionLoops.clear();
      activeConnection = null;
      await Promise.all(allAborts);

      // Signal drain span to end now (loops have stopped, any active job has been released).
      if (drainSpanEnd) {
        drainSpanEnd(hadActiveJob, jobId);
        drainSpanEnd = null;
      }
      await drainSpanResult;

      await worker.close();
      if (wss) {
        wss.close();
      }
      logger.info({ queue: worker.name }, "WebSocket worker shut down");
    },
  });

  // Handle WebSocket upgrade requests
  eagerServer.server.on("upgrade", (request, socket, head) => {
    if (!wss) {
      socket.destroy();
      return;
    }
    if (request.url === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  function stopLoops(ws: WebSocket) {
    const loops = connectionLoops.get(ws);
    if (loops) {
      connectionLoops.delete(ws);
      for (const loop of loops) {
        loop.abort();
      }
    }
  }

  return {
    worker,
    server: eagerServer.server,
    waitForServer: eagerServer.waitForServer,
    waitForInitialization: eagerServer.waitForInitialization,
    close: eagerServer.close,
    /** Called by Worker.executeJob to track which job is currently active. */
    setActiveJobId: (jobId: string | undefined) => {
      activeJobId = jobId;
    },
  };
};
