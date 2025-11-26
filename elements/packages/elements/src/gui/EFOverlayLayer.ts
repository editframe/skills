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
   * Simple RAF loop: Update everything on every frame.
   * No change detection, no optimization, no delays.
   * Just read transform, apply it, update all items.
   */
  private startLoop() {
    const update = () => {
      // Read transform - prefer direct DOM read to avoid React prop lag
      let transform: PanZoomTransform;

      if (this.panZoomTransformFromContext) {
        // Context is synchronous, use it
        transform = this.panZoomTransformFromContext;
      } else {
        // For sibling architecture, read DIRECTLY from PanZoom element
        const container = this.parentElement;
        const panZoomElement = container?.querySelector("ef-pan-zoom") as any;
        if (panZoomElement && typeof panZoomElement.x === "number") {
          // Read the actual rendered transform from the content wrapper
          // This ensures we're in sync with what's actually on screen
          const contentWrapper =
            panZoomElement.shadowRoot?.querySelector(".content-wrapper");
          if (contentWrapper) {
            const computedTransform =
              window.getComputedStyle(contentWrapper).transform;
            // Parse transform matrix to get actual scale
            // Transform matrix format: matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
            if (computedTransform && computedTransform !== "none") {
              const values = computedTransform
                .match(/matrix\(([^)]+)\)/)?.[1]
                .split(",")
                .map((v) => parseFloat(v.trim()));
              if (values && values.length >= 1) {
                // Use scaleX (first value) as the scale
                const computedScale = values[0];
                transform = {
                  x: panZoomElement.x ?? 0,
                  y: panZoomElement.y ?? 0,
                  scale: computedScale,
                };
              } else {
                transform = {
                  x: panZoomElement.x ?? 0,
                  y: panZoomElement.y ?? 0,
                  scale: panZoomElement.scale ?? 1,
                };
              }
            } else {
              transform = {
                x: panZoomElement.x ?? 0,
                y: panZoomElement.y ?? 0,
                scale: panZoomElement.scale ?? 1,
              };
            }
          } else {
            transform = {
              x: panZoomElement.x ?? 0,
              y: panZoomElement.y ?? 0,
              scale: panZoomElement.scale ?? 1,
            };
          }
        } else if (this.panZoomTransform) {
          // Fallback to prop (for testing and standalone usage)
          transform = this.panZoomTransform;
        } else {
          // Default (no PanZoom found)
          transform = { x: 0, y: 0, scale: 1 };
        }
      }

      // DEBUG: Log scale changes
      if (Math.abs(transform.scale - (this as any)._lastScale || 0) > 0.01) {
        console.log("EFOverlayLayer transform:", {
          scale: transform.scale,
          x: transform.x,
          y: transform.y,
          timestamp: performance.now(),
        });
        (this as any)._lastScale = transform.scale;
      }

      // Apply transform
      this.style.transform = `translate(${transform.x}px, ${transform.y}px)`;

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
