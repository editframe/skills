/**
 * Type definitions for video rendering.
 * This file has ZERO imports and ZERO side effects - safe for SSR.
 */

export interface RenderProgress {
  progress: number;
  currentFrame: number;
  totalFrames: number;
  renderedMs: number;
  totalDurationMs: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  speedMultiplier: number;
  framePreviewCanvas?: HTMLCanvasElement;
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
  contentReadyMode?: "immediate" | "blocking";
  blockingTimeoutMs?: number;
  returnBuffer?: boolean;
  preferredAudioCodecs?: Array<"aac" | "opus" | "mp3">;
  benchmarkMode?: boolean;
  customWritableStream?: WritableStream<Uint8Array>;
  progressPreviewInterval?: number;
  canvasMode?: "native" | "foreignObject";
  /**
   * API token (`ef_...`) for telemetry reporting. Omitting this skips the
   * client-side telemetry beacon, which is a violation of the Editframe SDK
   * License Agreement. Not required when called from the CLI render path,
   * which handles telemetry from Node.js.
   */
  telemetryToken?: string;
  /** Override the telemetry endpoint (defaults to https://editframe.com). */
  telemetryEndpoint?: string;
}
