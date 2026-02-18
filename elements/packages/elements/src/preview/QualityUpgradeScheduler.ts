/**
 * QualityUpgradeScheduler: Centralized deadline-ordered work queue
 *
 * Coordinates main-quality segment fetching across multiple video elements.
 * Generic scheduler that doesn't understand media concepts (segments, renditions, etc.)
 * - only processes { key, deadlineMs, fetch, owner } tuples.
 *
 * Design principles:
 * - Deadline-based ordering: always process nearest deadline first
 * - Ground-truth cache validation: check cache before starting any fetch
 * - In-flight fetches never cancelled: they populate shared cache
 * - Event-driven: elements submit tasks only on state changes, not every frame
 */

export interface UpgradeTask {
  /** Opaque dedup key (e.g. "${owner}:${segmentId}:${renditionId}") */
  key: string;
  /** Fetch function that populates the cache */
  fetch: (signal: AbortSignal) => Promise<void>;
  /** Timeline time when this segment will be needed */
  deadlineMs: number;
  /** Element ID, for bulk operations */
  owner: string;
}

export interface UpgradeTaskStatus {
  key: string;
  owner: string;
  deadlineMs: number;
  status: "queued" | "active" | "completed" | "failed";
  error?: string;
}

export interface OwnerProgress {
  queued: number;
  active: number;
  completed: number;
  failed: number;
}

interface ActiveTask {
  task: UpgradeTask;
  startedAt: number;
  promise: Promise<void>;
}

interface CompletedTask {
  key: string;
  owner: string;
  status: "completed" | "failed";
  error?: string;
}

export class QualityUpgradeScheduler {
  #maxConcurrent: number;
  #queue: UpgradeTask[] = [];
  #activeTasks = new Map<string, ActiveTask>();
  #completedTasks = new Map<string, CompletedTask>();
  #abortController: AbortController;
  #requestFrameRender: () => void;
  #isCached?: (key: string) => boolean;

  constructor(options: {
    requestFrameRender: () => void;
    maxConcurrent?: number;
    isCached?: (key: string) => boolean;
  }) {
    this.#requestFrameRender = options.requestFrameRender;
    this.#maxConcurrent = options.maxConcurrent ?? 4;
    this.#isCached = options.isCached;
    this.#abortController = new AbortController();
  }

  /**
   * Add tasks without affecting existing ones (additive).
   * Used for lookahead extension during playback.
   */
  enqueue(tasks: UpgradeTask[]): void {
    if (this.#abortController.signal.aborted) return;

    for (const task of tasks) {
      // Skip if already queued, active, or completed
      if (
        this.#queue.some((t) => t.key === task.key) ||
        this.#activeTasks.has(task.key) ||
        this.#completedTasks.has(task.key)
      ) {
        continue;
      }

      this.#queue.push(task);
    }

    // Sort queue by deadline (ascending)
    this.#queue.sort((a, b) => a.deadlineMs - b.deadlineMs);

    // Start processing if we have capacity
    this.#processQueue();
  }

  /**
   * Replace all queued tasks for an owner.
   * Used on seeks, trim changes, timeline position changes where old deadlines are stale.
   * Does NOT cancel in-flight tasks (they populate shared cache).
   */
  replaceForOwner(owner: string, tasks: UpgradeTask[]): void {
    if (this.#abortController.signal.aborted) return;

    // Remove queued (not active) tasks for this owner
    this.#queue = this.#queue.filter((t) => t.owner !== owner);

    // Add new tasks
    for (const task of tasks) {
      // Skip if already active or completed
      if (
        this.#activeTasks.has(task.key) ||
        this.#completedTasks.has(task.key)
      ) {
        continue;
      }

      this.#queue.push(task);
    }

    // Sort queue by deadline (ascending)
    this.#queue.sort((a, b) => a.deadlineMs - b.deadlineMs);

    // Start processing if we have capacity
    this.#processQueue();
  }

  /**
   * Cancel all tasks for an owner.
   * Removes queued tasks. Does NOT abort in-flight fetches.
   */
  cancelForOwner(owner: string): void {
    // Remove from queue
    this.#queue = this.#queue.filter((t) => t.owner !== owner);

    // Remove from completed tracking (allows resubmission)
    for (const [key, task] of this.#completedTasks.entries()) {
      if (task.owner === owner) {
        this.#completedTasks.delete(key);
      }
    }

    // Note: we do NOT cancel active tasks - they populate the shared cache
  }

  /**
   * Process the queue - start tasks up to maxConcurrent limit.
   */
  #processQueue(): void {
    if (this.#abortController.signal.aborted) return;

    while (
      this.#activeTasks.size < this.#maxConcurrent &&
      this.#queue.length > 0
    ) {
      const task = this.#queue.shift();
      if (!task) break;

      // Ground-truth cache check before starting
      if (this.#isCached?.(task.key)) {
        // Already cached from another path, mark as completed and continue
        this.#completedTasks.set(task.key, {
          key: task.key,
          owner: task.owner,
          status: "completed",
        });
        continue;
      }

      // Start the task
      this.#startTask(task);
    }
  }

