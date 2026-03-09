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
import { captureTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
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
 * Render any element to canvas or image.
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
 * @returns Canvas or Image (both are CanvasImageSource)
 */
export async function renderElementToCanvas(
  element: Element,
  options: RenderElementOptions,
): Promise<CanvasImageSource> {
  return await renderElementToImage(element, options);
}

/**
 * Render an element using either native or foreignObject mode.
 * Returns Canvas or Image directly without unnecessary copying.
 */
async function renderElementToImage(
  element: Element,
  options: RenderElementOptions,
): Promise<CanvasImageSource> {
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

    if (renderMode === "native") {
      // NATIVE PATH: Render element using drawElementImage
      const elementContainer = document.createElement("div");
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
        // Return canvas directly - no copy needed!
        return await renderToImageNative(elementContainer, width, height, {
          skipDprScaling: true,
        });
      } finally {
        elementContainer.remove();
      }
    } else {
      // FOREIGNOBJECT PATH: Direct serialization
      const dataUri = await captureTimelineToDataUri(element, width, height, {
        renderContext,
        canvasScale: scale,
        timeMs,
      });

      // Return image directly - no copy needed!
      return await loadImageFromDataUri(dataUri);
    }
  } finally {
    if (shouldDisposeContext) {
      renderContext.dispose();
    }
  }
}
