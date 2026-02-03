import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref, type Ref } from "lit/directives/ref.js";

import { EFTimegroup } from "../../../elements/EFTimegroup.js";
import { EFVideo } from "../../../elements/EFVideo.js";
import { TargetController } from "../../../elements/TargetController.js";
import { ThumbnailExtractor } from "../../../elements/EFMedia/shared/ThumbnailExtractor.js";
import type { BaseMediaEngine } from "../../../elements/EFMedia/BaseMediaEngine.js";
import { 
  generateThumbnailsFromClone,
  type GeneratedThumbnail,
  type ThumbnailQueue 
} from "../../../preview/renderTimegroupToCanvas.js";
import { createPreviewContainer } from "../../../preview/previewTypes.js";
import { quantizeToFrameTimeMs } from "../../../utils/frameTime.js";
import { TWMixin } from "../../TWMixin.js";
import {
  timelineStateContext,
  type TimelineState,
} from "../timelineStateContext.js";
import {
  previewSettingsContext,
  type PreviewSettings,
} from "../../previewSettingsContext.js";

/** Padding for virtual rendering */
const VIRTUAL_RENDER_PADDING_PX = 100;


/**
 * Mutable queue for timestamp generation.
 * Allows updating timestamps while generator is consuming them.
 */
class MutableTimestampQueue implements ThumbnailQueue {
  #timestamps: number[] = [];

  /** Replace entire queue with new timestamps (sorted) */
  reset(timestamps: number[]): void {
    this.#timestamps = [...timestamps].sort((a, b) => a - b);
  }

  /** Keep only these specific timestamps (maintains order) */
  retainOnly(timestamps: number[]): void {
    const keep = new Set(timestamps);
    this.#timestamps = this.#timestamps.filter(t => keep.has(t));
  }

  /** Append timestamps to end (sorted) */
  append(timestamps: number[]): void {
    this.#timestamps.push(...[...timestamps].sort((a, b) => a - b));
  }

  /** Get next timestamp (removes from front) */
  shift(): number | undefined {
    return this.#timestamps.shift();
  }

  /** Get remaining timestamps without modifying queue */
  remaining(): number[] {
    return [...this.#timestamps];
  }

  /** Check if queue is empty */
  isEmpty(): boolean {
    return this.#timestamps.length === 0;
  }
}

/**
 * Descriptor for a thumbnail to render
 */
interface ThumbnailDescriptor {
  timeMs: number;
  x: number;
  width: number;
  height: number;
}

/**
 * Result of thumbnail rendering (canvas or error)
 */
interface ThumbnailResult {
  canvas: CanvasImageSource | null;
  error?: Error;
}

/**
 * Thumbnail strip component that renders thumbnails for video or timegroup elements.
 * 
 * Features:
 * - Targets ef-video or root ef-timegroup via target attribute
 * - Batch video thumbnail extraction via ThumbnailExtractor
 * - Canvas rendering for timegroups at low resolution
 * - Viewport-based lazy loading with scroll calculation
 * - Fixed visual spacing (consistent at all zoom levels)
 * - Error indicators for failed thumbnails
 */
@customElement("ef-thumbnail-strip")
export class EFThumbnailStrip extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .thumbnail-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .error-message {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 8px;
        color: rgb(239, 68, 68);
        font-size: 12px;
        background: rgba(239, 68, 68, 0.1);
      }

