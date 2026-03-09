/**
 * Renderer strategy pattern for HTML-to-image rendering.
 * Provides a unified interface for native (drawElementImage) and foreignObject paths.
 */

import { isNativeCanvasApiAvailable, getRenderMode, type RenderMode } from "./previewSettings.js";

/**
 * Options for rendering HTML to an image or canvas.
 */
export interface RenderOptions {
  /** Skip device pixel ratio scaling (render at logical pixels) */
  skipDprScaling?: boolean;
  /** Scale factor for encoding internal canvases (foreignObject only) */
  canvasScale?: number;
  /** Whether to reuse an existing canvas (native only) */
  reuseCanvas?: HTMLCanvasElement;
}

/**
 * Result of a render operation.
 * Native path returns a canvas, foreignObject path returns an image.
 */
export type RenderResult = HTMLCanvasElement | HTMLImageElement;

/**
 * Renderer interface for HTML-to-image conversion.
 */
export interface Renderer {
  /** The render mode this renderer implements */
  readonly mode: RenderMode;

  /**
   * Render an HTML container to an image or canvas.
   * @param container - The HTML element to render
   * @param width - Target width in logical pixels
   * @param height - Target height in logical pixels
   * @param options - Rendering options
   * @returns Promise resolving to a canvas or image element
   */
  render(
    container: HTMLElement,
    width: number,
    height: number,
    options?: RenderOptions,
  ): Promise<RenderResult>;

  /**
   * Check if this renderer is available in the current environment.
   */
  isAvailable(): boolean;
}

/**
 * Get the effective render mode, validating that native is available when selected.
 * Falls back to foreignObject if native is selected but not available.
 */
export function getEffectiveRenderMode(): RenderMode {
  const mode = getRenderMode();

  if (mode === "native" && !isNativeCanvasApiAvailable()) {
    return "foreignObject";
  }

  return mode;
}

/**
 * Check if a render result is a canvas element.
 */
export function isCanvas(result: RenderResult): result is HTMLCanvasElement {
  return result instanceof HTMLCanvasElement;
}

/**
 * Check if a render result is an image element.
 */
export function isImage(result: RenderResult): result is HTMLImageElement {
  return result instanceof HTMLImageElement;
}
