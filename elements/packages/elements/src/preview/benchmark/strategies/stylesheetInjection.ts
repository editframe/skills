/**
 * Stylesheet Injection strategy - inject CSS rules via CSSOM.
 * 
 * Hypothesis: Instead of N×40 inline style writes, we can inject
 * CSS rules targeting data-clone-id attributes. A single replaceSync()
 * call may be faster than many individual style property assignments.
 */

import type { SyncStrategy, SyncTiming, SyncState } from "../types.js";
type EnhancedPair = any;
import { createTiming } from "../Profiler.js";

/** Properties to include in injected CSS rules - must match SYNC_PROPERTIES in renderTimegroupPreview */
const CSS_PROPERTIES = [
  // Visibility & display
  "display", "visibility", "opacity",
  // Position & layout
  "position", "top", "right", "bottom", "left", "z-index",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  // Flexbox
  "flex", "flex-flow", "justify-content", "align-items", "align-content", "align-self", "gap",
  // Grid
  "grid-template", "grid-column", "grid-row", "grid-area",
  // Box model
  "margin", "padding", "box-sizing",
  "border", "border-top", "border-right", "border-bottom", "border-left", "border-radius",
  // Visual
  "background", "color", "box-shadow", "filter", "backdrop-filter", "clip-path",
  // Text
  "font", "text-align", "text-decoration", "text-transform",
  "letter-spacing", "white-space", "text-overflow", "line-height",
  // Transform (including 3D)
  "transform", "transform-origin", "transform-style",
  "perspective", "perspective-origin", "backface-visibility",
  // Misc
  "cursor", "pointer-events", "user-select", "overflow",
] as const;

interface TemporalElement extends Element {
  startTimeMs?: number;
  endTimeMs?: number;
}

function isTemporal(el: Element): el is TemporalElement {
  return "startTimeMs" in el && "endTimeMs" in el;
}

interface EvaluatedPair {
  pairIndex: number;
  pair: EnhancedPair;
  visible: boolean;
  cssText: string;
  shadowCanvas: HTMLCanvasElement | null;
  shadowImg: HTMLImageElement | null;
}

/** Convert kebab-case to camelCase for reading from CSSStyleDeclaration */
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/** Build CSS text from computed style */
function buildCssText(cs: CSSStyleDeclaration): string {
  const props: string[] = [];
  for (const prop of CSS_PROPERTIES) {
    const camelProp = kebabToCamel(prop);
    const value = (cs as any)[camelProp];
    if (value) {
      props.push(`${prop}: ${value}`);
    }
  }
  // Force no animations
  props.push("animation: none");
  props.push("transition: none");
  return props.join("; ");
}

/** Weak map to cache stylesheets per SyncState */
const stylesheetCache = new WeakMap<SyncState, CSSStyleSheet>();

/** Get or create stylesheet for a SyncState */
function getStylesheet(state: SyncState): CSSStyleSheet {
  let sheet = stylesheetCache.get(state);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    stylesheetCache.set(state, sheet);
  }
  return sheet;
}

