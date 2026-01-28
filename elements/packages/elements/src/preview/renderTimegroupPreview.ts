/**
 * Canvas refresh fix:
 * Canvas pixels must be explicitly cleared and redrawn in syncNodeStyles
 * to ensure video frames are captured correctly during foreignObject rendering.
 * Without clearRect, stale frames from previous seeks may be serialized.
 * 
 * See FOREIGNOBJECT_BUG_FIX.md for detailed explanation.
 */

import { logger } from "./logger.js";

/**
 * Elements to skip entirely when building the preview.
 */
const SKIP_TAGS = new Set([
  "EF-AUDIO",
  "EF-THUMBNAIL-STRIP",
  "EF-FILMSTRIP",
  "EF-TIMELINE",
  "EF-WORKBENCH",
  "SCRIPT",
  "STYLE",
]);

/**
 * All CSS properties to sync (camelCase for style[] access).
 */
const SYNC_PROPERTIES = [
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
 * Kebab-case versions for computedStyleMap.get() - pre-computed for speed.
 */
const SYNC_PROPERTIES_KEBAB = SYNC_PROPERTIES.map(prop =>
  prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
);

/**
 * Feature detection: computedStyleMap is ~15% faster for style syncing.
 */
const HAS_COMPUTED_STYLE_MAP = typeof Element !== "undefined" && typeof Element.prototype.computedStyleMap === "function";

/**
 * CSS initial/default values for SAFE-TO-SKIP properties.
 * Only includes NON-INHERITED properties where skipping the default
 * won't affect visual output.
 * 
 * EXCLUDED (must always serialize):
 * - Inherited properties (color, font, text-*, visibility, cursor)
 * - Display (affects layout significantly)
 * - Properties where "auto" computes to a specific value
 * 
 * INCLUDED (safe to skip):
 * - Transform/filter effects (none = no effect)
 * - Box shadows (none = no shadow)
 * - Borders when none/0 (no visual impact)
 * - backdrop-filter (none = no effect)
 */
const CSS_SAFE_DEFAULT_VALUES: Record<string, string | string[]> = {
  // Transforms & effects - safe to skip "none" (no visual impact)
  transform: "none",
  filter: "none",
  backdropFilter: "none",
  boxShadow: "none",
  
  // Borders - safe to skip when none/0
  border: ["none", "0px none", "0px", "0px none rgb(0, 0, 0)"],
  borderTop: ["none", "0px none", "0px", "0px none rgb(0, 0, 0)"],
  borderRight: ["none", "0px none", "0px", "0px none rgb(0, 0, 0)"],
  borderBottom: ["none", "0px none", "0px", "0px none rgb(0, 0, 0)"],
  borderLeft: ["none", "0px none", "0px", "0px none rgb(0, 0, 0)"],
  borderRadius: ["0px", "0"],
  
  // Positioning - safe to skip "static"
  position: "static",
  
  // Z-index - "auto" is safe when position is static
  zIndex: "auto",
  
  // 3D transforms - safe to skip defaults
  transformStyle: "flat",
  perspective: "none",
  backfaceVisibility: "visible",
};

/**
 * Check if a value matches a safe-to-skip default.
 */
function isDefaultValue(prop: string, value: string): boolean {
  const defaults = CSS_SAFE_DEFAULT_VALUES[prop];
  if (!defaults) return false;
  if (Array.isArray(defaults)) {
    return defaults.includes(value);
  }
  return defaults === value;
}

// Re-export temporal types from shared module
export {
  type TemporalElement,
  isTemporal,
  getTemporalBounds,
  isVisibleAtTime,
} from "./previewTypes.js";

// Import for internal use
import {
  getTemporalBounds,
} from "./previewTypes.js";

/**
 * Tree node representing a source/clone pair with children.
 * This replaces the flat array approach for cleaner recursive traversal.
 */
export interface CloneNode {
  source: Element;
  clone: HTMLElement;
  children: CloneNode[];
  isCanvasClone: boolean;
  /** Cached temporal bounds for this node */
  bounds: { startMs: number; endMs: number };
  /** Parent node reference for ancestor visibility checks */
  parent: CloneNode | null;
}

/** Tree-based sync state */
export interface CloneTree {
  root: CloneNode | null;
}

/** Sync state with tree structure and delta tracking */
export interface SyncState {
  tree: CloneTree;
  nodeCount: number;  // Total number of nodes (for debugging/logging)
  /** Maps clone canvases to their original source elements (ef-video, ef-image, etc.) */
  canvasSourceMap: WeakMap<HTMLCanvasElement, Element>;
  /** Previous frame's visible set for delta tracking */
  previousVisibleSet: Set<CloneNode>;
  /** Current frame's visible set (updated by syncStyles) */
  currentVisibleSet: Set<CloneNode>;
}

/** Info needed to restore a removed node */
interface RemovedNodeInfo {
  node: CloneNode;
  parent: Node;
  nextSibling: Node | null;
}

/**
 * Remove hidden nodes from the clone DOM for serialization.
 * Returns info needed to restore them afterward.
 * 
 * This physically removes non-visible nodes so they won't be serialized,
 * avoiding the cost of serializing hidden elements and their resources.
 */
export function removeHiddenNodesForSerialization(state: SyncState): RemovedNodeInfo[] {
  const removed: RemovedNodeInfo[] = [];
  const visibleSet = state.currentVisibleSet;
  
  // Traverse all nodes and remove those not in visible set
  function visit(node: CloneNode): void {
    // First recurse to children (before potentially removing this node)
    for (const child of node.children) {
      visit(child);
    }
    
    // If this node isn't visible, remove it from DOM
    if (!visibleSet.has(node)) {
      const parent = node.clone.parentNode;
      if (parent) {
        const nextSibling = node.clone.nextSibling;
        parent.removeChild(node.clone);
        removed.push({ node, parent, nextSibling });
      }
    }
  }
  
  if (state.tree.root) {
    visit(state.tree.root);
  }
  
  return removed;
}

/**
 * Restore previously removed hidden nodes to the clone DOM.
 * Must be called after serialization to maintain tree integrity for next frame.
 */
export function restoreHiddenNodes(removed: RemovedNodeInfo[]): void {
  // Restore in reverse order to maintain correct DOM positions
  for (let i = removed.length - 1; i >= 0; i--) {
    const { node, parent, nextSibling } = removed[i]!;
    if (nextSibling) {
      parent.insertBefore(node.clone, nextSibling);
    } else {
      parent.appendChild(node.clone);
    }
  }
}

/**
 * Get visible canvases from the current visible set.
 * Use this to skip encoding hidden canvases during serialization.
 */
export function getVisibleCanvases(state: SyncState): Set<HTMLCanvasElement> {
  const visibleCanvases = new Set<HTMLCanvasElement>();
  for (const node of state.currentVisibleSet) {
    if (node.clone instanceof HTMLCanvasElement) {
      visibleCanvases.add(node.clone);
    }
  }
  return visibleCanvases;
}

/**
 * Traverse all nodes in the clone tree, calling the callback for each.
 */
export function traverseCloneTree(state: SyncState, callback: (node: CloneNode) => void): void {
  function visit(node: CloneNode): void {
    callback(node);
    for (const child of node.children) {
      visit(child);
    }
  }
  if (state.tree.root) {
    visit(state.tree.root);
  }
}

/**
 * Unified CSS property sync for all elements (canvas clones and regular elements).
 * 
 * Canvas clones use a limited property set matching the original implementation
 * to avoid dimension/layout issues. Regular elements use the full SYNC_PROPERTIES array.
 * 
 * @param source - Source element to read styles from
 * @param clone - Clone element to write styles to
 * @param contentSource - Optional content element for width/height (canvas clones only)
 */
function syncElementStyles(
  source: Element,
  clone: HTMLElement,
  contentSource?: Element,
): void {
  const cloneStyle = clone.style as any;
  const tagName = (source as HTMLElement).tagName;
  const isCanvasClone = !!contentSource;
  
  // Canvas clones: Use exact property list from original implementation
  if (isCanvasClone) {
    let cs: CSSStyleDeclaration;
    let contentCs: CSSStyleDeclaration | undefined;
    
    try {
      cs = getComputedStyle(source);
      if (contentSource) {
        contentCs = getComputedStyle(contentSource);
      }
    } catch { return; }
    
    // Exact properties from original copyCanvasCloneStyles + syncNodeStyles
    cloneStyle.position = cs.position;
    cloneStyle.top = cs.top;
    cloneStyle.right = cs.right;
    cloneStyle.bottom = cs.bottom;
    cloneStyle.left = cs.left;
    cloneStyle.margin = cs.margin;
    cloneStyle.zIndex = cs.zIndex;
    cloneStyle.transform = cs.transform;
    cloneStyle.transformOrigin = cs.transformOrigin;
    cloneStyle.opacity = cs.opacity;
    cloneStyle.visibility = cs.visibility;
    cloneStyle.backfaceVisibility = cs.backfaceVisibility;
    cloneStyle.transformStyle = cs.transformStyle;
    
    // Visual properties (safe for canvas clones - don't affect dimensions)
    cloneStyle.background = cs.background;
    cloneStyle.color = cs.color;
    cloneStyle.boxShadow = cs.boxShadow;
    cloneStyle.filter = cs.filter;
    cloneStyle.backdropFilter = cs.backdropFilter;
    
    // Width/height from content source (shadow canvas/img)
    if (contentCs) {
      cloneStyle.width = contentCs.width;
      cloneStyle.height = contentCs.height;
    }
    
    cloneStyle.display = "block";
    cloneStyle.animation = "none";
    cloneStyle.transition = "none";
    
    return;
  }
  
  // Regular elements: full property sync from SYNC_PROPERTIES
  const propLen = SYNC_PROPERTIES.length;
  
  if (HAS_COMPUTED_STYLE_MAP) {
    let srcMap: StylePropertyMapReadOnly;
    
    try {
      srcMap = source.computedStyleMap();
    } catch { return; }
    
    for (let j = 0; j < propLen; j++) {
      const kebab = SYNC_PROPERTIES_KEBAB[j]!;
      const camel = SYNC_PROPERTIES[j]!;
      
      const srcVal = srcMap.get(kebab);
      if (!srcVal) continue;
      
      const strVal = srcVal.toString();
      
      if (camel === "display") {
        // For caption child elements, preserve display:none when explicitly set
        // (they use it to hide empty content, not for temporal visibility)
        const isCaptionChild = tagName && (
          tagName === 'EF-CAPTIONS-ACTIVE-WORD' ||
          tagName === 'EF-CAPTIONS-BEFORE-ACTIVE-WORD' ||
          tagName === 'EF-CAPTIONS-AFTER-ACTIVE-WORD' ||
          tagName === 'EF-CAPTIONS-SEGMENT'
        );
        const targetDisplay = (strVal === "none" && !isCaptionChild) ? "block" : strVal;
        cloneStyle.display = targetDisplay;
        continue;
      }
      
      // Skip clipPath - clones always have clipPath: none for rendering
      // (source may have clip-path: inset(100%) from proxy mode)
      if (camel === "clipPath") continue;
      
      // OPTIMIZATION: Skip default values to reduce serialized HTML size
      // If the computed value is the CSS default, don't set it as inline style
      if (isDefaultValue(camel, strVal)) {
        // Remove from inline style if it was previously set
        if (cloneStyle[camel]) cloneStyle[camel] = "";
        continue;
      }
      
      cloneStyle[camel] = strVal;
    }
  } else {
    let cs: CSSStyleDeclaration;
    
    try {
      cs = getComputedStyle(source);
    } catch { return; }
    
    const srcStyle = cs as any;
    
    for (const prop of SYNC_PROPERTIES) {
      const srcVal = srcStyle[prop];
      if (!srcVal) continue;
      
      if (prop === "display") {
        // For caption child elements, preserve display:none when explicitly set
        // (they use it to hide empty content, not for temporal visibility)
        const isCaptionChild = tagName && (
          tagName === 'EF-CAPTIONS-ACTIVE-WORD' ||
          tagName === 'EF-CAPTIONS-BEFORE-ACTIVE-WORD' ||
          tagName === 'EF-CAPTIONS-AFTER-ACTIVE-WORD' ||
          tagName === 'EF-CAPTIONS-SEGMENT'
        );
        const targetDisplay = (srcVal === "none" && !isCaptionChild) ? "block" : srcVal;
        cloneStyle.display = targetDisplay;
        continue;
      }
      
      // Skip clipPath - clones always have clipPath: none for rendering
      // (source may have clip-path: inset(100%) from proxy mode)
      if (prop === "clipPath") continue;
      
      // OPTIMIZATION: Skip default values to reduce serialized HTML size
      if (isDefaultValue(prop, srcVal)) {
        if (cloneStyle[prop]) cloneStyle[prop] = "";
        continue;
      }
      
      cloneStyle[prop] = srcVal;
    }
  }
  
  // Disable animations/transitions to prevent re-animation
  cloneStyle.animation = "none";
  cloneStyle.transition = "none";
}

/**
 * Refresh canvas pixel content from shadow DOM source.
 * Handles both shadow canvas and shadow img sources.
 */
function refreshCanvasPixels(node: CloneNode): void {
  const { source, clone } = node;
  const canvas = clone as HTMLCanvasElement;
  const shadowCanvas = source.shadowRoot?.querySelector("canvas");
  const shadowImg = source.shadowRoot?.querySelector("img");
  
  if (shadowCanvas) {
    // Update buffer dimensions if needed
    if (canvas.width !== shadowCanvas.width) canvas.width = shadowCanvas.width;
    if (canvas.height !== shadowCanvas.height) canvas.height = shadowCanvas.height;
    
    // Copy pixels with explicit clear
    const ctx = canvas.getContext("2d");
    if (ctx && shadowCanvas.width > 0 && shadowCanvas.height > 0) {
      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(shadowCanvas, 0, 0);
      } catch (e) {
        logger.warn("[refreshCanvasPixels] Canvas draw failed:", e);
      }
    }
  } else if (shadowImg?.complete && shadowImg.naturalWidth > 0) {
    // Update buffer dimensions if needed
    if (canvas.width !== shadowImg.naturalWidth) canvas.width = shadowImg.naturalWidth;
    if (canvas.height !== shadowImg.naturalHeight) canvas.height = shadowImg.naturalHeight;
    
    // Copy pixels with explicit clear
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      try { ctx.drawImage(shadowImg, 0, 0); } catch {}
    }
  }
}

