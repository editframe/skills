import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  StreamTarget,
  CanvasSource,
  AudioBufferSource,
  QUALITY_HIGH,
  canEncodeAudio,
  getEncodableAudioCodecs,
  type VideoEncodingConfig,
  type AudioEncodingConfig,
  type AudioCodec,
} from "mediabunny";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import {
  type ContentReadyMode,
  renderToImageNative,
  resetRenderState,
  renderToImage,
} from "./renderTimegroupToCanvas.js";
import {
  buildCloneStructure,
  collectDocumentStyles,
  syncStyles,
  traverseCloneTree,
  overrideRootCloneStyles,
  type SyncState,
} from "./renderTimegroupPreview.js";
import { isNativeCanvasApiEnabled } from "./previewSettings.js";

export interface RenderProgress {
  /** Progress ratio (0-1) */
  progress: number;
  /** Current frame being rendered (1-indexed) */
  currentFrame: number;
  /** Total number of frames to render */
  totalFrames: number;
  /** Video time rendered so far in milliseconds */
  renderedMs: number;
  /** Total video duration in milliseconds */
  totalDurationMs: number;
  /** Elapsed wall-clock time in milliseconds */
  elapsedMs: number;
  /** Estimated remaining time in milliseconds */
  estimatedRemainingMs: number;
  /** Render speed as a multiplier (e.g., 0.5 = half realtime, 2 = 2x realtime) */
  speedMultiplier: number;
  /** Data URL of the current frame preview (small thumbnail) */
  framePreviewUrl?: string;
}

export interface RenderToVideoOptions {
  /** Frames per second for the output video. Defaults to timegroup's fps or 30. */
  fps?: number;
  /** Video codec to use. Defaults to 'avc' (H.264). */
  codec?: "avc" | "hevc" | "vp9" | "av1" | "vp8";
  /** Bitrate in bits per second, or use QUALITY_HIGH, QUALITY_MEDIUM, etc. */
  bitrate?: number;
  /** Filename for the downloaded video. Defaults to 'timegroup-video.mp4'. */
  filename?: string;
  /** Scale factor for resolution (1 = full size, 0.5 = half). Defaults to 1. */
  scale?: number;
  /** Key frame interval in seconds. Defaults to 2. */
  keyFrameInterval?: number;
  /** Start time in milliseconds. Defaults to 0. */
  fromMs?: number;
  /** End time in milliseconds. Defaults to timegroup duration. */
  toMs?: number;
  /** Called with detailed progress info during rendering. */
  onProgress?: (progress: RenderProgress) => void;
  /** 
   * If true, use File System Access API to stream output directly to disk.
   * This reduces memory usage for large videos. Falls back to buffer if unavailable.
   * Defaults to true (will prompt user for save location).
   */
  streaming?: boolean;
  /** AbortSignal for cancelling the render */
  signal?: AbortSignal;
  /** 
   * If true, includes audio in the output. Defaults to true.
   * Audio is rendered using the timegroup's renderAudio method.
   */
  includeAudio?: boolean;
  /** Audio bitrate in bits per second. Defaults to 128kbps. */
  audioBitrate?: number;
  /** 
   * Content readiness strategy. Defaults to "blocking" for video export.
   * - "blocking": Wait for video content to be ready, throw on timeout
   * - "immediate": Capture immediately, may have blank frames
   */
  contentReadyMode?: ContentReadyMode;
  /** Max wait time for blocking mode before throwing (default 5000ms) */
  blockingTimeoutMs?: number;
  /**
   * If true, returns the video buffer instead of triggering a download.
   * Only works when streaming is false. Useful for server-side rendering.
   */
  returnBuffer?: boolean;
  /**
   * Priority list of acceptable audio codecs. The first codec that is supported
   * by the browser's encoder will be used. If none are supported, an error is thrown.
   * 
   * If not provided, defaults to ["aac", "opus"] for broad compatibility.
   * For AAC-only output (e.g., server-side splicing), use ["aac"].
   * 
   * @example
   * // Require AAC for compatibility with server-side audio stitching
   * preferredAudioCodecs: ["aac"]
   * 
   * @example
   * // Prefer AAC, but fall back to Opus if not available
   * preferredAudioCodecs: ["aac", "opus"]
   */
  preferredAudioCodecs?: AudioCodec[];
  /**
   * If true, renders all frames but skips video encoding and output.
   * Used for benchmarking the pure rendering pipeline without encoder overhead.
   * Returns undefined (no video output).
   */
  benchmarkMode?: boolean;
}

/**
 * Canvas encoding strategy - determines how frames are captured and encoded.
 * Enumerated to make the strategy selection explicit rather than scattered conditionals.
 */
export type CanvasStrategy =
  | { type: "direct"; captureCanvas: HTMLCanvasElement }
  | { type: "fast"; canvas: OffscreenCanvas; captureCanvas: HTMLCanvasElement }
  | { type: "scaled"; canvas: OffscreenCanvas; captureCanvas: HTMLCanvasElement; scale: number };

/**
 * Resolved configuration after parsing options and evaluating timegroup state.
 * Separates "what to render" from "how to render".
 */
