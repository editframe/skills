import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { getEffectiveRenderMode } from "./renderers.js";
import { RenderContext } from "./RenderContext.js";
import { FrameController } from "./FrameController.js";
import { serializeTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";

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
import { renderToImageNative, createDprCanvas } from "./rendering/renderToImageNative.js";
import { clearInlineImageCache, getInlineImageCacheSize } from "./rendering/inlineImages.js";

// Re-export rendering types and functions for external use
export type {
  NativeRenderOptions,
} from "./rendering/types.js";
export {
  renderToImageNative,
  loadImageFromDataUri,
};

// ============================================================================
// Constants (module-specific, not shared)
// ============================================================================

/** Number of rows to sample when checking canvas content */
const CANVAS_SAMPLE_STRIP_HEIGHT = 4;

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
 * Options for capturing a timegroup frame.
 */
export interface CaptureOptions {
  /** Time to capture at in milliseconds (required) */
  timeMs: number;
  /** Scale factor (default: 0.25) */
  scale?: number;
  /** Skip restoring original time after capture (for batch operations) */
  skipRestore?: boolean;
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
export function getCacheMetrics(): RenderState['metrics'] {
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

// ============================================================================
// Internal Helpers
// ============================================================================


/**
 * Wait for next animation frame (allows browser to complete layout)
 */
function waitForFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
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
 * @returns Canvas or Image with the rendered frame (both are CanvasImageSource)
 */
export async function captureFromClone(
  renderClone: EFTimegroup,
  renderContainer: HTMLElement,
  options: CaptureFromCloneOptions = {},
): Promise<CanvasImageSource> {
  const {
    scale = DEFAULT_CAPTURE_SCALE,
    contentReadyMode = "immediate",
    blockingTimeoutMs = DEFAULT_BLOCKING_TIMEOUT_MS,
    originalTimegroup,
  } = options;

  // Use original timegroup dimensions if available, otherwise clone dimensions
  const sourceForDimensions = originalTimegroup ?? renderClone;
  const width = sourceForDimensions.offsetWidth || DEFAULT_WIDTH;
  const height = sourceForDimensions.offsetHeight || DEFAULT_HEIGHT;

  // Handle content readiness based on mode
  const timeMs = renderClone.currentTimeMs;
  
  // NOTE: seekForRender() has already:
  // 1. Called frameController.renderFrame() to coordinate FrameRenderable elements
  // 2. Awaited #executeCustomFrameTasks() so frame tasks are complete
  // No need to call frameController.renderFrame() again - it would fire tasks redundantly
  
  if (contentReadyMode === "blocking") {
    const result = await waitForVideoContent(renderClone, timeMs, blockingTimeoutMs);
    if (!result.ready) {
      throw new ContentNotReadyError(timeMs, blockingTimeoutMs, result.blankVideos);
    }
  }

  // Create RenderContext for caching during this capture operation
  const renderContext = new RenderContext();
  
  try {
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
      
      // OPTIMIZATION: Always skip DPR scaling for captures (thumbnails and video export).
      // Retina quality isn't needed for captured frames, and DPR=2 means 4x more pixels.
      // Live preview uses a different code path (renderTimegroupToCanvas) which handles DPR properly.
      // Return canvas directly - no copy needed!
      return await renderToImageNative(renderContainer, width, height, { skipDprScaling: true });
    } else {
      // FOREIGNOBJECT PATH: Direct serialization of the render clone
      // The clone is already at the correct time and isolated from the prime timeline.
      // No need for intermediate passive structure - serialize the clone directly.
      const t0 = performance.now();
      const dataUri = await serializeTimelineToDataUri(renderClone, width, height, {
        renderContext,
        canvasScale: scale,
        timeMs,
      });
      const serializeTime = performance.now() - t0;
      
      const t1 = performance.now();
      const image = await loadImageFromDataUri(dataUri);
      const loadTime = performance.now() - t1;
      
      logger.debug(`[captureFromClone] serialize=${serializeTime.toFixed(0)}ms, load=${loadTime.toFixed(0)}ms (canvasScale=${scale})`);
      
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

/**
 * Result from thumbnail generator
 */
export interface GeneratedThumbnail {
  timeMs: number;
  canvas: CanvasImageSource;
}

/**
 * Options for thumbnail generation (subset of CaptureOptions without timeMs)
 */
export interface GenerateThumbnailsOptions {
  scale?: number;
  contentReadyMode?: ContentReadyMode;
  blockingTimeoutMs?: number;
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
  const { clone: renderClone, container: renderContainer, cleanup: cleanupRenderClone } = 
    await timegroup.createRenderClone();
  
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
function toAbsoluteTime(timegroup: EFTimegroup, relativeTimeMs: number): number {
  return relativeTimeMs + (timegroup.startTimeMs ?? 0);
}

export interface CanvasPreviewResult {
  /**
   * Canvas element to append to your DOM.
   */
  container: HTMLCanvasElement;
  canvas: HTMLCanvasElement;
  /**
   * Call this to re-render the timegroup to canvas at current visual state.
   * Returns a promise that resolves when rendering is complete.
   */
  refresh: () => Promise<void>;
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
  /**
   * Dispose the preview and release resources.
   * Call this when the preview is no longer needed.
   */
  dispose: () => void;
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
  const options: CanvasPreviewOptions = typeof scaleOrOptions === "number"
    ? { scale: scaleOrOptions }
    : scaleOrOptions;
  
  const scale = options.scale ?? DEFAULT_PREVIEW_SCALE;
  // These are mutable to support dynamic resolution changes
  let currentResolutionScale = options.resolutionScale ?? DEFAULT_RESOLUTION_SCALE;
  
  const width = timegroup.offsetWidth || DEFAULT_WIDTH;
  const height = timegroup.offsetHeight || DEFAULT_HEIGHT;
  const dpr = window.devicePixelRatio || 1;
  
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

  // Create RenderContext for caching across refresh calls
  const renderContext = new RenderContext();
  
  // Create FrameController for coordinating element rendering
  // Cached for the lifetime of this preview instance
  const frameController = new FrameController(timegroup);

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
    if (disposed) return;
    
    const sourceTimeMs = timegroup.currentTimeMs ?? 0;
    const userTimeMs = timegroup.userTimeMs ?? 0;
    
    // Skip if seek in progress (source and user time out of sync)
    if (Math.abs(sourceTimeMs - userTimeMs) > TIME_EPSILON_MS) return;
    
    // Skip if time hasn't changed
    if (userTimeMs === lastTimeMs) return;
    
    // Skip if already rendering (don't queue up multiple renders)
    if (rendering) return;
    
    // Mark this time as being rendered and set the rendering flag
    lastTimeMs = userTimeMs;
    rendering = true;
    
    // Apply any pending resolution changes before rendering
    // This updates previewContainer and clone transform, but NOT canvas dimensions yet
    applyPendingResolutionChange();
    
    // Log scale info once per initialization
    if (!hasLoggedScale) {
      hasLoggedScale = true;
      const mode = getEffectiveRenderMode();
      logger.debug(`[renderTimegroupToCanvas] Resolution scale: ${currentResolutionScale} (${width}x${height} → ${renderWidth}x${renderHeight}), canvas buffer: ${canvas.width}x${canvas.height}, CSS size: ${canvas.style.width}x${canvas.style.height}, renderMode: ${mode}`);
    }

    try {
      // Use FrameController to ensure all FrameRenderable elements are ready
      // This coordinates prepare → render phases before we capture their state
      await frameController.renderFrame(userTimeMs);
      
      // DIRECT SERIALIZATION PATH (same as video rendering)
      // Serialize the prime timeline directly without building intermediate passive structure
      const absoluteTimeMs = toAbsoluteTime(timegroup, userTimeMs);
      
      // Pass FULL dimensions to serializeTimelineToDataUri, let canvasScale handle internal scaling
      // This matches video rendering: full dimensions + canvasScale, not pre-scaled dimensions
      const t0 = performance.now();
      const dataUri = await serializeTimelineToDataUri(timegroup, width, height, {
        renderContext,
        canvasScale: currentResolutionScale,
        timeMs: absoluteTimeMs,
      });
      const serializeTime = performance.now() - t0;
      
      // Load image from data URI
      const t1 = performance.now();
      const image = await loadImageFromDataUri(dataUri);
      const loadTime = performance.now() - t1;
      const renderTime = serializeTime + loadTime;

      // The image is already at the scaled resolution (width * resolutionScale x height * resolutionScale)
      // Now scale it to the final canvas size with DPR
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
      // Draw the scaled image to fill the render dimensions
      ctx.drawImage(image, 0, 0, renderWidth, renderHeight);
      ctx.restore();
      
      // Log render time periodically (every 60 frames)
      defaultProfiler.incrementRenderCount();
      if (defaultProfiler.shouldLogByFrameCount(60)) {
        logger.debug(`[renderTimegroupToCanvas] Frame render: ${renderTime.toFixed(1)}ms (serialize=${serializeTime.toFixed(1)}ms, load=${loadTime.toFixed(1)}ms, resolutionScale=${currentResolutionScale}, image=${image.width}x${image.height})`);
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
    frameController.abort();
    renderContext.dispose();
  };

  // Do initial render
  refresh();

  return { container: wrapperContainer, canvas, refresh, setResolutionScale, getResolutionScale, dispose };
}