/**
 * Sync text content from light DOM to clone.
 */
function syncTextContent(source: Element, clone: HTMLElement): void {
  const srcTextNode = source.childNodes[0];
  if (srcTextNode?.nodeType === Node.TEXT_NODE) {
    const srcText = srcTextNode.textContent || "";
    const cloneTextNode = clone.childNodes[0];
    
    if (cloneTextNode?.nodeType === Node.TEXT_NODE) {
      // Update existing text node
      if (cloneTextNode.textContent !== srcText) cloneTextNode.textContent = srcText;
    } else if (!clone.childNodes.length) {
      // Only create text node if clone has NO children (was empty when initially cloned)
      // Don't set textContent as it would delete element children!
      clone.appendChild(document.createTextNode(srcText));
    }
  }
}

/**
 * Sync input element value.
 */
function syncInputValue(source: Element, clone: HTMLElement): void {
  if (source instanceof HTMLInputElement) {
    const srcVal = source.value;
    const cloneInput = clone as HTMLInputElement;
    if (cloneInput.value !== srcVal) {
      cloneInput.value = srcVal;
      cloneInput.setAttribute("value", srcVal);
    }
  }
}

/**
 * Build clone tree structure with minimal overhead.
 * Caches temporal bounds on each node for visibility checks.
 * Optionally syncs styles in the same pass if timeMs is provided.
 */
