/**
 * Video rendering for timegroups.
 * 
 * Architecture:
 * - Builds passive structure ONCE from clone timeline at start
 * - Incrementally syncs styles/content each frame from clone's current DOM state
 * - Captures DOM changes from frame tasks (SVG paths, canvas content, text updates)
 * - RenderContext provides pixel caching across frames for performance
 * 
 * This ensures consistency while avoiding expensive per-frame DOM reconstruction.
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
import { renderToImageDirect } from "./rendering/renderToImage.js";
import { serializeTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import { createPreviewContainer } from "./previewTypes.js";
import { inlineImages } from "./rendering/inlineImages.js";
import { RenderContext } from "./RenderContext.js";

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
  useDirectSerialization?: boolean; // Enable new direct timeline serialization (no passive structure)
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
  const width = timegroup.offsetWidth || 1920;
  const height = timegroup.offsetHeight || 1080;
  const previewContainer = createPreviewContainer({
    width,
    height,
    background: getComputedStyle(timegroup).background || "#000",
  });
  
  // Conditional setup based on serialization mode
  const useDirectSerialization = options.useDirectSerialization ?? false;
  let syncState: any = null;
  
  if (useDirectSerialization) {
    console.log(`[renderTimegroupToVideo] Using direct timeline serialization (no passive structure)`);
    // For direct serialization, attach renderClone to container
    previewContainer.appendChild(renderClone);
    // CRITICAL: Add ef-render-clone-container class so isRenderClone() returns true
    // This affects animation tracking - without it, the animation system treats the clone
    // as the prime timeline, which causes incorrect behavior
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
    console.log(`[renderTimegroupToVideo] Attached previewContainer to document.body (off-screen) for style computation`);
  } else {
    // Inject document styles once (cached for all frames)
    const styleEl = document.createElement("style");
    styleEl.textContent = collectDocumentStyles();
    previewContainer.appendChild(styleEl);
    
    // Build passive structure ONCE before frame loop - will be reused and incrementally synced
    const initialBuildStart = performance.now();
    const result = buildCloneStructure(renderClone, config.startMs);
    syncState = result.syncState;
    previewContainer.appendChild(result.container);
    overrideRootCloneStyles(syncState, true);
    const initialBuildTime = performance.now() - initialBuildStart;
    console.log(`[renderTimegroupToVideo] Initial build: ${initialBuildTime.toFixed(1)}ms, nodeCount=${syncState.nodeCount}`);
  }
  
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
  
  try {
    // ========================================================================
    // DEEP PIPELINE: 3-4 frames ahead with operation queues
    // ========================================================================
    // Maintain queues of in-flight work (like the reference architecture)
    type RenderTask = { frameIndex: number; timeMs: number; timestampS: number; promise: Promise<HTMLImageElement> };
    const seekQueue: Promise<void>[] = [];
    const renderTasks: RenderTask[] = [];
    
    // Pipeline depth configuration
    // NOTE: Set to 1 for correctness - parallel seeks cause duplicate frames
    // TODO: Investigate why parallel seeks don't work with the clone structure
    const MAX_SEEK = 1;
    const MAX_RENDER = 1;
    
    let nextSeekFrame = 0;
    let nextRenderFrame = 0;
    
    // Inline external images once (only for passive structure approach)
    if (!useDirectSerialization) {
      await inlineImages(previewContainer);
    }
    
    for (let completedFrames = 0; completedFrames < config.totalFrames; completedFrames++) {
      checkCancelled();
      
      const frameIndex = completedFrames;
      const timeMs = timestamps[frameIndex]!;
      const timestampS = (frameIndex * config.frameDurationMs) / 1000;
      
      // =====================================================================
      // STAGE 1: Fill seek queue (don't block!)
      // =====================================================================
      while (seekQueue.length < MAX_SEEK && nextSeekFrame < config.totalFrames) {
        const seekFrameIndex = nextSeekFrame;
        const seekTimeMs = timestamps[seekFrameIndex]!;
        
        const seekStart = performance.now();
        const seekPromise = renderClone.seekForRender(seekTimeMs).then(() => {
          totalSeekMs += performance.now() - seekStart;
        });
        seekQueue.push(seekPromise);
        nextSeekFrame++;
      }
      
      // =====================================================================
      // STAGE 2: Fill render queue (don't block!)
      // =====================================================================
      while (renderTasks.length < MAX_RENDER && seekQueue.length > 0 && nextRenderFrame < config.totalFrames) {
        const renderFrameIndex = nextRenderFrame;
        const renderTimeMs = timestamps[renderFrameIndex]!;
        const renderTimestampS = (renderFrameIndex * config.frameDurationMs) / 1000;
        const seekPromise = seekQueue.shift()!;
        
        const renderPromise = seekPromise.then(async () => {
          // NOTE: seekForRender() has already:
          // 1. Called frameController.renderFrame() to coordinate FrameRenderable elements
          // 2. Awaited #executeCustomFrameTasks() so frame tasks are complete
          // Clone's DOM now reflects all changes from frame tasks
          
          let syncTime = 0;
          let image: HTMLImageElement;
          
          if (useDirectSerialization) {
            // Direct serialization: serialize timeline to data URI in one pass
            const syncStart = performance.now();
            const dataUri = await serializeTimelineToDataUri(renderClone, width, height, {
              renderContext,
              canvasScale: config.scale,
              timeMs: renderTimeMs,
            });
            syncTime = performance.now() - syncStart;
            totalSyncMs += syncTime;
            
            // Decode and log the actual SVG content for debugging
            const svgContent = dataUri.startsWith('data:image/svg+xml;base64,') 
              ? atob(dataUri.substring('data:image/svg+xml;base64,'.length))
              : dataUri;
            console.log(`[Frame ${renderFrameIndex}] Data URI length: ${dataUri.length} (${(dataUri.length / 1024 / 1024).toFixed(1)}MB)`);
            console.log(`[Frame ${renderFrameIndex}] SVG content preview:`, svgContent.substring(0, 500));
            console.log(`[Frame ${renderFrameIndex}] SVG content end:`, svgContent.substring(svgContent.length - 200));
            
            // Try to parse as XML to validate
            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(svgContent, 'image/svg+xml');
              const parseError = doc.querySelector('parsererror');
              if (parseError) {
                console.error(`[Frame ${renderFrameIndex}] XML parse error:`, parseError.textContent);
              } else {
                console.log(`[Frame ${renderFrameIndex}] XML parsed successfully`);
              }
            } catch (e) {
              console.error(`[Frame ${renderFrameIndex}] XML validation failed:`, e);
            }
            
            // Create image from data URI
            const renderStart = performance.now();
            image = new Image();
            await new Promise<void>((resolve, reject) => {
              image.onload = () => {
                console.log(`[Frame ${renderFrameIndex}] Image loaded: ${image.width}x${image.height}`);
                resolve();
              };
              image.onerror = (e) => {
                console.error(`[Frame ${renderFrameIndex}] Image load error:`, e);
                console.error(`[Frame ${renderFrameIndex}] Try opening this in a new tab:`, dataUri.substring(0, 200) + '...');
                reject(new Error(`Failed to load image from data URI`));
              };
              image.src = dataUri;
            });
            const renderTime = performance.now() - renderStart;
            totalRenderMs += renderTime;
          } else {
            // Passive structure: incrementally sync then serialize
            const syncStart = performance.now();
            syncStyles(syncState, renderTimeMs);
            syncTime = performance.now() - syncStart;
            totalSyncMs += syncTime;
            
            const renderStart = performance.now();
            image = await renderToImageDirect(previewContainer, width, height, {
              renderContext,
              sourceMap: syncState.canvasSourceMap,
              canvasScale: config.scale,
            });
            const renderTime = performance.now() - renderStart;
            totalRenderMs += renderTime;
          }
          
          // Log detailed timing every 30 frames to see breakdown
          if (renderFrameIndex % 30 === 0) {
            console.log(`[Frame ${renderFrameIndex}] ${useDirectSerialization ? 'serialize' : 'sync'}=${syncTime.toFixed(1)}ms`);
          }
          
          return image;
        });
        
        renderTasks.push({
          frameIndex: renderFrameIndex,
          timeMs: renderTimeMs,
          timestampS: renderTimestampS,
          promise: renderPromise,
        });
        nextRenderFrame++;
      }
      
      // =====================================================================
      // STAGE 3: Await the render for THIS frame (in strict order)
      // =====================================================================
      const taskIndex = renderTasks.findIndex((t) => t.frameIndex === frameIndex);
      if (taskIndex === -1) {
        throw new Error(`No render task found for frame ${frameIndex}`);
      }
      
      const task = renderTasks[taskIndex]!;
      const image = await task.promise;
      renderTasks.splice(taskIndex, 1);
      
      // =====================================================================
      // STAGE 4: Render audio chunk if needed
      // =====================================================================
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
      // STAGE 5: Encode frame (sequential, maintains order)
      // =====================================================================
      if (videoSource && output && encodingCtx) {
        const encodeStart = performance.now();
        encodingCtx.drawImage(
          image,
          0, 0, image.width, image.height,
          0, 0, config.videoWidth, config.videoHeight,
        );
        await videoSource.add(timestampS, config.frameDurationS);
        totalEncodeMs += performance.now() - encodeStart;
      }
      
      // =====================================================================
      // STAGE 6: Progress reporting
      // =====================================================================
      const currentFrame = frameIndex + 1;
      const progress = currentFrame / config.totalFrames;
      const renderedMs = currentFrame * config.frameDurationMs;
      const elapsedMs = performance.now() - renderStartTime;
      const msPerFrame = elapsedMs / currentFrame;
      const remainingFrames = config.totalFrames - currentFrame;
      const estimatedRemainingMs = remainingFrames * msPerFrame;
      const speedMultiplier = renderedMs / elapsedMs;
      
      if (onProgress && frameIndex % 10 === 0) {
        const previewWidth = 160;
        const previewHeight = Math.round(previewWidth * (config.videoHeight / config.videoWidth));
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = previewWidth;
        thumbCanvas.height = previewHeight;
        const thumbCtx = thumbCanvas.getContext("2d")!;
        thumbCtx.drawImage(image, 0, 0, previewWidth, previewHeight);
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
      } catch (e) { /* Audio render failures are non-fatal */ }
    }
    
    const totalTime = performance.now() - renderStartTime;
    
    // Calculate percentages and averages for performance analysis
    const avgSeek = totalSeekMs / config.totalFrames;
    const avgSync = totalSyncMs / config.totalFrames;
    const avgRender = totalRenderMs / config.totalFrames;
    const avgEncode = totalEncodeMs / config.totalFrames;
    const avgTotal = totalTime / config.totalFrames;
    
    const tracked = totalSeekMs + totalSyncMs + totalRenderMs + totalEncodeMs;
    const untracked = totalTime - tracked;
    
    console.log(`\n=== Video Export Performance Breakdown ===`);
    console.log(`Mode: ${useDirectSerialization ? 'Direct Serialization' : 'Passive Structure'}`);
    console.log(`Total frames: ${config.totalFrames}`);
    console.log(`Total time: ${totalTime.toFixed(0)}ms (${avgTotal.toFixed(1)}ms/frame)`);
    console.log(`\nPer-stage totals:`);
    console.log(`  Seek:   ${totalSeekMs.toFixed(0)}ms (${(totalSeekMs/totalTime*100).toFixed(1)}%) - avg ${avgSeek.toFixed(1)}ms/frame`);
    console.log(`  ${useDirectSerialization ? 'Serialize' : 'Sync'}:  ${totalSyncMs.toFixed(0)}ms (${(totalSyncMs/totalTime*100).toFixed(1)}%) - avg ${avgSync.toFixed(1)}ms/frame`);
    console.log(`  Render: ${totalRenderMs.toFixed(0)}ms (${(totalRenderMs/totalTime*100).toFixed(1)}%) - avg ${avgRender.toFixed(1)}ms/frame`);
    console.log(`  Encode: ${totalEncodeMs.toFixed(0)}ms (${(totalEncodeMs/totalTime*100).toFixed(1)}%) - avg ${avgEncode.toFixed(1)}ms/frame`);
    console.log(`  Other:  ${untracked.toFixed(0)}ms (${(untracked/totalTime*100).toFixed(1)}%)`);
    console.log(`==========================================\n`);
    
    logger.debug(
      `[renderTimegroupToVideo] ${config.totalFrames} frames: ` +
      `seek=${totalSeekMs.toFixed(0)}ms, sync=${totalSyncMs.toFixed(0)}ms, ` +
      `render=${totalRenderMs.toFixed(0)}ms, encode=${totalEncodeMs.toFixed(0)}ms, ` +
      `total=${totalTime.toFixed(0)}ms`
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
