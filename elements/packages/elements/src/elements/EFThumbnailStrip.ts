import { consume } from "@lit/context";
import { Task, TaskStatus } from "@lit/task";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import type { MediaEngine as ImportedMediaEngine } from "../transcoding/types/index.js";
import { OrderedLRUCache } from "../utils/LRUCache.js";
import type { EFVideo } from "./EFVideo.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import { TargetController } from "./TargetController.ts";
import { timelineStateContext, type TimelineState } from "../gui/timeline/timelineStateContext.js";

/** Type guard to check if element is EFVideo */
function isEFVideo(element: Element | null): element is EFVideo {
  return element?.tagName.toLowerCase() === "ef-video";
}

/** Type guard to check if element is EFTimegroup */
function isEFTimegroup(element: Element | null): element is EFTimegroup {
  return element?.tagName.toLowerCase() === "ef-timegroup";
}

/** Get a unique identifier for cache key (src for video, id for timegroup) */
function getElementCacheId(element: EFVideo | EFTimegroup): string {
  if (isEFVideo(element)) {
    return element.src || element.id || "video";
  }
  return `timegroup:${element.id || "unknown"}`;
}

/** Padding in pixels for virtual rendering (render extra thumbnails beyond viewport) */
const VIRTUAL_RENDER_PADDING_PX = 400;

/**
 * Global thumbnail image cache for smooth resize performance
 * Shared across all thumbnail strip instances
 * Uses OrderedLRUCache for efficient timestamp-based searching
 */
const thumbnailImageCache = new OrderedLRUCache<string, ImageData>(
  200,
  (a, b) => {
    // Extract timestamp from cache key for ordered searching (take last part after splitting on ':')
    const partsA = a.split(":");
    const partsB = b.split(":");
    const timeA = Number.parseFloat(partsA[partsA.length - 1] || "0");
    const timeB = Number.parseFloat(partsB[partsB.length - 1] || "0");
    return timeA - timeB;
  },
);

// Export for debugging (works in both browser and server)
(
  globalThis as typeof globalThis & {
    debugThumbnailCache: typeof thumbnailImageCache;
  }
).debugThumbnailCache = thumbnailImageCache;

/**
 * Quantize timestamp to 30fps frame boundaries for consistent caching
 * This eliminates cache misses from floating point precision differences
 */
function quantizeTimestamp(timeMs: number): number {
  const frameIntervalMs = 1000 / 30; // 33.33ms at 30fps
  return Math.round(timeMs / frameIntervalMs) * frameIntervalMs;
}

/**
 * Generate cache key for thumbnail image data (dimension-independent, quantized)
 */
function getThumbnailCacheKey(videoSrc: string, timeMs: number): string {
  const quantizedTimeMs = quantizeTimestamp(timeMs);
  return `${videoSrc}:${quantizedTimeMs}`;
}

// Constants for consistent thumbnail layout
const DEFAULT_GAP = 4; // Default gap between thumbnails
const DEFAULT_ASPECT_RATIO = 16 / 9; // Default video aspect ratio for width calculation
const MAX_THUMBNAIL_CANVAS_WIDTH = 480; // Maximum width for thumbnail captures
const MAX_TIMEGROUP_THUMBNAILS_PER_BATCH = 10; // Thumbnails per batch for progressive loading

interface ThumbnailSegment {
  segmentId: number;
  thumbnails: Array<{
    timeMs: number;
  }>;
}

interface ThumbnailLayout {
  count: number;
  segments: readonly ThumbnailSegment[];
  effectiveThumbnailWidth: number; // Actual width used for each thumbnail
  pitch: number; // Distance from one thumbnail's left edge to the next (for edge-to-edge fill)
}

// Use the imported MediaEngine type and mediabunny types

interface ThumbnailRenderInfo {
  timeMs: number;
  segmentId: number;
  x: number;
  width: number;
  height: number;
  status: "exact-hit" | "near-hit" | "missing" | "loading";
  imageData?: ImageData;
  nearHitKey?: string;
}

/**
 * Calculate optimal thumbnail count and timestamps for the strip
 * Groups thumbnails by scrub segment ID for efficient caching
 * 
 * Positioning model:
 * - First thumbnail's LEFT edge at x=0 (time=startTime)
 * - Last thumbnail's RIGHT edge at x=stripWidth (time=endTime)
 * - Thumbnails fill edge-to-edge with calculated pitch
 */
function calculateThumbnailLayout(
  stripWidth: number,
  thumbnailWidth: number,
  gap: number,
  startTimeMs: number,
  endTimeMs: number,
  scrubSegmentDurationMs?: number,
): ThumbnailLayout {
  // Must have positive width and valid time range
  if (stripWidth <= 0 || thumbnailWidth <= 0 || endTimeMs <= startTimeMs) {
    return { count: 0, segments: [], effectiveThumbnailWidth: 0, pitch: 0 };
  }

  // Calculate how many thumbnails fit with the desired minimum gap
  // N thumbnails need: N * thumbnailWidth + (N-1) * gap <= stripWidth
  // Solving: N <= (stripWidth + gap) / (thumbnailWidth + gap)
  const count = Math.max(1, Math.floor((stripWidth + gap) / (thumbnailWidth + gap)));
  
  // Calculate pitch so thumbnails fill edge-to-edge:
  // First at x=0, last right edge at x=stripWidth
  // So last left edge at x=stripWidth-thumbnailWidth
  // pitch = (stripWidth - thumbnailWidth) / (count - 1) for count > 1
  const pitch = count > 1 ? (stripWidth - thumbnailWidth) / (count - 1) : 0;

  // Generate timestamps evenly distributed across time range
  const timestamps: number[] = [];
  const timeRange = endTimeMs - startTimeMs;

  for (let i = 0; i < count; i++) {
    const timeMs =
      count === 1
        ? (startTimeMs + endTimeMs) / 2
        : startTimeMs + (i * timeRange) / (count - 1);
    timestamps.push(timeMs);
  }

  // Group by segment ID
  const segmentMap = new Map<number, Array<{ timeMs: number }>>();
  for (const timeMs of timestamps) {
    const segmentId = scrubSegmentDurationMs
      ? Math.floor(timeMs / scrubSegmentDurationMs)
      : 0;
    if (!segmentMap.has(segmentId)) {
      segmentMap.set(segmentId, []);
    }
    // biome-ignore lint/style/noNonNullAssertion: Set in line above
    segmentMap.get(segmentId)!.push({ timeMs });
  }

  const segments = Array.from(segmentMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([segmentId, thumbnails]) => ({ segmentId, thumbnails }));

  return { count, segments, effectiveThumbnailWidth: thumbnailWidth, pitch };
}

