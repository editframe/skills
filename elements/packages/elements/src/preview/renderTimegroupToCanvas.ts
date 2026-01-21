import type { EFTimegroup } from "../elements/EFTimegroup.js";
import {
  buildCloneStructure,
  syncStyles,
  collectDocumentStyles,
  type SyncState,
} from "./renderTimegroupPreview.js";
import { isNativeCanvasApiAvailable, getRenderMode, type RenderMode } from "./previewSettings.js";
import { WorkerPool, encodeCanvasInWorker } from "./workers/WorkerPool.js";

// ============================================================================
// Constants
// ============================================================================

/** Number of rows to sample when checking canvas content */
const CANVAS_SAMPLE_STRIP_HEIGHT = 4;

/** Interval between profiling log outputs (ms) */
const PROFILING_LOG_INTERVAL_MS = 2000;

/** Default timeout for blocking content readiness mode (ms) */
const DEFAULT_BLOCKING_TIMEOUT_MS = 5000;

/** Default scale for thumbnail captures */
const DEFAULT_THUMBNAIL_SCALE = 0.25;

/** Default timegroup dimensions when not measurable */
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

/** JPEG quality settings for different canvas scales */
const JPEG_QUALITY_HIGH = 0.95;
const JPEG_QUALITY_MEDIUM = 0.85;

/** Maximum number of cached inline images before eviction */
const MAX_INLINE_IMAGE_CACHE_SIZE = 100;

// ============================================================================
// Types
// ============================================================================

/**
 * Content readiness strategy for capture operations.
 * - "immediate": Capture NOW, skip all waits. May have blank video frames.
 * - "blocking": Wait for video content to be ready. Throws on timeout.
 */
export type ContentReadyMode = "immediate" | "blocking";

/**
 * Element with temporal properties (startTimeMs, endTimeMs).
 * Used for temporal visibility checks.
 */
interface TemporalElement extends Element {
  startTimeMs?: number;
  endTimeMs?: number;
  src?: string;
}

/**
 * Extended CanvasRenderingContext2D with HTML-in-Canvas API support.
 * @see https://github.com/WICG/html-in-canvas
 */
interface HtmlInCanvasContext extends CanvasRenderingContext2D {
  drawElementImage(element: HTMLElement, x: number, y: number): void;
}

/**
 * Extended HTMLCanvasElement with layoutSubtree property for HTML-in-Canvas.
 */
interface HtmlInCanvasElement extends HTMLCanvasElement {
  layoutSubtree?: boolean;
}

/**
 * Options for capturing a timegroup frame.
 */
export interface CaptureOptions {
  /** Time to capture at in milliseconds (required) */
  timeMs: number;
  /** Scale factor (default: 0.25 for captureTimegroupAtTime) */
  scale?: number;
  /** Skip restoring original time after capture (for batch operations) */
  skipRestore?: boolean;
  /** Content readiness strategy (default: "immediate") */
  contentReadyMode?: ContentReadyMode;
  /** Max wait time for blocking mode before throwing (default: 5000ms) */
  blockingTimeoutMs?: number;
}

/**
 * Options for batch capture operations, excluding timeMs which is provided per-timestamp.
 */
export interface CaptureBatchOptions {
  /** Scale factor for thumbnails (default: 0.25) */
  scale?: number;
  /** Content readiness strategy (default: "immediate") */
  contentReadyMode?: ContentReadyMode;
  /** Max wait time for blocking mode before throwing (default: 5000ms) */
  blockingTimeoutMs?: number;
}

/**
 * Error thrown when video content is not ready within the blocking timeout.
 */
export class ContentNotReadyError extends Error {
  constructor(
    public readonly timeMs: number,
    public readonly timeoutMs: number,
    public readonly blankVideos: string[],
  ) {
    super(`Video content not ready at ${timeMs}ms after ${timeoutMs}ms timeout. Blank videos: ${blankVideos.join(', ')}`);
    this.name = 'ContentNotReadyError';
  }
}

// ============================================================================
// Module State (reset via resetRenderState)
// ============================================================================

/** Track if we've logged the native API detection message (to avoid spam) */
let _hasLoggedNativeApiStatus = false;

/** Track which rendering path is being used */
let _pathLogged = false;

/** Image cache for inlining external images as data URIs (foreignObject path) */
const _inlineImageCache = new Map<string, string>();

/** Render timing stats (for profiling) */
let _renderCallCount = 0;
let _totalSetupMs = 0;
let _totalDrawMs = 0;
let _totalDownsampleMs = 0;
let _lastLogTime = 0;

/** Track canvases that have been initialized for layoutsubtree (only need to wait once) */
const _layoutInitializedCanvases = new WeakSet<HTMLCanvasElement>();

// Reusable instances for better performance (avoid creating new instances every frame)
let _xmlSerializer: XMLSerializer | null = null;
let _textEncoder: TextEncoder | null = null;

// Worker pool for parallel canvas encoding (lazy initialization)
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
      console.warn(
        "[renderTimegroupToCanvas] Web Workers or OffscreenCanvas not available, using main thread fallback",
      );
    }
    return null;
  }

  try {
    // Create worker URL - Vite processes worker files when using ?worker_file suffix
    // In browser environments (Vite), import.meta.url is available at runtime
    let workerUrl: string;
    try {
      // TypeScript may not recognize import.meta in CommonJS mode, but it works at runtime in Vite
      // Access it dynamically to avoid TypeScript compilation errors
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - import.meta.url works at runtime in Vite even if TS doesn't recognize it
      const metaUrl = import.meta?.url;
      if (metaUrl) {
        // Use ?worker_file&type=module - this is what Vite uses internally when processing workers
        // The ?worker suffix creates a wrapper, but ?worker_file gives us the actual worker
        workerUrl = new URL("./workers/encoderWorker.ts?worker_file&type=module", metaUrl).href;
      } else {
        workerUrl = "./workers/encoderWorker.ts?worker_file&type=module";
      }
    } catch {
      // Fallback: use relative path
      workerUrl = "./workers/encoderWorker.ts?worker_file&type=module";
    }
    
    _workerPool = new WorkerPool(workerUrl);
    
    // Check if workers were actually created
    if (!_workerPool.isAvailable()) {
      const reason = _workerPool.workerCount === 0 
        ? "no workers created (check console for errors)" 
        : "workers not available";
      _workerPool = null;
      if (!_workerPoolWarningLogged) {
        _workerPoolWarningLogged = true;
        console.warn(
          `[renderTimegroupToCanvas] Worker pool initialization failed (${reason}), using main thread fallback`,
        );
      }
    }
  } catch (error) {
    _workerPool = null;
    if (!_workerPoolWarningLogged) {
      _workerPoolWarningLogged = true;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(
        `[renderTimegroupToCanvas] Failed to create worker pool: ${errorMessage} - using main thread fallback`,
      );
    }
  }

  return _workerPool;
}