export function buildCloneStructure(source: Element, timeMs?: number): {
  container: HTMLDivElement;
  syncState: SyncState;
} {
  const container = document.createElement("div");
  container.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%";
  
  let nodeCount = 0;
  const canvasSourceMap = new WeakMap<HTMLCanvasElement, Element>();
  
  function cloneElement(srcEl: Element, parentNode: CloneNode | null): CloneNode | null {
    if (SKIP_TAGS.has(srcEl.tagName)) return null;
    
    // Get temporal bounds upfront for indexing
    const bounds = getTemporalBounds(srcEl);
    
    // Canvas - copy pixels
    // NOTE: Raw canvases are always recopied (no caching) since we can't detect when their content changes.
    // Long-term solution: Create EFCanvas wrapper element to track modifications.
    if (srcEl instanceof HTMLCanvasElement) {
      const canvas = document.createElement("canvas");
      // Use intrinsic buffer dimensions (not affected by zoom/transforms)
      canvas.width = srcEl.width;
      canvas.height = srcEl.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        try { ctx.drawImage(srcEl, 0, 0); } catch {}
      }
      
      // Set explicit CSS dimensions based on buffer size to avoid zoom-affected computed styles
      // This ensures the canvas renders at its natural size regardless of workspace zoom
      canvas.style.width = `${srcEl.width}px`;
      canvas.style.height = `${srcEl.height}px`;
      
      // Sync positioning/transform styles from source, but dimensions are already set above
      try {
        const cs = getComputedStyle(srcEl);
        canvas.style.position = cs.position;
        canvas.style.top = cs.top;
        canvas.style.right = cs.right;
        canvas.style.bottom = cs.bottom;
        canvas.style.left = cs.left;
        canvas.style.margin = cs.margin;
        canvas.style.zIndex = cs.zIndex;
        canvas.style.transform = cs.transform;
        canvas.style.transformOrigin = cs.transformOrigin;
        canvas.style.opacity = cs.opacity;
        canvas.style.visibility = cs.visibility;
        canvas.style.display = "block";
      } catch {}
      
      // Map clone canvas to source for RenderContext (though caching won't help here)
      canvasSourceMap.set(canvas, srcEl);
      
      const node: CloneNode = {
        source: srcEl,
        clone: canvas,
        children: [],
        isCanvasClone: true,
        bounds,
        parent: parentNode,
      };
      nodeCount++;
      return node;
    }
    
    // Custom elements with shadow canvas (e.g., ef-video, ef-image)
    const isCustom = srcEl.tagName.includes("-");
    if (isCustom && srcEl.shadowRoot) {
      const shadowCanvas = srcEl.shadowRoot.querySelector("canvas");
      if (shadowCanvas) {
        const clone = document.createElement("canvas");
        clone.width = shadowCanvas.width || srcEl.clientWidth;
        clone.height = shadowCanvas.height || srcEl.clientHeight;
        // Check if the element actually has alpha channel before preserving it
        // ef-image tracks hasAlpha based on MIME type (JPEG=false, PNG/WebP=true)
        // ef-waveform always needs alpha for proper rendering
        if (srcEl.tagName === "EF-WAVEFORM") {
          clone.dataset.preserveAlpha = "true";
        } else if (srcEl.tagName === "EF-IMAGE") {
          const hasAlpha = "hasAlpha" in srcEl && (srcEl as any).hasAlpha;
          if (hasAlpha) {
            clone.dataset.preserveAlpha = "true";
          }
          console.log(`[buildCloneStructure] EF-IMAGE canvas: size=${clone.width}x${clone.height}, hasAlpha=${hasAlpha}, preserveAlpha=${hasAlpha ? 'PNG' : 'JPEG'}`);
        }
        
        const ctx = clone.getContext("2d");
        if (ctx) {
          try { ctx.drawImage(shadowCanvas, 0, 0); } catch {}
        }
        
        // Copy initial CSS styles using unified sync
        // Pass shadowCanvas as contentSource for width/height
        try {
          syncElementStyles(srcEl, clone, shadowCanvas);
        } catch {}
        
        // Map clone canvas to source element for RenderContext caching
        canvasSourceMap.set(clone, srcEl);
        
        const node: CloneNode = {
          source: srcEl,
          clone,
          children: [],
          isCanvasClone: true,
          bounds,
          parent: parentNode,
        };
        nodeCount++;
        return node;
      }
      
      const shadowImg = srcEl.shadowRoot.querySelector("img");
      if (shadowImg?.complete && shadowImg.naturalWidth > 0) {
        const clone = document.createElement("canvas");
        clone.width = shadowImg.naturalWidth;
        clone.height = shadowImg.naturalHeight;
        // Check if the element actually has alpha channel before preserving it
        // For direct img elements, check the element's hasAlpha property
        if (srcEl.tagName === "EF-IMAGE") {
          const hasAlpha = "hasAlpha" in srcEl && (srcEl as any).hasAlpha;
          if (hasAlpha) {
            clone.dataset.preserveAlpha = "true";
          }
        }
        const ctx = clone.getContext("2d");
        if (ctx) {
          try { ctx.drawImage(shadowImg, 0, 0); } catch {}
        }
        
        // Copy initial CSS styles using unified sync
        // Pass shadowImg as contentSource for width/height
        try {
          syncElementStyles(srcEl, clone, shadowImg);
        } catch {}
        
        // Map clone canvas to source element for RenderContext caching
        canvasSourceMap.set(clone, srcEl);
        
        const node: CloneNode = {
          source: srcEl,
          clone,
          children: [],
          isCanvasClone: true,
          bounds,
          parent: parentNode,
        };
        nodeCount++;
        return node;
      }
    }
    
    // Standard element clone
    // SVG elements need createElementNS, HTML elements use createElement
    let clone: HTMLElement;
    if (srcEl instanceof SVGElement) {
      clone = document.createElementNS("http://www.w3.org/2000/svg", srcEl.tagName) as unknown as HTMLElement;
    } else {
      clone = document.createElement(isCustom ? "div" : srcEl.tagName.toLowerCase()) as HTMLElement;
    }
    
    // Copy attributes - OPTIMIZATION: Early exit if no attributes
    const attrs = srcEl.attributes;
    const attrLen = attrs.length;
    if (attrLen > 0) {
      for (let i = 0; i < attrLen; i++) {
        const attr = attrs[i]!;
        const name = attr.name.toLowerCase();
        if (name === "id" || name.startsWith("on")) continue;
        if (isCustom && name !== "class" && !name.startsWith("data-")) continue;
        try { clone.setAttribute(attr.name, attr.value); } catch {}
      }
    }
    
    if (srcEl instanceof HTMLImageElement && srcEl.src) {
      (clone as HTMLImageElement).src = srcEl.src;
    }
    if (srcEl instanceof HTMLInputElement) {
      (clone as HTMLInputElement).value = srcEl.value;
    }
    
    const node: CloneNode = {
      source: srcEl,
      clone,
      children: [],
      isCanvasClone: false,
      bounds,
      parent: parentNode,
    };
    nodeCount++;
    
    // Shadow DOM children - OPTIMIZATION: Early exit if no childNodes
    if (srcEl.shadowRoot) {
      const shadowChildren = srcEl.shadowRoot.childNodes;
      const shadowLen = shadowChildren.length;
      if (shadowLen > 0) {
        // For text segments, ALWAYS create a text node placeholder even if empty.
        // Caption elements now use light DOM, so they don't need special handling here.
        const isTextSegment = srcEl.tagName === 'EF-TEXT-SEGMENT';
        let hasTextNode = false;
        
        for (let i = 0; i < shadowLen; i++) {
          const child = shadowChildren[i]!;
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim();
            // Always include text for text segments (even if whitespace-only, e.g., " ")
            if (text || isTextSegment) {
              clone.appendChild(document.createTextNode(child.textContent || ""));
              hasTextNode = true;
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as Element;
            if (el.tagName === "STYLE" || el.tagName === "SLOT") continue;
            const childNode = cloneElement(el, node);
            if (childNode) {
              node.children.push(childNode);
              clone.appendChild(childNode.clone);
            }
          }
        }
        
        // For text segments, ensure there's always a text node for syncStyles to update
        if (isTextSegment && !hasTextNode) {
          clone.appendChild(document.createTextNode(""));
        }
      }
    }
    
    // Light DOM children - OPTIMIZATION: Use indexed loop for performance
    const lightChildren = srcEl.childNodes;
    const lightLen = lightChildren.length;
    for (let i = 0; i < lightLen; i++) {
      const child = lightChildren[i]!;
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) clone.appendChild(document.createTextNode(text));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childNode = cloneElement(child as Element, node);
        if (childNode) {
          node.children.push(childNode);
          clone.appendChild(childNode.clone);
        }
      }
    }
    
    return node;
  }
  
  const root = cloneElement(source, null);
  if (root) container.appendChild(root.clone);
  
  const syncState: SyncState = {
    tree: { root },
    nodeCount,
    canvasSourceMap,
    previousVisibleSet: new Set(),
    currentVisibleSet: new Set(),
  };
  
  // Sync styles in the same pass if timeMs is provided
  if (timeMs !== undefined && root) {
    syncStylesWithIndex(syncState, timeMs);
  }
  
  return {
    container,
    syncState,
  };
}

