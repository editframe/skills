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

/** Set version of SYNC_PROPERTIES for O(1) validation lookups */
const SYNC_PROPERTIES_SET: Set<string> = new Set(SYNC_PROPERTIES);

/**
 * Validation state for property change detection.
 * Reset via resetPropertyValidation() at start of export.
 */
let _propertyValidationEnabled = false;
let _validationFrameCount = 0;
let _baselineSnapshot: Map<Element, Map<string, string>> | null = null;

export function enablePropertyValidation(): void {
  _propertyValidationEnabled = true;
  _validationFrameCount = 0;
  _baselineSnapshot = null;
}

export function disablePropertyValidation(): void {
  _propertyValidationEnabled = false;
  _validationFrameCount = 0;
  _baselineSnapshot = null;
}

export function resetPropertyValidation(): void {
  _validationFrameCount = 0;
  _baselineSnapshot = null;
}

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
  styleCache: Map<string, string>;  // Cache of previous style values for change detection
}

/** Tree-based sync state */
export interface CloneTree {
  root: CloneNode | null;
}

/** Legacy pair type (kept for backward compatibility) */
export type ElementPair = [source: Element, clone: HTMLElement];

/** Sync state with tree structure */
export interface SyncState {
  tree: CloneTree;
  nodeCount: number;  // Total number of nodes (for debugging/logging)
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
 * Build clone tree structure with minimal overhead.
 * Optionally syncs styles in the same pass if timeMs is provided.
 */
export function buildCloneStructure(source: Element, timeMs?: number): {
  container: HTMLDivElement;
  pairs: ElementPair[];
  syncState: SyncState;
} {
  const container = document.createElement("div");
  container.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%";
  
  // Collect pairs for legacy compatibility
  const legacyPairs: ElementPair[] = [];
  
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
        styleCache: new Map(),
      };
      legacyPairs.push([srcEl, node.clone]);
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
        // Copy initial CSS styles
        try {
          const canvasCs = getComputedStyle(shadowCanvas);
          const hostCs = getComputedStyle(srcEl);
          clone.style.position = hostCs.position;
          clone.style.top = hostCs.top;
          clone.style.right = hostCs.right;
          clone.style.bottom = hostCs.bottom;
          clone.style.left = hostCs.left;
          clone.style.margin = hostCs.margin;
          clone.style.zIndex = hostCs.zIndex;
          clone.style.transform = hostCs.transform;
          clone.style.transformOrigin = hostCs.transformOrigin;
          clone.style.opacity = hostCs.opacity;
          clone.style.visibility = hostCs.visibility;
          clone.style.width = canvasCs.width;
          clone.style.height = canvasCs.height;
          clone.style.display = "block";
          clone.style.animation = "none";
          clone.style.transition = "none";
        } catch {}
        
        const node: CloneNode = {
          source: srcEl,
          clone,
          children: [],
          isCanvasClone: true,
          styleCache: new Map(),
        };
        legacyPairs.push([srcEl, clone]);
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
        try {
          const imgCs = getComputedStyle(shadowImg);
          const hostCs = getComputedStyle(srcEl);
          clone.style.position = hostCs.position;
          clone.style.top = hostCs.top;
          clone.style.right = hostCs.right;
          clone.style.bottom = hostCs.bottom;
          clone.style.left = hostCs.left;
          clone.style.margin = hostCs.margin;
          clone.style.zIndex = hostCs.zIndex;
          clone.style.transform = hostCs.transform;
          clone.style.transformOrigin = hostCs.transformOrigin;
          clone.style.opacity = hostCs.opacity;
          clone.style.visibility = hostCs.visibility;
          clone.style.width = imgCs.width;
          clone.style.height = imgCs.height;
          clone.style.display = "block";
          clone.style.animation = "none";
          clone.style.transition = "none";
        } catch {}
        
