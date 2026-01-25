/**
 * Shared types for rendering modules.
 */

/**
 * Extended CanvasRenderingContext2D with HTML-in-Canvas API support.
 * @see https://github.com/WICG/html-in-canvas
 */
export interface HtmlInCanvasContext extends CanvasRenderingContext2D {
  drawElementImage(element: HTMLElement, x: number, y: number): void;
}

/**
 * Extended HTMLCanvasElement with layoutSubtree property for HTML-in-Canvas.
 */
export interface HtmlInCanvasElement extends HTMLCanvasElement {
  layoutSubtree?: boolean;
}

/**
 * Options for creating a DPR-aware canvas.
 */
export interface CanvasOptions {
  /** Render width (internal resolution) */
  renderWidth: number;
  /** Render height (internal resolution) */
  renderHeight: number;
  /** Display scale factor */
  scale: number;
  /** Device pixel ratio (defaults to window.devicePixelRatio) */
  dpr?: number;
  /** Full logical width (for CSS sizing) */
  fullWidth: number;
  /** Full logical height (for CSS sizing) */
  fullHeight: number;
}

/**
 * Options for native rendering.
 */
export interface NativeRenderOptions {
  /**
   * Reuse an existing canvas instead of creating a new one.
   * The canvas must have layoutsubtree enabled and be in the DOM.
   */
  reuseCanvas?: HTMLCanvasElement;
  
  /**
   * Skip device pixel ratio scaling. When true, renders at 1x regardless of display DPR.
   * Default: false (respects display DPR for crisp rendering)
   * 
   * Set to true for video export where retina resolution isn't needed.
   * This can provide a 4x speedup on 2x DPR displays!
   */
  skipDprScaling?: boolean;
}

/**
 * Options for foreignObject rendering path.
 */
export interface ForeignObjectRenderOptions extends NativeRenderOptions {
  /**
   * Scale factor for encoding internal canvases.
   * When set, canvases are scaled down before encoding to data URLs,
   * dramatically reducing encoding time for thumbnails.
   * Default: 1 (no scaling - encode at full resolution)
   */
  canvasScale?: number;
}

/**
 * Options for SVG serialization.
 */
export interface SerializeToSvgOptions {
  /** Scale factor for encoding canvases (default: 1) */
  canvasScale?: number;
  /** Whether to inline external images (default: false for cloned containers) */
  inlineImages?: boolean;
  /** Whether to log early render info (default: false) */
  logEarlyRenders?: boolean;
}

/**
 * Result of SVG serialization.
 */
export interface SerializationResult {
  dataUri: string;
  /** Call this to restore canvases if they were modified in-place */
  restore: () => void;
}

/**
 * Information needed to restore canvases after serialization.
 */
export interface CanvasRestoreInfo {
  canvas: HTMLCanvasElement;
  parent: Node;
  nextSibling: Node | null;
  img: HTMLImageElement;
}
