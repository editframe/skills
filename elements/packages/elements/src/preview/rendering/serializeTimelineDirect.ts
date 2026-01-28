/**
 * Direct timeline serialization - no intermediate passive structure.
 * 
 * Walks the timeline DOM once and builds XML string directly with promise parts
 * for async canvas encoding. 3x faster than DOM creation + XMLSerializer.
 * 
 * Architecture:
 * 1. Walk timeline recursively
 * 2. Build array of string parts (some are promises for canvas encoding)
 * 3. Handle shadow DOM by serializing shadow content instead of light DOM
 * 4. Await all promises
 * 5. Join parts into final XML
 */

import { encodeCanvasesInParallel } from "../encoding/canvasEncoder.js";
import type { RenderContext } from "../RenderContext.js";
import { getTemporalBounds, isVisibleAtTime } from "../previewTypes.js";

/**
 * Elements to skip entirely when serializing.
 */
const SKIP_TAGS = new Set([
  "EF-AUDIO",
  "EF-THUMBNAIL-STRIP",
  "EF-FILMSTRIP",
  "EF-TIMELINE",
  "EF-WORKBENCH",
  "SCRIPT",
  "STYLE",
  "SLOT",
  "TEMPLATE",
]);

/**
 * CSS properties to serialize as inline styles.
 * Matches SYNC_PROPERTIES from renderTimegroupPreview.ts
 */
const SERIALIZED_STYLE_PROPERTIES = [
  "display", "visibility", "opacity",
  "position", "top", "right", "bottom", "left", "zIndex",
  "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
  "flex", "flexFlow", "justifyContent", "alignItems", "alignContent", "alignSelf", "gap",
  "gridTemplate", "gridColumn", "gridRow", "gridArea",
  "margin", "padding", "boxSizing",
  "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "borderRadius",
  "background", "backgroundColor", "color", "boxShadow", "filter", "backdropFilter", "clipPath",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "textAlign", "textDecoration", "textTransform",
  "letterSpacing", "whiteSpace", "textOverflow", "lineHeight",
  "transform", "transformOrigin", "transformStyle",
  "perspective", "perspectiveOrigin", "backfaceVisibility",
  "cursor", "pointerEvents", "userSelect", "overflow", "overflowX", "overflowY",
] as const;

interface SerializationOptions {
  renderContext?: RenderContext;
  canvasScale: number;
  timeMs: number;
}

interface CanvasJob {
  canvas: HTMLCanvasElement;
  sourceElement: Element;
  promiseIndex: number;
}

/**
 * Escape special XML characters.
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}


/**
 * Serialize computed styles as inline style string.
 */
function serializeComputedStyles(element: Element): string {
  const styles = getComputedStyle(element);
  const styleParts: string[] = [];
  
  for (const prop of SERIALIZED_STYLE_PROPERTIES) {
    const value = styles[prop as any];
    // Skip empty, initial, or inherit values - we only want actual computed values
    if (!value || value === '' || value === 'initial' || value === 'inherit') {
      continue;
    }
    
    // Convert camelCase to kebab-case
    const kebab = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    styleParts.push(`${kebab}:${value}`);
  }
  
  return styleParts.join(';');
}

/**
 * Serialize element attributes (excluding style, id, xmlns, event handlers).
 */
function serializeAttributes(element: Element, parts: Array<string | Promise<string>>): void {
  for (const attr of element.attributes) {
    const name = attr.name.toLowerCase();
    // Skip: id, style, xmlns (namespace handled separately), event handlers
    if (name === 'id' || name === 'style' || name === 'xmlns' || name.startsWith('on')) {
      continue;
    }
    parts.push(` ${attr.name}="${escapeXML(attr.value)}"`);
  }
}

/**
 * Serialize a canvas element as an <img> with base64 data URL.
 * Kicks off async encoding and returns promise.
 */
function serializeCanvas(
  sourceElement: Element,
  canvas: HTMLCanvasElement,
  parts: Array<string | Promise<string>>,
  canvasJobs: CanvasJob[],
  options: SerializationOptions
): void {
  // Use intrinsic canvas dimensions, not computed styles (which may be zoom-affected)
  const width = canvas.width;
  const height = canvas.height;
  
  // Get all computed styles from source element
  const styleStr = serializeComputedStyles(sourceElement);
  
  // Override width/height with intrinsic canvas dimensions
  const styleParts = styleStr ? styleStr.split(';').filter(s => s.trim()) : [];
  styleParts.push(`width:${width}px`, `height:${height}px`, `display:block`);
  const finalStyle = styleParts.join(';');
  
  // Open img tag with all styles from source element
  parts.push(`<img style="${escapeXML(finalStyle)}" src="`);
  
  // Kick off async encoding, push promise into parts array
  const promiseIndex = parts.length;
  const sourceMap = new WeakMap<HTMLCanvasElement, Element>();
  sourceMap.set(canvas, sourceElement);
  
  const encodePromise = encodeCanvasesInParallel([canvas], {
    scale: options.canvasScale,
    renderContext: options.renderContext,
    sourceMap,
  }).then(results => results[0]?.dataUrl || '');
  
  parts.push(encodePromise);
  canvasJobs.push({ canvas, sourceElement, promiseIndex });
  
  // Close img tag
  parts.push('" />');
}

