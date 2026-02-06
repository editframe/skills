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

/**
 * Collect document styles for shadow DOM injection.
 */
function collectDocumentStyles(): string {
  const rules: string[] = [];
  try {
    for (const sheet of document.styleSheets) {
      try {
        if (sheet.cssRules) {
          for (const rule of sheet.cssRules) {
            rules.push(rule.cssText);
          }
        }
      } catch {}
    }
  } catch {}
  return rules.join("\n");
}

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
 */
const SERIALIZED_STYLE_PROPERTIES = [
  "display", "visibility", "opacity",
  "position", "top", "right", "bottom", "left", "zIndex",
  "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
  "flexGrow", "flexShrink", "flexBasis", "flexDirection", "flexWrap",
  "justifyContent", "alignItems", "alignContent", "alignSelf", "gap",
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
  "cursor", "pointerEvents", "userSelect", "overflow", "objectFit", "objectPosition",
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
    let finalValue = value;
    if (prop === 'display') {
      // Fix for cloned Lit elements: shadow DOM stylesheets aren't adopted properly
      // so computed display is wrong. Use the correct values based on element type.
      if (tagName === 'EF-TEXT') {
        // EFText: inline-flex (or flex for split="line")
        finalValue = element.getAttribute('split') === 'line' ? 'flex' : 'inline-flex';
      } else if (tagName === 'EF-TEXT-SEGMENT') {
        // EFTextSegment: inline-block (or block for data-line-segment)
        finalValue = element.hasAttribute('data-line-segment') ? 'block' : 'inline-block';
      }
      // For non-caption elements, convert display:none to block since temporal
      // visibility is handled separately, not by CSS display
      else if (value === 'none' && !isCaptionChild) {
        finalValue = 'block';
      }
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
 * Raw canvas elements must preserve alpha - we don't know what they contain.
 */
function shouldPreserveAlpha(sourceElement: Element): boolean {
  const tagName = sourceElement.tagName;
  if (tagName === 'EF-WAVEFORM') {
    return true;
  }
  if (tagName === 'EF-IMAGE') {
    return 'hasAlpha' in sourceElement && (sourceElement as any).hasAlpha === true;
  }
  // Raw canvas elements must preserve alpha
  if (sourceElement instanceof HTMLCanvasElement) {
    return true;
  }
  return false;
}

/**
 * Find the capture proxy canvas for an offscreen-rendered canvas.
 * When a canvas is transferred to offscreen via transferControlToOffscreen(),
 * the main thread can no longer read pixels from it. OffscreenCompositionCanvas
 * creates a hidden capture canvas (marked with data-offscreen-capture) that
 * receives ImageBitmap frames from the worker.
 */
function findCaptureProxy(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const container = canvas.parentElement;
  if (!container) return null;
  return container.querySelector('canvas[data-offscreen-capture="true"]');
}

/**
 * Read pixels directly from a WebGL canvas's drawing buffer via gl.readPixels().
 *
 * drawImage(webglCanvas) reads from the compositor's "presented" surface, which
 * is only refreshed during requestAnimationFrame / compositing cycles. In hidden
 * browser tabs, compositing is suspended, so drawImage returns stale pixels even
 * though gl.render() produced new content in the drawing buffer.
 *
 * readPixels() reads from the drawing buffer directly, bypassing the compositor.
 *
 * Returns null for non-WebGL canvases (getContext returns null when a different
 * context type is already active).
 */
function readWebGLPixels(canvas: HTMLCanvasElement): Uint8ClampedArray | null {
  const gl = (
    canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  ) as WebGLRenderingContext | null;
  if (!gl) return null;

  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return null;

  // Ensure we read from the drawing buffer, not a leftover FBO
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  // readPixels returns rows bottom-to-top; flip to top-to-bottom for ImageData
  const rowSize = width * 4;
  const halfHeight = Math.floor(height / 2);
  const temp = new Uint8Array(rowSize);
  for (let y = 0; y < halfHeight; y++) {
    const topOffset = y * rowSize;
    const bottomOffset = (height - 1 - y) * rowSize;
    temp.set(pixels.subarray(topOffset, topOffset + rowSize));
    pixels.set(pixels.subarray(bottomOffset, bottomOffset + rowSize), topOffset);
    pixels.set(temp, bottomOffset);
  }

  return new Uint8ClampedArray(pixels.buffer);
}

/**
 * Create a snapshot copy of a canvas's current pixels.
 * This captures the pixels synchronously before any async encoding,
 * preventing race conditions where the source canvas is modified.
 * 
 * For WebGL canvases, uses gl.readPixels() to bypass the compositor's
 * presentation layer (which is suspended in hidden browser tabs).
 * 
 * For offscreen-rendered canvases, this automatically uses the capture proxy
 * canvas instead of the transferred display canvas.
 */
function snapshotCanvas(
  canvas: HTMLCanvasElement,
  scale: number,
  preserveAlpha: boolean
): HTMLCanvasElement {
  // If this canvas was transferred to offscreen, use its capture proxy
  const captureProxy = findCaptureProxy(canvas);
  const sourceCanvas = captureProxy ?? canvas;
  
  const targetWidth = Math.max(1, Math.floor(sourceCanvas.width * scale));
  const targetHeight = Math.max(1, Math.floor(sourceCanvas.height * scale));
  
  const copy = document.createElement('canvas');
  copy.width = targetWidth;
  copy.height = targetHeight;
  
  if (preserveAlpha) {
    copy.dataset.preserveAlpha = 'true';
  }
  
  const ctx = copy.getContext('2d');
  if (ctx && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
    // Try reading directly from WebGL drawing buffer (bypasses compositor)
    const glPixels = readWebGLPixels(sourceCanvas);
    if (glPixels) {
      const srcW = sourceCanvas.width;
      const srcH = sourceCanvas.height;
      const imageData = new ImageData(glPixels, srcW, srcH);

      if (targetWidth === srcW && targetHeight === srcH) {
        ctx.putImageData(imageData, 0, 0);
      } else {
        // putImageData doesn't scale — bounce through a temp canvas
        const temp = document.createElement('canvas');
        temp.width = srcW;
        temp.height = srcH;
        temp.getContext('2d')!.putImageData(imageData, 0, 0);
        ctx.drawImage(temp, 0, 0, targetWidth, targetHeight);
      }
    } else {
      // Non-WebGL canvas: drawImage is synchronous and correct
      ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    }
  }
  
  return copy;
}

/**
 * Serialize a canvas element as an <img> with base64 data URL.
 * Creates a snapshot of current pixels before async encoding to prevent race conditions.
 * 
 * OPTIMIZATION: Calculate optimal encoding resolution based on:
 * 1. CSS display size (how big it actually appears)
 * 2. Video export scale (output resolution multiplier)
 * 3. Quality multiplier (for sharpness, default 1.5x)
 */
function serializeCanvas(
  sourceElement: Element,
  canvas: HTMLCanvasElement,
  parts: Array<string | Promise<string>>,
  canvasJobs: CanvasJob[],
  options: SerializationOptions
): void {
  // If this canvas was transferred to offscreen, use its capture proxy
  const captureProxy = findCaptureProxy(canvas);
  const sourceCanvas = captureProxy ?? canvas;
  
  // Use intrinsic canvas dimensions, not computed styles (which may be zoom-affected)
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  
  // Skip empty canvases
  if (width === 0 || height === 0) {
    return;
  }
  
  // Get all computed styles from source element
  const styleStr = serializeComputedStyles(sourceElement);
  
  // Get computed dimensions from source element (respects CSS like w-[420px])
  const computedStyle = getComputedStyle(sourceElement);
  const computedWidth = computedStyle.width;
  const computedHeight = computedStyle.height;
  
  // Use CSS object-fit and object-position to let the browser handle aspect ratio and centering
  // Set img dimensions to host element size, then use object-fit: contain to scale the image data
  const styleParts = styleStr ? styleStr.split(';').filter(s => s.trim()) : [];
  
  // Remove width/height/object-fit/object-position from computed styles (we'll set them explicitly)
  const filteredParts = styleParts.filter(s => {
    const trimmed = s.trim();
    return !trimmed.startsWith('width:') && 
           !trimmed.startsWith('height:') &&
           !trimmed.startsWith('object-fit:') &&
           !trimmed.startsWith('object-position:');
  });
  
  // Use host element dimensions if available, otherwise fall back to canvas natural dimensions
  const displayWidth = computedWidth || `${width}px`;
  const displayHeight = computedHeight || `${height}px`;
  
  // Set dimensions to host size and let object-fit: contain handle the aspect ratio
  filteredParts.push(`width:${displayWidth}`);
  filteredParts.push(`height:${displayHeight}`);
  filteredParts.push(`object-fit:contain`);
  filteredParts.push(`object-position:center`);
  filteredParts.push(`display:block`);
  
  const finalStyle = filteredParts.join(';');
  
  // Check if we need to preserve alpha channel
  const preserveAlpha = shouldPreserveAlpha(sourceElement);
  
  // CRITICAL: Calculate optimal encoding scale BEFORE creating snapshot.
  // This prevents encoding at full resolution when CSS display size is much smaller.
  let optimalScale = options.canvasScale; // Start with video export scale
  const qualityMultiplier = 1.5; // Encode at 1.5x display size for quality
  
  try {
    const cssWidth = parseFloat(computedWidth) || sourceCanvas.width;
    const cssHeight = parseFloat(computedHeight) || sourceCanvas.height;
    
    // Calculate how much smaller the display is vs natural size
    const displayScaleX = cssWidth / sourceCanvas.width;
    const displayScaleY = cssHeight / sourceCanvas.height;
    const displayScale = Math.min(displayScaleX, displayScaleY);
    
    // Combine display scale, video scale, and quality multiplier
    // Clamp to 1.0 max (never upscale beyond natural resolution)
    optimalScale = Math.min(1.0, displayScale * options.canvasScale * qualityMultiplier);
  } catch (e) {
    // Fallback to just video scale if we can't get computed style
    console.warn(`[serializeCanvas] Failed to get computed style for ${sourceElement.tagName}:`, e);
  }
  
  // CRITICAL: Create a snapshot of canvas pixels SYNCHRONOUSLY before any async work.
  // This prevents race conditions where concurrent renders overwrite the shared
  // shadow canvas while encoding is in progress.
  // Note: snapshotCanvas already handles finding the capture proxy internally
  const snapshot = snapshotCanvas(canvas, optimalScale, preserveAlpha);
  
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
      if (text && text.length > 0) {
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
    
    
    // Serialize custom element with its styles, then shadow DOM content inside
    // Use span for inline/inline-block/inline-flex elements to preserve inline behavior
    const computedDisplay = getComputedStyle(element).display;
    const isInline = computedDisplay === 'inline' || computedDisplay === 'inline-block' || computedDisplay === 'inline-flex';
    const containerTag = isInline ? 'span' : 'div';
    
    let styleStr = serializeComputedStyles(element);
    
    
    parts.push(`<${containerTag}`);
    
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
        if (text && text.length > 0) {
          parts.push(escapeXML(text));
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // Pass this element as slotHost so nested SLOTs can access light DOM children
        serializeElement(child as Element, parts, canvasJobs, options, parentIsSVG, element);
      }
    }
    
    parts.push(`</${containerTag}>`);
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
      if (text && text.length > 0) {
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
 * Serialize any element directly to XHTML string.
 * 
 * @param element - The element to serialize (timegroup, temporal element, or plain DOM)
 * @param width - Output width
 * @param height - Output height
 * @param options - Serialization options (renderContext, canvasScale, timeMs)
 * @returns XHTML string with all canvases encoded as base64 data URLs
 */
export async function serializeElementToXHTML(
  element: Element,
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
  
  // Apply scale transform if canvasScale is specified and < 1
  // This scales the content while keeping the container at the target dimensions
  const needsScaling = options.canvasScale < 1;
  if (needsScaling) {
    const originalWidth = Math.floor(width / options.canvasScale);
    const originalHeight = Math.floor(height / options.canvasScale);
    parts.push(
      `<div style="transform:scale(${options.canvasScale});transform-origin:0 0;` +
      `width:${originalWidth}px;height:${originalHeight}px;">`
    );
  }
  // Recursively serialize element
  serializeElement(element, parts, canvasJobs, options);
  
  // Close scaling wrapper if applied
  if (needsScaling) {
    parts.push('</div>');
  }
  
  // Close wrapper
  parts.push('</div>');

  // Wait for all canvas encodings to complete
  const resolvedParts = await Promise.all(parts);
  
  // Join into final XHTML string
  const xhtml = resolvedParts.join('');
  
  return xhtml;
}

/**
 * Serialize element to SVG foreignObject data URI (ready for rendering).
 * 
 * @param element - The element to serialize
 * @param width - Output width
 * @param height - Output height
 * @param options - Serialization options
 * @returns SVG data URI
 */
export async function serializeTimelineToDataUri(
  element: Element,
  width: number,
  height: number,
  options: SerializationOptions
): Promise<string> {
  // Apply canvas scale to output dimensions
  const scaledWidth = Math.floor(width * options.canvasScale);
  const scaledHeight = Math.floor(height * options.canvasScale);
  
  
  const xhtml = await serializeElementToXHTML(element, scaledWidth, scaledHeight, options);
  
  // Wrap in SVG foreignObject
  // Use explicit pixel dimensions for foreignObject to match SVG viewport exactly
  const svg = 
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scaledWidth}" height="${scaledHeight}">` +
    `<foreignObject x="0" y="0" width="${scaledWidth}" height="${scaledHeight}">${xhtml}</foreignObject>` +
    `</svg>`;
  
  // Use percent-encoding instead of base64 for faster encoding
  // encodeURIComponent is faster than btoa(unescape(encodeURIComponent()))
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
