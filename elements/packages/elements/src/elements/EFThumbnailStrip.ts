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
const MAX_CAPTURE_WIDTH = 240; // Reduced from 480 for faster rendering

/** Padding in pixels for virtual rendering (render extra thumbnails beyond viewport) */
const VIRTUAL_PADDING_PX = 500;

interface ThumbnailSlot {
  timeMs: number;
  x: number; // Absolute position (not scroll-adjusted)
  width: number;
  image?: CanvasImageSource; // Canvas, Image, ImageBitmap, etc - directly drawable
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
    }

    this.requestUpdate("targetElement", oldValue);
  }

  /** Host element dimensions */
  private _width = 0;
  private _height = 0;

  /** Scroll container and state */
  private _scrollContainer: HTMLElement | null = null;
  private _scrollLeft = 0;
  private _viewportWidth = 0;

  /** Current thumbnail slots (all possible slots for entire strip) */
  private _thumbnailSlots: ThumbnailSlot[] = [];

  /** Capture in progress flag */
  private _captureInProgress = false;

  /** Abort controller for current capture */
  private _captureAbortController?: AbortController;

  /** Resize observer */
  private _resizeObserver?: ResizeObserver;

  /** Render request tracking */
  private _renderRequested = false;

  /** Track if any thumbnails have been loaded (for ready event) */
  private _hasLoadedThumbnails = false;

  /** Track if we need to retry loading after current capture completes */
  private _needsRetryLoad = false;

  /** Animation frame for continuous rendering */
  private _animationFrame?: number;
  private _isAnimating = false;

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

    // Schedule initial render and find scroll container
    this.updateComplete.then(() => {
      this._findScrollContainer();
      this._scheduleRender();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._stopAnimation();
    this._detachScrollListener();
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
  // Scroll Container Detection
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Find the scrollable container by walking up the DOM tree.
   * Crosses shadow DOM boundaries.
   */
  private _findScrollContainer(): void {
    let node: Node | null = this.parentNode;
    
    while (node) {
      if (node instanceof HTMLElement) {
        const style = getComputedStyle(node);
        if (style.overflowX === "auto" || style.overflowX === "scroll") {
          this._scrollContainer = node;
          this._updateScrollState();
          this._attachScrollListener();
          console.log('[THUMB_STRIP] Found scroll container', JSON.stringify({
            tagName: node.tagName,
            clientWidth: node.clientWidth,
            scrollWidth: node.scrollWidth
          }));
          return;
        }
      }
      
      // Move to parent, crossing shadow DOM boundaries
      if (node.parentNode) {
        node = node.parentNode;
      } else if (node instanceof ShadowRoot) {
        node = node.host;
      } else {
        break;
      }
    }
    
    console.warn('[THUMB_STRIP] No scroll container found');
  }

  /**
   * Update cached scroll state.
   */
  private _updateScrollState(): void {
    if (!this._scrollContainer) return;
    this._scrollLeft = this._scrollContainer.scrollLeft;
    this._viewportWidth = this._scrollContainer.clientWidth;
  }

  /**
   * Attach scroll listener to container.
   */
  private _attachScrollListener(): void {
    if (!this._scrollContainer) return;
    this._scrollContainer.addEventListener('scroll', this._onScroll, { passive: true });
  }

  /**
   * Detach scroll listener.
   */
  private _detachScrollListener(): void {
    if (this._scrollContainer) {
      this._scrollContainer.removeEventListener('scroll', this._onScroll);
    }
  }

  /**
   * Handle scroll events - update immediately for lockstep rendering.
   */
  private _onScroll = (): void => {
    this._updateScrollState();
    this._drawCanvas();
    this._loadVisibleThumbnails();
  };

  /**
   * Get this strip's absolute position in the timeline (pixels from timeline origin).
   * For root timegroup: 0
   * For video: startTimeMs × pixelsPerMs
   */
  private _getStripTimelinePosition(): number {
    const target = this._targetElement;
    if (!target) return 0;
    
    if (isEFVideo(target)) {
      const startTimeMs = target.startTimeMs ?? 0;
      return startTimeMs * this.pixelsPerMs;
    }
    
    // Root timegroup starts at 0
    return 0;
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
      
      // Load visible pending thumbnails
      this._loadVisibleThumbnails();

      // Check if we should dispatch ready event
      // (e.g., all thumbnails were already cached, or nothing to load)
      this._checkAndDispatchReady();
      
      // Start continuous animation if we have loading slots
      this._startAnimationIfNeeded();
    });
  }

  /**
   * Start continuous animation loop if there are loading/pending slots.
   */
  private _startAnimationIfNeeded(): void {
    const hasLoadingSlots = this._thumbnailSlots.some(
      (s) => s.status === "pending" || s.status === "loading"
    );

    if (hasLoadingSlots && !this._isAnimating) {
      this._isAnimating = true;
      this._animate();
    } else if (!hasLoadingSlots && this._isAnimating) {
      this._stopAnimation();
    }
  }

  /**
   * Continuous animation loop for loading indicators.
   */
  private _animate = (): void => {
    if (!this._isAnimating) return;

    this._drawCanvas();

    // Check if we still have loading slots
    const hasLoadingSlots = this._thumbnailSlots.some(
      (s) => s.status === "pending" || s.status === "loading"
    );

    if (hasLoadingSlots) {
      this._animationFrame = requestAnimationFrame(this._animate);
    } else {
      this._stopAnimation();
    }
  };

  /**
   * Stop animation loop.
   */
  private _stopAnimation(): void {
    this._isAnimating = false;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = undefined;
    }
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
   */
  private _calculateLayout(): void {
    if (this._width <= 0 || this._height <= 0 || !this._targetElement) {
      this._thumbnailSlots = [];
      return;
    }

    const timeRange = this._getTimeRange();
    if (timeRange.endMs <= timeRange.startMs) {
      this._thumbnailSlots = [];
      return;
    }

    // Calculate thumbnail dimensions
    const thumbWidth = this._getEffectiveThumbnailWidth();
    const gap = this.gap;

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
        slot.image = sessionThumbnailCache.get(key);
        slot.status = "cached";
      } else {
        // No exact match - try to find nearest neighbor as placeholder
        const nearestImage = sessionThumbnailCache.getNearest(rootId, elementId, slot.timeMs);
        if (nearestImage) {
          // Use nearest as placeholder, but mark as pending so we still load the exact one
          slot.image = nearestImage;
          slot.status = "pending";
        } else {
          // No thumbnails at all for this element yet
          slot.image = undefined;
          slot.status = "pending";
        }
      }
    }
  }

  /**
   * Draw the canvas with current thumbnail state.
   * Uses virtual rendering - only draws visible portion.
   */
  private _drawCanvas(): void {
    const canvas = this.canvasRef.value;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const stripWidth = this._width;
    const height = this._height;

    if (stripWidth <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Get strip's position in timeline
    const stripStartPx = this._getStripTimelinePosition();
    const stripEndPx = stripStartPx + stripWidth;

    // Get scroll state
    const scrollLeft = this._scrollLeft;
    const viewportWidth = this._viewportWidth || stripWidth; // Fallback to full width if no scroll container

    // Calculate visible region in timeline coordinates (with padding)
    const visibleLeftPx = scrollLeft - VIRTUAL_PADDING_PX;
    const visibleRightPx = scrollLeft + viewportWidth + VIRTUAL_PADDING_PX;

    // Check if strip is visible at all
    if (stripEndPx < visibleLeftPx || stripStartPx > visibleRightPx) {
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";

    // Calculate intersection: what part of THIS STRIP is visible (in strip-local coordinates)
    const visibleStartInStrip = Math.max(0, visibleLeftPx - stripStartPx);
    const visibleEndInStrip = Math.min(stripWidth, visibleRightPx - stripStartPx);
    const visibleWidth = visibleEndInStrip - visibleStartInStrip;

    if (visibleWidth <= 0) {
      canvas.style.display = "none";
      return;
    }

    // Set canvas size to visible region (not full strip width)
    const targetWidth = Math.ceil(visibleWidth * dpr);
    const targetHeight = Math.ceil(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    // Position canvas at the visible portion within the strip
    canvas.style.left = `${visibleStartInStrip}px`;
    canvas.style.width = `${visibleWidth}px`;
    canvas.style.height = `${height}px`;

    // Reset transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear with background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, visibleWidth, height);

    // Pulse animation for loading indicators (0.0 to 1.0 and back)
    const time = Date.now() / 1000;
    const pulse = (Math.sin(time * 3) + 1) / 2; // 3 Hz pulse

    // Draw only visible thumbnails
    for (const slot of this._thumbnailSlots) {
      const slotRight = slot.x + slot.width;

      // Skip if slot is outside visible region
      if (slotRight < visibleStartInStrip || slot.x > visibleEndInStrip) continue;

      // Draw position relative to canvas (canvas starts at visibleStartInStrip)
      const drawX = slot.x - visibleStartInStrip;

      if (slot.image) {
        this._drawThumbnail(ctx, slot.image, drawX, slot.width, height);
        
        // If this is a nearest-neighbor placeholder (pending/loading with image), show loading overlay
        if (slot.status === "pending" || slot.status === "loading") {
          // Semi-transparent overlay to indicate this is approximate
          ctx.fillStyle = "rgba(26, 26, 46, 0.25)";
          ctx.fillRect(drawX, 0, slot.width, height);
          
          // Animated loading bar at top with pulse
          const barOpacity = 0.5 + pulse * 0.5; // 0.5 to 1.0
          const barHeight = 4;
          ctx.fillStyle = `rgba(59, 130, 246, ${barOpacity})`;
          ctx.fillRect(drawX, 0, slot.width, barHeight);
          
          // Glow effect
          ctx.fillStyle = `rgba(59, 130, 246, ${barOpacity * 0.3})`;
          ctx.fillRect(drawX, barHeight, slot.width, 2);
        }
      } else {
        // No thumbnail at all - show placeholder
        ctx.fillStyle = slot.status === "loading" ? "#2d2d50" : "#2d2d44";
        ctx.fillRect(drawX, 0, slot.width, height);

        // Loading indicator for empty slots with pulse
        if (slot.status === "loading") {
          const barOpacity = 0.4 + pulse * 0.6; // 0.4 to 1.0
          const barHeight = 4;
          ctx.fillStyle = `rgba(59, 130, 246, ${barOpacity})`;
          ctx.fillRect(drawX, 0, slot.width, barHeight);
          
          // Glow effect
          ctx.fillStyle = `rgba(59, 130, 246, ${barOpacity * 0.3})`;
          ctx.fillRect(drawX, barHeight, slot.width, 2);
        }
      }
    }
  }

  /**
   * Draw a thumbnail with cover mode scaling.
   * Draws directly from CanvasImageSource (Canvas, Image, ImageBitmap, etc).
   */
  private _drawThumbnail(
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource,
    x: number,
    width: number,
    height: number,
  ): void {
    // Get source dimensions
    const srcWidth = (image as any).width || (image as HTMLImageElement).naturalWidth || 0;
    const srcHeight = (image as any).height || (image as HTMLImageElement).naturalHeight || 0;
    
    if (srcWidth === 0 || srcHeight === 0) return;

    // Cover mode: crop to fill destination
    const srcAspect = srcWidth / srcHeight;
    const dstAspect = width / height;

    let srcX = 0, srcY = 0, srcW = srcWidth, srcH = srcHeight;

    if (srcAspect > dstAspect) {
      srcW = srcHeight * dstAspect;
      srcX = (srcWidth - srcW) / 2;
    } else {
      srcH = srcWidth / dstAspect;
      srcY = (srcHeight - srcH) / 2;
    }

    ctx.drawImage(image, srcX, srcY, srcW, srcH, x, 0, width, height);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Thumbnail Loading
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load only visible pending thumbnails.
   * Cancels any in-progress capture and starts a new one.
   */
  private async _loadVisibleThumbnails(): Promise<void> {
    if (!this._targetElement) return;

    // Calculate visible region
    const stripStartPx = this._getStripTimelinePosition();
    const stripWidth = this._width;
    const scrollLeft = this._scrollLeft;
    const viewportWidth = this._viewportWidth || stripWidth;

    const visibleLeftPx = scrollLeft - VIRTUAL_PADDING_PX;
    const visibleRightPx = scrollLeft + viewportWidth + VIRTUAL_PADDING_PX;

    const visibleStartInStrip = Math.max(0, visibleLeftPx - stripStartPx);
    const visibleEndInStrip = Math.min(stripWidth, visibleRightPx - stripStartPx);

    // Find pending slots in visible range
    const pending = this._thumbnailSlots.filter((slot) => {
      if (slot.status !== "pending") return false;
      const slotRight = slot.x + slot.width;
      return slotRight >= visibleStartInStrip && slot.x <= visibleEndInStrip;
    });

    if (pending.length === 0) return;

    await this._loadThumbnails(pending);
  }

  /**
   * Load specific thumbnail slots.
   * Cancels any in-progress capture and starts a new one.
   */
  private async _loadThumbnails(slotsToLoad: ThumbnailSlot[]): Promise<void> {
    if (!this._targetElement) return;

    // If capture is in progress, abort it and start fresh
    if (this._captureInProgress && this._captureAbortController) {
      console.log('[THUMB_STRIP] Aborting previous capture');
      this._captureAbortController.abort();
      this._captureAbortController = undefined;
    }

    if (slotsToLoad.length === 0) return;

    this._captureInProgress = true;
    this._needsRetryLoad = false;

    // Create new abort controller for this capture
    this._captureAbortController = new AbortController();
    const signal = this._captureAbortController.signal;

    // Mark as loading
    for (const slot of slotsToLoad) {
      slot.status = "loading";
    }
    this._drawCanvas();

    try {
      if (isEFTimegroup(this._targetElement)) {
        await this._captureTimegroupThumbnailsIterative(slotsToLoad, signal);
      } else if (isEFVideo(this._targetElement)) {
        await this._captureVideoThumbnails(slotsToLoad);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[THUMB_STRIP] Capture aborted');
      } else {
        console.warn('[THUMB_STRIP] Capture failed:', error);
      }
      // Reset failed slots
      for (const slot of slotsToLoad) {
        if (slot.status === "loading") {
          slot.status = "pending";
        }
      }
    } finally {
      this._captureInProgress = false;
      this._captureAbortController = undefined;
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
        requestAnimationFrame(() => this._loadVisibleThumbnails());
      }
    }
  }

  /**
   * Capture thumbnails from a timegroup target using async iteration.
   * Yields thumbnails progressively and can be aborted mid-capture.
   */
  private async _captureTimegroupThumbnailsIterative(slots: ThumbnailSlot[], signal: AbortSignal): Promise<void> {
    const target = this._targetElement as EFTimegroup;
    const { rootId, elementId } = getCacheIdentifiers(target);

    // Calculate capture scale
    const timegroupWidth = target.offsetWidth || 1920;
    const timegroupHeight = target.offsetHeight || 1080;
    const scale = Math.min(1, this._height / timegroupHeight, MAX_CAPTURE_WIDTH / timegroupWidth);

    const startTime = performance.now();
    
    console.log('[THUMB_STRIP] Starting iterative capture', JSON.stringify({ 
      slotCount: slots.length,
      scale: scale.toFixed(3),
      targetSize: `${Math.round(timegroupWidth * scale)}x${Math.round(timegroupHeight * scale)}`
    }));

    let successCount = 0;
    let failCount = 0;
    let lastDrawTime = 0;

    try {
      // Capture thumbnails one at a time with abort support
      for (let i = 0; i < slots.length; i++) {
        // Check for abort before each capture
        if (signal.aborted) {
          throw new DOMException('Capture aborted', 'AbortError');
        }

        const slot = slots[i]!;
        
        try {
          // Capture single thumbnail
          const canvases = await target.captureBatch([slot.timeMs], {
            scale,
            contentReadyMode: "immediate",
          });

          const canvas = canvases[0];

          if (canvas) {
            // Store canvas directly - no conversion needed
            const key = getCacheKey(rootId, elementId, slot.timeMs);
            sessionThumbnailCache.set(key, canvas, slot.timeMs, elementId);
            slot.image = canvas;
            slot.status = "cached";
            successCount++;

            // Progressive UI update - redraw every 50ms or every 10 thumbnails
            const now = performance.now();
            if (now - lastDrawTime > 50 || (successCount % 10 === 0)) {
              this._drawCanvas();
              lastDrawTime = now;
            }
          } else {
            // No canvas returned - reset to pending
            slot.status = "pending";
            failCount++;
          }
        } catch (error) {
          // Individual thumbnail failed
          slot.status = "pending";
          failCount++;
        }
      }

      const captureTime = performance.now() - startTime;
      const avgTimePerThumb = captureTime / slots.length;

      console.log('[THUMB_STRIP] Iterative capture complete', JSON.stringify({ 
        totalTimeMs: Math.round(captureTime),
        avgPerThumbMs: avgTimePerThumb.toFixed(1),
        successCount, 
        failCount 
      }));
    } catch (error: any) {
      const captureTime = performance.now() - startTime;
      
      if (error.name === 'AbortError') {
        console.log('[THUMB_STRIP] Capture aborted after', JSON.stringify({
          timeMs: Math.round(captureTime),
          completed: successCount,
          remaining: slots.length - successCount - failCount
        }));
      } else {
        console.error('[THUMB_STRIP] Capture failed', JSON.stringify({ 
          error: String(error),
          timeMs: Math.round(captureTime),
          slotCount: slots.length 
        }));
      }
      
      // Reset remaining loading slots to pending
      for (const slot of slots) {
        if (slot.status === "loading") {
          slot.status = "pending";
        }
      }
      
      throw error;
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
          // Store thumbnail directly - no conversion needed
          const key = getCacheKey(rootId, elementId, slot.timeMs);
          sessionThumbnailCache.set(key, result.thumbnail, slot.timeMs, elementId);
          slot.image = result.thumbnail;
          slot.status = "cached";
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
