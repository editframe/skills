/**
 * Public rendering API facade.
 * Dispatches to native or foreignObject rendering paths based on settings.
 */

import type { RenderContext } from "../RenderContext.js";
import { captureTimelineToDataUri } from "./serializeTimelineDirect.js";
import { defaultProfiler } from "../RenderProfiler.js";

/**
 * Load an image from a data URI. Returns a Promise that resolves when loaded.
 */
export function loadImageFromDataUri(dataUri: string): Promise<HTMLImageElement> {
  const img = new Image();
  const imageLoadStart = performance.now();

  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => {
      defaultProfiler.addTime("imageLoad", performance.now() - imageLoadStart);
      resolve(img);
    };
    img.onerror = reject;
    img.src = dataUri;
  });
}

/**
 * Render a pre-built clone container to an image WITHOUT cloning it again.
 * This is the fast path for reusing clone structures across frames.
 *
 * Key difference from renderToImage:
 * - Does NOT call cloneNode (avoids expensive DOM duplication)
 * - Converts canvases to images in-place, then restores them after serialization
 * - Assumes the container already has refreshed canvas content
 *
 * @param container - Pre-built clone container with refreshed canvas content
 * @param width - Output width
 * @param height - Output height
 * @returns Promise resolving to an HTMLImageElement
 */
export async function renderToImageDirect(
  container: HTMLElement,
  width: number,
  height: number,
  options?: {
    renderContext?: RenderContext;
    sourceMap?: WeakMap<HTMLCanvasElement, Element>;
    canvasScale?: number;
  },
): Promise<HTMLImageElement> {
  defaultProfiler.incrementRenderCount();

  const dataUri = await captureTimelineToDataUri(container, width, height, {
    renderContext: options?.renderContext,
    canvasScale: options?.canvasScale ?? 1,
    timeMs: 0,
  });

  // Load as image
  const image = await loadImageFromDataUri(dataUri);

  // Log timing breakdown periodically
  defaultProfiler.shouldLogByFrameCount(100);

  return image;
}

/**
 * Prepare a frame's data URI without waiting for image load.
 * Returns the data URI asynchronously (after parallel canvas encoding and serialization) for pipelined loading.
 * The DOM is restored before this function returns.
 */
export async function prepareFrameDataUri(
  container: HTMLElement,
  width: number,
  height: number,
): Promise<string> {
  defaultProfiler.incrementRenderCount();

  return captureTimelineToDataUri(container, width, height, {
    canvasScale: 1,
    timeMs: 0,
  });
}
