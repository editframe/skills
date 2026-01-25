/**
 * Canvas encoding orchestration with worker pool support.
 */

import { logger } from "../logger.js";
import { WorkerPool } from "../workers/WorkerPool.js";
import { getEncoderWorkerUrl } from "../workers/encoderWorkerInline.js";
import { encodeCanvasOnMainThread } from "./mainThreadEncoder.js";
import { encodeCanvasInWorker } from "./workerEncoder.js";
import type { CanvasEncodeResult, CanvasEncodeOptions } from "./types.js";

// Module-level worker pool state
let _workerPool: WorkerPool | null = null;
let _workerPoolWarningLogged = false;

/**
 * Get or create the worker pool for canvas encoding.
 * Returns null if workers are not available.
 */
function getWorkerPool(): WorkerPool | null {
  if (_workerPool) {
    return _workerPool;
  }

  // Check if workers are available
  if (
    typeof Worker === "undefined" ||
    typeof OffscreenCanvas === "undefined" ||
    typeof createImageBitmap === "undefined"
  ) {
    if (!_workerPoolWarningLogged) {
      _workerPoolWarningLogged = true;
      logger.warn(
        "[canvasEncoder] Web Workers or OffscreenCanvas not available, using main thread fallback",
      );
    }
    return null;
  }

  try {
    // Use inline worker URL - this works in any bundler environment
    // because the worker code is embedded in the bundle as a blob URL
    const workerUrl = getEncoderWorkerUrl();
    
    _workerPool = new WorkerPool(workerUrl);
    
    // Check if workers were actually created
    if (!_workerPool.isAvailable()) {
      const reason = _workerPool.workerCount === 0 
        ? "no workers created (check console for errors)" 
        : "workers not available";
      _workerPool = null;
      if (!_workerPoolWarningLogged) {
        _workerPoolWarningLogged = true;
        logger.warn(
          `[canvasEncoder] Worker pool initialization failed (${reason}), using main thread fallback`,
        );
      }
    }
  } catch (error) {
    _workerPool = null;
    if (!_workerPoolWarningLogged) {
      _workerPoolWarningLogged = true;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        `[canvasEncoder] Failed to create worker pool: ${errorMessage} - using main thread fallback`,
      );
    }
  }

  return _workerPool;
}

/**
 * Encode canvases to data URLs in parallel using worker pool.
 * Falls back to main thread encoding if workers are unavailable.
 * 
 * @param canvases - Array of canvases to encode
 * @param options - Encoding options
 * @returns Promise resolving to array of encoded results
 */
export async function encodeCanvasesInParallel(
  canvases: HTMLCanvasElement[],
  options: CanvasEncodeOptions = {},
): Promise<CanvasEncodeResult[]> {
  const { scale: canvasScale = 1 } = options;
  const workerPool = getWorkerPool();

  // If no worker pool available, fall back to main thread
  if (!workerPool) {
    const results: CanvasEncodeResult[] = [];
    for (const canvas of canvases) {
      const encoded = encodeCanvasOnMainThread(canvas, canvasScale);
      if (encoded) {
        results.push({ canvas, ...encoded });
      }
    }
    return results;
  }

  // Use worker pool for parallel encoding
  const encodingTasks = canvases.map(async (canvas) => {
    try {
      if (canvas.width === 0 || canvas.height === 0) {
        return null;
      }

      const preserveAlpha = canvas.dataset.preserveAlpha === "true";
      let sourceCanvas = canvas;

      // Handle canvas scaling on main thread before encoding
      if (canvasScale < 1) {
        const scaledWidth = Math.floor(canvas.width * canvasScale);
        const scaledHeight = Math.floor(canvas.height * canvasScale);
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = scaledWidth;
        scaledCanvas.height = scaledHeight;
        const scaledCtx = scaledCanvas.getContext("2d");
        if (scaledCtx) {
          scaledCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
          sourceCanvas = scaledCanvas;
        }
      }
      
      // Encode in worker
      const dataUrl = await workerPool.execute((worker) =>
        encodeCanvasInWorker(worker, sourceCanvas, preserveAlpha),
      );

      return { canvas, dataUrl, preserveAlpha };
    } catch (error) {
      // Fallback to main thread if worker encoding fails
      const encoded = encodeCanvasOnMainThread(canvas, canvasScale);
      if (encoded) {
        return { canvas, ...encoded };
      }
      
      // Cross-origin canvas or other error - skip
      return null;
    }
  });

  const encodedResults = await Promise.all(encodingTasks);
  const validResults = encodedResults.filter(
    (r): r is CanvasEncodeResult => r !== null,
  );
  return validResults;
}

/**
 * Reset the worker pool state (for testing).
 */
export function resetWorkerPool(): void {
  if (_workerPool) {
    _workerPool.terminate();
    _workerPool = null;
  }
  _workerPoolWarningLogged = false;
}
