/**
 * Render any DOM element to canvas with timeline awareness.
 * 
 * Supports rendering:
 * - Timegroups (timeline-aware elements)
 * - Temporal elements (elements inside timegroups)
 * - Plain DOM elements (static rendering)
 * 
 * Automatically detects timeline context and handles cloning/seeking when needed.
 */

import { EFTimegroup } from "../elements/EFTimegroup.js";
import { getEffectiveRenderMode } from "./renderers.js";
import type { RenderMode } from "./previewSettings.js";
import { RenderContext } from "./RenderContext.js";
import { serializeTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import { loadImageFromDataUri } from "./rendering/loadImage.js";
import { renderToImageNative } from "./rendering/renderToImageNative.js";
import { findCorrespondingElement } from "./elementIdentity.js";
import { DEFAULT_WIDTH, DEFAULT_HEIGHT } from "./previewTypes.js";

/**
 * Options for rendering an element to canvas.
 */
export interface RenderElementOptions {
  /** Time to render at in milliseconds (required for timeline-aware elements) */
  timeMs: number;
  /** Scale factor for canvas encoding (default: 1.0) */
  scale?: number;
  /** Output width in pixels (defaults to element's computed width or 1920) */
  width?: number;
  /** Output height in pixels (defaults to element's computed height or 1080) */
  height?: number;
  /** Root timegroup (auto-detected if not provided) */
  rootTimegroup?: EFTimegroup;
  /** Render context for canvas pixel caching */
  renderContext?: RenderContext;
  /** Override render mode (native or foreignObject) */
  renderMode?: RenderMode;
}

/**
 * Find root timegroup for an element (if any).
 * Walks up the DOM tree to find the outermost timegroup.
 * 
 * @param element - Element to find root timegroup for
 * @returns Root timegroup or undefined if element is not timeline-aware
 */
export function findRootTimegroup(element: Element): EFTimegroup | undefined {
  let current: Element | null = element;
  let lastTimegroup: EFTimegroup | undefined;
  
  while (current) {
    if (current instanceof EFTimegroup) {
      lastTimegroup = current as EFTimegroup;
    }
    current = current.parentElement;
  }
  
  return lastTimegroup;
}

/**
 * Check if element is timeline-aware (inside a timegroup).
 * 
 * @param element - Element to check
 * @returns true if element is inside a timegroup
 */
export function isTimelineAware(element: Element): boolean {
  return findRootTimegroup(element) !== undefined;
}

/**
 * Render any element to canvas with timeline awareness.
 * 
 * TIMELINE-AWARE PATH:
 * - Detects if element is inside a timegroup
 * - Creates render clone of root timegroup
 * - Seeks clone to target time
 * - Finds corresponding element in clone
 * - Renders element subtree to canvas
 * 
 * STATIC PATH:
 * - Element is not timeline-aware
 * - Renders element directly to canvas
 * 
 * @param element - Element to render (timegroup, temporal element, or plain DOM)
 * @param options - Render options
 * @returns Canvas with rendered element
 */
export async function renderElementToCanvas(
  element: Element,
  options: RenderElementOptions
): Promise<HTMLCanvasElement> {
  const root = options.rootTimegroup ?? findRootTimegroup(element);
  let elementToRender = element;
  let cleanup: (() => void) | undefined;
  
  // Timeline-aware path: create clone, seek, and find element
  if (root) {
    const { timeMs } = options;
    const { clone: renderClone, cleanup: cleanupClone } = await root.createRenderClone();
    cleanup = cleanupClone;
    
    try {
      // Seek clone to target time
      await renderClone.seekForRender(timeMs);
      
      // Find corresponding element in clone
      elementToRender = findCorrespondingElement(renderClone, element);
    } catch (error) {
      cleanup();
      throw error;
    }
  }
  
  // Render the element (either cloned or original)
  try {
    return await renderElementToImage(elementToRender, options);
  } finally {
    cleanup?.();
  }
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
