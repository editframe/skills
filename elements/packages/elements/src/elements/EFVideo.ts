import { Task } from "@lit/task";
import { context, trace } from "@opentelemetry/api";
import debug from "debug";
import { css, html, type PropertyValueMap } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { DelayedLoadingState } from "../DelayedLoadingState.js";
import { TWMixin } from "../gui/TWMixin.js";
import { withSpan, withSpanSync } from "../otel/tracingHelpers.js";
import { makeScrubVideoBufferTask } from "./EFMedia/videoTasks/makeScrubVideoBufferTask.ts";
import { makeScrubVideoInitSegmentFetchTask } from "./EFMedia/videoTasks/makeScrubVideoInitSegmentFetchTask.ts";
import { makeScrubVideoInputTask } from "./EFMedia/videoTasks/makeScrubVideoInputTask.ts";
import { makeScrubVideoSeekTask } from "./EFMedia/videoTasks/makeScrubVideoSeekTask.ts";
import { makeScrubVideoSegmentFetchTask } from "./EFMedia/videoTasks/makeScrubVideoSegmentFetchTask.ts";
import { makeScrubVideoSegmentIdTask } from "./EFMedia/videoTasks/makeScrubVideoSegmentIdTask.ts";
import { makeUnifiedVideoSeekTask } from "./EFMedia/videoTasks/makeUnifiedVideoSeekTask.ts";
import { makeVideoBufferTask } from "./EFMedia/videoTasks/makeVideoBufferTask.ts";
import { EFMedia } from "./EFMedia.js";
import { updateAnimations } from "./updateAnimations.js";

// EF_FRAMEGEN is a global instance created in EF_FRAMEGEN.ts
declare global {
  var EF_FRAMEGEN: import("../EF_FRAMEGEN.js").EFFramegen;
}

const log = debug("ef:elements:EFVideo");

interface LoadingState {
  isLoading: boolean;
  operation: "scrub-segment" | "video-segment" | "seeking" | "decoding" | null;
  message: string;
}

/**
 * Event detail for scrub segment loading progress.
 * Dispatched during prefetchScrubSegments to indicate network activity.
 */
export interface ScrubSegmentLoadingDetail {
  /** The segment ID being loaded (0-indexed) */
  segmentId: number;
  /** Time range covered by this segment [startMs, endMs] */
  timeRangeMs: [number, number];
  /** Number of segments loaded so far */
  loaded: number;
  /** Total number of segments to load */
  total: number;
  /** Current status: "loading" or "loaded" */
  status: "loading" | "loaded";
}

