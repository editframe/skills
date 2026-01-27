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
// Note: wrapper element is NOT reused - each concurrent frame needs its own wrapper
let _xmlSerializer: XMLSerializer | null = null;
let _textEncoder: TextEncoder | null = null;

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
  const { 
    canvasScale = 1, 
    inlineImages: shouldInlineImages = false, 
    logEarlyRenders = false,
    renderContext,
    sourceMap,
  } = options;
  
  // Store info for restoration (only used if modifying in-place)
  const canvasRestoreInfo: CanvasRestoreInfo[] = [];
  
  // Phase 1: Encode canvases to data URLs (parallel)
  // Filter out hidden canvases - they have display:none and won't render anyway
  const canvasStart = performance.now();
  const allCanvases = Array.from(container.querySelectorAll("canvas"));
  const visibleCanvases = allCanvases.filter(canvas => !isElementHidden(canvas));
  
  // CRITICAL FIX: Synchronously copy canvas pixels BEFORE any async work.
  // This prevents race conditions where concurrent render tasks overwrite
  // the shared clone canvases while encoding is in progress.
  // See: Hypothesis 1 - Clone Canvas Overwritten During Serialization
  const canvasSnapshots: { original: HTMLCanvasElement; copy: HTMLCanvasElement }[] = [];
  for (let i = 0; i < visibleCanvases.length; i++) {
    const canvas = visibleCanvases[i]!;
    if (canvas.width > 0 && canvas.height > 0) {
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      // Copy dataset attributes (e.g., preserveAlpha)
      if (canvas.dataset.preserveAlpha) {
        copy.dataset.preserveAlpha = canvas.dataset.preserveAlpha;
      }
      const ctx = copy.getContext("2d");
      if (ctx) {
        // drawImage is SYNCHRONOUS - pixels are copied immediately
        ctx.drawImage(canvas, 0, 0);
      }
      canvasSnapshots.push({ original: canvas, copy });
    }
  }
  
  // Encode from the snapshot copies (safe from concurrent overwrites)
  const snapshotCanvases = canvasSnapshots.map(s => s.copy);
  
  // Create a new sourceMap that maps snapshot canvases to their source elements
  // The original sourceMap maps original canvases -> source elements
  // We need snapshot canvases -> source elements for caching to work
  let snapshotSourceMap: WeakMap<HTMLCanvasElement, Element> | undefined;
  if (sourceMap) {
    snapshotSourceMap = new WeakMap();
    for (const { original, copy } of canvasSnapshots) {
      const sourceElement = sourceMap.get(original);
      if (sourceElement) {
        snapshotSourceMap.set(copy, sourceElement);
      }
    }
  }
  
  const encodedResults = await encodeCanvasesInParallel(snapshotCanvases, { 
    scale: canvasScale,
    renderContext,
    sourceMap: snapshotSourceMap,
  });
  
  // Map encoded results back to original canvases for DOM replacement
  const encodedWithOriginals = encodedResults.map(result => {
    const snapshot = canvasSnapshots.find(s => s.copy === result.canvas);
    return {
      ...result,
      canvas: snapshot?.original ?? result.canvas,
    };
  });
  
  // Replace canvases with images
  for (const { canvas, dataUrl } of encodedWithOriginals) {
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
  
  // Create fresh wrapper element for THIS frame (local variable for closure safety)
  // Multiple concurrent frames in video export each get their own wrapper
  const wrapperElement = document.createElement("div");
  wrapperElement.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapperElement.setAttribute("style", `width:${width}px;height:${height}px;${WRAPPER_STYLE_BASE}`);
  wrapperElement.appendChild(container);
  
  if (!_xmlSerializer) {
    _xmlSerializer = new XMLSerializer();
  }
  
  // NOTE: Hidden element handling is now done by the caller via removeHiddenNodesForSerialization().
  // The caller physically removes hidden nodes from the clone tree BEFORE calling this function,
  // so hidden elements are never serialized at all - not just hidden with display:none.
  //
  // Benefits of removing before serialization:
  // - Hidden canvases are not encoded (saves encoding time and memory)
  // - Hidden elements are not serialized (smaller SVG, faster serialization)
  // - Hidden images are not inlined (saves fetch and encoding)
  // - The serialized output is smaller and faster to base64 encode
  
  // Serialize to XHTML string
  const perfStart = performance.now();
  const serialized = _xmlSerializer.serializeToString(wrapperElement);
  const serializeTime = performance.now() - perfStart;
  
  // Sample 1% of frames to avoid spam
  if (Math.random() < 0.01) {
    const elementCount = wrapperElement.querySelectorAll('*').length;
    console.log(`[serialize] elements=${elementCount}, time=${serializeTime.toFixed(1)}ms, size=${(serialized.length / 1024).toFixed(1)}KB`);
  }

  defaultProfiler.addTime("serialize", performance.now() - serializeStart);
  
  // Prepare restore function (removes container from wrapper, restores canvases)
  // Must be robust against concurrent frame rendering where DOM state may change
  const restore = (): void => {
    const restoreStart = performance.now();
    
    // Guard: only remove if container is still a child of wrapper
    if (container.parentNode === wrapperElement) {
      wrapperElement.removeChild(container);
    }
    
    for (const { canvas, parent, nextSibling, img } of canvasRestoreInfo) {
      // Guard: only restore if img is still in expected position
      if (img.parentNode === parent) {
        // Use replaceChild which is atomic and safer than insertBefore + removeChild
        parent.replaceChild(canvas, img);
      } else if (canvas.parentNode !== parent) {
        // Canvas was never restored and img was moved/removed - try to restore canvas
        if (nextSibling && nextSibling.parentNode === parent) {
          parent.insertBefore(canvas, nextSibling);
        } else {
          parent.appendChild(canvas);
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
