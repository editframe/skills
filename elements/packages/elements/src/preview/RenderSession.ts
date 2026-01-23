/**
 * RenderSession: Core frame capture abstraction for timegroup rendering.
 * 
 * This module provides a unified rendering pipeline used by both:
 * - Thumbnail generation (captureBatch)
 * - Video export (renderTimegroupToVideo)
 * 
 * Design Principles (from how-to-write-code rules):
 * 1. Enumerate the Core Concept: "capture frames from a timegroup"
 * 2. Separate Semantics from Mechanism: Frame capture vs encoding
 * 3. One Direction of Truth: Single rendering path, not duplicated code
 */

import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFVideo } from "../elements/EFVideo.js";
import {
  renderToImageNative,
  renderToImage,
  type ContentReadyMode,
} from "./renderTimegroupToCanvas.js";
import {
  buildCloneStructure,
  collectDocumentStyles,
  syncStyles,
  traverseCloneTree,
  overrideRootCloneStyles,
  type SyncState,
} from "./renderTimegroupPreview.js";
import { isNativeCanvasApiEnabled } from "./previewSettings.js";
import { DEFAULT_WIDTH, DEFAULT_HEIGHT } from "./previewTypes.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating a render session.
 */
export interface RenderSessionOptions {
  /** Content readiness strategy (default: "immediate") */
  contentReadyMode?: ContentReadyMode;
  /** Max wait time for blocking mode (default: 5000ms) */
  blockingTimeoutMs?: number;
  /** Skip DPR scaling for video export (default: false) */
  skipDprScaling?: boolean;
}

/**
 * Options for capturing a single frame.
 */
export interface FrameCaptureOptions {
  /** Time to capture in milliseconds */
  timeMs: number;
  /** Output scale factor (default: 1) */
  scale?: number;
}

/**
 * Result of a frame capture operation.
 */
export interface FrameCaptureResult {
  /** The captured frame as a canvas */
  canvas: HTMLCanvasElement;
  /** Timing breakdown for profiling */
  timings: {
    seekMs: number;
    waitMs: number;
    renderMs: number;
  };
}

/**
 * A render session manages the lifecycle of rendering multiple frames.
 * 
 * Invariants:
 * - One render clone is created and reused across all frames
 * - Prime timeline is NEVER seeked (user can keep editing)
 * - Clone is properly cleaned up when session ends
 */
export interface RenderSession {
  /** Capture a frame at the given time */
  captureFrame(options: FrameCaptureOptions): Promise<FrameCaptureResult>;
  
  /** Get the render clone for direct access (e.g., native canvas reuse) */
  getRenderClone(): EFTimegroup;
  
  /** Get the render container */
  getRenderContainer(): HTMLElement;
  
  /** Get original timegroup dimensions */
  getDimensions(): { width: number; height: number };
  
  /** Clean up the session (MUST be called when done) */
  dispose(): void;
  
  /** Whether this session uses native canvas API */
  readonly isNative: boolean;
}

// ============================================================================
// Internal State for ForeignObject Path
// ============================================================================

interface ForeignObjectState {
  container: HTMLDivElement;
  syncState: SyncState;
  previewContainer: HTMLDivElement;
  collectedStyles: string;
}

// ============================================================================
// Video Content Waiting
// ============================================================================

/**
 * Ensure all video elements have their frame tasks completed for the current time.
 * 
 * This is more reliable than pixel sampling because it actually waits for the
 * video decoding pipeline to complete, rather than checking if the canvas
 * happens to have content (which could be stale from a previous frame).
 * 
 * The issue with pixel-based detection:
 * - If the canvas already has content from a PREVIOUS frame, the check passes
 * - But we haven't actually rendered the NEW frame yet
 * - This causes inconsistent behavior where sometimes thumbnails work and sometimes don't
 */
