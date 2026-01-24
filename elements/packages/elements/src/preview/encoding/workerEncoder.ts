/**
 * Worker-based canvas encoding.
 */

const WORKER_TASK_TIMEOUT_MS = 30000;

/**
 * Encode a canvas using a worker.
 * @param worker - The worker to use for encoding
 * @param canvas - The canvas to encode
 * @param preserveAlpha - Whether to preserve alpha channel (PNG vs JPEG)
 * @returns Promise resolving to the encoded data URL
 */
export async function encodeCanvasInWorker(
  worker: Worker,
  canvas: HTMLCanvasElement,
  preserveAlpha: boolean,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const taskId = `task-${Date.now()}-${Math.random()}-${performance.now()}`;
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
