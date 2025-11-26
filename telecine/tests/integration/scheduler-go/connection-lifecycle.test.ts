import { describe, test, expect, beforeAll } from "vitest";
import { TestFastInitializerQueue } from "@/queues/units-of-work/TestFast/Initializer";
import { TestFastMainQueue } from "@/queues/units-of-work/TestFast/Main";
import { TestFastWorkflow } from "@/queues/units-of-work/TestFast/Workflow";
import { valkey } from "@/valkey/valkey";

const SCHEDULER_URL = "http://scheduler-go:3000";
const SMALL_JOB_COUNT = 10;
const CYCLES = 5;

interface StatusResponse {
  memory: {
    heapAlloc: number;
    heapInUse: number;
    heapSys: number;
    totalAlloc: number;
    numGC: number;
    lastGC: number;
  };
  goroutines: number;
  connections: Array<{
    queueName: string;
    totalConnections: number;
    workingConnections: number;
  }>;
  scaling: Array<{
    queueName: string;
    rawTarget: number;
    smoothedTarget: number;
    actualTarget: number;
    workingConnections: number;
    naturalQueueDepth: number;
  }>;
}

async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch(`${SCHEDULER_URL}/api/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }
  return response.json();
}

async function getQueueStats(queueName: string) {
  const statsJson = await valkey.getQueueStats(queueName);
  return JSON.parse(statsJson);
}

describe("scheduler-go connection lifecycle", () => {
  beforeAll(async () => {
    await valkey.flushdb();
  });

  test("should handle multiple connect/disconnect cycles with small job batches", async ({
    expect,
  }) => {
    const cycleResults = [];

    for (let cycle = 0; cycle < CYCLES; cycle++) {
      console.log(`\n=== Cycle ${cycle + 1}/${CYCLES} ===`);

      const statusBefore = await fetchStatus();
      const mainQueueBefore = statusBefore.connections.find(
        (c) => c.queueName === "test-fast-main",
      );
      console.log(
        `Before: test-fast-main connections=${mainQueueBefore?.totalConnections || 0}`,
      );

      const workflowId = `connection-lifecycle-cycle-${cycle}-${Date.now()}`;
      const testId = `cycle-${cycle}`;

      await TestFastWorkflow.setWorkflowData(workflowId, {
        testId,
        jobCount: SMALL_JOB_COUNT,
      });

      await TestFastWorkflow.enqueueJob({
        queue: TestFastInitializerQueue,
        orgId: "test-org",
        workflowId,
        jobId: `${workflowId}-initializer`,
        payload: {
          testId,
          jobCount: SMALL_JOB_COUNT,
        },
      });

      console.log(`Enqueued ${SMALL_JOB_COUNT} jobs for cycle ${cycle + 1}`);

      let maxConnections = 0;

      await expect
        .poll(
          async () => {
            const status = await fetchStatus();
            const mainQueue = status.connections.find(
              (c) => c.queueName === "test-fast-main",
            );
            if (mainQueue && mainQueue.totalConnections > 0) {
              maxConnections = Math.max(
                maxConnections,
                mainQueue.totalConnections,
              );
              return true;
            }
            return false;
          },
          { timeout: 5000, interval: 50 },
        )
        .toBe(true);

      console.log(`Connection established: ${maxConnections} workers`);

      await expect
        .poll(
          async () => {
            const stats = await getQueueStats("test-fast-main");
            return stats.queued === 0 && stats.claimed === 0;
          },
          { timeout: 10000, interval: 200 },
        )
        .toBe(true);

      console.log(`Main queue drained for cycle ${cycle + 1}`);

      await expect
        .poll(
          async () => {
            const status = await fetchStatus();
            const queueConn = status.connections.find(
              (c) => c.queueName === "test-fast-main",
            );
            return queueConn?.totalConnections === 0;
          },
          { timeout: 10000, interval: 300 },
        )
        .toBe(true);

      console.log(`Connections scaled down to 0 for cycle ${cycle + 1}`);

      cycleResults.push({
        cycle: cycle + 1,
        maxConnections,
      });
    }

    console.log("\n=== Cycle Summary ===");
    for (const result of cycleResults) {
      console.log(`Cycle ${result.cycle}: max=${result.maxConnections}`);
    }

    const allEstablishedConnections = cycleResults.every(
      (r) => r.maxConnections > 0,
    );
    expect(allEstablishedConnections).toBe(true);

    console.log("\n✓ All cycles completed successfully");
    console.log(`✓ Connections established in all ${CYCLES} cycles`);
    console.log(`✓ Connections scaled down to 0 in all ${CYCLES} cycles`);
  }, 120000);

  test("should maintain stable goroutine count across multiple cycles", async ({
    expect,
  }) => {
    const goroutineSamples: number[] = [];

    for (let cycle = 0; cycle < 3; cycle++) {
      const workflowId = `goroutine-test-cycle-${cycle}-${Date.now()}`;
      const testId = `goroutine-cycle-${cycle}`;

      await TestFastWorkflow.setWorkflowData(workflowId, {
        testId,
        jobCount: 5,
      });

      await TestFastWorkflow.enqueueJob({
        queue: TestFastInitializerQueue,
        orgId: "test-org",
        workflowId,
        jobId: `${workflowId}-initializer`,
        payload: {
          testId,
          jobCount: 5,
        },
      });

      await expect
        .poll(
          async () => {
            const stats = await getQueueStats("test-fast-main");
            return stats.queued === 0 && stats.claimed === 0;
          },
          { timeout: 10000, interval: 200 },
        )
        .toBe(true);

      await expect
        .poll(
          async () => {
            const status = await fetchStatus();
            const queueConn = status.connections.find(
              (c) => c.queueName === "test-fast-main",
            );
            return queueConn?.totalConnections === 0;
          },
          { timeout: 10000, interval: 300 },
        )
        .toBe(true);

      const status = await fetchStatus();
      goroutineSamples.push(status.goroutines);
      console.log(`Cycle ${cycle + 1}: goroutines=${status.goroutines}`);
    }

    const maxGoroutines = Math.max(...goroutineSamples);
    const minGoroutines = Math.min(...goroutineSamples);
    const goroutineVariance = maxGoroutines - minGoroutines;

    console.log(
      `Goroutine variance: ${goroutineVariance} (min=${minGoroutines}, max=${maxGoroutines})`,
    );

    expect(goroutineVariance).toBeLessThan(20);
  }, 60000);
});
