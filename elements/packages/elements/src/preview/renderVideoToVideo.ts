/**
 * Direct video-to-video rendering — fast path for single video elements.
 *
 * Bypasses the full DOM serialization pipeline (foreignObject/native canvas)
 * by decoding frames directly from the media engine and re-encoding to MP4.
 *
 * Supports CSS effects via canvas 2D context:
 * - filter (ctx.filter)
 * - opacity (ctx.globalAlpha)
 */

import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  StreamTarget,
  CanvasSource,
  AudioBufferSource,
  canEncodeAudio,
  getEncodableAudioCodecs,
  type VideoEncodingConfig,
  type AudioEncodingConfig,
  type AudioCodec,
} from "mediabunny";
import type { EFVideo } from "../elements/EFVideo.js";
import { NoSupportedAudioCodecError, RenderCancelledError } from "./renderTimegroupToVideo.js";
import type { RenderToVideoOptions } from "./renderTimegroupToVideo.types.js";
import { logger } from "./logger.js";

// ============================================================================
// Configuration
// ============================================================================

interface ResolvedVideoConfig {
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
  returnBuffer: boolean;
  preferredAudioCodecs: AudioCodec[];
  progressPreviewInterval: number;
  trimStartMs: number;
}

async function resolveVideoConfig(
  video: EFVideo,
  options: RenderToVideoOptions = {},
): Promise<ResolvedVideoConfig> {
  const fps = options.fps ?? 30;
  const codec = options.codec ?? "avc";
  const bitrate = options.bitrate ?? 8_000_000;
  const filename = options.filename ?? "video-export.mp4";
  const scale = options.scale ?? 1;
  const keyFrameInterval = options.keyFrameInterval ?? 2;
  const streaming = options.streaming ?? false;
  const includeAudio = options.includeAudio ?? true;
  const audioBitrate = options.audioBitrate ?? 128_000;
  const returnBuffer = options.returnBuffer ?? false;
  const preferredAudioCodecs = options.preferredAudioCodecs ?? ["aac", "opus"];
  const progressPreviewInterval = options.progressPreviewInterval ?? 60;

  const trimStartMs = video.trimStartMs ?? 0;
  const trimEndMs = video.trimEndMs ?? 0;
  const intrinsicDurationMs = video.intrinsicDurationMs;

  if (!intrinsicDurationMs || intrinsicDurationMs <= 0) {
    throw new Error("Video has no intrinsic duration. Ensure the media engine is loaded.");
  }

  const effectiveDurationMs = intrinsicDurationMs - trimStartMs - trimEndMs;
  if (effectiveDurationMs <= 0) {
    throw new Error(
      `Invalid trim range: trimStart=${trimStartMs}ms, trimEnd=${trimEndMs}ms, ` +
        `intrinsicDuration=${intrinsicDurationMs}ms leaves no content.`,
    );
  }

  const startMs = options.fromMs !== undefined ? Math.max(0, options.fromMs) : 0;
  const endMs =
    options.toMs !== undefined ? Math.min(options.toMs, effectiveDurationMs) : effectiveDurationMs;
  const renderDurationMs = endMs - startMs;

  if (renderDurationMs <= 0) {
    throw new Error(`Invalid render range: from ${startMs}ms to ${endMs}ms`);
  }

  let width: number;
  let height: number;

  // Decode first frame to determine dimensions
  {
    const firstFrame = await video.getVideoFrameAtSourceTime(trimStartMs, {
      quality: "main",
    });
    try {
      width = firstFrame.displayWidth;
      height = firstFrame.displayHeight;
    } finally {
      firstFrame.close();
    }
  }

  const videoWidth = Math.floor(width * scale);
  const videoHeight = Math.floor(height * scale);
  // Ensure even dimensions for video encoding
  const evenWidth = videoWidth % 2 === 0 ? videoWidth : videoWidth - 1;
  const evenHeight = videoHeight % 2 === 0 ? videoHeight : videoHeight - 1;

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
    videoWidth: evenWidth,
    videoHeight: evenHeight,
    totalFrames,
    frameDurationMs,
    frameDurationS,
    streaming,
    includeAudio,
    audioBitrate,
    returnBuffer,
    preferredAudioCodecs,
    progressPreviewInterval,
    trimStartMs,
  };
}

// ============================================================================
// Utilities (same as renderTimegroupToVideo — not exported from there)
// ============================================================================

function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

async function getFileWritableStream(filename: string): Promise<{
  writable: WritableStream<Uint8Array>;
  close: () => Promise<void>;
} | null> {
  if (!isFileSystemAccessSupported()) {
    return null;
  }

  try {
    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: "MP4 Video", accept: { "video/mp4": [".mp4"] } }],
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
      logger.warn("[renderVideoToVideo] File System Access failed:", e);
    }
    return null;
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

