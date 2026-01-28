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
import { isVisibleAtTime } from "../previewTypes.js";
import { collectDocumentStyles } from "../renderTimegroupPreview.js";

/**
 * Elements to skip entirely when serializing.
 * NOTE: SLOT is NOT skipped - it's handled specially to serialize light DOM children.
 */
const SKIP_TAGS = new Set([
  "EF-AUDIO",
  "EF-THUMBNAIL-STRIP",
  "EF-FILMSTRIP",
  "EF-TIMELINE",
  "EF-WORKBENCH",
  "SCRIPT",
  "STYLE",
  "TEMPLATE",
]);

/**
 * HTML void elements - these cannot have children and must be self-closing in XHTML.
 * Using `<br />` instead of `<br></br>`.
 */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
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
  "background", "color", "boxShadow", "filter", "backdropFilter", "clipPath",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant",
  "textAlign", "textDecoration", "textTransform",
  "letterSpacing", "wordSpacing", "whiteSpace", "textOverflow", "lineHeight",
  "verticalAlign",
  "transform", "transformOrigin", "transformStyle",
  "perspective", "perspectiveOrigin", "backfaceVisibility",
  "cursor", "pointerEvents", "userSelect", "overflow",
] as const;

/**
 * Caption child elements that should preserve display:none.
 * These use display:none for content visibility, not temporal visibility.
 */
const CAPTION_CHILD_TAGS = new Set([
  'EF-CAPTIONS-ACTIVE-WORD',
  'EF-CAPTIONS-BEFORE-ACTIVE-WORD',
  'EF-CAPTIONS-AFTER-ACTIVE-WORD',
  'EF-CAPTIONS-SEGMENT',
]);

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
 * Handles display:none → block conversion for non-caption elements
 * (temporal visibility is handled separately).
 */
