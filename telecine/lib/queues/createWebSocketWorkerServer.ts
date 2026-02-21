import { logger } from "@/logging";
import { createEagerBootServer } from "@/http/createEagerBootServer";
import type { AbortableLoop } from "./AbortableLoop";
import type { Worker } from "./Worker";
import { WebSocketServer, type WebSocket } from "ws";

export const createWebSocketWorkerServer = <Payload>(
  worker: Worker<Payload>,
  PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
) => {
  let wss: WebSocketServer | null = null;
  const connectionLoops = new Map<WebSocket, AbortableLoop[]>();

  const eagerServer = createEagerBootServer({
    port: PORT,
    serviceName: `worker:${worker.name}`,
    createRequestHandler: async () => {
      worker.warmUp().catch((err) => {
        logger.error({ queue: worker.name, error: err }, "Worker warmUp failed");
      });

      wss = new WebSocketServer({ noServer: true });

      wss.on("connection", (ws) => {
        logger.info(
          { queue: worker.name, concurrency: worker.concurrency },
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

        ws.on("close", () => {
          logger.info({ queue: worker.name }, "Scheduler disconnected, stopping work loops");
          stopLoops(ws);
        });

        ws.on("error", (err) => {
          logger.warn({ queue: worker.name, error: err.message }, "WebSocket error");
          stopLoops(ws);
        });
      });

      return (_req, res) => {
        res.statusCode = 404;
        res.end();
      };
    },
    onClose: async () => {
      logger.info(
        { queue: worker.name, connections: connectionLoops.size },
        "Shutting down WebSocket worker server",
      );
      // Abort all work loops from all connections
      const allAborts: Promise<void>[] = [];
      for (const [ws, loops] of connectionLoops) {
        for (const loop of loops) {
          allAborts.push(loop.abort());
        }
        ws.close();
      }
      connectionLoops.clear();
      await Promise.all(allAborts);
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
  };
};