        const node: CloneNode = {
          source: srcEl,
          clone,
          children: [],
          isCanvasClone: true,
          styleCache: new Map(),
        };
        legacyPairs.push([srcEl, clone]);
        return node;
      }
    }
    
    // Standard element clone
    const clone = document.createElement(isCustom ? "div" : srcEl.tagName.toLowerCase()) as HTMLElement;
    
    // Copy attributes
    for (const attr of srcEl.attributes) {
      const name = attr.name.toLowerCase();
      if (name === "id" || name.startsWith("on")) continue;
      if (isCustom && name !== "class" && !name.startsWith("data-")) continue;
      try { clone.setAttribute(attr.name, attr.value); } catch {}
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
      styleCache: new Map(),
    };
    legacyPairs.push([srcEl, clone]);
    
    // Shadow DOM children
    if (srcEl.shadowRoot) {
      // For caption elements and text segments, ALWAYS create a text node placeholder even if empty.
      // This allows syncStyles to update the text later when captions change.
      const isCaptionElement = srcEl.tagName === 'EF-CAPTIONS-ACTIVE-WORD' ||
                               srcEl.tagName === 'EF-CAPTIONS-BEFORE-ACTIVE-WORD' ||
                               srcEl.tagName === 'EF-CAPTIONS-AFTER-ACTIVE-WORD' ||
                               srcEl.tagName === 'EF-CAPTIONS-SEGMENT';
      const isTextSegment = srcEl.tagName === 'EF-TEXT-SEGMENT';
      let hasTextNode = false;
      
      for (const child of srcEl.shadowRoot.childNodes) {
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
    
    // Light DOM children
    for (const child of srcEl.childNodes) {
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
    nodeCount: legacyPairs.length,
  };
  
  // Sync styles in the same pass if timeMs is provided
  if (timeMs !== undefined && root) {
    syncNodeRecursive(root, timeMs);
  }
  
  return {
    container,
    pairs: legacyPairs,
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
          console.warn("[syncNodeStyles] Canvas draw failed:", e);
        }
      }
      
      try {
        const canvasCs = getComputedStyle(shadowCanvas);
        const hostCs = getComputedStyle(source);
        const s = canvas.style;
        const srcWidth = canvasCs.width;
        const srcHeight = canvasCs.height;
        const srcPosition = hostCs.position;
        const srcTop = hostCs.top;
        const srcLeft = hostCs.left;
        const srcRight = hostCs.right;
        const srcBottom = hostCs.bottom;
        const srcMargin = hostCs.margin;
        const srcTransform = hostCs.transform;
        const srcTransformOrigin = hostCs.transformOrigin;
        const srcOpacity = hostCs.opacity;
        const srcVisibility = hostCs.visibility;
        const srcZIndex = hostCs.zIndex;
        const srcBackfaceVisibility = hostCs.backfaceVisibility;
        const srcTransformStyle = hostCs.transformStyle;
        if (s.position !== srcPosition) s.position = srcPosition;
        if (s.top !== srcTop) s.top = srcTop;
        if (s.left !== srcLeft) s.left = srcLeft;
        if (s.right !== srcRight) s.right = srcRight;
        if (s.bottom !== srcBottom) s.bottom = srcBottom;
        if (s.margin !== srcMargin) s.margin = srcMargin;
        if (s.transform !== srcTransform) s.transform = srcTransform;
        if (s.transformOrigin !== srcTransformOrigin) s.transformOrigin = srcTransformOrigin;
        if (s.opacity !== srcOpacity) s.opacity = srcOpacity;
        if (s.visibility !== srcVisibility) s.visibility = srcVisibility;
        if (s.zIndex !== srcZIndex) s.zIndex = srcZIndex;
        if (s.width !== srcWidth) s.width = srcWidth;
        if (s.height !== srcHeight) s.height = srcHeight;
        if (s.backfaceVisibility !== srcBackfaceVisibility) s.backfaceVisibility = srcBackfaceVisibility;
        if (s.transformStyle !== srcTransformStyle) s.transformStyle = srcTransformStyle;
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
        const srcWidth = imgCs.width;
        const srcHeight = imgCs.height;
        const srcPosition = hostCs.position;
        const srcTop = hostCs.top;
        const srcLeft = hostCs.left;
        const srcRight = hostCs.right;
        const srcBottom = hostCs.bottom;
        const srcMargin = hostCs.margin;
        const srcTransform = hostCs.transform;
        const srcTransformOrigin = hostCs.transformOrigin;
        const srcOpacity = hostCs.opacity;
        const srcVisibility = hostCs.visibility;
        const srcZIndex = hostCs.zIndex;
        const srcBackfaceVisibility = hostCs.backfaceVisibility;
        const srcTransformStyle = hostCs.transformStyle;
        if (s.position !== srcPosition) s.position = srcPosition;
        if (s.top !== srcTop) s.top = srcTop;
        if (s.left !== srcLeft) s.left = srcLeft;
        if (s.right !== srcRight) s.right = srcRight;
        if (s.bottom !== srcBottom) s.bottom = srcBottom;
        if (s.margin !== srcMargin) s.margin = srcMargin;
        if (s.transform !== srcTransform) s.transform = srcTransform;
        if (s.transformOrigin !== srcTransformOrigin) s.transformOrigin = srcTransformOrigin;
        if (s.opacity !== srcOpacity) s.opacity = srcOpacity;
        if (s.visibility !== srcVisibility) s.visibility = srcVisibility;
        if (s.zIndex !== srcZIndex) s.zIndex = srcZIndex;
        if (s.width !== srcWidth) s.width = srcWidth;
        if (s.height !== srcHeight) s.height = srcHeight;
        if (s.backfaceVisibility !== srcBackfaceVisibility) s.backfaceVisibility = srcBackfaceVisibility;
        if (s.transformStyle !== srcTransformStyle) s.transformStyle = srcTransformStyle;
      } catch {}
    }
    // return;
  }
  
  // Regular element - sync CSS properties with cache-based change detection
  const cloneStyle = clone.style as any;
  const { styleCache } = node;
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
      
      // Skip if value hasn't changed from cache
      if (styleCache.get(camel) === strVal) continue;
      styleCache.set(camel, strVal);
      
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
      
      // Skip if value hasn't changed from cache
      if (styleCache.get(prop) === srcVal) continue;
      styleCache.set(prop, srcVal);
      
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
  
  // Disable animations/transitions to prevent re-animation (animations already finished above)
  if (cloneStyle.animation !== "none") cloneStyle.animation = "none";
  if (cloneStyle.transition !== "none") cloneStyle.transition = "none";
  
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

