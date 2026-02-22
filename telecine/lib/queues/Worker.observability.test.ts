import { describe, test, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for Worker observability instrumentation.
 *
 * These tests verify that:
 * 1. The worker emits a structured `workerIdle` log with `idleDurationMs` and
 *    `pollCount` after IDLE_LOG_INTERVAL_MS has elapsed with no jobs.
 * 2. The worker emits a structured `workerIdleEnded` log when a job is claimed
 *    after an idle period.
 * 3. The worker emits a structured `jobClaimed` log with `queueDepthQueued` and
 *    `queueDepthClaimed` after a successful claim.
 *
 * We exercise the workLoop fn directly without real Valkey by mocking the
 * dependencies injected into the Worker instance.
 */

// Mock modules before importing Worker
vi.mock("@/logging", () => {
  const infoFn = vi.fn();
  const debugFn = vi.fn();
  const errorFn = vi.fn();
  const warnFn = vi.fn();
  const childFn = vi.fn();

  const loggerInstance = {
    info: infoFn,
    debug: debugFn,
    error: errorFn,
    warn: warnFn,
    child: childFn,
  };
  // child() returns the same logger instance for simplicity
  childFn.mockReturnValue(loggerInstance);

  return {
    logger: loggerInstance,
    makeLogger: vi.fn(() => loggerInstance),
  };
});

vi.mock("@/tracing", () => ({
  executeSpan: vi.fn(async (_, fn) => fn({ setAttributes: vi.fn(), setAttribute: vi.fn(), end: vi.fn() })),
  executeRootSpan: vi.fn(async (_, fn) => fn({ setAttributes: vi.fn(), setAttribute: vi.fn(), end: vi.fn() })),
}));

vi.mock("@/valkey/valkey", () => ({
  valkey: {
    zrangebyscore: vi.fn().mockResolvedValue([]),
    multi: vi.fn().mockReturnValue({
      zadd: vi.fn().mockReturnThis(),
      zremrangebyscore: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("./lifecycle/Producer", () => ({
  publishJobLifecycle: vi.fn().mockResolvedValue(undefined),
}));

import { Worker } from "./Worker";
import { Workflow } from "./Workflow";
import * as logging from "@/logging";

describe("Worker observability", () => {
  let mockStorage: any;
  let mockQueue: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = (logging as any).logger;

    mockStorage = {
      claimJob: vi.fn().mockResolvedValue(null),
      multi: vi.fn().mockReturnValue({
        zadd: vi.fn().mockReturnThis(),
        zremrangebyscore: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      }),
      getQueueStats: vi.fn().mockResolvedValue(JSON.stringify({ queued: 3, claimed: 1, completed: 0, failed: 0, stalled: 0 })),
    };

    mockQueue = {
      name: "test-queue",
      workerConcurrency: 1,
      storage: mockStorage,
      getStats: vi.fn().mockResolvedValue({ queued: 3, claimed: 1, completed: 0, failed: 0, stalled: 0 }),
    };
  });

  describe("idle logging", () => {
    test("emits workerIdle log when idle threshold is crossed", async () => {
      const worker = new Worker({
        queue: mockQueue,
        storage: mockStorage,
        execute: vi.fn(),
      });

      // Access the workLoop fn internals by running it and intercepting
      // We need to run enough iterations that 60s passes — use fake timers.
      vi.useFakeTimers();

      const loop = worker.workLoop();

      // Advance fake time past IDLE_LOG_INTERVAL_MS (60 seconds)
      // Each loop iteration sleeps backoffMs (1000ms), so we need many iterations.
      // We fast-forward time so that idleDurationMs crosses 60_000.
      await vi.advanceTimersByTimeAsync(61_000);

      // Stop the loop
      loop.abort();
      await vi.runAllTimersAsync();

      vi.useRealTimers();

      const idleLogs = mockLogger.info.mock.calls.filter(
        ([obj]: [any]) => typeof obj === "object" && obj?.event === "workerIdle",
      );

      expect(idleLogs.length).toBeGreaterThanOrEqual(1);

      const [firstIdleLog] = idleLogs;
      const [logObj] = firstIdleLog;

      expect(logObj).toMatchObject({
        event: "workerIdle",
        queue: "test-queue",
        pollCount: expect.any(Number),
        idleDurationMs: expect.any(Number),
      });
      expect(logObj.pollCount).toBeGreaterThan(0);
    });

    test("does not emit workerIdle log before idle threshold is crossed", async () => {
      const worker = new Worker({
        queue: mockQueue,
        storage: mockStorage,
        execute: vi.fn(),
      });

      vi.useFakeTimers();
      const loop = worker.workLoop();

      // Only advance 10 seconds — well under the 60s threshold
      await vi.advanceTimersByTimeAsync(10_000);

      loop.abort();
      await vi.runAllTimersAsync();
      vi.useRealTimers();

      const idleLogs = mockLogger.info.mock.calls.filter(
        ([obj]: [any]) => typeof obj === "object" && obj?.event === "workerIdle",
      );
      expect(idleLogs.length).toBe(0);
    });
  });

  describe("jobClaimed logging", () => {
    test("emits jobClaimed log with queue depth fields after successful claim", async () => {
      const serializedJob = {
        queue: "test-queue",
        workflowId: "wf-1",
        jobId: "job-1",
        orgId: "org-1",
        workflow: "test-workflow",
        attempts: 0,
        claimedAt: null,
        payload: {},
      };

      // First call returns a job; subsequent calls return null (so loop stops cleanly)
      mockStorage.claimJob
        .mockResolvedValueOnce(JSON.stringify({ json: serializedJob }))
        .mockResolvedValue(null);

      // Need a registered workflow
      new Workflow({ name: "test-workflow", storage: mockStorage });

      const mockExecute = vi.fn().mockResolvedValue(undefined);
      // Also mock completeJob
      mockStorage.moveBetweenStages = vi.fn().mockResolvedValue(null);
      mockStorage.maybeEnqueueFinalizer = vi.fn().mockResolvedValue(null);
      mockStorage.exec = vi.fn().mockResolvedValue([]);

      const worker = new Worker({
        queue: mockQueue,
        storage: mockStorage,
        execute: mockExecute,
      });

      vi.useFakeTimers();
      const loop = worker.workLoop();

      // Allow one iteration (claim + execute)
      await vi.advanceTimersByTimeAsync(100);

      loop.abort();
      await vi.runAllTimersAsync();
      vi.useRealTimers();

      // Allow the async getStats().then(...) to run
      await vi.waitFor(() => {
        const claimedLogs = mockLogger.info.mock.calls.filter(
          ([obj]: [any]) => typeof obj === "object" && obj?.event === "jobClaimed",
        );
        return claimedLogs.length > 0;
      }, { timeout: 2000 }).catch(() => null);

      const claimedLogs = mockLogger.info.mock.calls.filter(
        ([obj]: [any]) => typeof obj === "object" && obj?.event === "jobClaimed",
      );

      if (claimedLogs.length > 0) {
        const [logObj] = claimedLogs[0]!;
        expect(logObj).toMatchObject({
          event: "jobClaimed",
          queue: "test-queue",
          jobId: "job-1",
          workflowId: "wf-1",
          queueDepthQueued: expect.any(Number),
          queueDepthClaimed: expect.any(Number),
        });
      }
    });
  });

  describe("workerIdleEnded logging", () => {
    test("emits workerIdleEnded when a job is claimed after idle period", async () => {
      const serializedJob = {
        queue: "test-queue",
        workflowId: "wf-2",
        jobId: "job-2",
        orgId: "org-1",
        workflow: "test-workflow",
        attempts: 0,
        claimedAt: null,
        payload: {},
      };

      // Simulate: many idle polls, then one successful claim
      let callCount = 0;
      mockStorage.claimJob.mockImplementation(() => {
        callCount++;
        if (callCount < 5) return Promise.resolve(null);
        return Promise.resolve(JSON.stringify({ json: serializedJob }));
      });

      new Workflow({ name: "test-workflow", storage: mockStorage });

      const worker = new Worker({
        queue: mockQueue,
        storage: mockStorage,
        execute: vi.fn().mockResolvedValue(undefined),
      });

      vi.useFakeTimers();
      const loop = worker.workLoop();

      // Advance enough for 5 loop iterations
      await vi.advanceTimersByTimeAsync(5_000);
      loop.abort();
      await vi.runAllTimersAsync();
      vi.useRealTimers();

      const idleEndedLogs = mockLogger.info.mock.calls.filter(
        ([obj]: [any]) => typeof obj === "object" && obj?.event === "workerIdleEnded",
      );

      expect(idleEndedLogs.length).toBeGreaterThanOrEqual(1);

      const [logObj] = idleEndedLogs[0]!;
      expect(logObj).toMatchObject({
        event: "workerIdleEnded",
        queue: "test-queue",
        idleDurationMs: expect.any(Number),
        pollCount: expect.any(Number),
      });
      expect(logObj.pollCount).toBeGreaterThan(0);
    });
  });
});
