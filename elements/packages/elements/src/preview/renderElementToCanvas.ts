/**
 * Render any DOM element to canvas.
 * 
 * Low-level rendering function that renders elements as-is.
 * Supports both native (drawElementImage) and foreignObject render modes.
 * 
 * Caller is responsible for clone management and seeking.
 */

import { getEffectiveRenderMode } from "./renderers.js";
import type { RenderMode } from "./previewSettings.js";
import { RenderContext } from "./RenderContext.js";
import { serializeTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import { loadImageFromDataUri } from "./rendering/loadImage.js";
import { renderToImageNative } from "./rendering/renderToImageNative.js";
import { DEFAULT_WIDTH, DEFAULT_HEIGHT } from "./previewTypes.js";

/**
 * Options for rendering an element to canvas.
 */
export interface RenderElementOptions {
  /** Time to render at in milliseconds (used for serialization metadata) */
  timeMs: number;
  /** Scale factor for canvas encoding (default: 1.0) */
  scale?: number;
  /** Output width in pixels (defaults to element's computed width or 1920) */
  width?: number;
  /** Output height in pixels (defaults to element's computed height or 1080) */
  height?: number;
  /** Render context for canvas pixel caching */
  renderContext?: RenderContext;
  /** Override render mode (native or foreignObject) */
  renderMode?: RenderMode;
}

/**
 * Render any element to canvas.
 * 
 * This is a low-level rendering function that renders the element as-is.
 * The caller is responsible for:
 * - Creating clones if needed
 * - Seeking to the correct time
 * - Finding the correct element to render
 * 
 * Use cases:
 * - Preview: Pass prime timeline element (already at correct time)
 * - Video/thumbnails: Pass element from reused clone (already seeked)
 * - One-off capture: Create clone, seek, pass element, clean up
 * 
 * @param element - Element to render (timegroup, temporal element, or plain DOM)
 * @param options - Render options
 * @returns Canvas with rendered element
 */
export async function renderElementToCanvas(
  element: Element,
  options: RenderElementOptions
): Promise<HTMLCanvasElement> {
  return await renderElementToImage(element, options);
}

/**
 * Render an element to canvas using either native or foreignObject mode.
 */
async function renderElementToImage(
  element: Element,
  options: RenderElementOptions
): Promise<HTMLCanvasElement> {
  const { timeMs, scale = 1.0 } = options;
  
  // Get element dimensions
  const computedStyle = getComputedStyle(element);
  const width = options.width ?? (parseFloat(computedStyle.width) || DEFAULT_WIDTH);
  const height = options.height ?? (parseFloat(computedStyle.height) || DEFAULT_HEIGHT);
  
  // Create render context for caching
  const renderContext = options.renderContext ?? new RenderContext();
  const shouldDisposeContext = !options.renderContext;
  
  try {
    // Determine render mode
    const renderMode = options.renderMode ?? getEffectiveRenderMode();
    
    let image: HTMLCanvasElement | HTMLImageElement;
    
    if (renderMode === 'native') {
      // NATIVE PATH: Render element using drawElementImage
      const elementContainer = document.createElement('div');
      elementContainer.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${width}px;
        height: ${height}px;
        pointer-events: none;
        overflow: hidden;
      `;
      
      // Clone element into container
      elementContainer.appendChild(element.cloneNode(true));
      document.body.appendChild(elementContainer);
      
      try {
        image = await renderToImageNative(elementContainer, width, height, {
          skipDprScaling: true
        });
      } finally {
        elementContainer.remove();
      }
    } else {
      // FOREIGNOBJECT PATH: Direct serialization
      const dataUri = await serializeTimelineToDataUri(element, width, height, {
        renderContext,
        canvasScale: scale,
        timeMs,
      });
      
      image = await loadImageFromDataUri(dataUri);
    }
    
    // Draw to canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }
    
    ctx.drawImage(image, 0, 0, width, height);
    
    return canvas;
  } finally {
    if (shouldDisposeContext) {
      renderContext.dispose();
    }
  }
}