/**
 * Encode a single canvas to a data URL (fallback implementation for main thread).
 */
function encodeCanvasOnMainThread(
  canvas: HTMLCanvasElement,
  canvasScale: number,
): { dataUrl: string; preserveAlpha: boolean } | null {
  try {
    if (canvas.width === 0 || canvas.height === 0) {
      return null;
    }

    const preserveAlpha = canvas.dataset.preserveAlpha === "true";
    let dataUrl: string;

    if (canvasScale < 1) {
      // Scale down canvas before encoding
      const scaledWidth = Math.floor(canvas.width * canvasScale);
      const scaledHeight = Math.floor(canvas.height * canvasScale);
      const scaledCanvas = document.createElement("canvas");
      scaledCanvas.width = scaledWidth;
      scaledCanvas.height = scaledHeight;
      const scaledCtx = scaledCanvas.getContext("2d");
      if (scaledCtx) {
        scaledCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
        const quality = canvasScale < 0.5 ? JPEG_QUALITY_MEDIUM : JPEG_QUALITY_HIGH;
        dataUrl = preserveAlpha
          ? scaledCanvas.toDataURL("image/png")
          : scaledCanvas.toDataURL("image/jpeg", quality);
      } else {
        dataUrl = preserveAlpha
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", JPEG_QUALITY_HIGH);
      }
    } else {
      dataUrl = preserveAlpha
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", JPEG_QUALITY_HIGH);
    }

    return { dataUrl, preserveAlpha };
  } catch (e) {
    // Cross-origin canvas or other error - skip
    return null;
  }
}

/**
 * Encode canvases to data URLs in parallel using worker pool.
 * Falls back to main thread encoding if workers are unavailable.
 */
async function encodeCanvasesInParallel(
  canvases: HTMLCanvasElement[],
  canvasScale: number = 1,
): Promise<Array<{ canvas: HTMLCanvasElement; dataUrl: string; preserveAlpha: boolean }>> {
  const workerPool = getWorkerPool();

  // If no worker pool available, fall back to main thread
  if (!workerPool) {
    const results: Array<{ canvas: HTMLCanvasElement; dataUrl: string; preserveAlpha: boolean }> = [];
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
    (r): r is { canvas: HTMLCanvasElement; dataUrl: string; preserveAlpha: boolean } => r !== null,
  );
  return validResults;
}

/**
 * Fast base64 encoding directly from Uint8Array.
 * Avoids the overhead of converting to binary string first.
 * Uses lookup table for optimal performance.
 */
function encodeBase64Fast(bytes: Uint8Array): string {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  const len = bytes.length;
  
  // Process 3 bytes at a time (produces 4 base64 chars)
  while (i < len - 2) {
    const byte1 = bytes[i++]!;
    const byte2 = bytes[i++]!;
    const byte3 = bytes[i++]!;
    
    const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;
    
    result += base64Chars.charAt((bitmap >> 18) & 63);
    result += base64Chars.charAt((bitmap >> 12) & 63);
    result += base64Chars.charAt((bitmap >> 6) & 63);
    result += base64Chars.charAt(bitmap & 63);
  }
  
  // Handle remaining bytes (1 or 2)
  if (i < len) {
    const byte1 = bytes[i++]!;
    const bitmap = byte1 << 16;
    
    result += base64Chars.charAt((bitmap >> 18) & 63);
    result += base64Chars.charAt((bitmap >> 12) & 63);
    
    if (i < len) {
      const byte2 = bytes[i++]!;
      const bitmap2 = (byte1 << 16) | (byte2 << 8);
      result += base64Chars.charAt((bitmap2 >> 6) & 63);
      result += "=";
    } else {
      result += "==";
    }
  }
  
  return result;
}

/**
 * Reset all module state including profiling counters, caches, and logging flags.
 * Call at the start of export sessions to ensure clean state.
 */
export function resetRenderState(): void {
  _renderCallCount = 0;
  _totalSetupMs = 0;
  _totalDrawMs = 0;
  _totalDownsampleMs = 0;
  _lastLogTime = 0;
  _pathLogged = false;
  _inlineImageCache.clear();
}

/**
 * Clear the inline image cache. Useful for memory management in long-running sessions.
 */
export function clearInlineImageCache(): void {
  _inlineImageCache.clear();
}

/**
 * Get current inline image cache size for diagnostics.
 */
export function getInlineImageCacheSize(): number {
  return _inlineImageCache.size;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Get the effective render mode, validating that native is available when selected.
 * Falls back to foreignObject if native is selected but not available.
 */
function getEffectiveRenderMode(): RenderMode {
  const mode = getRenderMode();
  
  // Native mode requires browser support
  if (mode === "native" && !isNativeCanvasApiAvailable()) {
    return "foreignObject";
  }
  
  return mode;
}


/**
 * Inline all images in a container as base64 data URIs.
 * SVG foreignObject can't load external images due to security restrictions.
 * Uses an LRU-style cache with size limits to prevent memory leaks.
 */
async function inlineImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll("img");
  for (const image of images) {
    const src = image.getAttribute("src");
    if (!src || src.startsWith("data:")) continue;

    const cached = _inlineImageCache.get(src);
    if (cached) {
      image.setAttribute("src", cached);
      continue;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const dataUrl = await blobToDataURL(blob);
      image.setAttribute("src", dataUrl);
      
      // Evict oldest entries if cache is full (simple FIFO eviction)
      if (_inlineImageCache.size >= MAX_INLINE_IMAGE_CACHE_SIZE) {
        const firstKey = _inlineImageCache.keys().next().value;
        if (firstKey) _inlineImageCache.delete(firstKey);
      }
      _inlineImageCache.set(src, dataUrl);
    } catch (e) {
      console.warn("Failed to inline image:", src, e);
    }
  }
}


/**
 * Convert a Blob to a data URL.
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Wait for next animation frame (allows browser to complete layout)
 */
function waitForFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

/**
 * Wait for multiple animation frames to ensure all paints are flushed.
 * This is necessary because video frame decoding and canvas painting may
 * happen asynchronously even after seek() returns.
 */
