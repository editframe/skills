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
  "font", "textAlign", "textDecoration", "textTransform",
  "letterSpacing", "whiteSpace", "textOverflow", "lineHeight",
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
  type TemporalElement,
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
}

/** Tree-based sync state */
export interface CloneTree {
  root: CloneNode | null;
}

/** Sync state with tree structure */
export interface SyncState {
  tree: CloneTree;
  nodeCount: number;  // Total number of nodes (for debugging/logging)
  /** Maps clone canvases to their original source elements (ef-video, ef-image, etc.) */
  canvasSourceMap: WeakMap<HTMLCanvasElement, Element>;
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
 * Helper to copy styles from host and content elements to a canvas clone.
 * Reduces code duplication for shadow canvas and shadow img cases.
 */
function copyCanvasCloneStyles(
  clone: HTMLCanvasElement,
  hostCs: CSSStyleDeclaration,
  contentCs: CSSStyleDeclaration
): void {
  const s = clone.style;
  s.position = hostCs.position;
  s.top = hostCs.top;
  s.right = hostCs.right;
  s.bottom = hostCs.bottom;
  s.left = hostCs.left;
  s.margin = hostCs.margin;
  s.zIndex = hostCs.zIndex;
  s.transform = hostCs.transform;
  s.transformOrigin = hostCs.transformOrigin;
  s.opacity = hostCs.opacity;
  s.visibility = hostCs.visibility;
  s.width = contentCs.width;
  s.height = contentCs.height;
  s.display = "block";
  s.animation = "none";
  s.transition = "none";
}

/**
 * Build clone tree structure with minimal overhead.
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
  
  function cloneElement(srcEl: Element): CloneNode | null {
    if (SKIP_TAGS.has(srcEl.tagName)) return null;
    
    // SVG - clone entire subtree (no children tracking needed)
    if (srcEl instanceof SVGElement) {
      const svgClone = srcEl.cloneNode(true) as SVGElement;
      const node: CloneNode = {
        source: srcEl,
        clone: svgClone as unknown as HTMLElement,
        children: [],
        isCanvasClone: false,
      };
      nodeCount++;
      return node;
    }
    
    // Canvas - copy pixels
    if (srcEl instanceof HTMLCanvasElement) {
      const canvas = document.createElement("canvas");
      canvas.width = srcEl.width;
      canvas.height = srcEl.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        try { ctx.drawImage(srcEl, 0, 0); } catch {}
      }
      // Raw canvas elements don't need style syncing, just return clone
      // return null;
    }
    
    // Custom elements with shadow canvas (e.g., ef-video, ef-image)
    const isCustom = srcEl.tagName.includes("-");
    if (isCustom && srcEl.shadowRoot) {
      const shadowCanvas = srcEl.shadowRoot.querySelector("canvas");
      if (shadowCanvas) {
        const clone = document.createElement("canvas");
        clone.width = shadowCanvas.width || srcEl.clientWidth;
        clone.height = shadowCanvas.height || srcEl.clientHeight;
        // Mark ef-image canvases to preserve transparency (use PNG instead of JPEG)
        // ef-video doesn't need this since videos don't have transparency
        if (srcEl.tagName === "EF-IMAGE" || srcEl.tagName === "EF-WAVEFORM") {
          clone.dataset.preserveAlpha = "true";
        }
        
        const ctx = clone.getContext("2d");
        if (ctx) {
          try { ctx.drawImage(shadowCanvas, 0, 0); } catch {}
        }
        
        // Copy initial CSS styles - OPTIMIZATION: Cache getComputedStyle results
        try {
          const hostCs = getComputedStyle(srcEl);
          const canvasCs = getComputedStyle(shadowCanvas);
          copyCanvasCloneStyles(clone, hostCs, canvasCs);
        } catch {}
        
        // Map clone canvas to source element for RenderContext caching
        canvasSourceMap.set(clone, srcEl);
        
        const node: CloneNode = {
          source: srcEl,
          clone,
          children: [],
          isCanvasClone: true,
        };
        nodeCount++;
        return node;
      }
      
      const shadowImg = srcEl.shadowRoot.querySelector("img");
      if (shadowImg?.complete && shadowImg.naturalWidth > 0) {
        const clone = document.createElement("canvas");
        clone.width = shadowImg.naturalWidth;
        clone.height = shadowImg.naturalHeight;
        // Mark as image-sourced canvas to preserve transparency (use PNG instead of JPEG)
        clone.dataset.preserveAlpha = "true";
        const ctx = clone.getContext("2d");
        if (ctx) {
          try { ctx.drawImage(shadowImg, 0, 0); } catch {}
        }
        
        // Copy initial CSS styles - OPTIMIZATION: Cache getComputedStyle results
        try {
          const hostCs = getComputedStyle(srcEl);
          const imgCs = getComputedStyle(shadowImg);
          copyCanvasCloneStyles(clone, hostCs, imgCs);
        } catch {}
        
        // Map clone canvas to source element for RenderContext caching
        canvasSourceMap.set(clone, srcEl);
        
        const node: CloneNode = {
          source: srcEl,
          clone,
          children: [],
          isCanvasClone: true,
        };
        nodeCount++;
        return node;
      }
    }
    
    // Standard element clone
    const clone = document.createElement(isCustom ? "div" : srcEl.tagName.toLowerCase()) as HTMLElement;
    
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
    };
    nodeCount++;
    
    // Shadow DOM children - OPTIMIZATION: Early exit if no childNodes
    if (srcEl.shadowRoot) {
      const shadowChildren = srcEl.shadowRoot.childNodes;
      const shadowLen = shadowChildren.length;
      if (shadowLen > 0) {
        // For caption elements and text segments, ALWAYS create a text node placeholder even if empty.
        // This allows syncStyles to update the text later when captions change.
        const isCaptionElement = srcEl.tagName === 'EF-CAPTIONS-ACTIVE-WORD' ||
                                 srcEl.tagName === 'EF-CAPTIONS-BEFORE-ACTIVE-WORD' ||
                                 srcEl.tagName === 'EF-CAPTIONS-AFTER-ACTIVE-WORD' ||
                                 srcEl.tagName === 'EF-CAPTIONS-SEGMENT';
        const isTextSegment = srcEl.tagName === 'EF-TEXT-SEGMENT';
        let hasTextNode = false;
        
        for (let i = 0; i < shadowLen; i++) {
          const child = shadowChildren[i]!;
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim();
            // Always include text for text segments (even if whitespace-only, e.g., " ")
            if (text || isCaptionElement || isTextSegment) {
              clone.appendChild(document.createTextNode(child.textContent || ""));
              hasTextNode = true;
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as Element;
            if (el.tagName === "STYLE" || el.tagName === "SLOT") continue;
            const childNode = cloneElement(el);
            if (childNode) {
              node.children.push(childNode);
              clone.appendChild(childNode.clone);
            }
          }
        }
        
        // For caption elements, ensure there's always a text node for syncStyles to update
        if (isCaptionElement && !hasTextNode) {
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
        const childNode = cloneElement(child as Element);
        if (childNode) {
          node.children.push(childNode);
          clone.appendChild(childNode.clone);
        }
      }
    }
    
    return node;
  }
  
  const root = cloneElement(source);
  if (root) container.appendChild(root.clone);
  
  const syncState: SyncState = {
    tree: { root },
    nodeCount,
    canvasSourceMap,
  };
  
  // Sync styles in the same pass if timeMs is provided
  if (timeMs !== undefined && root) {
    syncNodeRecursive(root, timeMs);
  }
  
  return {
    container,
    syncState,
  };
}

/**
 * Sync a single node's styles (extracted for reuse).
 */
function syncNodeStyles(node: CloneNode): void {
  const { source, clone, isCanvasClone } = node;
  
  // Canvas clone - refresh pixels AND sync CSS styles
  if (isCanvasClone) {
    const canvas = clone as HTMLCanvasElement;
    const shadowCanvas = source.shadowRoot?.querySelector("canvas");
    const shadowImg = source.shadowRoot?.querySelector("img");
    
    if (shadowCanvas) {
      if (canvas.width !== shadowCanvas.width) canvas.width = shadowCanvas.width;
      if (canvas.height !== shadowCanvas.height) canvas.height = shadowCanvas.height;
      
      const ctx = canvas.getContext("2d");
      if (ctx && shadowCanvas.width > 0 && shadowCanvas.height > 0) {
        try {
          // Clear canvas before drawing to ensure clean refresh
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(shadowCanvas, 0, 0);
        } catch (e) {
          // Canvas draw can fail if source is in invalid state - log and continue
          logger.warn("[syncNodeStyles] Canvas draw failed:", e);
        }
      }
      
      try {
        const canvasCs = getComputedStyle(shadowCanvas);
        const hostCs = getComputedStyle(source);
        const s = canvas.style;
        
        // Browser optimizes redundant style writes internally
        s.position = hostCs.position;
        s.top = hostCs.top;
        s.left = hostCs.left;
        s.right = hostCs.right;
        s.bottom = hostCs.bottom;
        s.margin = hostCs.margin;
        s.transform = hostCs.transform;
        s.transformOrigin = hostCs.transformOrigin;
        s.opacity = hostCs.opacity;
        s.visibility = hostCs.visibility;
        s.zIndex = hostCs.zIndex;
        s.width = canvasCs.width;
        s.height = canvasCs.height;
        s.backfaceVisibility = hostCs.backfaceVisibility;
        s.transformStyle = hostCs.transformStyle;
      } catch {}
    } else if (shadowImg?.complete && shadowImg.naturalWidth > 0) {
      if (canvas.width !== shadowImg.naturalWidth) canvas.width = shadowImg.naturalWidth;
      if (canvas.height !== shadowImg.naturalHeight) canvas.height = shadowImg.naturalHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear canvas before drawing to ensure clean refresh
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        try { ctx.drawImage(shadowImg, 0, 0); } catch {}
      }
      
      try {
        const imgCs = getComputedStyle(shadowImg);
        const hostCs = getComputedStyle(source);
        const s = canvas.style;
        
        // Browser optimizes redundant style writes internally
        s.position = hostCs.position;
        s.top = hostCs.top;
        s.left = hostCs.left;
        s.right = hostCs.right;
        s.bottom = hostCs.bottom;
        s.margin = hostCs.margin;
        s.transform = hostCs.transform;
        s.transformOrigin = hostCs.transformOrigin;
        s.opacity = hostCs.opacity;
        s.visibility = hostCs.visibility;
        s.zIndex = hostCs.zIndex;
        s.width = imgCs.width;
        s.height = imgCs.height;
        s.backfaceVisibility = hostCs.backfaceVisibility;
        s.transformStyle = hostCs.transformStyle;
      } catch {}
    }
    // return;
  }
  
