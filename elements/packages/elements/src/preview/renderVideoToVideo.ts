/**
 * Direct video-to-video rendering — fast path for single video elements.
 * 
 * Bypasses the full DOM serialization pipeline (foreignObject/native canvas)
 * by decoding frames directly from the media engine and re-encoding to MP4.
 * 
 * Supports CSS effects via canvas 2D context:
 * - filter (ctx.filter)
 * - opacity (ctx.globalAlpha)
 * - transform (DOMMatrix + transformOrigin)
 * - clip-path (inset, circle, ellipse, polygon, path → Path2D/ctx.clip)
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
import {
  NoSupportedAudioCodecError,
  RenderCancelledError,
} from "./renderTimegroupToVideo.js";
import type { RenderToVideoOptions } from "./renderTimegroupToVideo.types.js";
import { logger } from "./logger.js";

// ============================================================================
// CSS Effect Parsing — read once, apply per-frame
// ============================================================================

interface ParsedTransform {
  matrix: DOMMatrix;
  originX: number;
  originY: number;
}

/**
 * Parse CSS transform + transformOrigin from computed style.
 * Returns null if no transform is applied.
 * 
 * getComputedStyle resolves all transform functions to matrix() or matrix3d().
 * DOMMatrix constructor parses both formats directly.
 * Origin is returned in pixels (browser resolves percentages).
 */
function parseTransform(
  computedStyle: CSSStyleDeclaration,
  displayWidth: number,
  displayHeight: number,
  encodingWidth: number,
  encodingHeight: number,
): ParsedTransform | null {
  const raw = computedStyle.transform;
  if (!raw || raw === "none") return null;

  if (raw.startsWith("matrix3d")) {
    logger.warn("[renderVideoToVideo] 3D transforms (matrix3d) are not supported in direct video rendering, skipping");
    return null;
  }

  const matrix = new DOMMatrix(raw);

  // transformOrigin is resolved to "Xpx Ypx" by getComputedStyle
  const originParts = computedStyle.transformOrigin.split(" ");
  const displayOriginX = parseFloat(originParts[0] || "0");
  const displayOriginY = parseFloat(originParts[1] || "0");

  // Scale origin from display space to encoding space
  const scaleX = encodingWidth / displayWidth;
  const scaleY = encodingHeight / displayHeight;
  const originX = displayOriginX * scaleX;
  const originY = displayOriginY * scaleY;

  // Scale translation components of the matrix to encoding space
  matrix.e *= scaleX;
  matrix.f *= scaleY;

  return { matrix, originX, originY };
}

/**
 * Parsed clip-path represented as a Path2D for compositing-based masking.
 * We avoid ctx.clip() due to a Chromium GPU pipeline issue where clip regions
 * on OffscreenCanvas cause subsequent frame draws to hang.
 */
interface ParsedClipPath {
  path: Path2D;
}

/**
 * Parse CSS clip-path from computed style.
 * Returns null if no clip-path or "none".
 * 
 * getComputedStyle resolves percentages to pixels for most shape functions.
 * We parse: inset(), circle(), ellipse(), polygon(), path().
 */