/**
 * Sync a single node's styles (extracted for reuse).
 * Now uses unified style syncing with clear separation of concerns:
 * 1. Canvas pixel refresh (if canvas clone)
 * 2. Unified CSS property sync (all elements)
 * 3. Content sync (text, input values)
 */
function syncNodeStyles(node: CloneNode): void {
  const { source, clone, isCanvasClone } = node;
  
  // 1. Canvas-specific: Refresh pixel content from shadow DOM
  if (isCanvasClone) {
    refreshCanvasPixels(node);
  }
  
  // 2. Unified: Sync ALL CSS properties using SYNC_PROPERTIES array
  // For canvas clones, pass content source (shadow canvas/img) for width/height
  const contentSource = isCanvasClone
    ? (source.shadowRoot?.querySelector("canvas") || source.shadowRoot?.querySelector("img") || undefined)
    : undefined;
  syncElementStyles(source, clone, contentSource);
  
  // 3. Element-specific: Sync text content and input values
  syncTextContent(source, clone);
  syncInputValue(source, clone);
}

// Performance instrumentation counters
interface SyncStats {
  nodesVisited: number;
  nodesCulledByParent: number;
  nodesCulledByTemporal: number;
  nodesProcessed: number;
  nodesFullSync: number;      // Newly visible nodes (full sync)
  nodesIncrementalSync: number; // Still visible nodes (incremental sync)
  nodesHidden: number;        // Newly hidden nodes
  indexQueryTimeMs: number;
  syncTimeMs: number;
}