export const stylesheetInjectionStrategy: SyncStrategy = {
  name: "stylesheetInjection",
  description: "Inject CSS rules via data-clone-id selectors (single CSSOM update)",
  writeMechanism: "stylesheet",

  sync(state: SyncState, timeMs: number): SyncTiming {
    const { pairs, visibilityCache } = state as any;
    const len = pairs.length;
    
    // Reset visibility
    visibilityCache.fill(1);

    // ========== PHASE 1: READ ALL + BUILD RULES ==========
    const readStart = performance.now();
    
    const evaluations: EvaluatedPair[] = [];
    
    for (let i = 0; i < len; i++) {
      const pair = pairs[i]!;
      
      // Ensure clone has data-clone-id attribute (set once)
      if (!pair.clone.hasAttribute("data-clone-id")) {
        pair.clone.setAttribute("data-clone-id", String(i));
      }
      
      // Read temporal values
      const temporal = isTemporal(pair.source) ? pair.source : null;
      let startMs = temporal?.startTimeMs ?? pair.startMs;
      let endMs = temporal?.endTimeMs ?? pair.endMs;
      if (endMs <= startMs) {
        startMs = -Infinity;
        endMs = Infinity;
      }
      
      // Temporal culling
      if (timeMs < startMs || timeMs > endMs) {
        visibilityCache[i] = 0;
        evaluations.push({
          pairIndex: i,
          pair,
          visible: false,
          cssText: "display: none",
          shadowCanvas: null,
          shadowImg: null,
        });
        continue;
      }
      
      // Parent visibility check
      if (pair.parentIndex >= 0 && visibilityCache[pair.parentIndex] === 0) {
        visibilityCache[i] = 0;
        evaluations.push({
          pairIndex: i,
          pair,
          visible: false,
          cssText: "display: none",
          shadowCanvas: null,
          shadowImg: null,
        });
        continue;
      }
      
      visibilityCache[i] = 1;
      
      // Read computed styles and build CSS text
      if (pair.isCanvasClone) {
        const shadowCanvas = pair.source.shadowRoot?.querySelector("canvas") as HTMLCanvasElement | null;
        const shadowImg = pair.source.shadowRoot?.querySelector("img") as HTMLImageElement | null;
        
        let cssText = "display: block";
        
        if (shadowCanvas) {
          const canvasCs = getComputedStyle(shadowCanvas);
          const hostCs = getComputedStyle(pair.source);
          cssText = `display: block; ${buildCssText(hostCs)}; width: ${canvasCs.width}; height: ${canvasCs.height}`;
        } else if (shadowImg?.complete && shadowImg.naturalWidth > 0) {
          const imgCs = getComputedStyle(shadowImg);
          const hostCs = getComputedStyle(pair.source);
          cssText = `display: block; ${buildCssText(hostCs)}; width: ${imgCs.width}; height: ${imgCs.height}`;
        }
        
        evaluations.push({
          pairIndex: i,
          pair,
          visible: true,
          cssText,
          shadowCanvas,
          shadowImg,
        });
      } else {
        let cssText = "display: block";
        try {
          const cs = getComputedStyle(pair.source);
          cssText = `display: block; ${buildCssText(cs)}`;
        } catch {}
        
        evaluations.push({
          pairIndex: i,
          pair,
          visible: true,
          cssText,
          shadowCanvas: null,
          shadowImg: null,
        });
      }
    }
    
    const readMs = performance.now() - readStart;

    // ========== PHASE 2: SINGLE CSSOM UPDATE ==========
    const writeStart = performance.now();
    
    // Build all rules
    const rules = evaluations.map(
      eval_ => `[data-clone-id="${eval_.pairIndex}"] { ${eval_.cssText} }`
    );
    
    // Single stylesheet update
    const sheet = getStylesheet(state);
    sheet.replaceSync(rules.join("\n"));
    
    // Ensure stylesheet is adopted (idempotent)
    if (!document.adoptedStyleSheets.includes(sheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    
    // CRITICAL: Also apply inline styles as fallback for SVG foreignObject serialization.
    // The adopted stylesheet doesn't get serialized into the SVG, so elements need inline
    // styles for the foreignObject path to work correctly.
    // For the native drawElementImage path, this is redundant but harmless.
    for (const eval_ of evaluations) {
      const { pair, visible, cssText } = eval_;
      
      // Apply cssText as inline style (for foreignObject serialization)
      pair.clone.style.cssText = cssText;
      
      if (!visible) continue;
      
      // Sync text content
      const srcTextNode = pair.source.childNodes[0];
      const cloneTextNode = pair.clone.childNodes[0];
      if (srcTextNode?.nodeType === Node.TEXT_NODE && cloneTextNode?.nodeType === Node.TEXT_NODE) {
        const srcText = srcTextNode.textContent || "";
        if (cloneTextNode.textContent !== srcText) {
          cloneTextNode.textContent = srcText;
        }
      }
      
      // Sync input value
      if (pair.source instanceof HTMLInputElement) {
        const srcVal = pair.source.value;
        const cloneInput = pair.clone as HTMLInputElement;
        if (cloneInput.value !== srcVal) {
          cloneInput.value = srcVal;
          cloneInput.setAttribute("value", srcVal);
        }
      }
    }
    
    const writeMs = performance.now() - writeStart;

    // ========== PHASE 3: COPY CANVAS PIXELS ==========
    const copyStart = performance.now();
    
    for (const eval_ of evaluations) {
      if (!eval_.visible || !eval_.pair.isCanvasClone) continue;
      
      const canvas = eval_.pair.clone as HTMLCanvasElement;
      const { shadowCanvas, shadowImg } = eval_;
      
      if (shadowCanvas) {
        canvas.width = shadowCanvas.width;
        canvas.height = shadowCanvas.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(shadowCanvas, 0, 0);
        }
      } else if (shadowImg?.complete && shadowImg.naturalWidth > 0) {
        canvas.width = shadowImg.naturalWidth;
        canvas.height = shadowImg.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          try {
            ctx.drawImage(shadowImg, 0, 0);
          } catch {}
        }
      }
    }
    
    const copyMs = performance.now() - copyStart;

    return createTiming(readMs, writeMs, copyMs, len);
  },
};

