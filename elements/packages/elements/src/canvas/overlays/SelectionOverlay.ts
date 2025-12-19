import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  selectionContext,
  type SelectionContext,
} from "../selection/selectionContext.js";
import { panZoomTransformContext } from "../../gui/panZoomTransformContext.js";
import type { PanZoomTransform } from "../../elements/EFPanZoom.js";
import { canvasToScreen, screenToCanvas } from "../coordinateTransform.js";
import { getElementBounds } from "../getElementBounds.js";

/**
 * Selection overlay that renders unscaled selection indicators.
 * Uses fixed positioning to ensure 1:1 pixel ratio regardless of zoom level.
 */
@customElement("ef-canvas-selection-overlay")
export class SelectionOverlay extends LitElement {
  static styles = [
    css`
      :host {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 1000;
      }
      .selection-box {
        position: absolute;
        border: 3px solid rgb(59, 130, 246);
        background: rgba(59, 130, 246, 0.1);
        pointer-events: none;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
      }
      .box-select {
        position: absolute;
        border: 2px dashed rgb(59, 130, 246);
        background: rgba(59, 130, 246, 0.05);
        pointer-events: none;
      }
      .highlight-box {
        position: absolute;
        border: 2px solid rgb(148, 163, 184);
        background: rgba(148, 163, 184, 0.1);
        pointer-events: none;
        box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.3);
      }
    `,
  ];

  createRenderRoot() {
    // Return this to render directly to the element (no shadow DOM)
    // This allows the overlay to use fixed positioning relative to viewport
    // Lit will inject styles as a <style> element when createRenderRoot returns this
    return this;
  }

  firstUpdated(
    changedProperties: Map<string | number | symbol, unknown>,
  ): void {
    super.firstUpdated?.(changedProperties);
    // When createRenderRoot returns this, Lit injects styles as a <style> element
    // Verify styles are present and log for debugging
    const styleElement = this.querySelector("style");
    if (!styleElement) {
      console.warn(
        "[SelectionOverlay] No style element found - styles may not be applied",
      );
    } else {
      console.log(
        "[SelectionOverlay] Style element found, content length:",
        styleElement.textContent?.length || 0,
      );
    }
  }

  @consume({ context: selectionContext, subscribe: true })
  selectionFromContext?: SelectionContext;

  @consume({ context: panZoomTransformContext, subscribe: true })
  panZoomTransformFromContext?: PanZoomTransform;

  /**
   * Selection context as fallback for when overlay is outside context providers (e.g., sibling of pan-zoom).
   */
  @property({ type: Object })
  selection?: SelectionContext;

  /**
   * Pan/zoom transform as fallback for when overlay is outside context providers (e.g., sibling of pan-zoom).
   */
  @property({ type: Object })
  panZoomTransform?: PanZoomTransform;

  @state()
  private canvasElement: HTMLElement | null = null;

  /**
   * Canvas element property - can be set directly when overlay is outside context providers.
   */
  @property({ type: Object })
  canvas?: HTMLElement;

  @state()
  private selectionBounds: DOMRect | null = null; // Single bounding box for all selected elements

  @state()
  private boxSelectBounds: DOMRect | null = null;

  @state()
  private highlightBounds: DOMRect | null = null; // Bounding box for highlighted (hovered) element

  @state()
  private lastSelectionMode: string | null = null;

  private animationFrame?: number;
  private rafLoopActive = false;

  connectedCallback(): void {
    super.connectedCallback();
    // Apply styles directly since :host doesn't work in light DOM
    // These styles are critical for proper positioning relative to viewport
    this.style.position = "fixed";
    this.style.top = "0";
    this.style.left = "0";
    this.style.width = "100vw";
    this.style.height = "100vh";
    this.style.pointerEvents = "none";
    this.style.zIndex = "1000";
    // Add a data attribute for easier debugging
    this.setAttribute("data-selection-overlay", "true");
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Use canvas property if provided, otherwise try to find it
      if (this.canvas) {
        this.canvasElement = this.canvas;
      } else {
        this.findCanvasElement();
      }
      // Always start RAF loop if we have a canvas element (needed for highlight updates)
      if (this.canvasElement) {
        this.startRafLoop();
      }
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopRafLoop();
  }

