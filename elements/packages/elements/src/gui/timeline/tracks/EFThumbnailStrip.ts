import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref, type Ref } from "lit/directives/ref.js";

import { EFTimegroup } from "../../../elements/EFTimegroup.js";
import { EFVideo } from "../../../elements/EFVideo.js";
import { TargetController } from "../../../elements/TargetController.js";
import { ThumbnailExtractor } from "../../../elements/EFMedia/shared/ThumbnailExtractor.js";
import type { BaseMediaEngine } from "../../../elements/EFMedia/BaseMediaEngine.js";
import { captureTimegroupAtTime } from "../../../preview/renderTimegroupToCanvas.js";
import { LRUCache } from "../../../utils/LRUCache.js";
import { TWMixin } from "../../TWMixin.js";
import {
  timelineStateContext,
  type TimelineState,
} from "../timelineStateContext.js";

/** Padding for virtual rendering */
const VIRTUAL_RENDER_PADDING_PX = 100;

/** Module-level cache for timegroup thumbnails */
const timegroupThumbnailCache = new LRUCache<string, HTMLCanvasElement>(100);

function getCacheKey(elementId: string, timeMs: number): string {
  return `${elementId}:${Math.round(timeMs)}`;
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

  @property({ type: Number, attribute: "thumbnail-height" })
  thumbnailHeight = 24;

  @property({ type: Number, attribute: "thumbnail-spacing-px" })
  thumbnailSpacingPx = 48;

  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs = 0.04;

  @state()
  targetElement: Element | null = null;

  @consume({ context: timelineStateContext, subscribe: true })
  @state()
  timelineState?: TimelineState;

  @state()
  thumbnailDimensions = { width: 0, height: 0 };

  #targetController?: TargetController;
  #abortController: AbortController | null = null;
  #renderRequested = false;
  #canvasContainer: Ref<HTMLDivElement> = createRef();

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
    if (this.target) {
      this.#targetController = new TargetController(this);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#abortController?.abort();
  }

  protected willUpdate(
    changedProperties: Map<string | number | symbol, unknown>,
  ): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("target")) {
      if (this.target && !this.#targetController) {
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

    const visibleStartPx = scrollLeft - VIRTUAL_RENDER_PADDING_PX;
    const visibleEndPx = scrollLeft + viewportWidth + VIRTUAL_RENDER_PADDING_PX;

    const durationMs = (element as any).durationMs ?? 0;
    if (durationMs === 0) return [];

    const trackWidthPx = durationMs * pixelsPerMs;

    const thumbnails: ThumbnailDescriptor[] = [];
    const { width, height } = this.#thumbnailDimensions;

    let x = 0;
    while (x < trackWidthPx) {
      // Only include thumbnails in visible range
      if (x + width >= visibleStartPx && x <= visibleEndPx) {
        const timeMs = x / pixelsPerMs;
        if (timeMs <= durationMs) {
          thumbnails.push({ timeMs, x, width, height });
        }
      }
      x += this.thumbnailSpacingPx;
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

    try {
      if (this.targetElement instanceof EFVideo) {
        await this.#renderVideoThumbnails(visibleThumbnails, signal);
      } else if (this.targetElement instanceof EFTimegroup) {
        await this.#renderTimegroupThumbnails(visibleThumbnails, signal);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.warn("Thumbnail rendering failed:", error);
      }
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
   * Render video thumbnails using ThumbnailExtractor
   */
  async #renderVideoThumbnails(
    thumbnails: ThumbnailDescriptor[],
    signal: AbortSignal,
  ): Promise<void> {
    const video = this.targetElement as EFVideo;
    if (!video) return;

    // Get media engine
    const mediaEngineTask = video.mediaEngineTask;
    if (!mediaEngineTask) {
      console.warn("No media engine task available");
      return;
    }

    const mediaEngine = await mediaEngineTask.taskComplete;
    if (!mediaEngine || signal.aborted) return;

    // Translate composition times to source times
    const timestamps = thumbnails.map((t) => this.#getSourceTimeMs(t.timeMs));

    // Batch extract thumbnails
    // MediaEngine implementations (JitMediaEngine, AssetMediaEngine) extend BaseMediaEngine
    const extractor = new ThumbnailExtractor(mediaEngine as unknown as BaseMediaEngine);
    const scrubRendition = mediaEngine.videoRendition;
    if (!scrubRendition) {
      console.warn("No video rendition available for thumbnails");
      return;
    }

    const results = await extractor.extractThumbnails(
      timestamps,
      scrubRendition,
      video.durationMs ?? 0,
      signal,
    );

    if (signal.aborted) return;

    // Render thumbnails to canvas
    this.#drawThumbnails(thumbnails, results.map((r) => r?.thumbnail ?? null));
  }

  /**
   * Render timegroup thumbnails using canvas rendering
   */
  async #renderTimegroupThumbnails(
    thumbnails: ThumbnailDescriptor[],
    signal: AbortSignal,
  ): Promise<void> {
    const timegroup = this.targetElement as EFTimegroup;
    if (!timegroup) return;

    const elementId = (timegroup as HTMLElement).id;
    const canvases: (HTMLCanvasElement | null)[] = [];

    // Render each thumbnail
    for (const thumbnail of thumbnails) {
      if (signal.aborted) return;

      const cacheKey = getCacheKey(elementId, thumbnail.timeMs);
      let canvas = timegroupThumbnailCache.get(cacheKey);

      if (!canvas) {
        // Render new thumbnail
        try {
          const result = await captureTimegroupAtTime(timegroup, {
            timeMs: thumbnail.timeMs,
            scale: 0.25, // Low resolution for performance
            contentReadyMode: "immediate",
          });

          if (result instanceof HTMLCanvasElement) {
            canvas = result;
            timegroupThumbnailCache.set(cacheKey, canvas);
          }
        } catch (error) {
          if (signal.aborted) return;
          console.warn("Failed to render timegroup thumbnail:", error);
        }
      }

      canvases.push(canvas ?? null);
    }

    if (signal.aborted) return;

    // Draw thumbnails to canvas
    this.#drawThumbnails(thumbnails, canvases);
  }

  /**
   * Draw thumbnails to canvas elements
   */
  #drawThumbnails(
    thumbnails: ThumbnailDescriptor[],
    sources: (HTMLCanvasElement | OffscreenCanvas | null)[],
  ): void {
    const container = this.#canvasContainer.value;
    if (!container) return;

    // Clear existing canvases
    container.innerHTML = "";

    for (let i = 0; i < thumbnails.length; i++) {
      const thumbnail = thumbnails[i];
      const source = sources[i];

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

      if (source) {
        // Draw thumbnail
        ctx.drawImage(source, 0, 0, thumbnail.width, thumbnail.height);
      } else {
        // Draw error indicator
        this.#drawErrorIndicator(ctx, thumbnail.width, thumbnail.height);
      }

      container.appendChild(canvas);
    }
  }

  /**
   * Draw error indicator for failed thumbnails
   */
  #drawErrorIndicator(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    // Red tint background
    ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
    ctx.fillRect(0, 0, width, height);

    // Draw X
    ctx.strokeStyle = "rgb(239, 68, 68)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(width - 4, height - 4);
    ctx.moveTo(width - 4, 4);
    ctx.lineTo(4, height - 4);
    ctx.stroke();
  }

  render() {
    // Error: No target specified
    if (!this.target) {
      return html`<div class="error-message">No target specified</div>`;
    }

    // Error: Target element not found
    if (!this.targetElement) {
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

    // Render canvas container
    return html`<div ${ref(this.#canvasContainer)}></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-thumbnail-strip": EFThumbnailStrip;
  }
}
