/**
 * Batched Reads strategy - read all computed styles first, then write all.
 * 
 * Hypothesis: The current implementation interleaves getComputedStyle reads
 * with style property writes, which causes layout thrashing. By batching
 * all reads first, we allow the browser to optimize style calculations.
 */

import type { SyncStrategy, SyncTiming, SyncState, EnhancedPair } from "../types.js";
import { createTiming } from "../Profiler.js";

/** Properties to sync from source to clone */
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

interface TemporalElement extends Element {
  startTimeMs?: number;
  endTimeMs?: number;
}

function isTemporal(el: Element): el is TemporalElement {
  return "startTimeMs" in el && "endTimeMs" in el;
}

interface EvaluatedPair {
  pair: EnhancedPair;
  visible: boolean;
  computedStyle: CSSStyleDeclaration | null;
  shadowCanvas: HTMLCanvasElement | null;
  shadowImg: HTMLImageElement | null;
  canvasCs: CSSStyleDeclaration | null;
  hostCs: CSSStyleDeclaration | null;
}

export const batchedReadsStrategy: SyncStrategy = {
  name: "batchedReads",
  description: "Read all computed styles first, then write all (avoid layout thrashing)",
  writeMechanism: "inline",

  sync(state: SyncState, timeMs: number): SyncTiming {
    const { pairs, visibilityCache } = state;
    const len = pairs.length;
    
    // Reset visibility
    visibilityCache.fill(1);

    // ========== PHASE 1: READ ALL (no writes) ==========
    const readStart = performance.now();
    
    const evaluations: EvaluatedPair[] = [];
    
    for (let i = 0; i < len; i++) {
      const pair = pairs[i]!;
      
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
          pair,
          visible: false,
          computedStyle: null,
          shadowCanvas: null,
          shadowImg: null,
          canvasCs: null,
          hostCs: null,
        });
        continue;
      }
      
      // Parent visibility check
      if (pair.parentIndex >= 0 && visibilityCache[pair.parentIndex] === 0) {
        visibilityCache[i] = 0;
        evaluations.push({
          pair,
          visible: false,
          computedStyle: null,
          shadowCanvas: null,
          shadowImg: null,
          canvasCs: null,
          hostCs: null,
        });
        continue;
      }
      
      visibilityCache[i] = 1;
      
      // Read computed styles (ALL reads happen here, no writes)
      if (pair.isCanvasClone) {
        const shadowCanvas = pair.source.shadowRoot?.querySelector("canvas") as HTMLCanvasElement | null;
        const shadowImg = pair.source.shadowRoot?.querySelector("img") as HTMLImageElement | null;
        
        let canvasCs: CSSStyleDeclaration | null = null;
        let hostCs: CSSStyleDeclaration | null = null;
        
        if (shadowCanvas) {
          canvasCs = getComputedStyle(shadowCanvas);
          hostCs = getComputedStyle(pair.source);
        } else if (shadowImg?.complete && shadowImg.naturalWidth > 0) {
          canvasCs = getComputedStyle(shadowImg);
          hostCs = getComputedStyle(pair.source);
        }
        
        evaluations.push({
          pair,
          visible: true,
          computedStyle: null,
          shadowCanvas,
          shadowImg,
          canvasCs,
          hostCs,
        });
      } else {
        let computedStyle: CSSStyleDeclaration | null = null;
        try {
          computedStyle = getComputedStyle(pair.source);
        } catch {}
        
        evaluations.push({
          pair,
          visible: true,
          computedStyle,
          shadowCanvas: null,
          shadowImg: null,
          canvasCs: null,
          hostCs: null,
        });
      }
    }
    
    const readMs = performance.now() - readStart;

    // ========== PHASE 2: WRITE ALL (no reads) ==========
    const writeStart = performance.now();
    
    for (let i = 0; i < len; i++) {
      const eval_ = evaluations[i]!;
      const { pair, visible, computedStyle, canvasCs, hostCs } = eval_;
      
      if (!visible) {
        pair.clone.style.display = "none";
        continue;
      }
      
      pair.clone.style.display = "block";
      
      if (pair.isCanvasClone && (canvasCs || hostCs)) {
        const s = (pair.clone as HTMLCanvasElement).style;
        if (hostCs) {
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
          s.backfaceVisibility = hostCs.backfaceVisibility;
          s.transformStyle = hostCs.transformStyle;
        }
        if (canvasCs) {
          s.width = canvasCs.width;
          s.height = canvasCs.height;
        }
      } else if (computedStyle) {
        const cloneStyle = pair.clone.style as any;
        const srcStyle = computedStyle as any;
        
        for (const prop of SYNC_PROPERTIES) {
          if (prop === "display") continue;
          const srcVal = srcStyle[prop];
          if (cloneStyle[prop] !== srcVal) {
            cloneStyle[prop] = srcVal;
          }
        }
        
        if (cloneStyle.animation !== "none") cloneStyle.animation = "none";
        if (cloneStyle.transition !== "none") cloneStyle.transition = "none";
      }
      
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
    
    for (let i = 0; i < len; i++) {
      const eval_ = evaluations[i]!;
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


