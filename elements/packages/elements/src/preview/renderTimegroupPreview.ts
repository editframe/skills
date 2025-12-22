import type { EFTimegroup } from "../elements/EFTimegroup.js";

/**
 * Elements to skip entirely when building the preview.
 */
const SKIP_TAGS = new Set([
  "EF-AUDIO",
  "EF-WAVEFORM",
  "EF-THUMBNAIL-STRIP",
  "EF-FILMSTRIP",
  "EF-TIMELINE",
  "EF-WORKBENCH",
  "SCRIPT",
  "STYLE",
]);

/**
 * CSS properties to copy - prefer shorthand properties to reduce reads.
 * Using camelCase for direct property access.
 */
const COPY_PROPERTIES = [
  // Layout & positioning (use individual props, not inset shorthand)
  "position", "display", "top", "right", "bottom", "left", "zIndex",
  "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
  // Flexbox
  "flex", "flexFlow", "justifyContent", "alignItems", "alignContent", "alignSelf", "gap",
  // Grid
  "gridTemplate", "gridColumn", "gridRow", "gridArea",
  // Box model
  "margin", "padding", "boxSizing",
  // Visual - include individual border sides for partial borders
  "background", "border", "borderTop", "borderRight", "borderBottom", "borderLeft",
  "borderRadius", "boxShadow", 
  "opacity", "visibility", "overflow", "clipPath",
  // Text
  "color", "font", "textAlign", "textDecoration", "textTransform",
  "letterSpacing", "whiteSpace", "textOverflow", "lineHeight",
  // Transform
  "transform", "transformOrigin",
  // Filter
  "filter", "backdropFilter",
  // Misc
  "cursor", "pointerEvents", "userSelect",
] as const;

/** Pair of source element and its clone for fast updates */
export type ElementPair = [source: Element, clone: HTMLElement];


/**
 * Builds a cloned structure and returns element pairs for fast updates.
 * Exported for reuse by canvas renderer.
 */
export function buildCloneStructure(source: Element): {
  container: HTMLDivElement;
  pairs: ElementPair[];
} {
  const container = document.createElement("div");
  container.style.cssText = "display: contents;";
  const pairs: ElementPair[] = [];
  
  function cloneElement(srcEl: Element): Element | null {
    if (SKIP_TAGS.has(srcEl.tagName)) {
      return null;
    }
    
    // Handle SVG - clone and track for style sync (visibility/display/opacity)
    if (srcEl instanceof SVGElement) {
      const svgClone = srcEl.cloneNode(true) as SVGElement;
      // Track SVG for visibility sync (display, visibility, opacity work on SVG)
      pairs.push([srcEl, svgClone as unknown as HTMLElement]);
      return svgClone;
    }
    
    // Handle canvas
    if (srcEl instanceof HTMLCanvasElement) {
      const canvas = document.createElement("canvas");
      canvas.width = srcEl.width;
      canvas.height = srcEl.height;
      try {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(srcEl, 0, 0);
      } catch (e) { /* cross-origin */ }
      return canvas;
    }
    
    // Handle custom elements with canvas in shadow DOM (e.g., ef-video, ef-image)
    const isCustomElement = srcEl.tagName.includes("-");
    if (isCustomElement && srcEl.shadowRoot) {
      const shadowCanvas = srcEl.shadowRoot.querySelector("canvas");
      if (shadowCanvas) {
        // Create canvas clone matching source dimensions
        const clone = document.createElement("canvas");
        clone.width = shadowCanvas.width || srcEl.clientWidth;
        clone.height = shadowCanvas.height || srcEl.clientHeight;
        
        // Copy current frame
        const ctx = clone.getContext("2d");
        if (ctx) {
          try {
            ctx.drawImage(shadowCanvas, 0, 0);
          } catch (e) { /* cross-origin or tainted */ }
        }
        
        // Store pair for frame syncing (source element, not canvas, for lookup)
        pairs.push([srcEl, clone]);
        return clone;
      }
      
      // If no canvas, check for img in shadow DOM (e.g., ef-image with URL)
      const shadowImg = srcEl.shadowRoot.querySelector("img");
      if (shadowImg && shadowImg.complete && shadowImg.naturalWidth > 0) {
        const clone = document.createElement("canvas");
        clone.width = shadowImg.naturalWidth;
        clone.height = shadowImg.naturalHeight;
        const ctx = clone.getContext("2d");
        if (ctx) {
          try {
            ctx.drawImage(shadowImg, 0, 0);
          } catch (e) { /* cross-origin */ }
        }
        pairs.push([srcEl, clone]);
        return clone;
      }
    }
    
    // Create clone - div for custom elements, preserve tag for standard HTML
    const clone = document.createElement(isCustomElement ? "div" : srcEl.tagName.toLowerCase()) as HTMLElement;
    
    // Copy attributes - for all elements, copy class (for CSS selectors)
    // For standard HTML elements, copy all attributes except id and event handlers
    // Skip id (avoid duplicates) and event handlers
    for (const attr of srcEl.attributes) {
      const name = attr.name.toLowerCase();
      if (name === "id" || name.startsWith("on")) continue;
      // For custom elements (now divs), only copy class and data-* attributes
      if (isCustomElement && name !== "class" && !name.startsWith("data-")) continue;
      try {
        clone.setAttribute(attr.name, attr.value);
      } catch { /* some attributes may not be settable */ }
    }
    
    // Handle images - ensure src is set (may be computed)
    if (srcEl instanceof HTMLImageElement && srcEl.src) {
      (clone as HTMLImageElement).src = srcEl.src;
    }
    
    // Handle input values (runtime value, not attribute)
    if (srcEl instanceof HTMLInputElement) {
      (clone as HTMLInputElement).value = srcEl.value;
    }
    
    // Store pair for style syncing
    pairs.push([srcEl, clone]);
    
    // Flatten shadow DOM first (if exists), skipping slots and styles
    if (srcEl.shadowRoot) {
      for (const shadowChild of srcEl.shadowRoot.childNodes) {
        if (shadowChild.nodeType === Node.TEXT_NODE) {
          const text = shadowChild.textContent?.trim();
          if (text) clone.appendChild(document.createTextNode(text));
        } else if (shadowChild.nodeType === Node.ELEMENT_NODE) {
          const el = shadowChild as Element;
          // Skip STYLE and SLOT elements (slots are filled by light DOM)
          if (el.tagName === "STYLE" || el.tagName === "SLOT") continue;
          const clonedChild = cloneElement(el);
          if (clonedChild) clone.appendChild(clonedChild);
        }
      }
    }
    
    // Clone light DOM children (these fill slots in shadow DOM)
    for (const child of srcEl.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) clone.appendChild(document.createTextNode(text));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const clonedChild = cloneElement(child as Element);
        if (clonedChild) clone.appendChild(clonedChild);
      }
    }
    
    return clone;
  }
  
  const root = cloneElement(source);
  if (root) container.appendChild(root);
  
  return { container, pairs };
}