let syncStats: SyncStats = {
  nodesVisited: 0,
  nodesCulledByParent: 0,
  nodesCulledByTemporal: 0,
  nodesProcessed: 0,
  nodesFullSync: 0,
  nodesIncrementalSync: 0,
  nodesHidden: 0,
  indexQueryTimeMs: 0,
  syncTimeMs: 0,
};

/**
 * Visibility delta between frames.
 * Used for incremental updates - only sync what changed.
 */
interface VisibilityDelta {
  nowVisible: Set<CloneNode>;    // Need full style sync + show
  stillVisible: Set<CloneNode>;  // Only sync animated properties (or skip if same time)
  nowHidden: Set<CloneNode>;     // Just set display:none
}

/**
 * Compute visibility delta between previous and current frame.
 */
function computeVisibilityDelta(
  previousSet: Set<CloneNode>,
  currentSet: Set<CloneNode>,
): VisibilityDelta {
  const nowVisible = new Set<CloneNode>();
  const stillVisible = new Set<CloneNode>();
  const nowHidden = new Set<CloneNode>();
  
  // Find nodes that became visible or stayed visible
  for (const node of currentSet) {
    if (previousSet.has(node)) {
      stillVisible.add(node);
    } else {
      nowVisible.add(node);
    }
  }
  
  // Find nodes that became hidden
  for (const node of previousSet) {
    if (!currentSet.has(node)) {
      nowHidden.add(node);
    }
  }
  
  return { nowVisible, stillVisible, nowHidden };
}