@customElement("ef-video")
export class EFVideo extends TWMixin(EFMedia) {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
      }
      canvas {
        overflow: hidden;
        position: static;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        border: none;
        outline: none;
        box-shadow: none;
      }
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        backdrop-filter: blur(2px);
      }
      .loading-content {
        background: rgba(0, 0, 0, 0.8);
        border-radius: 8px;
        padding: 16px 24px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
        font-size: 14px;
        font-weight: 500;
      }
      .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-left: 2px solid #fff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .loading-message {
        font-size: 12px;
        opacity: 0.8;
      }
    `,
  ];
  canvasRef = createRef<HTMLCanvasElement>();

  /**
   * Duration in milliseconds for video buffering ahead of current time
   * @domAttribute "video-buffer-duration"
   */
  @property({ type: Number, attribute: "video-buffer-duration" })
  videoBufferDurationMs = 10000; // 10 seconds - reasonable for JIT encoding

  /**
   * Maximum number of concurrent video segment fetches for buffering
   * @domAttribute "max-video-buffer-fetches"
   */
  @property({ type: Number, attribute: "max-video-buffer-fetches" })
  maxVideoBufferFetches = 2;

  /**
   * Enable/disable video buffering system
   * @domAttribute "enable-video-buffering"
   */
  @property({ type: Boolean, attribute: "enable-video-buffering" })
  enableVideoBuffering = true;

  // Unified video system - single smart seek task that routes to scrub or main
  unifiedVideoSeekTask = makeUnifiedVideoSeekTask(this);
  videoBufferTask = makeVideoBufferTask(this); // Keep for main video buffering

  // Scrub video preloading system
  scrubVideoBufferTask = makeScrubVideoBufferTask(this);
  scrubVideoInputTask = makeScrubVideoInputTask(this);
  scrubVideoSeekTask = makeScrubVideoSeekTask(this);
  scrubVideoSegmentIdTask = makeScrubVideoSegmentIdTask(this);
  scrubVideoSegmentFetchTask = makeScrubVideoSegmentFetchTask(this);
  scrubVideoInitSegmentFetchTask = makeScrubVideoInitSegmentFetchTask(this);

  /**
   * Delayed loading state manager for user feedback
   */
  private delayedLoadingState: DelayedLoadingState;

  /**
   * Loading state for user feedback
   */
  @state()
  loadingState = {
    isLoading: false,
    operation: null as LoadingState["operation"],
    message: "",
  };

  constructor() {
    super();

    // Initialize delayed loading state with callback to update UI
    this.delayedLoadingState = new DelayedLoadingState(
      250,
      (isLoading, message) => {
        this.setLoadingState(isLoading, null, message);
      },
    );
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    super.updated(changedProperties);

    // No need to clear canvas - displayFrame() overwrites it completely
    // and clearing creates blank frame gaps during transitions
  }

  render() {
    return html`
      <canvas ${ref(this.canvasRef)}></canvas>
      ${
        this.loadingState.isLoading
          ? html`
        <div class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <div>
              <div>Loading Video...</div>
              <div class="loading-message">${this.loadingState.message}</div>
            </div>
          </div>
        </div>
      `
          : ""
      }
    `;
  }

  get canvasElement() {
    const referencedCanvas = this.canvasRef.value;
    if (referencedCanvas) {
      return referencedCanvas;
    }
    const shadowCanvas = this.shadowRoot?.querySelector("canvas");
    if (shadowCanvas) {
      return shadowCanvas;
    }
    return undefined;
  }

  frameTask = new Task(this, {
    autoRun: false,
    args: () => [this.desiredSeekTimeMs] as const,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // This prevents unhandled rejection when hostUpdate() triggers _performTask() without awaiting.
      this.frameTask.taskComplete.catch(() => {});
      
      // Don't log AbortErrors - these are expected when tasks are cancelled
      const isAbortError = 
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        ));
      
      if (isAbortError) {
        return;
      }
      
      // Only log unexpected errors - expected conditions handled gracefully
      if (
        error instanceof Error &&
        !error.message.includes("Video rendition unavailable") &&
        !error.message.includes("No valid media source")
      ) {
        console.error("frameTask error", error);
      }
    },
    onComplete: () => {},
    task: async ([_desiredSeekTimeMs], { signal }) => {
      const t0 = performance.now();

      await withSpan(
        "video.frameTask",
        {
          elementId: this.id || "unknown",
          desiredSeekTimeMs: _desiredSeekTimeMs,
          src: this.src || "none",
        },
        undefined,
        async (span) => {
          const t1 = performance.now();
          span.setAttribute("preworkMs", t1 - t0);

          // Attach .catch() to prevent unhandled rejection - errors handled via taskComplete
          this.unifiedVideoSeekTask.run().catch(() => {});
          const t2 = performance.now();
          span.setAttribute("seekRunMs", t2 - t1);

          try {
            await this.unifiedVideoSeekTask.taskComplete;
          } catch (error) {
            // If aborted, check our signal and return early if it's also aborted
            if (error instanceof DOMException && error.name === "AbortError") {
              signal?.throwIfAborted();
              return; // Our signal not aborted, but seek task was - exit gracefully
            }
            throw error;
          }
          const t3 = performance.now();
          span.setAttribute("seekAwaitMs", t3 - t2);
          // Check abort after async operation
          signal?.throwIfAborted();

          const t4 = performance.now();
          this.paint(_desiredSeekTimeMs, span);
          const t5 = performance.now();
          span.setAttribute("paintMs", t5 - t4);

          if (!this.parentTimegroup) {
            updateAnimations(this);
          }

          span.setAttribute("totalFrameMs", t5 - t0);
        },
      );
    },
  });

  /**
   * Start a delayed loading operation for testing
   */
  startDelayedLoading(
    operationId: string,
    message: string,
    options: { background?: boolean } = {},
  ): void {
    this.delayedLoadingState.startLoading(operationId, message, options);
  }

  /**
   * Clear a delayed loading operation for testing
   */
  clearDelayedLoading(operationId: string): void {
    this.delayedLoadingState.clearLoading(operationId);
  }

  /**
   * Set loading state for user feedback
   */
  private setLoadingState(
    isLoading: boolean,
    operation: LoadingState["operation"] = null,
    message = "",
  ): void {
    this.loadingState = {
      isLoading,
      operation,
      message,
    };
  }

  /**
   * Paint the current video frame to canvas
   * Called by frameTask after seek is complete
   */
  paint(seekToMs: number, parentSpan?: any): void {
    const parentContext = parentSpan
      ? trace.setSpan(context.active(), parentSpan)
      : undefined;

    withSpanSync(
      "video.paint",
      {
        elementId: this.id || "unknown",
        seekToMs,
        src: this.src || "none",
      },
      parentContext,
      (span) => {
        const t0 = performance.now();

        // Check if we're in production rendering mode vs preview mode
        const isProductionRendering = this.isInProductionRenderingMode();
        const t1 = performance.now();
        span.setAttribute("isProductionRendering", isProductionRendering);
        span.setAttribute("modeCheckMs", t1 - t0);

        // Unified video system: smart routing to scrub or main, with background upgrades
        // Note: frameTask guarantees unifiedVideoSeekTask is complete before calling paint
        try {
          const t2 = performance.now();
          const videoSample = this.unifiedVideoSeekTask.value;
          span.setAttribute("hasVideoSample", !!videoSample);
          span.setAttribute("valueAccessMs", t2 - t1);

          if (videoSample) {
            const t3 = performance.now();
            const videoFrame = videoSample.toVideoFrame();
            const t4 = performance.now();
            span.setAttribute("toVideoFrameMs", t4 - t3);

            try {
              const t5 = performance.now();
              this.displayFrame(videoFrame, seekToMs, span);
              const t6 = performance.now();
              span.setAttribute("displayFrameMs", t6 - t5);
            } finally {
              videoFrame.close();
            }
          }
        } catch (error) {
          console.warn("Unified video pipeline error:", error);
        }

        // EF_FRAMEGEN-aware rendering mode detection
        if (!isProductionRendering) {
          // Check if we're in a render clone (used for thumbnails, video export, etc.)
          // Render clones should ALWAYS render, even at time 0
          const isInRenderClone = !!this.closest('.ef-render-clone-container');
          
          if (isInRenderClone) {
            span.setAttribute("renderClone", true);
          }
          
          // Preview mode: skip rendering during initialization to prevent artifacts
          // BUT: Always render if we're in a render clone (for thumbnails/export)
          if (
            !isInRenderClone &&
            (!this.rootTimegroup ||
            (this.rootTimegroup.currentTimeMs === 0 &&
              this.desiredSeekTimeMs === 0))
          ) {
            span.setAttribute("skipped", "preview-initialization");
            return; // Skip initialization frame in preview mode
          }
          // Preview mode: proceed with rendering
        } else {
          // Production rendering mode: only render when EF_FRAMEGEN has explicitly started frame rendering
          // This prevents initialization frames before the actual render sequence begins
          if (!this.rootTimegroup) {
            span.setAttribute("skipped", "no-root-timegroup");
            return;
          }

          if (!this.isFrameRenderingActive()) {
            span.setAttribute("skipped", "frame-rendering-not-active");
            return; // Wait for EF_FRAMEGEN to start frame sequence
          }

          // Production mode: EF_FRAMEGEN has started frame sequence, proceed with rendering
        }

        const tEnd = performance.now();
        span.setAttribute("totalPaintMs", tEnd - t0);
      },
    );
  }

  /**
   * Clear the canvas when element becomes inactive
   */
  clearCanvas(): void {
    if (!this.canvasElement) return;

    const ctx = this.canvasElement.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
  }

  /**
   * Display a video frame on the canvas
   */
  displayFrame(frame: VideoFrame, seekToMs: number, parentSpan?: any): void {
    const parentContext = parentSpan
      ? trace.setSpan(context.active(), parentSpan)
      : undefined;

    withSpanSync(
      "video.displayFrame",
      {
        elementId: this.id || "unknown",
        seekToMs,
        format: frame.format || "unknown",
        width: frame.codedWidth,
        height: frame.codedHeight,
      },
      parentContext,
      (span) => {
        const t0 = performance.now();

        log("trace: displayFrame start", {
          seekToMs,
          frameFormat: frame.format,
        });

        if (!this.canvasElement) {
          log("trace: displayFrame aborted - no canvas element");
          throw new Error(
            `Frame display failed: Canvas element is not available at time ${seekToMs}ms. The video component may not be properly initialized.`,
          );
        }
        const t1 = performance.now();
        span.setAttribute("getCanvasMs", Math.round((t1 - t0) * 100) / 100);

        const ctx = this.canvasElement.getContext("2d");
        const t2 = performance.now();
        span.setAttribute("getCtxMs", Math.round((t2 - t1) * 100) / 100);

        if (!ctx) {
          log("trace: displayFrame aborted - no canvas context");
          throw new Error(
            `Frame display failed: Unable to get 2D canvas context at time ${seekToMs}ms. This may indicate a browser compatibility issue or canvas corruption.`,
          );
        }

        let resized = false;
        if (frame?.codedWidth && frame?.codedHeight) {
          if (
            this.canvasElement.width !== frame.codedWidth ||
            this.canvasElement.height !== frame.codedHeight
          ) {
            log("trace: updating canvas dimensions", {
              width: frame.codedWidth,
              height: frame.codedHeight,
            });
            this.canvasElement.width = frame.codedWidth;
            this.canvasElement.height = frame.codedHeight;
            resized = true;
            const t3 = performance.now();
            span.setAttribute("resizeMs", Math.round((t3 - t2) * 100) / 100);
          }
        }
        span.setAttribute("canvasResized", resized);

        if (frame.format === null) {
          log("trace: displayFrame aborted - null frame format");
          throw new Error(
            `Frame display failed: Video frame has null format at time ${seekToMs}ms. This indicates corrupted or incompatible video data.`,
          );
        }

        const tDrawStart = performance.now();
        ctx.drawImage(
          frame,
          0,
          0,
          this.canvasElement.width,
          this.canvasElement.height,
        );
        const tDrawEnd = performance.now();
        span.setAttribute(
          "drawImageMs",
          Math.round((tDrawEnd - tDrawStart) * 100) / 100,
        );
        span.setAttribute(
          "totalDisplayMs",
          Math.round((tDrawEnd - t0) * 100) / 100,
        );
        span.setAttribute("canvasWidth", this.canvasElement.width);
        span.setAttribute("canvasHeight", this.canvasElement.height);

        log("trace: frame drawn to canvas", { seekToMs });
      },
    );
  }

  /**
   * Check if we're in production rendering mode (EF_FRAMEGEN active) vs preview mode
   */
  private isInProductionRenderingMode(): boolean {
    // Check if EF_RENDERING function exists and returns true (production rendering)
    if (typeof window.EF_RENDERING === "function") {
      return window.EF_RENDERING();
    }

    // Check if workbench is in rendering mode
    const workbench = document.querySelector("ef-workbench") as any;
    if (workbench?.rendering) {
      return true;
    }

    // Check if EF_FRAMEGEN exists and has render options (indicates active rendering)
    if (window.EF_FRAMEGEN?.renderOptions) {
      return true;
    }

    // Default to preview mode
    return false;
  }

  /**
   * Check if EF_FRAMEGEN has explicitly started frame rendering (not just initialization)
   */
  private isFrameRenderingActive(): boolean {
    if (!window.EF_FRAMEGEN?.renderOptions) {
      return false;
    }

    // In production mode, only render when EF_FRAMEGEN has actually begun frame sequence
    // Check if we're past the initialization phase by looking for explicit frame control
    const renderOptions = window.EF_FRAMEGEN.renderOptions;
    const renderStartTime = renderOptions.encoderOptions.fromMs;
    const currentTime = this.rootTimegroup?.currentTimeMs || 0;

    // We're in active frame rendering if:
    // 1. currentTime >= renderStartTime (includes the starting frame)
    return currentTime >= renderStartTime;
  }

  /**
   * Legacy getter for fragment index task
   * Still used by EFCaptions - maps to unified video seek task
   */
  get fragmentIndexTask() {
    return this.unifiedVideoSeekTask;
  }

  /**
   * Helper method for tests: wait for the current frame to be ready
   * This encapsulates the complexity of ensuring the video has updated
   * and its frameTask has completed.
   *
   * @returns Promise that resolves when the frame is ready
   */
  async waitForFrameReady(): Promise<void> {
    // CRITICAL: Sync desiredSeekTimeMs immediately from currentSourceTimeMs
    // The update cycle may not have processed yet, but currentSourceTimeMs
    // is a getter that already reflects the correct time from the parent.
    const currentTime = this.currentSourceTimeMs;
    if (this.desiredSeekTimeMs !== currentTime) {
      this.desiredSeekTimeMs = currentTime;
    }
    await this.updateComplete;
    
    try {
      await this.frameTask.run();
    } catch (error) {
      // AbortErrors are expected when element is disconnected or task is cancelled
      // Return gracefully instead of propagating the error
      const isAbortError = 
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        );
      
      if (isAbortError) {
        return;
      }
      throw error;
    }
  }

  /**
   * Pre-fetch scrub segments for given timestamps.
   * Loads 30-second segments sequentially, emitting progress events.
   * This ensures scrub track is cached for fast thumbnail generation.
   *
   * @param timestamps - Array of timestamps (in ms) that will be captured
   * @param onProgress - Optional callback for loading progress
   * @returns Promise that resolves when all segments are cached
   * @public
   */
  async prefetchScrubSegments(
    timestamps: number[],
    onProgress?: (loaded: number, total: number, segmentTimeRange: [number, number]) => void,
  ): Promise<void> {
    // Wait for media engine to be ready
    const mediaEngine = await this.mediaEngineTask.taskComplete;
    if (!mediaEngine) {
      log("prefetchScrubSegments: no media engine available");
      return;
    }

    // Get scrub rendition
    const scrubRendition = mediaEngine.getScrubVideoRendition();
    if (!scrubRendition) {
      log("prefetchScrubSegments: no scrub rendition available");
      return;
    }

    const scrubRenditionWithSrc = {
      ...scrubRendition,
      src: mediaEngine.src,
    };

    // Compute unique segment IDs needed for all timestamps
    const segmentIds = new Set<number>();
    for (const ts of timestamps) {
      const segmentId = mediaEngine.computeSegmentId(ts, scrubRenditionWithSrc);
      if (segmentId !== undefined) {
        segmentIds.add(segmentId);
      }
    }

    if (segmentIds.size === 0) {
      log("prefetchScrubSegments: no segments to prefetch");
      return;
    }

    // For AssetMediaEngine, the scrub track is a single file (not segmented).
    // We just need to fetch it once, and all segments become cached.
    // Check if ANY segment is already cached (meaning the file is loaded).
    const firstSegmentId = Array.from(segmentIds)[0]!;
    if (mediaEngine.isSegmentCached(firstSegmentId, scrubRenditionWithSrc)) {
      log("prefetchScrubSegments: scrub track already cached");
      return;
    }

    log(`prefetchScrubSegments: fetching scrub track for ${segmentIds.size} segments...`);

    // Emit loading event for the entire duration
    const durationMs = mediaEngine.durationMs || 0;
    this.dispatchEvent(
      new CustomEvent("scrub-segment-loading", {
        detail: {
          segmentId: 0,
          timeRangeMs: [0, durationMs] as [number, number],
          loaded: 0,
          total: 1,
          status: "loading",
        },
        bubbles: true,
        composed: true,
      }),
    );

    // Fetch the scrub track (single file for all segments)
    try {
      await mediaEngine.fetchMediaSegment(firstSegmentId, scrubRenditionWithSrc);
      log(`prefetchScrubSegments: scrub track loaded`);
    } catch (error) {
      log(`prefetchScrubSegments: failed to load scrub track`, error);
    }

    // Emit loaded event
    this.dispatchEvent(
      new CustomEvent("scrub-segment-loading", {
        detail: {
          segmentId: 0,
          timeRangeMs: [0, durationMs] as [number, number],
          loaded: 1,
          total: 1,
          status: "loaded",
        },
        bubbles: true,
        composed: true,
      }),
    );

    // Report progress
    onProgress?.(1, 1, [0, durationMs]);
    log(`prefetchScrubSegments: complete`);
  }

  /**
   * Clean up resources when component is disconnected
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();

    // Clean up delayed loading state
    this.delayedLoadingState.clearAllLoading();
  }

  didBecomeRoot() {
    super.didBecomeRoot();
  }
  didBecomeChild() {
    super.didBecomeChild();
  }

  /**
   * Get the natural dimensions of the video (coded width and height).
   * Returns null if the video hasn't loaded yet or canvas isn't available.
   *
   * @public
   */
  getNaturalDimensions(): { width: number; height: number } | null {
    const canvas = this.canvasElement;
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return null;
    }
    return {
      width: canvas.width,
      height: canvas.height,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-video": EFVideo;
  }
}