async function selectAudioCodec(
  preferredCodecs: AudioCodec[],
  encodingOptions: {
    numberOfChannels: number;
    sampleRate: number;
    bitrate: number;
  },
): Promise<AudioCodec> {
  for (const codec of preferredCodecs) {
    try {
      const isSupported = await canEncodeAudio(codec, encodingOptions);
      if (isSupported) return codec;
    } catch (e) {
      logger.warn(`[selectAudioCodec] Check failed for ${codec}:`, e);
    }
  }
  const availableCodecs = await getEncodableAudioCodecs(undefined, encodingOptions);
  throw new NoSupportedAudioCodecError(preferredCodecs, availableCodecs);
}

// ============================================================================
// Main render function
// ============================================================================

/**
 * Render a single EFVideo element directly to MP4.
 *
 * This is the fast path: frames are decoded from the media engine,
 * drawn to an encoding canvas (with CSS filter/opacity applied),
 * and encoded to video. No DOM serialization involved.
 */
export async function renderVideoToVideo(
  video: EFVideo,
  options: RenderToVideoOptions = {},
): Promise<Uint8Array | undefined> {
  const { signal, onProgress } = options;

  const checkCancelled = () => {
    if (signal?.aborted) throw new RenderCancelledError();
  };

  // Ensure media engine is loaded
  await video.waitForMediaDurations(signal);
  checkCancelled();

  const config = await resolveVideoConfig(video, options);

  // Suspend the PlaybackController's self-render loop for the duration of
  // this render to prevent concurrent frame fetches from interfering.
  const pc = (video as any).playbackController;

  // Read CSS effects once before the frame loop (values don't change during rendering)
  const computedStyle = getComputedStyle(video);
  const cssFilter = computedStyle.filter;
  const cssOpacity = parseFloat(computedStyle.opacity);
  const hasFilter = cssFilter && cssFilter !== "none";
  const hasOpacity = cssOpacity < 1;

  logger.debug(
    `[renderVideoToVideo] starting: ${config.totalFrames} frames, ` +
      `${config.videoWidth}x${config.videoHeight} @ ${config.fps}fps, ` +
      `trim=[${config.trimStartMs}, -${video.trimEndMs ?? 0}], ` +
      `css: filter=${hasFilter ? cssFilter : "none"}, opacity=${cssOpacity}`,
  );

  // =========================================================================
  // Set up video encoding
  // =========================================================================
  let output: Output | null = null;
  let videoSource: CanvasSource | null = null;
  let audioSource: AudioBufferSource | null = null;
  let target: BufferTarget | StreamTarget | null = null;
  let fileStream: {
    writable: WritableStream<Uint8Array>;
    close: () => Promise<void>;
  } | null = null;
  let useStreaming = false;

  const encodingCanvas = new OffscreenCanvas(config.videoWidth, config.videoHeight);
  const encodingCtx = encodingCanvas.getContext(
    "2d",
    hasFilter || hasOpacity ? { willReadFrequently: true } : undefined,
  );
  if (!encodingCtx) {
    throw new Error("Failed to get encoding canvas context");
  }

  if (hasFilter) {
    encodingCtx.filter = cssFilter;
  }
  if (hasOpacity) {
    encodingCtx.globalAlpha = cssOpacity;
  }

  if (options.customWritableStream) {
    target = new StreamTarget(options.customWritableStream as any);
    output = new Output({
      format: new Mp4OutputFormat({ fastStart: "fragmented" }),
      target,
    });
    useStreaming = true;
  } else if (config.streaming) {
    fileStream = await getFileWritableStream(config.filename);
    useStreaming = fileStream !== null;

    if (useStreaming && fileStream) {
      target = new StreamTarget(fileStream.writable as any);
      output = new Output({
        format: new Mp4OutputFormat({ fastStart: "fragmented" }),
        target,
      });
    }
  }

  if (!target) {
    target = new BufferTarget();
    output = new Output({ format: new Mp4OutputFormat(), target });
  }

  if (!output) {
    throw new Error("Output not initialized");
  }

  const videoConfig: VideoEncodingConfig = {
    codec: config.codec,
    bitrate: config.bitrate,
    keyFrameInterval: config.keyFrameInterval,
  };

  // Use CanvasSource directly - filter and opacity don't require special handling
  videoSource = new CanvasSource(encodingCanvas, videoConfig);
  output.addVideoTrack(videoSource);

  if (config.includeAudio) {
    try {
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
    } catch (e) {
      logger.warn("[renderVideoToVideo] Audio codec selection failed, rendering without audio:", e);
    }
  }

  await output.start();

  // =========================================================================
  // Frame loop
  // =========================================================================
  const renderStartTime = performance.now();
  let lastRenderedAudioEndMs = config.startMs;
  const audioChunkDurationMs = 2000;

  let thumbCanvas: HTMLCanvasElement | null = null;
  let thumbCtx: CanvasRenderingContext2D | null = null;

  if (config.progressPreviewInterval > 0) {
    const thumbScale = 160 / config.videoWidth;
    thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = Math.round(config.videoWidth * thumbScale);
    thumbCanvas.height = Math.round(config.videoHeight * thumbScale);
    thumbCtx = thumbCanvas.getContext("2d");
  }

  let totalSeekMs = 0;
  let totalDrawMs = 0;
  let totalEncodeMs = 0;

  pc?.suspendSelfRender();

  try {
    for (let frameIndex = 0; frameIndex < config.totalFrames; frameIndex++) {
      checkCancelled();

      const timelineTimeMs = config.startMs + frameIndex * config.frameDurationMs;
      const sourceTimeMs = timelineTimeMs + config.trimStartMs;
      const timestampS = (frameIndex * config.frameDurationMs) / 1000;

      // Decode frame
      const seekStart = performance.now();
      const videoFrame = await video.getVideoFrameAtSourceTime(sourceTimeMs, {
        quality: "main",
        signal,
      });
      totalSeekMs += performance.now() - seekStart;

      try {
        const drawStart = performance.now();

        encodingCtx.drawImage(
          videoFrame,
          0,
          0,
          videoFrame.displayWidth,
          videoFrame.displayHeight,
          0,
          0,
          config.videoWidth,
          config.videoHeight,
        );

        totalDrawMs += performance.now() - drawStart;
      } finally {
        videoFrame.close();
      }

      // Encode frame
      const encodeStart = performance.now();
      await videoSource!.add(timestampS, config.frameDurationS);
      totalEncodeMs += performance.now() - encodeStart;

      // Render audio in chunks
      if (audioSource && timelineTimeMs >= lastRenderedAudioEndMs + audioChunkDurationMs) {
        const chunkEndMs = Math.min(timelineTimeMs + audioChunkDurationMs, config.endMs);
        try {
          const audioBuffer = await video.renderAudio(lastRenderedAudioEndMs, chunkEndMs);
          if (audioBuffer && audioBuffer.length > 0) {
            await audioSource.add(audioBuffer);
          }
        } catch (_e) {
          // Audio render failures are non-fatal
        }
        lastRenderedAudioEndMs = chunkEndMs;
      }

      // Progress preview thumbnail
      if (thumbCanvas && thumbCtx && frameIndex % config.progressPreviewInterval === 0) {
        thumbCtx.drawImage(encodingCanvas as any, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }

      // Progress reporting
      const currentFrame = frameIndex + 1;
      const progress = currentFrame / config.totalFrames;
      const renderedMs = currentFrame * config.frameDurationMs;
      const elapsedMs = performance.now() - renderStartTime;
      const msPerFrame = elapsedMs / currentFrame;
      const remainingFrames = config.totalFrames - currentFrame;
      const estimatedRemainingMs = remainingFrames * msPerFrame;
      const speedMultiplier = renderedMs / elapsedMs;

      onProgress?.({
        progress,
        currentFrame,
        totalFrames: config.totalFrames,
        renderedMs,
        totalDurationMs: config.renderDurationMs,
        elapsedMs,
        estimatedRemainingMs,
        speedMultiplier,
        framePreviewCanvas: thumbCanvas || undefined,
      });
    }

    // Render remaining audio
    if (audioSource && lastRenderedAudioEndMs < config.endMs) {
      try {
        const audioBuffer = await video.renderAudio(lastRenderedAudioEndMs, config.endMs);
        if (audioBuffer && audioBuffer.length > 0) {
          await audioSource.add(audioBuffer);
        }
      } catch (_e) {
        // Audio render failures are non-fatal
      }
    }

    // =========================================================================
    // Finalize
    // =========================================================================
    const totalElapsed = performance.now() - renderStartTime;
    logger.debug(
      `[renderVideoToVideo] complete: ${config.totalFrames} frames in ${totalElapsed.toFixed(0)}ms ` +
        `(seek=${totalSeekMs.toFixed(0)}ms, draw=${totalDrawMs.toFixed(0)}ms, encode=${totalEncodeMs.toFixed(0)}ms) ` +
        `speed=${(config.renderDurationMs / totalElapsed).toFixed(1)}x`,
    );

    await output.finalize();

    if (useStreaming) {
      if (fileStream) {
        await fileStream.close();
      }
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
  } catch (error) {
    // Clean up output on failure
    try {
      await output?.finalize();
    } catch {
      // Ignore finalize errors during cleanup
    }
    throw error;
  } finally {
    pc?.resumeSelfRender();
  }
}