async function ensureVideoFramesReady(
  renderClone: EFTimegroup,
): Promise<void> {
  const allVideos = renderClone.querySelectorAll("ef-video");
  
  if (allVideos.length === 0) {
    return;
  }
  
  // Wait for all videos to have their frame ready
  // This calls waitForFrameReady() on each video, which:
  // 1. Syncs desiredSeekTimeMs from currentSourceTimeMs
  // 2. Awaits updateComplete
  // 3. Runs the frameTask (which seeks and paints)
  await Promise.all(
    Array.from(allVideos).map(async (video) => {
      // Use duck-typing to check for waitForFrameReady method
      if ('waitForFrameReady' in video && typeof (video as any).waitForFrameReady === 'function') {
        try {
          await (video as any).waitForFrameReady();
        } catch (e) {
          // Ignore AbortErrors - these happen during cleanup
          const isAbortError = e instanceof Error && (
            e.name === 'AbortError' || 
            e.message?.includes('signal is aborted')
          );
          if (!isAbortError) {
            console.warn('[ensureVideoFramesReady] Video frame task failed:', e);
          }
        }
      }
    }),
  );
}

/**
 * Wait for video canvases to have visible content (pixel-based verification).
 * Used as a fallback/verification step after ensureVideoFramesReady.
 */
async function waitForVideoContent(
  renderClone: EFTimegroup,
  timeoutMs: number,
): Promise<{ ready: boolean; waitMs: number }> {
  const startTime = performance.now();
  const allVideos = renderClone.querySelectorAll("ef-video");
  
  if (allVideos.length === 0) {
    return { ready: true, waitMs: 0 };
  }
  
  while (performance.now() - startTime < timeoutMs) {
    let allReady = true;
    
    for (const video of allVideos) {
      const shadowCanvas = video.shadowRoot?.querySelector("canvas");
      if (!shadowCanvas || shadowCanvas.width === 0 || shadowCanvas.height === 0) {
        allReady = false;
        break;
      }
      
      const ctx = shadowCanvas.getContext("2d");
      if (!ctx) {
        allReady = false;
        break;
      }
      
      // Sample middle strip (catches video content even if edges are black)
      const stripY = Math.floor(shadowCanvas.height / 2);
      const imageData = ctx.getImageData(0, stripY, shadowCanvas.width, 4);
      const data = imageData.data;
      
      // Check if ANY pixel has non-zero alpha (not transparent/uninitialized)
      let hasContent = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) {
          hasContent = true;
          break;
        }
      }
      
      if (!hasContent) {
        allReady = false;
        break;
      }
    }
    
    if (allReady) {
      return { ready: true, waitMs: performance.now() - startTime };
    }
    
    await new Promise(r => requestAnimationFrame(r));
  }
  
  return { ready: false, waitMs: performance.now() - startTime };
}

// ============================================================================
// Session Implementation
// ============================================================================

class RenderSessionImpl implements RenderSession {
  readonly isNative: boolean;
  
  #renderClone: EFTimegroup;
  #renderContainer: HTMLElement;
  #cleanup: () => void;
  #originalTimegroup: EFTimegroup;
  #options: Required<RenderSessionOptions>;
  #dimensions: { width: number; height: number };
  
  // ForeignObject path state (lazily initialized)
  #foState: ForeignObjectState | null = null;
  
  // Native path state
  #captureCanvas: HTMLCanvasElement | null = null;
  
  constructor(
    originalTimegroup: EFTimegroup,
    renderClone: EFTimegroup,
    renderContainer: HTMLElement,
    cleanup: () => void,
    options: Required<RenderSessionOptions>,
  ) {
    this.#originalTimegroup = originalTimegroup;
    this.#renderClone = renderClone;
    this.#renderContainer = renderContainer;
    this.#cleanup = cleanup;
    this.#options = options;
    
    this.isNative = isNativeCanvasApiEnabled();
    
    // Cache dimensions from original timegroup
    this.#dimensions = {
      width: originalTimegroup.offsetWidth || DEFAULT_WIDTH,
      height: originalTimegroup.offsetHeight || DEFAULT_HEIGHT,
    };
    
