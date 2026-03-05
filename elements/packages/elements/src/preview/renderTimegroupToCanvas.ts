import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type {
  CaptureOptions,
  CaptureFromCloneOptions,
  GeneratedThumbnail,
  GenerateThumbnailsOptions,
  ThumbnailQueue,
  CanvasPreviewResult,
  CanvasPreviewOptions,
} from "./renderTimegroupToCanvas.types.js";
import { RenderContext } from "./RenderContext.js";
import { FrameController } from "./FrameController.js";
import { captureTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import {
  updateAnimations,
  type AnimatableElement,
} from "../elements/updateAnimations.js";

// Re-export renderer types for external use
export type { RenderOptions, RenderResult, Renderer } from "./renderers.js";
export { getEffectiveRenderMode, isCanvas, isImage } from "./renderers.js";
import {
  type TemporalElement,
  isVisibleAtTime,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_CAPTURE_SCALE,
  DEFAULT_BLOCKING_TIMEOUT_MS,
} from "./previewTypes.js";
import { defaultProfiler } from "./RenderProfiler.js";
import { logger } from "./logger.js";

// Import rendering modules
import { loadImageFromDataUri } from "./rendering/loadImage.js";
import {
  createDprCanvas,
  renderToImageNative,
} from "./rendering/renderToImageNative.js";
import {
  clearInlineImageCache,
  getInlineImageCacheSize,
} from "./rendering/inlineImages.js";
import {
  isNativeCanvasApiAvailable,
  getRenderMode,
} from "./previewSettings.js";
import type {
  HtmlInCanvasContext,
  HtmlInCanvasElement,
} from "./rendering/types.js";

// Re-export rendering types and functions for external use
export { loadImageFromDataUri };

// ============================================================================
// Constants (module-specific, not shared)
// ============================================================================

/** Number of rows to sample when checking canvas content */
const CANVAS_SAMPLE_STRIP_HEIGHT = 4;

// ============================================================================
// Types
// ============================================================================

// Re-export types from type-only module (zero side effects)
export type {
  ContentReadyMode,
  CaptureOptions,
  CaptureFromCloneOptions,
  GeneratedThumbnail,
  GenerateThumbnailsOptions,
  ThumbnailQueue,
  CanvasPreviewResult,
  CanvasPreviewOptions,
} from "./renderTimegroupToCanvas.types.js";

/**
 * Error thrown when video content is not ready within the blocking timeout.
 */
export class ContentNotReadyError extends Error {
  constructor(
    public readonly timeMs: number,
    public readonly timeoutMs: number,
    public readonly blankVideos: string[],
  ) {
    super(
      `Video content not ready at ${timeMs}ms after ${timeoutMs}ms timeout. Blank videos: ${blankVideos.join(", ")}`,
    );
    this.name = "ContentNotReadyError";
  }
}

// ============================================================================
// Module State (reset via resetRenderState)
// ============================================================================

/**
 * Module-level render state including caches and reusable objects.
 */
interface RenderState {
  inlineImageCache: Map<string, string>;
  layoutInitializedCanvases: WeakSet<HTMLCanvasElement>;
  xmlSerializer: XMLSerializer | null;
  textEncoder: TextEncoder;
  metrics: {
    inlineImageCacheHits: number;
    inlineImageCacheMisses: number;
    inlineImageCacheEvictions: number;
  };
}

/**
 * Module-level state for render operations.
 * Note: xmlSerializer is lazy-initialized for Node.js compatibility
 */
const renderState: RenderState = {
  inlineImageCache: new Map(),
  layoutInitializedCanvases: new WeakSet(),
  xmlSerializer: null, // Lazy-initialized in browser context
  textEncoder: new TextEncoder(),
  metrics: {
    inlineImageCacheHits: 0,
    inlineImageCacheMisses: 0,
    inlineImageCacheEvictions: 0,
  },
};

/**
 * Get the current render state for testing and debugging.
 * @returns The module-level render state object
 */
export function getRenderState(): RenderState {
  return renderState;
}

/**
 * Get cache metrics for monitoring performance.
 * @returns Object with cache hit/miss/eviction counts
 */
export function getCacheMetrics(): RenderState["metrics"] {
  return { ...renderState.metrics };
}

/**
 * Reset cache metrics to zero.
 */
export function resetCacheMetrics(): void {
  renderState.metrics.inlineImageCacheHits = 0;
  renderState.metrics.inlineImageCacheMisses = 0;
  renderState.metrics.inlineImageCacheEvictions = 0;
}

/**
 * Reset all module state including profiling counters, caches, and logging flags.
 * Call at the start of export sessions to ensure clean state.
 */
export function resetRenderState(): void {
  defaultProfiler.reset();
  clearInlineImageCache();
  resetCacheMetrics();
}

// Re-export cache management functions
export { clearInlineImageCache, getInlineImageCacheSize };

/**
 * DEBUG: Capture a single thumbnail at the current time.
 * Call from console: window.debugCaptureThumbnail()
 */
if (typeof window !== "undefined") {
  (window as any).debugCaptureThumbnail = async function () {
    const timegroup = document.querySelector("ef-timegroup") as any;
    if (!timegroup) {
      console.error("No timegroup found");
      return;
    }

    const currentTime = timegroup.currentTimeMs ?? 0;

    try {
      const result = await captureTimegroupAtTime(timegroup, {
        timeMs: currentTime,
        scale: 0.25,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 1000,
      });

      // Create a temporary img element to display the result
      const img = document.createElement("img");
      if (result instanceof HTMLCanvasElement) {
        img.src = result.toDataURL();
      } else if (result instanceof HTMLImageElement) {
        img.src = result.src;
      }
      img.style.cssText =
        "position:fixed;top:10px;right:10px;border:2px solid red;z-index:99999;";
      document.body.appendChild(img);

      return result;
    } catch (err) {
      console.error("[DEBUG] Capture failed:", err);
      throw err;
    }
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Wait for next animation frame (allows browser to complete layout)
 */
function waitForFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Check if a canvas has any rendered content (not all transparent/uninitialized).
 * Returns true if there's ANY non-transparent pixel.
 */
function canvasHasContent(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;

  try {
    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return false;

    // Sample a horizontal strip across the middle of the canvas
    // This catches most video content even if edges are black
    const stripY = Math.floor(height / 2);
    const imageData = ctx.getImageData(
      0,
      stripY,
      width,
      CANVAS_SAMPLE_STRIP_HEIGHT,
    );
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

interface WaitForVideoContentResult {
  ready: boolean;
  blankVideos: string[];
}

/**
 * Wait for video canvases within a timegroup to have content.
 * Only checks videos that should be visible at the current time.
 * Returns result with ready status and list of blank video names.
 */
export async function waitForVideoContent(
  timegroup: EFTimegroup,
  timeMs: number,
  maxWaitMs: number,
): Promise<WaitForVideoContentResult> {
  const startTime = performance.now();

  // Find all video elements in the timegroup (including nested)
  const allVideos = timegroup.querySelectorAll("ef-video");
  if (allVideos.length === 0) return { ready: true, blankVideos: [] };

  // Filter to only videos that should be visible at this time
  const visibleVideos = Array.from(allVideos).filter((video) => {
    // Check if video itself is in time range
    if (!isVisibleAtTime(video, timeMs)) return false;

    // Check if all ancestor timegroups are in time range
    let parent = video.parentElement;
    while (parent && parent !== timegroup) {
      if (
        parent.tagName === "EF-TIMEGROUP" &&
        !isVisibleAtTime(parent, timeMs)
      ) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  });

  if (visibleVideos.length === 0) return { ready: true, blankVideos: [] };

  const getBlankVideoNames = () =>
    visibleVideos
      .filter((video) => {
        const shadowCanvas = video.shadowRoot?.querySelector("canvas");
        return shadowCanvas && !canvasHasContent(shadowCanvas);
      })
      .map((v) => (v as TemporalElement).src || v.id || "unnamed");

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
 * Captures a frame from an already-seeked render clone.
 * Used internally by captureBatch for efficiency (reuses one clone across all captures).
 *
 * @param renderClone - A render clone that has already been seeked to the target time
 * @param renderContainer - The container holding the render clone (from createRenderClone)
 * @param options - Capture options
 * @returns Canvas or Image with the rendered frame (both are CanvasImageSource)
 */
export async function captureFromClone(
  renderClone: EFTimegroup,
  _renderContainer: HTMLElement,
  options: CaptureFromCloneOptions = {},
): Promise<CanvasImageSource> {
  const {
    scale = DEFAULT_CAPTURE_SCALE,
    contentReadyMode = "immediate",
    blockingTimeoutMs = DEFAULT_BLOCKING_TIMEOUT_MS,
    originalTimegroup,
    timeMs: explicitTimeMs,
    canvasMode,
  } = options;

  // Use explicit time if provided, otherwise fall back to clone's currentTimeMs
  // CRITICAL: Using explicit time ensures temporal visibility checks are accurate
  // NOTE: Must be defined BEFORE any logging that references timeMs
  const timeMs = explicitTimeMs ?? renderClone.currentTimeMs;

  // Use original timegroup dimensions if available, otherwise clone dimensions
  const sourceForDimensions = originalTimegroup ?? renderClone;
  const width = sourceForDimensions.offsetWidth || DEFAULT_WIDTH;
  const height = sourceForDimensions.offsetHeight || DEFAULT_HEIGHT;

  // NOTE: seekForRender() has already:
  // 1. Called frameController.renderFrame() to coordinate FrameRenderable elements
  // 2. Awaited #executeCustomFrameTasks() so frame tasks are complete
  // No need to call frameController.renderFrame() again - it would fire tasks redundantly

  if (contentReadyMode === "blocking") {
    const result = await waitForVideoContent(
      renderClone,
      timeMs,
      blockingTimeoutMs,
    );
    if (!result.ready) {
      throw new ContentNotReadyError(
        timeMs,
        blockingTimeoutMs,
        result.blankVideos,
      );
    }
  }

  // Determine effective canvas mode:
  // 1. If explicitly specified, use that
  // 2. If "native" is requested but not available, fall back to foreignObject
  // 3. If not specified, default to foreignObject for compatibility
  const effectiveCanvasMode = (() => {
    if (!canvasMode) return "foreignObject";
    if (canvasMode === "native" && !isNativeCanvasApiAvailable()) {
      logger.debug(
        "[captureFromClone] Native canvas mode requested but not available, falling back to foreignObject",
      );
      return "foreignObject";
    }
    return canvasMode;
  })();

  // Create RenderContext for caching during this capture operation (only needed for foreignObject)
  const renderContext = new RenderContext();

  try {
    if (effectiveCanvasMode === "native") {
      // NATIVE PATH: Use drawElementImage API (~1.76x faster than foreignObject)
      // No DOM serialization, no canvas-to-dataURL encoding, no image loading
      // Direct browser-native rendering

      const t0 = performance.now();
      const canvas = await renderToImageNative(renderClone, width, height, {
        skipDprScaling: true, // Use 1x DPR for video export (4x fewer pixels!)
      });
      const renderTime = performance.now() - t0;

      logger.debug(
        `[captureFromClone] native render=${renderTime.toFixed(0)}ms (canvasScale=${scale})`,
      );

      return canvas;
    } else {
      // FOREIGNOBJECT PATH: Serialize DOM → SVG → Image → Canvas
      // More compatible but slower than native path

      // NOTE: seekForRender() has already ensured rendering is complete, including:
      // - Lit updates propagated
      // - All LitElement descendants updated
      // - frameController.renderFrame() called for FrameRenderable elements
      // - Layout stabilization complete
      // No additional RAF wait needed - can serialize immediately

      const t0 = performance.now();
      const dataUri = await captureTimelineToDataUri(
        renderClone,
        width,
        height,
        {
          renderContext,
          canvasScale: scale,
          timeMs,
        },
      );
      const serializeTime = performance.now() - t0;

      const t1 = performance.now();
      const image = await loadImageFromDataUri(dataUri);
      const loadTime = performance.now() - t1;

      logger.debug(
        `[captureFromClone] foreignObject serialize=${serializeTime.toFixed(0)}ms, load=${loadTime.toFixed(0)}ms (canvasScale=${scale})`,
      );

      // Return image directly - no copy needed!
      return image;
    }
  } finally {
    // Ensure RenderContext is disposed even if an error occurs
    renderContext.dispose();
  }
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
): Promise<CanvasImageSource> {
  const {
    timeMs,
    scale = DEFAULT_CAPTURE_SCALE,
    // skipRestore is deprecated with Clone-timeline (Prime is never seeked)
    contentReadyMode = "immediate",
    blockingTimeoutMs = DEFAULT_BLOCKING_TIMEOUT_MS,
    canvasMode,
    skipClone = false,
  } = options;

  if (skipClone) {
    // DIRECT RENDERING: Skip clone creation for headless server rendering
    // Seek prime timeline directly and capture from it
    // WARNING: This modifies the prime timeline! Only use in headless contexts.

    const seekStart = performance.now();
    await timegroup.seekForRender(timeMs);
    const seekMs = performance.now() - seekStart;

    const renderStart = performance.now();
    // Use timegroup's actual container (parentElement or document.body as fallback)
    const container = (timegroup.parentElement || document.body) as HTMLElement;
    const result = await captureFromClone(timegroup, container, {
      scale,
      contentReadyMode,
      blockingTimeoutMs,
      originalTimegroup: undefined, // No original since we're rendering the prime
      canvasMode,
      timeMs, // Pass explicit time since we're not using a clone
    });
    const renderMs = performance.now() - renderStart;

    // Store timing (no clone time since we skipped it)
    if (typeof result === "object" && result !== null) {
      (result as any).__perfTiming = { cloneMs: 0, seekMs, renderMs };
    }

    return result;
  }

  // CLONE-TIMELINE: Create a short-lived render clone for this capture
  // Prime-timeline is NEVER seeked - clone is fully independent
  const cloneStart = performance.now();
  const {
    clone: renderClone,
    container: renderContainer,
    cleanup: cleanupRenderClone,
  } = await timegroup.createRenderClone();
  const cloneMs = performance.now() - cloneStart;

  try {
    // Seek the clone to target time (Prime stays at user position)
    // Use seekForRender which bypasses duration clamping - render clones may have
    // zero duration initially until media durations are computed, but we still
    // want to seek to the requested time for capture purposes.
    const seekStart = performance.now();
    await renderClone.seekForRender(timeMs);
    const seekMs = performance.now() - seekStart;

    // Use the shared capture helper
    const renderStart = performance.now();
    const result = await captureFromClone(renderClone, renderContainer, {
      scale,
      contentReadyMode,
      blockingTimeoutMs,
      originalTimegroup: timegroup,
      canvasMode,
    });
    const renderMs = performance.now() - renderStart;

    // Store timing on the result for access by callers (if they need it)
    // Note: CanvasImageSource doesn't support custom properties, but we can attach them anyway
    if (typeof result === "object" && result !== null) {
      (result as any).__perfTiming = { cloneMs, seekMs, renderMs };
    }

    return result;
  } finally {
    // Clean up the render clone
    cleanupRenderClone();
  }
}

/**
 * Generate thumbnails using an existing render clone and mutable queue.
 * The queue can be modified while generation is in progress.
 *
 * @param renderClone - Pre-created render clone to use
 * @param renderContainer - Container for the render clone
 * @param queue - Mutable queue that provides timestamps
 * @param options - Capture options (scale, contentReadyMode, etc.)
 * @yields Objects with { timeMs, canvas } for each captured thumbnail
 *
 * @example
 * ```ts
 * const queue = new MutableTimestampQueue();
 * queue.reset([0, 100, 200]);
 *
 * for await (const { timeMs, canvas } of generateThumbnailsFromClone(clone, container, queue)) {
 *   cache.set(timeMs, canvas);
 *   // Queue can be modified here while generator continues
 * }
 * ```
 */
export async function* generateThumbnailsFromClone(
  renderClone: EFTimegroup,
  renderContainer: HTMLElement,
  queue: ThumbnailQueue,
  options: GenerateThumbnailsOptions = {},
): AsyncGenerator<GeneratedThumbnail> {
  const {
    scale = DEFAULT_CAPTURE_SCALE,
    contentReadyMode = "immediate",
    blockingTimeoutMs = DEFAULT_BLOCKING_TIMEOUT_MS,
    signal,
  } = options;

  while (true) {
    // Check if aborted before starting work
    if (signal?.aborted) {
      break;
    }

    const timeMs = queue.shift();
    if (timeMs === undefined) {
      // Queue is empty, generator exits
      break;
    }

    // Seek the clone to the target time
    await renderClone.seekForRender(timeMs);

    // Check if aborted after seek (before expensive capture)
    if (signal?.aborted) {
      break;
    }

    // Capture from the seeked clone, passing explicit timeMs
    const canvas = await captureFromClone(renderClone, renderContainer, {
      scale,
      contentReadyMode,
      blockingTimeoutMs,
      timeMs, // CRITICAL: Pass explicit time for accurate temporal visibility
    });

    // Yield the result with explicit timestamp association
    yield { timeMs, canvas };
  }
}

/**
 * Generate thumbnails for multiple timestamps efficiently using a single render clone.
 * This avoids the overhead of creating/destroying a clone for each thumbnail.
 *
 * @param timegroup - The timegroup to capture
 * @param timestamps - Array of timestamps to capture (in milliseconds)
 * @param options - Capture options (scale, contentReadyMode, etc.)
 * @param signal - Optional AbortSignal to cancel generation
 * @yields Objects with { timeMs, canvas } for each captured thumbnail
 *
 * @example
 * ```ts
 * for await (const { timeMs, canvas } of generateThumbnails(tg, [0, 100, 200])) {
 *   console.log(`Got thumbnail for ${timeMs}ms`);
 *   thumbnailCache.set(timeMs, canvas);
 * }
 * ```
 */
export async function* generateThumbnails(
  timegroup: EFTimegroup,
  timestamps: number[],
  options: GenerateThumbnailsOptions = {},
  signal?: AbortSignal,
): AsyncGenerator<GeneratedThumbnail> {
  const {
    scale = DEFAULT_CAPTURE_SCALE,
    contentReadyMode = "immediate",
    blockingTimeoutMs = DEFAULT_BLOCKING_TIMEOUT_MS,
  } = options;

  // Create a single render clone for all thumbnails
  const {
    clone: renderClone,
    container: renderContainer,
    cleanup: cleanupRenderClone,
  } = await timegroup.createRenderClone();

  try {
    for (const timeMs of timestamps) {
      // Check for abort before each capture
      signal?.throwIfAborted();

      // Seek the clone to the target time
      await renderClone.seekForRender(timeMs);

      // Capture from the seeked clone
      const canvas = await captureFromClone(renderClone, renderContainer, {
        scale,
        contentReadyMode,
        blockingTimeoutMs,
        originalTimegroup: timegroup,
      });

      // Yield the result with explicit timestamp association
      yield { timeMs, canvas };
    }
  } finally {
    // Always clean up the render clone
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
function toAbsoluteTime(
  timegroup: EFTimegroup,
  relativeTimeMs: number,
): number {
  return relativeTimeMs + (timegroup.startTimeMs ?? 0);
}

/**
 * Renders a timegroup preview to a canvas using SVG foreignObject.
 *
 * Captures the prime timeline's current visual state including DOM changes
 * from frame tasks (SVG paths, canvas content, text updates, etc.).
 *
 * Optimized with:
 * - Passive clone structure rebuilt each frame from prime's current state
 * - Temporal bucketing for time-based culling
 * - RenderContext for canvas pixel caching across frames
 * - Resolution scaling for performance (renders at lower resolution, CSS upscales)
 *
 * @param timegroup - The source timegroup to preview (prime timeline)
 * @param scaleOrOptions - Scale factor (default 1) or options object
 * @returns Object with canvas and refresh function
 */
export function renderTimegroupToCanvas(
  timegroup: EFTimegroup,
  scaleOrOptions: number | CanvasPreviewOptions = DEFAULT_PREVIEW_SCALE,
): CanvasPreviewResult {
  // Normalize options
  const options: CanvasPreviewOptions =
    typeof scaleOrOptions === "number"
      ? { scale: scaleOrOptions }
      : scaleOrOptions;

  const scale = options.scale ?? DEFAULT_PREVIEW_SCALE;
  // These are mutable to support dynamic resolution changes
  let currentResolutionScale =
    options.resolutionScale ?? DEFAULT_RESOLUTION_SCALE;

  const width = timegroup.offsetWidth || DEFAULT_WIDTH;
  const height = timegroup.offsetHeight || DEFAULT_HEIGHT;
  const dpr =
    (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;

  // Calculate effective render dimensions (internal resolution) - mutable
  let renderWidth = Math.floor(width * currentResolutionScale);
  let renderHeight = Math.floor(height * currentResolutionScale);

  // Create canvas with proper DPR handling
  const canvas = createDprCanvas({
    renderWidth,
    renderHeight,
    scale,
    fullWidth: width,
    fullHeight: height,
    dpr,
  });

  // Return canvas directly - no wrapper needed
  const wrapperContainer = canvas;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2d context");
  }

  // Track render state
  let rendering = false;
  let lastTimeMs = -1;
  let disposed = false;

  // Invalidate lastTimeMs when composition structure or attributes change so
  // refresh() re-renders even when currentTimeMs hasn't changed (e.g. paused edits).
  const compositionObserver = new MutationObserver(() => {
    if (!rendering) lastTimeMs = -1;
  });
  compositionObserver.observe(timegroup, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  // Create RenderContext for caching across refresh calls (foreignObject only)
  const renderContext = new RenderContext();

  // Create FrameController for coordinating element rendering
  // Cached for the lifetime of this preview instance
  const frameController = new FrameController(timegroup);

  // Log resolution scale on first render for debugging
  let hasLoggedScale = false;

  // Pending resolution change - applied at start of next refresh to avoid blanking
  let pendingResolutionScale: number | null = null;

  // Use the user's render mode preference. Native requires the timegroup to be
  // inside a <canvas layoutsubtree> for drawElementImage to work.
  const useNative =
    getRenderMode() === "native" && isNativeCanvasApiAvailable();
  let captureCanvas: HTMLCanvasElement | null = null;
  let captureCtx: HtmlInCanvasContext | null = null;
  let originalParent: ParentNode | null = null;
  let originalNextSibling: ChildNode | null = null;
  let savedClipPath = "";
  let savedPointerEvents = "";

  if (useNative) {
    captureCanvas = document.createElement("canvas");
    captureCanvas.setAttribute("layoutsubtree", "");
    (captureCanvas as HtmlInCanvasElement).layoutSubtree = true;
    captureCanvas.width = renderWidth;
    captureCanvas.height = renderHeight;
    captureCanvas.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;opacity:0;pointer-events:none;z-index:-9999;`;
    originalParent = timegroup.parentNode;
    originalNextSibling = timegroup.nextSibling;
    savedClipPath = timegroup.style.clipPath;
    savedPointerEvents = timegroup.style.pointerEvents;
    timegroup.style.clipPath = "";
    timegroup.style.pointerEvents = "";
    captureCanvas.appendChild(timegroup);
    document.body.appendChild(captureCanvas);
    captureCtx = captureCanvas.getContext("2d") as HtmlInCanvasContext;
    void captureCanvas.offsetHeight;
    void timegroup.offsetHeight;
  }

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

    if (captureCanvas) {
      captureCanvas.width = renderWidth;
      captureCanvas.height = renderHeight;
    }
  };

  /**
   * Dynamically change resolution scale without rebuilding clone structure.
   * The actual change is deferred until next refresh() to avoid blanking -
   * old content stays visible until new content is ready.
   */
  const setResolutionScale = (newScale: number): void => {
    // Clamp to valid range
    newScale = Math.max(0.1, Math.min(1, newScale));

    if (newScale === currentResolutionScale && pendingResolutionScale === null)
      return;

    // Queue the change - will be applied at start of next refresh
    pendingResolutionScale = newScale;

    // Force re-render on next refresh by invalidating lastTimeMs
    lastTimeMs = -1;
  };

  const getResolutionScale = (): number =>
    pendingResolutionScale ?? currentResolutionScale;

  // Rolling timing stats for per-phase profiling
  let frameCount = 0;
  let totalFrameControllerMs = 0;
  let totalCaptureMs = 0;
  let totalCopyMs = 0;
  let totalFrameMs = 0;

  const refresh = async (): Promise<void> => {
    if (disposed) return;

    const sourceTimeMs = timegroup.currentTimeMs ?? 0;
    const userTimeMs = timegroup.userTimeMs ?? 0;

    if (Math.abs(sourceTimeMs - userTimeMs) > TIME_EPSILON_MS) return;
    if (userTimeMs === lastTimeMs) return;
    if (rendering) return;

    lastTimeMs = userTimeMs;
    rendering = true;

    applyPendingResolutionChange();

    if (!hasLoggedScale) {
      hasLoggedScale = true;
      const mode = useNative ? "native" : "foreignObject";
      logger.debug(
        `[renderTimegroupToCanvas] Resolution scale: ${currentResolutionScale} (${width}x${height} → ${renderWidth}x${renderHeight}), canvas buffer: ${canvas.width}x${canvas.height}, CSS size: ${canvas.style.width}x${canvas.style.height}, renderMode: ${mode}`,
      );
    }

    try {
      const tFrame = performance.now();

      const tFC0 = performance.now();
      await frameController.renderFrame(userTimeMs, {
        waitForLitUpdate: false,
        onAnimationsUpdate: (root) => {
          updateAnimations(root as AnimatableElement);
        },
      });
      const fcMs = performance.now() - tFC0;

      const tCapture0 = performance.now();

      if (useNative && captureCanvas && captureCtx) {
        if (captureCanvas.width !== width || captureCanvas.height !== height) {
          captureCtx.save();
          captureCtx.scale(
            captureCanvas.width / width,
            captureCanvas.height / height,
          );
          captureCtx.drawElementImage(timegroup, 0, 0);
          captureCtx.restore();
        } else {
          captureCtx.drawElementImage(timegroup, 0, 0);
        }
        const captureMs = performance.now() - tCapture0;

        const tCopy0 = performance.now();
        const targetWidth = Math.floor(renderWidth * scale * dpr);
        const targetHeight = Math.floor(renderHeight * scale * dpr);
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(captureCanvas, 0, 0, canvas.width, canvas.height);
        const copyMs = performance.now() - tCopy0;

        const frameMs = performance.now() - tFrame;
        frameCount++;
        totalFrameControllerMs += fcMs;
        totalCaptureMs += captureMs;
        totalCopyMs += copyMs;
        totalFrameMs += frameMs;

        defaultProfiler.incrementRenderCount();
        if (defaultProfiler.shouldLogByFrameCount(60)) {
          frameCount = 0;
          totalFrameControllerMs = 0;
          totalCaptureMs = 0;
          totalCopyMs = 0;
          totalFrameMs = 0;
        }
      } else {
        const absoluteTimeMs = toAbsoluteTime(timegroup, userTimeMs);

        const dataUri = await captureTimelineToDataUri(
          timegroup,
          width,
          height,
          {
            renderContext,
            canvasScale: currentResolutionScale,
            timeMs: absoluteTimeMs,
          },
        );
        const captureMs = performance.now() - tCapture0;

        const tCopy0 = performance.now();
        const image = await loadImageFromDataUri(dataUri);
        const copyMs = performance.now() - tCopy0;

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
        ctx.drawImage(image, 0, 0, renderWidth, renderHeight);
        ctx.restore();

        const frameMs = performance.now() - tFrame;
        frameCount++;
        totalFrameControllerMs += fcMs;
        totalCaptureMs += captureMs;
        totalCopyMs += copyMs;
        totalFrameMs += frameMs;

        defaultProfiler.incrementRenderCount();
        if (defaultProfiler.shouldLogByFrameCount(60)) {
          frameCount = 0;
          totalFrameControllerMs = 0;
          totalCaptureMs = 0;
          totalCopyMs = 0;
          totalFrameMs = 0;
        }
      }
    } catch (e) {
      logger.error("Canvas preview render failed:", e);
    } finally {
      rendering = false;
    }
  };

  /**
   * Dispose the preview and release resources.
   */
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    compositionObserver.disconnect();
    frameController.abort();
    renderContext.dispose();

    // Restore timegroup to original DOM position if native mode moved it
    if (useNative && originalParent) {
      timegroup.style.clipPath = savedClipPath;
      timegroup.style.pointerEvents = savedPointerEvents;
      if (originalNextSibling) {
        originalParent.insertBefore(timegroup, originalNextSibling);
      } else {
        originalParent.appendChild(timegroup);
      }
      captureCanvas?.remove();
    }
  };

  // Do initial render
  refresh();

  return {
    container: wrapperContainer,
    canvas,
    refresh,
    setResolutionScale,
    getResolutionScale,
    dispose,
  };
}