export interface ResolvedRenderConfig {
  fps: number;
  codec: "avc" | "hevc" | "vp9" | "av1" | "vp8";
  bitrate: number;
  filename: string;
  scale: number;
  keyFrameInterval: number;
  startMs: number;
  endMs: number;
  renderDurationMs: number;
  timegroupWidth: number;
  timegroupHeight: number;
  videoWidth: number;
  videoHeight: number;
  totalFrames: number;
  frameDurationMs: number;
  frameDurationS: number;
  streaming: boolean;
  includeAudio: boolean;
  audioBitrate: number;
  contentReadyMode: ContentReadyMode;
  blockingTimeoutMs: number;
  returnBuffer: boolean;
  preferredAudioCodecs: AudioCodec[];
  benchmarkMode: boolean;
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
}

/**
 * Timing results from rendering a single frame.
 * Used for profiling accumulation.
 */
export interface FrameTimings {
  seekMs: number;
  syncMs: number;
  renderMs: number;
  canvasMs: number;
}

/** Error thrown when no supported audio codec is available */
export class NoSupportedAudioCodecError extends Error {
  constructor(requestedCodecs: AudioCodec[], availableCodecs: AudioCodec[]) {
    super(
      `No supported audio codec found. Requested: [${requestedCodecs.join(", ")}], ` +
      `Available: [${availableCodecs.length > 0 ? availableCodecs.join(", ") : "none"}]`
    );
    this.name = "NoSupportedAudioCodecError";
  }
}

/** Error thrown when render is cancelled */
export class RenderCancelledError extends Error {
  constructor() {
    super("Render cancelled");
    this.name = "RenderCancelledError";
  }
}

/**
 * Check if File System Access API is available for streaming writes
 */
function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

/**
 * Prompt user to select a save location and return a writable stream
 */
async function getFileWritableStream(
  filename: string,
): Promise<{ writable: WritableStream<Uint8Array>; close: () => Promise<void> } | null> {
  if (!isFileSystemAccessSupported()) {
    return null;
  }

  try {
    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: "MP4 Video",
          accept: { "video/mp4": [".mp4"] },
        },
      ],
    });

    const writable = await fileHandle.createWritable();
    return {
      writable,
      close: async () => {
        await writable.close();
      },
    };
  } catch (e) {
    // User cancelled or API not available
    if ((e as Error).name !== "AbortError") {
      console.warn("[renderToVideo] File System Access failed:", e);
    }
    return null;
  }
}

/**
 * Get all audio codecs that can be encoded by this browser.
 * Useful for checking codec availability before starting a render.
 * 
 * @param options - Optional encoding parameters to check against
 * @returns Promise resolving to array of supported audio codecs
 * 
 * @example
 * const codecs = await getSupportedAudioCodecs();
 * console.log("Available codecs:", codecs); // e.g., ["opus", "flac"]
 */
export async function getSupportedAudioCodecs(options?: {
  numberOfChannels?: number;
  sampleRate?: number;
  bitrate?: number;
}): Promise<AudioCodec[]> {
  const { numberOfChannels = 2, sampleRate = 48000, bitrate = 128000 } = options ?? {};
  return getEncodableAudioCodecs(undefined, { numberOfChannels, sampleRate, bitrate });
}

/**
 * Select the first supported audio codec from a priority list.
 * Throws NoSupportedAudioCodecError if none are supported.
 * 
 * @param preferredCodecs - Priority list of codecs to try
 * @param encodingOptions - Encoding parameters to check against
 * @returns Promise resolving to the selected codec
 * @throws NoSupportedAudioCodecError if no codec is supported
 */
async function selectAudioCodec(
  preferredCodecs: AudioCodec[],
  encodingOptions: { numberOfChannels: number; sampleRate: number; bitrate: number },
): Promise<AudioCodec> {
  const { numberOfChannels, sampleRate, bitrate } = encodingOptions;
  
  // Check each preferred codec in order
  for (const codec of preferredCodecs) {
    try {
      const isSupported = await canEncodeAudio(codec, {
        numberOfChannels,
        sampleRate,
        bitrate,
      });
      if (isSupported) {
        return codec;
      }
    } catch (e) {
      console.warn(`[selectAudioCodec] Check failed for ${codec}:`, e);
    }
  }
  
  // No preferred codec is supported - get available codecs for error message
  const availableCodecs = await getEncodableAudioCodecs(undefined, {
    numberOfChannels,
    sampleRate,
    bitrate,
  });
  
  throw new NoSupportedAudioCodecError(preferredCodecs, availableCodecs);
}

/**
 * Resolve render configuration from options and timegroup state.
 * Pure function - all dimension calculations, defaults, and validation happen here.
 */