function parseClipPath(
  computedStyle: CSSStyleDeclaration,
  displayWidth: number,
  displayHeight: number,
  encodingWidth: number,
  encodingHeight: number,
): ParsedClipPath | null {
  const raw = computedStyle.clipPath;
  if (!raw || raw === "none") return null;

  const scaleX = encodingWidth / displayWidth;
  const scaleY = encodingHeight / displayHeight;

  // inset(top right bottom left) or inset(top right bottom left round radius)
  const insetMatch = raw.match(/^inset\((.+)\)$/);
  if (insetMatch) {
    return parseInsetClip(insetMatch[1]!, scaleX, scaleY, encodingWidth, encodingHeight);
  }

  // circle(radius at cx cy) or circle(radius)
  const circleMatch = raw.match(/^circle\((.+)\)$/);
  if (circleMatch) {
    return parseCircleClip(circleMatch[1]!, scaleX, scaleY, encodingWidth, encodingHeight);
  }

  // ellipse(rx ry at cx cy) or ellipse(rx ry)
  const ellipseMatch = raw.match(/^ellipse\((.+)\)$/);
  if (ellipseMatch) {
    return parseEllipseClip(ellipseMatch[1]!, scaleX, scaleY, encodingWidth, encodingHeight);
  }

  // polygon(x1 y1, x2 y2, ...)
  const polygonMatch = raw.match(/^polygon\((.+)\)$/);
  if (polygonMatch) {
    return parsePolygonClip(polygonMatch[1]!, scaleX, scaleY, encodingWidth, encodingHeight);
  }

  // path("d string")
  const pathMatch = raw.match(/^path\(["'](.+)["']\)$/);
  if (pathMatch) {
    return parsePathClip(pathMatch[1]!, scaleX, scaleY);
  }

  logger.warn(`[renderVideoToVideo] Unsupported clip-path value: ${raw}`);
  return null;
}

function parsePx(value: string): number {
  return parseFloat(value);
}

function parseInsetClip(
  args: string,
  _scaleX: number,
  _scaleY: number,
  encodingWidth: number,
  encodingHeight: number,
): ParsedClipPath {
  const [insetPart] = args.split(/\s+round\s+/);
  const rawValues = insetPart!.trim().split(/\s+/);

  const top = resolveClipLength(rawValues[0] ?? "0", encodingHeight);
  const right = resolveClipLength(rawValues[1] ?? rawValues[0] ?? "0", encodingWidth);
  const bottom = resolveClipLength(rawValues[2] ?? rawValues[0] ?? "0", encodingHeight);
  const left = resolveClipLength(rawValues[3] ?? rawValues[1] ?? rawValues[0] ?? "0", encodingWidth);

  const path = new Path2D();
  path.rect(left, top, encodingWidth - left - right, encodingHeight - top - bottom);
  return { path };
}

/**
 * Resolve a CSS clip-path length value that may be a percentage or pixel value.
 * Percentages are resolved against the provided reference dimension.
 */
function resolveClipLength(value: string, referenceDimension: number): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return (parseFloat(trimmed) / 100) * referenceDimension;
  }
  return parseFloat(trimmed);
}

/**
 * Build a polygon approximation of a circle/ellipse as a Path2D.
 * Uses polygon instead of arc/ellipse to avoid Chromium OffscreenCanvas
 * clip+arc+VideoFrame rendering issues.
 */
function ellipseAsPolygon(cx: number, cy: number, rx: number, ry: number, segments = 64): Path2D {
  const path = new Path2D();
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.closePath();
  return path;
}

function parseCircleClip(
  args: string,
  scaleX: number,
  scaleY: number,
  encodingWidth: number,
  encodingHeight: number,
): ParsedClipPath {
  // "50px at 100px 200px" or "50%" or "50px"
  // For circle(), the percentage radius is relative to sqrt(w^2 + h^2) / sqrt(2)
  const atParts = args.split(/\s+at\s+/);
  const radiusStr = atParts[0]!.trim();

  // Resolve radius — percentage is relative to the reference box diagonal
  const referenceDiag = Math.sqrt(encodingWidth ** 2 + encodingHeight ** 2) / Math.sqrt(2);
  const radius = radiusStr.endsWith("%")
    ? (parseFloat(radiusStr) / 100) * referenceDiag
    : parsePx(radiusStr) * Math.min(scaleX, scaleY);

  let cx = encodingWidth / 2;
  let cy = encodingHeight / 2;
  if (atParts[1]) {
    const posParts = atParts[1].trim().split(/\s+/);
    cx = resolveClipLength(posParts[0]!, encodingWidth);
    cy = resolveClipLength(posParts[1] ?? posParts[0]!, encodingHeight);
  }

  return { path: ellipseAsPolygon(cx, cy, radius, radius) };
}

function parseEllipseClip(
  args: string,
  _scaleX: number,
  _scaleY: number,
  encodingWidth: number,
  encodingHeight: number,
): ParsedClipPath {
  const atParts = args.split(/\s+at\s+/);
  const radiiParts = atParts[0]!.trim().split(/\s+/);
  const rx = resolveClipLength(radiiParts[0]!, encodingWidth);
  const ry = resolveClipLength(radiiParts[1] ?? radiiParts[0]!, encodingHeight);

  let cx = encodingWidth / 2;
  let cy = encodingHeight / 2;
  if (atParts[1]) {
    const posParts = atParts[1].trim().split(/\s+/);
    cx = resolveClipLength(posParts[0]!, encodingWidth);
    cy = resolveClipLength(posParts[1] ?? posParts[0]!, encodingHeight);
  }

  return { path: ellipseAsPolygon(cx, cy, rx, ry) };
}

function parsePolygonClip(
  args: string,
  _scaleX: number,
  _scaleY: number,
  encodingWidth: number,
  encodingHeight: number,
): ParsedClipPath {
  const points = args.split(",").map((pair) => {
    const [x, y] = pair.trim().split(/\s+/);
    return {
      x: resolveClipLength(x!, encodingWidth),
      y: resolveClipLength(y!, encodingHeight),
    };
  });

  const path = new Path2D();
  if (points.length > 0) {
    path.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i]!.x, points[i]!.y);
    }
    path.closePath();
  }
  return { path };
}

