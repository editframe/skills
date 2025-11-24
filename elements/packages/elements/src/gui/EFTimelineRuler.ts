import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { durationContext } from "./durationContext.js";

const MIN_SPACING_PX = 100;
const MIN_FRAME_SPACING_PX = 5;
const BASE_PIXELS_PER_SECOND = 100;

export function calculateOptimalInterval(
  width: number,
  durationMs: number,
  minSpacing: number,
): number {
  if (width <= 0 || durationMs <= 0) {
    return 1000;
  }

  const maxMarkers = Math.floor(width / minSpacing);
  if (maxMarkers <= 0) {
    return durationMs;
  }

  const minIntervalMs = durationMs / maxMarkers;
  return minIntervalMs;
}

export function calculateFrameIntervalMs(fps: number): number {
  if (fps <= 0) return 1000 / 30;
  return 1000 / fps;
}

export function calculatePixelsPerFrame(
  frameIntervalMs: number,
  zoomScale: number,
): number {
  return (frameIntervalMs / 1000) * BASE_PIXELS_PER_SECOND * zoomScale;
}

export function shouldShowFrameMarkers(
  pixelsPerFrame: number,
  minSpacing: number = MIN_FRAME_SPACING_PX,
): boolean {
  return pixelsPerFrame >= minSpacing;
}

export function quantizeToFrameTimeMs(timeMs: number, fps: number): number {
  if (!fps || fps <= 0) return timeMs;
  const frameDurationS = 1 / fps;
  const timeSeconds = timeMs / 1000;
  const quantizedSeconds =
    Math.round(timeSeconds / frameDurationS) * frameDurationS;
  return quantizedSeconds * 1000;
}

function timeToPixels(
  timeMs: number,
  durationMs: number,
  containerWidth: number,
  zoomScale: number,
): number {
  if (durationMs <= 0) return 0;
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomScale;
  return (timeMs / 1000) * pixelsPerSecond;
}

function renderFrameMarkers(
  canvas: HTMLCanvasElement,
  scrollLeft: number,
  viewportWidth: number,
  frameIntervalMs: number,
  durationMs: number,
  zoomScale: number,
  containerWidth: number,
  fps: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const visibleStartPx = scrollLeft;
  const visibleEndPx = scrollLeft + viewportWidth;

  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomScale;

  const visibleStartTimeMs = Math.max(
    0,
    (visibleStartPx / pixelsPerSecond) * 1000 - frameIntervalMs,
  );
  const visibleEndTimeMs = Math.min(
    durationMs,
    (visibleEndPx / pixelsPerSecond) * 1000 + frameIntervalMs,
  );

  const firstFrameIndex = Math.floor(visibleStartTimeMs / frameIntervalMs);
  const lastFrameIndex = Math.ceil(visibleEndTimeMs / frameIntervalMs);

  ctx.strokeStyle = "rgb(107, 114, 128)";
  ctx.lineWidth = 1;

  const frameDurationS = 1 / fps;
  for (let frameIndex = firstFrameIndex; frameIndex <= lastFrameIndex; frameIndex++) {
    const frameTimeSeconds = frameIndex * frameDurationS;
    const quantizedSeconds =
      Math.round(frameTimeSeconds / frameDurationS) * frameDurationS;
    const frameTimeMs = quantizedSeconds * 1000;

    if (frameTimeMs < 0 || frameTimeMs > durationMs) continue;

    const x = timeToPixels(frameTimeMs, durationMs, containerWidth, zoomScale);

    if (x >= visibleStartPx - 1 && x <= visibleEndPx + 1) {
      const lineHeight = canvas.height * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, lineHeight);
      ctx.stroke();
    }
  }
}

