import { describe, test, expect } from "vitest";
import { valkey } from "@/valkey/valkey";
import { TestFastWorkflow } from "@/queues/units-of-work/TestFast/Workflow";
import { TestFastInitializerQueue } from "@/queues/units-of-work/TestFast/Initializer";
import { randomUUID } from "node:crypto";

const SCHEDULER_URL =
  process.env.SCHEDULER_GO_URL || "http://scheduler-go:3000";

async function getStatus() {
  const response = await fetch(`${SCHEDULER_URL}/api/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }
  return await response.json();
}

describe("scheduler-go disconnect behavior", { timeout: 60000 }, () => {
  test("should disconnect workers quickly during scale-down", async ({
    expect,
  }) => {
    const testId = randomUUID();
    const workflowId = `test-disconnect-${testId}`;
    const orgId = "test-org";

    console.log(`Starting disconnect test with workflowId: ${workflowId}`);

    await TestFastWorkflow.setWorkflowData(workflowId, {
      testId,
      jobCount: 50,
    });

    await TestFastWorkflow.enqueueJob({
      queue: TestFastInitializerQueue,
      orgId,
      workflowId,
      jobId: `${workflowId}-initializer`,
      payload: {
        testId,
        jobCount: 50,
      },
    });

    console.log("Waiting for connections to scale up...");

    await expect
      .poll(
        async () => {
          const status = await getStatus();
          const mainQueue = status.connections.find(
            (c: any) => c.queueName === "test-fast-main",
          );
          return mainQueue && mainQueue.totalConnections > 0;
        },
        { timeout: 20000, interval: 500 },
      )
      .toBe(true);

    const statusDuringWork = await getStatus();
    const mainQueueDuringWork = statusDuringWork.connections.find(
      (c: any) => c.queueName === "test-fast-main",
    );
    console.log(
      `Connections during work: ${mainQueueDuringWork.totalConnections}`,
    );

    console.log("Waiting for jobs to complete...");

    await expect
      .poll(
        async () => {
          const queued = await valkey.zcard(`workflows:${workflowId}:queued`);
          const claimed = await valkey.zcard(`workflows:${workflowId}:claimed`);
          return queued === 0 && claimed === 0;
        },
        { timeout: 30000, interval: 500 },
      )
      .toBe(true);

    console.log("Jobs completed, measuring disconnect time...");

    const disconnectStartTime = Date.now();

    await expect
      .poll(
        async () => {
          const status = await getStatus();
          const mainQueue = status.connections.find(
            (c: any) => c.queueName === "test-fast-main",
          );
          return !mainQueue || mainQueue.totalConnections === 0;
        },
        { timeout: 15000, interval: 300 },
      )
      .toBe(true);

    const disconnectDuration = Date.now() - disconnectStartTime;
    console.log(`Disconnect duration: ${disconnectDuration}ms`);

    expect(disconnectDuration).toBeLessThan(10000);
  });

  test("should maintain connection counts accurately", async () => {
    const status = await getStatus();

    for (const conn of status.connections) {
      expect(conn.totalConnections).toBeGreaterThanOrEqual(0);
      expect(conn.workingConnections).toBeGreaterThanOrEqual(0);
      expect(conn.totalConnections).toBeGreaterThanOrEqual(
        conn.workingConnections,
      );
    }

    const scalingInfo = status.scaling;
    for (const scaling of scalingInfo) {
      const conn = status.connections.find(
        (c: any) => c.queueName === scaling.queueName,
      );
      if (conn) {
        expect(scaling.workingConnections).toBe(conn.workingConnections);
      }
    }
  });
});
