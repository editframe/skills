/**
 * Shared types for canvas encoding.
 */

import type { RenderContext } from "../RenderContext.js";

export interface CanvasEncodeResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  preserveAlpha: boolean;
}

/**
 * Maps canvas clone elements to their original source elements.
 * Used to enable direct capture API for ef-video elements.
 */
export type CanvasSourceMap = WeakMap<HTMLCanvasElement, Element>;

export interface CanvasEncodeOptions {
  /**
   * Scale factor for encoding canvases (default: 1).
   * When set, canvases are scaled down before encoding to data URLs,
   * dramatically reducing encoding time for thumbnails.
   */
  scale?: number;
  /**
   * JPEG quality for non-alpha canvases (0-1).
   * Defaults to high quality (0.92) for scale >= 0.5, medium (0.85) otherwise.
   */
  quality?: number;
  /**
   * Optional RenderContext for caching encoded dataURLs.
   * When provided, checks cache before encoding and stores results.
   */
  renderContext?: RenderContext;
  /**
   * Optional map from clone canvases to their source elements.
   * Used to enable direct capture API for ef-video elements.
   */
  sourceMap?: CanvasSourceMap;
}
