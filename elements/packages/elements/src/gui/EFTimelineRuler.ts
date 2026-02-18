import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { styleMap } from "lit/directives/style-map.js";
import { durationContext } from "./durationContext.js";
import {
  timelineStateContext,
  type TimelineState,
  DEFAULT_PIXELS_PER_MS,
} from "./timeline/timelineStateContext.js";

const MIN_LABEL_SPACING_PX = 80;
const MIN_FRAME_SPACING_PX = 5;

/** Maximum canvas width for ruler virtualization */
const MAX_RULER_CANVAS_WIDTH = 2000;

/** Buffer pixels on each side of viewport for smooth scrolling */
const RULER_CANVAS_BUFFER = 200;

/**
 * Quantize a time value to the nearest frame boundary.
 * This ensures frame markers align perfectly with playhead position.
 */
export function quantizeToFrameTimeMs(timeMs: number, fps: number): number {
  if (!fps || fps <= 0) return timeMs;
  const frameDurationS = 1 / fps;
  const timeSeconds = timeMs / 1000;
  const quantizedSeconds =
    Math.round(timeSeconds / frameDurationS) * frameDurationS;
  return quantizedSeconds * 1000;
}

/**
 * Calculate the duration of a single frame in milliseconds.
 */
export function calculateFrameIntervalMs(fps: number): number {
  if (fps <= 0) return 1000 / 30; // fallback to 30fps
  return 1000 / fps;
}

/**
 * Calculate pixels per frame given frame interval and zoom scale.
 * @param frameIntervalMs Duration of one frame in ms
 * @param pixelsPerMs Current zoom level (pixels per millisecond)
 */
export function calculatePixelsPerFrame(
  frameIntervalMs: number,
  pixelsPerMs: number,
): number {
  return frameIntervalMs * pixelsPerMs;
}

/**
 * Determine if frame markers should be visible at the current zoom level.
 * Frame markers appear when each frame is at least MIN_FRAME_SPACING_PX wide.
 */
export function shouldShowFrameMarkers(
  pixelsPerFrame: number,
  minSpacing: number = MIN_FRAME_SPACING_PX,
): boolean {
  return pixelsPerFrame >= minSpacing;
}

interface VisibleLabel {
  timeMs: number;
  viewportX: number;
  text: string;
}

