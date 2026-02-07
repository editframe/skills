/**
 * Video rendering for timegroups using direct serialization.
 * 
 * Architecture:
 * - Creates a render clone of the timeline
 * - For each frame:
 *   1. Seeks the clone to the target time
 *   2. Executes frame tasks (SVG updates, canvas draws, etc.)
 *   3. Serializes the live DOM directly to SVG+foreignObject data URI
 *   4. Renders to image and encodes to video
 * 
 * RenderContext provides pixel caching across frames for performance.
 */

import { logger } from "./logger.js";
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
import type { EFVideo } from "../elements/EFVideo.js";
import type { RenderProgress, RenderToVideoOptions } from "./renderTimegroupToVideo.types.js";
import type { ContentReadyMode } from "./renderTimegroupToCanvas.types.js";
import {
  resetRenderState,
} from "./renderTimegroupToCanvas.js";
import { captureTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import { renderToImageNative } from "./rendering/renderToImageNative.js";
import { isNativeCanvasApiAvailable } from "./previewSettings.js";
import { createPreviewContainer } from "./previewTypes.js";
import { RenderContext } from "./RenderContext.js";

// ============================================================================
// Types
// ============================================================================

// Re-export types from type-only module (zero side effects)
export type {
  RenderProgress,
  RenderToVideoOptions,
} from "./renderTimegroupToVideo.types.js";

// ============================================================================
// Errors
// ============================================================================

export class NoSupportedAudioCodecError extends Error {
  constructor(requestedCodecs: AudioCodec[], availableCodecs: AudioCodec[]) {
    super(
      `No supported audio codec found. Requested: [${requestedCodecs.join(", ")}], ` +
      `Available: [${availableCodecs.length > 0 ? availableCodecs.join(", ") : "none"}]`
    );
    this.name = "NoSupportedAudioCodecError";
  }
}

export class RenderCancelledError extends Error {
  constructor() {
    super("Render cancelled");
    this.name = "RenderCancelledError";
  }
}

// ============================================================================
// Configuration
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
  width: number;
  height: number;
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
  progressPreviewInterval: number;
  canvasMode: "native" | "foreignObject";
}

function resolveConfig(
  timegroup: EFTimegroup,
  options: RenderToVideoOptions = {},
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
  // Preview generation now uses canvas reference (no encoding) - cheap to enable!
  // Defaults to 60 frames (every 2 seconds at 30fps). Set to 0 to disable.
  const progressPreviewInterval = options.progressPreviewInterval ?? 60;

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

  // Force layout reflow before reading dimensions
  void timegroup.offsetHeight;
  
  const timegroupWidth = timegroup.offsetWidth;
  const timegroupHeight = timegroup.offsetHeight;
  
  logger.debug(`[renderTimegroupToVideo] Timegroup dimensions: ${timegroupWidth}x${timegroupHeight}`);
  logger.debug(`[renderTimegroupToVideo] Computed style:`, getComputedStyle(timegroup).width, getComputedStyle(timegroup).height);
  logger.debug(`[renderTimegroupToVideo] BoundingClientRect:`, timegroup.getBoundingClientRect());
  
  if (!timegroupWidth || !timegroupHeight) {
    throw new Error(
      `Timegroup has no dimensions (${timegroupWidth}x${timegroupHeight}). ` +
      `Ensure the timegroup element is in the document and has explicit width/height styles ` +
      `(e.g., class="w-[1920px] h-[1080px]")`
    );
  }
  const width = Math.floor(timegroupWidth * scale);
  const height = Math.floor(timegroupHeight * scale);

  const videoWidth = width % 2 === 0 ? width : width - 1;
  const videoHeight = height % 2 === 0 ? height : height - 1;

  const frameDurationMs = 1000 / fps;
  const totalFrames = Math.ceil(renderDurationMs / frameDurationMs);
  const frameDurationS = frameDurationMs / 1000;

  // Determine effective canvas mode:
  // 1. If explicitly specified, use that (with fallback if native not available)
  // 2. If not specified, default to foreignObject for compatibility
  const canvasMode = (() => {
    const requested = options.canvasMode;
    if (!requested) return "foreignObject";
    if (requested === "native" && !isNativeCanvasApiAvailable()) {
      logger.debug("[renderTimegroupToVideo] Native canvas mode requested but not available, falling back to foreignObject");
      return "foreignObject";
    }
    return requested;
  })();

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
    width,
    height,
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
    progressPreviewInterval,
    canvasMode,
  };
}

