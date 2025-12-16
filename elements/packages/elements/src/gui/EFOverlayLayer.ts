import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { panZoomTransformContext } from "./panZoomTransformContext.js";
import type { PanZoomTransform } from "../elements/EFPanZoom.js";
import type { EFOverlayItem } from "./EFOverlayItem.js";

/**
 * Overlay layer container component.
 *
 * SIMPLE ARCHITECTURE:
 * - Runs a SINGLE RAF loop that updates everything every frame
 * - No change detection, no optimization, no delays
 * - Just: read transform → apply it → update all items → next frame
 *
 * Core responsibilities:
 * - Consumes PanZoom transform from context (if PanZoom is ancestor)
 * - Accepts transform via props as fallback (for sibling PanZoom)
 * - Applies translate-only transform (no scale) directly to host element
 * - Manages registered child EFOverlayItem components
 * - Updates all overlays every animation frame
 *
 * The transform is applied directly to the host element so that:
 * 1. getBoundingClientRect() returns the transformed position
 * 2. EFOverlayItem can use this rect for coordinate calculations
 */
@customElement("ef-overlay-layer")
export class EFOverlayLayer extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        position: absolute;
        inset: 0;
        pointer-events: none;
        transform-origin: 0 0;
      }
    `,
  ];

  @consume({ context: panZoomTransformContext, subscribe: true })
  panZoomTransformFromContext?: PanZoomTransform;

  /**
   * Pan/zoom transform as fallback for when context or sibling PanZoom is not available.
   * Primarily used for testing and standalone usage.
   */
  @property({ type: Object })
  panZoomTransform?: PanZoomTransform;

  // Track registered overlay items for coordinated updates
  private registeredItems = new Set<EFOverlayItem>();
  private rafId: number | null = null;

  /**
   * Register an overlay item for coordinated updates.
   * Called by EFOverlayItem in connectedCallback.
   */
  registerOverlayItem(item: EFOverlayItem) {
    this.registeredItems.add(item);
  }

  /**
   * Unregister an overlay item.
   * Called by EFOverlayItem in disconnectedCallback.
   */
  unregisterOverlayItem(item: EFOverlayItem) {
    this.registeredItems.delete(item);
  }

  /**
   * Single source of truth for reading the current transform.
   * Priority: context > sibling DOM read > prop > default
   */
  private readTransform(): PanZoomTransform {
    // 1. Context (synchronous, preferred)
    if (this.panZoomTransformFromContext) {
      return this.panZoomTransformFromContext;
    }

    // 2. Read directly from sibling PanZoom element
    const panZoomElement = this.parentElement?.querySelector(
      "ef-pan-zoom",
    ) as any;
    if (panZoomElement && typeof panZoomElement.x === "number") {
      const contentWrapper =
        panZoomElement.shadowRoot?.querySelector(".content-wrapper");
      const computedTransform =
        contentWrapper && window.getComputedStyle(contentWrapper).transform;

      // Parse scale from matrix(scaleX, skewY, skewX, scaleY, tx, ty)
      const matrixMatch = computedTransform?.match(/matrix\(([^)]+)\)/);
      const scale = matrixMatch
        ? parseFloat(matrixMatch[1].split(",")[0].trim())
        : (panZoomElement.scale ?? 1);

      return { x: panZoomElement.x ?? 0, y: panZoomElement.y ?? 0, scale };
    }

    // 3. Prop (for testing)
    if (this.panZoomTransform) {
      return this.panZoomTransform;
    }

    // 4. Default
    return { x: 0, y: 0, scale: 1 };
  }

  /**
   * Simple RAF loop: Update everything on every frame.
   */
  private startLoop() {
    const update = () => {
      const transform = this.readTransform();

      // Apply transform
      // If we're a child of panzoom (receiving context), we're inside the scaled content-wrapper
      // which already applies translate(x, y) scale(s). We should NOT apply our own translate
      // because the parent transform already handles the pan. Our getBoundingClientRect() will
      // naturally include the parent's transform.
      // If we're a sibling of panzoom, we need to apply the translate ourselves to match the pan.
      if (this.panZoomTransformFromContext) {
        // Child of panzoom - don't apply any transform, parent handles it
        this.style.transform = "none";
      } else {
        // Sibling of panzoom - apply translate directly to match panzoom's pan
        this.style.transform = `translate(${transform.x}px, ${transform.y}px)`;
      }

      // Update all overlay items
      for (const item of this.registeredItems) {
        item.updatePosition();
      }

      // Schedule next frame
      this.rafId = requestAnimationFrame(update);
    };

    this.rafId = requestAnimationFrame(update);
  }

  private stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.startLoop();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopLoop();
  }

  updated() {
    // Transform changes are handled by RAF loop
  }

  render() {
    // Simple slot - transform is applied to host element, not a wrapper
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-overlay-layer": EFOverlayLayer;
  }
}
