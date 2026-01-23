/**
 * Video rendering for timegroups using the RenderSession abstraction.
 * 
 * This module is responsible for:
 * 1. Resolving render configuration
 * 2. Setting up video/audio encoding
 * 3. Frame loop orchestration
 * 4. Output handling (streaming vs buffer)
 * 
 * Frame capture is delegated to RenderSession - the same code path
 * used by thumbnail generation. This ensures consistency.
 */

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
import { resetRenderState, type ContentReadyMode } from "./renderTimegroupToCanvas.js";
// @ts-ignore - RenderSession.js module not yet implemented
import {
  createRenderSession,
  prefetchScrubSegments,
} from "./RenderSession.js";

// ============================================================================
// Types
// ============================================================================

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
   */
  preferredAudioCodecs?: AudioCodec[];
  /**
   * If true, renders all frames but skips video encoding and output.
   * Used for benchmarking the pure rendering pipeline without encoder overhead.
   * Returns undefined (no video output).
   */
  benchmarkMode?: boolean;
}

// ============================================================================
// Errors
// ============================================================================

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

// ============================================================================
// Configuration Resolution
// ============================================================================

interface ResolvedConfig {
  fps: number;
  codec: "avc" | "hevc" | "vp9" | "av1" | "vp8";
  bitrate: number;
  filename: string;
  scale: number;
  keyFrameInterval: number;
  startMs: number;
  endMs: number;
  renderDurationMs: number;
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
}

function resolveConfig(
  timegroup: EFTimegroup,
  options: RenderToVideoOptions,
): ResolvedConfig {
  const fps = options.fps ?? timegroup.effectiveFps ?? 30;
  const codec = options.codec ?? "avc";
  const bitrate = options.bitrate ?? 8_000_000;
  const filename = options.filename ?? "timegroup-video.mp4";
  const scale = options.scale ?? 1;
  const keyFrameInterval = options.keyFrameInterval ?? 2;
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

  const startMs = Math.max(0, options.fromMs ?? 0);
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
  };
}

// ============================================================================
// File System Access Helpers
// ============================================================================

function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

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
    if ((e as Error).name !== "AbortError") {
      console.warn("[renderToVideo] File System Access failed:", e);
    }
    return null;
  }
}

// ============================================================================
// Audio Codec Selection
// ============================================================================

async function selectAudioCodec(
  preferredCodecs: AudioCodec[],
  encodingOptions: { numberOfChannels: number; sampleRate: number; bitrate: number },
): Promise<AudioCodec> {
  const { numberOfChannels, sampleRate, bitrate } = encodingOptions;
  
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
  
  const availableCodecs = await getEncodableAudioCodecs(undefined, {
    numberOfChannels,
    sampleRate,
    bitrate,
  });
  
  throw new NoSupportedAudioCodecError(preferredCodecs, availableCodecs);
}

// ============================================================================
// Utility Functions
// ============================================================================

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