@customElement("ef-timeline-ruler")
export class EFTimelineRuler extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        pointer-events: none;
      }
      .ruler-container {
        position: absolute;
        inset: 0;
        display: flex;
      }
      .markers-container {
        position: relative;
        z-index: 1;
      }
      .marker {
        position: absolute;
        top: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .tick {
        width: 1px;
        height: 100%;
        background-color: rgb(75, 85, 99);
      }
      .label {
        font-size: 0.75rem;
        color: rgb(156, 163, 175);
        font-family: ui-monospace, monospace;
        margin-top: 0.125rem;
        white-space: nowrap;
      }
      canvas {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
      }
    `,
  ];

  @property({ type: Number, attribute: "duration-ms" })
  durationMs = 0;

  @consume({ context: durationContext, subscribe: true })
  contextDurationMs = 0;

  @property({ type: Number, attribute: "zoom-scale" })
  zoomScale = 1.0;

  @property({ type: Number, attribute: "container-width" })
  containerWidth = 0;

  @property({ type: Number, attribute: "fps" })
  fps = 30;

  @property({ type: String, attribute: "scroll-container-selector" })
  scrollContainerSelector = "";

  @property({ attribute: false })
  scrollContainerElement?: HTMLElement | null;

  @state()
  private measuredWidth = 0;

  @state()
  private scrollLeft = 0;

  private containerRef = createRef<HTMLDivElement>();
  private canvasRef = createRef<HTMLCanvasElement>();
  private resizeObserver?: ResizeObserver;
  private scrollContainer?: HTMLElement;
  private scrollRafId: number | null = null;

  get effectiveDurationMs(): number {
    return this.durationMs || this.contextDurationMs || 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this.updateMeasuredWidth();

    if (this.containerRef.value) {
      this.resizeObserver = new ResizeObserver((entries) => {
        const width = entries[0].contentRect.width;
        this.measuredWidth = width;
      });
      this.resizeObserver.observe(this.containerRef.value);
    }

    if (this.scrollContainerElement) {
      this.scrollContainer = this.scrollContainerElement;
      this.setupScrollListener();
    } else if (this.scrollContainerSelector) {
      this.scrollContainer =
        document.querySelector<HTMLElement>(this.scrollContainerSelector) ||
        undefined;
      if (this.scrollContainer) {
        this.setupScrollListener();
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener("scroll", this.updateScrollLeft);
    }
    if (this.scrollRafId !== null) {
      cancelAnimationFrame(this.scrollRafId);
    }
  }

  private updateMeasuredWidth() {
    if (this.containerRef.value) {
      const rect = this.containerRef.value.getBoundingClientRect();
      this.measuredWidth = rect.width;
    }
  }

  private updateScrollLeft = () => {
    if (this.scrollRafId === null) {
      this.scrollRafId = requestAnimationFrame(() => {
        if (this.scrollContainer) {
          this.scrollLeft = this.scrollContainer.scrollLeft;
        }
        this.scrollRafId = null;
      });
    }
  };

  private setupScrollListener() {
    if (!this.scrollContainer) return;

    this.updateScrollLeft();
    this.scrollContainer.addEventListener("scroll", this.updateScrollLeft, {
      passive: true,
    });
  }

  private getContentWidth(): number {
    const duration = this.effectiveDurationMs;
    if (duration <= 0) return 0;
    return (duration / 1000) * BASE_PIXELS_PER_SECOND * this.zoomScale;
  }

  private getIntervalMs(): number {
    const contentWidth = this.getContentWidth();
    if (contentWidth <= 0) {
      const duration = this.effectiveDurationMs;
      return duration < 5000 ? 500 : 1000;
    }
    return calculateOptimalInterval(
      contentWidth,
      this.effectiveDurationMs,
      MIN_SPACING_PX,
    );
  }

  private getMarkers(): number[] {
    const duration = this.effectiveDurationMs;
    const intervalMs = this.getIntervalMs();
    const frameIntervalMs = calculateFrameIntervalMs(this.fps);
    const pixelsPerFrame = calculatePixelsPerFrame(
      frameIntervalMs,
      this.zoomScale,
    );
    const showFrameMarkers = shouldShowFrameMarkers(pixelsPerFrame);

    if (showFrameMarkers && this.fps > 0) {
      const frameDurationS = 1 / this.fps;
      const niceIntervals = [1, 0.5, 0.25, 0.1, 0.05];
      let selectedIntervalS = niceIntervals[0];

      const pixelsPerSecond = BASE_PIXELS_PER_SECOND * this.zoomScale;
      for (const intervalS of niceIntervals) {
        const pixelsPerInterval = intervalS * pixelsPerSecond;
        if (pixelsPerInterval >= MIN_SPACING_PX) {
          selectedIntervalS = intervalS;
          break;
        }
      }

      const framesPerInterval = Math.max(
        1,
        Math.round(selectedIntervalS / frameDurationS),
      );

      const frameMarkers: number[] = [];
      for (let frameIndex = 0; ; frameIndex += framesPerInterval) {
        const frameTimeSeconds = frameIndex * frameDurationS;
        const quantizedSeconds =
          Math.round(frameTimeSeconds / frameDurationS) * frameDurationS;
        const frameTimeMs = quantizedSeconds * 1000;

        if (frameTimeMs > duration) break;
        frameMarkers.push(frameTimeMs);
      }

      return frameMarkers;
    } else {
      const normalMarkers: number[] = [];
      for (let timeMs = 0; timeMs <= duration; timeMs += intervalMs) {
        normalMarkers.push(timeMs);
      }
      return normalMarkers;
    }
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has("scrollContainerElement")) {
      if (this.scrollContainer) {
        this.scrollContainer.removeEventListener(
          "scroll",
          this.updateScrollLeft,
        );
      }
      if (this.scrollContainerElement) {
        this.scrollContainer = this.scrollContainerElement;
        this.setupScrollListener();
      } else {
        this.scrollContainer = undefined;
      }
    }
    this.renderFrameMarkers();
  }

  private renderFrameMarkers() {
    const canvas = this.canvasRef.value;
    if (!canvas) return;

    const duration = this.effectiveDurationMs;
    if (duration <= 0) return;

    const frameIntervalMs = calculateFrameIntervalMs(this.fps);
    const pixelsPerFrame = calculatePixelsPerFrame(
      frameIntervalMs,
      this.zoomScale,
    );
    const showFrameMarkers = shouldShowFrameMarkers(pixelsPerFrame);

    if (!showFrameMarkers) return;

    const container = this.containerRef.value;
    if (!container) return;

    const contentWidth = this.getContentWidth();
    const rect = container.getBoundingClientRect();
    canvas.width = contentWidth > 0 ? contentWidth : rect.width;
    canvas.height = rect.height;

    const viewportWidth =
      this.scrollContainer?.clientWidth ?? container.clientWidth;
    const currentScrollLeft = this.scrollContainer?.scrollLeft ?? this.scrollLeft;

    renderFrameMarkers(
      canvas,
      currentScrollLeft,
      viewportWidth,
      frameIntervalMs,
      duration,
      this.zoomScale,
      this.containerWidth,
      this.fps,
    );
  }

  render() {
    const duration = this.effectiveDurationMs;
    if (duration <= 0) {
      return html``;
    }

    const markers = this.getMarkers();
    const frameIntervalMs = calculateFrameIntervalMs(this.fps);
    const pixelsPerFrame = calculatePixelsPerFrame(
      frameIntervalMs,
      this.zoomScale,
    );
    const showFrameMarkers = shouldShowFrameMarkers(pixelsPerFrame);

    return html`
      <div ${ref(this.containerRef)} class="ruler-container">
        ${showFrameMarkers
          ? html`<canvas ${ref(this.canvasRef)}></canvas>`
          : html``}
        <div class="markers-container">
          ${markers.map((timeMs) => {
            const positionPixels = timeToPixels(
              timeMs,
              duration,
              this.containerWidth,
              this.zoomScale,
            );
            const timeSeconds = timeMs / 1000;
            const displayTime =
              timeSeconds % 1 === 0
                ? `${timeSeconds}s`
                : `${timeSeconds.toFixed(1)}s`;

            return html`
              <div class="marker" style="left: ${positionPixels}px">
                <div class="tick"></div>
                <div class="label">${displayTime}</div>
              </div>
            `;
          })}
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