function waitForPaintFlush(): Promise<void> {
  return new Promise(resolve => {
    // Double RAF ensures we wait for:
    // 1. First RAF: Any pending paints are scheduled
    // 2. Second RAF: Those paints have completed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Check if a canvas has any rendered content (not all transparent/uninitialized).
 * Returns true if there's ANY non-transparent pixel.
 */
function canvasHasContent(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  
  try {
    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return false;
    
    // Sample a horizontal strip across the middle of the canvas
    // This catches most video content even if edges are black
    const stripY = Math.floor(height / 2);
    const imageData = ctx.getImageData(0, stripY, width, CANVAS_SAMPLE_STRIP_HEIGHT);
    const data = imageData.data;
    
    // Check if ANY pixel has non-zero alpha (is not transparent)
    // A truly blank/uninitialized canvas has all pixels at [0,0,0,0]
    // A black video frame would have pixels at [0,0,0,255] (opaque black)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) {
        return true;
      }
    }
    
    return false;
  } catch {
    // Canvas might be tainted, assume it has content
    return true;
  }
}

/**
 * Override clip-path, opacity, and optionally transform on the root clone element.
 * The source may have these properties set for proxy mode or workbench scaling.
 * 
 * @param syncState - The sync state containing the clone tree
 * @param fullReset - If true, also resets opacity and transform (for capture operations)
 */
function overrideRootCloneStyles(syncState: SyncState, fullReset: boolean = false): void {
  const rootClone = syncState.tree.root?.clone;
  if (!rootClone) return;
  
  rootClone.style.clipPath = "none";
  if (fullReset) {
    rootClone.style.opacity = "1";
    rootClone.style.transform = "none";
  }
}

/**
 * Check if an element is temporally visible at the given time.
 */
function isVisibleAtTime(element: Element, timeMs: number): boolean {
  const temporal = element as TemporalElement;
  if (typeof temporal.startTimeMs === 'number' && typeof temporal.endTimeMs === 'number') {
    if (temporal.endTimeMs <= temporal.startTimeMs) {
      return true;
    }
    return timeMs >= temporal.startTimeMs && timeMs <= temporal.endTimeMs;
  }
  return true;
}

interface WaitForVideoContentResult {
  ready: boolean;
  blankVideos: string[];
}

/**
 * Wait for video canvases within a timegroup to have content.
 * Only checks videos that should be visible at the current time.
 * Returns result with ready status and list of blank video names.
 */
async function waitForVideoContent(
  timegroup: EFTimegroup,
  timeMs: number,
  maxWaitMs: number,
): Promise<WaitForVideoContentResult> {
  const startTime = performance.now();
  
  // Find all video elements in the timegroup (including nested)
  const allVideos = timegroup.querySelectorAll("ef-video");
  if (allVideos.length === 0) return { ready: true, blankVideos: [] };
  
  // Filter to only videos that should be visible at this time
  const visibleVideos = Array.from(allVideos).filter(video => {
    // Check if video itself is in time range
    if (!isVisibleAtTime(video, timeMs)) return false;
    
    // Check if all ancestor timegroups are in time range
    let parent = video.parentElement;
    while (parent && parent !== timegroup) {
      if (parent.tagName === 'EF-TIMEGROUP' && !isVisibleAtTime(parent, timeMs)) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  });
  
  if (visibleVideos.length === 0) return { ready: true, blankVideos: [] };
  
  const getBlankVideoNames = () => visibleVideos
    .filter(video => {
      const shadowCanvas = video.shadowRoot?.querySelector("canvas");
      return shadowCanvas && !canvasHasContent(shadowCanvas);
    })
    .map(v => (v as TemporalElement).src || v.id || 'unnamed');
  
  while (performance.now() - startTime < maxWaitMs) {
    let allHaveContent = true;
    
    for (const video of visibleVideos) {
      const shadowCanvas = video.shadowRoot?.querySelector("canvas");
      if (shadowCanvas && shadowCanvas.width > 0 && shadowCanvas.height > 0) {
        if (!canvasHasContent(shadowCanvas)) {
          allHaveContent = false;
          break;
        }
      }
    }
    
    if (allHaveContent) return { ready: true, blankVideos: [] };
    
    // Wait a bit and check again
    await waitForFrame();
  }
  
  return { ready: false, blankVideos: getBlankVideoNames() };
}

/**
 * Options for native rendering.
 */
export interface NativeRenderOptions {
  /**
   * Wait for RAF before capturing. Only needed if content hasn't been laid out yet.
   * Default: false (capture immediately - frame tasks should already be complete)
   * 
   * Set to true only for edge cases where you're rendering content that was just
   * added to the DOM and hasn't had a chance to layout yet.
   */
  waitForPaint?: boolean;
  
  /**
   * Reuse an existing canvas instead of creating a new one.
   * The canvas must have layoutsubtree enabled and be in the DOM.
   */
  reuseCanvas?: HTMLCanvasElement;
  
  /**
   * Skip device pixel ratio scaling. When true, renders at 1x regardless of display DPR.
   * Default: false (respects display DPR for crisp rendering)
   * 
   * Set to true for video export where retina resolution isn't needed.
   * This can provide a 4x speedup on 2x DPR displays!
   */
  skipDprScaling?: boolean;
}

/**
 * Render HTML content to canvas using native HTML-in-Canvas API (drawElementImage).
 * This is much faster than the foreignObject approach and avoids canvas tainting.
 * 
 * Note: The native API renders at device pixel ratio, so we capture at DPR scale
 * and then downsample to logical pixels to match the foreignObject path's output.
 * 
 * @param container - The HTML element to render
 * @param width - Target width in logical pixels
 * @param height - Target height in logical pixels
 * @param options - Rendering options (skipWait for batch mode)
 * 
 * @see https://github.com/WICG/html-in-canvas
 */
export async function renderToImageNative(
  container: HTMLElement,
  width: number,
  height: number,
  options: NativeRenderOptions = {},
): Promise<HTMLCanvasElement> {
  const t0 = performance.now();
  const { waitForPaint = false, reuseCanvas, skipDprScaling = false } = options;
  // Use 1x DPR when skipDprScaling is true (for video export) - 4x fewer pixels!
  const dpr = skipDprScaling ? 1 : (window.devicePixelRatio || 1);
  
  // Use provided canvas or create new one
  let captureCanvas: HTMLCanvasElement;
  let shouldCleanup = false;
  
  if (reuseCanvas) {
    captureCanvas = reuseCanvas;
    
    // Ensure canvas dimensions match (both attribute and CSS)
    const dpr = skipDprScaling ? 1 : (window.devicePixelRatio || 1);
    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);
    
    // Set attribute dimensions (pixel buffer size)
    if (captureCanvas.width !== targetWidth) {
      captureCanvas.width = targetWidth;
    }
    if (captureCanvas.height !== targetHeight) {
      captureCanvas.height = targetHeight;
    }
    
    // Ensure CSS dimensions match logical size (required for layoutsubtree)
    captureCanvas.style.width = `${width}px`;
    captureCanvas.style.height = `${height}px`;
    
    // Ensure layoutsubtree is set (required for drawElementImage)
    if (!captureCanvas.hasAttribute("layoutsubtree")) {
      captureCanvas.setAttribute("layoutsubtree", "");
      (captureCanvas as HtmlInCanvasElement).layoutSubtree = true;
    }
    
    // Ensure canvas is in DOM (required for drawElementImage layout)
    if (!captureCanvas.parentNode) {
      document.body.appendChild(captureCanvas);
    }
    
    // Ensure container is child of canvas
    if (container.parentElement !== captureCanvas) {
      captureCanvas.appendChild(container);
    }
    
    // Ensure container is visible (not display: none) for layout
    // drawElementImage requires the element to be laid out
    const containerStyle = getComputedStyle(container);
    if (containerStyle.display === 'none') {
      container.style.display = 'block';
    }
    
    // Force synchronous layout by reading layout properties
    // This ensures both canvas and container are laid out (required for drawElementImage)
    // Reading offsetHeight forces a synchronous layout recalculation
    void captureCanvas.offsetHeight;
    void container.offsetHeight;
    getComputedStyle(captureCanvas).opacity;
    getComputedStyle(container).opacity;
  } else {
    captureCanvas = document.createElement("canvas");
    captureCanvas.width = Math.floor(width * dpr);
    captureCanvas.height = Math.floor(height * dpr);
    
    // Enable HTML-in-Canvas mode via layoutsubtree attribute/property
    captureCanvas.setAttribute("layoutsubtree", "");
    (captureCanvas as HtmlInCanvasElement).layoutSubtree = true;
    
    captureCanvas.appendChild(container);
    
    captureCanvas.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${width}px;
      height: ${height}px;
      opacity: 0;
      pointer-events: none;
      z-index: -9999;
    `;
    document.body.appendChild(captureCanvas);
    shouldCleanup = true;
  }
  
  const t1 = performance.now();
  _totalSetupMs += t1 - t0;
  
  try {
    // Force style calculation to ensure CSS is computed before capture
    // This ensures both canvas and container are laid out (required for drawElementImage)
    getComputedStyle(container).opacity;
    
    // When reusing canvas with layoutsubtree, wait for initial layout (first use only)
    // Use a WeakSet to track canvases that have been initialized
    if (reuseCanvas && (captureCanvas as any).layoutSubtree && !_layoutInitializedCanvases.has(captureCanvas)) {
      await waitForFrame();
      _layoutInitializedCanvases.add(captureCanvas);
      
      // Canvas may have been detached during async wait (e.g., test cleanup)
      if (!captureCanvas.parentNode) {
        return captureCanvas;
      }
    }
    
    // Only wait for paint in rare edge cases where content was just added to DOM
    if (waitForPaint) {
      await waitForPaintFlush();
      
      if (!captureCanvas.parentNode) {
        return captureCanvas;
      }
    }
    
    const ctx = captureCanvas.getContext("2d") as HtmlInCanvasContext;
    ctx.drawElementImage(container, 0, 0);
  } finally {
    // Only clean up if we created the canvas
    if (shouldCleanup && captureCanvas.parentNode) {
      captureCanvas.parentNode.removeChild(captureCanvas);
    }
  }
  
  const t2 = performance.now();
  _totalDrawMs += t2 - t1;
  
  // If DPR is 1, no downsampling needed - return as-is
  if (dpr === 1) {
    _renderCallCount++;
    return captureCanvas;
  }
  
  // Downsample to logical pixel dimensions to match foreignObject path output
  // This ensures consistent behavior regardless of which rendering path is used
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  
  const outputCtx = outputCanvas.getContext("2d")!;
  // Draw the DPR-scaled capture onto the 1x output canvas
  outputCtx.drawImage(
    captureCanvas,
    0, 0, captureCanvas.width, captureCanvas.height,  // source (full DPR capture)
    0, 0, width, height  // destination (logical pixels)
  );
  
  const t3 = performance.now();
  _totalDownsampleMs += t3 - t2;
  _renderCallCount++;
  
  if (t3 - _lastLogTime > PROFILING_LOG_INTERVAL_MS) {
    _lastLogTime = t3;
  }
  
  return outputCanvas;
}

/**
 * Options for foreignObject rendering path.
 */
export interface ForeignObjectRenderOptions extends NativeRenderOptions {
  /**
   * Scale factor for encoding internal canvases.
   * When set, canvases are scaled down before encoding to data URLs,
   * dramatically reducing encoding time for thumbnails.
   * Default: 1 (no scaling - encode at full resolution)
   */
  canvasScale?: number;
}

/**
 * Render HTML content to an image (or canvas) for drawing.
 * 
 * Supports two rendering modes (configurable via previewSettings):
 * - "native": Chrome's experimental drawElementImage API (fastest when available)
 * - "foreignObject": SVG foreignObject serialization (fallback, works everywhere)
 * 
 * @param container - The HTML element to render
 * @param width - Target width in logical pixels
 * @param height - Target height in logical pixels
 * @param options - Rendering options
 * @returns HTMLCanvasElement when using native, HTMLImageElement when using foreignObject
 */
export async function renderToImage(
  container: HTMLElement,
  width: number,
  height: number,
  options?: ForeignObjectRenderOptions,
): Promise<HTMLImageElement | HTMLCanvasElement> {
  const renderMode = getEffectiveRenderMode();
  
  // Native HTML-in-Canvas API path (fastest, requires Chrome flag)
  if (renderMode === "native") {
    if (!_pathLogged) {
      _pathLogged = true;
      const effectiveDpr = options?.skipDprScaling ? 1 : window.devicePixelRatio;
    }
    return renderToImageNative(container, width, height, options);
  }
  
  // Fallback: SVG foreignObject serialization
  if (!_pathLogged) {
    _pathLogged = true;
  }
  
  // Fallback: SVG foreignObject approach
  // Get all canvases from original BEFORE cloning (cloneNode doesn't copy canvas pixels)
  const originalCanvases = Array.from(container.querySelectorAll("canvas"));
  
  // Clone the container for serialization (don't modify original)
  const clone = container.cloneNode(true) as HTMLElement;
  
  // Convert original canvases directly to images and replace cloned canvases
  // When canvasScale < 1, we scale down before encoding (MUCH faster for thumbnails)
  const canvasScale = options?.canvasScale ?? 1;
  const clonedCanvases = clone.querySelectorAll("canvas");
  
  // Encode canvases in parallel using worker pool
  const encodedResults = await encodeCanvasesInParallel(originalCanvases, canvasScale);
  
  // Map encoded results to cloned canvases and replace them
  for (let i = 0; i < originalCanvases.length; i++) {
    const srcCanvas = originalCanvases[i];
    const dstCanvas = clonedCanvases[i];
    const encoded = encodedResults.find((r) => r.canvas === srcCanvas);
    
    if (!srcCanvas || !dstCanvas || !encoded) {
      continue;
    }
    
    try {
      const img = document.createElement("img");
      img.src = encoded.dataUrl;
      // Keep original dimensions - CSS will handle the visual scaling
      img.width = srcCanvas.width;
      img.height = srcCanvas.height;
      const style = dstCanvas.getAttribute("style");
      if (style) img.setAttribute("style", style);
      dstCanvas.parentNode?.replaceChild(img, dstCanvas);
    } catch (e) {
      // Cross-origin or other error - skip
    }
  }

  // Inline external images
  await inlineImages(clone);

  // Create wrapper with XHTML namespace (reuse serializer for better performance)
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.setAttribute("style", `width:${width}px;height:${height}px;overflow:hidden;position:relative;`);
  wrapper.appendChild(clone);

  // Serialize to XHTML - reuse serializer instance (faster than creating new one each frame)
  if (!_xmlSerializer) {
    _xmlSerializer = new XMLSerializer();
  }
  const serialized = _xmlSerializer.serializeToString(wrapper);
  
  // Wrap in SVG foreignObject
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;

  // Optimized base64 encoding: Use TextEncoder for UTF-8 → bytes, then encode directly
  // Prefer Uint8Array.prototype.toBase64() if available (faster, avoids binary string conversion)
  // Otherwise use optimized base64 encoder that works directly on Uint8Array
  if (!_textEncoder) {
    _textEncoder = new TextEncoder();
  }
  const utf8Bytes = _textEncoder.encode(svg);
  
  let base64: string;
  // Check if Uint8Array.prototype.toBase64 is available (newer browsers)
  if (typeof (Uint8Array.prototype as any).toBase64 === "function") {
    base64 = (utf8Bytes as any).toBase64();
  } else {
    // Fast base64 encoding directly from Uint8Array (avoids binary string conversion)
    base64 = encodeBase64Fast(utf8Bytes);
  }
  const dataUri = `data:image/svg+xml;base64,${base64}`;
  
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUri;
  });
  
  return image;
}


/**
 * Render a pre-built clone container to an image WITHOUT cloning it again.
 * This is the fast path for reusing clone structures across frames.
 * 
 * Key difference from renderToImage:
 * - Does NOT call cloneNode (avoids expensive DOM duplication)
 * - Converts canvases to images in-place, then restores them after serialization
 * - Assumes the container already has refreshed canvas content
 * 
 * @param container - Pre-built clone container with refreshed canvas content
 * @param width - Output width
 * @param height - Output height
 * @returns Promise resolving to an HTMLImageElement
 */
// Timing accumulators for renderToImageDirect breakdown
let _totalCanvasEncodeMs = 0;
let _totalInlineMs = 0;
let _totalSerializeMs = 0;
let _totalBase64Ms = 0;
let _totalImageLoadMs = 0;
let _totalRestoreMs = 0;
let _timingLoggedAt = 0;

export async function renderToImageDirect(
  container: HTMLElement,
  width: number,
  height: number,
): Promise<HTMLImageElement> {
  _renderCallCount++;
  
  // Store original canvas elements and their parents for restoration
  const canvasRestoreInfo: Array<{ canvas: HTMLCanvasElement; parent: Node; nextSibling: Node | null; img: HTMLImageElement }> = [];
  
  // Convert canvases to images IN-PLACE (we'll restore them after serialization)
  // Use JPEG encoding for video frames (faster), PNG for images (preserves transparency)
  const canvasStart = performance.now();
  const canvases = Array.from(container.querySelectorAll("canvas"));
  
  // Encode canvases in parallel using worker pool
  const encodedResults = await encodeCanvasesInParallel(canvases);
  
  // Replace canvases with images and store restoration info
  for (const { canvas, dataUrl } of encodedResults) {
    try {
      const img = document.createElement("img");
      img.src = dataUrl;
      img.width = canvas.width;
      img.height = canvas.height;
      const style = canvas.getAttribute("style");
      if (style) img.setAttribute("style", style);
      
      // Store info for restoration
      const parent = canvas.parentNode;
      if (parent) {
        const nextSibling = canvas.nextSibling;
        parent.replaceChild(img, canvas);
        canvasRestoreInfo.push({ canvas, parent, nextSibling, img });
      }
    } catch (e) {
      // Cross-origin canvas - leave as-is
    }
  }
  _totalCanvasEncodeMs += performance.now() - canvasStart;
  
  // Inline external images (this is idempotent, safe to call multiple times)
  const inlineStart = performance.now();
  await inlineImages(container);
  _totalInlineMs += performance.now() - inlineStart;
  
  // Create wrapper with XHTML namespace
  const serializeStart = performance.now();
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.setAttribute("style", `width:${width}px;height:${height}px;overflow:hidden;position:relative;`);
  wrapper.appendChild(container);
  
  // Serialize to XHTML
  if (!_xmlSerializer) {
    _xmlSerializer = new XMLSerializer();
  }
  const serialized = _xmlSerializer.serializeToString(wrapper);
  _totalSerializeMs += performance.now() - serializeStart;
  
  // RESTORE: Put container back (remove from wrapper)
  const restoreStart = performance.now();
  wrapper.removeChild(container);
  
  // RESTORE: Put canvases back in place of images
  for (const { canvas, parent, nextSibling, img } of canvasRestoreInfo) {
    if (img.parentNode === parent) {
      if (nextSibling) {
        parent.insertBefore(canvas, nextSibling);
        parent.removeChild(img);
      } else {
        parent.replaceChild(canvas, img);
      }
    }
  }
  _totalRestoreMs += performance.now() - restoreStart;
  
  // DEBUG: Log serialized HTML size
  if (_renderCallCount < 2) {
    console.log(`[renderToImageDirect] FO serialized: ${serialized.length} chars`);
  }
  
  // Wrap in SVG foreignObject
  const base64Start = performance.now();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  
  // Use data URI (Blob URLs cause cross-origin tainting when drawn to canvas)
  // Optimized base64 encoding using TextEncoder + fast encoder
  if (!_textEncoder) {
    _textEncoder = new TextEncoder();
  }
  const utf8Bytes = _textEncoder.encode(svg);
  
  let base64: string;
  if (typeof (Uint8Array.prototype as any).toBase64 === "function") {
    base64 = (utf8Bytes as any).toBase64();
  } else {
    base64 = encodeBase64Fast(utf8Bytes);
  }
  const dataUri = `data:image/svg+xml;base64,${base64}`;
  _totalBase64Ms += performance.now() - base64Start;
  
  // Create new Image for each frame (needed for pipelining - can't reuse when overlapping)
  const img = new Image();
  
  const imageLoadStart = performance.now();
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => {
      _totalImageLoadMs += performance.now() - imageLoadStart;
      resolve(img);
    };
    img.onerror = reject;
    img.src = dataUri;
  });
  
  // Log timing breakdown periodically
  if (_renderCallCount - _timingLoggedAt >= 100) {
    _timingLoggedAt = _renderCallCount;
  }
  
  return image;
}

/**
 * Prepare a frame's data URI without waiting for image load.
 * Returns the data URI asynchronously (after parallel canvas encoding and serialization) for pipelined loading.
 * The DOM is restored before this function returns.
 */
export async function prepareFrameDataUri(
  container: HTMLElement,
  width: number,
  height: number,
): Promise<string> {
  _renderCallCount++;
  
  // Store original canvas elements and their parents for restoration
  const canvasRestoreInfo: Array<{ canvas: HTMLCanvasElement; parent: Node; nextSibling: Node | null; img: HTMLImageElement }> = [];
  
  // Convert canvases to images IN-PLACE using worker pool
  const canvasStart = performance.now();
  const canvases = Array.from(container.querySelectorAll("canvas"));
  
  // Encode canvases in parallel using worker pool
  const encodedResults = await encodeCanvasesInParallel(canvases);
  
  // Replace canvases with images and store restoration info
  for (const { canvas, dataUrl } of encodedResults) {
    try {
      const img = document.createElement("img");
      img.src = dataUrl;
      img.width = canvas.width;
      img.height = canvas.height;
      const style = canvas.getAttribute("style");
      if (style) img.setAttribute("style", style);
      
      const parent = canvas.parentNode;
      if (parent) {
        const nextSibling = canvas.nextSibling;
        parent.replaceChild(img, canvas);
        canvasRestoreInfo.push({ canvas, parent, nextSibling, img });
      }
    } catch (e) {
      // Cross-origin canvas - leave as-is
    }
  }
  _totalCanvasEncodeMs += performance.now() - canvasStart;
  
  // Create wrapper with XHTML namespace
  const serializeStart = performance.now();
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.setAttribute("style", `width:${width}px;height:${height}px;overflow:hidden;position:relative;`);
  wrapper.appendChild(container);
  
  // Serialize to XHTML
  if (!_xmlSerializer) {
    _xmlSerializer = new XMLSerializer();
  }
  const serialized = _xmlSerializer.serializeToString(wrapper);
  _totalSerializeMs += performance.now() - serializeStart;
  
  // RESTORE: Put container back
  const restoreStart = performance.now();
  wrapper.removeChild(container);
  
  // RESTORE: Put canvases back
  for (const { canvas, parent, nextSibling, img } of canvasRestoreInfo) {
    if (img.parentNode === parent) {
      if (nextSibling) {
        parent.insertBefore(canvas, nextSibling);
        parent.removeChild(img);
      } else {
        parent.replaceChild(canvas, img);
      }
    }
  }
  _totalRestoreMs += performance.now() - restoreStart;
  
  // Wrap in SVG foreignObject and encode to base64 data URI
  const base64Start = performance.now();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  
  if (!_textEncoder) {
    _textEncoder = new TextEncoder();
  }
  const utf8Bytes = _textEncoder.encode(svg);
  
  let base64: string;
  if (typeof (Uint8Array.prototype as any).toBase64 === "function") {
    base64 = (utf8Bytes as any).toBase64();
  } else {
    base64 = encodeBase64Fast(utf8Bytes);
  }
  const dataUri = `data:image/svg+xml;base64,${base64}`;
  _totalBase64Ms += performance.now() - base64Start;
  
  return dataUri;
}

/**
 * Load an image from a data URI. Returns a Promise that resolves when loaded.
 */
export function loadImageFromDataUri(dataUri: string): Promise<HTMLImageElement> {
  const img = new Image();
  const imageLoadStart = performance.now();
  
  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => {
      _totalImageLoadMs += performance.now() - imageLoadStart;
      resolve(img);
    };
    img.onerror = reject;
    img.src = dataUri;
  });
}

/**
 * Options for capturing from an existing render clone.
 */
export interface CaptureFromCloneOptions {
  /** Scale factor for the output canvas (default: 0.25) */
  scale?: number;
  /** Content readiness strategy (default: "immediate") */
  contentReadyMode?: ContentReadyMode;
  /** Max wait time for blocking mode before throwing (default: 5000ms) */
  blockingTimeoutMs?: number;
  /** Original timegroup (for dimension and background reference) */
  originalTimegroup?: EFTimegroup;
}

/**
 * Captures a frame from an already-seeked render clone.
 * Used internally by captureBatch for efficiency (reuses one clone across all captures).
 * 
 * @param renderClone - A render clone that has already been seeked to the target time
 * @param renderContainer - The container holding the render clone (from createRenderClone)
 * @param options - Capture options
 * @returns Canvas with the rendered frame
 */
export async function captureFromClone(
  renderClone: EFTimegroup,
  renderContainer: HTMLElement,
  options: CaptureFromCloneOptions = {},
): Promise<HTMLCanvasElement> {
  const {
    scale = DEFAULT_THUMBNAIL_SCALE,
    contentReadyMode = "immediate",
    blockingTimeoutMs = DEFAULT_BLOCKING_TIMEOUT_MS,
    originalTimegroup,
  } = options;

  // Use original timegroup dimensions if available, otherwise clone dimensions
  const sourceForDimensions = originalTimegroup ?? renderClone;
  const width = sourceForDimensions.offsetWidth || DEFAULT_WIDTH;
  const height = sourceForDimensions.offsetHeight || DEFAULT_HEIGHT;

  // Create canvas at scaled size
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(width * scale * dpr);
  canvas.height = Math.floor(height * scale * dpr);
  canvas.style.width = `${Math.floor(width * scale)}px`;
  canvas.style.height = `${Math.floor(height * scale)}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2d context");
  }

  // Handle content readiness based on mode
  const timeMs = renderClone.currentTimeMs;
  if (contentReadyMode === "blocking") {
    const result = await waitForVideoContent(renderClone, timeMs, blockingTimeoutMs);
    if (!result.ready) {
      throw new ContentNotReadyError(timeMs, blockingTimeoutMs, result.blankVideos);
    }
  }

  let image: HTMLCanvasElement | HTMLImageElement;
  const renderMode = getEffectiveRenderMode();
  
  if (renderMode === "native") {
    // NATIVE PATH: Render the seeked renderClone directly from live DOM
    // The clone is already at the correct time, so drawElementImage captures its current
    // visual state including video frames at the correct position.
    // 
    // Position render container properly for capture
    renderContainer.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${width}px;
      height: ${height}px;
      pointer-events: none;
      overflow: hidden;
    `;
    
    // OPTIMIZATION: Skip DPR scaling for thumbnails - retina quality isn't needed
    // and DPR=2 means 4x more pixels to render.
    const skipDpr = scale < 1;
    image = await renderToImageNative(renderContainer, width, height, { skipDprScaling: skipDpr });
  } else {
    // FOREIGNOBJECT PATH: Build passive structure from the SEEKED render clone
    // The clone is already at the correct time, so getComputedStyle captures the right values.
    // Styles are synced during clone building in a single pass.
    const t0 = performance.now();
    const { container, syncState } = buildCloneStructure(renderClone, timeMs);
    const buildTime = performance.now() - t0;

    // Create wrapper
    const bgSource = originalTimegroup ?? renderClone;
    const previewContainer = document.createElement("div");
    previewContainer.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      position: relative;
      overflow: hidden;
      background: ${getComputedStyle(bgSource).background || "#000"};
    `;
    
    const t1 = performance.now();
    const styleEl = document.createElement("style");
    styleEl.textContent = collectDocumentStyles();
    const stylesTime = performance.now() - t1;
    previewContainer.appendChild(styleEl);
    previewContainer.appendChild(container);
    
    // Ensure clone root is visible
    overrideRootCloneStyles(syncState, true);

    // Render using foreignObject serialization
    // Pass scale so canvases are encoded at thumbnail size (MUCH faster)
    const t2 = performance.now();
    image = await renderToImage(previewContainer, width, height, { canvasScale: scale });
    const renderTime = performance.now() - t2;
    
    console.log(`[captureFromClone] build=${buildTime.toFixed(0)}ms, styles=${stylesTime.toFixed(0)}ms, render=${renderTime.toFixed(0)}ms (canvasScale=${scale})`);
  }

  // Draw to canvas (may need scaling for native path which is at DPR)
  const srcWidth = image.width;
  const srcHeight = image.height;
  ctx.drawImage(
    image,
    0, 0, srcWidth, srcHeight,
    0, 0, canvas.width, canvas.height
  );

  return canvas;
}

/**
 * Captures a single frame from a timegroup at a specific time.
 * 
 * CLONE-TIMELINE ARCHITECTURE:
 * Creates an independent render clone, seeks it to the target time, and captures.
 * Prime-timeline is NEVER seeked - user can continue previewing/editing during capture.
 * 
 * @param timegroup - The source timegroup
 * @param options - Capture options including timeMs, scale, contentReadyMode
 * @returns Canvas with the rendered frame
 * @throws ContentNotReadyError if blocking mode times out waiting for video content
 */
export async function captureTimegroupAtTime(
  timegroup: EFTimegroup,
  options: CaptureOptions,
): Promise<HTMLCanvasElement> {
  const {
    timeMs,
    scale = DEFAULT_THUMBNAIL_SCALE,
    // skipRestore is deprecated with Clone-timeline (Prime is never seeked)
    contentReadyMode = "immediate",
    blockingTimeoutMs = DEFAULT_BLOCKING_TIMEOUT_MS,
  } = options;

  // CLONE-TIMELINE: Create a short-lived render clone for this capture
  // Prime-timeline is NEVER seeked - clone is fully independent
  const { clone: renderClone, container: renderContainer, cleanup: cleanupRenderClone } = 
    await timegroup.createRenderClone();
  
  try {
    // Seek the clone to target time (Prime stays at user position)
    // Use seekForRender which bypasses duration clamping - render clones may have
    // zero duration initially until media durations are computed, but we still
    // want to seek to the requested time for capture purposes.
    await renderClone.seekForRender(timeMs);
    
    // Use the shared capture helper
    return await captureFromClone(renderClone, renderContainer, {
      scale,
      contentReadyMode,
      blockingTimeoutMs,
      originalTimegroup: timegroup,
    });
  } finally {
    // Clean up the render clone
    cleanupRenderClone();
  }
}

/** Epsilon for comparing time values (ms) - times within this are considered equal */
const TIME_EPSILON_MS = 1;

/** Default scale for preview rendering */
const DEFAULT_PREVIEW_SCALE = 1;

/** Default resolution scale (full resolution) */
const DEFAULT_RESOLUTION_SCALE = 1;

/**
 * Convert relative time to absolute time for a timegroup.
 * Nested timegroup children have ABSOLUTE startTimeMs values,
 * so relative capture times must be converted for temporal culling.
 */
function toAbsoluteTime(timegroup: EFTimegroup, relativeTimeMs: number): number {
  return relativeTimeMs + (timegroup.startTimeMs ?? 0);
}

export interface CanvasPreviewResult {
  /**
   * Wrapper container holding the canvas and debug label.
   * Append this to your DOM - the canvas inside will receive transforms.
   */
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  /**
   * Call this to re-render the timegroup to canvas at current visual state.
   * Returns a promise that resolves when rendering is complete.
   */
  refresh: () => Promise<void>;
  syncState: SyncState;
  /**
   * Dynamically change the resolution scale without rebuilding the clone structure.
   * This is nearly instant - just updates CSS and internal variables.
   * The next refresh() call will render at the new resolution.
   */
  setResolutionScale: (scale: number) => void;
  /**
   * Get the current resolution scale.
   */
  getResolutionScale: () => number;
}

/**
 * Options for canvas preview rendering.
 */
export interface CanvasPreviewOptions {
  /**
   * Output scale factor (default: 1).
   * Scales the final canvas size.
   */
  scale?: number;
  
  /**
   * Resolution scale for internal rendering (default: 1).
   * Reduces the internal render resolution for better performance.
   * The canvas CSS size remains the same (browser upscales).
   * - 1: Full resolution
   * - 0.75: 3/4 resolution
   * - 0.5: Half resolution
   * - 0.25: Quarter resolution
   */
  resolutionScale?: number;
}

/**
 * Renders a timegroup preview to a canvas using SVG foreignObject.
 * 
 * Optimized with:
 * - Persistent clone structure (built once)
 * - Temporal bucketing for time-based culling
 * - Property split (static vs animated)
 * - Parent index for O(1) visibility checks
 * - Resolution scaling for performance (renders at lower resolution, CSS upscales)
 *
 * @param timegroup - The source timegroup to preview
 * @param scaleOrOptions - Scale factor (default 1) or options object
 * @returns Object with canvas and refresh function
 */
export function renderTimegroupToCanvas(
  timegroup: EFTimegroup,
  scaleOrOptions: number | CanvasPreviewOptions = DEFAULT_PREVIEW_SCALE,
): CanvasPreviewResult {
  // Normalize options
  const options: CanvasPreviewOptions = typeof scaleOrOptions === "number"
    ? { scale: scaleOrOptions }
    : scaleOrOptions;
  
  const scale = options.scale ?? DEFAULT_PREVIEW_SCALE;
  // These are mutable to support dynamic resolution changes
  let currentResolutionScale = options.resolutionScale ?? DEFAULT_RESOLUTION_SCALE;
  
  const width = timegroup.offsetWidth || DEFAULT_WIDTH;
  const height = timegroup.offsetHeight || DEFAULT_HEIGHT;
  
  // Calculate effective render dimensions (internal resolution) - mutable
  let renderWidth = Math.floor(width * currentResolutionScale);
  let renderHeight = Math.floor(height * currentResolutionScale);

  // Create canvas at scaled size (with devicePixelRatio for sharpness)
  // Canvas buffer size is based on resolutionScale (internal resolution)
  // CSS size is based on scale (logical display size)
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  // Canvas buffer: render at resolutionScale (effective internal resolution)
  canvas.width = Math.floor(renderWidth * scale * dpr);
  canvas.height = Math.floor(renderHeight * scale * dpr);
  // CSS size: display at full logical size (browser upscales if needed)
  canvas.style.width = `${Math.floor(width * scale)}px`;
  canvas.style.height = `${Math.floor(height * scale)}px`;
  
  // Create wrapper container for canvas + debug label
  const wrapperContainer = document.createElement("div");
  wrapperContainer.style.cssText = "position: relative; display: inline-block;";
  
  // Create debug label (positioned above the canvas, doesn't scale with it)
  const debugLabel = document.createElement("div");
  debugLabel.style.cssText = `
    position: absolute;
    top: -24px;
    left: 0;
    padding: 2px 8px;
    font: bold 12px monospace;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 3px;
    white-space: nowrap;
    z-index: 1000;
    pointer-events: none;
  `;
  
  wrapperContainer.appendChild(debugLabel);
  wrapperContainer.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2d context");
  }

  // Build clone structure ONCE with optimized sync state
  // Initial sync happens during clone building in a single pass
  const initialTimeMs = toAbsoluteTime(timegroup, timegroup.currentTimeMs ?? 0);
  const { container, syncState } = buildCloneStructure(timegroup, initialTimeMs);

  // Create a wrapper div with scaled dimensions
  // When resolutionScale < 1, we render at a smaller size and CSS transform scales the content
  const previewContainer = document.createElement("div");
  previewContainer.style.cssText = `
    width: ${renderWidth}px;
    height: ${renderHeight}px;
    position: relative;
    overflow: hidden;
    background: ${getComputedStyle(timegroup).background || "#000"};
  `;
  
  // Apply CSS transform to scale down the content within the container
  // This makes the clone render at reduced complexity
  if (currentResolutionScale < 1) {
    container.style.transform = `scale(${currentResolutionScale})`;
    container.style.transformOrigin = "top left";
  }
  
  // Inject document styles so CSS rules work in SVG foreignObject
  const styleEl = document.createElement("style");
  styleEl.textContent = collectDocumentStyles();
  previewContainer.appendChild(styleEl);
  
  previewContainer.appendChild(container);
  overrideRootCloneStyles(syncState);

  // Track render state
  let rendering = false;
  let lastTimeMs = -1;

  // Log resolution scale on first render for debugging
  let hasLoggedScale = false;
  
  // Pending resolution change - applied at start of next refresh to avoid blanking
  let pendingResolutionScale: number | null = null;
  
  /**
   * Apply pending resolution scale changes.
   * Called at the start of refresh() before rendering, so the old content
   * stays visible until new content is ready to be drawn.
   */
  const applyPendingResolutionChange = (): void => {
    if (pendingResolutionScale === null) return;
    
    const newScale = pendingResolutionScale;
    pendingResolutionScale = null;
    
    currentResolutionScale = newScale;
    renderWidth = Math.floor(width * currentResolutionScale);
    renderHeight = Math.floor(height * currentResolutionScale);
    
    // Update previewContainer dimensions (affects what renderToImage produces)
    previewContainer.style.width = `${renderWidth}px`;
    previewContainer.style.height = `${renderHeight}px`;
    
    // Update clone transform
    if (currentResolutionScale < 1) {
      container.style.transform = `scale(${currentResolutionScale})`;
      container.style.transformOrigin = "top left";
    } else {
      container.style.transform = "";
    }
    
    // Canvas dimensions will be updated right before drawing (in refresh)
    // to avoid clearing the canvas until new content is ready
  };
  
  /**
   * Dynamically change resolution scale without rebuilding clone structure.
   * The actual change is deferred until next refresh() to avoid blanking -
   * old content stays visible until new content is ready.
   */
  const setResolutionScale = (newScale: number): void => {
    // Clamp to valid range
    newScale = Math.max(0.1, Math.min(1, newScale));
    
    if (newScale === currentResolutionScale && pendingResolutionScale === null) return;
    
    // Queue the change - will be applied at start of next refresh
    pendingResolutionScale = newScale;
    
    // Force re-render on next refresh by invalidating lastTimeMs
    lastTimeMs = -1;
  };
  
  const getResolutionScale = (): number => pendingResolutionScale ?? currentResolutionScale;
  
  const refresh = async (): Promise<void> => {
    if (rendering) return;
    // Clone-timeline: captures use separate clones, Prime-timeline is never locked
    
    const sourceTimeMs = timegroup.currentTimeMs ?? 0;
    const userTimeMs = timegroup.userTimeMs ?? 0;
    if (Math.abs(sourceTimeMs - userTimeMs) > TIME_EPSILON_MS) return;
    
    if (userTimeMs === lastTimeMs) return;
    lastTimeMs = userTimeMs;
    
    rendering = true;
    
    // Apply any pending resolution changes before rendering
    // This updates previewContainer and clone transform, but NOT canvas dimensions yet
    applyPendingResolutionChange();
    
    // Log scale info once per initialization
    if (!hasLoggedScale) {
      hasLoggedScale = true;
      const mode = getEffectiveRenderMode();
      console.log(`[renderTimegroupToCanvas] Resolution scale: ${currentResolutionScale} (${width}x${height} → ${renderWidth}x${renderHeight}), canvas buffer: ${canvas.width}x${canvas.height}, CSS size: ${canvas.style.width}x${canvas.style.height}, renderMode: ${mode}`);
    }

    try {
      syncStyles(syncState, toAbsoluteTime(timegroup, userTimeMs));
      overrideRootCloneStyles(syncState);

      // Render at scaled dimensions with canvas scaling for internal video frames
      const t0 = performance.now();
      const image = await renderToImage(previewContainer, renderWidth, renderHeight, {
        canvasScale: currentResolutionScale,
      });
      const renderTime = performance.now() - t0;

      // Update canvas buffer dimensions NOW, right before drawing
      // This clears the canvas, but we immediately draw new content
      const targetWidth = Math.floor(renderWidth * scale * dpr);
      const targetHeight = Math.floor(renderHeight * scale * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.save();
      ctx.scale(dpr * scale, dpr * scale);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
      
      // Log render time periodically (every 60 frames)
      _renderCallCount++;
      if (_renderCallCount % 60 === 0) {
        console.log(`[renderTimegroupToCanvas] Frame render: ${renderTime.toFixed(1)}ms (resolutionScale=${currentResolutionScale}, image=${image.width}x${image.height})`);
      }
      
      // Update debug label (outside canvas, doesn't scale)
      const scaleColors: Record<number, string> = {
        1: "#00ff00",    // Green = full
        0.75: "#ffff00", // Yellow = 3/4
        0.5: "#ff8800",  // Orange = 1/2
        0.25: "#ff0000", // Red = 1/4
      };
      const indicatorColor = scaleColors[currentResolutionScale] || "#ffffff";
      debugLabel.style.color = indicatorColor;
      debugLabel.textContent = `Render: ${renderWidth}x${renderHeight} (${Math.round(currentResolutionScale * 100)}%)`;
    } catch (e) {
      console.error("Canvas preview render failed:", e);
    } finally {
      rendering = false;
    }
  };

  // Do initial render
  refresh();

  return { container: wrapperContainer, canvas, refresh, syncState, setResolutionScale, getResolutionScale };
}