// ============================================================================
// Helpers
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
      types: [{ description: "MP4 Video", accept: { "video/mp4": [".mp4"] } }],
    });
    const writable = await fileHandle.createWritable();
    return { writable, close: async () => { await writable.close(); } };
  } catch (e) {
    if ((e as Error).name !== "AbortError") {
      logger.warn("[renderToVideo] File System Access failed:", e);
    }
    return null;
  }
}

async function selectAudioCodec(
  preferredCodecs: AudioCodec[],
  encodingOptions: { numberOfChannels: number; sampleRate: number; bitrate: number },
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

// ============================================================================
// Public API
// ============================================================================

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
 * Uses the EXACT same code path as thumbnail generation (captureFromClone).
 * This ensures consistency - if thumbnails work, video export works.
 */
export async function renderTimegroupToVideo(
  timegroup: EFTimegroup,
  options: RenderToVideoOptions = {},
): Promise<Uint8Array | undefined> {
  const config = resolveConfig(timegroup, options);
  const { signal, onProgress } = options;
  
  const checkCancelled = () => {
    if (signal?.aborted) throw new RenderCancelledError();
  };
  
  resetRenderState();
  
  // =========================================================================
  // Create render clone - EXACT same as captureBatch in EFTimegroup
  // =========================================================================
  const { clone: renderClone, cleanup: cleanupRenderClone } =
    await timegroup.createRenderClone();
  
  // Build timestamps array for frame loop
  const timestamps: number[] = [];
  for (let i = 0; i < config.totalFrames; i++) {
    timestamps.push(config.startMs + i * config.frameDurationMs);
  }
  
  // =========================================================================
  // Set up video encoding
  // =========================================================================
  let output: Output | null = null;
  let videoSource: CanvasSource | null = null;
  let audioSource: AudioBufferSource | null = null;
  let target: BufferTarget | StreamTarget | null = null;
  let fileStream: { writable: WritableStream<Uint8Array>; close: () => Promise<void> } | null = null;
  let useStreaming = false;
  let encodingCanvas: OffscreenCanvas | null = null;
  let encodingCtx: OffscreenCanvasRenderingContext2D | null = null;
  
  if (!config.benchmarkMode) {
    // Check for custom writable stream first (for programmatic streaming)
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
    
    encodingCanvas = new OffscreenCanvas(config.videoWidth, config.videoHeight);
    encodingCtx = encodingCanvas.getContext("2d");
    if (!encodingCtx) {
      cleanupRenderClone();
      throw new Error("Failed to get encoding canvas context");
    }
    
    if (!output) {
      throw new Error("Output not initialized");
    }
    
    const videoConfig: VideoEncodingConfig = {
      codec: config.codec,
      bitrate: config.bitrate,
      keyFrameInterval: config.keyFrameInterval,
    };
    videoSource = new CanvasSource(encodingCanvas, videoConfig);
    output.addVideoTrack(videoSource);
    
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
  
  // =========================================================================
  // Setup for per-frame passive structure rebuilding (like live preview)
  // =========================================================================
  // Create RenderContext for caching across all frames
  const renderContext = new RenderContext();
  
  // Create preview container with proper styling (reusable, content rebuilt each frame)
  // Use unscaled dimensions for the preview container (which holds the full-size clone)
  const containerWidth = timegroup.offsetWidth || 1920;
  const containerHeight = timegroup.offsetHeight || 1080;
  const previewContainer = createPreviewContainer({
    width: containerWidth,
    height: containerHeight,
    background: getComputedStyle(timegroup).background || "#000",
  });
  
  // Setup for direct serialization
  logger.debug(`[renderTimegroupToVideo] Using direct timeline serialization`);
  
  // Attach renderClone to container
  previewContainer.appendChild(renderClone);
  
  // Add ef-render-clone-container class for CSS selectors and debugging
  previewContainer.classList.add('ef-render-clone-container');
  
  // CRITICAL: Attach container to document so getComputedStyle returns actual values
  // Without this, all computed styles are empty strings!
  // Hide the container OFF-SCREEN but do NOT use visibility:hidden because:
  // 1. visibility:hidden is inherited by all children
  // 2. seekForRender checks getComputedStyle().visibility and skips "hidden" subtrees
  // 3. This would cause FrameController to skip rendering all nested content
  previewContainer.style.cssText += ';position:fixed;left:-99999px;top:-99999px;pointer-events:none;';
  document.body.appendChild(previewContainer);
  
  // Force layout/reflow so getComputedStyle returns correct values
  void renderClone.offsetHeight;
  logger.debug(`[renderTimegroupToVideo] Attached previewContainer to document.body (off-screen) for style computation`);
  
  // Suppress rendering of the rest of the page during export.
  // content-visibility:hidden tells the browser to skip layout, paint, and
  // compositing for every top-level element except the render clone container.
  // This eliminates main-thread contention from the host page (animations,
  // layout, paint, intersection observers, etc.).
  const suppressionStyle = document.createElement('style');
  suppressionStyle.textContent = `
    body > *:not(.ef-render-clone-container) {
      content-visibility: hidden !important;
      contain: strict !important;
    }
  `;
  document.head.appendChild(suppressionStyle);
  
  // =========================================================================
  // Frame loop - DEEP PIPELINE: overlap encode + render + prepare
  // =========================================================================
  const renderStartTime = performance.now();
  let lastRenderedAudioEndMs = config.startMs;
  const audioChunkDurationMs = 2000;
  
  // Reusable thumbnail canvas for preview (no encoding, just draw to canvas)
  let thumbCanvas: HTMLCanvasElement | null = null;
  let thumbCtx: CanvasRenderingContext2D | null = null;
  if (onProgress && config.progressPreviewInterval > 0) {
    const previewWidth = 160;
    const previewHeight = Math.round(previewWidth * (config.videoHeight / config.videoWidth));
    thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = previewWidth;
    thumbCanvas.height = previewHeight;
    thumbCtx = thumbCanvas.getContext("2d");
  }
  
  let totalSeekMs = 0;
  let totalSyncMs = 0;
  let totalEncodeMs = 0;
  let totalImageWaitMs = 0; // time spent blocked waiting for image.onload
  
  try {
    // ========================================================================
    // OVERLAPPED PIPELINE: image loading runs parallel with seek+serialize
    // ========================================================================
    // The clone can only seek one frame at a time, and serialization must
    // capture the DOM before the next seek. But image loading (data URI →
    // Image) is independent of the clone and runs in the background.
    //
    // Per-frame timeline:
    //   [seek(N)] → [serialize(N)] → [image.load(N) in background...]
    //                                  └─ [seek(N+1)] → [serialize(N+1)] → ...
    //                                  └─ encode(N) when image resolves
    
    type PendingFrame = {
      frameIndex: number;
      timeMs: number;
      timestampS: number;
      resolved: HTMLImageElement | null;
      promise: Promise<HTMLImageElement>;
    };
    
    const MAX_AHEAD = 2;
    const pendingFrames: PendingFrame[] = [];
    let nextSeekFrame = 0;
    let encodedFrames = 0;
    let pipelineHits = 0;  // image was ready when we needed it
    let pipelineMisses = 0; // had to await image load
    
    console.log(
      `[Render] starting ${config.totalFrames} frames, ` +
      `${config.width}x${config.height} @ ${config.fps}fps, ` +
      `mode=${config.canvasMode}, pipeline=${MAX_AHEAD}`
    );
    
    while (encodedFrames < config.totalFrames) {
      checkCancelled();
      
      // ==================================================================
      // PHASE 1: Fill pipeline — seek+serialize ahead while images load
      // ==================================================================
      while (nextSeekFrame < config.totalFrames && pendingFrames.length < MAX_AHEAD) {
        const fi = nextSeekFrame;
        const timeMs = timestamps[fi]!;
        const timestampS = (fi * config.frameDurationMs) / 1000;
        
        const seekStart = performance.now();
        await renderClone.seekForRender(timeMs);
        const seekTime = performance.now() - seekStart;
        totalSeekMs += seekTime;
        
        const entry: PendingFrame = {
          frameIndex: fi,
          timeMs,
          timestampS,
          resolved: null,
          promise: null!,
        };
        
        if (config.canvasMode === "native") {
          const renderStart = performance.now();
          const canvas = await renderToImageNative(renderClone, config.width, config.height, {
            skipDprScaling: true,
          });
          const renderTime = performance.now() - renderStart;
          totalSyncMs += renderTime;
          console.log(`[Render] frame ${fi}: seek=${seekTime.toFixed(1)}ms native=${renderTime.toFixed(1)}ms`);
          entry.resolved = canvas as any as HTMLImageElement;
          entry.promise = Promise.resolve(entry.resolved);
        } else {
          // Synchronous capture: walks DOM + snapshots canvas pixels.
          // Returns immediately — clone is free for next seek.
          // Encoding (canvas→base64, SVG assembly) and image loading
          // all resolve in the background.
          const captureStart = performance.now();
          const dataUriPromise = captureTimelineToDataUri(renderClone, config.width, config.height, {
            renderContext,
            canvasScale: config.scale,
            timeMs,
          });
          const captureTime = performance.now() - captureStart;
          totalSyncMs += captureTime;
          
          entry.promise = dataUriPromise.then(dataUri => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
              const image = new Image();
              image.onload = () => {
                entry.resolved = image;
                resolve(image);
              };
              image.onerror = (e) => {
                console.error(`[Render] frame ${fi} image load error:`, e);
                reject(new Error(`Failed to load image from data URI`));
              };
              image.src = dataUri;
            });
          });
          
          console.log(
            `[Render] frame ${fi}: seek=${seekTime.toFixed(1)}ms capture=${captureTime.toFixed(1)}ms ` +
            `queue=${pendingFrames.length + 1}/${MAX_AHEAD}`
          );
        }
        
        pendingFrames.push(entry);
        nextSeekFrame++;
      }
      
      // ==================================================================
      // PHASE 2: Encode next frame in order (await if not yet loaded)
      // ==================================================================
      const head = pendingFrames.shift()!;
      const preloaded = head.resolved !== null;
      if (preloaded) pipelineHits++; else pipelineMisses++;
      let encodeWaitMs = 0;
      let image: HTMLImageElement;
      if (preloaded) {
        image = head.resolved!;
      } else {
        const waitStart = performance.now();
        image = await head.promise;
        encodeWaitMs = performance.now() - waitStart;
        totalImageWaitMs += encodeWaitMs;
      }
      
      if (encodedFrames % 30 === 0 || encodeWaitMs > 50) {
        const total = pipelineHits + pipelineMisses;
        const hitRate = total > 0 ? ((pipelineHits / total) * 100).toFixed(0) : "0";
        console.log(
          `[Pipeline] frame=${encodedFrames}/${config.totalFrames} ` +
          `depth=${pendingFrames.length + 1}/${MAX_AHEAD} ` +
          `preloaded=${preloaded}${encodeWaitMs > 0 ? ` waited=${encodeWaitMs.toFixed(1)}ms` : ""} ` +
          `hitRate=${hitRate}% (${pipelineHits}/${total})`
        );
      }
      
      if (audioSource && head.timeMs >= lastRenderedAudioEndMs + audioChunkDurationMs) {
        const chunkEndMs = Math.min(head.timeMs + audioChunkDurationMs, config.endMs);
        try {
          const audioBuffer = await timegroup.renderAudio(lastRenderedAudioEndMs, chunkEndMs);
          if (audioBuffer && audioBuffer.length > 0) {
            await audioSource.add(audioBuffer);
          }
        } catch (e) { /* Audio render failures are non-fatal */ }
        lastRenderedAudioEndMs = chunkEndMs;
      }
      
      if (videoSource && output && encodingCtx) {
        const encodeStart = performance.now();
        encodingCtx.drawImage(
          image,
          0, 0, image.width, image.height,
          0, 0, config.videoWidth, config.videoHeight,
        );
        await videoSource.add(head.timestampS, config.frameDurationS);
        totalEncodeMs += performance.now() - encodeStart;
      }
      
      // ==================================================================
      // Progress reporting
      // ==================================================================
      encodedFrames++;
      const currentFrame = encodedFrames;
      const progress = currentFrame / config.totalFrames;
      const renderedMs = currentFrame * config.frameDurationMs;
      const elapsedMs = performance.now() - renderStartTime;
      const msPerFrame = elapsedMs / currentFrame;
      const remainingFrames = config.totalFrames - currentFrame;
      const estimatedRemainingMs = remainingFrames * msPerFrame;
      const speedMultiplier = renderedMs / elapsedMs;
      
      if (thumbCanvas && thumbCtx && head.frameIndex % config.progressPreviewInterval === 0) {
        thumbCtx.drawImage(image, 0, 0, thumbCanvas.width, thumbCanvas.height);
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
        framePreviewCanvas: thumbCanvas || undefined,
      });
    }
    
    // Render remaining audio
    if (audioSource && lastRenderedAudioEndMs < config.endMs) {
      try {
        const audioBuffer = await timegroup.renderAudio(lastRenderedAudioEndMs, config.endMs);
        if (audioBuffer && audioBuffer.length > 0) {
          await audioSource.add(audioBuffer);
        }
      } catch (e) { /* Audio render failures are non-fatal */ }
    }
    
    const totalTime = performance.now() - renderStartTime;
    
    // Calculate percentages and averages for performance analysis
    const avgSeek = totalSeekMs / config.totalFrames;
    const avgSync = totalSyncMs / config.totalFrames;
    const avgEncode = totalEncodeMs / config.totalFrames;
    const avgWait = totalImageWaitMs / config.totalFrames;
    const avgTotal = totalTime / config.totalFrames;
    
    const tracked = totalSeekMs + totalSyncMs + totalImageWaitMs + totalEncodeMs;
    const untracked = totalTime - tracked;
    
    const pipelineTotal = pipelineHits + pipelineMisses;
    console.log(
      `\n=== Video Export Performance Breakdown ===\n` +
      `Mode: Direct Serialization\n` +
      `Total frames: ${config.totalFrames}\n` +
      `Total time: ${totalTime.toFixed(0)}ms (${avgTotal.toFixed(1)}ms/frame)\n` +
      `\nPer-stage totals (sequential — these should sum to ~100%):\n` +
      `  Seek:       ${totalSeekMs.toFixed(0)}ms (${(totalSeekMs/totalTime*100).toFixed(1)}%) - avg ${avgSeek.toFixed(1)}ms/frame\n` +
      `  Capture:    ${totalSyncMs.toFixed(0)}ms (${(totalSyncMs/totalTime*100).toFixed(1)}%) - avg ${avgSync.toFixed(1)}ms/frame\n` +
      `  Image wait: ${totalImageWaitMs.toFixed(0)}ms (${(totalImageWaitMs/totalTime*100).toFixed(1)}%) - avg ${avgWait.toFixed(1)}ms/frame\n` +
      `  Encode:     ${totalEncodeMs.toFixed(0)}ms (${(totalEncodeMs/totalTime*100).toFixed(1)}%) - avg ${avgEncode.toFixed(1)}ms/frame\n` +
      `  Other:      ${untracked.toFixed(0)}ms (${(untracked/totalTime*100).toFixed(1)}%)\n` +
      `\nPipeline (MAX_AHEAD=${MAX_AHEAD}):\n` +
      `  Preloaded: ${pipelineHits}/${pipelineTotal} (${((pipelineHits / Math.max(1, pipelineTotal)) * 100).toFixed(0)}% hit rate)\n` +
      `  Awaited:   ${pipelineMisses}\n` +
      `==========================================`
    );
    
    if (config.benchmarkMode) {
      return undefined;
    }
    
    await output!.finalize();
    
    if (useStreaming) {
      // Streaming mode: chunks already sent via customWritableStream or file stream
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
    suppressionStyle.remove();
    renderContext.dispose();
    cleanupRenderClone();
    // Remove preview container if it was attached to document
    if (previewContainer.parentNode) {
      previewContainer.parentNode.removeChild(previewContainer);
    }
  }
}

export { QUALITY_HIGH };
export type { AudioCodec };