  // Regular element - sync CSS properties directly (browser optimizes redundant writes)
  const cloneStyle = clone.style as any;
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
        const targetDisplay = strVal === "none" ? "block" : strVal;
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
      
      if (prop === "display") {
        const targetDisplay = srcVal === "none" ? "block" : srcVal;
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
  
  // Disable animations/transitions to prevent re-animation (browser optimizes redundant writes)
  cloneStyle.animation = "none";
  cloneStyle.transition = "none";
  
  // Sync text content from light DOM
  const srcTextNode = source.childNodes[0];
  const cloneTextNode = clone.childNodes[0];
  if (srcTextNode?.nodeType === Node.TEXT_NODE && cloneTextNode?.nodeType === Node.TEXT_NODE) {
    const srcText = srcTextNode.textContent || "";
    if (cloneTextNode.textContent !== srcText) cloneTextNode.textContent = srcText;
  }
  
  // Sync text content from shadow DOM (for caption elements that render text in shadow DOM)
  // Only check specific caption elements - checking every element's shadowRoot is expensive
  const tagName = (source as HTMLElement).tagName;
  if (tagName && (
    tagName === 'EF-CAPTIONS-ACTIVE-WORD' ||
    tagName === 'EF-CAPTIONS-BEFORE-ACTIVE-WORD' ||
    tagName === 'EF-CAPTIONS-AFTER-ACTIVE-WORD' ||
    tagName === 'EF-CAPTIONS-SEGMENT'
  )) {
    const srcShadowRoot = (source as HTMLElement).shadowRoot;
    if (srcShadowRoot && !srcTextNode) {
      // Collect ALL text nodes from shadow root (may be multiple due to Lit rendering)
      // Concatenate them to get the complete text content
      let srcShadowText = "";
      for (const srcChild of srcShadowRoot.childNodes) {
        if (srcChild.nodeType === Node.TEXT_NODE) {
          srcShadowText += srcChild.textContent || "";
        }
      }
      
      // Find or create text node in clone
      // For caption elements, there should be exactly one text node (created in buildCloneStructure)
      let cloneTextNode: Text | null = null;
      for (const cloneChild of clone.childNodes) {
        if (cloneChild.nodeType === Node.TEXT_NODE) {
          cloneTextNode = cloneChild as Text;
          break;
        }
      }
      
      // Create text node if it doesn't exist (shouldn't happen with fixed buildCloneStructure)
      if (!cloneTextNode) {
        cloneTextNode = document.createTextNode(srcShadowText);
        clone.appendChild(cloneTextNode);
      } else if (cloneTextNode.textContent !== srcShadowText) {
        // Update text content if it has changed
        cloneTextNode.textContent = srcShadowText;
      }
    }
  }
  
  // Sync input value
  if (source instanceof HTMLInputElement) {
    const srcVal = source.value;
    const cloneInput = clone as HTMLInputElement;
    if (cloneInput.value !== srcVal) {
      cloneInput.value = srcVal;
      cloneInput.setAttribute("value", srcVal);
    }
  }
}

// Performance instrumentation counters
interface SyncStats {
  nodesVisited: number;
  nodesCulledByParent: number;
  nodesCulledByTemporal: number;
  nodesProcessed: number;
}

let syncStats: SyncStats = {
  nodesVisited: 0,
  nodesCulledByParent: 0,
  nodesCulledByTemporal: 0,
  nodesProcessed: 0,
};

/**
 * Recursively sync a node and its children.
 * Returns early if the node is temporally culled, skipping ALL descendants.
 */
function syncNodeRecursive(node: CloneNode, timeMs: number): void {
  const { source, clone, children, isCanvasClone } = node;
  syncStats.nodesVisited++;
  
  // Temporal culling - check if this node is visible at current time
  // Canvas clones skip temporal check (ef-video may have [0,0] range before video loads)
  if (!isCanvasClone) {
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
    
    const { startMs, endMs } = getTemporalBounds(source);
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
    syncNodeRecursive(child, timeMs);
  }
}

/**
 * Sync all CSS properties from source elements to their clones.
 * Uses recursive tree traversal with early bailout for temporal culling.
 */
export function syncStyles(state: SyncState, timeMs: number): void {
  // Reset stats
  syncStats = {
    nodesVisited: 0,
    nodesCulledByParent: 0,
    nodesCulledByTemporal: 0,
    nodesProcessed: 0,
  };
  
  if (state.tree.root) {
    syncNodeRecursive(state.tree.root, timeMs);
  }
  
  // Log performance stats
  const totalCulled = syncStats.nodesCulledByParent + syncStats.nodesCulledByTemporal;
  console.log(
    `[syncStyles] Nodes: visited=${syncStats.nodesVisited}, ` +
    `culled=${totalCulled} (parent=${syncStats.nodesCulledByParent}, temporal=${syncStats.nodesCulledByTemporal}), ` +
    `processed=${syncStats.nodesProcessed}`
  );
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
