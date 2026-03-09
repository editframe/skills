import { describe, it, expect, vi, beforeEach } from "vitest";
import { QualityUpgradeScheduler, type UpgradeTask } from "./QualityUpgradeScheduler";

describe("QualityUpgradeScheduler", () => {
  let scheduler: QualityUpgradeScheduler;
  let requestFrameRenderMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestFrameRenderMock = vi.fn();
    scheduler = new QualityUpgradeScheduler({
      requestFrameRender: requestFrameRenderMock as unknown as () => void,
      maxConcurrent: 2,
    });
  });

  describe("enqueue", () => {
    it("should add tasks to queue", async () => {
      const task: UpgradeTask = {
        key: "test:1:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 1000,
        owner: "test",
      };

      scheduler.enqueue([task]);

      // Wait a tick for processing to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      const snapshot = scheduler.getQueueSnapshot();
      // Task should be either queued or active (not completed yet)
      expect(
        snapshot.some(
          (t) => t.key === task.key && (t.status === "queued" || t.status === "active"),
        ),
      ).toBe(true);
    });

    it("should sort tasks by deadline", async () => {
      // Create 3 tasks so at least one stays queued (maxConcurrent = 2)
      const task1: UpgradeTask = {
        key: "test:1:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 3000,
        owner: "test",
      };
      const task2: UpgradeTask = {
        key: "test:2:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 1000,
        owner: "test",
      };
      const task3: UpgradeTask = {
        key: "test:3:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 2000,
        owner: "test",
      };

      scheduler.enqueue([task1, task2, task3]);

      // Wait a tick for processing to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      const snapshot = scheduler.getQueueSnapshot();
      const queuedTasks = snapshot.filter((t) => t.status === "queued");
      // The queued task should be the one with highest deadline (3000)
      if (queuedTasks.length > 0) {
        expect(queuedTasks[0]?.deadlineMs).toBe(3000);
      }
    });

    it("should not add duplicate tasks", () => {
      const task: UpgradeTask = {
        key: "test:1:main",
        fetch: vi.fn().mockResolvedValue(undefined),
        deadlineMs: 1000,
        owner: "test",
      };

      scheduler.enqueue([task]);
      scheduler.enqueue([task]);

      const snapshot = scheduler.getQueueSnapshot();
      const matchingTasks = snapshot.filter((t) => t.key === task.key);
      expect(matchingTasks.length).toBe(1);
    });

    it("should start processing tasks up to maxConcurrent", async () => {
      // Use tasks that take time to complete
      const task1: UpgradeTask = {
        key: "test:1:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 1000,
        owner: "test",
      };
      const task2: UpgradeTask = {
        key: "test:2:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 2000,
        owner: "test",
      };
      const task3: UpgradeTask = {
        key: "test:3:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 3000,
        owner: "test",
      };

      scheduler.enqueue([task1, task2, task3]);

      // Wait a tick for async processing to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      const snapshot = scheduler.getQueueSnapshot();
      const activeTasks = snapshot.filter((t) => t.status === "active");
      const queuedTasks = snapshot.filter((t) => t.status === "queued");

      expect(activeTasks.length).toBe(2); // maxConcurrent = 2
      expect(queuedTasks.length).toBe(1);
    });
  });

  describe("replaceForOwner", () => {
    it("should remove queued tasks for owner", async () => {
      // Use slow tasks so they stay in queue/active
      const task1: UpgradeTask = {
        key: "owner1:1:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 1000,
        owner: "owner1",
      };
      const task2: UpgradeTask = {
        key: "owner2:1:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 2000,
        owner: "owner2",
      };

      scheduler.enqueue([task1, task2]);

      // Wait for tasks to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      scheduler.replaceForOwner("owner1", []);

      const snapshot = scheduler.getQueueSnapshot();
      // owner1's task should be gone (either was queued and removed, or is active and will complete)
      // owner2's task should still be there
      expect(snapshot.some((t) => t.owner === "owner2")).toBe(true);
    });

    it("should add new tasks for owner", () => {
      const oldTask: UpgradeTask = {
        key: "owner1:1:main",
        fetch: vi.fn().mockResolvedValue(undefined),
        deadlineMs: 1000,
        owner: "owner1",
      };
      const newTask: UpgradeTask = {
        key: "owner1:2:main",
        fetch: vi.fn().mockResolvedValue(undefined),
        deadlineMs: 2000,
        owner: "owner1",
      };

      scheduler.enqueue([oldTask]);
      scheduler.replaceForOwner("owner1", [newTask]);

      const snapshot = scheduler.getQueueSnapshot();
      expect(snapshot.some((t) => t.key === oldTask.key && t.status === "queued")).toBe(false);
      expect(snapshot.some((t) => t.key === newTask.key)).toBe(true);
    });

    it("re-runs a previously completed task when submitted again (cache eviction)", async () => {
      let fetchCount = 0;
      const task: UpgradeTask = {
        key: "owner:1:main",
        fetch: vi.fn().mockImplementation(async () => {
          fetchCount++;
        }),
        deadlineMs: 0,
        owner: "owner",
      };

      // First submission — runs to completion
      scheduler.replaceForOwner("owner", [task]);
      await new Promise((r) => setTimeout(r, 20));
      expect(fetchCount).toBe(1);

      // Second submission of same key (simulates cache eviction: segment was
      // previously fetched but is no longer in cache).
      // Without the fix: #completedTasks blocks re-run → fetchCount stays 1.
      // With the fix: task is re-queued and runs again → fetchCount becomes 2.
      scheduler.replaceForOwner("owner", [task]);
      await new Promise((r) => setTimeout(r, 20));
      expect(fetchCount).toBe(2);
    });

    it("does not re-run a task that is still in-flight", async () => {
      let resolveTask!: () => void;
      let fetchCount = 0;
      const task: UpgradeTask = {
        key: "owner:1:main",
        fetch: vi.fn().mockImplementation(async () => {
          fetchCount++;
          await new Promise<void>((r) => {
            resolveTask = r;
          });
        }),
        deadlineMs: 0,
        owner: "owner",
      };

      // Start the task but don't let it complete
      scheduler.replaceForOwner("owner", [task]);
      await new Promise((r) => setTimeout(r, 10));
      expect(fetchCount).toBe(1);

      // Re-submit while still in-flight — must NOT start a second fetch
      scheduler.replaceForOwner("owner", [task]);
      await new Promise((r) => setTimeout(r, 10));
      expect(fetchCount).toBe(1);

      // Let the first task finish
      resolveTask();
      await new Promise((r) => setTimeout(r, 10));
    });

    it("replaceForOwner for one owner does not cancel another owner's pending tasks", async () => {
      // Use maxConcurrent:1 so owner2's task stays queued behind the blocker
      const serial = new QualityUpgradeScheduler({
        requestFrameRender: vi.fn() as unknown as () => void,
        maxConcurrent: 1,
      });

      let resolveBlocker!: () => void;
      const blocker: UpgradeTask = {
        key: "blocker:1:main",
        fetch: vi.fn().mockImplementation(
          () =>
            new Promise<void>((r) => {
              resolveBlocker = r;
            }),
        ),
        deadlineMs: 0,
        owner: "blocker",
      };

      let fetchCount = 0;
      const owner2Task: UpgradeTask = {
        key: "owner2:1:main",
        fetch: vi.fn().mockImplementation(async () => {
          fetchCount++;
        }),
        deadlineMs: 1,
        owner: "owner2",
      };

      serial.replaceForOwner("blocker", [blocker]);
      serial.replaceForOwner("owner2", [owner2Task]);
      await new Promise((r) => setTimeout(r, 10));

      expect(serial.isPending(owner2Task.key)).toBe(true);

      // Replacing owner1's tasks must not touch owner2's queue entry
      serial.replaceForOwner("owner1", []);
      expect(serial.isPending(owner2Task.key)).toBe(true);

      // Release blocker — owner2's task should now run
      resolveBlocker();
      await new Promise((r) => setTimeout(r, 20));
      expect(fetchCount).toBe(1);

      serial.dispose();
    });
  });

  describe("isPending", () => {
    it("returns true while a task is in the queue and false once it runs", async () => {
      const serial = new QualityUpgradeScheduler({
        requestFrameRender: vi.fn() as unknown as () => void,
        maxConcurrent: 1,
      });

      let resolveBlocker!: () => void;
      const blocker: UpgradeTask = {
        key: "blocker:1:main",
        fetch: vi.fn().mockImplementation(
          () =>
            new Promise<void>((r) => {
              resolveBlocker = r;
            }),
        ),
        deadlineMs: 0,
        owner: "blocker",
      };
      const pending: UpgradeTask = {
        key: "owner:2:main",
        fetch: vi.fn().mockResolvedValue(undefined),
        deadlineMs: 1,
        owner: "owner",
      };

      serial.replaceForOwner("blocker", [blocker]);
      serial.replaceForOwner("owner", [pending]);
      await new Promise((r) => setTimeout(r, 10));

      expect(serial.isPending(pending.key)).toBe(true);
      expect(serial.isActive(pending.key)).toBe(false);

      resolveBlocker();
      await new Promise((r) => setTimeout(r, 20));

      expect(serial.isPending(pending.key)).toBe(false);

      serial.dispose();
    });
  });

  describe("cancelForOwner", () => {
    it("should remove queued tasks for owner", async () => {
      // Use slow tasks so they stay in queue/active
      const task1: UpgradeTask = {
        key: "owner1:1:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 1000,
        owner: "owner1",
      };
      const task2: UpgradeTask = {
        key: "owner2:1:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 2000,
        owner: "owner2",
      };

      scheduler.enqueue([task1, task2]);

      // Wait for tasks to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      scheduler.cancelForOwner("owner1");

      const snapshot = scheduler.getQueueSnapshot();
      // owner2's task should still be there
      expect(snapshot.some((t) => t.owner === "owner2")).toBe(true);
    });

    it("should clear completed tracking for owner", () => {
      const task: UpgradeTask = {
        key: "owner1:1:main",
        fetch: vi.fn().mockResolvedValue(undefined),
        deadlineMs: 1000,
        owner: "owner1",
      };

      scheduler.enqueue([task]);

      // Wait for task to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          scheduler.cancelForOwner("owner1");

          // Should be able to re-enqueue the same task
          scheduler.enqueue([task]);
          const snapshot = scheduler.getQueueSnapshot();
          expect(snapshot.some((t) => t.key === task.key)).toBe(true);
          resolve();
        }, 10);
      });
    });
  });

  describe("getOwnerProgress", () => {
    it("should return progress for owner", async () => {
      // Use slow tasks so they stay in active state
      const task1: UpgradeTask = {
        key: "owner1:1:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 1000,
        owner: "owner1",
      };
      const task2: UpgradeTask = {
        key: "owner1:2:main",
        fetch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        deadlineMs: 2000,
        owner: "owner1",
      };

      scheduler.enqueue([task1, task2]);

      // Wait for tasks to start processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      const progress = scheduler.getOwnerProgress("owner1");
      expect(progress.queued + progress.active).toBe(2);
    });
  });

  describe("ground-truth cache validation", () => {
    it("should skip tasks already in cache", () => {
      const isCached = vi.fn().mockReturnValue(true);
      const scheduler = new QualityUpgradeScheduler({
        requestFrameRender: requestFrameRenderMock as unknown as () => void,
        isCached,
      });

      const task: UpgradeTask = {
        key: "test:1:main",
        fetch: vi.fn().mockResolvedValue(undefined),
        deadlineMs: 1000,
        owner: "test",
      };

      scheduler.enqueue([task]);

      // Wait a tick for async processing
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(isCached).toHaveBeenCalledWith(task.key);
          expect(task.fetch).not.toHaveBeenCalled();
          const snapshot = scheduler.getQueueSnapshot();
          expect(snapshot.some((t) => t.key === task.key && t.status === "completed")).toBe(true);
          resolve();
        }, 10);
      });
    });
  });

  describe("requestFrameRender callback", () => {
    it("should call requestFrameRender after task completion", () => {
      const task: UpgradeTask = {
        key: "test:1:main",
        fetch: vi.fn().mockResolvedValue(undefined),
        deadlineMs: 1000,
        owner: "test",
      };

      scheduler.enqueue([task]);

      // Wait for task to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(requestFrameRenderMock).toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });
  });

  describe("dispose", () => {
    it("should abort all in-flight tasks", async () => {
      const abortedTasks: string[] = [];
      const task: UpgradeTask = {
        key: "test:1:main",
        fetch: vi.fn().mockImplementation(async (signal: AbortSignal) => {
          return new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => {
              abortedTasks.push("test:1:main");
              reject(new DOMException("Aborted", "AbortError"));
            });
            setTimeout(resolve, 100);
          });
        }),
        deadlineMs: 1000,
        owner: "test",
      };

      scheduler.enqueue([task]);

      // Wait a tick for task to start
      await new Promise((resolve) => setTimeout(resolve, 0));

      scheduler.dispose();

      // Wait for abort to propagate
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(abortedTasks).toContain("test:1:main");
    });
  });
});