function serializeComputedStyles(element: Element): string {
  const styles = getComputedStyle(element);
  const styleParts: string[] = [];
  const tagName = element.tagName;
  const isCaptionChild = CAPTION_CHILD_TAGS.has(tagName);
  
  for (const prop of SERIALIZED_STYLE_PROPERTIES) {
    const value = styles[prop as any];
    // Skip only truly empty values
    if (!value || value === '') {
      continue;
    }
    
    // Handle display property specially
    // For non-caption elements, convert display:none to block since temporal
    // visibility is handled separately, not by CSS display
    let finalValue = value;
    if (prop === 'display' && value === 'none' && !isCaptionChild) {
      finalValue = 'block';
    }
    
    // Force visibility:visible - the source container may have visibility:hidden
    // for off-screen rendering, but we want the serialized output to be visible
    if (prop === 'visibility') {
      finalValue = 'visible';
    }
    
    // Skip clipPath - clones always render without clip-path
    // (source may have clip-path: inset(100%) from proxy mode)
    if (prop === 'clipPath') {
      continue;
    }
    
    // Convert camelCase to kebab-case
    const kebab = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    styleParts.push(`${kebab}:${finalValue}`);
  }
  
  // Disable animations/transitions to prevent re-animation
  styleParts.push('animation:none', 'transition:none');
  
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
 * Check if a canvas element should preserve alpha channel.
 * EF-WAVEFORM always needs alpha, EF-IMAGE checks hasAlpha property.
 */
function shouldPreserveAlpha(sourceElement: Element): boolean {
  const tagName = sourceElement.tagName;
  if (tagName === 'EF-WAVEFORM') {
    return true;
  }
  if (tagName === 'EF-IMAGE') {
    return 'hasAlpha' in sourceElement && (sourceElement as any).hasAlpha === true;
  }
  return false;
}

/**
 * Create a snapshot copy of a canvas's current pixels.
 * This captures the pixels synchronously before any async encoding,
 * preventing race conditions where the source canvas is modified.
 */
function snapshotCanvas(
  canvas: HTMLCanvasElement,
  scale: number,
  preserveAlpha: boolean
): HTMLCanvasElement {
  const targetWidth = Math.max(1, Math.floor(canvas.width * scale));
  const targetHeight = Math.max(1, Math.floor(canvas.height * scale));
  
  const copy = document.createElement('canvas');
  copy.width = targetWidth;
  copy.height = targetHeight;
  
  if (preserveAlpha) {
    copy.dataset.preserveAlpha = 'true';
  }
  
  const ctx = copy.getContext('2d');
  if (ctx && canvas.width > 0 && canvas.height > 0) {
    // drawImage with scaling is SYNCHRONOUS - pixels are copied immediately
    ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
  }
  
  return copy;
}

/**
 * Serialize a canvas element as an <img> with base64 data URL.
 * Creates a snapshot of current pixels before async encoding to prevent race conditions.
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
  
  // Skip empty canvases
  if (width === 0 || height === 0) {
    return;
  }
  
  // Get all computed styles from source element
  const styleStr = serializeComputedStyles(sourceElement);
  
  // Override width/height with intrinsic canvas dimensions
  const styleParts = styleStr ? styleStr.split(';').filter(s => s.trim()) : [];
  styleParts.push(`width:${width}px`, `height:${height}px`, `display:block`);
  const finalStyle = styleParts.join(';');
  
  // Check if we need to preserve alpha channel
  const preserveAlpha = shouldPreserveAlpha(sourceElement);
  
  // CRITICAL: Create a snapshot of canvas pixels SYNCHRONOUSLY before any async work.
  // This prevents race conditions where concurrent renders overwrite the shared
  // shadow canvas while encoding is in progress.
  const snapshot = snapshotCanvas(canvas, options.canvasScale, preserveAlpha);
  
  // Open img tag with all styles from source element
  parts.push(`<img style="${escapeXML(finalStyle)}" src="`);
  
  // Kick off async encoding of the SNAPSHOT (not the live canvas)
  const promiseIndex = parts.length;
  const sourceMap = new WeakMap<HTMLCanvasElement, Element>();
  sourceMap.set(snapshot, sourceElement);
  
  // Snapshot is already scaled, so encode at 1.0 scale
  const encodePromise = encodeCanvasesInParallel([snapshot], {
    scale: 1.0,
    renderContext: options.renderContext,
    sourceMap,
  }).then(results => results[0]?.dataUrl || '');
  
  parts.push(encodePromise);
  canvasJobs.push({ canvas: snapshot, sourceElement, promiseIndex });
  
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
 * Serialize slotted light DOM children of a host element.
 */
function serializeSlottedContent(
  slotHost: Element,
  parts: Array<string | Promise<string>>,
  canvasJobs: CanvasJob[],
  options: SerializationOptions,
  parentIsSVG: boolean
): void {
  for (const slottedChild of slotHost.childNodes) {
    if (slottedChild.nodeType === Node.TEXT_NODE) {
      const text = slottedChild.textContent;
      // Preserve ALL text content exactly as-is, let CSS white-space properties handle rendering
      if (text) {
        parts.push(escapeXML(text));
      }
    } else if (slottedChild.nodeType === Node.ELEMENT_NODE) {
      serializeElement(slottedChild as Element, parts, canvasJobs, options, parentIsSVG, null);
    }
  }
}

/**
 * Recursively serialize an element and its children to XML parts.
 * @param slotHost - When serializing inside shadow DOM, the custom element whose light DOM children should be serialized for slots
 */
function serializeElement(
  element: Element,
  parts: Array<string | Promise<string>>,
  canvasJobs: CanvasJob[],
  options: SerializationOptions,
  parentIsSVG = false,
  slotHost: Element | null = null
): void {
  // Skip certain elements
  if (SKIP_TAGS.has(element.tagName)) {
    return;
  }
  
  // Handle SLOT elements - serialize light DOM children of the slot host
  if (element.tagName === 'SLOT' && slotHost) {
    serializeSlottedContent(slotHost, parts, canvasJobs, options, parentIsSVG);
    return;
  }
  
  // Check temporal visibility - skip elements outside their time bounds
  // This is non-destructive (doesn't modify DOM)
  // NOTE: We do NOT check CSS visibility/display here because:
  // 1. The container may have visibility:hidden for off-screen rendering
  // 2. Temporal elements control their own visibility via time bounds
  if (!isTemporallyVisible(element, options.timeMs)) {
    return;
  }
  
  // Custom element with shadow DOM?
  const isCustom = element.tagName.includes('-');
  if (isCustom && element.shadowRoot) {
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
    
    // Serialize custom element as a div with its styles, then shadow DOM content inside
    // This preserves positioning, layout, fonts, etc. from the custom element
    const styleStr = serializeComputedStyles(element);
    parts.push(`<div`);
    
    // Copy data attributes and class from custom element
    for (const attr of element.attributes) {
      const name = attr.name.toLowerCase();
      if (name === 'class' || name.startsWith('data-')) {
        parts.push(` ${attr.name}="${escapeXML(attr.value)}"`);
      }
    }
    
    if (styleStr) {
      parts.push(` style="${escapeXML(styleStr)}"`);
    }
    parts.push('>');
    
    // Serialize shadow DOM content with this element as the slot host
    for (const child of element.shadowRoot.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        // Preserve ALL text content exactly as-is, let CSS white-space properties handle rendering
        if (text) {
          parts.push(escapeXML(text));
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // Pass this element as slotHost so nested SLOTs can access light DOM children
        serializeElement(child as Element, parts, canvasJobs, options, parentIsSVG, element);
      }
    }
    
    parts.push('</div>');
    return;
  }
  
  // Raw canvas in light DOM
  if (element instanceof HTMLCanvasElement) {
    serializeCanvas(element, element, parts, canvasJobs, options);
    return;
  }
  
  // Standard element - serialize to XHTML
  const tagName = element.tagName.toLowerCase();
  const isSVG = element instanceof SVGElement;
  const isVoid = VOID_ELEMENTS.has(tagName);
  
  // Open tag with namespace (only add xmlns for root SVG elements, not children)
  if (isSVG && !parentIsSVG) {
    // Root SVG element - needs xmlns declaration
    parts.push(`<${tagName} xmlns="http://www.w3.org/2000/svg"`);
  } else {
    parts.push(`<${tagName}`);
  }
  
  // Attributes
  serializeAttributes(element, parts);
  
  // Computed styles as inline style attribute
  const styleStr = serializeComputedStyles(element);
  if (styleStr) {
    parts.push(` style="${escapeXML(styleStr)}"`);
  }
  
  // Void elements: self-close with /> (XHTML requirement)
  if (isVoid) {
    parts.push(' />');
    return;
  }
  
  parts.push('>');
  
  // Children (shadow or light)
  const children = element.shadowRoot?.childNodes || element.childNodes;
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;
      // Preserve ALL text content exactly as-is, let CSS white-space properties handle rendering
      if (text) {
        parts.push(escapeXML(text));
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      // Preserve slotHost when recursing into standard elements inside shadow DOM
      serializeElement(child as Element, parts, canvasJobs, options, isSVG, slotHost);
    }
  }
  
  // Close tag
  parts.push(`</${tagName}>`);
}