/**
 * Serialize an image element as a canvas (for shadow DOM img elements).
 */
function serializeImageAsCanvas(
  sourceElement: Element,
  img: HTMLImageElement,
  parts: Array<string | Promise<string>>,
  canvasJobs: CanvasJob[],
  options: SerializationOptions
): void {
  // Convert img to canvas for serialization
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    try {
      ctx.drawImage(img, 0, 0);
    } catch (e) {
      // Cross-origin image - skip
      return;
    }
  }
  
  serializeCanvas(sourceElement, canvas, parts, canvasJobs, options);
}

/**
 * Recursively serialize an element and its children to XML parts.
 */
function serializeElement(
  element: Element,
  parts: Array<string | Promise<string>>,
  canvasJobs: CanvasJob[],
  options: SerializationOptions,
  parentIsSVG = false
): void {
  // Skip certain elements
  if (SKIP_TAGS.has(element.tagName)) {
    return;
  }
  
  // Check visibility via computed styles (timegroup sets display:none on hidden elements)
  if (element instanceof HTMLElement) {
    const styles = getComputedStyle(element);
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      serializeStats.skippedHidden++;
      if (Math.random() < 0.05) { // Sample 5% for debugging
        console.log(`[Skipped] ${element.tagName} hidden: display=${styles.display}, visibility=${styles.visibility}`);
      }
      return;
    }
  }
  
  // Custom element with shadow DOM?
  const isCustom = element.tagName.includes('-');
  if (isCustom && element.shadowRoot) {
    serializeStats.customElements++;
    
    const shadowCanvas = element.shadowRoot.querySelector('canvas');
    if (shadowCanvas) {
      serializeCanvas(element, shadowCanvas, parts, canvasJobs, options);
      return;
    }
    
    const shadowImg = element.shadowRoot.querySelector('img');
    if (shadowImg?.complete && shadowImg.naturalWidth > 0) {
      serializeImageAsCanvas(element, shadowImg, parts, canvasJobs, options);
      return;
    }
    
    // Serialize shadow DOM content (text, elements, etc.)
    for (const child of element.shadowRoot.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) {
          serializeStats.textNodes++;
          parts.push(escapeXML(text));
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        serializeStats.shadowDOMElements++;
        // If it's a <slot>, serialize the light DOM children instead
        if ((child as Element).tagName === 'SLOT') {
          for (const slottedChild of element.childNodes) {
            if (slottedChild.nodeType === Node.TEXT_NODE) {
              const text = slottedChild.textContent?.trim();
              if (text) {
                serializeStats.textNodes++;
                parts.push(escapeXML(text));
              }
            } else if (slottedChild.nodeType === Node.ELEMENT_NODE) {
              serializeElement(slottedChild as Element, parts, canvasJobs, options, parentIsSVG);
            }
          }
        } else {
          // Regular shadow DOM element - serialize it with its styles
          if (Math.random() < 0.1) { // Sample 10%
            console.log(`[Shadow child] Recursing into ${(child as Element).tagName} (isCustom: ${(child as Element).tagName.includes('-')})`);
          }
          serializeElement(child as Element, parts, canvasJobs, options, parentIsSVG);
        }
      }
    }
    return;
  }
  
  // Raw canvas in light DOM
  if (element instanceof HTMLCanvasElement) {
    serializeCanvas(element, element, parts, canvasJobs, options);
    return;
  }
  
  // Standard element - serialize to XML
  serializeStats.standardElements++;
  if (serializeStats.standardElements <= 3) { // Log first 3
    console.log(`[Standard element] Serializing ${element.tagName}`);
  }
  const tagName = element.tagName.toLowerCase();
  const isSVG = element instanceof SVGElement;
  
  // Open tag with namespace (only add xmlns for root SVG elements, not children)
  if (isSVG && !parentIsSVG) {
    // Root SVG element - needs xmlns declaration
    parts.push(`<${tagName} xmlns="http://www.w3.org/2000/svg"`);
  } else {
    // XHTML or child SVG element - no xmlns needed
    parts.push(`<${tagName}`);
  }
  
  // Attributes
  serializeAttributes(element, parts);
  
  // Computed styles as inline style attribute
  const styleStr = serializeComputedStyles(element);
  if (styleStr) {
    parts.push(` style="${escapeXML(styleStr)}"`);
  }
  
  parts.push('>');
  
  // Children (shadow or light)
  const children = element.shadowRoot?.childNodes || element.childNodes;
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim();
      if (text) {
        serializeStats.textNodes++;
        parts.push(escapeXML(text));
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      serializeElement(child as Element, parts, canvasJobs, options, isSVG);
    }
  }
  
  // Close tag
  parts.push(`</${tagName}>`);
}

