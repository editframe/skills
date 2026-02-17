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
import { isTemporal, isVisibleAtTime } from "../previewTypes.js";
import { ScaleConfig } from "./ScaleConfig.js";

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
      } catch {
        // Expected: cross-origin stylesheets block cssRules access
      }
    }
  } catch (e) {
    console.warn('[collectDocumentStyles] Failed to access document.styleSheets:', e);
  }
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

interface InternalSerializationOptions {
  renderContext?: RenderContext;
  timeMs: number;
  scaleConfig: ScaleConfig;
  sourceMap: WeakMap<HTMLCanvasElement, Element>;
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
 * Resolve the natural display value for an element that has display:none
 * set as an inline style (e.g., from temporal visibility via updateAnimations).
 *
 * Temporarily removes the inline display override so getComputedStyle falls
 * through to the element's stylesheet rules (including shadow DOM :host styles),
 * reads the natural value, then restores the override.
 */
function resolveNaturalDisplay(element: Element): string {
  const htmlEl = element as HTMLElement;
  const inlineDisplay = htmlEl.style?.getPropertyValue('display');
  if (inlineDisplay === 'none' && htmlEl.style) {
    htmlEl.style.removeProperty('display');
    const natural = getComputedStyle(element).getPropertyValue('display');
    htmlEl.style.setProperty('display', 'none');
    return natural || 'block';
  }
  return 'block';
}

/**
 * Serialize computed styles as inline style string.
 * Handles display:none recovery for non-caption elements by resolving
 * the element's natural display value from its stylesheet rules.
 * @param element - The element to serialize styles for
 * @param styles - Optional pre-computed CSSStyleDeclaration (avoids redundant getComputedStyle calls)
 */
function serializeComputedStyles(element: Element, styles?: CSSStyleDeclaration): string {
  const computed = styles ?? getComputedStyle(element);
  const styleParts: string[] = [];
  const tagName = element.tagName;
  const isCaptionChild = CAPTION_CHILD_TAGS.has(tagName);
  
  // Check if the element has explicit width/height in its inline style.
  // For elements that auto-size to content (inline, inline-block text),
  // serializing the computed "used" pixel width/height would lock them to
  // exact dimensions that may not match the foreignObject rendering context,
  // causing text wrapping when font metrics differ slightly.
  const htmlEl = element as HTMLElement;
  const hasExplicitWidth = !!htmlEl.style?.getPropertyValue('width');
  const hasExplicitHeight = !!htmlEl.style?.getPropertyValue('height');
  
  
  for (const prop of SERIALIZED_STYLE_PROPERTIES) {
    // Convert camelCase to kebab-case first
    const kebab = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    const value = computed.getPropertyValue(kebab);
    
    // Skip only truly empty values
    if (!value || value === '') {
      continue;
    }
    
    // Handle display property specially
    let finalValue = value;
    if (prop === 'display') {
      // For non-caption elements, recover the natural display value when display:none
      // was set by the temporal visibility system (updateAnimations). This prevents
      // inline elements (like ef-text-segment) from being serialized as display:block.
      if (value === 'none' && !isCaptionChild) {
        finalValue = resolveNaturalDisplay(element);
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
    
    // Skip width/height when not explicitly set on the element.
    // getComputedStyle returns "used" pixel values for width/height even when
    // the specified value is auto. Serializing these pixel values locks
    // content-sized elements (text segments, inline-block spans) to exact
    // dimensions, which breaks when the foreignObject context renders text
    // with different font metrics.
    if (prop === 'width' && !hasExplicitWidth) {
      continue;
    }
    if (prop === 'height' && !hasExplicitHeight) {
      continue;
    }
    
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
 * EF-SURFACE needs alpha because:
 *   1. Without a target, its canvas is transparent and CSS background should show through
 *   2. The target element may have transparent content
 * Raw canvas elements must preserve alpha - we don't know what they contain.
 */
function shouldPreserveAlpha(sourceElement: Element): boolean {
  const tagName = sourceElement.tagName;
  if (tagName === 'EF-WAVEFORM') {
    return true;
  }
  if (tagName === 'EF-SURFACE') {
    // Surface needs alpha to allow CSS background to show through empty areas
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
    // Only needed when page is hidden - compositor is suspended in hidden tabs
    const useGlBypass = document.hidden;
    const glPixels = useGlBypass ? readWebGLPixels(sourceCanvas) : null;
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
  options: InternalSerializationOptions
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
  
  // Get computed style once and reuse
  const computedStyle = getComputedStyle(sourceElement);
  const styleStr = serializeComputedStyles(sourceElement, computedStyle);
  
  // Get computed dimensions from source element (respects CSS like w-[420px])
  const computedWidth = computedStyle.width;
  const computedHeight = computedStyle.height;
  
  // Preserve the source element's object-fit and object-position for correct scaling.
  // These CSS properties control how the canvas content fits its container and must be
  // carried through to the serialized <img> to maintain visual fidelity.
  const styleParts = styleStr ? styleStr.split(';').filter(s => s.trim()) : [];

  // Remove width/height from computed styles (we'll set them explicitly from computed dimensions)
  const filteredParts = styleParts.filter(s => {
    const trimmed = s.trim();
    return !trimmed.startsWith('width:') &&
           !trimmed.startsWith('height:');
  });

  // Use host element dimensions if available, otherwise fall back to canvas natural dimensions
  const displayWidth = computedWidth || `${width}px`;
  const displayHeight = computedHeight || `${height}px`;

  filteredParts.push(`width:${displayWidth}`);
  filteredParts.push(`height:${displayHeight}`);
  filteredParts.push(`display:block`);
  
  const finalStyle = filteredParts.join(';');
  
  // Check if we need to preserve alpha channel
  const preserveAlpha = shouldPreserveAlpha(sourceElement);
  
  // CRITICAL: Calculate optimal encoding scale BEFORE creating snapshot.
  // This prevents encoding at full resolution when CSS display size is much smaller.
  let optimalScale = options.scaleConfig.exportScale; // Start with export scale as fallback
  
  try {
    const cssWidth = parseFloat(computedWidth) || sourceCanvas.width;
    const cssHeight = parseFloat(computedHeight) || sourceCanvas.height;
    
    // Use ScaleConfig to compute optimal canvas scale
    optimalScale = options.scaleConfig.computeCanvasScale({
      naturalWidth: sourceCanvas.width,
      naturalHeight: sourceCanvas.height,
      displayWidth: cssWidth,
      displayHeight: cssHeight,
    });
  } catch (e) {
    // Fallback to export scale if we can't get computed style
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
  options.sourceMap.set(snapshot, sourceElement);
  
  // Snapshot is already scaled, so encode at 1.0 scale
  const encodePromise = encodeCanvasesInParallel([snapshot], {
    scale: 1.0,
    renderContext: options.renderContext,
    sourceMap: options.sourceMap,
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
  options: InternalSerializationOptions
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
  options: InternalSerializationOptions,
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
  options: InternalSerializationOptions,
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
  // NOTE: Ancestor checking is unnecessary - serializeElement walks top-down,
  // so if a parent is temporally invisible, its children are never visited
  if (!isVisibleAtTime(element, options.timeMs)) {
    return;
  }
  
  // Respect updateAnimations' visibility decision for temporal elements.
  // isVisibleAtTime uses inclusive end bounds, but updateAnimations uses
  // exclusive end for mid-composition elements (VisibilityPolicy). When
  // updateAnimations has set display:none, that is the authoritative decision.
  if (isTemporal(element) && (element as HTMLElement).style?.getPropertyValue('display') === 'none') {
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
    const computedStyle = getComputedStyle(element);
    let computedDisplay = computedStyle.display;
    // If display:none was set by temporal visibility, resolve the natural display
    // to determine the correct container tag (span vs div)
    if (computedDisplay === 'none') {
      computedDisplay = resolveNaturalDisplay(element);
    }
    const isInline = computedDisplay === 'inline' || computedDisplay === 'inline-block' || computedDisplay === 'inline-flex';
    const containerTag = isInline ? 'span' : 'div';
    
    let styleStr = serializeComputedStyles(element, computedStyle);
    
    
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
 * TextEncoder instance for SVG-to-base64 encoding.
 * encode() converts to UTF-8 bytes in a single native call, then we
 * base64-encode the bytes. ~33% overhead vs ~200% for percent-encoding.
 */
const textEncoder = new TextEncoder();

/**
 * Synchronous DOM capture phase. Walks the element tree, snapshots canvas
 * pixels, and kicks off async encoding. Returns parts array containing
 * string fragments and encoding promises.
 *
 * After this function returns, the source element's DOM is no longer
 * referenced — the clone can safely be seeked to the next frame.
 * 
 * SCALING ARCHITECTURE (unified via ScaleConfig):
 * 
 * ScaleConfig centralizes all scaling logic and provides:
 * 1. Output SVG dimensions (width * exportScale, height * exportScale)
 * 2. DOM scaling wrapper (CSS transform:scale when exportScale < 1)
 * 3. Per-canvas optimal encoding scale via computeCanvasScale()
 * 
 * Canvas scaling is independent from DOM scaling because:
 * - Canvas elements have intrinsic pixel dimensions and can be downsampled
 *   efficiently before encoding (prevents encoding 1920px at full resolution
 *   when displayed at 420px)
 * - DOM content has no intrinsic resolution and must be scaled via CSS
 *   transforms, which the browser handles during SVG foreignObject rendering
 * 
 * Example: 1920x1080 @ 0.5 export scale
 * - Output SVG: 960x540
 * - DOM wrapper: transform:scale(0.5) on 1920x1080 content
 * - Canvas (1920px displayed at 420px): encoded at ~0.16x (315px)
 *   via computeCanvasScale(420/1920 * 0.5 * 1.5 quality = 0.164)
 */
export function captureElementParts(
  element: Element,
  width: number,
  height: number,
  options: SerializationOptions
): Array<string | Promise<string>> {
  const parts: Array<string | Promise<string>> = [];
  const canvasJobs: CanvasJob[] = [];
  const sourceMap = new WeakMap<HTMLCanvasElement, Element>();
  
  // Create ScaleConfig to centralize all scaling logic
  const scaleConfig = ScaleConfig.fromOptions(width, height, options.canvasScale);
  
  const documentStyles = options.renderContext?.getCachedDocumentStyles()
    ?? collectDocumentStyles();
  if (options.renderContext && documentStyles) {
    options.renderContext.setCachedDocumentStyles(documentStyles);
  }
  
  parts.push(
    `<div xmlns="http://www.w3.org/1999/xhtml" ` +
    `style="width:${scaleConfig.outputWidth}px;height:${scaleConfig.outputHeight}px;overflow:hidden;position:relative;">`
  );
  
  if (documentStyles) {
    parts.push(`<style type="text/css"><![CDATA[${documentStyles}]]></style>`);
  }
  
  // Apply DOM scaling wrapper if needed
  const domTransform = scaleConfig.getDOMTransform();
  if (domTransform) {
    const wrapperDims = scaleConfig.getDOMWrapperDimensions();
    parts.push(
      `<div style="transform:${domTransform};transform-origin:0 0;` +
      `width:${wrapperDims.width}px;height:${wrapperDims.height}px;">`
    );
  }
  
  // Create internal options with ScaleConfig
  const internalOptions: InternalSerializationOptions = {
    renderContext: options.renderContext,
    timeMs: options.timeMs,
    scaleConfig,
    sourceMap,
  };
  
  serializeElement(element, parts, canvasJobs, internalOptions);
  
  if (domTransform) {
    parts.push('</div>');
  }
  
  parts.push('</div>');
  
  return parts;
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
  const parts = captureElementParts(element, width, height, options);
  const resolvedParts = await Promise.all(parts);
  return resolvedParts.join('');
}

/**
 * Synchronous capture with deferred data URI encoding.
 *
 * Walks the DOM and snapshots canvas pixels synchronously, then returns
 * a promise that resolves to the SVG data URI once async canvas-to-base64
 * encoding completes. The source element is NOT referenced after this
 * function returns — the caller can immediately mutate/seek the clone.
 */
export function captureTimelineToDataUri(
  element: Element,
  width: number,
  height: number,
  options: SerializationOptions
): Promise<string> {
  // Create ScaleConfig to compute scaled dimensions
  const scaleConfig = ScaleConfig.fromOptions(width, height, options.canvasScale);
  
  const parts = captureElementParts(element, width, height, options);
  
  return Promise.all(parts).then(resolvedParts => {
    const xhtml = resolvedParts.join('');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${scaleConfig.outputWidth}" height="${scaleConfig.outputHeight}">` +
      `<foreignObject x="0" y="0" width="${scaleConfig.outputWidth}" height="${scaleConfig.outputHeight}">${xhtml}</foreignObject>` +
      `</svg>`;
    // Encode SVG to base64 data URI inline (avoids module-level function reference issues)
    const bytes = textEncoder.encode(svg);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192) as unknown as number[]);
    }
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  });
}