function resolveRenderConfig(
  timegroup: EFTimegroup,
  options: RenderToVideoOptions
): ResolvedRenderConfig {
  const fps = options.fps ?? timegroup.effectiveFps ?? 30;
  const codec = options.codec ?? "avc";
  const bitrate = options.bitrate ?? 8_000_000;
  const filename = options.filename ?? "timegroup-video.mp4";
  const scale = options.scale ?? 1;
  const keyFrameInterval = options.keyFrameInterval ?? 2;
  const fromMs = options.fromMs ?? 0;
  const streaming = options.streaming ?? true;
  const includeAudio = options.includeAudio ?? true;
  const audioBitrate = options.audioBitrate ?? 128_000;
  const contentReadyMode = options.contentReadyMode ?? "blocking";
  const blockingTimeoutMs = options.blockingTimeoutMs ?? 5000;
  const returnBuffer = options.returnBuffer ?? false;
  const preferredAudioCodecs = options.preferredAudioCodecs ?? ["aac", "opus"];
  const benchmarkMode = options.benchmarkMode ?? false;

  const totalDurationMs = timegroup.durationMs;
  if (!totalDurationMs || totalDurationMs <= 0) {
    throw new Error("Timegroup has no duration");
  }

  const startMs = Math.max(0, fromMs);
  const endMs = options.toMs !== undefined ? Math.min(options.toMs, totalDurationMs) : totalDurationMs;
  const renderDurationMs = endMs - startMs;
  
  if (renderDurationMs <= 0) {
    throw new Error(`Invalid render range: from ${startMs}ms to ${endMs}ms`);
  }

  const timegroupWidth = timegroup.offsetWidth || 1920;
  const timegroupHeight = timegroup.offsetHeight || 1080;
  const width = Math.floor(timegroupWidth * scale);
  const height = Math.floor(timegroupHeight * scale);

  // Ensure even dimensions (required for H.264)
  const videoWidth = width % 2 === 0 ? width : width - 1;
  const videoHeight = height % 2 === 0 ? height : height - 1;

  const frameDurationMs = 1000 / fps;
  const totalFrames = Math.ceil(renderDurationMs / frameDurationMs);
  const frameDurationS = frameDurationMs / 1000;

  return {
    fps,
    codec,
    bitrate,
    filename,
    scale,
    keyFrameInterval,
    startMs,
    endMs,
    renderDurationMs,
    timegroupWidth,
    timegroupHeight,
    videoWidth,
    videoHeight,
    totalFrames,
    frameDurationMs,
    frameDurationS,
    streaming,
    includeAudio,
    audioBitrate,
    contentReadyMode,
    blockingTimeoutMs,
    returnBuffer,
    preferredAudioCodecs,
    benchmarkMode,
    onProgress: options.onProgress,
    signal: options.signal,
  };
}

/**
 * Select the canvas encoding strategy based on configuration.
 * Returns the appropriate canvases for the chosen strategy.
 * 
 * For video export, we use skipDprScaling=true in renderToImageNative which sets effectiveDPR=1.
 * The capture canvas must be sized consistently at 1x (not display DPR) to avoid dimension
 * mismatches and canvas resizing which clears content.
 * 
 * drawElementImage renders the element at its CSS size into the canvas buffer.
 * When both canvas buffer and CSS are at 1x logical dimensions, we get 1:1 rendering.
 * Scaling to video dimensions happens in a single drawImage step.
 */
