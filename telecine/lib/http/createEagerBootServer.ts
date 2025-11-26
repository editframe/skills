import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

import { logger } from "@/logging";
import { healthCheck } from "@/http/healthCheck";
import { promiseWithResolvers } from "@/util/promiseWithResolvers";

export interface EagerBootServerOptions {
  port?: number;
  serviceName?: string;
  createRequestHandler?: () => Promise<
    (req: IncomingMessage, res: ServerResponse) => void
  >;
  customHealthCheck?: (req: IncomingMessage, res: ServerResponse) => boolean;
  onClose?: () => void | Promise<void>;
}

/**
 * IMPLEMENTATION GUIDELINES: Creates a server that boots quickly for health checks
 * and then initializes the full application asynchronously.
 *
 * This pattern significantly improves cold start times by:
 * 1. Starting HTTP server immediately for health checks
 * 2. Deferring heavy initialization until after server is listening
 * 3. Allowing Cloud Run to consider the instance "ready" faster
 */
export const createEagerBootServer = (options: EagerBootServerOptions = {}) => {
  const {
    port = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
    serviceName = "service",
    createRequestHandler,
    customHealthCheck,
    onClose,
  } = options;

  const serverResolvers = promiseWithResolvers<void>();
  const initializationResolvers = promiseWithResolvers<void>();

  let isInitialized = false;
  let initializationError: Error | null = null;
  let requestHandler:
    | ((req: IncomingMessage, res: ServerResponse) => void)
    | null = null;

  // Create HTTP server immediately - this is the "eager boot" part
  const server = createServer(async (req, res) => {
    // Always respond to health checks immediately, even during initialization
    const healthCheckHandler = customHealthCheck || healthCheck;
    if (healthCheckHandler(req, res)) {
      return;
    }

    // For non-health requests, wait for full initialization
    if (!isInitialized) {
      try {
        await initializationResolvers.promise;
      } catch (error) {
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Service initializing",
            message:
              initializationError?.message || "Service is still starting up",
          }),
        );
        return;
      }
    }

    // Use the initialized request handler if available
    if (requestHandler) {
      requestHandler(req, res);
    } else {
      // Fallback for services that don't provide a request handler
      res.statusCode = 404;
      res.end();
    }
  });

  console.log(`${serviceName} binding to port ${port}`);

  // Start listening immediately - this makes the service "ready" for health checks
  server.listen(port, () => {
    logger.info(
      `${serviceName} listening on port ${port} (health checks ready)`,
    );
    serverResolvers.resolve();

    // Start async initialization after server is listening
    if (createRequestHandler) {
      Promise.resolve(createRequestHandler())
        .then((handler) => {
          requestHandler = handler;
          isInitialized = true;
          initializationResolvers.resolve();
          logger.info(`${serviceName} fully initialized`);
        })
        .catch((error) => {
          initializationError = error;
          initializationResolvers.reject(error);
          logger.error(`${serviceName} initialization failed:`, error);
        });
    } else {
      isInitialized = true;
      initializationResolvers.resolve();
    }
  });

  const close = async () => {
    // Call custom cleanup if provided
    if (onClose) {
      try {
        await Promise.resolve(onClose());
      } catch (error) {
        logger.error(`${serviceName} cleanup failed:`, error);
      }
    }

    server.close();
    process.exit(0);
  };

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    logger.info("SIGINT received, closing server");
    close();
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, closing server");
    close();
  });

  return {
    server,
    waitForServer: serverResolvers.promise,
    waitForInitialization: initializationResolvers.promise,
    close,
  };
};