      canvas {
        position: absolute;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
      }
    `,
  ];

  @property({ type: String })
  target = "";

  @property({ attribute: false })
  targetElement: Element | null = null;

  @property({ type: Number, attribute: "thumbnail-height" })
  thumbnailHeight = 24;

  @property({ type: Number, attribute: "thumbnail-spacing-px" })
  thumbnailSpacingPx = 48;

  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs = 0.04;

  @consume({ context: timelineStateContext, subscribe: true })
  @state()
  timelineState?: TimelineState;
  
  @consume({ context: previewSettingsContext, subscribe: true })
  @state()
  previewSettings?: PreviewSettings;

  @state()
  thumbnailDimensions = { width: 0, height: 0 };

  #targetController?: TargetController;
  #abortController: AbortController | null = null;
  #renderRequested = false;
  #canvasContainer: Ref<HTMLDivElement> = createRef();
  #lastRequiredTimestamps = "";
  #thumbnailCache = new Map<number, CanvasImageSource>();
  
  // Timegroup thumbnail generation state
  #timegroupQueue = new MutableTimestampQueue();
  #timegroupClone: { clone: EFTimegroup; container: HTMLElement; cleanup: () => void } | null = null;
  #timegroupGenerator: AsyncGenerator<GeneratedThumbnail> | null = null;
  #timegroupGeneratorAbort: AbortController | null = null;
  #previewContainer: HTMLDivElement | null = null;
  #updateInProgress = false; // Lock to prevent concurrent updates
  #consumerRunning = false; // Lock to prevent concurrent consumers
  #pendingTimestamps = new Set<number>(); // Timestamps requested while update in progress
  #retryScheduled = false; // Flag to prevent duplicate retry schedules
  #thumbnailPhase: number = 0; // Phase offset for thumbnail grid
  #previousPixelsPerMs: number | null = null; // Track zoom changes

  /**
   * Check if target is valid (EFVideo or root EFTimegroup)
   */
  get isValidTarget(): boolean {
    const el = this.targetElement;
    if (!el) return false;

    if (el instanceof EFVideo) return true;

    if (el instanceof EFTimegroup) {
      // Only root timegroups
      return (el as any).isRootTimegroup === true;
    }

    return false;
  }

  get #timelineState(): TimelineState | undefined {
    return this.timelineState;
  }

  get #thumbnailDimensions() {
    return this.thumbnailDimensions;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Only use TargetController if target is set and targetElement is not directly set
    if (this.target && !this.targetElement) {
      this.#targetController = new TargetController(this);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#abortController?.abort();
    this.#cleanupTimegroupGenerator();
  }

  protected willUpdate(
    changedProperties: Map<string | number | symbol, unknown>,
  ): void {
    super.willUpdate(changedProperties);

    // Create TargetController if target is set and targetElement is not directly set
    if (changedProperties.has("target")) {
      if (this.target && !this.targetElement && !this.#targetController) {
        this.#targetController = new TargetController(this);
      }
    }

    // Recalculate thumbnail dimensions if target changed
    if (changedProperties.has("targetElement") || changedProperties.has("thumbnailHeight")) {
      this.thumbnailDimensions = this.#calculateThumbnailDimensions();
    }
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);

    // Trigger render when relevant properties change
    if (
      changedProperties.has("targetElement") ||
      changedProperties.has("thumbnailSpacingPx") ||
      changedProperties.has("pixelsPerMs") ||
      changedProperties.has("thumbnailHeight") ||
      changedProperties.has("timelineState")
    ) {
      this.#scheduleRender();
    }
  }

  /**
   * Calculate thumbnail dimensions from target element's actual bounds
   */
  #calculateThumbnailDimensions(): { width: number; height: number } {
    const el = this.targetElement;
    if (!el) return { width: 0, height: 0 };

    // Get actual visible bounds from DOM
    const bounds = el.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      // Element not yet rendered or no size, use default aspect ratio
      return { width: this.thumbnailHeight * (16 / 9), height: this.thumbnailHeight };
    }

    const aspectRatio = bounds.width / bounds.height;
    const width = Math.round(this.thumbnailHeight * aspectRatio);

    return { width, height: this.thumbnailHeight };
  }

  /**
   * Calculate visible thumbnails based on viewport
   */
  #calculateVisibleThumbnails(): ThumbnailDescriptor[] {
    if (!this.isValidTarget) return [];

    const element = this.targetElement;
    if (!element) return [];

    const scrollLeft = this.#timelineState?.viewportScrollLeft ?? 0;
    const viewportWidth = this.#timelineState?.viewportWidth ?? 800;
    const pixelsPerMs = this.#timelineState?.pixelsPerMs ?? this.pixelsPerMs;

    const durationMs = (element as any).durationMs ?? 0;
    if (durationMs === 0) return [];

    const trackWidthPx = durationMs * pixelsPerMs;

    // Get FPS for quantization
    const fps = (element as any).fps ?? 30;

    const visibleStartPx = scrollLeft - VIRTUAL_RENDER_PADDING_PX;
    const visibleEndPx = scrollLeft + viewportWidth + VIRTUAL_RENDER_PADDING_PX;

    const thumbnails: ThumbnailDescriptor[] = [];
    const { width, height } = this.#thumbnailDimensions;
    
    const thumbnailStride = this.thumbnailSpacingPx;
    
    // Detect zoom by checking if pixelsPerMs changed
    const isZoom = this.#previousPixelsPerMs !== null && this.#previousPixelsPerMs !== pixelsPerMs;
    
    // Check if track is narrower than viewport (fully visible, no scrolling)
    const trackFitsInViewport = trackWidthPx <= viewportWidth;
    
    if (this.#previousPixelsPerMs === null) {
      // First render: align grid to track start (t=0)
      this.#thumbnailPhase = 0;
    } else if (isZoom) {
      // On zoom: if track fits in viewport, always align to t=0
      // Otherwise, snap a thumbnail to near the left edge of viewport
      if (trackFitsInViewport) {
        this.#thumbnailPhase = 0;
      } else {
        this.#thumbnailPhase = scrollLeft % thumbnailStride;
      }
    } else if (scrollLeft < thumbnailStride) {
      // When scrolled near the start, realign to t=0 to avoid left gap
      this.#thumbnailPhase = 0;
    }
    // During normal scroll: phase unchanged, grid scrolls naturally with track
    
    this.#previousPixelsPerMs = pixelsPerMs;
    
    // Generate thumbnail grid anchored at phase offset
    // Each thumbnail is at absolute track position: phase + (i * stride)
    // This means grid is stable in track space (scrolls naturally)
    const startIndex = Math.max(0, Math.floor((visibleStartPx - this.#thumbnailPhase) / thumbnailStride));
    const endIndex = Math.ceil((visibleEndPx - this.#thumbnailPhase) / thumbnailStride);
    
    for (let i = startIndex; i <= endIndex; i++) {
      const thumbX = this.#thumbnailPhase + (i * thumbnailStride);
      
      // Only include if within track bounds
      if (thumbX >= 0 && thumbX < trackWidthPx) {
        // Convert position to time (leading edge)
        const rawTimeMs = thumbX / pixelsPerMs;
        const timeMs = quantizeToFrameTimeMs(rawTimeMs, fps);
        
        if (timeMs >= 0 && timeMs < durationMs) {
          thumbnails.push({ timeMs, x: thumbX, width, height });
        }
      }
    }

    return thumbnails;
  }

  /**
   * Schedule thumbnail render on next frame
   */
  #scheduleRender(): void {
    if (this.#renderRequested) return;
    this.#renderRequested = true;

    requestAnimationFrame(() => {
      this.#renderRequested = false;
      this.#renderThumbnails();
    });
  }

  /**
   * Render thumbnails with cancellation support
   */
  async #renderThumbnails(): Promise<void> {
    // Cancel previous render
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    const signal = this.#abortController.signal;

    const visibleThumbnails = this.#calculateVisibleThumbnails();
    if (visibleThumbnails.length === 0) {
      this.#clearCanvas();
      return;
    }

    // Check if required timestamps changed
    const requiredTimestamps = visibleThumbnails.map(t => t.timeMs);
    const timestampsString = requiredTimestamps.join(", ");
    if (timestampsString !== this.#lastRequiredTimestamps) {
      this.#lastRequiredTimestamps = timestampsString;
      
      // Update capture queue
      if (this.targetElement instanceof EFVideo) {
        this.#updateVideoCapture(requiredTimestamps);
      } else if (this.targetElement instanceof EFTimegroup) {
        this.#updateTimegroupCapture(requiredTimestamps);
      }
    }

    if (signal.aborted) return;

    // Draw thumbnails - use nearest neighbor if exact timestamp not cached
    const maxNeighborDistanceMs = 3000; // Don't use thumbnails more than 3s away
    const results: ThumbnailResult[] = visibleThumbnails.map(t => {
      let canvas = this.#thumbnailCache.get(t.timeMs);
      
      // If exact match not found, find nearest cached thumbnail
      if (!canvas) {
        let nearestTimeMs: number | null = null;
        let minDistance = Infinity;
        
        for (const cachedTimeMs of this.#thumbnailCache.keys()) {
          const distance = Math.abs(cachedTimeMs - t.timeMs);
          if (distance < minDistance && distance <= maxNeighborDistanceMs) {
            minDistance = distance;
            nearestTimeMs = cachedTimeMs;
          }
        }
        
        if (nearestTimeMs !== null) {
          canvas = this.#thumbnailCache.get(nearestTimeMs);
        }
      }
      
      return { canvas: canvas ?? null };
    });
    this.#drawThumbnails(visibleThumbnails, results);
  }

  /**
   * Update video thumbnail capture
   */
  async #updateVideoCapture(timestamps: number[]): Promise<void> {
    const video = this.targetElement as EFVideo;
    if (!video) return;

    // Filter out cached timestamps
    const uncached = timestamps.filter(t => !this.#thumbnailCache.has(t));
    if (uncached.length === 0) return;

    const mediaEngineTask = video.mediaEngineTask;
    if (!mediaEngineTask) return;

    const mediaEngine = await mediaEngineTask.taskComplete;
    if (!mediaEngine) return;

    const sourceTimestamps = uncached.map(t => this.#getSourceTimeMs(t));

    const extractor = new ThumbnailExtractor(mediaEngine as unknown as BaseMediaEngine);
    const scrubRendition = mediaEngine.videoRendition;
    if (!scrubRendition) return;

    const results = await extractor.extractThumbnails(
      sourceTimestamps,
      scrubRendition,
      video.durationMs ?? 0,
    );

    // Store in cache and trigger redraw
    for (let i = 0; i < uncached.length; i++) {
      const thumbnail = results[i]?.thumbnail;
      const timestamp = uncached[i];
      if (thumbnail && timestamp !== undefined) {
        this.#thumbnailCache.set(timestamp, thumbnail);
      }
    }
    
    this.#scheduleRender();
  }

  /**
   * Update timegroup thumbnail capture using mutable queue
   */
  async #updateTimegroupCapture(timestamps: number[]): Promise<void> {
    const timegroup = this.targetElement as EFTimegroup;
    if (!timegroup) return;

    // Filter out cached timestamps
    const uncached = timestamps.filter(t => !this.#thumbnailCache.has(t)).sort((a, b) => a - b);
    if (uncached.length === 0) {
      return;
    }
    
    // CRITICAL: If update already in progress, REPLACE pending (not add)
    // We only want the LATEST required timestamps, not a union of all previous ones
    if (this.#updateInProgress) {
      // Clear old pending and replace with latest
      this.#pendingTimestamps.clear();
      uncached.forEach(t => this.#pendingTimestamps.add(t));
      
      // Schedule a retry (debounced via RAF)
      if (!this.#retryScheduled) {
        this.#retryScheduled = true;
        requestAnimationFrame(() => {
          this.#retryScheduled = false;
          if (this.#pendingTimestamps.size > 0) {
            const pending = Array.from(this.#pendingTimestamps);
            this.#pendingTimestamps.clear();
            this.#updateTimegroupCapture(pending);
          }
        });
      }
      return;
    }
    this.#updateInProgress = true;

    try {
      if (this.#timegroupGenerator) {
        // Generator is running - abort and reset queue to exactly what we need now
        // Abort in-flight capture
        this.#timegroupGeneratorAbort?.abort();
        
        // Create new abort controller for the updated queue
        this.#timegroupGeneratorAbort = new AbortController();
        
        // Reset queue to exactly what we need now
        this.#timegroupQueue.reset(uncached);
      } else if (this.#timegroupClone) {
        // Generator finished, restart with existing clone
        this.#timegroupQueue.reset(uncached);
        
        // Create new abort controller
        this.#timegroupGeneratorAbort = new AbortController();
        
        this.#timegroupGenerator = generateThumbnailsFromClone(
          this.#timegroupClone.clone,
          this.#previewContainer!,
          this.#timegroupQueue,
          {
            scale: 0.25,
            contentReadyMode: "blocking",
            blockingTimeoutMs: 1000,
            signal: this.#timegroupGeneratorAbort.signal,
          },
        );
        await this.#consumeTimegroupGenerator();
      } else {
        // No generator or clone, start fresh
        await this.#startTimegroupGenerator(timegroup, uncached);
      }
    } finally {
      this.#updateInProgress = false;
      
      // Check if there are pending timestamps that need processing
      // This happens when updates were skipped while this update was in progress
      if (this.#pendingTimestamps.size > 0 && !this.#retryScheduled) {
        this.#retryScheduled = true;
        requestAnimationFrame(() => {
          this.#retryScheduled = false;
          if (this.#pendingTimestamps.size > 0) {
            const pending = Array.from(this.#pendingTimestamps);
            this.#pendingTimestamps.clear();
            this.#updateTimegroupCapture(pending);
          }
        });
      }
    }
  }

  /**
   * Start timegroup thumbnail generator
   */
  async #startTimegroupGenerator(timegroup: EFTimegroup, timestamps: number[]): Promise<void> {
    // Create render clone
    this.#timegroupClone = await timegroup.createRenderClone();
    
    
    // Use the original container from createRenderClone (already configured)
    this.#previewContainer = this.#timegroupClone.container as HTMLDivElement;
    
    
    // CRITICAL: Wait for Lit to process shadow DOM updates after moving to new container
    await this.#timegroupClone.clone.updateComplete;
    
    // Also wait for all nested Lit elements to update
    const litElements = this.#previewContainer.querySelectorAll('*');
    const updatePromises: Promise<any>[] = [];
    for (const el of litElements) {
      if ('updateComplete' in el) {
        updatePromises.push((el as any).updateComplete);
      }
    }
    await Promise.all(updatePromises);
    
    // Wait AGAIN specifically for text segments (they may need to re-render after move)
    const textSegments = this.#previewContainer.querySelectorAll('ef-text-segment');
    const textUpdatePromises: Promise<any>[] = [];
    for (const seg of textSegments) {
      if ('updateComplete' in seg) {
        textUpdatePromises.push((seg as any).updateComplete);
      }
    }
    await Promise.all(textUpdatePromises);
    
    // CRITICAL: Wait for ef-text to split text into segments
    // EFText.connectedCallback schedules splitText in requestAnimationFrame
    // We must wait for that RAF to fire before capturing
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // WARMUP: Do a seek to the first timestamp to "prime" the clone
    if (timestamps.length > 0) {
      await this.#timegroupClone.clone.seekForRender(timestamps[0]);
    }
    
    // CRITICAL: Wait for fonts to load
    // Text won't render correctly if fonts aren't ready
    await document.fonts.ready;
    
    // CRITICAL: Wait for all images to load
    const images = this.#previewContainer.querySelectorAll('img');
    const imagePromises: Promise<void>[] = [];
    for (const img of images) {
      if (!img.complete) {
        imagePromises.push(new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Don't block on errors
          // Timeout after 5s
          setTimeout(() => resolve(), 5000);
        }));
      }
    }
    await Promise.all(imagePromises);
    
    // Initialize queue
    this.#timegroupQueue.reset(timestamps);
    
    // Create abort controller for this generator
    this.#timegroupGeneratorAbort = new AbortController();
    
    // Start generator using the fresh container
    this.#timegroupGenerator = generateThumbnailsFromClone(
      this.#timegroupClone.clone,
      this.#previewContainer,
      this.#timegroupQueue,
      {
        scale: 0.25,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 1000,
        signal: this.#timegroupGeneratorAbort.signal,
      },
    );
    
    // Consume generator (CRITICAL: Must await to prevent concurrent consumers)
    await this.#consumeTimegroupGenerator();
  }

  /**
   * Consume generator and handle cleanup
   */
  async #consumeTimegroupGenerator(): Promise<void> {
    // CRITICAL: Prevent concurrent consumers
    if (this.#consumerRunning) {
      return;
    }
    this.#consumerRunning = true;
    
    if (!this.#timegroupGenerator) {
      this.#consumerRunning = false;
      return;
    }

    try {
      for await (const { timeMs, canvas } of this.#timegroupGenerator) {
        this.#thumbnailCache.set(timeMs, canvas);
        this.#scheduleRender();
      }
    } catch (err) {
      console.warn("Timegroup thumbnail generation error:", err);
    } finally {
      // Generator finished, but keep clone alive for reuse
      this.#timegroupGenerator = null;
      this.#consumerRunning = false;
    }
  }

  /**
   * Cleanup timegroup generator and clone
   */
  #cleanupTimegroupGenerator(): void {
    // Abort any in-flight work
    this.#timegroupGeneratorAbort?.abort();
    this.#timegroupGeneratorAbort = null;
    
    this.#timegroupGenerator = null;
    
    // Remove preview container from DOM
    if (this.#previewContainer) {
      this.#previewContainer.remove();
      this.#previewContainer = null;
    }
    
    // Cleanup render clone
    if (this.#timegroupClone) {
      this.#timegroupClone.cleanup();
      this.#timegroupClone = null;
    }
  }

  /**
   * Clear all canvas elements
   */
  #clearCanvas(): void {
    const container = this.#canvasContainer.value;
    if (container) {
      container.innerHTML = "";
    }
  }

  /**
   * Translate composition time to source time for videos (handles trim)
   */
  #getSourceTimeMs(compositionTimeMs: number): number {
    const el = this.targetElement;
    if (el instanceof EFVideo) {
      return compositionTimeMs + (el.sourceStartMs ?? 0);
    }
    return compositionTimeMs;
  }

  /**
   * Draw thumbnails to canvas elements
   */
  #drawThumbnails(
    thumbnails: ThumbnailDescriptor[],
    results: ThumbnailResult[],
  ): void {
    const container = this.#canvasContainer.value;
    if (!container) return;

    // Clear existing canvases
    container.innerHTML = "";

    for (let i = 0; i < thumbnails.length; i++) {
      const thumbnail = thumbnails[i];
      const result = results[i];

      if (!thumbnail) continue;

      const canvas = document.createElement("canvas");
      canvas.width = thumbnail.width;
      canvas.height = thumbnail.height;
      canvas.style.left = `${thumbnail.x}px`;
      canvas.style.top = "0";
      canvas.style.width = `${thumbnail.width}px`;
      canvas.style.height = `${thumbnail.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      if (result?.canvas) {
        // Draw actual thumbnail
        ctx.drawImage(result.canvas, 0, 0, thumbnail.width, thumbnail.height);
        
        // Draw timestamp overlay if enabled
        if (this.previewSettings?.showThumbnailTimestamps) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(2, 2, 95, 16);
          ctx.fillStyle = "yellow";
          ctx.font = "11px monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(`${Math.round(thumbnail.timeMs)}ms`, 5, 4);
        }
      } else {
        // Draw placeholder with timestamp text
        ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
        ctx.fillRect(0, 0, thumbnail.width, thumbnail.height);
        
        ctx.strokeStyle = "rgba(150, 150, 150, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, thumbnail.width, thumbnail.height);
        
        ctx.fillStyle = "white";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.round(thumbnail.timeMs)}ms`, thumbnail.width / 2, thumbnail.height / 2);
      }

      container.appendChild(canvas);
    }
  }


  render() {
    // Error: No target specified (neither target string nor targetElement)
    if (!this.target && !this.targetElement) {
      return html`<div class="error-message">No target specified</div>`;
    }

    // Error: Target element not found (when using target string)
    if (this.target && !this.targetElement) {
      return html`<div class="error-message">
        Target element "${this.target}" not found
      </div>`;
    }

    // Error: Invalid target type
    if (!this.isValidTarget) {
      const elementType = (this.targetElement as any).tagName?.toLowerCase() || "unknown";
      return html`<div class="error-message">
        Invalid target: "${elementType}" must be ef-video or root ef-timegroup
      </div>`;
    }

    // Calculate track width to clip thumbnails at track end
    const element = this.targetElement;
    const durationMs = element ? (element as any).durationMs ?? 0 : 0;
    const pixelsPerMs = this.#timelineState?.pixelsPerMs ?? this.pixelsPerMs;
    const trackWidthPx = durationMs * pixelsPerMs;

    // Render canvas container with explicit width clipping
    return html`<div 
      class="thumbnail-container" 
      style="max-width: ${trackWidthPx}px;"
      ${ref(this.#canvasContainer)}
    ></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-thumbnail-strip": EFThumbnailStrip;
  }
}
