import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import type { EFVideo } from "./EFVideo.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import { TargetController } from "./TargetController.ts";
import { timelineStateContext, type TimelineState } from "../gui/timeline/timelineStateContext.js";
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
 * Returns rootId (for cache isolation), elementId (for element-specific caching), and epoch (for content versioning).
 */
function getCacheIdentifiers(element: EFVideo | EFTimegroup): { rootId: string; elementId: string; epoch: number } {
  // Get root timegroup for cache isolation between projects
  const rootTemporal = findRootTemporal(element);
  const rootTimegroup = rootTemporal && isEFTimegroup(rootTemporal) ? rootTemporal : null;
  const rootId = rootTimegroup?.id || "default";
  const epoch = rootTimegroup?.contentEpoch ?? 0;

  // Element identifier
  const elementId = isEFVideo(element)
    ? element.src || element.id || "video"
    : element.id || "timegroup";

  return { rootId, elementId, epoch };
}

/** Padding in pixels for virtual rendering (render extra thumbnails beyond viewport) */
const VIRTUAL_RENDER_PADDING_PX = 200;

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

  /** Timeline state context for viewport info */
  @consume({ context: timelineStateContext, subscribe: true })
  @state()
  private _timelineState?: TimelineState;

  /** Target element controller */
  // @ts-expect-error controller used for side effects
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used for side effects
  private _targetController: TargetController = new TargetController(this as any);

  private _targetElement: EFVideo | EFTimegroup | null = null;

  @state()
  get targetElement(): EFVideo | EFTimegroup | null {
    return this._targetElement;
  }

  set targetElement(value: EFVideo | EFTimegroup | null) {
    const oldValue = this._targetElement;
    this._targetElement = value;

    // Clean up old observer
    this._mutationObserver?.disconnect();

    // Reset ready state when target changes
    if (value !== oldValue) {
      this._hasLoadedThumbnails = false;
      this._lastLoadedEpoch = null;
      this._lastLayoutParams = null;
    }

    if (value && value !== oldValue) {
      this._setupTargetObserver(value);
    }

    this.requestUpdate("targetElement", oldValue);
  }

  /** Host element dimensions */
  private _width = 0;
  private _height = 0;

  /** Scroll container reference */
  private _scrollContainer: HTMLElement | null = null;
  private _currentScrollLeft = 0;
  
  /** 
   * Offset from scroll container's left edge to this element's track.
   * Used for sticky positioning when track doesn't start at x=0 (e.g., labels column).
   */
  private _trackLeftOffset = 0;

  /** Current thumbnail slots */
  private _thumbnailSlots: ThumbnailSlot[] = [];

  /** Capture in progress flag */
  private _captureInProgress = false;

  /** Resize observer */
  private _resizeObserver?: ResizeObserver;

  /** Mutation observer for target element changes */
  private _mutationObserver?: MutationObserver;

  /** Animation frame for scroll updates */
  private _scrollFrame?: number;

  /** Render request tracking */
  private _renderRequested = false;

  /** Track if any thumbnails have been loaded (for ready event) */
  private _hasLoadedThumbnails = false;

  /** Track the last epoch we loaded thumbnails for */
  private _lastLoadedEpoch: number | null = null;
  
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
        // Recalculate track offset in case layout changed
        this._calculateTrackOffset();
        this._scheduleRender();
      }
    });
    this._resizeObserver.observe(this);

    // Find scroll container after element is ready
    this.updateComplete.then(() => {
      this._findScrollContainer();
      this._scheduleRender();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._mutationObserver?.disconnect();
    this._detachScrollListener();

    if (this._scrollFrame) {
      cancelAnimationFrame(this._scrollFrame);
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

    // Handle timeline context scroll changes
    if (changedProperties.has("_timelineState")) {
      this._onContextScroll();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scroll Handling
  // ─────────────────────────────────────────────────────────────────────────

  private _findScrollContainer(): void {
    // Walk up the DOM tree, crossing shadow boundaries
    let node: Node | null = this.parentNode;
    
    while (node) {
      // Check if this node is an element with overflow-x: auto or scroll
      if (node instanceof HTMLElement) {
        const style = getComputedStyle(node);
        if (style.overflowX === "auto" || style.overflowX === "scroll") {
          this._scrollContainer = node;
          this._calculateTrackOffset();
          this._attachScrollListener();
          return;
        }
      }
      
      // Move to parent, crossing shadow DOM boundaries
      if (node.parentNode) {
        node = node.parentNode;
      } else if (node instanceof ShadowRoot) {
        // Cross shadow boundary to the host element
        node = node.host;
      } else {
        break;
      }
    }
  }

  /**
   * Calculate the horizontal offset from scroll container's left edge to this element's track.
   * This accounts for sticky labels or other elements that precede the track area.
   * 
   * We look for our specific timeline elements (ef-timeline-row) and measure their label width.
   */
  private _calculateTrackOffset(): void {
    if (!this._scrollContainer) {
      this._trackLeftOffset = 0;
      return;
    }
    
    // Find ef-timeline-row ancestor and get its label width
    const timelineRow = this._findTimelineRow();
    if (timelineRow) {
      const labelWidth = this._getTimelineRowLabelWidth(timelineRow);
      if (labelWidth > 0) {
        this._trackLeftOffset = labelWidth;
        return;
      }
    }
    
    // No timeline row found - track starts at scroll container's left edge
    this._trackLeftOffset = 0;
  }
  
  /**
   * Find the ef-timeline-row ancestor by walking up through shadow DOM boundaries.
   */
  private _findTimelineRow(): Element | null {
    let node: Node | null = this;
    
    while (node) {
      // Check if this is ef-timeline-row
      if (node instanceof Element && node.tagName.toLowerCase() === 'ef-timeline-row') {
        return node;
      }
      
      // Move up through shadow DOM boundaries
      const parentNode: Node | null = node.parentNode;
      if (parentNode instanceof ShadowRoot) {
        node = parentNode.host;
      } else {
        node = parentNode;
      }
    }
    
    return null;
  }
  
  /**
   * Get the label width from an ef-timeline-row element.
   * Queries the shadow root for .row-label and returns its width.
   */
  private _getTimelineRowLabelWidth(timelineRow: Element): number {
    const shadowRoot = timelineRow.shadowRoot;
    if (!shadowRoot) return 0;
    
    const rowLabel = shadowRoot.querySelector('.row-label');
    if (!rowLabel) return 0;
    
    return rowLabel.getBoundingClientRect().width;
  }
  
  /**
   * Get this strip's absolute position in the timeline (pixels from timeline origin).
   * Uses the target element's startTimeMs to determine position.
   */
  private _getStripTimelinePosition(): number {
    const target = this._targetElement;
    if (!target) return 0;
    
    // For videos, use their startTimeMs to get timeline position
    if (isEFVideo(target)) {
      const startTimeMs = target.startTimeMs ?? 0;
      const pixelsPerMs = this._timelineState?.pixelsPerMs ?? 0.1;
      return startTimeMs * pixelsPerMs;
    }
    
    // For root timegroup, position is 0
    return 0;
  }

  private _attachScrollListener(): void {
    if (!this._scrollContainer) return;
    this._scrollContainer.addEventListener("scroll", this._onScroll, { passive: true });
    this._currentScrollLeft = this._scrollContainer.scrollLeft;
  }

  private _detachScrollListener(): void {
    if (this._scrollContainer) {
      this._scrollContainer.removeEventListener("scroll", this._onScroll);
      this._scrollContainer = null;
    }
  }

  private _onScroll = (): void => {
    if (!this._scrollContainer) return;
    this._currentScrollLeft = this._scrollContainer.scrollLeft;
    this._drawCanvas();

    // Schedule loading of newly visible thumbnails
    if (!this._scrollFrame) {
      this._scrollFrame = requestAnimationFrame(() => {
        this._scrollFrame = undefined;
        this._loadVisibleThumbnails();
      });
    }
  };

  private _onContextScroll(): void {
    if (!this._timelineState || this._scrollContainer) return;
    this._currentScrollLeft = this._timelineState.viewportScrollLeft;
    this._drawCanvas();
  }

  private get _viewportWidth(): number {
    if (this._timelineState?.viewportWidth) {
      return this._timelineState.viewportWidth;
    }
    if (this._scrollContainer) {
      // Subtract track offset to get actual viewport width available for the track
      return this._scrollContainer.clientWidth - this._trackLeftOffset;
    }
    return this._width;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Target Observer
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Watch for async content loading from child media elements.
   * When media finishes loading, increment the epoch to invalidate cached thumbnails.
   */
  private _watchChildContentLoading(target: EFTimegroup): void {
    const mediaElements = target.querySelectorAll('ef-video, ef-image, ef-audio');
    
    for (const el of mediaElements) {
      // Watch EFVideo/EFAudio mediaEngineTask completion
      const mediaEngine = (el as any).mediaEngineTask;
      if (mediaEngine?.taskComplete) {
        mediaEngine.taskComplete.then(() => {
          if (this._targetElement === target) {
            target.incrementContentEpoch();
            // Reset layout params to force slot recreation with new epoch
            this._lastLayoutParams = null;
            this._scheduleRender();
          }
        }).catch(() => {
          // Ignore abort errors
        });
      }
      
      // Watch EFImage fetchImage completion  
      const fetchTask = (el as any).fetchImage;
      if (fetchTask?.taskComplete) {
        fetchTask.taskComplete.then(() => {
          if (this._targetElement === target) {
            target.incrementContentEpoch();
            // Reset layout params to force slot recreation with new epoch
            this._lastLayoutParams = null;
            this._scheduleRender();
          }
        }).catch(() => {
          // Ignore abort errors
        });
      }
    }
  }

  private _setupTargetObserver(target: EFVideo | EFTimegroup): void {
    if (isEFVideo(target)) {
      // Watch video property changes
      this._mutationObserver = new MutationObserver(() => this._scheduleRender());
      this._mutationObserver.observe(target, {
        attributes: true,
        attributeFilter: ["trimstart", "trimend", "sourcein", "sourceout", "src"],
      });

      // Wait for media engine
      target.updateComplete.then(() => {
        if (this._targetElement !== target) return;
        target.mediaEngineTask?.taskComplete.then(() => {
          if (this._targetElement !== target) return;
          this._scheduleRender();
        });
      });
    } else if (isEFTimegroup(target)) {
      // Watch timegroup structure and content changes
      this._mutationObserver = new MutationObserver((mutations) => {
        // Double-check that mutations are actually content-changing
        // (defensive check in case attributeFilter doesn't catch everything)
        const hasContentChange = mutations.some((mutation) => {
          if (mutation.type === "childList") {
            return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
          }
          if (mutation.type === "attributes") {
            const attrName = mutation.attributeName;
            // Skip time/playback attributes that might slip through
            if (attrName === "currenttime" || attrName === "current-time" || 
                attrName === "playing" || attrName === "loop") {
              return false;
            }
            // Only count visual content attributes
            return attrName === "src" || attrName === "asset-id" || 
                   attrName === "style" || attrName === "transform";
          }
          return false;
        });
        
        // Only increment epoch and schedule render if content actually changed
        if (hasContentChange) {
          const epochBefore = target.contentEpoch;
          target.incrementContentEpoch();
          const epochAfter = target.contentEpoch;
          
          // Only schedule render if epoch actually changed
          // (defensive check in case incrementContentEpoch was called elsewhere)
          if (epochAfter !== epochBefore) {
            // Reset layout params to force slot recreation with new epoch
            this._lastLayoutParams = null;
            
            // Check if new children were added
            const hasNewChildren = mutations.some(m => m.addedNodes.length > 0);
            
            // Re-watch content loading for new children
            if (hasNewChildren) {
              this._watchChildContentLoading(target);
            }
            
            this._scheduleRender();
          }
        }
      });
      this._mutationObserver.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        // Only watch attributes that affect visual content
        // Exclude time/playback attributes (currenttime, playing, loop) and trim/source attributes
        // (those affect which part of content is shown, not the content itself)
        attributeFilter: ["src", "asset-id", "style", "transform"],
      });

      // Watch for async content loading from child media elements
      this._watchChildContentLoading(target);

      // Watch for duration becoming available
      if (target.durationMs === 0) {
        const checkDuration = () => {
          if (this._targetElement !== target) return;
          if (target.durationMs > 0) {
            this._scheduleRender();
          } else {
            requestAnimationFrame(checkDuration);
          }
        };
        requestAnimationFrame(checkDuration);
      }
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
      
      // Load any pending thumbnails (has its own epoch and state checks)
      this._loadVisibleThumbnails();

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
   */
  private _checkCache(): void {
    if (!this._targetElement) return;

    const { rootId, elementId, epoch } = getCacheIdentifiers(this._targetElement);

    for (const slot of this._thumbnailSlots) {
      const key = getCacheKey(rootId, elementId, slot.timeMs, epoch);
      if (sessionThumbnailCache.has(key)) {
        slot.imageData = sessionThumbnailCache.get(key);
        slot.status = "cached";
      } else {
        // Mark as pending if not in cache
        slot.status = "pending";
      }
    }
  }

  /**
   * Draw the canvas with current thumbnail state.
   * Canvas is absolutely positioned at the visible portion of the strip.
   * Uses virtual rendering - only draws thumbnails in the visible region.
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
    
    // Get scroll and viewport info
    const scrollLeft = this._currentScrollLeft;
    const viewportWidth = this._viewportWidth;
    
    // Get this strip's absolute position in the timeline
    const stripStartPx = this._getStripTimelinePosition();
    const stripEndPx = stripStartPx + stripWidth;
    
    // Calculate visible region in timeline coordinates (with padding)
    const visibleLeftPx = scrollLeft - VIRTUAL_RENDER_PADDING_PX;
    const visibleRightPx = scrollLeft + viewportWidth + VIRTUAL_RENDER_PADDING_PX;
    
    // Check if strip is visible at all
    if (stripEndPx < visibleLeftPx || stripStartPx > visibleRightPx) {
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";
    
    // Calculate the intersection: what part of the strip is visible
    // Coordinates relative to strip's left edge (0 = strip start)
    const visibleStartInStrip = Math.max(0, visibleLeftPx - stripStartPx);
    const visibleEndInStrip = Math.min(stripWidth, visibleRightPx - stripStartPx);
    const visibleWidthPx = visibleEndInStrip - visibleStartInStrip;
    
    if (visibleWidthPx <= 0) {
      canvas.style.display = "none";
      return;
    }

    // Set canvas size with DPR
    const targetWidth = Math.ceil(visibleWidthPx * dpr);
    const targetHeight = Math.ceil(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    
    // Position canvas at the visible portion within the strip
    canvas.style.left = `${visibleStartInStrip}px`;
    canvas.style.width = `${visibleWidthPx}px`;
    canvas.style.height = `${height}px`;

    // Reset transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear with background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, visibleWidthPx, height);

    // Draw each visible thumbnail
    for (const slot of this._thumbnailSlots) {
      const slotRight = slot.x + slot.width;

      // Skip if slot is outside visible strip region
      if (slotRight < visibleStartInStrip || slot.x > visibleEndInStrip) continue;

      // Draw position relative to canvas (canvas starts at visibleStartInStrip)
      const drawX = slot.x - visibleStartInStrip;

      // Skip if outside canvas bounds
      if (drawX + slot.width < 0 || drawX > visibleWidthPx) continue;

      if (slot.imageData) {
        this._drawThumbnailImage(ctx, slot.imageData, drawX, slot.width, height);
      } else {
        // Placeholder
        ctx.fillStyle = slot.status === "loading" ? "#2d2d50" : "#2d2d44";
        ctx.fillRect(drawX, 0, slot.width, height);

        // Loading indicator
        if (slot.status === "loading") {
          ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
          ctx.fillRect(drawX, 0, slot.width, 2);
        }
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
   * Load thumbnails that are visible in the current viewport.
   * Skips loading if the epoch hasn't changed since last load.
   */
  private async _loadVisibleThumbnails(): Promise<void> {
    if (this._captureInProgress || !this._targetElement) return;

    // For timegroups, check if epoch has changed since last load
    // If not, don't reload - the cache should already have the thumbnails
    if (isEFTimegroup(this._targetElement)) {
      const currentEpoch = this._targetElement.contentEpoch;
      if (this._lastLoadedEpoch !== null && this._lastLoadedEpoch === currentEpoch) {
        // Epoch hasn't changed, check if all visible slots are already cached
        // Only proceed if there are actually pending slots that need loading
        const hasPendingSlots = this._thumbnailSlots.some(s => s.status === "pending");
        if (!hasPendingSlots) {
          return;
        }
      }
    }

    const viewportWidth = this._viewportWidth;
    const scrollOffset = this._currentScrollLeft;
    const stripWidth = this._width;
    
    // Get strip's timeline position
    const stripStartPx = this._getStripTimelinePosition();
    
    // Calculate visible region in timeline coordinates
    const visibleLeftPx = scrollOffset - VIRTUAL_RENDER_PADDING_PX;
    const visibleRightPx = scrollOffset + viewportWidth + VIRTUAL_RENDER_PADDING_PX;
    
    // Convert to strip-local coordinates
    const visibleStartInStrip = Math.max(0, visibleLeftPx - stripStartPx);
    const visibleEndInStrip = Math.min(stripWidth, visibleRightPx - stripStartPx);

    // Find pending slots in visible range (using strip-local coordinates)
    const pending = this._thumbnailSlots.filter((slot) => {
      if (slot.status !== "pending") return false;
      const slotRight = slot.x + slot.width;
      return slotRight >= visibleStartInStrip && slot.x <= visibleEndInStrip;
    });

    if (pending.length === 0) return;

    this._captureInProgress = true;

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

      // Update last loaded epoch for timegroups
      if (isEFTimegroup(this._targetElement)) {
        this._lastLoadedEpoch = this._targetElement.contentEpoch;
      }

      // Dispatch ready event when thumbnails are first loaded
      const hasAnyLoaded = this._thumbnailSlots.some((s) => s.status === "cached");
      if (hasAnyLoaded && !this._hasLoadedThumbnails) {
        this._hasLoadedThumbnails = true;
        this.dispatchEvent(new CustomEvent("thumbnails-ready", { bubbles: true }));
      }
    }
  }

  /**
   * Capture thumbnails from a timegroup target.
   */
  private async _captureTimegroupThumbnails(slots: ThumbnailSlot[]): Promise<void> {
    const target = this._targetElement as EFTimegroup;
    const { rootId, elementId, epoch } = getCacheIdentifiers(target);

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
              const key = getCacheKey(rootId, elementId, slot.timeMs, epoch);
              sessionThumbnailCache.set(key, imageData, slot.timeMs, elementId);
              slot.imageData = imageData;
              slot.status = "cached";
            }
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
      }
    }
  }

  /**
   * Capture thumbnails from a video target using MediaEngine.
   */
  private async _captureVideoThumbnails(slots: ThumbnailSlot[]): Promise<void> {
    const target = this._targetElement as EFVideo;
    const { rootId, elementId, epoch } = getCacheIdentifiers(target);

    // Wait for media engine
    if (target.mediaEngineTask) {
      await target.mediaEngineTask.taskComplete;
    }

    const mediaEngine = target.mediaEngineTask?.value;
    if (!mediaEngine) return;

    // Check for video rendition
    const videoRendition = mediaEngine.getVideoRendition();
    const scrubRendition = mediaEngine.getScrubVideoRendition();
    if (!videoRendition && !scrubRendition) return;

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
            const key = getCacheKey(rootId, elementId, slot.timeMs, epoch);
            sessionThumbnailCache.set(key, imageData, slot.timeMs, elementId);
            slot.imageData = imageData;
            slot.status = "cached";
          }
        }
      }
    } catch (error) {
      // Abort on error to clean up any in-flight requests
      abortController.abort();
      console.warn("Video thumbnail extraction failed:", error);
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
  // Cache Invalidation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Invalidate cached thumbnails for this element within a time range.
   * Call this when content changes at specific times.
   */
  invalidateTimeRange(startTimeMs: number, endTimeMs: number): void {
    if (!this._targetElement) return;

    const { rootId, elementId } = getCacheIdentifiers(this._targetElement);
    sessionThumbnailCache.invalidateTimeRange(rootId, elementId, startTimeMs, endTimeMs);

    // Reset affected slots
    for (const slot of this._thumbnailSlots) {
      if (slot.timeMs >= startTimeMs && slot.timeMs <= endTimeMs) {
        slot.imageData = undefined;
        slot.status = "pending";
      }
    }

    this._scheduleRender();
  }

  /**
   * Invalidate all cached thumbnails for this element.
   */
  invalidateAll(): void {
    if (!this._targetElement) return;

    const { rootId, elementId } = getCacheIdentifiers(this._targetElement);
    sessionThumbnailCache.invalidateElement(rootId, elementId);

    // Reset all slots
    for (const slot of this._thumbnailSlots) {
      slot.imageData = undefined;
      slot.status = "pending";
    }

    this._scheduleRender();
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
