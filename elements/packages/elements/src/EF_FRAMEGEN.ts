import type { VideoRenderOptions } from "@editframe/assets";

import { shallowGetTimegroups, type SeekForRenderTiming } from "./elements/EFTimegroup.js";
import { setupTemporalHierarchy } from "./elements/setupTemporalHierarchy.js";

import { setupBrowserTracing } from "./otel/setupBrowserTracing.js";
import {
  clearCurrentFrameSpan,
  enableTracing,
  extractParentContext,
  setCurrentFrameSpan,
  type TraceContext,
  withSpan,
  withSpanAndContext,
} from "./otel/tracingHelpers.js";

interface Bridge {
  onInitialize: (
    callback: (
      renderOptions: VideoRenderOptions,
      traceContext?: TraceContext,
      otelEndpoint?: string,
    ) => void,
  ) => void;

  initialized(): void;

  onBeginFrame(
    callback: (frameNumber: number, isLast: boolean, traceContext?: TraceContext) => void,
  ): void;

  onTriggerCanvas(callback: (traceContext?: TraceContext) => void): void;

  frameReady(frameNumber: number, audioSamples: ArrayBuffer): void;

  error(error: Error): void;

  syncLog(sequence: number, message: string, callback: () => void): void;

  exportSpans?: (endpoint: string, payload: string) => void;
}

declare global {
  interface Window {
    EF_FRAMEGEN?: EFFramegen;
    FRAMEGEN_BRIDGE?: Bridge;
    FRAMEGEN_BINDING?: any;
    FRAMEGEN_BINDING_error?: (error: Error) => void;
    EF_RENDERING?: () => boolean;
  }
}

class TriggerCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private canvasInitialized = false;

  constructor() {
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2d context not ready");
    this.ctx = ctx;
    this.ctx.fillStyle = "transparent";
  }

  initialize() {
    if (this.canvasInitialized) return;
    this.canvasInitialized = true;
    this.canvas.width = 1;
    this.canvas.height = 1;
    Object.assign(this.canvas.style, {
      position: "fixed",
      top: "0px",
      left: "0px",
      width: "100%",
      height: "100%",
      zIndex: "100000",
    });
    document.body.appendChild(this.canvas);
  }

  trigger() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export class EFFramegen {
  time = 0;
  frameDurationMs = 0;
  audioBufferPromise?: Promise<AudioBuffer>;
  renderOptions?: VideoRenderOptions;
  frameBox = document.createElement("div");
  BRIDGE: typeof window.FRAMEGEN_BRIDGE;
  triggerCanvas = new TriggerCanvas();
  verificationCanvas?: HTMLCanvasElement;
  verificationCtx?: CanvasRenderingContext2D;
  private logSequence = 0;

  // Frame sequence coordination
  public frameTasksInProgress = false;
  public currentFrameNumber = 0;

  // Per-phase timing accumulators (reset every 30 frames)
  private timingFrameCount = 0;
  private timingAccum: SeekForRenderTiming = {
    updateComplete1Ms: 0,
    updateComplete2Ms: 0,
    updateComplete3Ms: 0,
    textSegmentsMs: 0,
    renderFrameMs: 0,
    renderFrameQueryMs: 0,
    renderFramePrepareMs: 0,
    renderFrameDrawMs: 0,
    renderFrameAnimsMs: 0,
    frameTasksMs: 0,
    totalMs: 0,
  };

  trace(...args: any[]) {
    console.trace("[EF_FRAMEGEN]", ...args);
  }

  async syncLog(...args: any[]): Promise<void> {
    if (!this.BRIDGE) {
      // Fallback to regular console.log if no bridge
      console.log("[EF_FRAMEGEN]", ...args);
      return;
    }

    const sequence = ++this.logSequence;
    const message = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
      .join(" ");

    return new Promise<void>((resolve) => {
      // biome-ignore lint/style/noNonNullAssertion: We know BRIDGE is set due to the guard above
      this.BRIDGE!.syncLog(sequence, message, () => {
        resolve();
      });
    });
  }

  private initializeVerificationCanvas() {
    if (this.verificationCanvas) {
      return;
    }

    this.verificationCanvas = document.createElement("canvas");
    const ctx = this.verificationCanvas.getContext("2d");
    if (!ctx) throw new Error("Verification canvas 2d context not ready");
    this.verificationCtx = ctx;

    // Size to match the workbench width, or fall back to renderOptions dimensions.
    // Without ef-workbench (e.g. API renders), the canvas was never sized or appended,
    // causing frame verification to fail on every frame.
    const workbench = document.querySelector("ef-workbench") as HTMLElement;
    const canvasWidth = workbench
      ? workbench.clientWidth
      : (this.renderOptions?.encoderOptions.video.width ?? 0);

    if (canvasWidth > 0) {
      this.verificationCanvas.width = canvasWidth;
      this.verificationCanvas.height = 1;

      Object.assign(this.verificationCanvas.style, {
        position: "fixed",
        left: "0px",
        bottom: "0px",
        width: `${canvasWidth}px`,
        height: "1px",
        zIndex: "99999",
      });

      document.body.appendChild(this.verificationCanvas);
    }
  }

  private drawVerificationStrip(frameNumber: number) {
    this.initializeVerificationCanvas();

    if (!this.verificationCanvas || !this.verificationCtx) {
      return;
    }

    const width = this.verificationCanvas.width;
    const height = this.verificationCanvas.height;

    // Clear the strip
    this.verificationCtx.clearRect(0, 0, width, height);

    // Encode frame number into RGB (24-bit)
    // R=high byte, G=middle byte, B=low byte
    const red = Math.floor(frameNumber / (256 * 256)) % 256;
    const green = Math.floor(frameNumber / 256) % 256;
    const blue = frameNumber % 256;

    // Fill the entire strip with the encoded frame number
    this.verificationCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    this.verificationCtx.fillRect(0, 0, width, height);
  }

  constructor() {
    this.BRIDGE = window.FRAMEGEN_BRIDGE;
    if (this.BRIDGE) {
      this.connectToBridge();
    }
  }

  /**
   * Helper method to get the workbench and set its rendering state.
   * This ensures consistent state management across the framegen lifecycle.
   */
  private setWorkbenchRendering(isRendering: boolean) {
    const workbench = document.querySelector("ef-workbench");
    if (workbench) {
      workbench.rendering = isRendering;
    }
  }

  connectToBridge() {
    const BRIDGE = this.BRIDGE;
    if (!BRIDGE) {
      throw new Error("No BRIDGE when attempting to connect to bridge");
    }

    BRIDGE.onInitialize(async (renderOptions, traceContext, otelEndpoint) => {
      // Only enable tracing if explicitly requested in renderOptions
      if (renderOptions.enableTracing && otelEndpoint) {
        enableTracing();
        await setupBrowserTracing({
          otelEndpoint,
          serviceName: "telecine-browser",
          bridge: BRIDGE,
          useBatching: true, // Batch spans to reduce overhead during rendering
        });
      }

      const parentContext = extractParentContext(traceContext);

      await withSpan(
        "browser.initialize",
        {
          width: renderOptions.encoderOptions.video.width,
          height: renderOptions.encoderOptions.video.height,
          fps: renderOptions.encoderOptions.video.framerate,
          durationMs: renderOptions.encoderOptions.toMs - renderOptions.encoderOptions.fromMs,
        },
        parentContext,
        async () => {
          try {
            await this.initialize(renderOptions);
          } catch (error) {
            // If initialization fails, ensure rendering state is cleared
            this.setWorkbenchRendering(false);
            console.error("[EF_FRAMEGEN.connectToBridge] error initializing", error);
            throw error;
          }
        },
      );

      BRIDGE.initialized();
    });

    BRIDGE.onBeginFrame((frameNumber, isLast, traceContext) => {
      const parentContext = extractParentContext(traceContext);
      withSpanAndContext(
        "browser.frame.render",
        {
          frameNumber,
          isLast,
        },
        parentContext,
        async (span, _spanContext) => {
          // Store the span itself for child operations
          // This allows spans created in Lit Tasks to use it as their parent
          setCurrentFrameSpan(span);

          try {
            await this.beginFrame(frameNumber, isLast);
          } catch (error) {
            // If an error occurs during rendering, ensure rendering state is cleared
            this.setWorkbenchRendering(false);
            throw error;
          } finally {
            clearCurrentFrameSpan();
          }
        },
      ).catch((error) => {
        console.error("[EF_FRAMEGEN.beginFrame] error:", error);
        // Ensure rendering state is cleared on error
        this.setWorkbenchRendering(false);
        clearCurrentFrameSpan();
        throw error;
      });
    });

    BRIDGE.onTriggerCanvas((traceContext) => {
      const parentContext = extractParentContext(traceContext);

      withSpan("browser.canvas.trigger", {}, parentContext, async () => {
        this.triggerCanvas.trigger();
      }).catch((error) => {
        console.error("[EF_FRAMEGEN.triggerCanvas] error:", error);
      });
    });
  }

  get showFrameBox() {
    return this.renderOptions?.showFrameBox ?? false;
  }

  async initialize(renderOptions: VideoRenderOptions) {
    this.renderOptions = renderOptions;

    // Workbench is optional - look for it but don't require it
    const workbench = document.querySelector("ef-workbench");
    if (workbench) {
      this.setWorkbenchRendering(true);
      workbench.playing = false;
    }

    // Find timegroups either in workbench or directly in document
    const searchRoot = workbench || document.body;
    const timegroups = shallowGetTimegroups(searchRoot);
    const firstGroup = timegroups[0];
    if (!firstGroup) {
      throw new Error("No temporal elements found");
    }
    const startingTimeMs = renderOptions.encoderOptions.fromMs;
    await firstGroup.waitForMediaDurations();

    // CRITICAL: Manually wire up temporal hierarchy since Lit Context fails with our connection order
    // When loading via loadURL(), elements connect depth-first (children before parents), causing
    // children to miss the context-request event since parents aren't listening yet.
    // See setupTemporalHierarchy.ts for detailed explanation.
    setupTemporalHierarchy(searchRoot, firstGroup);

    // Suppress autonomous re-renders (EFTemporal/EFTimegroup.updated) while
    // seekForRender is in progress — same protection applied to render clones.
    firstGroup.setAttribute("data-no-playback-controller", "");

    // Use seekForRender for proper time seeking during rendering
    await firstGroup.seekForRender(startingTimeMs);

    this.frameDurationMs = 1000 / renderOptions.encoderOptions.video.framerate;

    this.time = startingTimeMs;
    if (this.showFrameBox) {
      Object.assign(this.frameBox.style, {
        width: "200px",
        height: "100px",
        font: "10px Arial",
        backgroundColor: "white",
        position: "absolute",
        top: "0px",
        right: "0px",
        zIndex: "100000",
      });
      document.body.prepend(this.frameBox);
    }

    this.triggerCanvas.initialize();

    // These times are aligned to the audio frame boundaries
    // And they include padding if any.
    this.audioBufferPromise = firstGroup.renderAudio(
      renderOptions.encoderOptions.alignedFromUs / 1000,
      renderOptions.encoderOptions.alignedToUs / 1000,
    );
    // Suppress unhandled rejection while the promise sits in storage before being awaited.
    this.audioBufferPromise.catch(() => {});
  }

  async beginFrame(frameNumber: number, isLast: boolean) {
    if (this.renderOptions === undefined) {
      throw new Error("No renderOptions");
    }
    const workbench = document.querySelector("ef-workbench");
    if (workbench) {
      this.setWorkbenchRendering(true);
    }
    const searchRoot = workbench || document.body;
    const timegroups = shallowGetTimegroups(searchRoot);
    const firstGroup = timegroups[0];
    if (!firstGroup) {
      throw new Error("No temporal elements found");
    }

    // Calculate base frame time using normal progression
    const frameTime = this.renderOptions.encoderOptions.fromMs + frameNumber * this.frameDurationMs;
    const frameTimeMs = Number(Number(frameTime).toFixed(5));

    // Use seekForRender for proper time seeking during rendering
    const timing = await firstGroup.seekForRender(frameTimeMs);
    this.timingFrameCount++;
    for (const key of Object.keys(this.timingAccum) as (keyof SeekForRenderTiming)[]) {
      this.timingAccum[key] += timing[key];
    }
    if (this.timingFrameCount >= 30) {
      const n = this.timingFrameCount;
      console.log(
        `[EF_FRAMEGEN] seekForRender phase avg (${n} frames):`,
        `total=${(this.timingAccum.totalMs / n).toFixed(1)}ms`,
        `uc1=${(this.timingAccum.updateComplete1Ms / n).toFixed(1)}ms`,
        `uc2=${(this.timingAccum.updateComplete2Ms / n).toFixed(1)}ms`,
        `uc3=${(this.timingAccum.updateComplete3Ms / n).toFixed(1)}ms`,
        `text=${(this.timingAccum.textSegmentsMs / n).toFixed(1)}ms`,
        `renderFrame=${(this.timingAccum.renderFrameMs / n).toFixed(1)}ms`,
        `rf.query=${(this.timingAccum.renderFrameQueryMs / n).toFixed(1)}ms`,
        `rf.prepare=${(this.timingAccum.renderFramePrepareMs / n).toFixed(1)}ms`,
        `rf.draw=${(this.timingAccum.renderFrameDrawMs / n).toFixed(1)}ms`,
        `rf.anims=${(this.timingAccum.renderFrameAnimsMs / n).toFixed(1)}ms`,
        `frameTasks=${(this.timingAccum.frameTasksMs / n).toFixed(1)}ms`,
      );
      this.timingFrameCount = 0;
      for (const key of Object.keys(this.timingAccum) as (keyof SeekForRenderTiming)[]) {
        this.timingAccum[key] = 0;
      }
    }
    if (this.showFrameBox) {
      this.frameBox.innerHTML = `
        <div>🖼️   Frame: ${frameNumber}</div>
        <div>🕛 Segment: ${this.time.toFixed(4)}</div>
        <div>🕛   Frame: ${firstGroup.currentTimeMs.toFixed(4)}</div>
        <div>  from-to: ${this.renderOptions.encoderOptions.fromMs.toFixed(4)} - ${this.renderOptions.encoderOptions.toMs.toFixed(4)}</div>
      `;
    }

    // Draw verification pixel strip for frame verification
    this.drawVerificationStrip(frameNumber);

    if (isLast && this.audioBufferPromise) {
      // Currently we emit the audio in one belch at the end of the render.
      // This is not ideal, but it's the simplest thing that could possibly work.
      // We could either emit it slices, or in parallel with the video.
      // But in any case, it's fine for now.
      const renderedAudio = await this.audioBufferPromise;

      const channelCount = renderedAudio.numberOfChannels;

      const interleavedSamples = new Float32Array(channelCount * renderedAudio.length);

      for (let i = 0; i < renderedAudio.length; i++) {
        for (let j = 0; j < channelCount; j++) {
          interleavedSamples.set(
            renderedAudio.getChannelData(j).slice(i, i + 1),
            i * channelCount + j,
          );
        }
      }

      if (this.BRIDGE) {
        this.BRIDGE.frameReady(frameNumber, interleavedSamples.buffer);
      } else {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(new Blob([interleavedSamples.buffer]));
        await new Promise((resolve, reject) => {
          fileReader.onload = resolve;
          fileReader.onerror = reject;
        });
        return fileReader.result;
      }

      // Rendering is complete after the last frame
      this.setWorkbenchRendering(false);
    } else {
      if (this.BRIDGE) {
        this.BRIDGE.frameReady(frameNumber, new ArrayBuffer(0));
      } else {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(new Blob([]));
        await new Promise((resolve, reject) => {
          fileReader.onload = resolve;
          fileReader.onerror = reject;
        });
        return fileReader.result;
      }
    }
  }
}

if (typeof window !== "undefined") {
  window.EF_FRAMEGEN = new EFFramegen();
}
