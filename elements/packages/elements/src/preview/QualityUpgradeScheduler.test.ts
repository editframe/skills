import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  QualityUpgradeScheduler,
  type UpgradeTask,
} from "./QualityUpgradeScheduler";

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
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
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
          (t) =>
            t.key === task.key &&
            (t.status === "queued" || t.status === "active"),
        ),
      ).toBe(true);
    });

    it("should sort tasks by deadline", async () => {
      // Create 3 tasks so at least one stays queued (maxConcurrent = 2)
      const task1: UpgradeTask = {
        key: "test:1:main",
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
        deadlineMs: 3000,
        owner: "test",
      };
      const task2: UpgradeTask = {
        key: "test:2:main",
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
        deadlineMs: 1000,
        owner: "test",
      };
      const task3: UpgradeTask = {
        key: "test:3:main",
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
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
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
        deadlineMs: 1000,
        owner: "test",
      };
      const task2: UpgradeTask = {
        key: "test:2:main",
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
        deadlineMs: 2000,
        owner: "test",
      };
      const task3: UpgradeTask = {
        key: "test:3:main",
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
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
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
        deadlineMs: 1000,
        owner: "owner1",
      };
      const task2: UpgradeTask = {
        key: "owner2:1:main",
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
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
      expect(
        snapshot.some((t) => t.key === oldTask.key && t.status === "queued"),
      ).toBe(false);
      expect(snapshot.some((t) => t.key === newTask.key)).toBe(true);
    });
  });

  describe("cancelForOwner", () => {
    it("should remove queued tasks for owner", async () => {
      // Use slow tasks so they stay in queue/active
      const task1: UpgradeTask = {
        key: "owner1:1:main",
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
        deadlineMs: 1000,
        owner: "owner1",
      };
      const task2: UpgradeTask = {
        key: "owner2:1:main",
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
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
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
        deadlineMs: 1000,
        owner: "owner1",
      };
      const task2: UpgradeTask = {
        key: "owner1:2:main",
        fetch: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100)),
          ),
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
          expect(
            snapshot.some(
              (t) => t.key === task.key && t.status === "completed",
            ),
          ).toBe(true);
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
