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
    // Only skip truly empty values - keep 'none', 'auto', 'normal' as they may be important defaults
    if (value && value !== '' && value !== 'initial' && value !== 'inherit') {
      // Convert camelCase to kebab-case
      const kebab = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      styleParts.push(`${kebab}:${value}`);
    }
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
  const styles = getComputedStyle(sourceElement);
  
  // Use intrinsic canvas dimensions, not computed styles (which may be zoom-affected)
  const width = canvas.width;
  const height = canvas.height;
  
  // Open img tag with positioning/transform styles from source element
  parts.push(`<img style="width:${width}px;height:${height}px;position:${styles.position};left:${styles.left};top:${styles.top};transform:${styles.transform};opacity:${styles.opacity};display:block" src="`);
  
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
    console.log(`[serializeElement] Skipping ${element.tagName} (in SKIP_TAGS)`);
    return;
  }
  
  // Check visibility via computed styles (timegroup sets display:none on hidden elements)
  if (element instanceof HTMLElement) {
    const styles = getComputedStyle(element);
    const isHidden = styles.display === 'none' || styles.visibility === 'hidden';
    console.log(`[serializeElement] ${element.tagName}: display=${styles.display}, visibility=${styles.visibility}, position=${styles.position}, left=${styles.left}, top=${styles.top}`);
    if (isHidden) {
      console.log(`  → Skipping (hidden)`);
      return;
    }
  }
  
  console.log(`  → Processing (isCustom=${element.tagName.includes('-')}, hasShadow=${!!(element as any).shadowRoot})`);
  
  // Custom element with shadow DOM?
  const isCustom = element.tagName.includes('-');
  if (isCustom && element.shadowRoot) {
    const shadowCanvas = element.shadowRoot.querySelector('canvas');
    if (shadowCanvas) {
      // Replace custom element with its shadow canvas
      const styles = getComputedStyle(element);
      console.log(`[serializeElement] → ${element.tagName} has shadow canvas, serializing (position=${styles.position}, display=${styles.display})`);
      serializeCanvas(element, shadowCanvas, parts, canvasJobs, options);
      return;
    }
    
    const shadowImg = element.shadowRoot.querySelector('img');
    if (shadowImg?.complete && shadowImg.naturalWidth > 0) {
      // Convert shadow img to canvas
      const styles = getComputedStyle(element);
      console.log(`[serializeElement] → ${element.tagName} has shadow img, serializing (position=${styles.position}, display=${styles.display})`);
      serializeImageAsCanvas(element, shadowImg, parts, canvasJobs, options);
      return;
    }
    
    // No special shadow content - serialize light DOM children (flatten)
    // Note: We serialize element.childNodes (light DOM), NOT shadowRoot.childNodes,
    // because the light DOM children are the actual content (projected through <slot>)
    console.log(`[serializeElement] → ${element.tagName} has no special shadow content, serializing ${element.childNodes.length} light DOM children`);
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) {
          parts.push(escapeXML(text));
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        serializeElement(child as Element, parts, canvasJobs, options, parentIsSVG);
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
export async function serializeTimelineToXHTML(
  timeline: Element,
  width: number,
  height: number,
  options: SerializationOptions
): Promise<string> {
  console.log(`\n[serializeTimelineToXHTML] ===== Starting serialization =====`);
  console.log(`  Timeline: ${timeline.tagName}, ${width}x${height}`);
  console.log(`  Current time: ${options.timeMs}ms`);
  console.log(`  Timeline currentTime: ${(timeline as any).currentTime}ms`);
  
  // Apply temporal visibility before serialization
  const hiddenCount = applyTemporalVisibility(timeline, options.timeMs);
  console.log(`  Applied temporal visibility: ${hiddenCount} elements hidden`);
  
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
  
  console.log(`[serializeTimelineToXHTML] Built ${parts.length} parts, ${canvasJobs.length} canvas jobs`);
  
  // Wait for all canvas encodings to complete
  const resolvedParts = await Promise.all(parts);
  
  // Check for any unresolved promises or [object Promise] strings
  const hasUnresolved = resolvedParts.some(part => 
    typeof part !== 'string' || part.includes('[object Promise]')
  );
  if (hasUnresolved) {
    console.error('[serializeTimelineToXHTML] ERROR: Unresolved promises detected!');
    resolvedParts.forEach((part, i) => {
      if (typeof part !== 'string' || part.includes('[object Promise]')) {
        console.error(`  Part ${i}: ${typeof part} = ${String(part).substring(0, 100)}`);
      }
    });
  }
  
  // Join into final XHTML string
  const result = resolvedParts.join('');
  console.log(`[serializeTimelineToXHTML] Final XHTML length: ${result.length} chars`);
  
  // Validate basic XML structure
  const openTags = (result.match(/<[a-z]/gi) || []).length;
  const closeTags = (result.match(/<\//gi) || []).length;
  console.log(`[serializeTimelineToXHTML] XML validation: ${openTags} open tags, ${closeTags} close tags`);
  
  // Log sanitized XML (replace base64 data with placeholders for inspection)
  const sanitized = result.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, (match) => {
    const mimeType = match.match(/data:image\/([^;]+)/)?.[1] || 'unknown';
    const length = match.length;
    return `data:image/${mimeType};base64,[${length} chars]`;
  });
  console.log(`\n[serializeTimelineToXHTML] Sanitized XHTML (for inspection):\n${sanitized}\n`);
  
  return result;
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
