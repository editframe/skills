import { describe, test, expect } from "vitest";
import { valkey } from "@/valkey/valkey";
import { TestFastWorkflow } from "@/queues/units-of-work/TestFast/Workflow";
import { TestFastInitializerQueue } from "@/queues/units-of-work/TestFast/Initializer";
import { randomUUID } from "node:crypto";

const SCHEDULER_URL = process.env.SCHEDULER_GO_URL || "http://scheduler-go:3000";
const JOB_COUNT = Number.parseInt(process.env.SCHEDULER_TEST_JOB_COUNT || "2000", 10);

async function getScalingInfo() {
  const response = await fetch(`${SCHEDULER_URL}/api/scaling-info`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scaling info: ${response.statusText}`);
  }
  return await response.json();
}

async function getStatus() {
  const response = await fetch(`${SCHEDULER_URL}/api/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }
  return await response.json();
}

describe("scheduler-go throughput and scaling", { timeout: 180000 }, () => {
  test("should process thousands of jobs and scale up/down correctly", async ({
    expect,
  }) => {
    const testId = randomUUID();
    const workflowId = `test-fast-${testId}`;
    const orgId = "test-org";

    const initialStatus = await getStatus();
    const initialMemory = initialStatus.memory.heapAlloc;

    console.log(`Starting test with ${JOB_COUNT} jobs, workflowId: ${workflowId}`);

    await TestFastWorkflow.setWorkflowData(workflowId, {
      testId,
      jobCount: JOB_COUNT,
    });

    await TestFastWorkflow.enqueueJob({
      queue: TestFastInitializerQueue,
      orgId,
      workflowId,
      jobId: `${workflowId}-initializer`,
      payload: {
        testId,
        jobCount: JOB_COUNT,
      },
    });

    console.log("Enqueued initializer job, waiting for scale-up...");

    await expect
      .poll(
        async () => {
          const scalingInfo = await getScalingInfo();
          const mainQueue = scalingInfo.find((q: any) => q.queueName === "test-fast-main");
          if (mainQueue && mainQueue.workingConnections > 0) {
            console.log(`Scaled up: ${mainQueue.workingConnections} working connections`);
            return true;
          }
          return false;
        },
        { timeout: 30000, interval: 500 },
      )
      .toBe(true);

    console.log("Scale-up detected, waiting for jobs to complete...");

    await expect
      .poll(
        async () => {
          const queued = await valkey.zcard(`workflows:${workflowId}:queued`);
          const claimed = await valkey.zcard(`workflows:${workflowId}:claimed`);
          const completed = await valkey.zcard(`workflows:${workflowId}:completed`);
          const failed = await valkey.zcard(`workflows:${workflowId}:failed`);

          console.log(`Progress: queued=${queued}, claimed=${claimed}, completed=${completed}, failed=${failed}`);

          if (failed > 0) {
            throw new Error(`${failed} jobs failed`);
          }

          return queued === 0 && claimed === 0 && completed >= JOB_COUNT;
        },
        { timeout: 120000, interval: 500 },
      )
      .toBe(true);

    const finalizerExists = await valkey.exists(`queues:test-fast-finalizer:jobs:${workflowId}-finalizer`);
    expect(finalizerExists).toBe(1);

    console.log("All jobs completed, waiting for finalizer...");

    await expect
      .poll(
        async () => {
          const finalizerCompleted = await valkey.zcard(`workflows:${workflowId}:completed`);
          return finalizerCompleted >= JOB_COUNT + 1;
        },
        { timeout: 30000, interval: 500 },
      )
      .toBe(true);

    console.log("Finalizer completed, waiting for scale-down...");

    await expect
      .poll(
        async () => {
          const scalingInfo = await getScalingInfo();
          const mainQueue = scalingInfo.find((q: any) => q.queueName === "test-fast-main");
          const initQueue = scalingInfo.find((q: any) => q.queueName === "test-fast-initializer");
          const finalQueue = scalingInfo.find((q: any) => q.queueName === "test-fast-finalizer");

          const allScaledDown =
            (!mainQueue || mainQueue.workingConnections === 0) &&
            (!initQueue || initQueue.workingConnections === 0) &&
            (!finalQueue || finalQueue.workingConnections === 0);

          if (allScaledDown) {
            console.log("All test queues scaled down to zero");
            return true;
          }
          return false;
        },
        { timeout: 60000, interval: 500 },
      )
      .toBe(true);

    const finalStatus = await getStatus();
    const finalMemory = finalStatus.memory.heapAlloc;
    const memoryGrowth = finalMemory - initialMemory;
    const memoryGrowthPercent = (memoryGrowth / initialMemory) * 100;

    console.log(`Memory: initial=${initialMemory}, final=${finalMemory}, growth=${memoryGrowthPercent.toFixed(2)}%`);

    expect(memoryGrowthPercent).toBeLessThan(50);
  });
});

