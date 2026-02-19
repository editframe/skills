import { describe, expect, test } from "vitest";
import SuperJSON from "superjson";

import { fixtures } from "../fixtures";
import { makeDataStore } from "../makeDataStore";
import { publishJobLifecycle, LIFECYCLE_LIST_KEY, type LifecycleMessage } from "./Producer";
import { Queue } from "../Queue";

const makeTestFixtures = async () => {
  const storage = await makeDataStore();
  const TestQueue = new Queue({ name: "test", storage });
  return { storage, TestQueue };
};

describe("lifecycle producer", async () => {
  const ctx = fixtures(makeTestFixtures);

  test("publishes job lifecycle message to list", async () => {
    await publishJobLifecycle(ctx.storage, {
      queue: "test",
      jobId: "1",
      attemptNumber: 1,
      workflow: "test-workflow",
      workflowId: "1",
      type: "job",
      event: "started",
      timestamp: 1000,
    });

    const raw = await ctx.storage.rpop(LIFECYCLE_LIST_KEY);
    expect(raw).toBeTruthy();
    const msg = SuperJSON.parse(raw!) as LifecycleMessage;
    expect(msg).toEqual({
      queue: "test",
      jobId: "1",
      attemptNumber: 1,
      workflow: "test-workflow",
      workflowId: "1",
      type: "job",
      event: "started",
      timestamp: 1000,
    });
  });

  test("publishes workflow lifecycle message to list", async () => {
    await publishJobLifecycle(ctx.storage, {
      workflowId: "wf1",
      workflowName: "render",
      orgId: "org1",
      type: "workflow",
      event: "failed",
      timestamp: 2000,
      details: { error: { message: "boom" } },
    });

    const raw = await ctx.storage.rpop(LIFECYCLE_LIST_KEY);
    const msg = SuperJSON.parse(raw!) as LifecycleMessage;
    expect(msg.type).toBe("workflow");
    expect(msg).toMatchObject({
      workflowId: "wf1",
      workflowName: "render",
      event: "failed",
      details: { error: { message: "boom" } },
    });
  });

  test("multiple messages accumulate in list", async () => {
    for (let i = 0; i < 5; i++) {
      await publishJobLifecycle(ctx.storage, {
        queue: "test",
        jobId: `job-${i}`,
        attemptNumber: 0,
        workflow: "test-workflow",
        workflowId: "wf1",
        type: "job",
        event: "started",
        timestamp: Date.now(),
      });
    }

    const len = await ctx.storage.llen(LIFECYCLE_LIST_KEY);
    expect(len).toBe(5);
  });
});
