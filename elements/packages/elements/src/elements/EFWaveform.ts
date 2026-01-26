import { CSSStyleObserver } from "@bramus/style-observer";
import { TaskStatus } from "@lit/task";
import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, type Ref, ref } from "lit/directives/ref.js";
import { EF_RENDERING } from "../EF_RENDERING.js";
import { TWMixin } from "../gui/TWMixin.js";
import type { FrameRenderable, FrameState } from "../preview/FrameController.js";
import { CrossUpdateController } from "./CrossUpdateController.js";
import type { EFAudio } from "./EFAudio.js";
import { EFTemporal } from "./EFTemporal.js";
import type { EFVideo } from "./EFVideo.js";
import { TargetController } from "./TargetController.ts";

@customElement("ef-waveform")
export class EFWaveform extends EFTemporal(TWMixin(LitElement)) implements FrameRenderable {
  static styles = css`
      :host {
        all: inherit;
        display: block;
        position: relative;
      }

      canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    `;

  canvasRef: Ref<HTMLCanvasElement> = createRef();
  private ctx: CanvasRenderingContext2D | null = null;
  private styleObserver: CSSStyleObserver | null = null;

  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;

  /**
   * Render version counter - increments when visual content changes.
   * Used by RenderContext to cache rendered dataURLs.
   */
  #renderVersion = 0;

  /**
   * Get the current render version.
   * Version increments when mode, color, barSpacing, lineWidth, or target changes.
   * @public
   */
  get renderVersion(): number {
    return this.#renderVersion;
  }

  render() {
    return html`<canvas ${ref(this.canvasRef)}></canvas>`;
  }

  @property({
    type: String,
    attribute: "mode",
  })
  mode:
    | "roundBars"
    | "bars"
    | "bricks"
    | "line"
    | "curve"
    | "pixel"
    | "wave"
    | "spikes" = "bars";

  @property({ type: String })
  color = "currentColor";

  @property({ type: String, reflect: true })
  target = "";

  @property({ type: Number, attribute: "bar-spacing" })
  barSpacing = 0.5;

  @state()
  targetElement: EFAudio | EFVideo | null = null;

  @property({ type: Number, attribute: "line-width" })
  lineWidth = 4;

  targetController: TargetController = new TargetController(this);