/**
 * Check if an element is temporally visible at the given time.
 * Returns false if the element or any ancestor is outside its temporal bounds.
 */
function isTemporallyVisible(element: Element, timeMs: number): boolean {
  // Check this element's temporal bounds
  if (!isVisibleAtTime(element, timeMs)) {
    return false;
  }
  return true;
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
  // Note: Temporal visibility is checked non-destructively during serialization
  // We do NOT modify the source DOM - this allows serializing the main timeline safely
  
  const parts: Array<string | Promise<string>> = [];
  const canvasJobs: CanvasJob[] = [];
  
  // Collect document styles for proper CSS cascade
  const documentStyles = collectDocumentStyles();
  
  // Open wrapper div with embedded styles
  parts.push(
    `<div xmlns="http://www.w3.org/1999/xhtml" ` +
    `style="width:${width}px;height:${height}px;overflow:hidden;position:relative;">`
  );
  
  // Inject document styles (CSS content is wrapped in CDATA to avoid XML escaping issues)
  if (documentStyles) {
    parts.push(`<style type="text/css"><![CDATA[${documentStyles}]]></style>`);
  }
  
  // Recursively serialize timeline
  serializeElement(timeline, parts, canvasJobs, options);
  
  // Close wrapper
  parts.push('</div>');
  
  // Wait for all canvas encodings to complete
  const resolvedParts = await Promise.all(parts);
  
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
