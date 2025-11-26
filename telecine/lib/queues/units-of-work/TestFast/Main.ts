import { logger } from "@/logging";
import { envInt, envString } from "@/util/env";
import { valkey } from "@/valkey/valkey";
import { Queue } from "../../Queue";
import { Worker } from "../../Worker";
import { ConnectionURLMap } from "../../WorkerConnection";

const QUEUE_URL = envString(
  "TEST_FAST_MAIN_WEBSOCKET_HOST",
  "ws://localhost:3000",
);
const MAX_WORKER_COUNT = envInt("TEST_FAST_MAIN_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt("TEST_FAST_MAIN_WORKER_CONCURRENCY", 1);

export interface TestFastMainPayload {
  testId: string;
  jobIndex: number;
}

export const TestFastMainQueue = new Queue<TestFastMainPayload>({
  name: "test-fast-main",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,
});
ConnectionURLMap.set(TestFastMainQueue, QUEUE_URL);

export const TestFastMainWorker = new Worker({
  storage: valkey,
  queue: TestFastMainQueue,
  execute: async (job) => {
    logger.debug({ job }, "TestFastMainWorker executing");

    const start = Date.now();
    while (Date.now() - start < 10) {
      // Busy wait for 10ms to simulate minimal work
    }

    logger.debug(
      { testId: job.payload.testId, jobIndex: job.payload.jobIndex },
      "TestFastMainWorker completed",
    );
  },
});
