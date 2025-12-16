import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { durationContext } from "./durationContext.js";
import {
  timelineStateContext,
  type TimelineState,
  DEFAULT_PIXELS_PER_MS,
} from "./timeline/timelineStateContext.js";

const MIN_LABEL_SPACING_PX = 80;
const MIN_FRAME_SPACING_PX = 5;

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
        position: absolute;
        inset: 0;
        overflow: hidden;
      }
      
      canvas {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      
      .label {
        position: absolute;
        top: 50%;
        font-size: 10px;
        color: rgb(156, 163, 175);
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

  private containerRef = createRef<HTMLDivElement>();
  private canvasRef = createRef<HTMLCanvasElement>();
  private resizeObserver?: ResizeObserver;

  @state()
  private viewportWidth = 0;

  get effectiveDurationMs(): number {
    return this.durationMs || this.contextDurationMs || 0;
  }

  get pixelsPerMs(): number {
    return this.timelineState?.pixelsPerMs ?? DEFAULT_PIXELS_PER_MS;
  }

  get scrollLeft(): number {
    return this.timelineState?.viewportScrollLeft ?? 0;
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
    if (this.containerRef.value) {
      this.resizeObserver = new ResizeObserver((entries) => {
        const width = entries[0].contentRect.width;
        if (width !== this.viewportWidth) {
          this.viewportWidth = width;
        }
      });
      this.resizeObserver.observe(this.containerRef.value);
      this.viewportWidth = this.containerRef.value.clientWidth;
    }
  }

  protected updated(): void {
    this.renderCanvas();
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
    if (this.viewportWidth <= 0) return [];

    const pixelsPerMs = this.pixelsPerMs;
    const scrollLeft = this.scrollLeft;
    const viewportWidth = this.viewportWidth;

    const intervalMs = this.calculateLabelInterval();

    // Generate labels for the entire viewport, regardless of content duration
    const visibleStartTimeMs = Math.max(
      0,
      scrollLeft / pixelsPerMs - intervalMs,
    );
    const visibleEndTimeMs =
      (scrollLeft + viewportWidth) / pixelsPerMs + intervalMs;

    const firstLabelIndex = Math.floor(visibleStartTimeMs / intervalMs);
    const lastLabelIndex = Math.ceil(visibleEndTimeMs / intervalMs);

    const labels: VisibleLabel[] = [];

    for (let i = firstLabelIndex; i <= lastLabelIndex; i++) {
      const timeMs = i * intervalMs;
      if (timeMs < 0) continue;

      const absoluteX = timeMs * pixelsPerMs;
      const viewportX = absoluteX - scrollLeft;

      if (viewportX >= -50 && viewportX <= viewportWidth + 50) {
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

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

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
    const scrollLeft = this.scrollLeft;

    // Time label ticks - more prominent (gray-400)
    ctx.strokeStyle = "rgb(156, 163, 175)";
    ctx.lineWidth = 1;

    const labelIntervalMs = this.calculateLabelInterval();
    // Fill the entire viewport with ticks, regardless of content duration
    const visibleStartTimeMs = Math.max(
      0,
      scrollLeft / pixelsPerMs - labelIntervalMs,
    );
    const visibleEndTimeMs =
      (scrollLeft + width) / pixelsPerMs + labelIntervalMs;

    const firstTickIndex = Math.floor(visibleStartTimeMs / labelIntervalMs);
    const lastTickIndex = Math.ceil(visibleEndTimeMs / labelIntervalMs);

    for (let i = firstTickIndex; i <= lastTickIndex; i++) {
      const timeMs = i * labelIntervalMs;
      if (timeMs < 0) continue;

      const absoluteX = timeMs * pixelsPerMs;
      const viewportX = absoluteX - scrollLeft;

      if (viewportX >= -1 && viewportX <= width + 1) {
        ctx.beginPath();
        ctx.moveTo(viewportX, 0);
        ctx.lineTo(viewportX, height * 0.4);
        ctx.stroke();
      }
    }

    const frameIntervalMs = 1000 / this.fps;
    const pixelsPerFrame = frameIntervalMs * pixelsPerMs;

    if (pixelsPerFrame >= MIN_FRAME_SPACING_PX) {
      // Frame markers should be lighter than background (gray-500) to be visible
      ctx.strokeStyle = "rgb(107, 114, 128)";
      ctx.lineWidth = 1;

      const firstFrameIndex = Math.floor(visibleStartTimeMs / frameIntervalMs);
      const lastFrameIndex = Math.ceil(visibleEndTimeMs / frameIntervalMs);

      for (let i = firstFrameIndex; i <= lastFrameIndex; i++) {
        const timeMs = i * frameIntervalMs;
        if (timeMs < 0) continue;

        if (timeMs % labelIntervalMs === 0) continue;

        const absoluteX = timeMs * pixelsPerMs;
        const viewportX = absoluteX - scrollLeft;

        if (viewportX >= -1 && viewportX <= width + 1) {
          ctx.beginPath();
          ctx.moveTo(viewportX, 0);
          ctx.lineTo(viewportX, height * 0.25);
          ctx.stroke();
        }
      }
    }
  }

  render() {
    const visibleLabels = this.getVisibleLabels();

    return html`
      <div ${ref(this.containerRef)} class="ruler-container">
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-timeline-ruler": EFTimelineRuler;
  }
}