function selectCanvasStrategy(config: ResolvedRenderConfig): CanvasStrategy {
  const { scale, timegroupWidth, timegroupHeight, videoWidth, videoHeight } = config;
  
  // For video export, we skip DPR scaling (skipDprScaling=true in renderToImageNative).
  // This provides 4x speedup on 2x DPR displays and simpler dimension management.
  // The effective DPR is always 1 for video export.
  const effectiveDpr = 1;
  const captureWidth = Math.floor(timegroupWidth * effectiveDpr);
  const captureHeight = Math.floor(timegroupHeight * effectiveDpr);
  
  // OPTIMIZATION: Check if we can encode directly from capture canvas (no intermediate copy)
  // Possible when effectiveDPR=1, scale=1 and dimensions match exactly
  const canEncodeDirectFromCapture = scale === 1 && 
    captureWidth === videoWidth && 
    captureHeight === videoHeight;

  // Create capture canvas at 1x dimensions (matching skipDprScaling=true)
  // CSS size matches buffer size so drawElementImage renders at 1:1
  const captureCanvas = document.createElement("canvas");
  captureCanvas.width = captureWidth;
  captureCanvas.height = captureHeight;
  captureCanvas.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: ${timegroupWidth}px;
    height: ${timegroupHeight}px;
    opacity: 0;
    pointer-events: none;
    z-index: -9999;
  `;

  if (canEncodeDirectFromCapture) {
    return { type: "direct", captureCanvas };
  }

  // Create offscreen canvas for encoding at final video dimensions
  const canvas = new OffscreenCanvas(videoWidth, videoHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2d context");
  }

  // Check if we can use fast path (direct 1:1 copy, no scaling needed)
  // Possible when scale=1 (dimensions just needed even adjustment)
  const canUseFastPath = scale === 1 && 
    captureWidth === videoWidth && 
    captureHeight === videoHeight;

  if (canUseFastPath) {
    return { type: "fast", canvas, captureCanvas };
  }

  // Use scaled path: single drawImage from capture to video dimensions
  return { type: "scaled", canvas, captureCanvas, scale };
}

/**
 * Debug logging for first frame content verification.
 * Only called when frameIndex === 0 to verify rendering is working.
 */
function debugFirstFrame(
  image: HTMLCanvasElement | HTMLImageElement,
): void {
  if (image instanceof HTMLImageElement) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(image, 0, 0);
     
      const bgColor = { r: 15, g: 23, b: 42 };
      let nonBgCount = 0;
      const scanData = tempCtx.getImageData(0, 0, image.width, image.height).data;
      for (let i = 0; i < scanData.length; i += 4) {
        if (Math.abs(scanData[i]! - bgColor.r) > 10 || 
            Math.abs(scanData[i+1]! - bgColor.g) > 10 || 
            Math.abs(scanData[i+2]! - bgColor.b) > 10) {
          nonBgCount++;
        }
      }
    }
  } else {
    const canvasImage = image as HTMLCanvasElement;
    const debugCtx = canvasImage.getContext("2d");
    if (debugCtx) {
      const samples = [
        { x: canvasImage.width / 2, y: canvasImage.height / 2, name: "center" },
        { x: 100, y: 100, name: "top-left" },
        { x: canvasImage.width - 100, y: 100, name: "top-right" },
        { x: 100, y: canvasImage.height - 100, name: "bottom-left" },
        { x: canvasImage.width / 2, y: 100, name: "top-center" },
      ];
      for (const s of samples) {
        const p = debugCtx.getImageData(Math.floor(s.x), Math.floor(s.y), 1, 1).data;
      }
      const bgColor = { r: 15, g: 23, b: 42 };
      let nonBgCount = 0;
      const scanData = debugCtx.getImageData(0, 0, canvasImage.width, Math.min(200, canvasImage.height)).data;
      for (let i = 0; i < scanData.length; i += 4) {
        if (Math.abs(scanData[i]! - bgColor.r) > 10 || 
            Math.abs(scanData[i+1]! - bgColor.g) > 10 || 
            Math.abs(scanData[i+2]! - bgColor.b) > 10) {
          nonBgCount++;
        }
      }
    }
  }
}

/**
 * Renders a timegroup to an MP4 video file.
 * 
 * By default, prompts user to select a save location and streams the video
 * directly to disk as it renders (using File System Access API). This keeps
 * memory usage low for large videos.
 * 
 * Falls back to in-memory buffer + download if streaming is unavailable or
 * the user cancels the file picker.
 */
export async function renderTimegroupToVideo(
  timegroup: EFTimegroup,
  options: RenderToVideoOptions = {},
): Promise<Uint8Array | undefined> {
  // Resolve configuration (pure evaluation of "what to render")
  const config = resolveRenderConfig(timegroup, options);
  const {
    fps, codec, bitrate, filename, keyFrameInterval,
    startMs, endMs, renderDurationMs,
    timegroupWidth, timegroupHeight, videoWidth, videoHeight,
    totalFrames, frameDurationMs, frameDurationS,
    streaming, includeAudio, audioBitrate,
    contentReadyMode, blockingTimeoutMs, returnBuffer,
    preferredAudioCodecs, benchmarkMode,
    onProgress, signal,
  } = config;

  // Check for cancellation
  const checkCancelled = () => {
    if (signal?.aborted) {
      throw new RenderCancelledError();
    }
  };

  // Select canvas strategy (determines how frames are captured and encoded)
  const strategy = selectCanvasStrategy(config);
  const captureCanvas = strategy.captureCanvas;

  // Get encoding canvas and context based on strategy
  let canvas: OffscreenCanvas | null = null;
  let ctx: OffscreenCanvasRenderingContext2D | null = null;

  if (strategy.type === "fast" || strategy.type === "scaled") {
    canvas = strategy.canvas;
    ctx = canvas.getContext("2d");
  }

  // Skip encoder setup in benchmark mode
  let videoSource: CanvasSource | null = null;
  let target: BufferTarget | StreamTarget | null = null;
  let output: Output | null = null;
  let fileStream: { writable: WritableStream<Uint8Array>; close: () => Promise<void> } | null = null;
  let useStreaming = false;

  if (!benchmarkMode) {
    const encodingConfig: VideoEncodingConfig = {
      codec,
      bitrate,
      keyFrameInterval,
    };

    // Try to get a file stream for direct-to-disk writing
    if (streaming) {
      fileStream = await getFileWritableStream(filename);
      useStreaming = fileStream !== null;
    }

    // Create video source based on strategy
    if (strategy.type !== "direct" && canvas) {
      videoSource = new CanvasSource(canvas, encodingConfig);
    }

    if (useStreaming && fileStream) {
      target = new StreamTarget(fileStream.writable);
      output = new Output({
        format: new Mp4OutputFormat({ fastStart: "fragmented" }),
        target,
      });
    } else {
      target = new BufferTarget();
      output = new Output({
        format: new Mp4OutputFormat(),
        target,
      });
    }

    // Only add video track if we have one (direct strategy adds it later)
    if (videoSource) {
      output.addVideoTrack(videoSource);
    }
  }

  // Set up audio source for chunked rendering
  let audioSource: AudioBufferSource | null = null;
  let selectedAudioCodec: AudioCodec | null = null;
  const audioChunkDurationMs = 2000;
  let lastRenderedAudioEndMs = startMs;
  
  if (includeAudio && !benchmarkMode && output) {
    selectedAudioCodec = await selectAudioCodec(preferredAudioCodecs, {
      numberOfChannels: 2,
      sampleRate: 48000,
      bitrate: audioBitrate,
    });
    
    const audioEncodingConfig: AudioEncodingConfig = {
      codec: selectedAudioCodec,
      bitrate: audioBitrate,
    };
    audioSource = new AudioBufferSource(audioEncodingConfig);
    output.addAudioTrack(audioSource);
  }

  // Helper to render audio chunk up to a given time
  const renderAudioUpTo = async (targetTimeMs: number) => {
    if (!audioSource || targetTimeMs <= lastRenderedAudioEndMs) return;
    
    const chunkStartMs = lastRenderedAudioEndMs;
    const chunkEndMs = Math.min(targetTimeMs, endMs);
    
    if (chunkEndMs <= chunkStartMs) return;
    
    try {
      const audioBuffer = await timegroup.renderAudio(chunkStartMs, chunkEndMs);
      if (audioBuffer && audioBuffer.length > 0) {
        await audioSource.add(audioBuffer);
      }
      lastRenderedAudioEndMs = chunkEndMs;
    } catch (e) {
      lastRenderedAudioEndMs = chunkEndMs;
    }
  };

  const renderStartTime = performance.now();
  const audioStatus = includeAudio ? (audioSource ? "with audio" : "audio disabled") : "audio disabled";
  
  // Reset render profiling for clean export stats
  resetRenderState();
  
  // Property validation is expensive (getComputedStyle on all nodes every 30 frames)
  // Only enable during development debugging, not production exports
  // enablePropertyValidation();

  // NOTE: With Clone-timeline architecture, Prime-timeline is NEVER seeked during render.
  // User can continue previewing/editing at their current position during export.

  let lastLoggedPercent = -1;
  
  // CLONE-TIMELINE ARCHITECTURE:
  // Create a fully functional render clone that can be seeked independently.
  // This keeps Prime-timeline at userTimeMs (user can preview/edit during render).
  const { clone: renderClone, container: renderContainer, cleanup: cleanupRenderClone } =
    await timegroup.createRenderClone();
  
  // Pre-fetch scrub segments for all video elements to ensure fast seeks
  // This is critical for performance - without prefetching, each seek requires loading segments on-demand
  const prefetchStartTime = performance.now();
  const videoElements = renderClone.querySelectorAll("ef-video");
  if (videoElements.length > 0) {
    // Generate all timestamps that will be rendered
    const allTimestamps: number[] = [];
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      allTimestamps.push(startMs + frameIndex * frameDurationMs);
    }
    
    await Promise.all(
      Array.from(videoElements).map((video) =>
        (video as any).prefetchScrubSegments(allTimestamps),
      ),
    );
  }
  
  // Determine rendering path: native (fast) vs foreignObject (fallback)
  const useNativePath = isNativeCanvasApiEnabled();
  
  // For foreignObject path: collect document styles ONCE and build clone structure ONCE
  // Clone structure is reused across frames - only styles are synced per-frame
  // Canvas clones are refreshed during syncStyles, so shadow DOM content is captured correctly
  let collectedStyles: string | null = null;
  let foCloneState: { container: HTMLDivElement; syncState: SyncState; previewContainer: HTMLDivElement } | null = null;
  
  if (!useNativePath) {
    collectedStyles = collectDocumentStyles();
    // Clone structure will be built after first seek in the loop
    foCloneState = null;
  } else {
    // Native path: keep render clone inside canvas for whole export.
    // CRITICAL: Set layoutsubtree BEFORE adding any content to the canvas!
    // drawElementImage requires the canvas to have layoutsubtree set from the start.
    captureCanvas.setAttribute("layoutsubtree", "");
    (captureCanvas as any).layoutSubtree = true;
    
    // Use transform to move offscreen during seeks (avoids layout, ~28% faster seeks).
    // Toggle visibility only for capture.
    renderContainer.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${timegroupWidth}px;
      height: ${timegroupHeight}px;
      pointer-events: none;
      overflow: hidden;
      opacity: 0;
      transform: translateX(-9999px);
    `;
    captureCanvas.appendChild(renderContainer);
  }
  
  document.body.appendChild(captureCanvas);
  
  // CRITICAL: Moving/re-appending renderContainer triggers connectedCallback again, 
  // which creates a new PlaybackController. Remove it after ALL DOM operations are done.
  if (renderClone.playbackController) {
    renderClone.playbackController.remove();
    renderClone.playbackController = undefined;
  }
  
  // For direct strategy, create video source from capture canvas
  if (strategy.type === "direct" && !benchmarkMode && output) {
    const encodingConfig: VideoEncodingConfig = {
      codec,
      bitrate,
      keyFrameInterval,
    };
    videoSource = new CanvasSource(captureCanvas, encodingConfig);
    output.addVideoTrack(videoSource);
  }
  
  // Start output after all tracks are added
  if (output) {
    await output.start();
  }

  // Profiling accumulators
  let totalSeekMs = 0;
  let totalSyncMs = 0;
  let totalRenderMs = 0;
  let totalCanvasMs = 0;
  let totalEncodeMs = 0;
  let totalAudioMs = 0;
  let audioChunkCount = 0;

  try {
    // Render initial audio chunk
    if (audioSource) {
      const audioStart = performance.now();
      await renderAudioUpTo(startMs + audioChunkDurationMs);
      totalAudioMs += performance.now() - audioStart;
      audioChunkCount++;
    }

    // Persist frame preview URL across frames (toDataURL is expensive, only generate every 10 frames)
    let lastFramePreviewUrl: string | undefined;
    
    // OPTIMIZATION: Frame encoding queue for pipelining
    // We can pipeline encoding with rendering by capturing a bitmap snapshot
    // before modifying the canvas, allowing the encoder to read stable pixels
    const MAX_PENDING_ENCODES = 2;
    const pendingEncodes: Promise<void>[] = [];
    
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      // Check for cancellation at start of each frame
      checkCancelled();
      
      const timeMs = startMs + frameIndex * frameDurationMs;
      const timestampS = (frameIndex * frameDurationMs) / 1000;

      // Render audio chunk if we've passed the next chunk boundary
      const nextAudioChunkEnd = lastRenderedAudioEndMs + audioChunkDurationMs;
      if (audioSource && timeMs >= nextAudioChunkEnd) {
        const audioStart = performance.now();
        await renderAudioUpTo(Math.min(timeMs + audioChunkDurationMs, endMs));
        totalAudioMs += performance.now() - audioStart;
        audioChunkCount++;
      }

      // CLONE-TIMELINE: Seek the render clone to target time
      // Prime-timeline is NEVER seeked during render - user preview stays stable
      // NOTE: For ForeignObject path, seek is handled inside the pipelined section
      if (useNativePath) {
        const seekStart = performance.now();
        await renderClone.seekForRender(timeMs);
        totalSeekMs += performance.now() - seekStart;
      }
      
      // Wait for video content if in blocking mode (NATIVE PATH ONLY)
      // NOTE: ForeignObject path handles seeking inside its own section - the blocking loop
      // would check stale video content since FO seeks happen later in the loop.
      // This RAF-polling loop is the main bottleneck for video exports.
      if (useNativePath && contentReadyMode === "blocking") {
        // Query videos from the CLONE (not Prime)
        const allVideos = renderClone.querySelectorAll("ef-video");
        if (allVideos.length > 0) {
          // Simple check: wait for videos to have content
          const waitStart = performance.now();
          while (performance.now() - waitStart < blockingTimeoutMs) {
            let allReady = true;
            for (const video of allVideos) {
              const shadowCanvas = video.shadowRoot?.querySelector("canvas");
              if (shadowCanvas && shadowCanvas.width > 0) {
                const ctx = shadowCanvas.getContext("2d");
                if (ctx) {
                  const data = ctx.getImageData(0, 0, 1, 1).data;
                  if (data[0] === 0 && data[1] === 0 && data[2] === 0 && data[3] === 0) {
                    allReady = false;
                    break;
                  }
                }
              }
            }
            if (allReady) break;
            await new Promise(r => requestAnimationFrame(r));
          }
        }
      }
      
      // Render to image based on path
      const renderStart = performance.now();
      let image: HTMLCanvasElement | HTMLImageElement;
      
      if (useNativePath) {
        // NATIVE PATH: Reuse captureCanvas to keep renderContainer attached.
        // Without reuseCanvas, renderToImageNative creates a new canvas each frame,
        // orphaning renderContainer when the temp canvas is removed - causing black content.
        
        // Make both canvas and container visible for layout
        // drawElementImage requires elements to be laid out (not hidden)
        const savedCanvasOpacity = captureCanvas.style.opacity;
        captureCanvas.style.opacity = "1";
        renderContainer.style.transform = "none";
        renderContainer.style.opacity = "1";
        
        // Pass renderContainer with reuseCanvas to keep everything in the DOM
        image = await renderToImageNative(renderContainer, timegroupWidth, timegroupHeight, { 
          skipDprScaling: true, 
          reuseCanvas: captureCanvas,
        });
        
        // Restore hidden state
        captureCanvas.style.opacity = savedCanvasOpacity;
        renderContainer.style.opacity = "0";
        renderContainer.style.transform = "translateX(-9999px)";
      } else {
        // FOREIGNOBJECT PATH with PIPELINING
        // While frame N's image is loading, prepare frame N+1's data
        // This overlaps the img.onload wait (93% of render time) with seek/sync/serialize work
        
        // Build clone structure on first frame only
        if (!foCloneState) {
          // First frame: need to seek before building clone structure
          const seekStart = performance.now();
          await renderClone.seekForRender(timeMs);
          totalSeekMs += performance.now() - seekStart;
          
          // Wait for video content if in blocking mode (foreignObject path)
          // Must happen after seek but before buildCloneStructure copies canvas content
          // Uses robust middle-strip sampling (same as thumbnails) to avoid false positives
          if (contentReadyMode === "blocking") {
            const allVideos = renderClone.querySelectorAll("ef-video");
            if (allVideos.length > 0) {
              const waitStart = performance.now();
              while (performance.now() - waitStart < blockingTimeoutMs) {
                let allReady = true;
                for (const video of allVideos) {
                  const shadowCanvas = video.shadowRoot?.querySelector("canvas");
                  // Canvas must exist and have dimensions
                  if (!shadowCanvas || shadowCanvas.width === 0 || shadowCanvas.height === 0) {
                    allReady = false;
                    break;
                  }
                  const ctx = shadowCanvas.getContext("2d");
                  if (!ctx) {
                    allReady = false;
                    break;
                  }
                  // Sample middle strip (catches video content even if edges are black)
                  const stripY = Math.floor(shadowCanvas.height / 2);
                  const imageData = ctx.getImageData(0, stripY, shadowCanvas.width, 4);
                  const data = imageData.data;
                  // Check if ANY pixel has non-zero alpha (not transparent/uninitialized)
                  let hasContent = false;
                  for (let i = 3; i < data.length; i += 4) {
                    if (data[i] !== 0) {
                      hasContent = true;
                      break;
                    }
                  }
                  if (!hasContent) {
                    allReady = false;
                    break;
                  }
                }
                if (allReady) break;
                await new Promise(r => requestAnimationFrame(r));
              }
            }
          }
          
          const syncStart = performance.now();
          const { container: cloneContainer, syncState } = buildCloneStructure(renderClone, timeMs);
          
          // Create wrapper container (reused across frames)
          const previewContainer = document.createElement("div");
          previewContainer.style.cssText = `
            width: ${timegroupWidth}px;
            height: ${timegroupHeight}px;
            position: relative;
            overflow: hidden;
            background: ${getComputedStyle(timegroup).background || "#000"};
          `;
          
          // Add collected styles
          const styleEl = document.createElement("style");
          styleEl.textContent = collectedStyles!;
          previewContainer.appendChild(styleEl);
          previewContainer.appendChild(cloneContainer);
          
          // Ensure ALL clone elements have clip-path reset (one-time setup)
          traverseCloneTree(syncState, (node) => {
            node.clone.style.clipPath = "none";
          });
          
          // Override root clone styles to ensure visibility (opacity: 1, transform: none)
          // This is critical - without it, the root may have opacity: 0 from source styles
          overrideRootCloneStyles(syncState, true);
          
          foCloneState = { container: cloneContainer, syncState, previewContainer };
          totalSyncMs += performance.now() - syncStart;
        }
        
        // For subsequent frames: seek and sync styles
        if (frameIndex > 0) {
          // Seek render clone to current frame time
          const seekStart = performance.now();
          await renderClone.seekForRender(timeMs);
          totalSeekMs += performance.now() - seekStart;
          
          // Wait for video content if in blocking mode
          if (contentReadyMode === "blocking") {
            const allVideos = renderClone.querySelectorAll("ef-video");
            if (allVideos.length > 0) {
              const waitStart = performance.now();
              while (performance.now() - waitStart < blockingTimeoutMs) {
                let allReady = true;
                for (const video of allVideos) {
                  const shadowCanvas = video.shadowRoot?.querySelector("canvas");
                  if (!shadowCanvas || shadowCanvas.width === 0 || shadowCanvas.height === 0) {
                    allReady = false;
                    break;
                  }
                  const ctx = shadowCanvas.getContext("2d");
                  if (!ctx) {
                    allReady = false;
                    break;
                  }
                  const stripY = Math.floor(shadowCanvas.height / 2);
                  const imageData = ctx.getImageData(0, stripY, shadowCanvas.width, 4);
                  const data = imageData.data;
                  let hasContent = false;
                  for (let i = 3; i < data.length; i += 4) {
                    if (data[i] !== 0) {
                      hasContent = true;
                      break;
                    }
                  }
                  if (!hasContent) {
                    allReady = false;
                    break;
                  }
                }
                if (allReady) break;
                await new Promise(r => requestAnimationFrame(r));
              }
            }
          }
          
          // Sync styles for current frame
          const syncStart = performance.now();
          syncStyles(foCloneState.syncState, timeMs);
          
          // Re-apply root clone style overrides after syncStyles
          overrideRootCloneStyles(foCloneState.syncState, true);
          totalSyncMs += performance.now() - syncStart;
        }
        
        // Use renderToImage - same code path as thumbnails (includes cloning and inlineImages)
        // This ensures foreignObject serialization works identically to thumbnail capture
        image = await renderToImage(foCloneState.previewContainer, timegroupWidth, timegroupHeight) as HTMLImageElement;
        
        // Debug logging for first frame only
        if (frameIndex === 0) {
          debugFirstFrame(image);
        }
      }
      totalRenderMs += performance.now() - renderStart;
      
      // Debug logging for first frame (native path)
      if (frameIndex === 0 && useNativePath) {
        debugFirstFrame(image);
      }
      
      // Draw to encoding canvas based on strategy
      const canvasStart = performance.now();
      
      switch (strategy.type) {
        case "direct":
          // ZERO-COPY: drawElementImage rendered directly to captureCanvas, encoder reads from it
          // Only works when DPR=1 and scale=1 (see selectCanvasStrategy)
          break;
        case "fast":
          // FAST PATH: Direct draw when DPR=1 and scale=1 (dimensions just needed even adjustment)
          ctx!.drawImage(image, 0, 0);
          break;
        case "scaled":
          // Single-step scale: DPR capture directly to video dimensions
          // Browser handles bilinear/bicubic interpolation efficiently
          ctx!.drawImage(
            image,
            0, 0, image.width, image.height,  // source: DPR-scaled capture
            0, 0, videoWidth, videoHeight     // dest: final video dimensions
          );
          break;
      }
      totalCanvasMs += performance.now() - canvasStart;
      
      if (videoSource) {
        // OPTIMIZATION: Pipelined encoding - don't wait for encode, just queue it
        // Wait only when queue is full to maintain backpressure
        if (pendingEncodes.length >= MAX_PENDING_ENCODES) {
          const encodeStart = performance.now();
          await pendingEncodes.shift()!;
          totalEncodeMs += performance.now() - encodeStart;
        }
        
        // Queue this frame's encode (don't await yet)
        pendingEncodes.push(videoSource.add(timestampS, frameDurationS));
      }

      // Progress
      const currentFrame = frameIndex + 1;
      const progress = currentFrame / totalFrames;
      const renderedMs = currentFrame * frameDurationMs;
      const elapsedMs = performance.now() - renderStartTime;
      const msPerFrame = elapsedMs / currentFrame;
      const remainingFrames = totalFrames - currentFrame;
      const estimatedRemainingMs = remainingFrames * msPerFrame;
      const speedMultiplier = renderedMs / elapsedMs;

      // Generate frame preview thumbnail every 10 frames (toDataURL is expensive)
      if (onProgress && frameIndex % 10 === 0) {
        const previewWidth = 160;
        const previewHeight = Math.round(previewWidth * (videoHeight / videoWidth));
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = previewWidth;
        thumbCanvas.height = previewHeight;
        const thumbCtx = thumbCanvas.getContext("2d")!;
        // Use captureCanvas for direct strategy, otherwise use the OffscreenCanvas
        const sourceCanvas = strategy.type === "direct" ? captureCanvas : canvas!;
        thumbCtx.drawImage(sourceCanvas, 0, 0, previewWidth, previewHeight);
        lastFramePreviewUrl = thumbCanvas.toDataURL("image/jpeg", 0.7);
      }

      onProgress?.({
        progress,
        currentFrame,
        totalFrames,
        renderedMs,
        totalDurationMs: renderDurationMs,
        elapsedMs,
        estimatedRemainingMs,
        speedMultiplier,
        framePreviewUrl: lastFramePreviewUrl,
      });

      const percent = Math.floor(progress * 10) * 10;
      if (percent > lastLoggedPercent) {
        lastLoggedPercent = percent;
        const elapsed = (elapsedMs / 1000).toFixed(1);
      }
    }
    
    // OPTIMIZATION: Drain pending encodes before finalization
    if (pendingEncodes.length > 0) {
      const drainStart = performance.now();
      await Promise.all(pendingEncodes);
      totalEncodeMs += performance.now() - drainStart;
      pendingEncodes.length = 0;
    }

    // Render any remaining audio
    if (audioSource && lastRenderedAudioEndMs < endMs) {
      await renderAudioUpTo(endMs);
    }

    // Log profiling breakdown
    // Log renderToImageDirect timing breakdown if using foreignObject path
    // Benchmark mode: skip finalization and output
    if (benchmarkMode) {
      return undefined;
    }

    await output!.finalize();
    // Note: StreamTarget closes the writable stream during finalize(), so we don't close it manually

    if (useStreaming) {
      return undefined;
    } else {
      // Buffered: download the result
      const bufferTarget = target as BufferTarget;
      const videoBuffer = bufferTarget.buffer;
      if (!videoBuffer) {
        throw new Error("Video encoding failed: no buffer produced");
      }


      // Return buffer if requested (for server-side use), otherwise download
      if (returnBuffer) {
        return new Uint8Array(videoBuffer);
      }

      const videoBlob = new Blob([videoBuffer], { type: "video/mp4" });
      downloadBlob(videoBlob, filename);
      return undefined;
    }

  } finally {
    // Clean up capture canvas
    if (captureCanvas.parentNode) {
      captureCanvas.parentNode.removeChild(captureCanvas);
    }
    // CLONE-TIMELINE: Clean up render clone
    // Prime-timeline was never seeked, so no restoration needed!
    cleanupRenderClone();
    // disablePropertyValidation(); // Disabled - see note above about property validation
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { QUALITY_HIGH };
export type { AudioCodec };
