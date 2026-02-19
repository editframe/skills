import { logger } from "@/logging";
import { createEagerBootServer } from "@/http/createEagerBootServer";
import type { AbortableLoop } from "./AbortableLoop";
import type { Worker } from "./Worker";

export const createDirectWorkerServer = <Payload>(
  worker: Worker<Payload>,
  PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
) => {
  let workLoops: AbortableLoop[] = [];

  const eagerServer = createEagerBootServer({
    port: PORT,
    serviceName: `worker:${worker.name}`,
    createRequestHandler: async () => {
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

      return (_req, res) => {
        res.statusCode = 404;
        res.end();
      };
    },
    onClose: async () => {
      logger.info(
        { queue: worker.name, loopCount: workLoops.length },
        "Aborting work loops",
      );
      const loops = workLoops;
      workLoops = [];
      await Promise.all(loops.map((loop) => loop.abort()));
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