  connectedCallback() {
    super.connectedCallback();
    try {
      if (this.targetElement) {
        new CrossUpdateController(this.targetElement, this);
      }
    } catch (_error) {
      // TODO: determine if this is a critical error, or if we should just ignore it
      // currenty evidence suggests everything still works
      // no target element, no cross update controller
    }

    // Initialize ResizeObserver
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });

    // Observe the host element
    this.resizeObserver.observe(this);

    // Initialize MutationObserver
    this.mutationObserver = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "attributes") {
          this.frameTask.run().catch(() => {
            // AbortErrors are expected during cleanup
          });
        }
      }
    });

    // Observe attribute changes on the element
    this.mutationObserver.observe(this, { attributes: true });

    if (!EF_RENDERING()) {
      this.styleObserver = new CSSStyleObserver(["color"], () => {
        this.frameTask.run().catch(() => {
          // AbortErrors are expected during cleanup
        });
      });
      this.styleObserver.attach(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Disconnect the observers when the element is removed from the DOM
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.styleObserver?.detach();
  }

  private resizeCanvas() {
    this.ctx = this.initCanvas();
    if (this.ctx) {
      this.frameTask.run().catch(() => {
        // AbortErrors are expected during cleanup
      }); // Redraw the canvas
    }
  }

  protected initCanvas() {
    const canvas = this.canvasRef.value;
    if (!canvas) return null;

    const rect = {
      width: this.offsetWidth,
      height: this.offsetHeight,
    };
    const dpr = window.devicePixelRatio;

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.reset();

    // Scale all drawing operations by dpr
    return ctx;
  }

  protected drawBars(ctx: CanvasRenderingContext2D, frequencyData: Uint8Array) {
    const canvas = ctx.canvas;
    const waveWidth = canvas.width;
    const waveHeight = canvas.height;

    const totalBars = frequencyData.length;
    const paddingInner = this.barSpacing;
    const paddingOuter = 0.01;
    const availableWidth = waveWidth;
    const barWidth =
      availableWidth / (totalBars + (totalBars - 1) * paddingInner);

    ctx.clearRect(0, 0, waveWidth, waveHeight);
    const path = new Path2D();

    frequencyData.forEach((value, i) => {
      const normalizedValue = value / 255;
      const barHeight = normalizedValue * waveHeight;
      const y = (waveHeight - barHeight) / 2;
      const x = waveWidth * paddingOuter + i * (barWidth * (1 + paddingInner));
      path.rect(x, y, barWidth, barHeight);
    });

    ctx.fill(path);
  }

  protected drawBricks(
    ctx: CanvasRenderingContext2D,
    frequencyData: Uint8Array,
  ) {
    const canvas = ctx.canvas;
    const waveWidth = canvas.width;
    const waveHeight = canvas.height;
    ctx.clearRect(0, 0, waveWidth, waveHeight);
    const path = new Path2D();

    const columnWidth = waveWidth / frequencyData.length;
    const boxSize = columnWidth * 0.9;
    const verticalGap = boxSize * 0.2; // Add spacing between bricks
    const maxBricks = Math.floor(waveHeight / (boxSize + verticalGap)); // Account for gaps in height calculation

    frequencyData.forEach((value, i) => {
      const normalizedValue = value / 255;
      const brickCount = Math.floor(normalizedValue * maxBricks);

      for (let j = 0; j < brickCount; j++) {
        const x = columnWidth * i;
        const y = waveHeight - (j + 1) * (boxSize + verticalGap); // Include gap in position calculation
        path.rect(x, y, boxSize, boxSize);
      }
    });

    ctx.fill(path);
  }

  protected drawRoundBars(
    ctx: CanvasRenderingContext2D,
    frequencyData: Uint8Array,
  ) {
    const canvas = ctx.canvas;
    const waveWidth = canvas.width;
    const waveHeight = canvas.height;

    // Similar padding calculation as drawBars
    const totalBars = frequencyData.length;
    const paddingInner = this.barSpacing;
    const paddingOuter = 0.01;
    const availableWidth = waveWidth;
    const barWidth =
      availableWidth / (totalBars + (totalBars - 1) * paddingInner);

    ctx.clearRect(0, 0, waveWidth, waveHeight);

    // Create a single Path2D object for all rounded bars
    const path = new Path2D();

    frequencyData.forEach((value, i) => {
      const normalizedValue = value / 255;
      const height = normalizedValue * waveHeight; // Use full wave height like in drawBars
      const x = waveWidth * paddingOuter + i * (barWidth * (1 + paddingInner));
      const y = (waveHeight - height) / 2; // Center vertically

      // Add rounded rectangle to path
      path.roundRect(x, y, barWidth, height, barWidth / 2);
    });

    // Single fill operation for all bars
    ctx.fill(path);
  }

  protected drawLine(ctx: CanvasRenderingContext2D, frequencyData: Uint8Array) {
    const canvas = ctx.canvas;
    const waveWidth = canvas.width;
    const waveHeight = canvas.height;

    ctx.clearRect(0, 0, waveWidth, waveHeight);
    const path = new Path2D();

    // Sample fewer points to make sharp angles more visible
    const sampleRate = 1; // Only use every 4th point

    for (let i = 0; i < frequencyData.length; i += sampleRate) {
      const x = (i / frequencyData.length) * waveWidth;
      const y = (1 - (frequencyData[i] ?? 0) / 255) * waveHeight;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    // Ensure we draw to the end
    const lastX = waveWidth;
    const lastY =
      (1 - (frequencyData[frequencyData.length - 1] ?? 0) / 255) * waveHeight;
    path.lineTo(lastX, lastY);

    ctx.lineWidth = this.lineWidth;
    ctx.stroke(path);
  }

  protected drawCurve(
    ctx: CanvasRenderingContext2D,
    frequencyData: Uint8Array,
  ) {
    const canvas = ctx.canvas;
    const waveWidth = canvas.width;
    const waveHeight = canvas.height;

    ctx.clearRect(0, 0, waveWidth, waveHeight);
    const path = new Path2D();

    // Draw smooth curves between points using quadratic curves
    frequencyData.forEach((value, i) => {
      const x = (i / frequencyData.length) * waveWidth;
      const y = (1 - value / 255) * waveHeight;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        const prevX = ((i - 1) / frequencyData.length) * waveWidth;
        const prevY = (1 - (frequencyData[i - 1] ?? 0) / 255) * waveHeight;
        const xc = (prevX + x) / 2;
        const yc = (prevY + y) / 2;
        path.quadraticCurveTo(prevX, prevY, xc, yc);
      }
    });

    ctx.lineWidth = this.lineWidth;
    ctx.stroke(path);
  }

  protected drawPixel(
    ctx: CanvasRenderingContext2D,
    frequencyData: Uint8Array,
  ) {
    const canvas = ctx.canvas;
    const waveWidth = canvas.width;
    const waveHeight = canvas.height;
    const baseline = waveHeight / 2;
    const barWidth = waveWidth / frequencyData.length;

    ctx.clearRect(0, 0, waveWidth, waveHeight);
    const path = new Path2D();

    frequencyData.forEach((value, i) => {
      const normalizedValue = value / 255;
      const x = i * (waveWidth / frequencyData.length);
      const barHeight = normalizedValue * (waveHeight / 2); // Half height since we extend both ways
      const y = baseline - barHeight;
      path.rect(x, y, barWidth, barHeight * 2); // Double height to extend both ways
    });

    ctx.fill(path);
  }

  protected drawWave(ctx: CanvasRenderingContext2D, frequencyData: Uint8Array) {
    const canvas = ctx.canvas;
    const waveWidth = canvas.width;
    const waveHeight = canvas.height;
    const paddingOuter = 0.01;
    const availableWidth = waveWidth * (1 - 2 * paddingOuter);
    const startX = waveWidth * paddingOuter;

    ctx.clearRect(0, 0, waveWidth, waveHeight);
    const path = new Path2D();

    // Draw top curve
    const firstValue = Math.min(((frequencyData[0] ?? 0) / 255) * 2, 1);
    const firstY = (waveHeight - firstValue * waveHeight) / 2;
    path.moveTo(startX, firstY);

    // Draw top half
    frequencyData.forEach((value, i) => {
      const normalizedValue = Math.min((value / 255) * 2, 1);
      const x = startX + (i / (frequencyData.length - 1)) * availableWidth;
      const barHeight = normalizedValue * waveHeight;
      const y = (waveHeight - barHeight) / 2;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        const prevX =
          startX + ((i - 1) / (frequencyData.length - 1)) * availableWidth;
        const prevValue = Math.min(((frequencyData[i - 1] ?? 0) / 255) * 2, 1);
        const prevBarHeight = prevValue * waveHeight;
        const prevY = (waveHeight - prevBarHeight) / 2;
        const xc = (prevX + x) / 2;
        const yc = (prevY + y) / 2;
        path.quadraticCurveTo(prevX, prevY, xc, yc);
      }
    });

    // Draw bottom half
    for (let i = frequencyData.length - 1; i >= 0; i--) {
      const normalizedValue = Math.min(((frequencyData[i] ?? 0) / 255) * 2, 1);
      const x = startX + (i / (frequencyData.length - 1)) * availableWidth;
      const barHeight = normalizedValue * waveHeight;
      const y = (waveHeight + barHeight) / 2;

      if (i === frequencyData.length - 1) {
        path.lineTo(x, y);
      } else {
        const nextX =
          startX + ((i + 1) / (frequencyData.length - 1)) * availableWidth;
        const nextValue = Math.min(((frequencyData[i + 1] ?? 0) / 255) * 2, 1);
        const nextBarHeight = nextValue * waveHeight;
        const nextY = (waveHeight + nextBarHeight) / 2;
        const xc = (nextX + x) / 2;
        const yc = (nextY + y) / 2;
        path.quadraticCurveTo(nextX, nextY, xc, yc);
      }
    }

    // Close the path with a smooth curve back to start
    const lastY = (waveHeight + firstValue * waveHeight) / 2;
    const controlX = startX;
    const controlY = (lastY + firstY) / 2;
    path.quadraticCurveTo(controlX, controlY, startX, firstY);

    ctx.fill(path);
  }

  protected drawSpikes(
    ctx: CanvasRenderingContext2D,
    frequencyData: Uint8Array,
  ) {
    const canvas = ctx.canvas;
    const waveWidth = canvas.width;
    const waveHeight = canvas.height;
    const paddingOuter = 0.01;
    const availableWidth = waveWidth * (1 - 2 * paddingOuter);
    const startX = waveWidth * paddingOuter;

    ctx.clearRect(0, 0, waveWidth, waveHeight);
    const path = new Path2D();

    // Draw top curve
    const firstValue = (frequencyData[0] ?? 0) / 255;
    const firstY = (waveHeight - firstValue * waveHeight) / 2;
    path.moveTo(startX, firstY);

    // Draw top half
    frequencyData.forEach((value, i) => {
      const normalizedValue = Math.min((value / 255) * 2, 1);
      const x = startX + (i / (frequencyData.length - 1)) * availableWidth;
      const barHeight = normalizedValue * (waveHeight / 2);
      const y = (waveHeight - barHeight * 2) / 2;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        const prevX =
          startX + ((i - 1) / (frequencyData.length - 1)) * availableWidth;
        const prevValue = (frequencyData[i - 1] ?? 0) / 255;
        const prevBarHeight = prevValue * (waveHeight / 2);
        const prevY = (waveHeight - prevBarHeight * 2) / 2;
        const xc = (prevX + x) / 2;
        const yc = (prevY + y) / 2;
        path.quadraticCurveTo(prevX, prevY, xc, yc);
      }
    });

    // Draw bottom half
    for (let i = frequencyData.length - 1; i >= 0; i--) {
      const normalizedValue = Math.min(((frequencyData[i] ?? 0) / 255) * 2, 1);
      const x = startX + (i / (frequencyData.length - 1)) * availableWidth;
      const barHeight = normalizedValue * (waveHeight / 2);
      const y = (waveHeight + barHeight * 2) / 2;

      if (i === frequencyData.length - 1) {
        path.lineTo(x, y);
      } else {
        const nextX =
          startX + ((i + 1) / (frequencyData.length - 1)) * availableWidth;
        const nextValue = (frequencyData[i + 1] ?? 0) / 255;
        const nextBarHeight = nextValue * (waveHeight / 2);
        const nextY = (waveHeight + nextBarHeight * 2) / 2;
        const xc = (nextX + x) / 2;
        const yc = (nextY + y) / 2;
        path.quadraticCurveTo(nextX, nextY, xc, yc);
      }
    }

    // Close the path with a smooth curve
    const lastY = (waveHeight + firstValue * waveHeight) / 2;
    const controlX = startX;
    const controlY = (lastY + firstY) / 2;
    path.quadraticCurveTo(controlX, controlY, startX, firstY);

    ctx.fill(path);
  }

  /**
   * @deprecated Use FrameRenderable methods (prepareFrame, renderFrame) via FrameController instead.
   * This is a compatibility wrapper that delegates to the new system.
   */
  #frameTaskPromise: Promise<void> = Promise.resolve();
  
  frameTask = (() => {
    const self = this;
    return {
      run: () => {
        const abortController = new AbortController();
        const timeMs = self.ownCurrentTimeMs;
        self.#frameTaskPromise = (async () => {
          try {
            await self.prepareFrame(timeMs, abortController.signal);
            self.renderFrame(timeMs);
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }
            throw error;
          }
        })();
        return self.#frameTaskPromise;
      },
      get taskComplete() {
        return self.#frameTaskPromise;
      },
    };
  })();

  // ============================================================================
  // FrameRenderable Implementation
  // Centralized frame control - replaces distributed Lit Task system
  // ============================================================================

  /**
   * Query readiness state for a given time.
   * @implements FrameRenderable
   */
  getFrameState(_timeMs: number): FrameState {
    // Waveform is ready when target has frequency data
    const hasTarget = !!this.targetElement;
    const hasData = hasTarget && 
      this.targetElement?.frequencyDataTask.status === TaskStatus.COMPLETE;

    return {
      needsPreparation: hasTarget && !hasData,
      isReady: hasData,
      priority: 4, // Waveform renders after video/captions/audio
    };
  }

  /**
   * Async preparation - waits for target's frequency data.
   * @implements FrameRenderable
   */
  async prepareFrame(_timeMs: number, signal: AbortSignal): Promise<void> {
    if (!this.targetElement) return;

    if (this.targetElement.frequencyDataTask.status !== TaskStatus.COMPLETE) {
      try {
        await this.targetElement.frequencyDataTask.taskComplete;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          signal.throwIfAborted();
          return;
        }
        throw error;
      }
    }
    signal.throwIfAborted();
  }

  /**
   * Synchronous render - draws waveform to canvas.
   * @implements FrameRenderable
   */
  renderFrame(_timeMs: number): void {
    if (!this.targetElement) return;

    this.ctx ||= this.initCanvas();
    const ctx = this.ctx;
    if (!ctx) return;

    const frequencyData = this.targetElement.frequencyDataTask.value;
    const byteTimeData = this.targetElement.byteTimeDomainTask.value;
    if (!frequencyData || !byteTimeData) return;

    ctx.save();
    if (this.color === "currentColor") {
      const computedStyle = getComputedStyle(this);
      const currentColor = computedStyle.color;
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
    } else {
      ctx.strokeStyle = this.color;
      ctx.fillStyle = this.color;
    }

    switch (this.mode) {
      case "bars":
        this.drawBars(ctx, frequencyData);
        break;
      case "bricks":
        this.drawBricks(ctx, frequencyData);
        break;
      case "line":
        this.drawLine(ctx, byteTimeData);
        break;
      case "curve":
        this.drawCurve(ctx, byteTimeData);
        break;
      case "pixel":
        this.drawPixel(ctx, frequencyData);
        break;
      case "wave":
        this.drawWave(ctx, frequencyData);
        break;
      case "spikes":
        this.drawSpikes(ctx, frequencyData);
        break;
      case "roundBars":
        this.drawRoundBars(ctx, frequencyData);
        break;
    }

    ctx.restore();
  }

  // ============================================================================
  // End FrameRenderable Implementation
  // ============================================================================

  get durationMs() {
    if (!this.targetElement) return 0;
    return this.targetElement.durationMs;
  }

  protected updated(changedProperties: PropertyValueMap<this>): void {
    super.updated(changedProperties);

    // Increment render version on any property change.
    // This is intentionally broad to avoid cache staleness - the cache is
    // per-render-session so within a render the version will be stable.
    if (changedProperties.size > 0) {
      this.#renderVersion++;
      // Request a new frame
      this.frameTask.run().catch(() => {
        // AbortErrors are expected during cleanup
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-waveform": EFWaveform & Element;
  }
}