function generateTimestamps(config: ResolvedConfig): number[] {
  const timestamps: number[] = [];
  for (let i = 0; i < config.totalFrames; i++) {
    timestamps.push(config.startMs + i * config.frameDurationMs);
  }
  return timestamps;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get all audio codecs that can be encoded by this browser.
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
 * Renders a timegroup to an MP4 video file.
 * 
 * Uses the same rendering pipeline as thumbnail generation (RenderSession),
 * ensuring consistency between preview thumbnails and exported video.
 * 
 * By default, prompts user to select a save location and streams the video
 * directly to disk as it renders (using File System Access API).
 */
export async function renderTimegroupToVideo(
  timegroup: EFTimegroup,
  options: RenderToVideoOptions = {},
): Promise<Uint8Array | undefined> {
  // 1. Resolve configuration
  const config = resolveConfig(timegroup, options);
  const { signal, onProgress } = options;
  
  // Check cancellation helper
  const checkCancelled = () => {
    if (signal?.aborted) {
      throw new RenderCancelledError();
    }
  };
  
  // Reset render profiling
  resetRenderState();
  
  // 2. Create render session (same code path as thumbnails!)
  const session = await createRenderSession(timegroup, {
    contentReadyMode: config.contentReadyMode,
    blockingTimeoutMs: config.blockingTimeoutMs,
    skipDprScaling: true, // Video export doesn't need retina resolution
  });
  
  // 3. Pre-fetch scrub segments for all timestamps
  const timestamps = generateTimestamps(config);
  await prefetchScrubSegments(session, timestamps);
  
  // 4. Set up video encoding (skip in benchmark mode)
  let output: Output | null = null;
  let videoSource: CanvasSource | null = null;
  let audioSource: AudioBufferSource | null = null;
  let target: BufferTarget | StreamTarget | null = null;
  let fileStream: { writable: WritableStream<Uint8Array>; close: () => Promise<void> } | null = null;
  let useStreaming = false;
  
  if (!config.benchmarkMode) {
    // Set up streaming target if requested
    if (config.streaming) {
      fileStream = await getFileWritableStream(config.filename);
      useStreaming = fileStream !== null;
    }
    
    // Create output target
    if (useStreaming && fileStream) {
      target = new StreamTarget(fileStream.writable as any);
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
    
    // Create encoding canvas at video dimensions
    const encodingCanvas = new OffscreenCanvas(config.videoWidth, config.videoHeight);
    const encodingCtx = encodingCanvas.getContext("2d");
    if (!encodingCtx) {
      session.dispose();
      throw new Error("Failed to get encoding canvas context");
    }
    
    // Create video source
    const videoConfig: VideoEncodingConfig = {
      codec: config.codec,
      bitrate: config.bitrate,
      keyFrameInterval: config.keyFrameInterval,
    };
    videoSource = new CanvasSource(encodingCanvas, videoConfig);
    output.addVideoTrack(videoSource);
    
    // Set up audio if requested
    if (config.includeAudio) {
      const selectedCodec = await selectAudioCodec(config.preferredAudioCodecs, {
        numberOfChannels: 2,
        sampleRate: 48000,
        bitrate: config.audioBitrate,
      });
      
      const audioConfig: AudioEncodingConfig = {
        codec: selectedCodec,
        bitrate: config.audioBitrate,
      };
      audioSource = new AudioBufferSource(audioConfig);
      output.addAudioTrack(audioSource);
    }
    
    await output.start();
  }
  
  // 5. Frame loop
  const renderStartTime = performance.now();
  let lastFramePreviewUrl: string | undefined;
  let lastRenderedAudioEndMs = config.startMs;
  const audioChunkDurationMs = 2000;
  
  // Profiling accumulators
  let totalSeekMs = 0;
  let totalWaitMs = 0;
  let totalRenderMs = 0;
  let totalEncodeMs = 0;
  
  try {
    for (let frameIndex = 0; frameIndex < config.totalFrames; frameIndex++) {
      checkCancelled();
      
      const timeMs = timestamps[frameIndex]!;
      const timestampS = (frameIndex * config.frameDurationMs) / 1000;
      
      // Render audio chunk if needed
      if (audioSource && timeMs >= lastRenderedAudioEndMs + audioChunkDurationMs) {
        const chunkEndMs = Math.min(timeMs + audioChunkDurationMs, config.endMs);
        try {
          const audioBuffer = await timegroup.renderAudio(lastRenderedAudioEndMs, chunkEndMs);
          if (audioBuffer && audioBuffer.length > 0) {
            await audioSource.add(audioBuffer);
          }
        } catch (e) {
          // Audio render failures are non-fatal
        }
        lastRenderedAudioEndMs = chunkEndMs;
      }
      
      // Capture frame using RenderSession (same code as thumbnails!)
      const { canvas, timings } = await session.captureFrame({
        timeMs,
        scale: config.scale,
      });
      
      totalSeekMs += timings.seekMs;
      totalWaitMs += timings.waitMs;
      totalRenderMs += timings.renderMs;
      
      // Encode frame
      if (videoSource && output) {
        const encodeStart = performance.now();
        
        // Copy to encoding canvas (handles dimension conversion)
        const encodingCanvas = (videoSource as any).canvas as OffscreenCanvas;
        const encodingCtx = encodingCanvas.getContext("2d")!;
        encodingCtx.drawImage(
          canvas,
          0, 0, canvas.width, canvas.height,
          0, 0, config.videoWidth, config.videoHeight,
        );
        
        await videoSource.add(timestampS, config.frameDurationS);
        totalEncodeMs += performance.now() - encodeStart;
      }
      
      // Update progress
      const currentFrame = frameIndex + 1;
      const progress = currentFrame / config.totalFrames;
      const renderedMs = currentFrame * config.frameDurationMs;
      const elapsedMs = performance.now() - renderStartTime;
      const msPerFrame = elapsedMs / currentFrame;
      const remainingFrames = config.totalFrames - currentFrame;
      const estimatedRemainingMs = remainingFrames * msPerFrame;
      const speedMultiplier = renderedMs / elapsedMs;
      
      // Generate preview every 10 frames
      if (onProgress && frameIndex % 10 === 0) {
        const previewWidth = 160;
        const previewHeight = Math.round(previewWidth * (config.videoHeight / config.videoWidth));
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = previewWidth;
        thumbCanvas.height = previewHeight;
        const thumbCtx = thumbCanvas.getContext("2d")!;
        thumbCtx.drawImage(canvas, 0, 0, previewWidth, previewHeight);
        lastFramePreviewUrl = thumbCanvas.toDataURL("image/jpeg", 0.7);
      }
      
      onProgress?.({
        progress,
        currentFrame,
        totalFrames: config.totalFrames,
        renderedMs,
        totalDurationMs: config.renderDurationMs,
        elapsedMs,
        estimatedRemainingMs,
        speedMultiplier,
        framePreviewUrl: lastFramePreviewUrl,
      });
    }
    
    // Render remaining audio
    if (audioSource && lastRenderedAudioEndMs < config.endMs) {
      try {
        const audioBuffer = await timegroup.renderAudio(lastRenderedAudioEndMs, config.endMs);
        if (audioBuffer && audioBuffer.length > 0) {
          await audioSource.add(audioBuffer);
        }
      } catch (e) {
        // Audio render failures are non-fatal
      }
    }
    
    // Log profiling
    const totalTime = performance.now() - renderStartTime;
    console.log(
      `[renderTimegroupToVideo] ${config.totalFrames} frames: ` +
      `seek=${totalSeekMs.toFixed(0)}ms, wait=${totalWaitMs.toFixed(0)}ms, ` +
      `render=${totalRenderMs.toFixed(0)}ms, encode=${totalEncodeMs.toFixed(0)}ms, ` +
      `total=${totalTime.toFixed(0)}ms`
    );
    
    // Benchmark mode: skip finalization
    if (config.benchmarkMode) {
      return undefined;
    }
    
    // Finalize output
    await output!.finalize();
    
    if (useStreaming) {
      return undefined;
    } else {
      const bufferTarget = target as BufferTarget;
      const videoBuffer = bufferTarget.buffer;
      if (!videoBuffer) {
        throw new Error("Video encoding failed: no buffer produced");
      }
      
      if (config.returnBuffer) {
        return new Uint8Array(videoBuffer);
      }
      
      const videoBlob = new Blob([videoBuffer], { type: "video/mp4" });
      downloadBlob(videoBlob, config.filename);
      return undefined;
    }
    
  } finally {
    session.dispose();
  }
}

export { QUALITY_HIGH };
export type { AudioCodec };
