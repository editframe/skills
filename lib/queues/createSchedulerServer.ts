import { createServer } from "node:http";
import { inspect } from "node:util";

import { logger } from "@/logging";
import { promiseWithResolvers } from "@/util/promiseWithResolvers";
import { valkey } from "@/valkey/valkey";
import { WorkerConnection } from "./WorkerConnection";
import { Scheduler } from "./Scheduler";
import { ProcessHTMLFinalizerQueue } from "./units-of-work/ProcessHtml/Finalizer";
import { ProcessHTMLInitializerQueue } from "./units-of-work/ProcessHtml/Initializer";
import { ProcessISOBMFFQueue } from "./units-of-work/ProcessIsobmff";
import { RenderInitializerQueue } from "./units-of-work/Render/RenderInitializerQueue";
import { RenderFragmentQueue } from "./units-of-work/Render/RenderFragmentQueue";
import { RenderFinalizerQueue } from "./units-of-work/Render/Finalizer";
import { IngestImageQueue } from "./units-of-work/IngestImage";

const productionQueues = [
  ProcessHTMLFinalizerQueue,
  ProcessHTMLInitializerQueue,
  ProcessISOBMFFQueue,
  RenderFinalizerQueue,
  RenderFragmentQueue,
  RenderInitializerQueue,
  IngestImageQueue,
];

const isDevelopment = process.env.NODE_ENV !== "production";

const getQueues = async () => {
  if (!isDevelopment) {
    return productionQueues;
  }

  const [
    { TestFastInitializerQueue },
    { TestFastMainQueue },
    { TestFastFinalizerQueue },
  ] = await Promise.all([
    import("./units-of-work/TestFast/Initializer"),
    import("./units-of-work/TestFast/Main"),
    import("./units-of-work/TestFast/Finalizer"),
  ]);

  return [
    ...productionQueues,
    TestFastInitializerQueue,
    TestFastMainQueue,
    TestFastFinalizerQueue,
  ];
};

export const appScheduler = new Scheduler({
  storage: valkey,
  queues: await getQueues(),
  connectionClass: WorkerConnection,
});

export const createSchedulerServer = (
  PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
) => {
  const server = createServer(async (req, res) => {
    const { healthCheck } = await import("@/http/healthCheck");
    if (healthCheck(req, res)) return;

    res.statusCode = 404;
    res.end("Not found");
  });

  const serverResolvers = promiseWithResolvers<void>();

  logger.debug(`Scheduler binding to port ${PORT}`);

  server.listen(PORT, () => {
    logger.debug(`Scheduler listening on port ${PORT}`);
    serverResolvers.resolve();
  });

  appScheduler.start();

  const close = async () => {
    await Promise.all([
      appScheduler.stop(),
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            logger.error({ error: inspect(error) }, "Error closing server");
            reject(error);
          } else {
            resolve();
          }
        });
      }),
    ]);
    // TODO: ideally we should let node exit on its own, but we have something that is holding the process open
    process.exit(0);
  };

  // Attempt graceful shutdown on SIGINT and SIGTERM
  process.on("SIGINT", async () => {
    logger.debug("Received SIGINT, attempting graceful shutdown");
    close();
  });

  process.on("SIGTERM", async () => {
    logger.debug("Received SIGTERM, attempting graceful shutdown");
    close();
  });

  return {
    scheduler: appScheduler,
    server,
    waitForServer: serverResolvers.promise,
    close,
  };
};