  /**
   * React to selection context changes to ensure box selection visual updates.
   * This is called whenever Lit detects a property change, including context updates.
   * Note: We don't call requestUpdate() here to avoid the Lit warning about scheduling
   * updates after an update completes. The RAF loop handles all updates.
   */
  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated?.(changedProperties);
    // Check if selection mode changed (context updates might not show in changedProperties)
    const selection = this.effectiveSelection;
    const currentMode = selection?.selectionMode ?? null;
    if (currentMode !== this.lastSelectionMode) {
      this.lastSelectionMode = currentMode;
      // Don't call updateOverlayData() here - let the RAF loop handle it
      // This avoids scheduling updates during the update cycle
    }
    // Ensure RAF loop is running when box selecting (in case it stopped)
    if (currentMode === "box-selecting" && !this.rafLoopActive) {
      this.startRafLoop();
    }
    // Ensure RAF loop is running when canvas property is set (for highlight updates)
    if (changedProperties.has("canvas") && this.canvas) {
      this.canvasElement = this.canvas;
      if (!this.rafLoopActive) {
        this.startRafLoop();
      }
    }
    // Ensure RAF loop is always running when we have a canvas (needed for highlight updates)
    if (this.canvasElement && !this.rafLoopActive) {
      this.startRafLoop();
    }
  }

  /**
   * Find the EFCanvas element.
   * Handles both cases:
   * 1. Overlay is inside EFCanvas's shadow DOM (old case)
   * 2. Overlay is a sibling of ef-pan-zoom (new case - outside transform)
   */
  private findCanvasElement(): void {
    // First, try to find ef-canvas as a sibling or descendant of ef-pan-zoom
    // (when overlay is outside the transform)
    // Since overlay is a sibling of ef-pan-zoom, we need to search in the parent
    const parent = this.parentElement;
    if (parent) {
      // Look for ef-pan-zoom sibling
      const panZoom = parent.querySelector("ef-pan-zoom") as HTMLElement | null;
      if (panZoom) {
        // Look for ef-canvas inside ef-pan-zoom
        const canvas = panZoom.querySelector("ef-canvas") as HTMLElement | null;
        if (canvas) {
          this.canvasElement = canvas;
          return;
        }
      }
    }

    // Also try closest in case overlay is inside pan-zoom somehow
    const panZoom = this.closest("ef-pan-zoom") as HTMLElement | null;
    if (panZoom) {
      const canvas = panZoom.querySelector("ef-canvas") as HTMLElement | null;
      if (canvas) {
        this.canvasElement = canvas;
        return;
      }
    }

    // Fallback: traverse up the DOM tree (for when overlay is inside canvas shadow DOM)
    let current: Node | null = this;
    while (current) {
      if (current instanceof ShadowRoot) {
        current = (current as ShadowRoot).host;
      } else if (current instanceof HTMLElement) {
        // Check if this is the EFCanvas element (case-insensitive check)
        if (
          current.tagName === "EF-CANVAS" ||
          current.tagName.toLowerCase() === "ef-canvas"
        ) {
          this.canvasElement = current;
          return;
        }
        // Check parent element or shadow root host
        const rootNode = current.getRootNode();
        if (rootNode instanceof ShadowRoot) {
          current = rootNode.host;
        } else {
          current = current.parentElement;
        }
      } else {
        const rootNode = (current as Node).getRootNode();
        if (rootNode instanceof ShadowRoot) {
          current = rootNode.host;
        } else {
          current = (current as Node).parentElement;
        }
      }
    }
  }

  /**
   * Start continuous RAF loop for smooth overlay updates.
   */
  private startRafLoop(): void {
    if (this.rafLoopActive) {
      return;
    }
    this.rafLoopActive = true;
    this.rafLoop();
  }

  /**
   * Stop RAF loop.
   */
  private stopRafLoop(): void {
    this.rafLoopActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
  }

  /**
   * Continuous RAF loop to update overlays every frame using Lit render cycle.
   */
  private rafLoop = (): void => {
    if (!this.rafLoopActive) {
      return;
    }

    // Update overlay data and trigger Lit render
    this.updateOverlayData();

    // Schedule next frame
    this.animationFrame = requestAnimationFrame(this.rafLoop);
  };

  /**
   * Get the effective selection context (from context or property).
   */
  private get effectiveSelection(): SelectionContext | undefined {
    return this.selectionFromContext ?? this.selection;
  }

  /**
   * Get the effective pan-zoom transform (from context or property).
   */
  private get effectivePanZoomTransform(): PanZoomTransform | undefined {
    return this.panZoomTransformFromContext ?? this.panZoomTransform;
  }

  /**
   * Update overlay data state, which triggers Lit render.
   */
  private updateOverlayData(): void {
    // Ensure canvas element reference is up-to-date
    if (this.canvas && this.canvas !== this.canvasElement) {
      this.canvasElement = this.canvas;
    }

    // Get canvas element - this is required for all overlay calculations
    const effectiveCanvas = this.canvasElement || this.canvas;
    if (!effectiveCanvas) {
      const hadSelection = this.selectionBounds !== null;
      const hadBoxSelect = this.boxSelectBounds !== null;
      const hadHighlight = this.highlightBounds !== null;
      this.selectionBounds = null;
      this.boxSelectBounds = null;
      this.highlightBounds = null;
      if (hadSelection || hadBoxSelect || hadHighlight) {
        this.requestUpdate();
      }
      return;
    }

    // Get the canvas element's bounding rect
    // Try to use .canvas-content as reference (elements are positioned relative to it)
    // This already includes the pan transform from the parent ef-pan-zoom's .content-wrapper
    let canvasRect = effectiveCanvas.getBoundingClientRect();
    if (effectiveCanvas.shadowRoot) {
      const canvasContent = effectiveCanvas.shadowRoot.querySelector(
        ".canvas-content",
      ) as HTMLElement;
      if (canvasContent) {
        canvasRect = canvasContent.getBoundingClientRect();
      }
    }

    // Selection context is optional - selection/box-select bounds need it, but highlight does not
    const selection = this.effectiveSelection;

    // Calculate selection bounds (requires selection context)
    if (selection) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let hasElements = false;

      for (const elementId of selection.selectedIds) {
        // Find element
        let element: HTMLElement | null = null;
        const root = this.getRootNode();
        if (root instanceof ShadowRoot) {
          element = root.querySelector(
            `[data-element-id="${elementId}"]`,
          ) as HTMLElement | null;
        }
        if (!element && this.canvasElement) {
          if (this.canvasElement.shadowRoot) {
            element = this.canvasElement.shadowRoot.querySelector(
              `[data-element-id="${elementId}"]`,
            ) as HTMLElement | null;
          }
          if (!element) {
            element = this.canvasElement.querySelector(
              `[data-element-id="${elementId}"]`,
            ) as HTMLElement | null;
          }
        }

        if (element) {
          // ALWAYS use metadata as source of truth for canvas coordinates
          // getBoundingClientRect() doesn't work for rotated elements (returns bounding box)
          let canvasX: number;
          let canvasY: number;
          let canvasWidth: number;
          let canvasHeight: number;

          const canvas = this.canvasElement as any;
          const metadata = canvas?.getElementData?.(elementId);

          if (metadata) {
            // Use metadata (already in canvas coordinates)
            canvasX = metadata.x;
            canvasY = metadata.y;
            canvasWidth = metadata.width;
            canvasHeight = metadata.height;
          } else {
            // Fallback: calculate from DOM (only if metadata not available)
            const bounds = getElementBounds(element);
            const scale = this.effectivePanZoomTransform?.scale || 1;
            canvasX = (bounds.left - canvasRect.left) / scale;
            canvasY = (bounds.top - canvasRect.top) / scale;
            canvasWidth = bounds.width / scale;
            canvasHeight = bounds.height / scale;
          }

          // Update bounding box
          minX = Math.min(minX, canvasX);
          minY = Math.min(minY, canvasY);
          maxX = Math.max(maxX, canvasX + canvasWidth);
          maxY = Math.max(maxY, canvasY + canvasHeight);
          hasElements = true;
        }
      }

      // Convert bounding box to screen coordinates
      // canvasRect is .canvas-content's screen position
      // Canvas coordinates are relative to .canvas-content
      if (hasElements) {
        const scale = this.effectivePanZoomTransform?.scale || 1;

        // Convert canvas coordinates to screen coordinates
        // screenX = canvasRect.left + canvasX * scale
        const screenMinX = canvasRect.left + minX * scale;
        const screenMinY = canvasRect.top + minY * scale;
        const screenMaxX = canvasRect.left + maxX * scale;
        const screenMaxY = canvasRect.top + maxY * scale;

        this.selectionBounds = new DOMRect(
          screenMinX,
          screenMinY,
          screenMaxX - screenMinX,
          screenMaxY - screenMinY,
        );
      } else {
        this.selectionBounds = null;
      }
    } else {
      this.selectionBounds = null;
    }

    // Update box select bounds - read directly from selection context every frame
    const boxSelectBounds = selection?.boxSelectBounds ?? null;
    const panZoomTransform = this.effectivePanZoomTransform;

    if (boxSelectBounds && this.canvasElement && panZoomTransform) {
      // Convert canvas coordinates to screen coordinates
      // screenToCanvas uses canvasRect (transformed), but we need to convert back using pan-zoom's base rect
      // to match EFPanZoom.canvasToScreen() which uses: rect.left + canvasX * scale + x
      const panZoomElement = this.canvasElement.closest("ef-pan-zoom") as any;
      if (
        panZoomElement &&
        typeof panZoomElement.canvasToScreen === "function"
      ) {
        // Use EFPanZoom's canvasToScreen method directly
        const topLeft = panZoomElement.canvasToScreen(
          boxSelectBounds.left,
          boxSelectBounds.top,
        );
        const bottomRight = panZoomElement.canvasToScreen(
          boxSelectBounds.right,
          boxSelectBounds.bottom,
        );

        const newBounds = new DOMRect(
          topLeft.x,
          topLeft.y,
          bottomRight.x - topLeft.x,
          bottomRight.y - topLeft.y,
        );

        // Always update to new bounds object (Lit will detect the change)
        // Even if values are the same, new object reference ensures update
        this.boxSelectBounds = newBounds;
      } else {
        // Fallback: use pan-zoom element's rect manually
        const panZoomRect = panZoomElement?.getBoundingClientRect();
        if (panZoomRect) {
          const topLeft = {
            x:
              panZoomRect.left +
              boxSelectBounds.left * panZoomTransform.scale +
              panZoomTransform.x,
            y:
              panZoomRect.top +
              boxSelectBounds.top * panZoomTransform.scale +
              panZoomTransform.y,
          };
          const bottomRight = {
            x:
              panZoomRect.left +
              boxSelectBounds.right * panZoomTransform.scale +
              panZoomTransform.x,
            y:
              panZoomRect.top +
              boxSelectBounds.bottom * panZoomTransform.scale +
              panZoomTransform.y,
          };

          this.boxSelectBounds = new DOMRect(
            topLeft.x,
            topLeft.y,
            bottomRight.x - topLeft.x,
            bottomRight.y - topLeft.y,
          );
        } else {
          this.boxSelectBounds = null;
        }
      }
    } else {
      // Clear box select bounds
      this.boxSelectBounds = null;
    }

    // Update highlight bounds - read highlightedElement from canvas
    // Use canvasElement if available, otherwise fall back to canvas property
    const canvas = (this.canvasElement || this.canvas) as any;
    const highlightedElement = canvas?.highlightedElement as HTMLElement | null | undefined;
    
    // Track if highlight bounds changed to trigger update
    const hadHighlight = this.highlightBounds !== null;

    if (highlightedElement && canvas) {
      // Get element ID to find metadata
      const elementId =
        highlightedElement.getAttribute("data-element-id") ||
        highlightedElement.id;

      if (elementId) {
        // Use metadata as source of truth for canvas coordinates
        const metadata = canvas?.getElementData?.(elementId);

        if (metadata && metadata.width > 0 && metadata.height > 0) {
          // Use metadata (already in canvas coordinates)
          const canvasX = metadata.x;
          const canvasY = metadata.y;
          const canvasWidth = metadata.width;
          const canvasHeight = metadata.height;

          // Convert to screen coordinates
          const scale = this.effectivePanZoomTransform?.scale || 1;
          const screenMinX = canvasRect.left + canvasX * scale;
          const screenMinY = canvasRect.top + canvasY * scale;
          const screenMaxX = canvasRect.left + (canvasX + canvasWidth) * scale;
          const screenMaxY = canvasRect.top + (canvasY + canvasHeight) * scale;

          this.highlightBounds = new DOMRect(
            screenMinX,
            screenMinY,
            screenMaxX - screenMinX,
            screenMaxY - screenMinY,
          );
        } else {
          // Fallback: calculate from DOM (when metadata not available or has zero dimensions)
          const bounds = getElementBounds(highlightedElement);
          
          // Use screen coordinates directly from getBoundingClientRect
          // This works for elements that don't have proper metadata
          this.highlightBounds = new DOMRect(
            bounds.left,
            bounds.top,
            bounds.width,
            bounds.height,
          );
        }
      } else {
        this.highlightBounds = null;
      }
    } else {
      // Clear highlight bounds
      this.highlightBounds = null;
    }
    
    // Explicitly trigger update if highlight bounds changed
    const hasHighlight = this.highlightBounds !== null;
    if (hadHighlight !== hasHighlight) {
      this.requestUpdate();
    }

    // Selection bounds already updated above

    // Note: We don't need to call requestUpdate() here because:
    // 1. We're updating @state() properties (selectionBounds, boxSelectBounds)
    // 2. Lit automatically detects state changes and schedules updates
    // 3. The RAF loop runs every frame, so updates will happen naturally
    // Calling requestUpdate() here would cause Lit warnings about scheduling
    // updates during the update cycle
  }

  render() {
    // We only need canvasElement to render overlays
    // Selection context is optional - highlight can work without it
    const effectiveCanvas = this.canvasElement || this.canvas;
    if (!effectiveCanvas) {
      return html``;
    }

    const selection = this.effectiveSelection;
    const hasBoxSelect = !!this.boxSelectBounds;
    const selectionMode = selection?.selectionMode;

    return html`
      ${
        this.selectionBounds
          ? html`
            <div
              class="selection-box"
              style="left: ${this.selectionBounds.x}px; top: ${this.selectionBounds.y}px; width: ${this.selectionBounds.width}px; height: ${this.selectionBounds.height}px; position: absolute; border: 3px solid rgb(59, 130, 246); background: rgba(59, 130, 246, 0.1); pointer-events: none;"
            ></div>
          `
          : html``
      }
      ${
        this.boxSelectBounds
          ? html`
            <div
              class="box-select"
              style="left: ${this.boxSelectBounds.x}px; top: ${this.boxSelectBounds.y}px; width: ${this.boxSelectBounds.width}px; height: ${this.boxSelectBounds.height}px; position: absolute; border: 2px dashed rgb(59, 130, 246); background: rgba(59, 130, 246, 0.05); pointer-events: none;"
            ></div>
          `
          : html``
      }
      ${
        this.highlightBounds
          ? html`
            <div
              class="highlight-box"
              style="left: ${this.highlightBounds.x}px; top: ${this.highlightBounds.y}px; width: ${this.highlightBounds.width}px; height: ${this.highlightBounds.height}px; position: absolute; border: 2px solid rgb(148, 163, 184); background: rgba(148, 163, 184, 0.1); pointer-events: none; box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.3);"
            ></div>
          `
          : html``
      }
      ${
        selectionMode === "box-selecting" && !hasBoxSelect
          ? html`
            <div style="position: fixed; top: 50px; right: 10px; background: orange; color: white; padding: 4px; z-index: 10000; font-size: 12px;">
              Box selecting but no bounds! mode=${selectionMode} bounds=${selection?.boxSelectBounds ? "exists" : "null"}
            </div>
          `
          : html``
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-canvas-selection-overlay": SelectionOverlay;
  }
}
