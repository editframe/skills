import { logger } from "@/logging";
import { envInt } from "@/util/env";
import { valkey } from "@/valkey/valkey";
import { Queue } from "../../Queue";
import { Worker } from "../../Worker";
import type { TestFastWorkflowData } from "./Workflow";

const MAX_WORKER_COUNT = envInt("TEST_FAST_FINALIZER_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt("TEST_FAST_FINALIZER_WORKER_CONCURRENCY", 1);

export const TestFastFinalizerQueue = new Queue<TestFastWorkflowData>({
  name: "test-fast-finalizer",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,
});

export const TestFastFinalizerWorker = new Worker({
  storage: valkey,
  queue: TestFastFinalizerQueue,
  execute: async (job) => {
    logger.debug({ job }, "TestFastFinalizerWorker executing");

    const { testId, jobCount } = job.payload;

    logger.info(
      { testId, jobCount },
      "TestFastFinalizerWorker completed workflow",
    );
  },
});
