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
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.setAttribute("style", `width:${width}px;height:${height}px;overflow:hidden;position:relative;`);
  wrapper.appendChild(container);
  
  if (!_xmlSerializer) {
    _xmlSerializer = new XMLSerializer();
  }
  const serialized = _xmlSerializer.serializeToString(wrapper);
  defaultProfiler.addTime("serialize", performance.now() - serializeStart);
  
  // Prepare restore function (removes container from wrapper, restores canvases)
  const restore = (): void => {
    const restoreStart = performance.now();
    wrapper.removeChild(container);
    
    for (const { canvas, parent, nextSibling, img } of canvasRestoreInfo) {
      if (img.parentNode === parent) {
        if (nextSibling) {
          parent.insertBefore(canvas, nextSibling);
          parent.removeChild(img);
        } else {
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  
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
  const dataUri = `data:image/svg+xml;base64,${base64}`;
  defaultProfiler.addTime("base64", performance.now() - base64Start);
  
  return { dataUri, restore };
}
