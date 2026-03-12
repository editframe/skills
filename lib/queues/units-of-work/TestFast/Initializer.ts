import { logger } from "@/logging";
import { envInt } from "@/util/env";
import { valkey } from "@/valkey/valkey";
import { Queue } from "../../Queue";
import { Worker } from "../../Worker";
import { TestFastWorkflow } from "./Workflow";
import { TestFastMainQueue } from "./Main";

const MAX_WORKER_COUNT = envInt("TEST_FAST_INITIALIZER_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt(
  "TEST_FAST_INITIALIZER_WORKER_CONCURRENCY",
  1,
);

export interface TestFastInitializerPayload {
  testId: string;
  jobCount: number;
}

export const TestFastInitializerQueue = new Queue<TestFastInitializerPayload>({
  name: "test-fast-initializer",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,
});

export const TestFastInitializerWorker = new Worker({
  storage: valkey,
  queue: TestFastInitializerQueue,
  execute: async (job) => {
    logger.debug({ job }, "TestFastInitializerWorker executing");

    const { testId, jobCount } = job.payload;

    await TestFastWorkflow.setWorkflowData(job.workflowId, {
      testId,
      jobCount,
    });

    const mainJobs = [];
    for (let i = 0; i < jobCount; i++) {
      mainJobs.push({
        queue: TestFastMainQueue.name,
        orgId: job.orgId,
        workflowId: job.workflowId,
        jobId: `${job.workflowId}-main-${i}`,
        payload: {
          testId,
          jobIndex: i,
        },
      });
    }

    await TestFastWorkflow.enqueueJobs(...mainJobs);

    logger.debug(
      { testId, jobCount },
      "TestFastInitializerWorker enqueued main jobs",
    );
  },
});