@customElement("ef-timeline-ruler")
export class EFTimelineRuler extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        height: 100%;
        pointer-events: none;
      }
      
      .ruler-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      
      .canvas-viewport {
        position: absolute;
        top: 0;
        height: 100%;
        /* left and width set via inline styles for virtualization */
      }
      
      canvas {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
      }
      
      .label {
        position: absolute;
        top: 50%;
        font-size: 10px;
        color: var(--ef-color-text-muted);
        font-family: ui-monospace, monospace;
        white-space: nowrap;
        pointer-events: none;
        user-select: none;
      }
    `,
  ];

  @property({ type: Number, attribute: "duration-ms" })
  durationMs = 0;

  @consume({ context: durationContext, subscribe: true })
  contextDurationMs = 0;

  @consume({ context: timelineStateContext, subscribe: true })
  timelineState?: TimelineState;

  @property({ type: Number, attribute: "fps" })
  fps = 30;

  /** Full content width in pixels (for virtualization) */
  @property({ type: Number, attribute: "content-width" })
  contentWidth = 0;

  private containerRef = createRef<HTMLDivElement>();
  private canvasRef = createRef<HTMLCanvasElement>();
  private resizeObserver?: ResizeObserver;

  @state()
  private viewportWidth = 0;

  /** Canvas viewport left position for virtualization */
  @state()
  private _canvasViewportLeft = 0;

  /** Canvas viewport width for virtualization */
  @state()
  private _canvasViewportWidth = 0;

  /** Last rendered scroll position - for detecting scroll changes */
  private _lastRenderedScrollLeft = -1;

  /** Last rendered viewport width - for detecting viewport changes */
  private _lastRenderedViewportWidth = 0;

  get effectiveDurationMs(): number {
    return this.durationMs || this.contextDurationMs || 0;
  }

  get pixelsPerMs(): number {
    return this.timelineState?.pixelsPerMs ?? DEFAULT_PIXELS_PER_MS;
  }

  get scrollLeft(): number {
    return this.timelineState?.viewportScrollLeft ?? 0;
  }

  /**
   * Calculate canvas viewport bounds for virtualization.
   * Returns the left position and width of the canvas viewport.
   */
  private calculateCanvasViewport(): { left: number; width: number } {
    const totalWidth = this.contentWidth || this.viewportWidth;

    // If content is small enough, no virtualization needed
    if (totalWidth <= MAX_RULER_CANVAS_WIDTH) {
      return { left: 0, width: totalWidth };
    }

    // Get visible region from scroll position
    const viewportScrollLeft = this.scrollLeft;
    const viewportWidth =
      this.timelineState?.viewportWidth ?? this.viewportWidth;

    // Calculate canvas viewport with buffer for smooth scrolling
    const canvasLeft = Math.max(0, viewportScrollLeft - RULER_CANVAS_BUFFER);
    const canvasRight = Math.min(
      totalWidth,
      viewportScrollLeft + viewportWidth + RULER_CANVAS_BUFFER,
    );

    // Cap canvas width at maximum
    let canvasWidth = canvasRight - canvasLeft;
    if (canvasWidth > MAX_RULER_CANVAS_WIDTH) {
      canvasWidth = MAX_RULER_CANVAS_WIDTH;
    }

    return { left: canvasLeft, width: canvasWidth };
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  protected firstUpdated(): void {
    const container = this.containerRef.value;
    if (container) {
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const width = entry.contentRect.width;
          if (width !== this.viewportWidth) {
            this.viewportWidth = width;
          }
        }
      });
      this.resizeObserver.observe(container);
      this.viewportWidth = container.clientWidth;
    }
  }

  protected updated(
    changedProperties: Map<string | number | symbol, unknown>,
  ): void {
    // Check if scroll position or viewport changed from context
    const currentScrollLeft = this.scrollLeft;
    const currentViewportWidth =
      this.timelineState?.viewportWidth ?? this.viewportWidth;

    // Check if scroll changed, viewport changed, or other relevant properties changed
    const scrollChanged = currentScrollLeft !== this._lastRenderedScrollLeft;
    const viewportChanged =
      currentViewportWidth !== this._lastRenderedViewportWidth;
    const pixelsPerMsChanged =
      changedProperties.has("timelineState") ||
      changedProperties.has("pixelsPerMs");
    const contentWidthChanged = changedProperties.has("contentWidth");
    const durationChanged =
      changedProperties.has("durationMs") ||
      changedProperties.has("contextDurationMs");

    // Only render if something actually changed
    if (
      scrollChanged ||
      viewportChanged ||
      pixelsPerMsChanged ||
      contentWidthChanged ||
      durationChanged ||
      this._lastRenderedScrollLeft < 0
    ) {
      this.renderCanvas();
      this._lastRenderedScrollLeft = currentScrollLeft;
      this._lastRenderedViewportWidth = currentViewportWidth;
    }
  }

  private calculateLabelInterval(): number {
    const pixelsPerMs = this.pixelsPerMs;
    const pixelsPerSecond = pixelsPerMs * 1000;

    const intervals = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60];

    for (const intervalS of intervals) {
      const pixelsPerInterval = intervalS * pixelsPerSecond;
      if (pixelsPerInterval >= MIN_LABEL_SPACING_PX) {
        return intervalS * 1000;
      }
    }

    return 60000;
  }

  private getVisibleLabels(): VisibleLabel[] {
    const canvasWidth = this._canvasViewportWidth;
    if (canvasWidth <= 0) return [];

    const pixelsPerMs = this.pixelsPerMs;
    const canvasLeft = this._canvasViewportLeft;

    const intervalMs = this.calculateLabelInterval();

    // Generate labels for the canvas viewport range
    const visibleStartTimeMs = Math.max(
      0,
      canvasLeft / pixelsPerMs - intervalMs,
    );
    const visibleEndTimeMs =
      (canvasLeft + canvasWidth) / pixelsPerMs + intervalMs;

    const firstLabelIndex = Math.floor(visibleStartTimeMs / intervalMs);
    const lastLabelIndex = Math.ceil(visibleEndTimeMs / intervalMs);

    const labels: VisibleLabel[] = [];

    for (let i = firstLabelIndex; i <= lastLabelIndex; i++) {
      const timeMs = i * intervalMs;
      if (timeMs < 0) continue;

      const absoluteX = timeMs * pixelsPerMs;
      // Position relative to canvas viewport (canvas is positioned at canvasLeft)
      const viewportX = absoluteX - canvasLeft;

      if (viewportX >= -50 && viewportX <= canvasWidth + 50) {
        const timeSeconds = timeMs / 1000;
        const text =
          timeSeconds % 1 === 0
            ? `${timeSeconds}s`
            : `${timeSeconds.toFixed(1)}s`;

        labels.push({ timeMs, viewportX, text });
      }
    }

    return labels;
  }

  private renderCanvas(): void {
    const canvas = this.canvasRef.value;
    const container = this.containerRef.value;
    if (!canvas || !container) return;

    // Calculate virtualized canvas viewport
    const viewport = this.calculateCanvasViewport();
    this._canvasViewportLeft = viewport.left;
    this._canvasViewportWidth = viewport.width;

    const width = viewport.width;
    const height = container.getBoundingClientRect().height;

    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const pixelsPerMs = this.pixelsPerMs;
    const canvasLeft = viewport.left;

    // Time label ticks - more prominent
    ctx.strokeStyle =
      getComputedStyle(this).getPropertyValue("--ef-color-text-muted").trim() ||
      "rgb(156, 163, 175)";
    ctx.lineWidth = 1;

    const labelIntervalMs = this.calculateLabelInterval();
    // Fill the canvas viewport with ticks
    const visibleStartTimeMs = Math.max(
      0,
      canvasLeft / pixelsPerMs - labelIntervalMs,
    );
    const visibleEndTimeMs =
      (canvasLeft + width) / pixelsPerMs + labelIntervalMs;

    const firstTickIndex = Math.floor(visibleStartTimeMs / labelIntervalMs);
    const lastTickIndex = Math.ceil(visibleEndTimeMs / labelIntervalMs);

    for (let i = firstTickIndex; i <= lastTickIndex; i++) {
      const timeMs = i * labelIntervalMs;
      if (timeMs < 0) continue;

      const absoluteX = timeMs * pixelsPerMs;
      // Position relative to canvas viewport
      const canvasX = absoluteX - canvasLeft;

      if (canvasX >= -1 && canvasX <= width + 1) {
        ctx.beginPath();
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, height * 0.4);
        ctx.stroke();
      }
    }

    const frameIntervalMs = 1000 / this.fps;
    const pixelsPerFrame = frameIntervalMs * pixelsPerMs;

    if (pixelsPerFrame >= MIN_FRAME_SPACING_PX) {
      // Frame markers should be lighter than background to be visible
      ctx.strokeStyle =
        getComputedStyle(this)
          .getPropertyValue("--ef-color-border-subtle")
          .trim() || "rgb(107, 114, 128)";
      ctx.lineWidth = 1;

      const firstFrameIndex = Math.floor(visibleStartTimeMs / frameIntervalMs);
      const lastFrameIndex = Math.ceil(visibleEndTimeMs / frameIntervalMs);

      for (let i = firstFrameIndex; i <= lastFrameIndex; i++) {
        const timeMs = i * frameIntervalMs;
        if (timeMs < 0) continue;

        if (timeMs % labelIntervalMs === 0) continue;

        const absoluteX = timeMs * pixelsPerMs;
        // Position relative to canvas viewport
        const canvasX = absoluteX - canvasLeft;

        if (canvasX >= -1 && canvasX <= width + 1) {
          ctx.beginPath();
          ctx.moveTo(canvasX, 0);
          ctx.lineTo(canvasX, height * 0.25);
          ctx.stroke();
        }
      }
    }
  }

  render() {
    const visibleLabels = this.getVisibleLabels();

    const canvasViewportStyles = styleMap({
      left: `${this._canvasViewportLeft}px`,
      width: `${this._canvasViewportWidth}px`,
    });

    return html`
      <div ${ref(this.containerRef)} class="ruler-container">
        <div class="canvas-viewport" style=${canvasViewportStyles}>
          <canvas ${ref(this.canvasRef)}></canvas>
          ${visibleLabels.map(
            ({ viewportX, text }) => html`
            <span 
              class="label" 
              style="transform: translateX(${viewportX}px)"
            >${text}</span>
          `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-timeline-ruler": EFTimelineRuler;
  }
}