    // Set up capture infrastructure based on path
    if (this.isNative) {
      this.#setupNativePath();
    }
  }
  
  #setupNativePath(): void {
    const { width, height } = this.#dimensions;
    
    // Create capture canvas for native path
    this.#captureCanvas = document.createElement("canvas");
    this.#captureCanvas.width = width;
    this.#captureCanvas.height = height;
    
    // Enable layoutsubtree BEFORE adding content
    this.#captureCanvas.setAttribute("layoutsubtree", "");
    (this.#captureCanvas as any).layoutSubtree = true;
    
    // Style for offscreen rendering
    this.#captureCanvas.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${width}px;
      height: ${height}px;
      opacity: 0;
      pointer-events: none;
      z-index: -9999;
    `;
    
    // Position render container
    this.#renderContainer.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${width}px;
      height: ${height}px;
      pointer-events: none;
      overflow: hidden;
      opacity: 0;
      transform: translateX(-9999px);
    `;
    
    // Add container to canvas, canvas to body
    this.#captureCanvas.appendChild(this.#renderContainer);
    document.body.appendChild(this.#captureCanvas);
    
    // Remove playback controller (re-attached during DOM operations)
    if (this.#renderClone.playbackController) {
      this.#renderClone.playbackController.remove();
      this.#renderClone.playbackController = undefined;
    }
  }
  
  #buildForeignObjectState(timeMs: number): ForeignObjectState {
    const { width, height } = this.#dimensions;
    
    // Build clone structure from render clone (not original!)
    const { container, syncState } = buildCloneStructure(this.#renderClone, timeMs);
    
    // Create preview container
    const previewContainer = document.createElement("div");
    previewContainer.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      position: relative;
      overflow: hidden;
      background: ${getComputedStyle(this.#originalTimegroup).background || "#000"};
    `;
    
    // Collect and add styles
    const collectedStyles = collectDocumentStyles();
    const styleEl = document.createElement("style");
    styleEl.textContent = collectedStyles;
    previewContainer.appendChild(styleEl);
    previewContainer.appendChild(container);
    
    // Reset clip-path on all clones
    traverseCloneTree(syncState, (node) => {
      node.clone.style.clipPath = "none";
    });
    
    // Override root styles for visibility
    overrideRootCloneStyles(syncState, true);
    
    return { container, syncState, previewContainer, collectedStyles };
  }
  
  async captureFrame(options: FrameCaptureOptions): Promise<FrameCaptureResult> {
    const { timeMs, scale = 1 } = options;
    const { width, height } = this.#dimensions;
    const { contentReadyMode, blockingTimeoutMs, skipDprScaling } = this.#options;
    
    const timings = { seekMs: 0, waitMs: 0, renderMs: 0 };
    
    // 1. Seek render clone to target time
    // This already calls waitForFrameReady on visible elements, but visibility
    // checks can fail on first render before animations initialize
    const seekStart = performance.now();
    await this.#renderClone.seekForRender(timeMs);
    timings.seekMs = performance.now() - seekStart;
    
    // 2. Ensure video frames are ready
    // This is more robust than the visibility-based check in seekForRender
    // because it directly waits for ALL videos, not just "visible" ones
    // This fixes the timing issue where thumbnails work on second pass but not first
    const waitStart = performance.now();
    await ensureVideoFramesReady(this.#renderClone);
    
    // 3. Optional: pixel-based verification in blocking mode
    if (contentReadyMode === "blocking") {
      await waitForVideoContent(this.#renderClone, blockingTimeoutMs);
    }
    timings.waitMs = performance.now() - waitStart;
    
    // 3. Render frame
    const renderStart = performance.now();
    let image: HTMLCanvasElement | HTMLImageElement;
    
    if (this.isNative) {
      image = await this.#captureNative(width, height, skipDprScaling);
    } else {
      image = await this.#captureForeignObject(timeMs, width, height);
    }
    timings.renderMs = performance.now() - renderStart;
    
    // 4. Scale to output canvas if needed
    const outputWidth = Math.floor(width * scale);
    const outputHeight = Math.floor(height * scale);
    
    // Ensure even dimensions for video encoding
    const videoWidth = outputWidth % 2 === 0 ? outputWidth : outputWidth - 1;
    const videoHeight = outputHeight % 2 === 0 ? outputHeight : outputHeight - 1;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas 2d context");
    }
    
    ctx.drawImage(
      image,
      0, 0, image.width, image.height,
      0, 0, videoWidth, videoHeight,
    );
    
    return { canvas, timings };
  }
  
  async #captureNative(
    width: number,
    height: number,
    skipDprScaling: boolean,
  ): Promise<HTMLCanvasElement> {
    if (!this.#captureCanvas) {
      throw new Error("Native path not initialized");
    }
    
    // Make visible for capture
    this.#captureCanvas.style.opacity = "1";
    this.#renderContainer.style.transform = "none";
    this.#renderContainer.style.opacity = "1";
    
    // Capture
    const image = await renderToImageNative(
      this.#renderContainer,
      width,
      height,
      { skipDprScaling, reuseCanvas: this.#captureCanvas },
    );
    
    // Hide again
    this.#captureCanvas.style.opacity = "0";
    this.#renderContainer.style.opacity = "0";
    this.#renderContainer.style.transform = "translateX(-9999px)";
    
    return image;
  }
  
  async #captureForeignObject(
    timeMs: number,
    width: number,
    height: number,
  ): Promise<HTMLImageElement> {
    // Lazily build FO state on first capture
    if (!this.#foState) {
      this.#foState = this.#buildForeignObjectState(timeMs);
    } else {
      // Sync styles for subsequent frames
      syncStyles(this.#foState.syncState, timeMs);
      overrideRootCloneStyles(this.#foState.syncState, true);
    }
    
    // Render using foreignObject serialization
    const image = await renderToImage(
      this.#foState.previewContainer,
      width,
      height,
    ) as HTMLImageElement;
    
    return image;
  }
  
  getRenderClone(): EFTimegroup {
    return this.#renderClone;
  }
  
  getRenderContainer(): HTMLElement {
    return this.#renderContainer;
  }
  
  getDimensions(): { width: number; height: number } {
    return { ...this.#dimensions };
  }
  
  dispose(): void {
    // Remove capture canvas from DOM
    if (this.#captureCanvas?.parentNode) {
      this.#captureCanvas.parentNode.removeChild(this.#captureCanvas);
    }
    
    // Call provided cleanup (removes render clone)
    this.#cleanup();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a render session for capturing frames from a timegroup.
 * 
 * Usage:
 * ```typescript
 * const session = await createRenderSession(timegroup, { contentReadyMode: "blocking" });
 * try {
 *   for (const timeMs of timestamps) {
 *     const { canvas, timings } = await session.captureFrame({ timeMs });
 *     // Use canvas...
 *   }
 * } finally {
 *   session.dispose(); // CRITICAL: Always dispose!
 * }
 * ```
 * 
 * @param timegroup - The source timegroup to render
 * @param options - Session options
 * @returns A render session that must be disposed when done
 */
export async function createRenderSession(
  timegroup: EFTimegroup,
  options: RenderSessionOptions = {},
): Promise<RenderSession> {
  const resolvedOptions: Required<RenderSessionOptions> = {
    contentReadyMode: options.contentReadyMode ?? "immediate",
    blockingTimeoutMs: options.blockingTimeoutMs ?? 5000,
    skipDprScaling: options.skipDprScaling ?? false,
  };
  
  // Create render clone
  const { clone, container, cleanup } = await timegroup.createRenderClone();
  
  return new RenderSessionImpl(
    timegroup,
    clone,
    container,
    cleanup,
    resolvedOptions,
  );
}

/**
 * Pre-fetch scrub segments for all videos in a render session.
 * Call this before starting a batch capture for optimal seek performance.
 * 
 * @param session - The render session
 * @param timestamps - All timestamps that will be captured
 */
export async function prefetchScrubSegments(
  session: RenderSession,
  timestamps: number[],
): Promise<void> {
  const renderClone = session.getRenderClone();
  const videoElements = renderClone.querySelectorAll("ef-video");
  
  if (videoElements.length === 0) return;
  
  await Promise.all(
    Array.from(videoElements).map((video) =>
      (video as EFVideo).prefetchScrubSegments(timestamps),
    ),
  );
}
