import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import type { EFVideo } from "./EFVideo.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import { TargetController } from "./TargetController.ts";
import { sessionThumbnailCache, getCacheKey } from "./SessionThumbnailCache.js";
import { findRootTemporal } from "./findRootTemporal.js";

/** Type guard to check if element is EFVideo */
function isEFVideo(element: Element | null): element is EFVideo {
  return element?.tagName.toLowerCase() === "ef-video";
}

/** Type guard to check if element is EFTimegroup */
function isEFTimegroup(element: Element | null): element is EFTimegroup {
  return element?.tagName.toLowerCase() === "ef-timegroup";
}

/**
 * Get identifiers for cache key generation.
 * Returns rootId (for cache isolation) and elementId (for element-specific caching).
 */
function getCacheIdentifiers(element: EFVideo | EFTimegroup): { rootId: string; elementId: string } {
  // Get root timegroup for cache isolation between projects
  const rootTemporal = findRootTemporal(element);
  const rootTimegroup = rootTemporal && isEFTimegroup(rootTemporal) ? rootTemporal : null;
  const rootId = rootTimegroup?.id || "default";

  // Element identifier
  const elementId = isEFVideo(element)
    ? element.src || element.id || "video"
    : element.id || "timegroup";

  return { rootId, elementId };
}

/** Default gap between thumbnails */
const DEFAULT_GAP = 4;

/** Default aspect ratio if unknown */
const DEFAULT_ASPECT_RATIO = 16 / 9;

/** Max canvas width for thumbnail captures */
const MAX_CAPTURE_WIDTH = 480;

/** Thumbnails to capture per batch */
const BATCH_SIZE = 10;

interface ThumbnailSlot {
  timeMs: number;
  x: number; // Absolute position (not scroll-adjusted)
  width: number;
  imageData?: ImageData;
  status: "cached" | "loading" | "pending";
}

