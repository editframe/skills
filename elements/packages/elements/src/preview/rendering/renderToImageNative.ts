/**
 * Native HTML-in-Canvas rendering using drawElementImage API.
 */

import type { HtmlInCanvasContext, HtmlInCanvasElement, NativeRenderOptions } from "./types.js";
import { defaultProfiler } from "../RenderProfiler.js";

/** Track canvases that have been initialized for layoutsubtree (only need to wait once) */
const _layoutInitializedCanvases = new WeakSet<HTMLCanvasElement>();

/**
 * Wait for next animation frame (allows browser to complete layout)
 */
function waitForFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Create a canvas element with proper DPR handling.
 * Buffer size is based on renderWidth/renderHeight (internal resolution).
 * CSS size is based on fullWidth/fullHeight (logical display size).
 */
export function createDprCanvas(options: {
  renderWidth: number;
  renderHeight: number;
  scale: number;
  dpr?: number;
  fullWidth: number;
  fullHeight: number;
}): HTMLCanvasElement {
  const { renderWidth, renderHeight, scale, fullWidth, fullHeight } = options;
  const dpr = options.dpr ?? window.devicePixelRatio ?? 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(renderWidth * scale * dpr);
  canvas.height = Math.floor(renderHeight * scale * dpr);
  canvas.style.width = `${Math.floor(fullWidth * scale)}px`;
  canvas.style.height = `${Math.floor(fullHeight * scale)}px`;

  return canvas;
}

/**
 * Render HTML content to canvas using native HTML-in-Canvas API (drawElementImage).
 * This is much faster than the foreignObject approach and avoids canvas tainting.
 *
 * Note: The native API renders at device pixel ratio, so we capture at DPR scale
 * and then downsample to logical pixels to match the foreignObject path's output.
 *
 * @param container - The HTML element to render
 * @param width - Target width in logical pixels
 * @param height - Target height in logical pixels
 * @param options - Rendering options (skipWait for batch mode)
 *
 * @see https://github.com/WICG/html-in-canvas
 */
export async function renderToImageNative(
  container: HTMLElement,
  width: number,
  height: number,
  options: NativeRenderOptions = {},
): Promise<HTMLCanvasElement> {
  const t0 = performance.now();
  const { reuseCanvas, skipDprScaling = false } = options;
  // Use 1x DPR when skipDprScaling is true (for video export) - 4x fewer pixels!
  const dpr = skipDprScaling ? 1 : window.devicePixelRatio || 1;

  // Use provided canvas or create new one
  let captureCanvas: HTMLCanvasElement;
  let shouldCleanup = false;

  if (reuseCanvas) {
    captureCanvas = reuseCanvas;

    // Ensure canvas dimensions match (both attribute and CSS)
    const dpr = skipDprScaling ? 1 : window.devicePixelRatio || 1;
    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);

    // Set attribute dimensions (pixel buffer size)
    if (captureCanvas.width !== targetWidth) {
      captureCanvas.width = targetWidth;
    }
    if (captureCanvas.height !== targetHeight) {
      captureCanvas.height = targetHeight;
    }

    // Ensure CSS dimensions and positioning (same as non-reuse path)
    // This ensures consistent behavior and avoids layout issues
    captureCanvas.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${width}px;
      height: ${height}px;
      opacity: 0;
      pointer-events: none;
      z-index: -9999;
    `;

    // Ensure layoutsubtree is set (required for drawElementImage)
    if (!captureCanvas.hasAttribute("layoutsubtree")) {
      captureCanvas.setAttribute("layoutsubtree", "");
      (captureCanvas as HtmlInCanvasElement).layoutSubtree = true;
    }

    // Ensure canvas is in DOM (required for drawElementImage layout)
    if (!captureCanvas.parentNode) {
      document.body.appendChild(captureCanvas);
    }

    // Ensure container is child of canvas
    if (container.parentElement !== captureCanvas) {
      captureCanvas.appendChild(container);
    }

    // Ensure container is visible (not display: none) for layout
    // drawElementImage requires the element to be laid out
    const containerStyle = getComputedStyle(container);
    if (containerStyle.display === "none") {
      container.style.display = "block";
    }

    // Force synchronous layout ONLY on first use with this canvas
    // For batch rendering (video export), repeated layout forces are expensive
    // We only need to force layout once to ensure everything is ready
    if (!_layoutInitializedCanvases.has(captureCanvas)) {
      void captureCanvas.offsetHeight;
      void container.offsetHeight;
      void getComputedStyle(captureCanvas).opacity;
      void getComputedStyle(container).opacity;
      _layoutInitializedCanvases.add(captureCanvas);
    }
  } else {
    captureCanvas = document.createElement("canvas");
    captureCanvas.width = Math.floor(width * dpr);
    captureCanvas.height = Math.floor(height * dpr);

    // Enable HTML-in-Canvas mode via layoutsubtree attribute/property
    captureCanvas.setAttribute("layoutsubtree", "");
    (captureCanvas as HtmlInCanvasElement).layoutSubtree = true;

    captureCanvas.appendChild(container);

    captureCanvas.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${width}px;
      height: ${height}px;
      opacity: 0;
      pointer-events: none;
      z-index: -9999;
    `;
    document.body.appendChild(captureCanvas);
    shouldCleanup = true;
  }

  const t1 = performance.now();
  defaultProfiler.addTime("setup", t1 - t0);

  try {
    // Force style calculation to ensure CSS is computed before capture
    // This ensures both canvas and container are laid out (required for drawElementImage)
    void getComputedStyle(container).opacity;

    // When reusing canvas with layoutsubtree, wait for initial layout (first use only)
    // Use a WeakSet to track canvases that have been initialized
    if (
      reuseCanvas &&
      (captureCanvas as any).layoutSubtree &&
      !_layoutInitializedCanvases.has(captureCanvas)
    ) {
      await waitForFrame();
      _layoutInitializedCanvases.add(captureCanvas);

      // Canvas may have been detached during async wait (e.g., test cleanup)
      if (!captureCanvas.parentNode) {
        return captureCanvas;
      }
    }

    const ctx = captureCanvas.getContext("2d") as HtmlInCanvasContext;
    ctx.drawElementImage(container, 0, 0);
  } finally {
    // Only clean up if we created the canvas
    if (shouldCleanup && captureCanvas.parentNode) {
      captureCanvas.parentNode.removeChild(captureCanvas);
    }
  }

  const t2 = performance.now();
  defaultProfiler.addTime("draw", t2 - t1);

  // If DPR is 1, no downsampling needed - return as-is
  if (dpr === 1) {
    defaultProfiler.incrementRenderCount();
    return captureCanvas;
  }

  // Downsample to logical pixel dimensions to match foreignObject path output
  // This ensures consistent behavior regardless of which rendering path is used
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;

  const outputCtx = outputCanvas.getContext("2d")!;
  // Draw the DPR-scaled capture onto the 1x output canvas
  outputCtx.drawImage(
    captureCanvas,
    0,
    0,
    captureCanvas.width,
    captureCanvas.height, // source (full DPR capture)
    0,
    0,
    width,
    height, // destination (logical pixels)
  );

  const t3 = performance.now();
  defaultProfiler.addTime("downsample", t3 - t2);
  defaultProfiler.incrementRenderCount();

  return outputCanvas;
}