/**
 * Apply temporal visibility to timeline before serialization.
 * Walks the DOM and sets display:none on elements out of temporal bounds.
 */
function applyTemporalVisibility(element: Element, timeMs: number): number {
  let hiddenCount = 0;
  
  // Check if this element should be visible
  const isVisible = isVisibleAtTime(element, timeMs);
  
  if (!isVisible && element instanceof HTMLElement) {
    // Hide this element and skip its children
    element.style.display = 'none';
    hiddenCount++;
    return hiddenCount;
  }
  
  // Element is visible, recurse to children
  for (const child of element.children) {
    hiddenCount += applyTemporalVisibility(child, timeMs);
  }
  
  return hiddenCount;
}

/**
 * Serialize a timeline element directly to XHTML string.
 * 
 * @param timeline - The timeline element to serialize (e.g., EFTimegroup)
 * @param width - Output width
 * @param height - Output height
 * @param options - Serialization options (renderContext, canvasScale, timeMs)
 * @returns XHTML string with all canvases encoded as base64 data URLs
 */
// Stats for debugging
let serializeStats = {
  customElements: 0,
  shadowDOMElements: 0,
  standardElements: 0,
  textNodes: 0,
  skippedHidden: 0,
};

export async function serializeTimelineToXHTML(
  timeline: Element,
  width: number,
  height: number,
  options: SerializationOptions
): Promise<string> {
  // Reset stats
  serializeStats = { customElements: 0, shadowDOMElements: 0, standardElements: 0, textNodes: 0, skippedHidden: 0 };
  
  // Apply temporal visibility before serialization
  try {
    applyTemporalVisibility(timeline, options.timeMs);
  } catch (e) {
    console.error(`[serializeTimelineToXHTML] Error applying temporal visibility:`, e);
  }
  
  const parts: Array<string | Promise<string>> = [];
  const canvasJobs: CanvasJob[] = [];
  
  // Open wrapper div
  parts.push(
    `<div xmlns="http://www.w3.org/1999/xhtml" ` +
    `style="width:${width}px;height:${height}px;overflow:hidden;position:relative;">`
  );
  
  // Recursively serialize timeline
  serializeElement(timeline, parts, canvasJobs, options);
  
  // Close wrapper
  parts.push('</div>');
  
  console.log(`[Serialize Stats] Custom: ${serializeStats.customElements}, Shadow: ${serializeStats.shadowDOMElements}, Standard: ${serializeStats.standardElements}, Text: ${serializeStats.textNodes}, Hidden: ${serializeStats.skippedHidden}`);
  
  // Wait for all canvas encodings to complete
  const resolvedParts = await Promise.all(parts);
  
  // Check for any unresolved promises
  const hasUnresolved = resolvedParts.some(part => 
    typeof part !== 'string' || part.includes('[object Promise]')
  );
  if (hasUnresolved) {
    console.error('[serializeTimelineToXHTML] ERROR: Unresolved promises in serialized parts!');
  }
  
  // Join into final XHTML string
  return resolvedParts.join('');
}

/**
 * Serialize timeline to SVG foreignObject data URI (ready for rendering).
 * 
 * @param timeline - The timeline element to serialize
 * @param width - Output width
 * @param height - Output height
 * @param options - Serialization options
 * @returns SVG data URI
 */
export async function serializeTimelineToDataUri(
  timeline: Element,
  width: number,
  height: number,
  options: SerializationOptions
): Promise<string> {
  const xhtml = await serializeTimelineToXHTML(timeline, width, height, options);
  
  // Wrap in SVG foreignObject
  const svg = 
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">${xhtml}</foreignObject>` +
    `</svg>`;
  
  // Encode to base64 data URI
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}