@customElement("ef-thumbnail-strip")
export class EFThumbnailStrip extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        background: #1a1a2e;
        overflow: hidden;
        width: 100%;
        height: 100%;
      }
      canvas {
        display: block;
        /* Absolute positioning - we manually position at visible region */
        position: absolute;
        top: 0;
        /* Left and width set programmatically based on visible portion */
        height: 100%;
        image-rendering: auto;
      }
    `,
  ];

  canvasRef = createRef<HTMLCanvasElement>();

  // ─────────────────────────────────────────────────────────────────────────
  // Public Properties
  // ─────────────────────────────────────────────────────────────────────────

  @property({ type: String })
  target = "";

  @property({ type: Number, attribute: "thumbnail-width" })
  thumbnailWidth = 0; // 0 = auto (calculate from height using aspect ratio)

  @property({ type: Number, attribute: "gap" })
  gap = DEFAULT_GAP;

  @property({ type: Number, attribute: "start-time-ms" })
  startTimeMs?: number;

  @property({ type: Number, attribute: "end-time-ms" })
  endTimeMs?: number;

  @property({
    type: Boolean,
    attribute: "use-intrinsic-duration",
    reflect: true,
    converter: {
      fromAttribute: (value: string | null) => value === "true",
      toAttribute: (value: boolean) => (value ? "true" : null),
    },
  })
  useIntrinsicDuration = false;

  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs = 0.1;

  // ─────────────────────────────────────────────────────────────────────────
  // Internal State
  // ─────────────────────────────────────────────────────────────────────────

  /** Target element controller */
  // @ts-expect-error controller used for side effects
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used for side effects
  private _targetController: TargetController = new TargetController(this as any);

  private _targetElement: EFVideo | EFTimegroup | null = null;

  get targetElement(): EFVideo | EFTimegroup | null {
    return this._targetElement;
  }

  set targetElement(value: EFVideo | EFTimegroup | null) {
    const oldValue = this._targetElement;
    this._targetElement = value;

    // Reset ready state when target changes
    if (value !== oldValue) {
      this._hasLoadedThumbnails = false;
      this._lastLayoutParams = null;
    }

    this.requestUpdate("targetElement", oldValue);
  }

  /** Host element dimensions */
  private _width = 0;
  private _height = 0;

  /** Current thumbnail slots */
  private _thumbnailSlots: ThumbnailSlot[] = [];

  /** Capture in progress flag */
  private _captureInProgress = false;

  /** Resize observer */
  private _resizeObserver?: ResizeObserver;

  /** Render request tracking */
  private _renderRequested = false;

  /** Track if any thumbnails have been loaded (for ready event) */
  private _hasLoadedThumbnails = false;

  /** Track if we need to retry loading after current capture completes */
  private _needsRetryLoad = false;

  /** Animation frame for loading indicator pulse */
  private _animationFrame?: number;
  
  /** Track layout parameters to avoid unnecessary slot recreation */
  private _lastLayoutParams: {
    width: number;
    height: number;
    startTimeMs: number;
    endTimeMs: number;
    thumbWidth: number;
    gap: number;
  } | null = null;

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback();

    // Set up resize observer
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.borderBoxSize?.[0];
        this._width = box?.inlineSize ?? entry.contentRect.width;
        this._height = box?.blockSize ?? entry.contentRect.height;
        this._scheduleRender();
      }
    });
    this._resizeObserver.observe(this);

    // Schedule initial render
    this.updateComplete.then(() => {
      this._scheduleRender();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);

    // Re-render on property changes
    if (
      changedProperties.has("thumbnailWidth") ||
      changedProperties.has("gap") ||
      changedProperties.has("startTimeMs") ||
      changedProperties.has("endTimeMs") ||
      changedProperties.has("useIntrinsicDuration") ||
      changedProperties.has("pixelsPerMs") ||
      changedProperties.has("targetElement")
    ) {
      this._scheduleRender();
    }
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Rendering Pipeline
  // ─────────────────────────────────────────────────────────────────────────

  private _scheduleRender(): void {
    if (this._renderRequested) return;
    this._renderRequested = true;

    requestAnimationFrame(() => {
      this._renderRequested = false;
      
      this._calculateLayout();
      this._checkCache();
      this._drawCanvas();
      
      // Load any pending thumbnails
      this._loadThumbnails();

      // Check if we should dispatch ready event
      // (e.g., all thumbnails were already cached, or nothing to load)
      this._checkAndDispatchReady();
    });
  }

  /**
   * Check if thumbnails are ready and dispatch event if not already done.
   */
  private _checkAndDispatchReady(): void {
    if (this._hasLoadedThumbnails) return;

    // Consider ready if we have layout and either:
    // 1. Have some cached thumbnails, or
    // 2. Have no pending thumbnails (nothing to load)
    const hasLayout = this._thumbnailSlots.length > 0;
    const hasAnyCached = this._thumbnailSlots.some((s) => s.status === "cached");
    const hasPending = this._thumbnailSlots.some((s) => s.status === "pending");

    if (hasLayout && (hasAnyCached || !hasPending)) {
      this._hasLoadedThumbnails = true;
      this.dispatchEvent(new CustomEvent("thumbnails-ready", { bubbles: true }));
    }
  }

  /**
   * Calculate thumbnail layout based on current dimensions and time range.
   * Only recreates slots if layout parameters have actually changed.
   */
  private _calculateLayout(): void {
    if (this._width <= 0 || this._height <= 0 || !this._targetElement) {
      this._thumbnailSlots = [];
      this._lastLayoutParams = null;
      return;
    }

    const timeRange = this._getTimeRange();
    if (timeRange.endMs <= timeRange.startMs) {
      this._thumbnailSlots = [];
      this._lastLayoutParams = null;
      return;
    }

    // Calculate thumbnail dimensions
    const thumbWidth = this._getEffectiveThumbnailWidth();
    const gap = this.gap;

    // Check if layout parameters have changed
    const currentParams = {
      width: this._width,
      height: this._height,
      startTimeMs: timeRange.startMs,
      endTimeMs: timeRange.endMs,
      thumbWidth,
      gap,
    };

    // If layout parameters haven't changed, preserve existing slots
    if (this._lastLayoutParams &&
        this._lastLayoutParams.width === currentParams.width &&
        this._lastLayoutParams.height === currentParams.height &&
        this._lastLayoutParams.startTimeMs === currentParams.startTimeMs &&
        this._lastLayoutParams.endTimeMs === currentParams.endTimeMs &&
        this._lastLayoutParams.thumbWidth === currentParams.thumbWidth &&
        this._lastLayoutParams.gap === currentParams.gap) {
      // Layout hasn't changed, keep existing slots
      return;
    }

    // Layout changed - recreate slots
    this._lastLayoutParams = currentParams;

    // Calculate how many thumbnails fit
    const count = Math.max(1, Math.floor((this._width + gap) / (thumbWidth + gap)));

    // Calculate pitch (spacing) for edge-to-edge fill
    const pitch = count > 1 ? (this._width - thumbWidth) / (count - 1) : 0;

    // Generate slots with timestamps
    const slots: ThumbnailSlot[] = [];
    const duration = timeRange.endMs - timeRange.startMs;

    for (let i = 0; i < count; i++) {
      const timeMs = count === 1
        ? (timeRange.startMs + timeRange.endMs) / 2
        : timeRange.startMs + (i * duration) / (count - 1);

      slots.push({
        timeMs,
        x: Math.round(i * pitch),
        width: thumbWidth,
        status: "pending",
      });
    }

    this._thumbnailSlots = slots;
  }

  /**
   * Get effective time range for thumbnails.
   */
  private _getTimeRange(): { startMs: number; endMs: number } {
    const target = this._targetElement;
    if (!target) return { startMs: 0, endMs: 0 };

    if (isEFVideo(target)) {
      if (this.useIntrinsicDuration) {
        // Intrinsic mode: 0 to full source duration
        return {
          startMs: this.startTimeMs ?? 0,
          endMs: this.endTimeMs ?? target.intrinsicDurationMs ?? 0,
        };
      }
      // Trimmed mode: source coordinates
      const sourceStart = target.sourceStartMs ?? 0;
      const trimmedDuration = target.durationMs ?? 0;
      return {
        startMs: this.startTimeMs !== undefined ? sourceStart + this.startTimeMs : sourceStart,
        endMs: this.endTimeMs !== undefined ? sourceStart + this.endTimeMs : sourceStart + trimmedDuration,
      };
    }

    // Timegroup
    return {
      startMs: this.startTimeMs ?? 0,
      endMs: (this.endTimeMs && this.endTimeMs > 0) ? this.endTimeMs : target.durationMs ?? 0,
    };
  }

  /**
   * Calculate effective thumbnail width (auto or specified).
   */
  private _getEffectiveThumbnailWidth(): number {
    if (this.thumbnailWidth > 0) return this.thumbnailWidth;

    const target = this._targetElement;
    let aspectRatio = DEFAULT_ASPECT_RATIO;

    if (isEFVideo(target)) {
      const w = (target as any).videoWidth || 1920;
      const h = (target as any).videoHeight || 1080;
      aspectRatio = w / h;
    } else if (isEFTimegroup(target)) {
      const w = target.offsetWidth || 1920;
      const h = target.offsetHeight || 1080;
      aspectRatio = w / h;
    }

    return Math.round(this._height * aspectRatio);
  }

  /**
   * Check cache for existing thumbnails.
   * Uses nearest-neighbor lookup for missing thumbnails to avoid flickering.
   */
  private _checkCache(): void {
    if (!this._targetElement) return;

    const { rootId, elementId } = getCacheIdentifiers(this._targetElement);

    for (const slot of this._thumbnailSlots) {
      const key = getCacheKey(rootId, elementId, slot.timeMs);
      if (sessionThumbnailCache.has(key)) {
        // Exact match - use it
        slot.imageData = sessionThumbnailCache.get(key);
        slot.status = "cached";
      } else {
        // No exact match - try to find nearest neighbor as placeholder
        const nearestImage = sessionThumbnailCache.getNearest(rootId, elementId, slot.timeMs);
        if (nearestImage) {
          // Use nearest as placeholder, but mark as pending so we still load the exact one
          slot.imageData = nearestImage;
          slot.status = "pending";
        } else {
          // No thumbnails at all for this element yet
          slot.imageData = undefined;
          slot.status = "pending";
        }
      }
    }
  }

  /**
   * Draw the canvas with current thumbnail state.
   * Renders all thumbnails to a full-width canvas.
   */
  private _drawCanvas(): void {
    const canvas = this.canvasRef.value;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = this._width;
    const height = this._height;

    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with DPR
    const targetWidth = Math.ceil(width * dpr);
    const targetHeight = Math.ceil(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    
    // Position canvas to fill the strip
    canvas.style.left = "0";
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Reset transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear with background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);

    // Check if we have any loading slots for animation
    const hasLoadingSlots = this._thumbnailSlots.some(
      (s) => s.status === "pending" || s.status === "loading"
    );

    // Pulse animation for loading indicators (0.0 to 1.0 and back)
    const time = Date.now() / 1000;
    const pulse = (Math.sin(time * 3) + 1) / 2; // 3 Hz pulse

    // Draw each thumbnail
    for (const slot of this._thumbnailSlots) {
      if (slot.imageData) {
        this._drawThumbnailImage(ctx, slot.imageData, slot.x, slot.width, height);
        
        // If this is a nearest-neighbor placeholder (pending/loading with imageData), show loading overlay
        if (slot.status === "pending" || slot.status === "loading") {
          // Semi-transparent overlay to indicate this is approximate
          ctx.fillStyle = "rgba(26, 26, 46, 0.15)";
          ctx.fillRect(slot.x, 0, slot.width, height);
          
          // Animated loading bar at top with pulse
          const barOpacity = 0.4 + pulse * 0.3; // 0.4 to 0.7
          ctx.fillStyle = `rgba(59, 130, 246, ${barOpacity})`;
          ctx.fillRect(slot.x, 0, slot.width, 3);
        }
      } else {
        // No thumbnail at all - show placeholder
        ctx.fillStyle = slot.status === "loading" ? "#2d2d50" : "#2d2d44";
        ctx.fillRect(slot.x, 0, slot.width, height);

        // Loading indicator for empty slots with pulse
        if (slot.status === "loading") {
          const barOpacity = 0.3 + pulse * 0.3; // 0.3 to 0.6
          ctx.fillStyle = `rgba(59, 130, 246, ${barOpacity})`;
          ctx.fillRect(slot.x, 0, slot.width, 3);
        }
      }
    }

    // Schedule next animation frame if we have loading slots
    if (hasLoadingSlots) {
      if (!this._animationFrame) {
        this._animationFrame = requestAnimationFrame(() => {
          this._animationFrame = undefined;
          this._drawCanvas();
        });
      }
    }
  }

  /**
   * Draw a thumbnail image with cover mode scaling.
   */
  private _drawThumbnailImage(
    ctx: CanvasRenderingContext2D,
    imageData: ImageData,
    x: number,
    width: number,
    height: number,
  ): void {
    // Create temp canvas for ImageData
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;
    tempCtx.putImageData(imageData, 0, 0);

    // Cover mode: crop to fill destination
    const srcAspect = imageData.width / imageData.height;
    const dstAspect = width / height;

    let srcX = 0, srcY = 0, srcW = imageData.width, srcH = imageData.height;

    if (srcAspect > dstAspect) {
      srcW = imageData.height * dstAspect;
      srcX = (imageData.width - srcW) / 2;
    } else {
      srcH = imageData.width / dstAspect;
      srcY = (imageData.height - srcH) / 2;
    }

    ctx.drawImage(tempCanvas, srcX, srcY, srcW, srcH, x, 0, width, height);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Thumbnail Loading
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load all pending thumbnails.
   */
  private async _loadThumbnails(): Promise<void> {
    if (!this._targetElement) return;

    // If capture is in progress, schedule a retry
    if (this._captureInProgress) {
      this._needsRetryLoad = true;
      return;
    }

    // Find all pending slots
    const pending = this._thumbnailSlots.filter((slot) => slot.status === "pending");

    if (pending.length === 0) return;

    this._captureInProgress = true;
    this._needsRetryLoad = false;

    // Mark as loading
    for (const slot of pending) {
      slot.status = "loading";
    }
    this._drawCanvas();

    try {
      if (isEFTimegroup(this._targetElement)) {
        await this._captureTimegroupThumbnails(pending);
      } else if (isEFVideo(this._targetElement)) {
        await this._captureVideoThumbnails(pending);
      }
    } catch (error) {
      console.warn("Failed to capture thumbnails:", error);
      // Reset failed slots
      for (const slot of pending) {
        if (slot.status === "loading") {
          slot.status = "pending";
        }
      }
    } finally {
      this._captureInProgress = false;
      this._drawCanvas();

      // Dispatch ready event when thumbnails are first loaded
      const hasAnyLoaded = this._thumbnailSlots.some((s) => s.status === "cached");
      if (hasAnyLoaded && !this._hasLoadedThumbnails) {
        this._hasLoadedThumbnails = true;
        this.dispatchEvent(new CustomEvent("thumbnails-ready", { bubbles: true }));
      }

      // If we need to retry (new pending slots appeared during capture), do it now
      if (this._needsRetryLoad) {
        this._needsRetryLoad = false;
        // Schedule on next frame to avoid blocking
        requestAnimationFrame(() => this._loadThumbnails());
      }
    }
  }

  /**
   * Capture thumbnails from a timegroup target.
   */
  private async _captureTimegroupThumbnails(slots: ThumbnailSlot[]): Promise<void> {
    const target = this._targetElement as EFTimegroup;
    const { rootId, elementId } = getCacheIdentifiers(target);

    // Calculate capture scale
    const timegroupWidth = target.offsetWidth || 1920;
    const timegroupHeight = target.offsetHeight || 1080;
    const scale = Math.min(1, this._height / timegroupHeight, MAX_CAPTURE_WIDTH / timegroupWidth);

    // Process in batches
    for (let i = 0; i < slots.length; i += BATCH_SIZE) {
      const batch = slots.slice(i, i + BATCH_SIZE);
      const timestamps = batch.map((s) => s.timeMs);

      try {
        const canvases = await target.captureBatch(timestamps, {
          scale,
          contentReadyMode: "immediate",
        });

        for (let j = 0; j < batch.length; j++) {
          const slot = batch[j]!;
          const canvas = canvases[j];

          if (canvas) {
            const imageData = this._canvasToImageData(canvas);
            if (imageData) {
              const key = getCacheKey(rootId, elementId, slot.timeMs);
              sessionThumbnailCache.set(key, imageData, slot.timeMs, elementId);
              slot.imageData = imageData;
              slot.status = "cached";
            } else {
              // Failed to convert to ImageData - reset to pending
              slot.status = "pending";
            }
          } else {
            // No canvas returned - reset to pending
            slot.status = "pending";
          }
        }

        // Redraw after each batch for progressive feedback
        this._drawCanvas();

        // Yield to main thread between batches
        if (i + BATCH_SIZE < slots.length) {
          await new Promise((r) => requestAnimationFrame(r));
        }
      } catch (error) {
        console.warn("Batch capture failed:", error);
        // Reset all slots in this batch to pending
        for (const slot of batch) {
          if (slot.status === "loading") {
            slot.status = "pending";
          }
        }
      }
    }
  }

  /**
   * Capture thumbnails from a video target using MediaEngine.
   */
  private async _captureVideoThumbnails(slots: ThumbnailSlot[]): Promise<void> {
    const target = this._targetElement as EFVideo;
    const { rootId, elementId } = getCacheIdentifiers(target);

    // Wait for media engine
    if (target.mediaEngineTask) {
      await target.mediaEngineTask.taskComplete;
    }

    const mediaEngine = target.mediaEngineTask?.value;
    if (!mediaEngine) {
      // No media engine - reset all slots to pending
      for (const slot of slots) {
        slot.status = "pending";
      }
      return;
    }

    // Check for video rendition
    const videoRendition = mediaEngine.getVideoRendition();
    const scrubRendition = mediaEngine.getScrubVideoRendition();
    if (!videoRendition && !scrubRendition) {
      // No video rendition - reset all slots to pending
      for (const slot of slots) {
        slot.status = "pending";
      }
      return;
    }

    const timestamps = slots.map((s) => s.timeMs);

    // Create an abort controller for this thumbnail extraction
    // ThumbnailExtractor requires a signal to properly handle cleanup
    const abortController = new AbortController();

    try {
      const results = await mediaEngine.extractThumbnails(timestamps, abortController.signal);

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]!;
        const result = results[i];

        if (result?.thumbnail) {
          const imageData = this._canvasToImageData(result.thumbnail);
          if (imageData) {
            const key = getCacheKey(rootId, elementId, slot.timeMs);
            sessionThumbnailCache.set(key, imageData, slot.timeMs, elementId);
            slot.imageData = imageData;
            slot.status = "cached";
          } else {
            // Failed to convert to ImageData - reset to pending
            slot.status = "pending";
          }
        } else {
          // No thumbnail returned - reset to pending
          slot.status = "pending";
        }
      }
    } catch (error) {
      // Abort on error to clean up any in-flight requests
      abortController.abort();
      console.warn("Video thumbnail extraction failed:", error);
      // Reset all slots to pending
      for (const slot of slots) {
        if (slot.status === "loading") {
          slot.status = "pending";
        }
      }
    }
  }

  /**
   * Convert CanvasImageSource to ImageData.
   * Handles Canvas, Image, ImageBitmap, OffscreenCanvas, etc.
   */
  private _canvasToImageData(source: CanvasImageSource | HTMLCanvasElement | OffscreenCanvas): ImageData | null {
    try {
      // If it's already a canvas (regular or offscreen), extract directly
      if (source instanceof HTMLCanvasElement || source instanceof OffscreenCanvas) {
        const ctx = source.getContext("2d", { willReadFrequently: true }) as
          | CanvasRenderingContext2D
          | OffscreenCanvasRenderingContext2D
          | null;
        if (!ctx) return null;
        return ctx.getImageData(0, 0, source.width, source.height);
      }
      
      // Otherwise (Image, ImageBitmap, VideoFrame, etc.), draw to temp canvas first
      const canvas = document.createElement('canvas');
      // Get dimensions - different source types have different properties
      const width = 'width' in source ? source.width : (source as unknown as HTMLImageElement).naturalWidth;
      const height = 'height' in source ? source.height : (source as unknown as HTMLImageElement).naturalHeight;
      canvas.width = typeof width === 'number' ? width : parseInt(String(width));
      canvas.height = typeof height === 'number' ? height : parseInt(String(height));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error("Failed to extract ImageData from source:", e);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns a promise that resolves when thumbnails are ready.
   * Resolves immediately if thumbnails are already loaded.
   */
  whenReady(): Promise<void> {
    if (this._hasLoadedThumbnails) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.addEventListener("thumbnails-ready", () => resolve(), { once: true });
    });
  }

  /**
   * Check if thumbnails have been loaded.
   */
  get isReady(): boolean {
    return this._hasLoadedThumbnails;
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  render() {
    return html`<canvas ${ref(this.canvasRef)}></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-thumbnail-strip": EFThumbnailStrip;
  }
}

// Re-export cache for backwards compatibility and debugging
export { sessionThumbnailCache as thumbnailImageCache } from "./SessionThumbnailCache.js";
