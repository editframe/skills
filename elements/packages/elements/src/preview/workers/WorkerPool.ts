/**
 * Worker pool for parallel task execution.
 * Manages a pool of workers and distributes tasks across them.
 */

// Constants
const WORKER_TASK_TIMEOUT_MS = 30000;
const WORKER_INIT_TEST_TIMEOUT_MS = 2000;

interface QueuedTask<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  task: (worker: Worker) => Promise<T>;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: QueuedTask<unknown>[] = [];
  private isTerminated = false;
  private workerUrl: string;
  private taskIdCounter = 0;

  constructor(
    workerScriptUrl: string,
    private poolSize: number = navigator.hardwareConcurrency || 4,
  ) {
    this.workerUrl = workerScriptUrl;

    // Check browser support first, then initialize workers
    if (this.hasBrowserSupport()) {
      this.initializeWorkers();
    }
  }

  /**
   * Check if browser supports workers (before initialization).
   */
  private hasBrowserSupport(): boolean {
    return (
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined" &&
      typeof createImageBitmap !== "undefined"
    );
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      try {
        // Create worker from URL (typically a blob URL from inlined worker code)
        const worker = new Worker(this.workerUrl, { type: "module" });
        
        // Test if worker is responding - cleanup handler after confirmation
        let testTimeout: number | null = null;
        let testHandler: ((event: MessageEvent) => void) | null = null;
        
        const cleanupTest = () => {
          if (testTimeout !== null) {
            clearTimeout(testTimeout);
            testTimeout = null;
          }
          if (testHandler !== null) {
            worker.removeEventListener("message", testHandler);
            testHandler = null;
          }
        };
        
        testTimeout = window.setTimeout(() => {
          cleanupTest();
        }, WORKER_INIT_TEST_TIMEOUT_MS);
        
        testHandler = (event: MessageEvent) => {
          // Check if this is a test response (worker startup message)
          if (event.data && typeof event.data === "string" && event.data.includes("encoderWorker")) {
            cleanupTest();
          }
        };
        worker.addEventListener("message", testHandler);
        
        worker.onerror = (error) => {
          cleanupTest();
          console.error(`[WorkerPool] Worker ${i} error:`, {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
          });
        };
        worker.onmessageerror = (error) => {
          console.error(`[WorkerPool] Worker ${i} message error:`, error);
        };
        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        console.error(`[WorkerPool] Failed to create worker ${i}:`, error instanceof Error ? error.message : String(error));
      }
    }
    if (this.workers.length === 0) {
      console.error(`[WorkerPool] Failed to create any workers. URL: ${this.workerUrl}`);
      console.error(`[WorkerPool] Browser support check:`, {
        Worker: typeof Worker !== "undefined",
        OffscreenCanvas: typeof OffscreenCanvas !== "undefined",
        createImageBitmap: typeof createImageBitmap !== "undefined",
      });
    }
  }

  /**
   * Get the number of workers in the pool.
   */
  get workerCount(): number {
    return this.workers.length;
  }

  /**
   * Check if workers are available and initialized.
   */
  isAvailable(): boolean {
    return (
      this.hasBrowserSupport() &&
      this.workers.length > 0 &&
      !this.isTerminated
    );
  }

  /**
   * Execute a task using an available worker from the pool.
   */
  async execute<T>(task: (worker: Worker) => Promise<T>): Promise<T> {
    if (this.isTerminated) {
      throw new Error("WorkerPool has been terminated");
    }

    // If workers aren't available, this will be handled by the caller's fallback
    if (!this.isAvailable()) {
      throw new Error("Workers not available");
    }

    return new Promise<T>((resolve, reject) => {
      this.taskQueue.push({ 
        resolve: resolve as (value: unknown) => void, 
        reject, 
        task 
      });
      this.processQueue();
    });
  }

  private processQueue(): void {
    // Process tasks while we have available workers and queued tasks
    while (this.availableWorkers.length > 0 && this.taskQueue.length > 0) {
      const worker = this.availableWorkers.shift();
      const queuedTask = this.taskQueue.shift();
      
      if (!worker || !queuedTask) {
        // Safety check - should not happen but prevents crashes
        break;
      }

      const { resolve, reject, task } = queuedTask;

      // Execute the task
      task(worker)
        .then((result) => {
          resolve(result);
          // Return worker to pool
          this.availableWorkers.push(worker);
          // Process next task
          this.processQueue();
        })
        .catch((error) => {
          reject(error instanceof Error ? error : new Error(String(error)));
          // Return worker to pool
          this.availableWorkers.push(worker);
          // Process next task
          this.processQueue();
        });
    }
  }

  /**
   * Terminate all workers and clear the task queue.
   */
  terminate(): void {
    this.isTerminated = true;

    // Reject all pending tasks
    for (const { reject } of this.taskQueue) {
      reject(new Error("WorkerPool terminated"));
    }
    this.taskQueue = [];

    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.availableWorkers = [];
  }
}

/**
 * Helper function to encode a canvas using a worker.
 */
export async function encodeCanvasInWorker(
  worker: Worker,
  canvas: HTMLCanvasElement,
  preserveAlpha: boolean,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const taskId = `task-${Date.now()}-${Math.random()}-${performance.now()}`;
    const startTime = performance.now();
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      worker.removeEventListener("message", messageHandler);
      worker.removeEventListener("messageerror", messageErrorHandler);
    };

    const messageHandler = (event: MessageEvent) => {
      const result = event.data as { taskId: string; dataUrl: string; error?: string };
      if (result.taskId === taskId) {
        cleanup();
        if (result.error) {
          reject(new Error(`Worker encoding failed: ${result.error}`));
        } else {
          resolve(result.dataUrl);
        }
      }
    };

    const messageErrorHandler = () => {
      cleanup();
      reject(new Error("Worker message error"));
    };

    worker.addEventListener("message", messageHandler);
    worker.addEventListener("messageerror", messageErrorHandler);

    // Set timeout to detect if worker never responds
    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Worker task timed out"));
    }, WORKER_TASK_TIMEOUT_MS);

    // Create ImageBitmap from canvas
    createImageBitmap(canvas)
      .then((bitmap) => {
        // Transfer bitmap to worker (zero-copy)
        worker.postMessage(
          {
            taskId,
            bitmap,
            preserveAlpha,
          },
          [bitmap],
        );
      })
      .catch((error) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}