function parsePathClip(d: string, scaleX: number, scaleY: number): ParsedClipPath {
  const originalPath = new Path2D(d);
  const scaledPath = new Path2D();
  scaledPath.addPath(originalPath, new DOMMatrix([scaleX, 0, 0, scaleY, 0, 0]));
  return { path: scaledPath };
}

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
      `intrinsicDuration=${intrinsicDurationMs}ms leaves no content.`
    );
  }

  const startMs = options.fromMs !== undefined ? Math.max(0, options.fromMs) : 0;
  const endMs = options.toMs !== undefined ? Math.min(options.toMs, effectiveDurationMs) : effectiveDurationMs;
  const renderDurationMs = endMs - startMs;

  if (renderDurationMs <= 0) {
    throw new Error(`Invalid render range: from ${startMs}ms to ${endMs}ms`);
  }

  // Determine video dimensions from the media engine rendition metadata
  const mediaEngine = await video.getMediaEngine();
  let width: number;
  let height: number;

  const videoRendition = mediaEngine?.getVideoRendition?.() || (mediaEngine as any)?.videoRendition;
  if (videoRendition?.width && videoRendition?.height) {
    width = videoRendition.width;
    height = videoRendition.height;
  } else {
    // Fall back: decode first frame to get dimensions
    const firstFrame = await video.getVideoFrameAtSourceTime(trimStartMs, { quality: "main" });
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

  // Read CSS effects once before the frame loop (values don't change during rendering)
  const computedStyle = getComputedStyle(video);
  const cssFilter = computedStyle.filter;
  const cssOpacity = parseFloat(computedStyle.opacity);
  const hasFilter = cssFilter && cssFilter !== "none";
  const hasOpacity = cssOpacity < 1;

  // Element display dimensions for scaling CSS pixel values to encoding dimensions
  void video.offsetHeight; // force layout reflow
  const displayWidth = video.offsetWidth || config.videoWidth;
  const displayHeight = video.offsetHeight || config.videoHeight;

  const parsedTransform = parseTransform(
    computedStyle, displayWidth, displayHeight, config.videoWidth, config.videoHeight,
  );
  const parsedClipPath = parseClipPath(
    computedStyle, displayWidth, displayHeight, config.videoWidth, config.videoHeight,
  );

  const hasCssEffects = hasFilter || hasOpacity || !!parsedTransform || !!parsedClipPath;

  logger.debug(
    `[renderVideoToVideo] starting: ${config.totalFrames} frames, ` +
    `${config.videoWidth}x${config.videoHeight} @ ${config.fps}fps, ` +
    `trim=[${config.trimStartMs}, -${(video.trimEndMs ?? 0)}], ` +
    `css: filter=${hasFilter ? cssFilter : "none"}, opacity=${cssOpacity}, ` +
    `transform=${parsedTransform ? "yes" : "none"}, clipPath=${parsedClipPath ? "yes" : "none"}`
  );

  // =========================================================================
  // Set up video encoding
  // =========================================================================
  let output: Output | null = null;
  let videoSource: CanvasSource | null = null;
  let audioSource: AudioBufferSource | null = null;
  let target: BufferTarget | StreamTarget | null = null;
  let fileStream: { writable: WritableStream<Uint8Array>; close: () => Promise<void> } | null = null;
  let useStreaming = false;

  const encodingCanvas = new OffscreenCanvas(config.videoWidth, config.videoHeight);
  const encodingCtx = encodingCanvas.getContext("2d");
  if (!encodingCtx) {
    throw new Error("Failed to get encoding canvas context");
  }

  // When CSS effects are active, all draw + compositing operations happen on a
  // separate staging canvas. Chromium's OffscreenCanvas has a GPU pipeline bug
  // where complex canvas operations (filter, transform, clip, globalCompositeOperation)
  // combined with VideoFrame drawImage causes subsequent frames to deadlock. By staging
  // on a separate canvas and copying the final pixels to the encoding canvas, the encoder
  // only ever sees plain drawImage(canvas) calls.
  let stageCanvas: OffscreenCanvas | null = null;
  let stageCtx: OffscreenCanvasRenderingContext2D | null = null;
  if (hasCssEffects) {
    stageCanvas = new OffscreenCanvas(config.videoWidth, config.videoHeight);
    stageCtx = stageCanvas.getContext("2d");
    if (!stageCtx) {
      throw new Error("Failed to get staging canvas context");
    }
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

        if (hasCssEffects) {
          // Stage all CSS effects on a separate canvas to avoid Chromium GPU deadlock.
          // VideoFrame → ImageBitmap decouples the GPU-backed frame from canvas ops.
          const bitmap = await createImageBitmap(videoFrame);
          videoFrame.close();

          stageCtx!.clearRect(0, 0, config.videoWidth, config.videoHeight);
          stageCtx!.save();

          if (parsedTransform) {
            const { matrix, originX, originY } = parsedTransform;
            stageCtx!.translate(originX, originY);
            stageCtx!.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
            stageCtx!.translate(-originX, -originY);
          }
          if (hasFilter) {
            stageCtx!.filter = cssFilter;
          }
          if (hasOpacity) {
            stageCtx!.globalAlpha = cssOpacity;
          }

          stageCtx!.drawImage(bitmap, 0, 0, config.videoWidth, config.videoHeight);
          stageCtx!.restore();
          bitmap.close();

          // If clip-path is active, mask via compositing: keep only pixels inside the clip shape
          if (parsedClipPath) {
            stageCtx!.save();
            stageCtx!.globalCompositeOperation = "destination-in";
            stageCtx!.fillStyle = "white";
            stageCtx!.fill(parsedClipPath.path);
            stageCtx!.restore();
          }

          // Copy clean result to encoding canvas
          encodingCtx.clearRect(0, 0, config.videoWidth, config.videoHeight);
          encodingCtx.drawImage(stageCanvas!, 0, 0);
        } else {
          encodingCtx.drawImage(
            videoFrame,
            0, 0, videoFrame.displayWidth, videoFrame.displayHeight,
            0, 0, config.videoWidth, config.videoHeight,
          );
        }

        totalDrawMs += performance.now() - drawStart;
      } finally {
        try { videoFrame.close(); } catch { /* may be closed in hasCssEffects branch */ }
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
        } catch (e) {
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
      } catch (e) {
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
      `speed=${(config.renderDurationMs / totalElapsed).toFixed(1)}x`
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
  }
}
