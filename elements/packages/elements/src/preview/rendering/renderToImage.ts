/**
 * Public rendering API facade.
 * Dispatches to native or foreignObject rendering paths based on settings.
 */

import type { ForeignObjectRenderOptions } from "./types.js";
import type { RenderContext } from "../RenderContext.js";
import { renderToImageNative } from "./renderToImageNative.js";
import { serializeToSvgDataUri } from "./renderToImageForeignObject.js";
import { inlineImages } from "./inlineImages.js";
import { getEffectiveRenderMode } from "../renderers.js";
import { encodeCanvasesInParallel } from "../encoding/canvasEncoder.js";
import { defaultProfiler } from "../RenderProfiler.js";

/**
 * Check if an element or any of its ancestors has display:none.
 * Used to skip encoding hidden canvases.
 */
function isElementHidden(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (current instanceof HTMLElement && current.style.display === "none") {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

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
 * Render HTML content to an image (or canvas) for drawing.
 * 
 * Supports two rendering modes (configurable via previewSettings):
 * - "native": Chrome's experimental drawElementImage API (fastest when available)
 * - "foreignObject": SVG foreignObject serialization (fallback, works everywhere)
 * 
 * @param container - The HTML element to render
 * @param width - Target width in logical pixels
 * @param height - Target height in logical pixels
 * @param options - Rendering options
 * @returns HTMLCanvasElement when using native, HTMLImageElement when using foreignObject
 */
export async function renderToImage(
  container: HTMLElement,
  width: number,
  height: number,
  options?: ForeignObjectRenderOptions,
): Promise<HTMLImageElement | HTMLCanvasElement> {
  const renderMode = getEffectiveRenderMode();
  
  // Native HTML-in-Canvas API path (fastest, requires Chrome flag)
  if (renderMode === "native") {
    return renderToImageNative(container, width, height, options);
  }
  
  // Fallback: SVG foreignObject serialization
  // Clone the container first (don't modify original)
  // Note: cloneNode doesn't copy canvas pixels, so we encode from original canvases
  const allOriginalCanvases = Array.from(container.querySelectorAll("canvas"));
  const clone = container.cloneNode(true) as HTMLElement;
  const allClonedCanvases = Array.from(clone.querySelectorAll("canvas"));
  
  // Filter out hidden canvases - they have display:none and won't render anyway
  // Keep track of indices to match with cloned canvases
  const visibleIndices: number[] = [];
  const visibleCanvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < allOriginalCanvases.length; i++) {
    const canvas = allOriginalCanvases[i]!;
    if (!isElementHidden(canvas)) {
      visibleIndices.push(i);
      visibleCanvases.push(canvas);
    }
  }
  
  // Encode visible original canvases
  // Pass through renderContext and sourceMap for caching
  const canvasScale = options?.canvasScale ?? 1;
  const canvasStart = performance.now();
  const encodedResults = await encodeCanvasesInParallel(visibleCanvases, { 
    scale: canvasScale,
    renderContext: options?.renderContext,
    sourceMap: options?.sourceMap,
  });
  
  // Map encoded results to corresponding cloned canvases using tracked indices
  for (let j = 0; j < visibleCanvases.length; j++) {
    const srcCanvas = visibleCanvases[j]!;
    const originalIndex = visibleIndices[j]!;
    const dstCanvas = allClonedCanvases[originalIndex];
    const encoded = encodedResults.find((r) => r.canvas === srcCanvas);
    
    if (!dstCanvas || !encoded) continue;
    
    try {
      const img = document.createElement("img");
      img.src = encoded.dataUrl;
      img.width = srcCanvas.width;
      img.height = srcCanvas.height;
      const style = dstCanvas.getAttribute("style");
      if (style) img.setAttribute("style", style);
      dstCanvas.parentNode?.replaceChild(img, dstCanvas);
    } catch {
      // Cross-origin or other error - skip
    }
  }
  defaultProfiler.addTime("canvasEncode", performance.now() - canvasStart);

  // Inline external images in the clone
  const inlineStart = performance.now();
  await inlineImages(clone);
  defaultProfiler.addTime("inline", performance.now() - inlineStart);

  // Use common serialization pipeline (no restore needed since we're working on a clone)
  const { dataUri } = await serializeToSvgDataUri(clone, width, height);
  
  // Load as image
  return loadImageFromDataUri(dataUri);
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
  },
): Promise<HTMLImageElement> {
  defaultProfiler.incrementRenderCount();
  
  // Use common serialization pipeline (modifies in-place, restores after)
  const { dataUri, restore } = await serializeToSvgDataUri(container, width, height, {
    inlineImages: true,
    logEarlyRenders: true,
    renderContext: options?.renderContext,
    sourceMap: options?.sourceMap,
  });
  restore();
  
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
  
  // Use common serialization pipeline (modifies in-place, restores after)
  const { dataUri, restore } = await serializeToSvgDataUri(container, width, height);
  restore();
  
  return dataUri;
}
