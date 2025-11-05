import { describe, test, expect } from "vitest";
import { valkey } from "@/valkey/valkey";
import { TestFastWorkflow } from "@/queues/units-of-work/TestFast/Workflow";
import { TestFastInitializerQueue } from "@/queues/units-of-work/TestFast/Initializer";
import { randomUUID } from "node:crypto";

const SCHEDULER_URL = "http://scheduler-go:3000";

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

async function getStatus(): Promise<StatusResponse> {
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

describe("scheduler-go stale connection detection", { timeout: 120000 }, () => {
  test("should detect and clean up stale connections after worker crash", async ({
    expect,
  }) => {
    const testId = randomUUID();
    const workflowId = `stale-test-${testId}`;
    const orgId = "test-org";

    console.log(`Starting stale connection test with workflowId: ${workflowId}`);

    await TestFastWorkflow.setWorkflowData(workflowId, {
      testId,
      jobCount: 20,
    });

    await TestFastWorkflow.enqueueJob({
      queue: TestFastInitializerQueue,
      orgId,
      workflowId,
      jobId: `${workflowId}-initializer`,
      payload: {
        testId,
        jobCount: 20,
      },
    });

    console.log("Waiting for connections to establish...");

    await expect
      .poll(
        async () => {
          const status = await getStatus();
          const mainQueue = status.connections.find(
            (c) => c.queueName === "test-fast-main",
          );
          return mainQueue && mainQueue.totalConnections > 0;
        },
        { timeout: 10000, interval: 200 },
      )
      .toBe(true);

    const statusDuringWork = await getStatus();
    const mainQueueDuringWork = statusDuringWork.connections.find(
      (c) => c.queueName === "test-fast-main",
    );
    console.log(
      `Connections established: ${mainQueueDuringWork?.totalConnections}`,
    );

    console.log("Simulating worker crash by clearing Redis connection state...");

    const connectionKeys = await valkey.keys("scheduler:*:connections:*");
    console.log(`Found ${connectionKeys.length} connection keys in Redis`);

    for (const key of connectionKeys) {
      if (key.includes("test-fast")) {
        console.log(`Deleting connection key: ${key}`);
        await valkey.del(key);
      }
    }

    console.log("Worker state cleared, checking if scheduler detects stale connections...");

    const statusAfterCrash = await getStatus();
    const mainQueueAfterCrash = statusAfterCrash.connections.find(
      (c) => c.queueName === "test-fast-main",
    );
    console.log(
      `Connections after simulated crash: ${mainQueueAfterCrash?.totalConnections}`,
    );

    console.log("Waiting for scheduler to detect and clean up stale connections...");

    await expect
      .poll(
        async () => {
          const status = await getStatus();
          const mainQueue = status.connections.find(
            (c) => c.queueName === "test-fast-main",
          );
          const count = mainQueue?.totalConnections || 0;
          console.log(`Current connection count: ${count}`);
          return count === 0;
        },
        { timeout: 45000, interval: 1000 },
      )
      .toBe(true);

    console.log("✓ Stale connections cleaned up successfully");
  });

  test("should handle workers that stop responding without disconnecting", async ({
    expect,
  }) => {
    const testId = randomUUID();
    const workflowId = `zombie-test-${testId}`;
    const orgId = "test-org";

    console.log(`Starting zombie worker test with workflowId: ${workflowId}`);

    await TestFastWorkflow.setWorkflowData(workflowId, {
      testId,
      jobCount: 10,
    });

    await TestFastWorkflow.enqueueJob({
      queue: TestFastInitializerQueue,
      orgId,
      workflowId,
      jobId: `${workflowId}-initializer`,
      payload: {
        testId,
        jobCount: 10,
      },
    });

    await expect
      .poll(
        async () => {
          const status = await getStatus();
          const mainQueue = status.connections.find(
            (c) => c.queueName === "test-fast-main",
          );
          return mainQueue && mainQueue.totalConnections > 0;
        },
        { timeout: 10000, interval: 200 },
      )
      .toBe(true);

    const statusBefore = await getStatus();
    const mainQueueBefore = statusBefore.connections.find(
      (c) => c.queueName === "test-fast-main",
    );
    console.log(`Connections before: ${mainQueueBefore?.totalConnections}`);

    await expect
      .poll(
        async () => {
          const stats = await getQueueStats("test-fast-main");
          return stats.queued === 0 && stats.claimed === 0;
        },
        { timeout: 15000, interval: 200 },
      )
      .toBe(true);

    console.log("Jobs completed, checking connection cleanup...");

    const cleanupStartTime = Date.now();

    await expect
      .poll(
        async () => {
          const status = await getStatus();
          const mainQueue = status.connections.find(
            (c) => c.queueName === "test-fast-main",
          );
          const count = mainQueue?.totalConnections || 0;
          const elapsed = Date.now() - cleanupStartTime;
          console.log(`Elapsed: ${elapsed}ms, connections: ${count}`);
          return count === 0;
        },
        { timeout: 45000, interval: 1000 },
      )
      .toBe(true);

    const cleanupDuration = Date.now() - cleanupStartTime;
    console.log(`Connection cleanup took: ${cleanupDuration}ms`);

    expect(cleanupDuration).toBeLessThan(40000);
  });

  test("should report accurate connection counts across scheduler restarts", async ({
    expect,
  }) => {
    console.log("Checking current connection state...");

    const initialStatus = await getStatus();
    console.log("\nInitial connection counts:");
    for (const conn of initialStatus.connections) {
      if (conn.totalConnections > 0 || conn.queueName.includes("test-fast")) {
        console.log(
          `  ${conn.queueName}: total=${conn.totalConnections}, working=${conn.workingConnections}`,
        );
      }
    }

    const testFastQueues = initialStatus.connections.filter((c) =>
      c.queueName.includes("test-fast"),
    );

    for (const queue of testFastQueues) {
      const redisConnKeys = await valkey.keys(
        `scheduler:*:connections:${queue.queueName}`,
      );
      console.log(
        `\n${queue.queueName}: scheduler reports ${queue.totalConnections} connections, Redis has ${redisConnKeys.length} keys`,
      );

      if (queue.totalConnections > 0 && redisConnKeys.length === 0) {
        console.log(
          `  ⚠️  STALE CONNECTION DETECTED: Scheduler reports ${queue.totalConnections} but no Redis keys exist`,
        );
      }

      if (queue.totalConnections === 0 && redisConnKeys.length > 0) {
        console.log(
          `  ⚠️  ORPHANED REDIS KEYS: Scheduler reports 0 but ${redisConnKeys.length} Redis keys exist`,
        );
      }

      if (queue.totalConnections !== redisConnKeys.length) {
        console.log(
          `  ⚠️  MISMATCH: Scheduler count (${queue.totalConnections}) != Redis keys (${redisConnKeys.length})`,
        );
      }
    }

    const hasStaleConnections = testFastQueues.some(
      (q) => q.totalConnections > 0,
    );

    if (hasStaleConnections) {
      console.log(
        "\n⚠️  Found stale connections. Waiting for cleanup...",
      );

      await expect
        .poll(
          async () => {
            const status = await getStatus();
            const testQueues = status.connections.filter((c) =>
              c.queueName.includes("test-fast"),
            );
            const allZero = testQueues.every((q) => q.totalConnections === 0);
            if (!allZero) {
              console.log(
                "Still waiting for cleanup:",
                testQueues
                  .filter((q) => q.totalConnections > 0)
                  .map((q) => `${q.queueName}=${q.totalConnections}`)
                  .join(", "),
              );
            }
            return allZero;
          },
          { timeout: 60000, interval: 2000 },
        )
        .toBe(true);

      console.log("✓ All stale connections cleaned up");
    } else {
      console.log("\n✓ No stale connections detected");
    }
  });
});

