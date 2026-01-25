/**
 * SVG foreignObject rendering path with serialization.
 */

import type { SerializeToSvgOptions, SerializationResult, CanvasRestoreInfo } from "./types.js";
import { encodeBase64Fast } from "./svgSerializer.js";
import { inlineImages } from "./inlineImages.js";
import { encodeCanvasesInParallel } from "../encoding/canvasEncoder.js";
import { defaultProfiler } from "../RenderProfiler.js";
import { logger } from "../logger.js";

// Reusable instances for better performance (avoid creating new instances every frame)
let _xmlSerializer: XMLSerializer | null = null;
let _textEncoder: TextEncoder | null = null;
let _wrapperElement: HTMLDivElement | null = null;

// Pre-computed SVG constants
const SVG_PREFIX = '<svg xmlns="http://www.w3.org/2000/svg" width="';
const SVG_HEIGHT_PREFIX = '" height="';
const SVG_MIDDLE = '"><foreignObject width="100%" height="100%">';
const SVG_SUFFIX = '</foreignObject></svg>';
const DATA_URI_PREFIX = 'data:image/svg+xml;base64,';

// Shared style string to reduce allocations
const WRAPPER_STYLE_BASE = "overflow:hidden;position:relative;";

/**
 * Common SVG foreignObject serialization pipeline.
 * Handles canvas encoding, serialization, and base64 encoding.
 * 
 * @param container - The HTML element to serialize
 * @param width - Output width
 * @param height - Output height
 * @param options - Serialization options
 * @returns Serialization result with data URI and restore function
 */
