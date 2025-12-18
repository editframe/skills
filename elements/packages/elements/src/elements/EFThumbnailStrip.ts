import { Task } from "@lit/task";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import type { MediaEngine as ImportedMediaEngine } from "../transcoding/types/index.js";
import { OrderedLRUCache } from "../utils/LRUCache.js";
import type { EFVideo } from "./EFVideo.js";
import { TargetController } from "./TargetController.ts";

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
const THUMBNAIL_GAP = 1; // 1px gap between thumbnails
const STRIP_BORDER_PADDING = 4; // Account for border/padding in available height

interface ThumbnailSegment {
  segmentId: number;
  thumbnails: Array<{
    timeMs: number;
  }>;
}

interface ThumbnailLayout {
  count: number;
  segments: readonly ThumbnailSegment[];
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
 */
function calculateThumbnailLayout(
  stripWidth: number,
  thumbnailWidth: number,
  startTimeMs: number,
  endTimeMs: number,
  scrubSegmentDurationMs?: number,
): ThumbnailLayout {
  // Must have positive width and valid time range
  if (stripWidth <= 0 || thumbnailWidth <= 0 || endTimeMs <= startTimeMs) {
    return { count: 0, segments: [] };
  }

  // Simple calculation: how many full thumbnails fit, plus one more to fill the width
  const thumbnailPitch = thumbnailWidth + THUMBNAIL_GAP;
  const baseFitCount = Math.floor(stripWidth / thumbnailPitch);
  const count = Math.max(1, baseFitCount + 1); // Always one extra to fill width

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

  return { count, segments };
}

@customElement("ef-thumbnail-strip")
export class EFThumbnailStrip extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 48px; /* Default filmstrip height */
        background: #2a2a2a;
        border: 2px solid #333;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      canvas {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        image-rendering: pixelated; /* Keep thumbnails crisp */
        /* Width and height set programmatically to prevent CSS scaling */
      }
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(42, 42, 42, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: #ccc;
        font-weight: 500;
      }
    `,
  ];

  canvasRef = createRef<HTMLCanvasElement>();

  // Target video element using the same pattern as EFSurface
  // @ts-expect-error controller is intentionally not referenced directly to prevent GC
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used for side effects
  private _targetController: TargetController = new TargetController(
    this as any,
  );

  private _targetElement: EFVideo | null = null;

  @state()
  get targetElement(): EFVideo | null {
    return this._targetElement;
  }

  set targetElement(value: EFVideo | null) {
    const oldValue = this._targetElement;
    this._targetElement = value;

    // Clean up previous video property observer
    this._videoPropertyObserver?.disconnect();

    // When target element changes, set up property watching and media engine listener
    if (value && value !== oldValue) {
      // Watch for video property changes that affect thumbnails
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

      // Listen for media engine ready
      if (value.mediaEngineTask) {
        value.mediaEngineTask.taskComplete
          .then(() => {
            // When media engine is ready, retrigger thumbnails if we have width
            if (this._stripWidth > 0) {
              this.thumbnailLayoutTask.run();
            }
          })
          .catch(() => {
            // Ignore media engine errors
          });
      }
    }

    this.requestUpdate("targetElement", oldValue);
  }

  @property({ type: String })
  target = "";

  /**
   * Desired thumbnail width in pixels (height is determined by aspect ratio)
   * Number of thumbnails is derived from this and available strip width
   */
  @property({ type: Number, attribute: "thumbnail-width" })
  thumbnailWidth = 80;

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
  private _stripHeight = 48; // Default height, updated by ResizeObserver
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
    return this.renderThumbnails(
      layout,
      this.targetElement,
      this.thumbnailWidth,
    );
  }

  private resizeObserver?: ResizeObserver;
  private _thumbnailUpdateInProgress = false;
  private _pendingThumbnailUpdate = false;
  private _videoPropertyObserver?: MutationObserver;

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
      changedProperties.has("startTimeMs") ||
      changedProperties.has("endTimeMs") ||
      changedProperties.has("useIntrinsicDuration")
    ) {
      this.runThumbnailUpdate();
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
      thumbnailWidth,
      targetElement,
      startTimeMs,
      endTimeMs,
      useIntrinsicDuration,
      mediaEngine,
    ]: readonly [
      number,
      number,
      EFVideo | null,
      number | undefined,
      number | undefined,
      boolean,
      ImportedMediaEngine | null | undefined,
    ]) => {
      // Need valid dimensions and target element
      if (stripWidth <= 0 || !targetElement) {
        return { count: 0, segments: [] };
      }

      // IMPLEMENTATION GUIDELINES: Wait for media engine to be ready before generating thumbnails
      if (!mediaEngine) {
        // If no media engine yet, wait for it to be ready
        if (targetElement.mediaEngineTask) {
          await targetElement.mediaEngineTask.taskComplete;
          // Get the media engine after it's ready
          const readyMediaEngine = targetElement.mediaEngineTask.value;
          if (!readyMediaEngine) {
            return { count: 0, segments: [] };
          }
          // Continue with the ready media engine
          return this.calculateLayoutWithMediaEngine(
            stripWidth,
            thumbnailWidth,
            targetElement,
            startTimeMs,
            endTimeMs,
            useIntrinsicDuration,
            readyMediaEngine,
          );
        }
        return { count: 0, segments: [] };
      }

      // Media engine is ready, proceed with layout calculation
      return this.calculateLayoutWithMediaEngine(
        stripWidth,
        thumbnailWidth,
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
        this.thumbnailWidth,
        this.targetElement,
        this.startTimeMs,
        this.endTimeMs,
        this.useIntrinsicDuration,
        this.targetElement?.mediaEngineTask?.value,
      ] as const,
  });

  /**
   * Calculate layout with a ready media engine
   */
  private calculateLayoutWithMediaEngine(
    stripWidth: number,
    thumbnailWidth: number,
    targetElement: EFVideo,
    startTimeMs: number | undefined,
    endTimeMs: number | undefined,
    useIntrinsicDuration: boolean,
    mediaEngine: ImportedMediaEngine,
  ) {
    // Determine time range for thumbnails with correct timeline coordinate handling
    if (useIntrinsicDuration) {
      // INTRINSIC MODE: start-time-ms/end-time-ms are relative to source timeline (0 = source start)
      const effectiveStartMs = startTimeMs ?? 0;
      const effectiveEndMs =
        endTimeMs ?? targetElement.intrinsicDurationMs ?? 0;

      return this.generateLayoutFromTimeRange(
        stripWidth,
        thumbnailWidth,
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
      thumbnailWidth,
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
      effectiveStartMs,
      effectiveEndMs,
      scrubSegmentDurationMs,
    );

    return layout;
  }

  private thumbnailRenderTask = new Task(this, {
    autoRun: false,
    task: async ([layout, targetElement, thumbnailWidth]: readonly [
      ThumbnailLayout | null,
      EFVideo | null,
      number,
    ]) => {
      // Simplified task that delegates to renderThumbnails method
      if (!layout || !targetElement) {
        return [];
      }
      return this.renderThumbnails(layout, targetElement, thumbnailWidth);
    },
    args: () =>
      [
        this.thumbnailLayoutTask.value || null,
        this.targetElement,
        this.thumbnailWidth,
      ] as const,
  });

  /**
   * Render thumbnails with provided layout (main rendering logic)
   */
  private async renderThumbnails(
    layout: ThumbnailLayout,
    targetElement: EFVideo,
    thumbnailWidth: number,
  ): Promise<ThumbnailRenderInfo[]> {
    if (!layout || !targetElement || layout.count === 0) {
      return [];
    }

    const videoSrc = targetElement.src;
    const availableHeight = this._stripHeight - STRIP_BORDER_PADDING; // Account for border/padding

    const allThumbnails: ThumbnailRenderInfo[] = [];
    let thumbnailIndex = 0; // Track ordinal position

    // Process each segment
    for (const segment of layout.segments) {
      for (const thumbnail of segment.thumbnails) {
        const cacheKey = getThumbnailCacheKey(videoSrc, thumbnail.timeMs);

        // Try exact cache hit first
        let imageData = thumbnailImageCache.get(cacheKey);
        let status: ThumbnailRenderInfo["status"] = "exact-hit";
        let nearHitKey: string | undefined;

        if (!imageData) {
          // Try near cache hit within 5 seconds using proper range search
          const timeMinus = Math.max(0, thumbnail.timeMs - 5000);
          const timePlus = thumbnail.timeMs + 5000;

          // For range bounds, use raw timestamps (don't quantize the search range)
          const rangeStartKey = `${videoSrc}:${timeMinus}`;
          const rangeEndKey = `${videoSrc}:${timePlus}`;

          // Use findRange to find any cached items in this time window
          const nearHits = thumbnailImageCache.findRange(
            rangeStartKey,
            rangeEndKey,
          );

          // Filter to only include the same video source
          const sameVideoHits = nearHits.filter((hit) =>
            hit.key.startsWith(`${videoSrc}:`),
          );

          if (sameVideoHits.length > 0) {
            // Get the closest match by time from same video
            const nearestHit = sameVideoHits.reduce((closest, current) => {
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

        // Fixed integer positioning - no floating point
        const x = thumbnailIndex * (thumbnailWidth + THUMBNAIL_GAP);

        allThumbnails.push({
          timeMs: thumbnail.timeMs,
          segmentId: segment.segmentId,
          x,
          width: thumbnailWidth, // Always exactly 80px
          height: availableHeight, // Always exactly 44px
          status,
          imageData,
          nearHitKey,
        });

        thumbnailIndex++; // Increment ordinal position
      }
    }

    // Draw current state (cache hits and placeholders)
    await this.drawThumbnails(allThumbnails);

    // Load missing thumbnails from scrub tracks
    await this.loadMissingThumbnails(allThumbnails, targetElement);

    return allThumbnails;
  }

  connectedCallback() {
    super.connectedCallback();

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
  }

  /**
   * Draw thumbnails to the canvas with cache hits and placeholders
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

    // Set canvas to exact size we're drawing - prevents CSS scaling
    const dpr = window.devicePixelRatio || 1;

    // Set canvas buffer size for high DPI rendering
    canvas.width = this._stripWidth * dpr;
    canvas.height = this._stripHeight * dpr;

    // Set canvas DOM size to exactly what we're drawing - no CSS scaling
    canvas.style.width = `${this._stripWidth}px`;
    canvas.style.height = `${this._stripHeight}px`;

    // Scale the drawing context to match device pixel ratio
    ctx.scale(dpr, dpr);

    // Clear canvas (use logical pixel dimensions since context is scaled)
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, this._stripWidth, this._stripHeight);

    // Draw each thumbnail with proper aspect ratio and centering
    for (const thumb of thumbnails) {
      if (thumb.imageData) {
        // Draw cached thumbnail with aspect ratio preservation
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = thumb.imageData.width;
        tempCanvas.height = thumb.imageData.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) {
          continue;
        }
        tempCtx.putImageData(thumb.imageData, 0, 0);

        // Preserve aspect ratio within fixed container bounds
        const sourceAspect = thumb.imageData.width / thumb.imageData.height;
        const containerAspect = thumb.width / thumb.height;

        // Calculate aspect-ratio-preserving dimensions with integer coordinates
        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        if (sourceAspect > containerAspect) {
          // Source is wider - fit to container width, letterbox top/bottom
          drawWidth = thumb.width;
          drawHeight = Math.round(thumb.width / sourceAspect);
          drawX = thumb.x;
          drawY = Math.round((this._stripHeight - drawHeight) / 2);
        } else {
          // Source is taller - fit to container height, pillarbox left/right
          drawWidth = Math.round(thumb.height * sourceAspect);
          drawHeight = thumb.height;
          drawX = thumb.x + Math.round((thumb.width - drawWidth) / 2);
          drawY = Math.round((this._stripHeight - drawHeight) / 2);
        }

        // Draw with proper aspect ratio preservation
        ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);

        // Add subtle indicator for near hits
        if (thumb.status === "near-hit") {
          ctx.fillStyle = "rgba(255, 165, 0, 0.3)";
          ctx.fillRect(thumb.x, 0, thumb.width, 2);
        }
      } else {
        // Draw placeholder - center vertically in strip with integer positioning
        const placeholderY = Math.round((this._stripHeight - thumb.height) / 2);
        ctx.fillStyle = "#404040";
        ctx.fillRect(thumb.x, placeholderY, thumb.width, thumb.height);

        // Add subtle loading indicator with integer positioning
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(thumb.x, placeholderY, thumb.width, thumb.height);
        ctx.setLineDash([]);
      }
    }
  }

  /**
   * Load missing thumbnails using MediaEngine batch extraction
   */
  private async loadMissingThumbnails(
    thumbnails: ThumbnailRenderInfo[],
    targetElement: EFVideo,
  ): Promise<void> {
    // Ensure media engine is ready before attempting extraction
    if (targetElement.mediaEngineTask) {
      await targetElement.mediaEngineTask.taskComplete;
    }
    
    const mediaEngine = targetElement.mediaEngineTask?.value;
    if (!mediaEngine) {
      return;
    }

    // Get all missing thumbnails
    const missingThumbnails = thumbnails.filter(
      (t) => t.status === "missing" || t.status === "near-hit",
    );

    if (missingThumbnails.length === 0) {
      return;
    }

    // Update status to loading
    for (const thumb of missingThumbnails) {
      thumb.status = "loading";
    }

    // Batch extract all missing thumbnails using MediaEngine
    const timestamps = missingThumbnails.map((t) => t.timeMs);

    const thumbnailResults = await mediaEngine.extractThumbnails(timestamps);

    // Convert canvases to ImageData and update thumbnails
    for (let i = 0; i < missingThumbnails.length; i++) {
      const thumb = missingThumbnails[i];
      const thumbnailResult = thumbnailResults[i];

      if (thumb && thumbnailResult) {
        // Convert canvas to ImageData
        const imageData = this.canvasToImageData(thumbnailResult.thumbnail);

        if (imageData) {
          const cacheKey = getThumbnailCacheKey(
            targetElement.src,
            thumb.timeMs,
          );
          thumbnailImageCache.set(cacheKey, imageData);
          thumb.imageData = imageData;
          thumb.status = "exact-hit";
        }
      }
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