@customElement("ef-thumbnail-strip")
export class EFThumbnailStrip extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        position: absolute;
        inset: 0;
        background: #1a1a2e;
        overflow: hidden;
      }
      canvas {
        display: block;
        position: absolute;
        top: 0;
        image-rendering: auto; /* Smooth thumbnails */
        height: 100%;
      }
    `,
  ];

  canvasRef = createRef<HTMLCanvasElement>();

  /** Timeline state context for viewport-aware rendering */
  @consume({ context: timelineStateContext, subscribe: true })
  @state()
  private _timelineState?: TimelineState;

  /** Pixels per millisecond - for converting time to position */
  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs = 0.1;

  /** Last rendered scroll position - for detecting scroll changes */
  private _lastRenderedScrollLeft = -1;
  
  /** Last rendered viewport width */
  private _lastRenderedViewportWidth = 0;
  
  /** Animation frame ID for scroll-based updates */
  private _scrollUpdateFrame?: number;

  // Target element using the same pattern as EFSurface
  // @ts-expect-error controller is intentionally not referenced directly to prevent GC
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used for side effects
  private _targetController: TargetController = new TargetController(
    this as any,
  );

  private _targetElement: EFVideo | EFTimegroup | null = null;

  @state()
  get targetElement(): EFVideo | EFTimegroup | null {
    return this._targetElement;
  }

  set targetElement(value: EFVideo | EFTimegroup | null) {
    const oldValue = this._targetElement;
    this._targetElement = value;

    // Clean up previous property observer
    this._videoPropertyObserver?.disconnect();

    // When target element changes, set up property watching
    if (value && value !== oldValue) {
      if (isEFVideo(value)) {
        // Video-specific setup: Watch for video property changes that affect thumbnails
        this._videoPropertyObserver = new MutationObserver((mutations) => {
          let shouldUpdate = false;
          for (const mutation of mutations) {
            if (mutation.type === "attributes" && mutation.attributeName) {
              const attr = mutation.attributeName;
              if (
                attr === "trimstart" ||
                attr === "trimend" ||
                attr === "sourcein" ||
                attr === "sourceout" ||
                attr === "src"
              ) {
                shouldUpdate = true;
                break;
              }
            }
          }
          if (shouldUpdate) {
            this.runThumbnailUpdate();
          }
        });

        this._videoPropertyObserver.observe(value, {
          attributes: true,
          attributeFilter: [
            "trimstart",
            "trimend",
            "sourcein",
            "sourceout",
            "src",
          ],
        });

        // Listen for media engine ready - wait for element to be ready first
        // because mediaEngineTask may not exist yet during initial render
        value.updateComplete.then(() => {
          // Check if target is still this element (it may have been changed/cleared)
          if (this._targetElement !== value) {
            return;
          }
          if (value.mediaEngineTask) {
            // Show loading state while media engine is initializing
            // (this includes FFmpeg processing on first request)
            if (value.mediaEngineTask.status === TaskStatus.PENDING || value.mediaEngineTask.status === TaskStatus.INITIAL) {
              this._mediaEngineLoading = true;
              // Trigger redraw to show loading indicator
              this.runThumbnailUpdate();
            }
            
            value.mediaEngineTask.taskComplete
              .then(() => {
                // Check again if target is still this element
                if (this._targetElement !== value) {
                  return;
                }
                // Clear loading state
                this._mediaEngineLoading = false;
                
                // When media engine is ready, force re-run thumbnails
                // This handles the case where the layout task started before mediaEngine was ready
                // and might have returned early or gotten stale data
                if (this._stripWidth > 0) {
                  // Force a new task run by clearing any in-progress task
                  // and triggering through the stripWidth setter
                  this._thumbnailLayoutTask = undefined;
                  this.stripWidth = this._stripWidth;
                }
                // If width is 0, the ResizeObserver will trigger when width becomes available
              })
              .catch(() => {
                // Clear loading state on error too
                this._mediaEngineLoading = false;
              });
          }
        });
      } else if (isEFTimegroup(value)) {
        // Timegroup-specific setup: Watch for structure changes
        this._videoPropertyObserver = new MutationObserver(() => {
          this.runThumbnailUpdate();
        });

        this._videoPropertyObserver.observe(value, {
          childList: true,
          subtree: true,
        });

        // Watch for duration changes (computed property, not an attribute)
        // Poll until duration is non-zero, then trigger thumbnail generation
        let lastDuration = value.durationMs;
        const checkDuration = () => {
          if (this._targetElement !== value) return; // Target changed
          const currentDuration = value.durationMs;
          if (currentDuration !== lastDuration) {
            lastDuration = currentDuration;
            if (currentDuration > 0) {
              this.runThumbnailUpdate();
            }
          }
          // Keep checking if duration is still 0
          if (currentDuration === 0) {
            requestAnimationFrame(checkDuration);
          }
        };
        if (lastDuration === 0) {
          requestAnimationFrame(checkDuration);
        }

        // Timegroups are immediately ready - trigger update
        if (this._stripWidth > 0) {
          this._thumbnailLayoutTask = undefined;
          this.stripWidth = this._stripWidth;
        }
      }
    }

    this.requestUpdate("targetElement", oldValue);
  }

  @property({ type: String })
  target = "";

  /**
   * Thumbnail width in pixels. If not set (0), width is auto-calculated
   * from strip height using the video's aspect ratio (or 16:9 default).
   */
  @property({ type: Number, attribute: "thumbnail-width" })
  thumbnailWidth = 0; // 0 = auto (calculate from height)

  /**
   * Gap between thumbnails in pixels.
   */
  @property({ type: Number, attribute: "gap" })
  gap = DEFAULT_GAP;

  /**
   * Custom start time in milliseconds relative to trimmed timeline (0 = start of trimmed portion)
   * In trimmed mode: 0ms = sourceStartMs, 1000ms = sourceStartMs + 1000ms
   * In intrinsic mode: 0ms = 0ms in source media
   */
  @property({ type: Number, attribute: "start-time-ms" })
  startTimeMs?: number;

  /**
   * Custom end time in milliseconds relative to trimmed timeline
   * In trimmed mode: relative to sourceStartMs
   * In intrinsic mode: relative to source media start (0ms)
   */
  @property({ type: Number, attribute: "end-time-ms" })
  endTimeMs?: number;

  /**
   * Use intrinsic duration instead of trimmed duration
   * Accepts "true"/"false" string values or boolean
   */
  @property({
    type: Boolean,
    attribute: "use-intrinsic-duration",
    reflect: true,
    converter: {
      fromAttribute: (value: string | null) => {
        if (value === null) return false;
        return value === "true";
      },
      toAttribute: (value: boolean) => (value ? "true" : null),
    },
  })
  useIntrinsicDuration = false;

  private _stripWidth = 0;
  private _stripHeight = 24; // Default height, updated by ResizeObserver
  private _pendingStripWidth: number | undefined;
  private _thumbnailLayoutTask: Promise<ThumbnailRenderInfo[]> | undefined;
  @state()
  private set stripWidth(value: number) {
    if (this._thumbnailLayoutTask) {
      this._pendingStripWidth = value;
      return;
    }
    this._stripWidth = value;

    if (value > 0) {
      this._thumbnailLayoutTask = this.thumbnailLayoutTask
        .run()
        .then(async () => {
          // Use taskComplete and .value instead of promise return value
          await this.thumbnailLayoutTask.taskComplete;
          const layout = this.thumbnailLayoutTask.value;
          return layout ? this.runThumbnailRenderTask(layout) : [];
        })
        .finally(() => {
          this._thumbnailLayoutTask = undefined;
          if (this._pendingStripWidth) {
            this.stripWidth = this._pendingStripWidth;
            this._pendingStripWidth = undefined;
          }
        });
    }
  }
  private get stripWidth() {
    return this._stripWidth;
  }

  /**
   * Run thumbnail render task directly with provided layout (bypasses task args dependency)
   */
  private async runThumbnailRenderTask(
    layout: ThumbnailLayout,
  ): Promise<ThumbnailRenderInfo[]> {
    if (!layout || !this.targetElement || layout.count === 0) {
      return [];
    }

    // Run the thumbnail render task logic directly
    return this.renderThumbnails(layout, this.targetElement);
  }

  private resizeObserver?: ResizeObserver;
  private _thumbnailUpdateInProgress = false;
  private _pendingThumbnailUpdate = false;
  private _captureInProgress = false;
  private _videoPropertyObserver?: MutationObserver;

  /** Track currently loading scrub segments for visual feedback */
  @state()
  private _loadingSegments: Map<number, [number, number]> = new Map();

  /** Track whether media engine is still initializing (processing media) */
  @state()
  private _mediaEngineLoading = false;

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);

    // IMPLEMENTATION GUIDELINES: Fix for initial loading bug - ensure width is detected
    if (this._stripWidth === 0) {
      const width = this.clientWidth;
      if (width > 0) {
        this.stripWidth = width;
      }
    }

    // IMPLEMENTATION GUIDELINES: Responsive debouncing for thumbnail property changes using EFTimegroup pattern
    if (
      changedProperties.has("thumbnailWidth") ||
      changedProperties.has("gap") ||
      changedProperties.has("startTimeMs") ||
      changedProperties.has("endTimeMs") ||
      changedProperties.has("useIntrinsicDuration") ||
      changedProperties.has("pixelsPerMs")
    ) {
      this.runThumbnailUpdate();
    }

    // Check for scroll changes from timeline context (virtual rendering)
    if (changedProperties.has("_timelineState")) {
      this.checkScrollUpdate();
    }
  }

  /**
   * Check if scroll position changed enough to warrant a re-render
   */
  private checkScrollUpdate() {
    if (!this._timelineState) return;
    
    const { viewportScrollLeft, viewportWidth } = this._timelineState;
    const scrollDelta = Math.abs(viewportScrollLeft - this._lastRenderedScrollLeft);
    const viewportChanged = viewportWidth !== this._lastRenderedViewportWidth;
    
    // Re-render if scrolled more than 25px or viewport size changed (responsive scrolling)
    if (scrollDelta > 25 || viewportChanged || this._lastRenderedScrollLeft < 0) {
      // Cancel any pending scroll update
      if (this._scrollUpdateFrame) {
        cancelAnimationFrame(this._scrollUpdateFrame);
      }
      
      // Schedule update on next frame
      this._scrollUpdateFrame = requestAnimationFrame(() => {
        this._scrollUpdateFrame = undefined;
        this.runThumbnailUpdate();
      });
    }
  }

  /**
   * Run thumbnail update with responsive debouncing (based on EFTimegroup currentTime pattern)
   */
  private runThumbnailUpdate() {
    // If update already in progress, just flag that another update is needed
    if (this._thumbnailUpdateInProgress) {
      this._pendingThumbnailUpdate = true;
      return;
    }

    this._thumbnailUpdateInProgress = true;

    // Trigger full layout→render pipeline immediately for responsiveness
    this.thumbnailLayoutTask
      .run()
      .then(async () => {
        await this.thumbnailLayoutTask.taskComplete;
        const layout = this.thumbnailLayoutTask.value;
        if (layout) {
          await this.runThumbnailRenderTask(layout);
        }
      })
      .catch(() => {
        // Ignore errors - thumbnails will show as placeholders
      })
      .finally(() => {
        this._thumbnailUpdateInProgress = false;

        // If more property changes came in while we were processing, run another update
        if (this._pendingThumbnailUpdate) {
          this._pendingThumbnailUpdate = false;
          this.runThumbnailUpdate();
        }
      });
  }

  private thumbnailLayoutTask = new Task(this, {
    autoRun: false,
    task: async ([
      stripWidth,
      stripHeight,
      thumbnailWidth,
      gap,
      targetElement,
      startTimeMs,
      endTimeMs,
      useIntrinsicDuration,
      mediaEngine,
    ]: readonly [
      number,
      number,
      number,
      number,
      EFVideo | EFTimegroup | null,
      number | undefined,
      number | undefined,
      boolean,
      ImportedMediaEngine | null | undefined,
    ]) => {
      // Need valid dimensions and target element
      if (stripWidth <= 0 || stripHeight <= 0 || !targetElement) {
        return { count: 0, segments: [], effectiveThumbnailWidth: 0, pitch: 0 };
      }

      // Handle timegroup targets (no media engine needed)
      if (isEFTimegroup(targetElement)) {
        return this.calculateLayoutForTimegroup(
          stripWidth,
          stripHeight,
          thumbnailWidth,
          gap,
          targetElement,
          startTimeMs,
          endTimeMs,
        );
      }

      // Video targets need media engine
      if (!mediaEngine) {
        // If no media engine yet, wait for it to be ready
        if (targetElement.mediaEngineTask) {
          await targetElement.mediaEngineTask.taskComplete;
          // Get the media engine after it's ready
          const readyMediaEngine = targetElement.mediaEngineTask.value;
          if (!readyMediaEngine) {
            return { count: 0, segments: [], effectiveThumbnailWidth: 0, pitch: 0 };
          }
          // Continue with the ready media engine
          return this.calculateLayoutWithMediaEngine(
            stripWidth,
            stripHeight,
            thumbnailWidth,
            gap,
            targetElement,
            startTimeMs,
            endTimeMs,
            useIntrinsicDuration,
            readyMediaEngine,
          );
        }
        return { count: 0, segments: [], effectiveThumbnailWidth: 0, pitch: 0 };
      }

      // Media engine is ready, proceed with layout calculation
      return this.calculateLayoutWithMediaEngine(
        stripWidth,
        stripHeight,
        thumbnailWidth,
        gap,
        targetElement,
        startTimeMs,
        endTimeMs,
        useIntrinsicDuration,
        mediaEngine,
      );
    },
    args: () =>
      [
        this.stripWidth,
        this._stripHeight,
        this.thumbnailWidth,
        this.gap,
        this.targetElement,
        this.startTimeMs,
        this.endTimeMs,
        this.useIntrinsicDuration,
        isEFVideo(this.targetElement) ? this.targetElement?.mediaEngineTask?.value : null,
      ] as const,
  });

  /**
   * Calculate layout for a timegroup target
   */
  private calculateLayoutForTimegroup(
    stripWidth: number,
    stripHeight: number,
    thumbnailWidth: number,
    gap: number,
    targetElement: EFTimegroup,
    startTimeMs: number | undefined,
    endTimeMs: number | undefined,
  ): ThumbnailLayout {
    // Use actual client height if available, fall back to passed value
    const actualHeight = this.clientHeight || stripHeight || 48;
    
    // Calculate effective thumbnail width using timegroup dimensions
    let effectiveWidth = thumbnailWidth;
    if (effectiveWidth <= 0) {
      const width = targetElement.offsetWidth || 1920;
      const height = targetElement.offsetHeight || 1080;
      const aspectRatio = width / height || DEFAULT_ASPECT_RATIO;
      effectiveWidth = Math.round(actualHeight * aspectRatio);
    }

    // Determine time range
    // If endTimeMs is 0 or undefined, always use the target's actual duration
    // This handles cases where the attribute is set to 0 before duration is known
    const effectiveStartMs = startTimeMs ?? 0;
    const effectiveEndMs = (endTimeMs && endTimeMs > 0) ? endTimeMs : (targetElement.durationMs ?? 0);

    // Generate layout (no segment alignment for timegroups)
    return calculateThumbnailLayout(
      stripWidth,
      effectiveWidth,
      gap,
      effectiveStartMs,
      effectiveEndMs,
      undefined, // No scrub segment for timegroups
    );
  }

  /**
   * Calculate layout with a ready media engine
   */
  private calculateLayoutWithMediaEngine(
    stripWidth: number,
    stripHeight: number,
    thumbnailWidth: number,
    gap: number,
    targetElement: EFVideo,
    startTimeMs: number | undefined,
    endTimeMs: number | undefined,
    useIntrinsicDuration: boolean,
    mediaEngine: ImportedMediaEngine,
  ) {
    // Calculate effective thumbnail width
    // If thumbnailWidth is 0 (auto), calculate from height using video aspect ratio
    let effectiveWidth = thumbnailWidth;
    if (effectiveWidth <= 0) {
      // Try to get video dimensions from media engine
      const videoWidth = (targetElement as any).videoWidth || 1920;
      const videoHeight = (targetElement as any).videoHeight || 1080;
      const aspectRatio = videoWidth / videoHeight || DEFAULT_ASPECT_RATIO;
      // Calculate width from height to maintain aspect ratio
      effectiveWidth = Math.round(stripHeight * aspectRatio);
    }

    // Determine time range for thumbnails with correct timeline coordinate handling
    if (useIntrinsicDuration) {
      // INTRINSIC MODE: start-time-ms/end-time-ms are relative to source timeline (0 = source start)
      const effectiveStartMs = startTimeMs ?? 0;
      const effectiveEndMs =
        endTimeMs ?? targetElement.intrinsicDurationMs ?? 0;

      return this.generateLayoutFromTimeRange(
        stripWidth,
        effectiveWidth,
        gap,
        effectiveStartMs,
        effectiveEndMs,
        mediaEngine,
      );
    }
    // TRIMMED MODE: start-time-ms/end-time-ms are relative to trimmed timeline (0 = trim start)
    const sourceStart = targetElement.sourceStartMs ?? 0;
    const trimmedDuration = targetElement.durationMs ?? 0;

    // Convert trimmed timeline coordinates to source timeline coordinates
    const effectiveStartMs =
      startTimeMs !== undefined
        ? sourceStart + startTimeMs // Convert from trimmed timeline to source timeline
        : sourceStart; // Default: start of trimmed portion

    const effectiveEndMs =
      endTimeMs !== undefined
        ? sourceStart + endTimeMs // Convert from trimmed timeline to source timeline
        : sourceStart + trimmedDuration; // Default: end of trimmed portion

    return this.generateLayoutFromTimeRange(
      stripWidth,
      effectiveWidth,
      gap,
      effectiveStartMs,
      effectiveEndMs,
      mediaEngine,
    );
  }

  /**
   * Generate layout from calculated time range
   */
  private generateLayoutFromTimeRange(
    stripWidth: number,
    thumbnailWidth: number,
    gap: number,
    effectiveStartMs: number,
    effectiveEndMs: number,
    mediaEngine: ImportedMediaEngine,
  ) {
    // Get scrub segment duration from media engine if available
    const scrubSegmentDurationMs =
      mediaEngine && typeof mediaEngine.getScrubVideoRendition === "function"
        ? mediaEngine.getScrubVideoRendition()?.segmentDurationMs
        : undefined;

    // Generate layout using our algorithm with segment alignment
    const layout = calculateThumbnailLayout(
      stripWidth,
      thumbnailWidth,
      gap,
      effectiveStartMs,
      effectiveEndMs,
      scrubSegmentDurationMs,
    );

    return layout;
  }

  private thumbnailRenderTask = new Task(this, {
    autoRun: false,
    task: async ([layout, targetElement]: readonly [
      ThumbnailLayout | null,
      EFVideo | EFTimegroup | null,
    ]) => {
      // Simplified task that delegates to renderThumbnails method
      if (!layout || !targetElement) {
        return [];
      }
      return this.renderThumbnails(layout, targetElement);
    },
    args: () =>
      [
        this.thumbnailLayoutTask.value || null,
        this.targetElement,
      ] as const,
  });

  /**
   * Render thumbnails with provided layout (main rendering logic)
   */
  private async renderThumbnails(
    layout: ThumbnailLayout,
    targetElement: EFVideo | EFTimegroup,
  ): Promise<ThumbnailRenderInfo[]> {
    if (!layout || !targetElement || layout.count === 0) {
      return [];
    }

    const cacheId = getElementCacheId(targetElement);
    const thumbnailHeight = this._stripHeight;
    const effectiveWidth = layout.effectiveThumbnailWidth;

    const allThumbnails: ThumbnailRenderInfo[] = [];
    let thumbnailIndex = 0; // Track ordinal position

    // Process each segment
    for (const segment of layout.segments) {
      for (const thumbnail of segment.thumbnails) {
        const cacheKey = getThumbnailCacheKey(cacheId, thumbnail.timeMs);

        // Try exact cache hit first
        let imageData = thumbnailImageCache.get(cacheKey);
        let status: ThumbnailRenderInfo["status"] = "exact-hit";
        let nearHitKey: string | undefined;

        if (!imageData) {
          // Try near cache hit within 5 seconds using proper range search
          const timeMinus = Math.max(0, thumbnail.timeMs - 5000);
          const timePlus = thumbnail.timeMs + 5000;

          // For range bounds, use raw timestamps (don't quantize the search range)
          const rangeStartKey = `${cacheId}:${timeMinus}`;
          const rangeEndKey = `${cacheId}:${timePlus}`;

          // Use findRange to find any cached items in this time window
          const nearHits = thumbnailImageCache.findRange(
            rangeStartKey,
            rangeEndKey,
          );

          // Filter to only include the same source
          const sameSourceHits = nearHits.filter((hit) =>
            hit.key.startsWith(`${cacheId}:`),
          );

          if (sameSourceHits.length > 0) {
            // Get the closest match by time from same source
            const nearestHit = sameSourceHits.reduce((closest, current) => {
              const currentParts = current.key.split(":");
              const closestParts = closest.key.split(":");
              const currentTime = Number.parseFloat(
                currentParts[currentParts.length - 1] || "0",
              );
              const closestTime = Number.parseFloat(
                closestParts[closestParts.length - 1] || "0",
              );
              const currentDiff = Math.abs(currentTime - thumbnail.timeMs);
              const closestDiff = Math.abs(closestTime - thumbnail.timeMs);
              return currentDiff < closestDiff ? current : closest;
            });

            imageData = nearestHit.value;
            status = "near-hit";
            nearHitKey = nearestHit.key;
          } else {
            status = "missing";
          }
        }

        // Position thumbnail using pitch from layout (ensures edge-to-edge fill)
        const x = Math.round(thumbnailIndex * layout.pitch);

        allThumbnails.push({
          timeMs: thumbnail.timeMs,
          segmentId: segment.segmentId,
          x,
          width: effectiveWidth,
          height: thumbnailHeight,
          status,
          imageData,
          nearHitKey,
        });

        thumbnailIndex++; // Increment ordinal position
      }
    }

    // Draw current state (cache hits and placeholders)
    await this.drawThumbnails(allThumbnails);

    // Load missing thumbnails (wrapped in idle callback for lower priority)
    await this.scheduleThumbnailCapture(allThumbnails, targetElement);

    return allThumbnails;
  }

  connectedCallback() {
    super.connectedCallback();

    // Listen for scrub segment loading events for visual feedback
    this.addEventListener(
      "scrub-segment-loading",
      this._onScrubSegmentLoading as EventListener,
    );

    // Set up ResizeObserver to track element dimensions
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use borderBoxSize for accurate dimensions including borders/padding
        const width =
          entry.borderBoxSize && entry.borderBoxSize.length > 0
            ? entry.borderBoxSize[0]?.inlineSize
            : entry.contentRect.width;

        const height =
          entry.borderBoxSize && entry.borderBoxSize.length > 0
            ? entry.borderBoxSize[0]?.blockSize
            : entry.contentRect.height;

        this._stripHeight = height ?? 0;
        this.stripWidth = width ?? 0; // This triggers thumbnail layout update
      }
    });

    this.resizeObserver.observe(this);

    // Force initial width calculation after element is fully connected
    this.updateComplete.then(() => {
      if (this._stripWidth === 0) {
        const width = this.clientWidth;
        if (width > 0) {
          this.stripWidth = width ?? 0;
        }
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    // Clean up video property observer
    this._videoPropertyObserver?.disconnect();
    this._videoPropertyObserver = undefined;

    // Clean up scrub segment loading listener
    this.removeEventListener(
      "scrub-segment-loading",
      this._onScrubSegmentLoading as EventListener,
    );

    // Clean up scroll update frame
    if (this._scrollUpdateFrame) {
      cancelAnimationFrame(this._scrollUpdateFrame);
      this._scrollUpdateFrame = undefined;
    }
  }

  /**
   * Handle scrub segment loading events for visual feedback.
   * Shows/hides loading indicator based on segment loading status.
   */
  private _onScrubSegmentLoading = (
    event: CustomEvent<import("./EFVideo.js").ScrubSegmentLoadingDetail>,
  ) => {
    const { segmentId, timeRangeMs, status } = event.detail;

    if (status === "loading") {
      // Add segment to loading set
      this._loadingSegments = new Map(this._loadingSegments).set(
        segmentId,
        timeRangeMs,
      );
    } else if (status === "loaded") {
      // Remove segment from loading set after a brief delay for visual feedback
      setTimeout(() => {
        const newMap = new Map(this._loadingSegments);
        newMap.delete(segmentId);
        this._loadingSegments = newMap;
      }, 200);
    }

    // Trigger a redraw to show/hide loading indicators
    this.requestUpdate();
  };

  /**
   * Draw thumbnails to the canvas with cache hits and placeholders.
   * Uses virtual rendering - only draws thumbnails visible in the viewport.
   */
  private async drawThumbnails(
    thumbnails: ThumbnailRenderInfo[],
  ): Promise<void> {
    const canvas = this.canvasRef.value;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // Get actual dimensions from the host element
    const hostWidth = this.clientWidth || this._stripWidth;
    const hostHeight = this.clientHeight || this._stripHeight;
    
    // Skip if dimensions are invalid
    if (hostWidth <= 0 || hostHeight <= 0) {
      return;
    }

    // Calculate visible range for virtual rendering
    const viewportScrollLeft = this._timelineState?.viewportScrollLeft ?? 0;
    const viewportWidth = this._timelineState?.viewportWidth ?? hostWidth;
    
    // Canvas width is limited to viewport + padding (virtual rendering)
    const canvasWidth = Math.min(
      hostWidth,
      viewportWidth + VIRTUAL_RENDER_PADDING_PX * 2
    );
    
    // Canvas left position (where to place it relative to strip start)
    const canvasLeft = Math.max(0, viewportScrollLeft - VIRTUAL_RENDER_PADDING_PX);
    const canvasRight = canvasLeft + canvasWidth;
    
    // Track scroll position for change detection
    this._lastRenderedScrollLeft = viewportScrollLeft;
    this._lastRenderedViewportWidth = viewportWidth;

    // Set canvas to exact size we're drawing - prevents CSS scaling
    const dpr = window.devicePixelRatio || 1;

    // Set canvas buffer size for high DPI rendering
    canvas.width = canvasWidth * dpr;
    canvas.height = hostHeight * dpr;

    // Set canvas DOM size and position
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${hostHeight}px`;
    canvas.style.left = `${canvasLeft}px`;

    // Scale the drawing context to match device pixel ratio
    ctx.scale(dpr, dpr);

    // Clear canvas with background color
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvasWidth, hostHeight);

    // Draw each thumbnail using "cover" mode (crop to fill, no gaps)
    // Only draw thumbnails that are visible in the canvas area (virtual rendering)
    for (let i = 0; i < thumbnails.length; i++) {
      const thumb = thumbnails[i];
      if (!thumb) continue;
      
      // Check if thumbnail is within visible canvas area
      const thumbRight = thumb.x + thumb.width;
      if (thumbRight < canvasLeft || thumb.x > canvasRight) {
        continue; // Skip thumbnails outside visible range
      }
      
      // Calculate position relative to canvas (not absolute strip position)
      const drawX = thumb.x - canvasLeft;
      
      if (thumb.imageData) {
        // Draw cached thumbnail with cover mode (crop to fill)
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = thumb.imageData.width;
        tempCanvas.height = thumb.imageData.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) {
          continue;
        }
        tempCtx.putImageData(thumb.imageData, 0, 0);

        // Cover mode: crop source to fill destination without gaps
        const sourceAspect = thumb.imageData.width / thumb.imageData.height;
        const destAspect = thumb.width / hostHeight;
        
        let sourceX = 0;
        let sourceY = 0;
        let sourceW = thumb.imageData.width;
        let sourceH = thumb.imageData.height;
        
        if (sourceAspect > destAspect) {
          // Source is wider - crop left/right
          sourceW = thumb.imageData.height * destAspect;
          sourceX = (thumb.imageData.width - sourceW) / 2;
        } else {
          // Source is taller - crop top/bottom
          sourceH = thumb.imageData.width / destAspect;
          sourceY = (thumb.imageData.height - sourceH) / 2;
        }
        
        // Draw cropped source to fill destination exactly
        ctx.drawImage(
          tempCanvas,
          sourceX, sourceY, sourceW, sourceH,  // Source rectangle (cropped)
          drawX, 0, thumb.width, hostHeight  // Destination rectangle (relative to canvas)
        );

        // Add subtle indicator for near hits
        if (thumb.status === "near-hit") {
          ctx.fillStyle = "rgba(255, 165, 0, 0.3)";
          ctx.fillRect(drawX, 0, thumb.width, 2);
        }
      } else {
        // Draw placeholder filling the slot
        ctx.fillStyle = "#2d2d44";
        ctx.fillRect(drawX, 0, thumb.width, hostHeight);

        // Add subtle loading indicator
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(drawX + 0.5, 0.5, thumb.width - 1, hostHeight - 1);
        ctx.setLineDash([]);
      }
    }

    // Draw loading segment overlays (network activity indicator)
    if (this._loadingSegments.size > 0) {
      this._drawLoadingSegmentOverlays(ctx, canvasLeft, canvasRight, hostHeight);
    }

    // Draw media engine loading overlay (FFmpeg processing indicator)
    if (this._mediaEngineLoading) {
      this._drawMediaEngineLoadingOverlay(ctx, canvasWidth, hostHeight);
    }
  }

  /**
   * Draw loading overlay when media engine is initializing (FFmpeg processing).
   * Shows a pulsing gradient effect to indicate processing is in progress.
   */
  private _drawMediaEngineLoadingOverlay(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    hostHeight: number,
  ): void {
    // Semi-transparent overlay
    ctx.fillStyle = "rgba(26, 26, 46, 0.7)";
    ctx.fillRect(0, 0, canvasWidth, hostHeight);

    // Animated shimmer effect using time-based animation
    const time = Date.now() / 1000;
    const shimmerOffset = (Math.sin(time * 2) + 1) / 2; // 0-1 oscillation
    const shimmerX = shimmerOffset * canvasWidth;
    
    // Create shimmer gradient
    const gradient = ctx.createLinearGradient(shimmerX - 100, 0, shimmerX + 100, 0);
    gradient.addColorStop(0, "rgba(100, 100, 140, 0)");
    gradient.addColorStop(0.5, "rgba(100, 100, 140, 0.3)");
    gradient.addColorStop(1, "rgba(100, 100, 140, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, hostHeight);

    // "Processing..." text
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Processing media...", canvasWidth / 2, hostHeight / 2);
    
    // Schedule redraw for animation
    requestAnimationFrame(() => {
      if (this._mediaEngineLoading) {
        this.runThumbnailUpdate();
      }
    });
  }

  /**
   * Draw subtle overlay on segments currently being loaded from network.
   * Shows a blue shimmer effect over the time range being fetched.
   */
  private _drawLoadingSegmentOverlays(
    ctx: CanvasRenderingContext2D,
    canvasLeft: number,
    canvasRight: number,
    hostHeight: number,
  ): void {
    const targetElement = this.targetElement;
    if (!targetElement) return;

    // Get time range for the strip
    const startTimeMs: number = isEFVideo(targetElement)
      ? Number(targetElement.trimstart ?? targetElement.sourcein ?? 0)
      : 0;
    const endTimeMs: number = isEFVideo(targetElement)
      ? Number(targetElement.trimend ?? targetElement.sourceout ?? targetElement.durationMs ?? 0)
      : Number(targetElement.durationMs ?? 0);

    const timeRange: number = endTimeMs - startTimeMs;
    if (timeRange <= 0) return;

    const stripWidth = this._stripWidth;
    if (stripWidth <= 0) return;

    // Draw each loading segment
    for (const [, [segStartMs, segEndMs]] of this._loadingSegments) {
      // Convert time range to pixel positions
      const startFraction = Math.max(0, (segStartMs - startTimeMs) / timeRange);
      const endFraction = Math.min(1, (segEndMs - startTimeMs) / timeRange);

      const pixelStart = startFraction * stripWidth;
      const pixelEnd = endFraction * stripWidth;

      // Check if this segment is visible in the current canvas area
      if (pixelEnd < canvasLeft || pixelStart > canvasRight) continue;

      // Clamp to canvas bounds
      const drawStart = Math.max(pixelStart - canvasLeft, 0);
      const drawEnd = Math.min(pixelEnd - canvasLeft, canvasRight - canvasLeft);
      const drawWidth = drawEnd - drawStart;

      if (drawWidth <= 0) continue;

      // Draw subtle blue shimmer overlay
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.fillRect(drawStart, 0, drawWidth, hostHeight);

      // Add subtle animated shimmer effect (horizontal gradient)
      const gradient = ctx.createLinearGradient(drawStart, 0, drawStart + drawWidth, 0);
      gradient.addColorStop(0, "rgba(59, 130, 246, 0)");
      gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.15)");
      gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(drawStart, 0, drawWidth, hostHeight);

      // Add top border for emphasis
      ctx.fillStyle = "rgba(59, 130, 246, 0.5)";
      ctx.fillRect(drawStart, 0, drawWidth, 2);
    }
  }

  /**
   * Schedule thumbnail capture with progressive loading for responsive UI.
   */
  private async scheduleThumbnailCapture(
    thumbnails: ThumbnailRenderInfo[],
    targetElement: EFVideo | EFTimegroup,
  ): Promise<void> {
    // Call directly - the progressive batch loading handles UI responsiveness
    return this.loadMissingThumbnails(thumbnails, targetElement);
  }

  /**
   * Get visible thumbnail range based on viewport (for virtual rendering)
   */
  private getVisibleRange(): { left: number; right: number } {
    const hostWidth = this.clientWidth || this._stripWidth;
    const viewportScrollLeft = this._timelineState?.viewportScrollLeft ?? 0;
    const viewportWidth = this._timelineState?.viewportWidth ?? hostWidth;
    
    const left = Math.max(0, viewportScrollLeft - VIRTUAL_RENDER_PADDING_PX);
    const right = viewportScrollLeft + viewportWidth + VIRTUAL_RENDER_PADDING_PX;
    
    return { left, right };
  }

  /**
   * Load missing thumbnails using batch extraction with progressive loading.
   * Only loads thumbnails visible in the viewport (virtual rendering).
   */
  private async loadMissingThumbnails(
    thumbnails: ThumbnailRenderInfo[],
    targetElement: EFVideo | EFTimegroup,
  ): Promise<void> {
    // Prevent concurrent capture operations
    if (this._captureInProgress) {
      console.log("[ThumbnailStrip] Skipping - capture already in progress");
      return;
    }
    
    // Get visible range for virtual rendering
    const visibleRange = this.getVisibleRange();
    
    // Filter to only missing thumbnails that are VISIBLE in the viewport
    const missingThumbnails = thumbnails.filter((t) => {
      if (t.status !== "missing" && t.status !== "near-hit") return false;
      // Check if thumbnail is within visible range
      const thumbRight = t.x + t.width;
      return thumbRight >= visibleRange.left && t.x <= visibleRange.right;
    });

    console.log("[ThumbnailStrip] loadMissingThumbnails", {
      total: thumbnails.length,
      visible: missingThumbnails.length,
      visibleRange,
      targetId: (targetElement as HTMLElement)?.id,
    });

    if (missingThumbnails.length === 0) {
      return;
    }
    
    this._captureInProgress = true;

    // Update status to loading
    for (const thumb of missingThumbnails) {
      thumb.status = "loading";
    }

    const timestamps = missingThumbnails.map((t) => t.timeMs);
    const cacheId = getElementCacheId(targetElement);

    // Handle timegroup targets using captureBatch with progressive loading
    if (isEFTimegroup(targetElement)) {
      // Calculate scale based on strip height vs timegroup height
      const timegroupHeight = targetElement.offsetHeight || 1080;
      const timegroupWidth = targetElement.offsetWidth || 1920;
      let scale = Math.min(1, this._stripHeight / timegroupHeight);
      
      // Enforce max canvas dimension limits for thumbnail captures
      const captureScale = Math.min(scale, MAX_THUMBNAIL_CANVAS_WIDTH / timegroupWidth);
      scale = captureScale;

      // Process thumbnails in batches for progressive loading
      for (let batchStart = 0; batchStart < timestamps.length; batchStart += MAX_TIMEGROUP_THUMBNAILS_PER_BATCH) {
        const batchEnd = Math.min(batchStart + MAX_TIMEGROUP_THUMBNAILS_PER_BATCH, timestamps.length);
        const batchTimestamps = timestamps.slice(batchStart, batchEnd);
        const batchThumbnails = missingThumbnails.slice(batchStart, batchEnd);

        try {
          const batchStartTime = performance.now();
          
          const canvases = await targetElement.captureBatch(batchTimestamps, {
            scale,
            contentReadyMode: "immediate",
          });
          
          const captureTime = performance.now() - batchStartTime;

          // Convert canvases to ImageData and update thumbnails
          const convertStartTime = performance.now();
          for (let i = 0; i < batchThumbnails.length; i++) {
            const thumb = batchThumbnails[i];
            const canvas = canvases[i];

            if (thumb && canvas) {
              const imageData = this.canvasToImageData(canvas);

              if (imageData) {
                const cacheKey = getThumbnailCacheKey(cacheId, thumb.timeMs);
                thumbnailImageCache.set(cacheKey, imageData);
                thumb.imageData = imageData;
                thumb.status = "exact-hit";
              }
            }
          }
          const convertTime = performance.now() - convertStartTime;

          // Redraw after each batch for progressive visual feedback
          const drawStartTime = performance.now();
          await this.drawThumbnails(thumbnails);
          const drawTime = performance.now() - drawStartTime;
          
          const totalTime = performance.now() - batchStartTime;
          console.log(`[ThumbnailStrip] batch ${batchStart}-${batchEnd}: capture=${captureTime.toFixed(0)}ms, convert=${convertTime.toFixed(0)}ms, draw=${drawTime.toFixed(0)}ms, total=${totalTime.toFixed(0)}ms`);

          // Yield to main thread between batches for UI responsiveness
          if (batchEnd < timestamps.length) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
        } catch (error) {
          console.warn("Failed to capture timegroup thumbnails batch:", error);
          // Reset failed thumbnails to missing so they can be retried
          for (const thumb of batchThumbnails) {
            if (thumb.status === "loading") {
              thumb.status = "missing";
            }
          }
        }
      }

      this._captureInProgress = false;
      return;
    }

    // Handle video targets using MediaEngine
    // Ensure media engine is ready before attempting extraction
    if (targetElement.mediaEngineTask) {
      await targetElement.mediaEngineTask.taskComplete;
    }
    
    const mediaEngine = targetElement.mediaEngineTask?.value;
    if (!mediaEngine) {
      return;
    }

    // Mark all as loading (video targets)
    for (const thumb of missingThumbnails) {
      thumb.status = "loading";
    }

    const videoTimestamps = missingThumbnails.map((t) => t.timeMs);

    try {
      const thumbnailResults = await mediaEngine.extractThumbnails(videoTimestamps);

      // Convert canvases to ImageData and update thumbnails
      for (let i = 0; i < missingThumbnails.length; i++) {
        const thumb = missingThumbnails[i];
        const thumbnailResult = thumbnailResults[i];

        if (thumb && thumbnailResult) {
          const imageData = this.canvasToImageData(thumbnailResult.thumbnail);

          if (imageData) {
            const cacheKey = getThumbnailCacheKey(cacheId, thumb.timeMs);
            thumbnailImageCache.set(cacheKey, imageData);
            thumb.imageData = imageData;
            thumb.status = "exact-hit";
          }
        }
      }
    } catch (error) {
      console.warn("Failed to extract video thumbnails:", error);
    } finally {
      this._captureInProgress = false;
    }

    // Redraw with newly loaded thumbnails
    await this.drawThumbnails(thumbnails);
  }

  /**
   * Convert Canvas to ImageData for caching
   */
  private canvasToImageData(
    canvas: HTMLCanvasElement | OffscreenCanvas,
  ): ImageData | null {
    // Extract ImageData from canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  render() {
    return html`
      <canvas ${ref(this.canvasRef)}></canvas>
      ${this.thumbnailRenderTask.render({
        pending: () => html``,
        complete: () => html``,
        error: (e) =>
          html`<div class="error">Error loading thumbnails: ${e}</div>`,
      })}
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ef-thumbnail-strip": EFThumbnailStrip;
  }
}
