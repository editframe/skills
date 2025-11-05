import { logger } from "@/logging";
import { createEagerBootServer } from "@/http/createEagerBootServer";
import { WorkerWebSocketServer, type Worker } from "./Worker";

export const createWorkerServer = <Payload>(
  worker: Worker<Payload>,
  PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
) => {
  let workerWebSocketServer: WorkerWebSocketServer<Payload> | null = null;

  // IMPLEMENTATION GUIDELINES: Use eager boot server as foundation
  // This provides immediate health check response and defers WebSocket initialization
  const eagerServer = createEagerBootServer({
    port: PORT,
    serviceName: "worker",
    createRequestHandler: async () => {
      // Initialize WebSocket server after HTTP server is ready
      logger.info("Initializing worker WebSocket server...");
      workerWebSocketServer = new WorkerWebSocketServer<Payload>({
        server: eagerServer.server,
        worker,
      });
      workerWebSocketServer.initializeWebsocketServer();
      logger.info("Worker WebSocket server initialized");

      // Return a simple 404 handler for non-WebSocket requests
      // (WebSocket server handles its own upgrade events)
      return (_req, res) => {
        res.statusCode = 404;
        res.end();
      };
    },
    onClose: async () => {
      // Clean up WebSocket server during shutdown
      if (workerWebSocketServer) {
        logger.info("Cleaning up worker WebSocket server...");
        await workerWebSocketServer.abort();
      }
    }
  });

  return {
    worker,
    server: eagerServer.server,
    waitForServer: eagerServer.waitForServer,
    waitForInitialization: eagerServer.waitForInitialization,
    close: eagerServer.close,
  };
};