export async function serializeToSvgDataUri(
  container: HTMLElement,
  width: number,
  height: number,
  options: SerializeToSvgOptions = {},
): Promise<SerializationResult> {
  const { canvasScale = 1, inlineImages: shouldInlineImages = false, logEarlyRenders = false } = options;
  
  // Store info for restoration (only used if modifying in-place)
  const canvasRestoreInfo: CanvasRestoreInfo[] = [];
  
  // Phase 1: Encode canvases to data URLs (parallel)
  const canvasStart = performance.now();
  const canvases = Array.from(container.querySelectorAll("canvas"));
  const encodedResults = await encodeCanvasesInParallel(canvases, { scale: canvasScale });
  
  // Replace canvases with images
  for (const { canvas, dataUrl } of encodedResults) {
    try {
      const img = document.createElement("img");
      img.src = dataUrl;
      img.width = canvas.width;
      img.height = canvas.height;
      const style = canvas.getAttribute("style");
      if (style) img.setAttribute("style", style);
      
      const parent = canvas.parentNode;
      if (parent) {
        const nextSibling = canvas.nextSibling;
        parent.replaceChild(img, canvas);
        canvasRestoreInfo.push({ canvas, parent, nextSibling, img });
      }
    } catch {
      // Cross-origin canvas - leave as-is
    }
  }
  defaultProfiler.addTime("canvasEncode", performance.now() - canvasStart);
  
  // Phase 2: Inline external images (if requested)
  if (shouldInlineImages) {
    const inlineStart = performance.now();
    await inlineImages(container);
    defaultProfiler.addTime("inline", performance.now() - inlineStart);
  }
  
  // Phase 3: Serialize to XHTML
  const serializeStart = performance.now();
  
  // Create fresh wrapper element each time to avoid stale DOM references
  _wrapperElement = document.createElement("div");
  _wrapperElement.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  _wrapperElement.setAttribute("style", `width:${width}px;height:${height}px;${WRAPPER_STYLE_BASE}`);
  _wrapperElement.appendChild(container);
  
  if (!_xmlSerializer) {
    _xmlSerializer = new XMLSerializer();
  }
  
  // PERFORMANCE OPTIMIZATION: Remove hidden elements before serialization
  // Hidden elements (display:none) are still serialized by XMLSerializer, adding overhead.
  // In sequence mode, inactive scenes remain in DOM but are hidden - we need to physically
  // remove them before serialization, then restore after.
  const elementsBeforeRemoval = _wrapperElement!.querySelectorAll('*').length;
  
  const hiddenElements: Array<{ 
    element: HTMLElement; 
    parent: Node; 
    nextSibling: Node | null;
  }> = [];

  // Find all hidden ef-timegroup elements (scenes in sequence mode)
  const timegroups = _wrapperElement!.querySelectorAll('ef-timegroup');
  for (const child of timegroups) {
    if (child instanceof HTMLElement) {
      const computedStyle = getComputedStyle(child);
      if (computedStyle.display === 'none') {
        // Only remove if it has a parent (safety check)
        if (child.parentNode) {
          hiddenElements.push({
            element: child,
            parent: child.parentNode,
            nextSibling: child.nextSibling
          });
          child.parentNode.removeChild(child);
        }
      }
    }
  }

  // Also remove any other hidden elements with display:none (not just timegroups)
  const allHidden = _wrapperElement!.querySelectorAll('[style*="display: none"], [style*="display:none"]');
  for (const el of allHidden) {
    if (el instanceof HTMLElement && el.parentNode && getComputedStyle(el).display === 'none') {
      // Skip if already removed (was a child of a removed timegroup)
      if (el.parentNode) {
        hiddenElements.push({
          element: el,
          parent: el.parentNode,
          nextSibling: el.nextSibling
        });
        el.parentNode.removeChild(el);
      }
    }
  }

  const elementsAfterRemoval = _wrapperElement!.querySelectorAll('*').length;
  const hiddenCount = hiddenElements.length;

  // Now serialize (only visible elements!)
  const serialized = _xmlSerializer.serializeToString(_wrapperElement);

  // Restore all hidden elements in reverse order (to maintain correct tree structure)
  for (let i = hiddenElements.length - 1; i >= 0; i--) {
    const { element, parent, nextSibling } = hiddenElements[i]!;
    // Verify parent still exists (DOM may have changed)
    if (parent && parent.ownerDocument) {
      if (nextSibling && nextSibling.parentNode === parent) {
        parent.insertBefore(element, nextSibling);
      } else {
        parent.appendChild(element);
      }
    }
  }

  const elementsAfterRestore = _wrapperElement!.querySelectorAll('*').length;

  // Log (only occasionally to avoid spam)
  if (logEarlyRenders && Math.random() < 0.1) { // 10% of frames
    logger.debug(`[serializeToSvgDataUri] elements: before=${elementsBeforeRemoval}, after removal=${elementsAfterRemoval}, hidden=${hiddenCount}, after restore=${elementsAfterRestore}`);
  }

  defaultProfiler.addTime("serialize", performance.now() - serializeStart);
  
  // Prepare restore function (removes container from wrapper, restores canvases)
  const restore = (): void => {
    const restoreStart = performance.now();
    _wrapperElement!.removeChild(container);
    
    for (const { canvas, parent, nextSibling, img } of canvasRestoreInfo) {
      if (img.parentNode === parent) {
        // Verify nextSibling is still valid (DOM may have changed between frames due to syncStyles)
        if (nextSibling && nextSibling.parentNode === parent) {
          parent.insertBefore(canvas, nextSibling);
          parent.removeChild(img);
        } else {
          // Fallback: just replace img with canvas (safer when DOM structure changed)
          parent.replaceChild(canvas, img);
        }
      }
    }
    defaultProfiler.addTime("restore", performance.now() - restoreStart);
  };
  
  // DEBUG: Log serialized HTML size for early renders
  if (logEarlyRenders && defaultProfiler.isEarlyRender(2)) {
    logger.debug(`[serializeToSvgDataUri] FO serialized: ${serialized.length} chars`);
  }
  
  // Phase 4: Create SVG and encode to base64
  const base64Start = performance.now();
  
  // Build SVG string with minimal allocations (concatenation is faster for small strings)
  const svg = SVG_PREFIX + width + SVG_HEIGHT_PREFIX + height + SVG_MIDDLE + serialized + SVG_SUFFIX;
  
  if (!_textEncoder) {
    _textEncoder = new TextEncoder();
  }
  const utf8Bytes = _textEncoder.encode(svg);
  
  let base64: string;
  if (typeof (Uint8Array.prototype as any).toBase64 === "function") {
    base64 = (utf8Bytes as any).toBase64();
  } else {
    base64 = encodeBase64Fast(utf8Bytes);
  }
  const dataUri = DATA_URI_PREFIX + base64;
  defaultProfiler.addTime("base64", performance.now() - base64Start);
  
  return { dataUri, restore };
}
