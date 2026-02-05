/**
 * Type definitions for canvas rendering.
 * This file has ZERO imports and ZERO side effects - safe for SSR.
 */

export type ContentReadyMode = "immediate" | "blocking";

export interface CaptureOptions {
  timeMs: number;
  scale?: number;
  skipRestore?: boolean;
  contentReadyMode?: ContentReadyMode;
  blockingTimeoutMs?: number;
  canvasMode?: "native" | "foreignObject";
  skipClone?: boolean;
}

export interface CaptureFromCloneOptions {
  scale?: number;
  contentReadyMode?: ContentReadyMode;
  blockingTimeoutMs?: number;
  originalTimegroup?: any;
  timeMs?: number;
  canvasMode?: "native" | "foreignObject";
}

export interface GeneratedThumbnail {
  timeMs: number;
  canvas: CanvasImageSource;
}

export interface GenerateThumbnailsOptions {
  scale?: number;
  contentReadyMode?: ContentReadyMode;
  blockingTimeoutMs?: number;
  signal?: AbortSignal;
}

export interface ThumbnailQueue {
  shift(): number | undefined;
}

export interface CanvasPreviewResult {
  container: HTMLCanvasElement;
  canvas: HTMLCanvasElement;
  refresh: () => Promise<void>;
  setResolutionScale: (scale: number) => void;
  getResolutionScale: () => number;
  dispose: () => void;
}

export interface CanvasPreviewOptions {
  scale?: number;
  resolutionScale?: number;
}
