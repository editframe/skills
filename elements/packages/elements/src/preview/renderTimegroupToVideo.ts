/**
 * Video rendering for timegroups.
 * 
 * Uses the EXACT same rendering path as thumbnail generation (captureFromClone),
 * ensuring consistency between preview thumbnails and exported video.
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
import {
  resetRenderState,
  type ContentReadyMode,
} from "./renderTimegroupToCanvas.js";
import {
  buildCloneStructure,
  syncStyles,
  collectDocumentStyles,
  overrideRootCloneStyles,
} from "./renderTimegroupPreview.js";
import { renderToImageDirect, loadImageFromDataUri } from "./rendering/renderToImage.js";
import { createPreviewContainer } from "./previewTypes.js";
import { getSerializationWorkerPool, resetSerializationWorkerPool } from "./rendering/SerializationWorkerPool.js";
import { extractCanvasData, serializeToHtmlString, cleanupCanvasMarkers } from "./rendering/frameSerializationHelpers.js";
import { inlineImages } from "./rendering/inlineImages.js";

// ============================================================================
// Types
// ============================================================================

export interface RenderProgress {
  progress: number;
  currentFrame: number;
  totalFrames: number;
  renderedMs: number;
  totalDurationMs: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  speedMultiplier: number;
  framePreviewUrl?: string;
}

export interface RenderToVideoOptions {
  fps?: number;
  codec?: "avc" | "hevc" | "vp9" | "av1" | "vp8";
  bitrate?: number;
  filename?: string;
  scale?: number;
  keyFrameInterval?: number;
  fromMs?: number;
  toMs?: number;
  onProgress?: (progress: RenderProgress) => void;
  streaming?: boolean;
  signal?: AbortSignal;
  includeAudio?: boolean;
  audioBitrate?: number;
  contentReadyMode?: ContentReadyMode;
  blockingTimeoutMs?: number;
  returnBuffer?: boolean;
  preferredAudioCodecs?: AudioCodec[];
  benchmarkMode?: boolean;
  customWritableStream?: WritableStream<Uint8Array>; // For programmatic streaming (CLI/Playwright)
}

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
  
  // Pre-fetch main video segments for all timestamps
  // This ensures all segments are cached before rendering starts,
  // avoiding network delays during the frame loop
  const timestamps: number[] = [];
  for (let i = 0; i < config.totalFrames; i++) {
    timestamps.push(config.startMs + i * config.frameDurationMs);
  }
  
  const videoElements = renderClone.querySelectorAll("ef-video");
  if (videoElements.length > 0) {
    logger.debug(`[renderTimegroupToVideo] Prefetching main video segments for ${videoElements.length} video(s)...`);
    await Promise.all(
      Array.from(videoElements).map((video) =>
        (video as EFVideo).prefetchMainVideoSegments(timestamps),
      ),
    );
    logger.debug(`[renderTimegroupToVideo] Prefetch complete`);
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
  // Build clone structure ONCE - reuse like live preview does
  // =========================================================================
  const initialTimeMs = config.startMs;
  await renderClone.seekForRender(initialTimeMs);
  const { container: cloneContainer, syncState } = buildCloneStructure(renderClone, initialTimeMs);
  
  // Create preview container with proper styling
  const width = timegroup.offsetWidth || 1920;
  const height = timegroup.offsetHeight || 1080;
  const previewContainer = createPreviewContainer({
    width,
    height,
    background: getComputedStyle(timegroup).background || "#000",
  });
  
  // Inject document styles
  const styleEl = document.createElement("style");
  styleEl.textContent = collectDocumentStyles();
  previewContainer.appendChild(styleEl);
  previewContainer.appendChild(cloneContainer);
  overrideRootCloneStyles(syncState, true);
  
  // =========================================================================
  // Frame loop - DEEP PIPELINE: overlap encode + render + prepare
  // =========================================================================
  const renderStartTime = performance.now();
  let lastFramePreviewUrl: string | undefined;
  let lastRenderedAudioEndMs = config.startMs;
  const audioChunkDurationMs = 2000;
  
  let totalSeekMs = 0;
  let totalSyncMs = 0;
  let totalRenderMs = 0;
  let totalEncodeMs = 0;
  let totalWorkerMs = 0;
  
  // Initialize worker pool for parallel frame serialization
  const serializationPool = getSerializationWorkerPool();
  const useWorkerSerialization = serializationPool !== null && serializationPool.isAvailable();
  
  if (useWorkerSerialization) {
    logger.debug(`[renderTimegroupToVideo] Using worker pool with ${serializationPool.workerCount} workers for parallel serialization`);
  } else {
    logger.debug("[renderTimegroupToVideo] Worker pool not available, using main thread serialization");
  }
  
  try {
    // ========================================================================
    // Prime the pipeline: render frame 0 completely before entering loop
    // ========================================================================
    await renderClone.seekForRender(timestamps[0]!);
    syncStyles(syncState, timestamps[0]!);
    overrideRootCloneStyles(syncState, true);
    
    // Inline external images once (they're the same for all frames)
    await inlineImages(previewContainer);
    
    let preparedImage: HTMLImageElement;
    
    if (useWorkerSerialization && serializationPool) {
      // Worker-based serialization path
      const canvasData = extractCanvasData(previewContainer);
      const htmlString = serializeToHtmlString(previewContainer, width, height);
      cleanupCanvasMarkers(previewContainer);
      
      const workerStart = performance.now();
      const svgDataUrl = await serializationPool.serializeFrame(htmlString, canvasData, width, height);
      totalWorkerMs += performance.now() - workerStart;
      
      preparedImage = await loadImageFromDataUri(svgDataUrl);
    } else {
      // Fallback to main thread serialization
      preparedImage = await renderToImageDirect(previewContainer, width, height);
    }
    
    let pendingEncodePromise: Promise<void> | null = null;
    
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
        } catch (e) { /* Audio render failures are non-fatal */ }
        lastRenderedAudioEndMs = chunkEndMs;
      }
      
      // =====================================================================
      // PIPELINE STAGE 1: Start encoding current frame (DON'T AWAIT YET!)
      // =====================================================================
      let currentEncodePromise: Promise<void> | null = null;
      
      if (videoSource && output && encodingCtx && preparedImage) {
        const encodeStart = performance.now();
        encodingCtx.drawImage(
          preparedImage,
          0, 0, preparedImage.width, preparedImage.height,
          0, 0, config.videoWidth, config.videoHeight,
        );
        // Start encode but DON'T await yet - let it run in web worker
        currentEncodePromise = videoSource.add(timestampS, config.frameDurationS);
        totalEncodeMs += performance.now() - encodeStart; // Just timing overhead
      }
      
      // =====================================================================
      // PIPELINE STAGE 2: While encoding, prepare and render NEXT frame
      // =====================================================================
      const nextFrameIndex = frameIndex + 1;
      let nextRenderPromise: Promise<HTMLImageElement> | null = null;
      
      if (nextFrameIndex < config.totalFrames) {
        const nextTimeMs = timestamps[nextFrameIndex]!;
        
        // Prepare next frame
        const seekStart = performance.now();
        await renderClone.seekForRender(nextTimeMs);
        totalSeekMs += performance.now() - seekStart;
        
        const syncStart = performance.now();
        syncStyles(syncState, nextTimeMs);
        overrideRootCloneStyles(syncState, true);
        totalSyncMs += performance.now() - syncStart;
        
        // Start rendering next frame (don't await yet)
        const renderStart = performance.now();
        
        if (useWorkerSerialization && serializationPool) {
          // Worker-based serialization: extract data and send to worker pool
          const canvasData = extractCanvasData(previewContainer);
          const htmlString = serializeToHtmlString(previewContainer, width, height);
          cleanupCanvasMarkers(previewContainer);
          
          // Start worker serialization (runs in parallel with encoding)
          const workerPromise = serializationPool.serializeFrame(htmlString, canvasData, width, height);
          
          // Chain with image loading
          nextRenderPromise = workerPromise.then(async (svgDataUrl) => {
            const workerEnd = performance.now();
            totalWorkerMs += workerEnd - renderStart;
            return loadImageFromDataUri(svgDataUrl);
          });
        } else {
          // Fallback to main thread serialization
          nextRenderPromise = renderToImageDirect(previewContainer, width, height);
        }
        
        totalRenderMs += performance.now() - renderStart; // Just timing overhead
      }
      
      // =====================================================================
      // PIPELINE STAGES 3-4: Await all promises in parallel
      // =====================================================================
      const [_, __, nextImage] = await Promise.all([
        pendingEncodePromise || Promise.resolve(),
        currentEncodePromise || Promise.resolve(),
        nextRenderPromise || Promise.resolve(null),
      ]);
      
      if (nextImage) {
        preparedImage = nextImage;
      }
      pendingEncodePromise = currentEncodePromise;
      
      // Progress
      const currentFrame = frameIndex + 1;
      const progress = currentFrame / config.totalFrames;
      const renderedMs = currentFrame * config.frameDurationMs;
      const elapsedMs = performance.now() - renderStartTime;
      const msPerFrame = elapsedMs / currentFrame;
      const remainingFrames = config.totalFrames - currentFrame;
      const estimatedRemainingMs = remainingFrames * msPerFrame;
      const speedMultiplier = renderedMs / elapsedMs;
      
      if (onProgress && frameIndex % 10 === 0 && preparedImage) {
        const previewWidth = 160;
        const previewHeight = Math.round(previewWidth * (config.videoHeight / config.videoWidth));
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = previewWidth;
        thumbCanvas.height = previewHeight;
        const thumbCtx = thumbCanvas.getContext("2d")!;
        thumbCtx.drawImage(preparedImage, 0, 0, previewWidth, previewHeight);
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
    
    // Final encode (if any pending)
    if (pendingEncodePromise) {
      await pendingEncodePromise;
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
    const logParts = [
      `[renderTimegroupToVideo] ${config.totalFrames} frames:`,
      `seek=${totalSeekMs.toFixed(0)}ms`,
      `sync=${totalSyncMs.toFixed(0)}ms`,
      `render=${totalRenderMs.toFixed(0)}ms`
    ];
    
    if (useWorkerSerialization) {
      logParts.push(`worker=${totalWorkerMs.toFixed(0)}ms`);
    }
    
    logParts.push(`encode=${totalEncodeMs.toFixed(0)}ms`);
    logParts.push(`total=${totalTime.toFixed(0)}ms`);
    
    logger.debug(logParts.join(', '));
    
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
    cleanupRenderClone();
    
    // Note: We don't terminate the worker pool here because it's a singleton
    // that can be reused across multiple render calls for better performance.
    // It will be cleaned up when the page unloads or when explicitly reset.
  }
}

/**
 * Clean up resources (for testing or when changing settings).
 * Call this to reset the worker pool and force recreation on next render.
 */
export function cleanupRenderResources(): void {
  resetSerializationWorkerPool();
}

export { QUALITY_HIGH };
export type { AudioCodec };
