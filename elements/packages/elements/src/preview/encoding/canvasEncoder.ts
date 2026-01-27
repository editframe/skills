/**
 * Canvas encoding orchestration with worker pool support.
 * 
 * Supports caching via RenderContext:
 * - For ef-image/ef-waveform: caches by element + renderVersion
 * - For ef-video: uses direct capture API with source timestamp caching
 */

import { logger } from "../logger.js";
import { WorkerPool } from "../workers/WorkerPool.js";
import { getEncoderWorkerUrl } from "../workers/encoderWorkerInline.js";
import { encodeCanvasOnMainThread } from "./mainThreadEncoder.js";
import { encodeCanvasInWorker } from "./workerEncoder.js";
import type { CanvasEncodeResult, CanvasEncodeOptions } from "./types.js";
import type { EFVideo } from "../../elements/EFVideo.js";
import type { EFSurface } from "../../elements/EFSurface.js";

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
 * Check if an element is an EFVideo.
 */
function isEFVideo(element: Element): element is EFVideo {
  return element.tagName === "EF-VIDEO";
}

/**
 * Check if an element is an EFSurface.
 */
function isEFSurface(element: Element): element is EFSurface {
  return element.tagName === "EF-SURFACE";
}

/**
 * Encode canvases to data URLs in parallel using worker pool.
 * Falls back to main thread encoding if workers are unavailable.
 * 
 * When RenderContext and sourceMap are provided:
 * - Checks cache for static elements (ef-image, ef-waveform)
 * - Uses direct capture API for ef-video elements
 * - Shares cached frames for ef-surface elements targeting ef-video
 * 
 * @param canvases - Array of canvases to encode
 * @param options - Encoding options including optional renderContext and sourceMap
 * @returns Promise resolving to array of encoded results
 */
export async function encodeCanvasesInParallel(
  canvases: HTMLCanvasElement[],
  options: CanvasEncodeOptions = {},
): Promise<CanvasEncodeResult[]> {
  const { scale: canvasScale = 1, renderContext, sourceMap } = options;
  const workerPool = getWorkerPool();

  // Helper to encode a single canvas (with caching)
  const encodeCanvas = async (canvas: HTMLCanvasElement): Promise<CanvasEncodeResult | null> => {
    try {
      if (canvas.width === 0 || canvas.height === 0) {
        return null;
      }

      const preserveAlpha = canvas.dataset.preserveAlpha === "true";
      const sourceElement = sourceMap?.get(canvas);
      
      console.log(`[canvasEncoder] Canvas ${canvas.width}x${canvas.height}: hasRenderContext=${!!renderContext}, hasSourceMap=${!!sourceMap}, hasSourceElement=${!!sourceElement}`);
      if (sourceElement) {
        console.log(`[canvasEncoder] SourceElement: tag=${sourceElement.tagName}, hasRenderVersion=${"renderVersion" in sourceElement}`);
      }

      // OPTIMIZATION: Check RenderContext cache for static elements
      if (renderContext && sourceElement) {
        // For ef-video, use direct capture API
        if (isEFVideo(sourceElement)) {
          const sourceTimeMs = sourceElement.currentSourceTimeMs;
          
          // Use direct capture API (bypasses frameTask)
          // Always use "main" quality for export - scrub track is only for preview scrubbing
          try {
            const frame = await sourceElement.captureFrameAtSourceTime(sourceTimeMs, { quality: "main" });
            return { canvas, dataUrl: frame.dataUrl, preserveAlpha: false };
          } catch (e) {
            // Fall back to normal encoding if direct capture fails
            logger.warn("[canvasEncoder] Direct capture failed, falling back to canvas encoding:", e);
          }
        }
        
        // For ef-surface targeting ef-video, share the video's cached frame
        if (isEFSurface(sourceElement)) {
          const target = sourceElement.targetElement;
          if (target && isEFVideo(target as Element)) {
            const videoTarget = target as unknown as EFVideo;
            const sourceTimeMs = videoTarget.currentSourceTimeMs;
            const cached = renderContext.getCachedVideoFrame(videoTarget, sourceTimeMs);
            if (cached) {
              return { canvas, dataUrl: cached.dataUrl, preserveAlpha: false };
            }
            
            // Capture from the target video
            // Always use "main" quality for export
            try {
              const frame = await videoTarget.captureFrameAtSourceTime(sourceTimeMs, { quality: "main" });
              renderContext.setCachedVideoFrame(videoTarget, sourceTimeMs, frame);
              return { canvas, dataUrl: frame.dataUrl, preserveAlpha: false };
            } catch (e) {
              logger.warn("[canvasEncoder] Direct capture for surface target failed:", e);
            }
          }
        }
        
        // For static elements (ef-image, ef-waveform), check version-based cache
        const cachedDataUrl = renderContext.getCachedCanvasDataUrl(sourceElement);
        if (cachedDataUrl) {
          return { canvas, dataUrl: cachedDataUrl, preserveAlpha };
        }
      }

      // Standard encoding path (fallback when no RenderContext cache)
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

      let dataUrl: string;
      
      if (workerPool) {
        // Encode in worker
        dataUrl = await workerPool.execute((worker) =>
          encodeCanvasInWorker(worker, sourceCanvas, preserveAlpha),
        );
      } else {
        // Main thread fallback - warning already logged once in getWorkerPool()
        const encoded = encodeCanvasOnMainThread(sourceCanvas, canvasScale);
        if (!encoded) return null;
        dataUrl = encoded.dataUrl;
      }

      // Cache the result for static elements
      if (renderContext && sourceElement) {
        renderContext.setCachedCanvasDataUrl(sourceElement, dataUrl);
      }

      return { canvas, dataUrl, preserveAlpha };
    } catch (error) {
      // Fallback to main thread if worker encoding fails
      logger.warn("[canvasEncoder] Worker encoding failed, using main thread fallback:", error);
      const encoded = encodeCanvasOnMainThread(canvas, canvasScale);
      if (encoded) {
        logger.warn("[canvasEncoder] Main thread fallback succeeded");
        return { canvas, ...encoded };
      }
      
      // Cross-origin canvas or other error - skip
      logger.warn("[canvasEncoder] Main thread encoding also failed, skipping canvas:", error);
      return null;
    }
  };

  // Encode all canvases in parallel
  const encodingTasks = canvases.map(encodeCanvas);
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