/**
 * Recursively sync a node and its children.
 * Returns early if the node is temporally culled, skipping ALL descendants.
 */
function syncNodeRecursive(node: CloneNode, timeMs: number): void {
  const { source, clone, children, isCanvasClone, styleCache } = node;
  
  // Temporal culling - check if this node is visible at current time
  // Canvas clones skip temporal check (ef-video may have [0,0] range before video loads)
  if (!isCanvasClone) {
    const { startMs, endMs } = getTemporalBounds(source);
    if (timeMs < startMs || timeMs > endMs) {
      // Hide this element and BAIL OUT - skip all descendants automatically!
      clone.style.display = "none";
      // Invalidate display cache so it gets restored when element comes back in range
      styleCache.delete("display");
      return;
    }
  }
  
  // Sync this node's styles
  syncNodeStyles(node);
  
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
  if (state.tree.root) {
    syncNodeRecursive(state.tree.root, timeMs);
  }
  
  // Property validation: detect unexpected property changes
  if (_propertyValidationEnabled) {
    validatePropertyChanges(state);
  }
}

/**
 * Captures a snapshot of all CSS properties for all source elements.
 */
function capturePropertySnapshot(state: SyncState): Map<Element, Map<string, string>> {
  const snapshot = new Map<Element, Map<string, string>>();
  
  function captureNode(node: CloneNode): void {
    const props = new Map<string, string>();
    try {
      const cs = getComputedStyle(node.source);
      for (const prop of SYNC_PROPERTIES) {
        props.set(prop, (cs as any)[prop] ?? "");
      }
    } catch {}
    snapshot.set(node.source, props);
    
    for (const child of node.children) {
      captureNode(child);
    }
  }
  
  if (state.tree.root) {
    captureNode(state.tree.root);
  }
  
  return snapshot;
}