/**
 * Build visible set by recursive traversal with bounds checking.
 * Queries fresh bounds from source elements each time - bounds are computed
 * dynamically by timegroups based on composition mode.
 */
function buildVisibleSetRecursive(
  node: CloneNode,
  timeMs: number,
  visibleSet: Set<CloneNode>,
): void {
  const { children, source } = node;
  
  // Get fresh bounds from source element (not cached - timegroup bounds are dynamic)
  const bounds = getTemporalBounds(source);
  
  // Check if this node is visible at current time
  const isVisible = timeMs >= bounds.startMs && timeMs <= bounds.endMs;
  
  if (isVisible) {
    visibleSet.add(node);
    // Recurse to children
    for (const child of children) {
      buildVisibleSetRecursive(child, timeMs, visibleSet);
    }
  }
  // If not visible, skip entire subtree
}

/**
 * Sync styles with recursive visibility check and delta tracking.
 * 
 * DELTA TRACKING: Tracks visibility changes between frames to minimize work:
 * - nowVisible nodes: Full style sync + show
 * - stillVisible nodes: Incremental sync (source DOM may have changed)
 * - nowHidden nodes: Just hide (display:none)
 */
function syncStylesWithIndex(state: SyncState, timeMs: number): void {
  const queryStart = performance.now();
  
  // Build the set of visible nodes by recursive traversal
  const visibleSet = new Set<CloneNode>();
  if (state.tree.root) {
    buildVisibleSetRecursive(state.tree.root, timeMs, visibleSet);
  }
  
  // Compute delta from previous frame
  const delta = computeVisibilityDelta(state.previousVisibleSet, visibleSet);
  
  syncStats.indexQueryTimeMs = performance.now() - queryStart;
  
  // Now traverse the tree but use the delta for O(1) sync decisions
  const syncStart = performance.now();
  if (state.tree.root) {
    syncNodeWithDelta(state.tree.root, visibleSet, delta);
  }
  syncStats.syncTimeMs = performance.now() - syncStart;
  
  // Update state for next frame and expose current visible set
  state.previousVisibleSet = visibleSet;
  state.currentVisibleSet = visibleSet;
}

