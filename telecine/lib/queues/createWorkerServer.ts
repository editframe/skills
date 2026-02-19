import { logger } from "@/logging";
import { createDirectWorkerServer } from "./createDirectWorkerServer";
import { createWebSocketWorkerServer } from "./createWebSocketWorkerServer";
import type { Worker } from "./Worker";

/**
 * Creates the appropriate worker server based on WORKER_MODE env var.
 *
 * - "websocket": WebSocket server that waits for scheduler connections
 *   to start/stop work loops. Used in production with the Go scheduler.
 * - "direct" (default): Starts work loops immediately on boot.
 *   Used in local development where there's no scheduler.
 */
export const createWorkerServer = <Payload>(
  worker: Worker<Payload>,
  PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
) => {
  const mode = process.env.WORKER_MODE || "direct";

  if (mode === "websocket") {
    logger.info({ queue: worker.name, mode }, "Starting WebSocket worker server");
    return createWebSocketWorkerServer(worker, PORT);
  }

  logger.info({ queue: worker.name, mode }, "Starting direct worker server");
  return createDirectWorkerServer(worker, PORT);
};
