import { describe, test, expect, vi } from "vitest";

import { fixtures } from "../fixtures";
import { makeDataStore } from "../makeDataStore";
import { Queue } from "../Queue";
import { Workflow } from "../Workflow";
import { publishJobLifecycle, LIFECYCLE_LIST_KEY } from "./Producer";
import { drainLifecycleList } from "./drainLifecycleList";

const makeTestQueues = async () => {
  const storage = await makeDataStore();

  const processStarts = vi.fn();
  const processCompletions = vi.fn();
  const processFailures = vi.fn();

  const TestQueue = new Queue({
    name: "drain-test",
    storage,
    processStarts,
    processCompletions,
    processFailures,
  });

  const workflowProcessFailures = vi.fn();
  const TestWorkflow = new Workflow({
    name: "drain-test-workflow",
    storage,
    processFailures: workflowProcessFailures,
  });

  return {
    storage,
    TestQueue,
    TestWorkflow,
    processStarts,
    processCompletions,
    processFailures,
    workflowProcessFailures,
  };
};

describe("drainLifecycleList", async () => {
  const ctx = fixtures(makeTestQueues);

  test("returns 0 when list is empty", async () => {
    const drained = await drainLifecycleList(ctx.storage);
    expect(drained).toBe(0);
  });

  test("drains job started messages and calls processStarts", async () => {
    await publishJobLifecycle(ctx.storage, {
      type: "job",
      event: "started",
      queue: "drain-test",
      jobId: "j1",
      workflow: "drain-test-workflow",
      workflowId: "wf1",
      timestamp: Date.now(),
      attemptNumber: 0,
    });

    const drained = await drainLifecycleList(ctx.storage);
    expect(drained).toBe(1);
    expect(ctx.processStarts).toHaveBeenCalledOnce();
    expect(ctx.processStarts).toHaveBeenCalledWith(
      [expect.objectContaining({ jobId: "j1", event: "started" })],
      expect.anything(),
    );
  });

  test("drains job completed messages and calls processCompletions", async () => {
    await publishJobLifecycle(ctx.storage, {
      type: "job",
      event: "completed",
      queue: "drain-test",
      jobId: "j2",
      workflow: "drain-test-workflow",
      workflowId: "wf1",
      timestamp: Date.now(),
      attemptNumber: 0,
    });

    await drainLifecycleList(ctx.storage);
    expect(ctx.processCompletions).toHaveBeenCalledOnce();
  });

  test("drains job failed messages and calls processFailures", async () => {
    await publishJobLifecycle(ctx.storage, {
      type: "job",
      event: "failed",
      queue: "drain-test",
      jobId: "j3",
      workflow: "drain-test-workflow",
      workflowId: "wf1",
      timestamp: Date.now(),
      attemptNumber: 2,
      details: { error: { message: "boom" } },
    });

    await drainLifecycleList(ctx.storage);
    expect(ctx.processFailures).toHaveBeenCalledOnce();
    expect(ctx.processFailures).toHaveBeenCalledWith(
      [expect.objectContaining({ jobId: "j3", details: { error: { message: "boom" } } })],
      expect.anything(),
    );
  });

  test("drains workflow failed messages and calls workflow processFailures", async () => {
    await publishJobLifecycle(ctx.storage, {
      type: "workflow",
      event: "failed",
      workflowId: "wf1",
      workflowName: "drain-test-workflow",
      orgId: "org1",
      timestamp: Date.now(),
      details: { error: { message: "workflow boom" } },
    });

    await drainLifecycleList(ctx.storage);
    expect(ctx.workflowProcessFailures).toHaveBeenCalledOnce();
  });

  test("batches multiple messages of the same type", async () => {
    for (let i = 0; i < 5; i++) {
      await publishJobLifecycle(ctx.storage, {
        type: "job",
        event: "started",
        queue: "drain-test",
        jobId: `batch-${i}`,
        workflow: "drain-test-workflow",
        workflowId: "wf1",
        timestamp: Date.now(),
        attemptNumber: 0,
      });
    }

    const drained = await drainLifecycleList(ctx.storage);
    expect(drained).toBe(5);
    expect(ctx.processStarts).toHaveBeenCalledOnce();
    expect(ctx.processStarts.mock.calls[0]![0]).toHaveLength(5);
  });

  test("list is empty after drain", async () => {
    await publishJobLifecycle(ctx.storage, {
      type: "job",
      event: "started",
      queue: "drain-test",
      jobId: "j-empty-check",
      workflow: "drain-test-workflow",
      workflowId: "wf1",
      timestamp: Date.now(),
      attemptNumber: 0,
    });

    await drainLifecycleList(ctx.storage);
    const remaining = await ctx.storage.llen(LIFECYCLE_LIST_KEY);
    expect(remaining).toBe(0);
  });

  test("respects batchSize limit", async () => {
    for (let i = 0; i < 10; i++) {
      await publishJobLifecycle(ctx.storage, {
        type: "job",
        event: "started",
        queue: "drain-test",
        jobId: `limit-${i}`,
        workflow: "drain-test-workflow",
        workflowId: "wf1",
        timestamp: Date.now(),
        attemptNumber: 0,
      });
    }

    const drained = await drainLifecycleList(ctx.storage, 3);
    expect(drained).toBe(3);

    const remaining = await ctx.storage.llen(LIFECYCLE_LIST_KEY);
    expect(remaining).toBe(7);
  });

  test("attempt messages are ignored by queue processors", async () => {
    await publishJobLifecycle(ctx.storage, {
      type: "attempt",
      event: "started",
      queue: "drain-test",
      jobId: "j-attempt",
      workflow: "drain-test-workflow",
      workflowId: "wf1",
      timestamp: Date.now(),
      attemptNumber: 1,
    });

    await drainLifecycleList(ctx.storage);
    expect(ctx.processStarts).not.toHaveBeenCalled();
    expect(ctx.processCompletions).not.toHaveBeenCalled();
    expect(ctx.processFailures).not.toHaveBeenCalled();
  });
});