/**
 * Sync a node using visibility delta for incremental updates.
 * 
 * DELTA TRACKING optimization:
 * - nowVisible: Full style sync (element just appeared)
 * - stillVisible: Incremental sync (source DOM may have changed)
 * - nowHidden: Just hide the element
 * - Not in any set: Skip entirely (was already hidden)
 */
function syncNodeWithDelta(
  node: CloneNode,
  visibleSet: Set<CloneNode>,
  delta: VisibilityDelta,
): void {
  syncStats.nodesVisited++;
  
  const isVisible = visibleSet.has(node);
  
  if (!isVisible) {
    // Node is not visible - ALWAYS set display:none
    // This handles both "just became hidden" and "initial build with node outside time range"
    node.clone.style.display = "none";
    if (delta.nowHidden.has(node)) {
      syncStats.nodesHidden++;
    }
    // Already hidden nodes: skip (don't even recurse to children)
    syncStats.nodesCulledByTemporal++;
    return;
  }
  
  // Node is visible - determine sync strategy
  if (delta.nowVisible.has(node)) {
    // Just became visible - need full style sync
    syncNodeStyles(node);
    syncStats.nodesFullSync++;
  } else if (delta.stillVisible.has(node)) {
    // Was visible, still visible - still need to sync
    // Source DOM properties can change independently of time (input values, text, etc.)
    // TODO: Phase 5 could track property changes for smarter incremental sync
    syncNodeStyles(node);
    syncStats.nodesIncrementalSync++;
  }
  
  syncStats.nodesProcessed++;
  
  // Recurse to children
  for (const child of node.children) {
    syncNodeWithDelta(child, visibleSet, delta);
  }
}

