import type { EFTimegroup } from "../elements/EFTimegroup.js";
import {
  buildCloneStructure,
  syncAllStyles,
  collectDocumentStyles,
} from "./renderTimegroupPreview.js";

/** Image cache for inlining external images as data URIs */
const inlineImageCache: Record<string, string> = {};

/**
 * Inline all images in a container as base64 data URIs.
 * SVG foreignObject can't load external images due to security restrictions.
 */
async function inlineImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll("img");
  for (const image of images) {
    const src = image.getAttribute("src");
    if (!src || src.startsWith("data:")) continue;

    const cached = inlineImageCache[src];
    if (cached) {
      image.setAttribute("src", cached);
      continue;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const dataUrl = await blobToDataURL(blob);
      image.setAttribute("src", dataUrl);
      inlineImageCache[src] = dataUrl;
    } catch (e) {
      console.warn("Failed to inline image:", src, e);
    }
  }
}

/**
 * Convert all canvas elements to img elements with data URIs.
 * Canvas elements don't serialize their pixel content in SVG foreignObject.
 */
function convertCanvasesToImages(container: HTMLElement): void {
  const canvases = container.querySelectorAll("canvas");
  for (const canvas of canvases) {
    try {
      // Get canvas content as data URL
      const dataUrl = canvas.toDataURL("image/png");
      
      // Create replacement img element
      const img = document.createElement("img");
      img.src = dataUrl;
      img.width = canvas.width;
      img.height = canvas.height;
      
      // Copy style attribute if present
      const style = canvas.getAttribute("style");
      if (style) img.setAttribute("style", style);
      
      // Replace canvas with img
      canvas.parentNode?.replaceChild(img, canvas);
    } catch (e) {
      // Canvas may be tainted (cross-origin content)
      console.warn("Failed to convert canvas to image:", e);
    }
  }
}

/**
 * Convert a Blob to a data URL.
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Render the clone container to an Image via SVG foreignObject.
 * Styles are already set as attributes by syncStylesForCanvas.
 */
async function renderToImage(
  container: HTMLElement,
  width: number,
  height: number,
): Promise<HTMLImageElement> {
  console.time("  renderToImage-clone");
  // Get all canvases from original BEFORE cloning (cloneNode doesn't copy canvas pixels)
  const originalCanvases = container.querySelectorAll("canvas");
  
  // Clone the container for serialization (don't modify original)
  const clone = container.cloneNode(true) as HTMLElement;
  
  // Copy canvas content from originals to clones (cloneNode creates empty canvases)
  const clonedCanvases = clone.querySelectorAll("canvas");
  for (let i = 0; i < originalCanvases.length; i++) {
    const srcCanvas = originalCanvases[i];
    const dstCanvas = clonedCanvases[i];
    if (srcCanvas && dstCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
      dstCanvas.width = srcCanvas.width;
      dstCanvas.height = srcCanvas.height;
      const ctx = dstCanvas.getContext("2d");
      if (ctx) {
        try {
          ctx.drawImage(srcCanvas, 0, 0);
        } catch (e) { /* cross-origin */ }
      }
    }
  }
  console.timeEnd("  renderToImage-clone");

  console.time("  renderToImage-inline-images");
  // Inline external images
  await inlineImages(clone);
  // Convert canvas elements to images (canvas content doesn't serialize in SVG)
  convertCanvasesToImages(clone);
  console.timeEnd("  renderToImage-inline-images");

  console.time("  renderToImage-serialize");
  // Create wrapper with XHTML namespace
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.setAttribute("style", `width:${width}px;height:${height}px;overflow:hidden;position:relative;`);
  wrapper.appendChild(clone);

  // Serialize to XHTML
  const xmlSerializer = new XMLSerializer();
  const serialized = xmlSerializer.serializeToString(wrapper);
  console.timeEnd("  renderToImage-serialize");

  // Wrap in SVG foreignObject
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">
      ${serialized}
    </foreignObject>
  </svg>`;

  console.time("  renderToImage-load");
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  
  URL.revokeObjectURL(url);
  console.timeEnd("  renderToImage-load");
  return image;
}

export interface CanvasPreviewResult {
  canvas: HTMLCanvasElement;
  /**
   * Call this to re-render the timegroup to canvas at current visual state.
   * Returns a promise that resolves when rendering is complete.
   */
  refresh: () => Promise<void>;
}

/**
 * Renders a timegroup preview to a canvas using SVG foreignObject.
 *
 * Uses the exact same clone structure and style syncing as the DOM preview,
 * then serializes to SVG foreignObject and draws to canvas.
 *
 * @param timegroup - The source timegroup to preview
 * @param scale - Scale factor (default 1, use <1 for thumbnails)
 * @returns Object with canvas and refresh function
 */
export function renderTimegroupToCanvas(
  timegroup: EFTimegroup,
  scale: number = 1,
): CanvasPreviewResult {
  const width = timegroup.offsetWidth || 1920;
  const height = timegroup.offsetHeight || 1080;

  // Create canvas at scaled size (with devicePixelRatio for sharpness)
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(width * scale * dpr);
  canvas.height = Math.floor(height * scale * dpr);
  canvas.style.width = `${Math.floor(width * scale)}px`;
  canvas.style.height = `${Math.floor(height * scale)}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2d context");
  }

  // Build clone structure ONCE using the same function as DOM preview
  const { container, pairs } = buildCloneStructure(timegroup);

  // Create a wrapper div with proper dimensions (like DOM preview)
  const previewContainer = document.createElement("div");
  previewContainer.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    position: relative;
    overflow: hidden;
    background: ${getComputedStyle(timegroup).background || "#000"};
  `;
  
  // Inject document styles so CSS rules work in SVG foreignObject
  const styleEl = document.createElement("style");
  styleEl.textContent = collectDocumentStyles();
  previewContainer.appendChild(styleEl);
  
  previewContainer.appendChild(container);

  // Initial style sync using shared function
  syncAllStyles(pairs);

  // Track if a render is in progress and last rendered time
  let rendering = false;
  let lastTimeMs = timegroup.currentTimeMs ?? 0;

  // Refresh function - syncs styles and re-renders to canvas
  const refresh = async (): Promise<void> => {
    // Skip if already rendering
    if (rendering) return;
    
    // Skip if time hasn't changed
    const currentTimeMs = timegroup.currentTimeMs ?? 0;
    if (currentTimeMs === lastTimeMs) return;
    lastTimeMs = currentTimeMs;
    
    rendering = true;

    try {
      console.time("canvas-preview-total");
      
      // Sync current visual state using shared function
      console.time("canvas-preview-sync-styles");
      syncAllStyles(pairs);
      console.timeEnd("canvas-preview-sync-styles");

      // Render to image via SVG foreignObject
      console.time("canvas-preview-render-to-image");
      const image = await renderToImage(previewContainer, width, height);
      console.timeEnd("canvas-preview-render-to-image");

      // Clear and draw to canvas
      console.time("canvas-preview-draw-to-canvas");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr * scale, dpr * scale);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
      console.timeEnd("canvas-preview-draw-to-canvas");
      
      console.timeEnd("canvas-preview-total");
    } catch (e) {
      console.error("Canvas preview render failed:", e);
    } finally {
      rendering = false;
    }
  };

  // Do initial render
  refresh();

  return { canvas, refresh };
}