/** Stored data for a single element sync */
type SyncData = {
  styles: Record<string, string>;
  textContent?: string;
  inputValue?: string;
} | null;

/**
 * Sync styles and content from source to clone for all pairs.
 * THREE PHASES to prevent layout thrashing:
 * 1. Get all CSSStyleDeclaration objects (triggers one layout)
 * 2. Read all values from declarations (no layout)
 * 3. Write all values to clones (batched, one reflow)
 * Exported for reuse by canvas renderer.
 */
export function syncAllStyles(pairs: ElementPair[]): void {
  const len = pairs.length;
  
  // ===== PHASE 1: Get all computed style objects at once =====
  // This batches the layout calculation into one operation
  const computedStyles: (CSSStyleDeclaration | null)[] = new Array(len);
  const hiddenElements = new Set<Element>();
  
  for (let i = 0; i < len; i++) {
    const src = pairs[i]![0];
    
    // Check if ancestor is hidden (skip getComputedStyle entirely)
    let isHidden = false;
    let el: Element | null = src.parentElement;
    while (el) {
      if (hiddenElements.has(el)) {
        isHidden = true;
        break;
      }
      el = el.parentElement;
    }
    
    if (isHidden) {
      computedStyles[i] = null;
      hiddenElements.add(src);
    } else {
      const cs = getComputedStyle(src);
      computedStyles[i] = cs;
      if (cs.display === "none") {
        hiddenElements.add(src);
      }
    }
  }
  
  // ===== PHASE 2: Read all values from computed styles =====
  // No layout work here - just reading from already-computed declarations
  const syncData: SyncData[] = new Array(len);
  
  for (let i = 0; i < len; i++) {
    const cs = computedStyles[i] as CSSStyleDeclaration & Record<string, string> | null;
    const src = pairs[i]![0];
    
    if (!cs || cs.display === "none") {
      syncData[i] = { styles: { display: "none" } };
    } else {
      const styles: Record<string, string> = {};
      for (let j = 0; j < COPY_PROPERTIES.length; j++) {
        const prop = COPY_PROPERTIES[j];
        styles[prop] = cs[prop];
      }
      
      const data: SyncData = { styles };
      
      // Read text content - only the first text node's content, not entire element
      if (src.childNodes.length > 0 && src.childNodes[0]?.nodeType === Node.TEXT_NODE) {
        data.textContent = src.childNodes[0].textContent || "";
      }
      
      // Read input values
      if (src instanceof HTMLInputElement) {
        data.inputValue = src.value;
      }
      
      syncData[i] = data;
    }
  }
  
  // ===== PHASE 3: Write all values to clones =====
  // Batched writes - browser can optimize into single reflow
  for (let i = 0; i < len; i++) {
    const data = syncData[i];
    if (!data) continue;
    
    const clone = pairs[i]![1];
    const style = clone.style;
    const styles = data.styles;
    
    // Write all style properties
    for (let j = 0; j < COPY_PROPERTIES.length; j++) {
      const prop = COPY_PROPERTIES[j];
      (style as any)[prop] = styles[prop];
    }
    
    style.animation = "none";
    style.transition = "none";
    
    // Update text/input
    if (data.textContent !== undefined && clone.childNodes[0]?.nodeType === Node.TEXT_NODE) {
      clone.childNodes[0].textContent = data.textContent;
    }
    if (data.inputValue !== undefined && clone instanceof HTMLInputElement) {
      clone.value = data.inputValue;
      // Also set as attribute so it survives cloneNode() for canvas rendering
      clone.setAttribute("value", data.inputValue);
    }
  }
  
  // ===== PHASE 4: Refresh canvas content for elements with shadow DOM canvas =====
  for (let i = 0; i < len; i++) {
    const [src, clone] = pairs[i]!;
    if (clone instanceof HTMLCanvasElement && src.shadowRoot) {
      // Check for canvas in shadow DOM (e.g., ef-video)
      const shadowCanvas = src.shadowRoot.querySelector("canvas");
      if (shadowCanvas) {
        const ctx = clone.getContext("2d");
        if (ctx) {
          // Resize if source dimensions changed
          if (clone.width !== shadowCanvas.width) clone.width = shadowCanvas.width;
          if (clone.height !== shadowCanvas.height) clone.height = shadowCanvas.height;
          ctx.clearRect(0, 0, clone.width, clone.height);
          try {
            ctx.drawImage(shadowCanvas, 0, 0);
          } catch (e) { /* cross-origin */ }
        }
        continue;
      }
      
      // Check for img in shadow DOM (e.g., ef-image)
      const shadowImg = src.shadowRoot.querySelector("img");
      if (shadowImg && shadowImg.complete && shadowImg.naturalWidth > 0) {
        const ctx = clone.getContext("2d");
        if (ctx) {
          // Resize if source dimensions changed
          if (clone.width !== shadowImg.naturalWidth) clone.width = shadowImg.naturalWidth;
          if (clone.height !== shadowImg.naturalHeight) clone.height = shadowImg.naturalHeight;
          ctx.clearRect(0, 0, clone.width, clone.height);
          try {
            ctx.drawImage(shadowImg, 0, 0);
          } catch (e) { /* cross-origin */ }
        }
      }
    }
  }
}