/**
 * Validates that only expected properties have changed since baseline.
 * Throws if any unexpected property changed.
 */
function validatePropertyChanges(state: SyncState): void {
  _validationFrameCount++;
  
  // Capture baseline on first frame
  if (_baselineSnapshot === null) {
    _baselineSnapshot = capturePropertySnapshot(state);
    return;
  }
  
  // Only validate every 30 frames (expensive operation)
  if (_validationFrameCount % 30 !== 0) {
    return;
  }
  
  const currentSnapshot = capturePropertySnapshot(state);
  const violations: string[] = [];
  
  for (const [element, baselineProps] of _baselineSnapshot) {
    const currentProps = currentSnapshot.get(element);
    if (!currentProps) continue;
    
    for (const [prop, baselineValue] of baselineProps) {
      const currentValue = currentProps.get(prop) ?? "";
      
      // Skip if value unchanged
      if (baselineValue === currentValue) continue;
      
      if (!SYNC_PROPERTIES_SET.has(prop)) {
        const elementId = element.id || element.tagName;
        violations.push(
          `[${elementId}] ${prop}: "${baselineValue}" → "${currentValue}"`
        );
      }
    }
  }
  
  if (violations.length > 0) {
    const message = [
      `\n⚠️  UNEXPECTED PROPERTY CHANGES at frame ${_validationFrameCount}:`,
      `Properties not in SYNC_PROPERTIES changed during export.`,
      ``,
      `Violations (${violations.length}):`,
      ...violations.slice(0, 20).map(v => `  ${v}`),
      violations.length > 20 ? `  ... and ${violations.length - 20} more` : "",
    ].join("\n");
    
    throw new Error(message);
  }
}

/**
 * Legacy sync function for backwards compatibility.
 */
export function syncAllStyles(pairs: ElementPair[], syncState?: SyncState, timeMs?: number): void {
  if (syncState) {
    syncStyles(syncState, timeMs ?? 0);
    return;
  }
  
  // Fallback for legacy callers without syncState
  for (let i = 0; i < pairs.length; i++) {
    const [src, clone] = pairs[i]!;
    
    let cs: CSSStyleDeclaration;
    try {
      cs = getComputedStyle(src);
    } catch { continue; }
    
    const cloneStyle = clone.style as any;
    const srcStyle = cs as any;
    
    if (srcStyle.display === "none") {
      if (cloneStyle.display !== "none") cloneStyle.display = "none";
      continue;
    }
    
    for (const prop of SYNC_PROPERTIES) {
      if (prop === "display") continue;
      const srcVal = srcStyle[prop];
      if (cloneStyle[prop] !== srcVal) cloneStyle[prop] = srcVal;
    }
    if (cloneStyle.animation !== "none") cloneStyle.animation = "none";
    if (cloneStyle.transition !== "none") cloneStyle.transition = "none";
    
    const srcTextNode = src.childNodes[0];
    const cloneTextNode = clone.childNodes[0];
    if (srcTextNode?.nodeType === Node.TEXT_NODE && cloneTextNode?.nodeType === Node.TEXT_NODE) {
      const srcText = srcTextNode.textContent || "";
      if (cloneTextNode.textContent !== srcText) cloneTextNode.textContent = srcText;
    }
    if (src instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
      const srcVal = src.value;
      if (clone.value !== srcVal) {
        clone.value = srcVal;
        clone.setAttribute("value", srcVal);
      }
    }
    
    // Canvas refresh
    if (clone instanceof HTMLCanvasElement && src.shadowRoot) {
      const shadowCanvas = src.shadowRoot.querySelector("canvas");
      if (shadowCanvas && shadowCanvas.width > 0 && shadowCanvas.height > 0) {
        const ctx = clone.getContext("2d");
        if (ctx) {
          if (clone.width !== shadowCanvas.width) clone.width = shadowCanvas.width;
          if (clone.height !== shadowCanvas.height) clone.height = shadowCanvas.height;
          ctx.clearRect(0, 0, clone.width, clone.height);
          try { ctx.drawImage(shadowCanvas, 0, 0); } catch {}
        }
      }
    }
  }
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