  /**
   * Start a single task.
   */
  #startTask(task: UpgradeTask): void {
    const promise = task
      .fetch(this.#abortController.signal)
      .then(() => {
        // Success
        this.#activeTasks.delete(task.key);
        this.#completedTasks.set(task.key, {
          key: task.key,
          owner: task.owner,
          status: "completed",
        });

        // Trigger re-render so upgraded quality gets displayed
        this.#requestFrameRender();

        // Start next task if available
        this.#processQueue();
      })
      .catch((error) => {
        // Failure
        this.#activeTasks.delete(task.key);

        // Don't track AbortError as failure (intentional cancellation)
        const isAbortError =
          error instanceof DOMException && error.name === "AbortError";

        if (!isAbortError) {
          this.#completedTasks.set(task.key, {
            key: task.key,
            owner: task.owner,
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Continue processing queue even after failure
        this.#processQueue();
      });

    this.#activeTasks.set(task.key, {
      task,
      startedAt: performance.now(),
      promise,
    });
  }

  /**
   * Get snapshot of current queue state for debugging.
   */
  getQueueSnapshot(): UpgradeTaskStatus[] {
    const results: UpgradeTaskStatus[] = [];

    // Queued tasks
    for (const task of this.#queue) {
      results.push({
        key: task.key,
        owner: task.owner,
        deadlineMs: task.deadlineMs,
        status: "queued",
      });
    }

    // Active tasks
    for (const [key, activeTask] of this.#activeTasks.entries()) {
      results.push({
        key,
        owner: activeTask.task.owner,
        deadlineMs: activeTask.task.deadlineMs,
        status: "active",
      });
    }

    // Completed tasks
    for (const [key, completed] of this.#completedTasks.entries()) {
      results.push({
        key,
        owner: completed.owner,
        deadlineMs: 0, // No longer relevant
        status: completed.status as "completed" | "failed",
        error: completed.error,
      });
    }

    return results;
  }

  /**
   * Get progress for a specific owner.
   */
  getOwnerProgress(owner: string): OwnerProgress {
    const queued = this.#queue.filter((t) => t.owner === owner).length;

    let active = 0;
    for (const activeTask of this.#activeTasks.values()) {
      if (activeTask.task.owner === owner) {
        active++;
      }
    }

    let completed = 0;
    let failed = 0;
    for (const task of this.#completedTasks.values()) {
      if (task.owner === owner) {
        if (task.status === "completed") {
          completed++;
        } else {
          failed++;
        }
      }
    }

    return { queued, active, completed, failed };
  }

  /**
   * Dispose the scheduler - abort all in-flight work.
   */
  dispose(): void {
    // Suppress in-flight task rejections before aborting to avoid unhandled
    // rejection events from the synchronous abort signal firing.
    for (const activeTask of this.#activeTasks.values()) {
      activeTask.promise.catch(() => {});
    }
    this.#abortController.abort();
    this.#queue = [];
    this.#activeTasks.clear();
    this.#completedTasks.clear();
  }
}