/**
 * Collect all CSS rules from document stylesheets.
 * This allows styles to work when clones are rendered inside shadow DOM.
 * Exported for reuse by canvas renderer.
 */
export function collectDocumentStyles(): string {
  const rules: string[] = [];
  try {
    for (const sheet of document.styleSheets) {
      try {
        // Some stylesheets may be cross-origin and not accessible
        if (sheet.cssRules) {
          for (const rule of sheet.cssRules) {
            rules.push(rule.cssText);
          }
        }
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    }
  } catch (e) {
    console.warn("Failed to collect document styles:", e);
  }
  return rules.join("\n");
}

export interface TimegroupPreviewResult {
  container: HTMLDivElement;
  /** 
   * Call this to sync animated properties to current visual state.
   * Fast operation - only updates style properties, no DOM creation.
   */
  refresh: () => void;
}

/**
 * Renders a timegroup preview with efficient per-frame updates.
 * 
 * Initial call builds the clone structure (expensive, once).
 * Each refresh() call syncs only animated CSS properties (fast, every frame).
 * 
 * @param timegroup - The source timegroup to preview
 * @returns Object with container and refresh function
 */
export function renderTimegroupPreview(
  timegroup: EFTimegroup,
): TimegroupPreviewResult {
  const width = timegroup.offsetWidth || 1920;
  const height = timegroup.offsetHeight || 1080;

  // Outer container with dimensions
  const container = document.createElement("div");
  container.className = "timegroup-preview";
  container.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    position: relative;
    overflow: hidden;
    background: ${getComputedStyle(timegroup).background || "#000"};
  `;

  // Inject document styles so CSS rules work inside shadow DOM
  const styleEl = document.createElement("style");
  styleEl.textContent = collectDocumentStyles();
  container.appendChild(styleEl);

  // Build clone structure once - stores element pairs for fast updates
  const { container: innerContainer, pairs } = buildCloneStructure(timegroup);
  container.appendChild(innerContainer);
  
  // Initial sync - copy all computed styles
  syncAllStyles(pairs);

  // Refresh - sync all styles (builds cssText string, assigns once per element)
  const refresh = () => {
    syncAllStyles(pairs);
  };

  return { container, refresh };
}

