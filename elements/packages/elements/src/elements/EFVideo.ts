import { context, trace } from "@opentelemetry/api";
import debug from "debug";
import { css, html, type PropertyValueMap } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import type { VideoSample } from "mediabunny";
import { DelayedLoadingState } from "../DelayedLoadingState.js";
import { TWMixin } from "../gui/TWMixin.js";
import { withSpanSync } from "../otel/tracingHelpers.js";
import {
  type FrameRenderable,
  type FrameState,
  PRIORITY_VIDEO,
} from "../preview/FrameController.js";
import { MainVideoInputCache } from "./EFMedia/videoTasks/MainVideoInputCache.ts";
import { ScrubInputCache } from "./EFMedia/videoTasks/ScrubInputCache.ts";
import { EFMedia } from "./EFMedia.js";
import { updateAnimations } from "./updateAnimations.js";

// Shared caches for video seeking
const mainVideoInputCache = new MainVideoInputCache();
const scrubInputCache = new ScrubInputCache();

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
export class EFVideo extends TWMixin(EFMedia) implements FrameRenderable {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        object-fit: contain;
        object-position: center;
      }
      canvas {
        overflow: hidden;
        position: static;
        width: 100%;
        height: 100%;
        object-fit: inherit;
        object-position: inherit;
        margin: 0;
        padding: 0;
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

  // ============================================================================
  // FrameRenderable Implementation
  // Centralized frame control - no more Lit Tasks
  // ============================================================================

  /**
   * Cached video sample for the current frame.
   * Set by prepareFrame(), consumed by renderFrame().
   */
  #cachedVideoSample: VideoSample | undefined = undefined;
  #cachedVideoSampleTimeMs: number | undefined = undefined;

  /**
   * Quality upgrade intent tracking.
   * Tracks what upgrade tasks were last submitted to avoid redundant scheduler calls.
   */
  #upgradeState: {
    sourceTimeMs: number;
    segmentId: number;
    startTimeMs: number;
    submittedKeys: Set<string>;
  } | null = null;

  /**
   * Standalone upgrade controller for elements without a timegroup.
   */
  #standaloneUpgradeController: AbortController | null = null;

  /**
   * Current rendition being displayed (for observability).
   */
  #currentRenditionId: "main" | "scrub" | undefined = undefined;

  /**
   * Get the current rendition being displayed.
   * @public
   */
  get currentRenditionId(): "main" | "scrub" | undefined {
    return this.#currentRenditionId;
  }

  /**
   * Query readiness state for a given time.
   * @implements FrameRenderable
   * 
   * Note: The timeMs parameter is the root timegroup's time. We check against
   * this.currentSourceTimeMs since that's what we cache in prepareFrame.
   */
  getFrameState(_timeMs: number): FrameState {
    // Use element's source time to match what prepareFrame caches
    const sourceTimeMs = this.currentSourceTimeMs;
    
    // Check if we have a cached sample for this exact source time
    const hasCache = 
      this.#cachedVideoSample !== undefined && 
      this.#cachedVideoSampleTimeMs === sourceTimeMs;

    return {
      needsPreparation: !hasCache,
      isReady: hasCache,
      priority: PRIORITY_VIDEO,
    };
  }

  /**
   * Async preparation - seeks video and caches the sample.
   * @implements FrameRenderable
   * 
   * Note: The timeMs parameter is the root timegroup's time. We ignore it and
   * use this.currentSourceTimeMs instead, which accounts for:
   * - Our position within the parent timegroup (ownCurrentTimeMs)
   * - Source trimming (sourceIn/sourceOut or trimStart/trimEnd)
   */
  async prepareFrame(_timeMs: number, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    
    // Use element's source time, not the passed root timegroup time.
    // currentSourceTimeMs = ownCurrentTimeMs + (sourceIn || trimStart || 0)
    // This correctly maps timeline position to actual media time.
    const sourceTimeMs = this.currentSourceTimeMs;
    
    const mediaEngine = await this.getMediaEngine(signal);
    if (!mediaEngine) {
      this.#cachedVideoSample = undefined;
      this.#cachedVideoSampleTimeMs = sourceTimeMs;
      return;
    }
    
    signal.throwIfAborted();
    
    // Fetch video sample at the correct source time
    // Handle errors gracefully so one failed seek doesn't break subsequent frames
    try {
      const videoSample = await this.#fetchVideoSampleForFrame(mediaEngine, sourceTimeMs, signal);
      
      signal.throwIfAborted();
      
      // Cache the result
      this.#cachedVideoSample = videoSample;
      this.#cachedVideoSampleTimeMs = sourceTimeMs;
    } catch (error) {
      // Re-throw abort errors to properly handle cancellation
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      
      // For seek errors (NoSample, out of bounds, etc.), just clear cache
      // This allows subsequent frames to retry instead of being stuck
      console.warn(`Video seek error at ${sourceTimeMs}ms:`, error);
      this.#cachedVideoSample = undefined;
      this.#cachedVideoSampleTimeMs = sourceTimeMs;
    }
  }

  /**
   * Synchronous render - paints cached video sample to canvas.
   * @implements FrameRenderable
   * 
   * Note: The timeMs parameter is the root timegroup's time. We use 
   * this.currentSourceTimeMs to match what prepareFrame cached.
   */
  renderFrame(_timeMs: number): void {
    // Use element's source time to match what was cached in prepareFrame
    const sourceTimeMs = this.currentSourceTimeMs;
    
    // Use cached sample if available for this source time
    if (this.#cachedVideoSampleTimeMs === sourceTimeMs && this.#cachedVideoSample) {
      const videoFrame = this.#cachedVideoSample.toVideoFrame();
      try {
        this.displayFrame(videoFrame, sourceTimeMs);
      } finally {
        videoFrame.close();
      }
    }
    
    // Update animations if not in parent timegroup
    if (!this.parentTimegroup) {
      updateAnimations(this);
    }
  }

  /**
   * Fetch video sample for a given time.
   * 
   * Uses a quality routing strategy:
   * - In production rendering: always use main (full quality) track
   * - In preview mode: try scrub track first for faster scrubbing, fall back to main
   * - If main track segment is already cached: use it (avoid redundant lower-quality fetch)
   */
  async #fetchVideoSampleForFrame(
    mediaEngine: any,
    desiredSeekTimeMs: number,
    signal: AbortSignal
  ): Promise<VideoSample | undefined> {
    
    // FIRST: Check if main quality content is already cached - use it if so
    // This avoids redundant lower-quality fetches when main is already loaded
    const mainRendition = mediaEngine.videoRendition;
    if (mainRendition) {
      const mainSegmentId = mediaEngine.computeSegmentId(
        desiredSeekTimeMs,
        mainRendition,
      );
      if (
        mainSegmentId !== undefined &&
        mediaEngine.isSegmentCached(mainSegmentId, mainRendition)
      ) {
        this.#currentRenditionId = "main";
        return this.#getMainVideoSampleForFrame(mediaEngine, desiredSeekTimeMs, signal);
      }
    }

    // SECOND: In production rendering mode, always use main (full quality) track
    if (this.isInProductionRenderingMode()) {
      this.#currentRenditionId = "main";
      return this.#getMainVideoSampleForFrame(mediaEngine, desiredSeekTimeMs, signal);
    }

    // THIRD: In preview mode, try scrub track first for faster scrubbing
    const scrubRendition = mediaEngine.getScrubVideoRendition?.();
    if (scrubRendition) {
      const scrubSample = await this.#getScrubVideoSampleForFrame(
        mediaEngine,
        desiredSeekTimeMs,
        signal
      );
      if (scrubSample) {
        this.#currentRenditionId = "scrub";
        // Got scrub - schedule background quality upgrade
        this.#maybeScheduleQualityUpgrade(mediaEngine, desiredSeekTimeMs);
        return scrubSample;
      }
      // Scrub track failed, fall through to main track
    }

    // FOURTH: Fall back to main video path
    this.#currentRenditionId = "main";
    return this.#getMainVideoSampleForFrame(mediaEngine, desiredSeekTimeMs, signal);
  }

  /**
   * Get scrub (low-resolution) video sample for fast preview scrubbing.
   * Used in preview mode for faster response during timeline scrubbing.
   */
  async #getScrubVideoSampleForFrame(
    mediaEngine: any,
    desiredSeekTimeMs: number,
    signal: AbortSignal
  ): Promise<VideoSample | undefined> {
    const scrubRendition = mediaEngine.getScrubVideoRendition?.();
    if (!scrubRendition) {
      return undefined;
    }

    const scrubRenditionWithSrc = { ...scrubRendition, src: mediaEngine.src };
    const segmentId = mediaEngine.computeSegmentId(desiredSeekTimeMs, scrubRenditionWithSrc);
    if (segmentId === undefined) {
      return undefined;
    }

    // Get cached scrub video input or create new one
    const scrubInput = await scrubInputCache.getOrCreateInput(
      mediaEngine.src,
      segmentId,
      async () => {
        // Fetch scrub video segment
        let initSegment: ArrayBuffer | undefined;
        let mediaSegment: ArrayBuffer | undefined;
        
        try {
          [initSegment, mediaSegment] = await Promise.all([
            mediaEngine.fetchInitSegment(scrubRenditionWithSrc, signal),
            mediaEngine.fetchMediaSegment(segmentId, scrubRenditionWithSrc, signal),
          ]);
        } catch (error) {
          // If aborted, re-throw to propagate cancellation
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          // Return undefined for expected errors - will fall back to main track
          return undefined;
        }

        if (!initSegment || !mediaSegment) {
          return undefined;
        }
        signal.throwIfAborted();

        // Create combined blob and BufferedSeekingInput
        const combinedBlob = new Blob([initSegment, mediaSegment]);
        signal.throwIfAborted();
        
        const arrayBuffer = await combinedBlob.arrayBuffer();
        signal.throwIfAborted();

        const { BufferedSeekingInput } = await import("./EFMedia/BufferedSeekingInput.js");
        
        return new BufferedSeekingInput(
          arrayBuffer,
          {
            videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
            audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
            startTimeOffsetMs: scrubRendition.startTimeOffsetMs,
          },
        );
      }
    );

    if (!scrubInput) {
      return undefined;
    }

    signal.throwIfAborted();

    const videoTrack = await scrubInput.getFirstVideoTrack();
    if (!videoTrack) {
      return undefined;
    }

    signal.throwIfAborted();

    // Cast MediaSample to VideoSample (it's a video track, so it's a VideoSample)
    return scrubInput.seek(videoTrack.id, desiredSeekTimeMs) as Promise<VideoSample | undefined>;
  }

  /**
   * Get main video sample for a given time.
   */
  async #getMainVideoSampleForFrame(
    mediaEngine: any,
    desiredSeekTimeMs: number,
    signal: AbortSignal
  ): Promise<VideoSample | undefined> {
    const videoRendition = mediaEngine.getVideoRendition?.() ?? mediaEngine.videoRendition;
    if (!videoRendition) {
      return undefined;
    }

    const segmentId = mediaEngine.computeSegmentId(desiredSeekTimeMs, videoRendition);
    if (segmentId === undefined) {
      return undefined;
    }

    // Get cached main video input or create new one
    const mainInput = await mainVideoInputCache.getOrCreateInput(
      mediaEngine.src,
      segmentId,
      videoRendition.id,
      async () => {
        // Fetch main video segment
        let initSegment: ArrayBuffer | undefined;
        let mediaSegment: ArrayBuffer | undefined;
        
        try {
          [initSegment, mediaSegment] = await Promise.all([
            mediaEngine.fetchInitSegment(videoRendition, signal),
            mediaEngine.fetchMediaSegment(segmentId, videoRendition, signal),
          ]);
        } catch (error) {
          // If aborted, re-throw to propagate cancellation
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          // Return undefined for expected errors
          if (
            error instanceof Error &&
            (error.message.includes("401") ||
              error.message.includes("UNAUTHORIZED") ||
              error.message.includes("Failed to fetch") ||
              error.message.includes("File not found") ||
              error.message.includes("Media segment not found") ||
              error.message.includes("Init segment not found") ||
              error.message.includes("Track not found"))
          ) {
            return undefined;
          }
          throw error;
        }

        if (!initSegment || !mediaSegment) {
          return undefined;
        }
        signal.throwIfAborted();

        // Create combined blob and BufferedSeekingInput
        const combinedBlob = new Blob([initSegment, mediaSegment]);
        signal.throwIfAborted();
        
        const arrayBuffer = await combinedBlob.arrayBuffer();
        signal.throwIfAborted();

        const { BufferedSeekingInput } = await import("./EFMedia/BufferedSeekingInput.js");
        
        const input = new BufferedSeekingInput(
          arrayBuffer,
          {
            videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
            audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
            startTimeOffsetMs: videoRendition.startTimeOffsetMs,
          },
        );
        return input;
      }
    );

    if (!mainInput) {
      return undefined;
    }

    signal.throwIfAborted();

    const videoTrack = await mainInput.getFirstVideoTrack();
    if (!videoTrack) {
      return undefined;
    }

    signal.throwIfAborted();

    // Cast MediaSample to VideoSample (it's a video track, so it's a VideoSample)
    const sample = (await mainInput.seek(videoTrack.id, desiredSeekTimeMs)) as VideoSample | undefined;
    return sample;
  }

  // ============================================================================
  // End FrameRenderable Implementation
  // ============================================================================

  /**
   * Delayed loading state manager for user feedback
   */
  #delayedLoadingState: DelayedLoadingState;

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
    this.#delayedLoadingState = new DelayedLoadingState(
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

    // Invalidate upgrade state on src/assetId change
    if (changedProperties.has("src") || changedProperties.has("assetId")) {
      this.#invalidateUpgradeState("src-change");
    }

    // Invalidate upgrade state on trim/source changes
    const durationAffectingProps = [
      "_trimStartMs",
      "_trimEndMs",
      "_sourceInMs",
      "_sourceOutMs",
    ];
    const hasDurationChange = durationAffectingProps.some((prop) =>
      changedProperties.has(prop),
    );
    if (hasDurationChange) {
      this.#invalidateUpgradeState("bounds-change");
    }

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


  /**
   * Start a delayed loading operation for testing
   */
  startDelayedLoading(
    operationId: string,
    message: string,
    options: { background?: boolean } = {},
  ): void {
    this.#delayedLoadingState.startLoading(operationId, message, options);
  }

  /**
   * Clear a delayed loading operation for testing
   */
  clearDelayedLoading(operationId: string): void {
    this.#delayedLoadingState.clearLoading(operationId);
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

        // Use cached video sample from prepareFrame
        try {
          const t2 = performance.now();
          const videoSample = this.#cachedVideoSample;
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
          console.warn("Video pipeline error:", error);
        }

        // EF_FRAMEGEN-aware rendering mode detection
        if (!isProductionRendering) {
          // Preview mode: always render
          // Visibility is handled by the phase/visibility system (CSS display:none)
          // No need to skip initialization frames - if element shouldn't be visible,
          // it will be hidden by CSS
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

    const ctx = this.canvasElement.getContext("2d", { willReadFrequently: true });
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

        const ctx = this.canvasElement.getContext("2d", { willReadFrequently: true });
        const t2 = performance.now();
        span.setAttribute("getCtxMs", Math.round((t2 - t1) * 100) / 100);

        if (!ctx) {
          log("trace: displayFrame aborted - no canvas context");
          throw new Error(
            `Frame display failed: Unable to get 2D canvas context at time ${seekToMs}ms. This may indicate a browser compatibility issue or canvas corruption.`,
          );
        }

        const frameWidth = frame.displayWidth;
        const frameHeight = frame.displayHeight;

        let resized = false;
        if (frameWidth && frameHeight) {
          const needsResize =
            frameWidth > this.canvasElement.width ||
            frameHeight > this.canvasElement.height;
          if (needsResize) {
            const newWidth = Math.max(this.canvasElement.width, frameWidth);
            const newHeight = Math.max(this.canvasElement.height, frameHeight);
            log("trace: updating canvas dimensions", {
              width: newWidth,
              height: newHeight,
            });
            this.canvasElement.width = newWidth;
            this.canvasElement.height = newHeight;
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
   * Capture a video frame directly at a source media timestamp.
   * Designed for export/rendering.
   * Does NOT paint to the element's internal canvas.
   * 
   * Uses the same routing logic as unified video system:
   * - "auto": main track for production rendering, follows normal routing otherwise
   * - "scrub": force low-res scrub track (for thumbnails)
   * - "main": force full-quality main track
   * 
   * @param sourceTimeMs - Timestamp in source media coordinates (not timeline)
   * @param options - Capture options including quality and abort signal
   * @returns Frame data for serialization
   * @public
   */
  async captureFrameAtSourceTime(
    sourceTimeMs: number,
    options: {
      quality?: "auto" | "scrub" | "main";
      signal?: AbortSignal;
    } = {}
  ): Promise<{
    dataUrl: string;
    width: number;
    height: number;
  }> {
    const { quality = "auto", signal: providedSignal } = options;
    
    // Create a signal if not provided (public API convenience)
    const signal = providedSignal ?? new AbortController().signal;
    
    // Check abort before starting
    signal.throwIfAborted();

    // 1. Get media engine
    const mediaEngine = await this.getMediaEngine(signal);
    signal.throwIfAborted();
    
    if (!mediaEngine) {
      throw new Error("No media engine available for frame capture");
    }

    // 2. Determine which track to use
    const useMainTrack = quality === "main" || 
      (quality === "auto" && this.isInProductionRenderingMode());

    // 3. Get video sample using the same logic as frame preparation
    // NOTE: BufferedSeekingInput is created per-call. This is intentional for now
    // as caching would require careful lifecycle management.
    let videoSample: any;
    
    // Import BufferedSeekingInput upfront for use in cache factory functions
    const { BufferedSeekingInput } = await import("./EFMedia/BufferedSeekingInput.js");
    signal.throwIfAborted();
    
    if (useMainTrack) {
      // Use main video track with caching
      const videoRendition = mediaEngine.getVideoRendition?.() || mediaEngine.videoRendition;
      if (!videoRendition) {
        throw new Error("No video rendition available");
      }

      const segmentId = mediaEngine.computeSegmentId(sourceTimeMs, videoRendition);
      if (segmentId === undefined) {
        throw new Error(`Cannot compute segment ID for time ${sourceTimeMs}ms`);
      }

      // Use shared cache for BufferedSeekingInput - avoids recreating for same segment
      const seekingInput = await mainVideoInputCache.getOrCreateInput(
        mediaEngine.src,
        segmentId,
        videoRendition.id,
        async () => {
          const [initSegment, mediaSegment] = await Promise.all([
            mediaEngine.fetchInitSegment(videoRendition, signal),
            mediaEngine.fetchMediaSegment(segmentId, videoRendition, signal),
          ]);

          if (!initSegment || !mediaSegment) {
            return undefined;
          }

          const combinedBlob = new Blob([initSegment, mediaSegment]);
          const arrayBuffer = await combinedBlob.arrayBuffer();

          return new BufferedSeekingInput(arrayBuffer, {
            videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
            audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
            startTimeOffsetMs: videoRendition.startTimeOffsetMs,
          });
        }
      );
      signal.throwIfAborted();

      if (!seekingInput) {
        throw new Error(`Failed to fetch video segments for time ${sourceTimeMs}ms`);
      }

      const videoTrack = await seekingInput.getFirstVideoTrack();
      signal.throwIfAborted();
      
      if (!videoTrack) {
        throw new Error("No video track found in segment");
      }

      videoSample = await seekingInput.seek(videoTrack.id, sourceTimeMs);
      signal.throwIfAborted();
    } else {
      // Use scrub track for thumbnails/preview with caching
      const scrubRendition = mediaEngine.getScrubVideoRendition?.();
      if (!scrubRendition) {
        // Fall back to main track if no scrub available
        return this.captureFrameAtSourceTime(sourceTimeMs, { quality: "main", signal });
      }

      const scrubRenditionWithSrc = { ...scrubRendition, src: mediaEngine.src };
      const segmentId = mediaEngine.computeSegmentId(sourceTimeMs, scrubRenditionWithSrc);
      
      if (segmentId === undefined) {
        throw new Error(`Cannot compute scrub segment ID for time ${sourceTimeMs}ms`);
      }

      // Use shared cache for BufferedSeekingInput
      // Include mediaEngine.src in cache key to prevent collisions between different videos
      const seekingInput = await scrubInputCache.getOrCreateInput(
        mediaEngine.src,
        segmentId,
        async () => {
          const [initSegment, mediaSegment] = await Promise.all([
            mediaEngine.fetchInitSegment(scrubRenditionWithSrc, signal),
            mediaEngine.fetchMediaSegment(segmentId, scrubRenditionWithSrc, signal),
          ]);

          if (!initSegment || !mediaSegment) {
            return undefined;
          }

          const combinedBlob = new Blob([initSegment, mediaSegment]);
          const arrayBuffer = await combinedBlob.arrayBuffer();

          return new BufferedSeekingInput(arrayBuffer, {
            videoBufferSize: EFMedia.VIDEO_SAMPLE_BUFFER_SIZE,
            audioBufferSize: EFMedia.AUDIO_SAMPLE_BUFFER_SIZE,
            startTimeOffsetMs: scrubRendition.startTimeOffsetMs,
          });
        }
      );
      signal.throwIfAborted();

      if (!seekingInput) {
        // Fall back to main track
        return this.captureFrameAtSourceTime(sourceTimeMs, { quality: "main", signal });
      }

      const videoTrack = await seekingInput.getFirstVideoTrack();
      signal.throwIfAborted();
      
      if (!videoTrack) {
        // Fall back to main track
        return this.captureFrameAtSourceTime(sourceTimeMs, { quality: "main", signal });
      }

      videoSample = await seekingInput.seek(videoTrack.id, sourceTimeMs);
      signal.throwIfAborted();
    }

    if (!videoSample) {
      throw new Error(`No video sample found at ${sourceTimeMs}ms`);
    }

    // 4. Convert to VideoFrame
    const videoFrame = videoSample.toVideoFrame();

    try {
      signal.throwIfAborted();
      
      // 5. Draw to OffscreenCanvas and encode to dataURL
      const canvas = new OffscreenCanvas(videoFrame.codedWidth, videoFrame.codedHeight);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get 2d context from OffscreenCanvas");
      }
      ctx.drawImage(videoFrame, 0, 0);

      signal.throwIfAborted();

      // Encode to JPEG blob
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
      signal.throwIfAborted();
      
      // Convert blob to dataURL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      signal.throwIfAborted();

      return {
        dataUrl,
        width: videoFrame.codedWidth,
        height: videoFrame.codedHeight,
      };
    } finally {
      videoFrame.close();
    }
  }

  /**
   * Pre-fetch scrub segments for given timestamps.
   * Loads 30-second segments sequentially, emitting progress events.
   * This ensures scrub track is cached for fast thumbnail generation.
   *
   * @param timestamps - Array of timestamps (in ms) that will be captured
   * @param onProgress - Optional callback for loading progress
   * @param signal - Optional AbortSignal for cancellation
   * @returns Promise that resolves when all segments are cached
   * @public
   */
  async prefetchScrubSegments(
    timestamps: number[],
    onProgress?: (loaded: number, total: number, segmentTimeRange: [number, number]) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    // Wait for media engine to be ready
    const mediaEngine = await this.getMediaEngine(signal);
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
    // Create a signal if not provided (prefetch is often called without one)
    const fetchSignal = signal ?? new AbortController().signal;
    try {
      await mediaEngine.fetchMediaSegment(firstSegmentId, scrubRenditionWithSrc, fetchSignal);
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
   * Maybe schedule quality upgrade tasks for this element.
   * Called when returning a scrub sample - checks if state has changed and submits tasks.
   */
  #maybeScheduleQualityUpgrade(mediaEngine: any, sourceTimeMs: number): void {
    const mainRendition = mediaEngine.videoRendition;
    if (!mainRendition) return;

    const segmentId = mediaEngine.computeSegmentId(sourceTimeMs, mainRendition);
    if (segmentId === undefined) return;

    const startTimeMs = this.startTimeMs;

    // Check: has anything changed since last submission?
    const stateChanged =
      this.#upgradeState === null ||
      this.#upgradeState.segmentId !== segmentId ||
      this.#upgradeState.startTimeMs !== startTimeMs;

    if (!stateChanged) return; // Nothing changed - O(1) early exit

    const segments = this.#computeLookaheadSegments(mediaEngine, sourceTimeMs, mainRendition);
    if (segments.length === 0) return; // All segments already cached

    const tasks = segments.map((seg) => ({
      key: `${this.id}:${seg.segmentId}:${mainRendition.id}`,
      fetch: async (signal: AbortSignal) => {
        await mediaEngine.fetchInitSegment(mainRendition, signal);
        await mediaEngine.fetchMediaSegment(seg.segmentId, mainRendition, signal);
      },
      deadlineMs: seg.deadlineMs,
      owner: this.id,
    }));

    const scheduler = this.rootTimegroup?.qualityUpgradeScheduler;
    if (scheduler) {
      scheduler.replaceForOwner(this.id, tasks);
    } else {
      // Standalone mode: fire-and-forget
      this.#fetchStandalone(tasks);
    }

    // Update intent state
    this.#upgradeState = {
      sourceTimeMs,
      segmentId,
      startTimeMs,
      submittedKeys: new Set(tasks.map((t) => t.key)),
    };
  }

  /**
   * Compute lookahead segments with deadlines in timeline space.
   */
  #computeLookaheadSegments(
    mediaEngine: any,
    currentSourceTimeMs: number,
    rendition: any,
    maxLookahead: number = 5,
  ): { segmentId: number; deadlineMs: number }[] {
    const segmentCount = rendition.segmentDurationsMs?.length
      ?? Math.ceil(mediaEngine.durationMs / (rendition.segmentDurationMs || 1000));

    const currentSegmentId = mediaEngine.computeSegmentId(currentSourceTimeMs, rendition);
    if (currentSegmentId === undefined) return [];

    const results: { segmentId: number; deadlineMs: number }[] = [];
    const playheadMs = this.rootTimegroup?.currentTimeMs ?? 0;

    // Walk segment IDs directly (1-based), bounded by actual segment count
    let cumulativeSourceMs = currentSourceTimeMs;
    for (let id = currentSegmentId; id <= Math.min(currentSegmentId + maxLookahead, segmentCount); id++) {
      if (mediaEngine.isSegmentCached(id, rendition)) continue;

      // Deadline = current playhead + offset from current source time
      const offsetFromCurrentMs = cumulativeSourceMs - currentSourceTimeMs;
      const deadlineMs = playheadMs + offsetFromCurrentMs;

      results.push({ segmentId: id, deadlineMs });

      // Advance cumulative time by this segment's duration
      const segDuration = rendition.segmentDurationsMs?.[id - 1]
        ?? rendition.segmentDurationMs ?? 2000;
      cumulativeSourceMs += segDuration;
    }

    return results;
  }

  /**
   * Standalone mode: fetch tasks sequentially without scheduler.
   */
  #fetchStandalone(tasks: any[]): void {
    // Abort any previous standalone batch (e.g., after seek)
    this.#standaloneUpgradeController?.abort();
    this.#standaloneUpgradeController = new AbortController();
    const signal = this.#standaloneUpgradeController.signal;

    // Process sequentially
    (async () => {
      for (const task of tasks) {
        if (signal.aborted) break;
        try {
          await task.fetch(signal);
        } catch {
          // Continue on error
        }
      }
      // After all tasks complete, trigger re-render
      if (!signal.aborted) {
        this.playbackController?.runThrottledFrameTask();
      }
    })();
  }

  /**
   * Invalidate upgrade state and optionally cancel queued tasks.
   */
  #invalidateUpgradeState(reason: "src-change" | "bounds-change" | "disconnect"): void {
    if (reason === "src-change" || reason === "disconnect") {
      // Full cancel - old tasks reference a stale media engine
      this.rootTimegroup?.qualityUpgradeScheduler?.cancelForOwner(this.id);
    }
    // For bounds-change, don't cancel - old tasks may still be valid segments,
    // just with stale deadlines. replaceForOwner on next prepareFrame handles it.
    this.#upgradeState = null;
  }

  /**
   * Clean up resources when component is disconnected
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();

    // Clean up delayed loading state
    this.#delayedLoadingState.clearAllLoading();

    // Cancel upgrade tasks (centralized or standalone)
    this.#invalidateUpgradeState("disconnect");
    this.#standaloneUpgradeController?.abort();
    this.#standaloneUpgradeController = null;
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
