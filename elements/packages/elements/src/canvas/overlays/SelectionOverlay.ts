import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { selectionContext, type SelectionContext } from "../selection/selectionContext.js";
import { panZoomTransformContext } from "../../gui/panZoomTransformContext.js";
import type { PanZoomTransform } from "../../elements/EFPanZoom.js";
import {
  type OverlayState,
  type CanvasWithMetadata,
  getOverlayTargets,
  calculateOverlayState,
} from "./overlayState.js";

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

  firstUpdated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.firstUpdated?.(changedProperties);
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

  /**
   * Complete overlay state - calculated from targets using the abstraction layer.
   * This is the SINGLE source of truth for overlay bounds.
   */
  @state()
  private overlayState: OverlayState = {
    selection: null,
    boxSelect: null,
    highlight: null,
  };

  @state()
  private lastSelectionMode: string | null = null;

  /**
   * When true, the RAF loop skips all work. Used during playback to avoid
   * layout-thrashing getBoundingClientRect/getComputedStyle calls that
   * compete with the canvas render pipeline.
   */
  @property({ type: Boolean }) paused = false;

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
    // Start RAF loop if we have a canvas but loop isn't running
    if (this.canvasElement && !this.rafLoopActive) {
      this.startRafLoop();
    }
    // On unpause, force an immediate overlay update to sync stale state
    if (changedProperties.has("paused") && !this.paused) {
      this.updateOverlayData();
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
        if (current.tagName === "EF-CANVAS" || current.tagName.toLowerCase() === "ef-canvas") {
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
   * When paused, the loop keeps running (for quick resume) but skips all
   * expensive layout queries.
   */
  private rafLoop = (): void => {
    if (!this.rafLoopActive) {
      return;
    }

    // Skip all work when paused to avoid layout-thrashing during playback
    if (!this.paused) {
      this.updateOverlayData();
    }

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
   * Update overlay data state using the abstraction layer.
   *
   * This method now uses the clean separation of:
   * - SEMANTICS: getOverlayTargets() determines WHAT should be shown
   * - MECHANISM: calculateOverlayState() determines HOW to show it
   */
  private updateOverlayData(): void {
    // Ensure canvas element reference is up-to-date
    if (this.canvas && this.canvas !== this.canvasElement) {
      this.canvasElement = this.canvas;
    }

    // Get canvas element - required for all overlay calculations
    const effectiveCanvas = this.canvasElement || this.canvas;
    if (!effectiveCanvas) {
      this.overlayState = { selection: null, boxSelect: null, highlight: null };
      return;
    }

    // Get canvas rect (try .canvas-content first for accurate positioning)
    let canvasRect = effectiveCanvas.getBoundingClientRect();
    if (effectiveCanvas.shadowRoot) {
      const canvasContent = effectiveCanvas.shadowRoot.querySelector(
        ".canvas-content",
      ) as HTMLElement;
      if (canvasContent) {
        canvasRect = canvasContent.getBoundingClientRect();
      }
    }

    // Get pan-zoom element for box-select coordinate conversion
    const panZoomElement = effectiveCanvas.closest("ef-pan-zoom") as HTMLElement | null;

    // Get highlighted element from canvas
    const canvas = effectiveCanvas as any;
    const highlightedElement = canvas?.highlightedElement as HTMLElement | null;

    // SEMANTICS: What should be shown?
    const targets = getOverlayTargets(this.effectiveSelection, highlightedElement);

    // Adapt canvas to CanvasWithMetadata interface
    const canvasWithMetadata: CanvasWithMetadata = {
      getElementData: (id: string) => canvas?.getElementData?.(id),
      getElement: (id: string) => canvas?.elementRegistry?.get(id),
      querySelector: (selector: string) => effectiveCanvas.querySelector(selector),
      shadowRoot: effectiveCanvas.shadowRoot,
    };

    // Read current transform directly from panzoom element (not stale property/context)
    // This ensures we always have the current scale/pan values
    const currentTransform = this.readCurrentTransform(panZoomElement);

    // MECHANISM: Calculate screen bounds
    this.overlayState = calculateOverlayState(
      targets,
      canvasWithMetadata,
      canvasRect,
      panZoomElement,
      currentTransform,
    );
  }

  /**
   * Read current transform directly from panzoom element.
   * This ensures we always have fresh values instead of stale property/context.
   */
  private readCurrentTransform(panZoomElement: HTMLElement | null): PanZoomTransform | undefined {
    // Try reading from panzoom element directly (most accurate)
    if (panZoomElement) {
      const pz = panZoomElement as any;
      if (typeof pz.x === "number" && typeof pz.y === "number" && typeof pz.scale === "number") {
        return { x: pz.x, y: pz.y, scale: pz.scale };
      }
    }

    // Fall back to context/property
    return this.effectivePanZoomTransform;
  }

  render() {
    // We only need canvasElement to render overlays
    const effectiveCanvas = this.canvasElement || this.canvas;
    if (!effectiveCanvas) {
      return html``;
    }

    // NOTE: Selection visualization is handled by EFTransformHandles (with rotation support).
    // This overlay only renders:
    // - box-select: marquee during drag-to-select
    // - highlight-box: hover indication for non-selected elements
    const { boxSelect, highlight } = this.overlayState;

    return html`
      ${
        boxSelect
          ? html`
            <div
              class="box-select"
              style="left: ${boxSelect.x}px; top: ${boxSelect.y}px; width: ${boxSelect.width}px; height: ${boxSelect.height}px; position: absolute; border: 2px dashed rgb(59, 130, 246); background: rgba(59, 130, 246, 0.05); pointer-events: none;"
            ></div>
          `
          : html``
      }
      ${
        highlight
          ? html`
            <div
              class="highlight-box"
              style="left: ${highlight.x}px; top: ${highlight.y}px; width: ${highlight.width}px; height: ${highlight.height}px; position: absolute; border: 2px solid rgb(148, 163, 184); background: rgba(148, 163, 184, 0.1); pointer-events: none; box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.3);"
            ></div>
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