/**
 * Legacy recursive sync (kept for comparison/fallback).
 * Returns early if the node is temporally culled, skipping ALL descendants.
 * @deprecated Use syncStylesWithIndex for better performance
 */
export function syncNodeRecursiveLegacy(node: CloneNode, timeMs: number): void {
  const { clone, children, bounds } = node;
  syncStats.nodesVisited++;
  
  // Temporal culling - check if this node is visible at current time
  // NOTE: Canvas clones now participate in temporal culling (lazy canvas copying).
  // Invalid bounds [0,0] are treated as [-Infinity, Infinity] by getTemporalBounds.
  {
    // OPTIMIZATION: Check if parent is already hidden to skip bounds computation
    const parent = clone.parentElement;
    if (parent instanceof HTMLElement) {
      // If parent has display:none, this element is already hidden - skip bounds check
      if (parent.style.display === "none") {
        clone.style.display = "none";
        syncStats.nodesCulledByParent++;
        return;
      }
    }
    
    // Use cached bounds from node instead of calling getTemporalBounds
    const { startMs, endMs } = bounds;
    if (timeMs < startMs || timeMs > endMs) {
      // Hide this element and BAIL OUT - skip all descendants automatically!
      clone.style.display = "none";
      syncStats.nodesCulledByTemporal++;
      return;
    }
  }
  
  // Sync this node's styles
  syncNodeStyles(node);
  syncStats.nodesProcessed++;
  
  // Recursively sync children
  for (const child of children) {
    syncNodeRecursiveLegacy(child, timeMs);
  }
}

/**
 * Sync all CSS properties from source elements to their clones.
 * Uses interval index for O(log n + k) visibility queries instead of O(n) traversal.
 * Uses delta tracking for incremental updates between frames.
 */
export function syncStyles(state: SyncState, timeMs: number): void {
  // Reset stats
  syncStats = {
    nodesVisited: 0,
    nodesCulledByParent: 0,
    nodesCulledByTemporal: 0,
    nodesProcessed: 0,
    nodesFullSync: 0,
    nodesIncrementalSync: 0,
    nodesHidden: 0,
    indexQueryTimeMs: 0,
    syncTimeMs: 0,
  };
  
  // Use interval-index-based sync with delta tracking
  syncStylesWithIndex(state, timeMs);
}

/**
 * Collect document styles for shadow DOM injection.
 */
export function collectDocumentStyles(): string {
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


// Backward-compatible aliases
export const syncStaticStyles = syncStyles;
export const syncAnimatedStyles = syncStyles;

/**
 * Override clip-path, opacity, and optionally transform on the root clone element.
 * The source may have these properties set for proxy mode or workbench scaling.
 * 
 * @param syncState - The sync state containing the clone tree
 * @param fullReset - If true, also resets opacity and transform (for capture operations)
 */
export function overrideRootCloneStyles(syncState: SyncState, fullReset: boolean = false): void {
  const rootClone = syncState.tree.root?.clone;
  if (!rootClone) return;
  
  rootClone.style.clipPath = "none";
  if (fullReset) {
    rootClone.style.opacity = "1";
    rootClone.style.transform = "none";
  }
}

/**
 * Create a live preview of a timegroup with a refresh function.
 * Used by EFWorkbench for the "computed" preview mode.
 * 
 * @param source - The source timegroup to preview
 * @returns Object with preview container and refresh function
 */
export function renderTimegroupPreview(source: Element): {
  container: HTMLDivElement;
  refresh: (timeMs?: number) => void;
} {
  const { container, syncState } = buildCloneStructure(source);
  
  // Initial style sync
  syncStyles(syncState, 0);
  
  return {
    container,
    refresh: (timeMs?: number) => {
      syncStyles(syncState, timeMs ?? 0);
    },
  };
}
