import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { provide } from "@lit/context";
import { panZoomTransformContext } from "../gui/panZoomTransformContext.js";

export interface PanZoomTransform {
  x: number;
  y: number;
  scale: number;
}

@customElement("ef-pan-zoom")
export class EFPanZoom extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        overflow: hidden;
        position: relative;
        touch-action: none;
      }
      .content-wrapper {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        transform-origin: 0 0;
      }
    `,
  ];

  @property({ type: Number, reflect: true })
  x = 0;

  @property({ type: Number, reflect: true })
  y = 0;

  @property({ type: Number, reflect: true })
  scale = 1;

  @provide({ context: panZoomTransformContext })
  panZoomTransform: PanZoomTransform = { x: 0, y: 0, scale: 1 };

  private _isDragging = false;
  private _dragStartPointerPos: { x: number; y: number } | null = null;
  private _dragStartTransform: PanZoomTransform | null = null;
  private _capturedPointerId: number | null = null;

  /**
   * Document-level wheel handler in capture phase to prevent browser navigation.
   * This prevents back/forward navigation on two-finger swipe gestures.
   * We use capture phase to catch events before they bubble, but only prevent default
   * (not stop propagation) so the normal wheel handler can still process them.
   */
  private _onDocumentWheelCapture = (e: WheelEvent) => {
    // Only prevent if the event is over this panzoom element or its children
    const panZoom =
      e.target instanceof Element
        ? e.target.closest("ef-pan-zoom")
        : null;
    if (panZoom === this) {
      // Prevent browser navigation gestures (back/forward on swipe)
      // Don't stop propagation - let the normal wheel handler process the event
      e.preventDefault();
    }
  };

  connectedCallback() {
    super.connectedCallback();
    // Add document-level capture listener to prevent browser navigation
    document.addEventListener("wheel", this._onDocumentWheelCapture, {
      passive: false,
      capture: true,
    });
    // Add element-level event listeners
    this.addEventListener("wheel", this._onWheel, { passive: false });
    this.addEventListener("pointerdown", this._onPointerDown);
    this.addEventListener("pointermove", this._onPointerMove);
    this.addEventListener("pointerup", this._onPointerUp);
    this.addEventListener("pointercancel", this._onPointerUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Remove document-level capture listener
    document.removeEventListener("wheel", this._onDocumentWheelCapture, {
      capture: true,
    });
    // Remove element-level event listeners
    this.removeEventListener("wheel", this._onWheel);
    this.removeEventListener("pointerdown", this._onPointerDown);
    this.removeEventListener("pointermove", this._onPointerMove);
    this.removeEventListener("pointerup", this._onPointerUp);
    this.removeEventListener("pointercancel", this._onPointerUp);
    // Clean up pointer capture if dragging
    if (this._isDragging && this._capturedPointerId !== null) {
      try {
        this.releasePointerCapture(this._capturedPointerId);
      } catch (err) {
        // Ignore pointer capture errors (e.g., in test environments)
      }
    }
  }

  private _updateTransform(updates: Partial<PanZoomTransform>) {
    const newTransform = {
      x: updates.x !== undefined ? updates.x : this.x,
      y: updates.y !== undefined ? updates.y : this.y,
      scale:
        updates.scale !== undefined
          ? Math.max(0.1, Math.min(5, updates.scale))
          : this.scale,
    };

    const changed =
      newTransform.x !== this.x ||
      newTransform.y !== this.y ||
      newTransform.scale !== this.scale;

    if (changed) {
      this.x = newTransform.x;
      this.y = newTransform.y;
      this.scale = newTransform.scale;

      // Update context for overlay components
      this.panZoomTransform = { ...newTransform };

      this.dispatchEvent(
        new CustomEvent<PanZoomTransform>("transform-changed", {
          detail: { ...newTransform },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private _onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;

    this._isDragging = true;
    this._capturedPointerId = e.pointerId;
    this._dragStartPointerPos = { x: e.clientX, y: e.clientY };
    this._dragStartTransform = {
      x: this.x,
      y: this.y,
      scale: this.scale,
    };

    try {
      this.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignore pointer capture errors (e.g., in test environments)
    }
  };

  private _onPointerMove = (e: PointerEvent) => {
    if (
      !this._isDragging ||
      !this._dragStartPointerPos ||
      !this._dragStartTransform
    )
      return;

    const deltaX = e.clientX - this._dragStartPointerPos.x;
    const deltaY = e.clientY - this._dragStartPointerPos.y;

    this._updateTransform({
      x: this._dragStartTransform.x - deltaX,
      y: this._dragStartTransform.y - deltaY,
    });
  };

  private _onPointerUp = (e: PointerEvent) => {
    if (!this._isDragging) return;
    if (this._capturedPointerId !== null) {
      try {
        this.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore pointer capture errors (e.g., in test environments)
      }
    }

    this._isDragging = false;
    this._capturedPointerId = null;
    this._dragStartPointerPos = null;
    this._dragStartTransform = null;
  };

  private _onWheel = (e: WheelEvent) => {
    // Always prevent default to prevent browser navigation (back/forward on swipe)
    // This is critical for full-page app interfaces
    e.preventDefault();
    e.stopPropagation();

    const isZoom = e.metaKey || e.ctrlKey;

    if (isZoom) {
      const containerRect = this.getBoundingClientRect();
      const pointerX = e.clientX - containerRect.left;
      const pointerY = e.clientY - containerRect.top;

      const currentX = this.x;
      const currentY = this.y;
      const currentScale = this.scale;

      const canvasX = (pointerX - currentX) / currentScale;
      const canvasY = (pointerY - currentY) / currentScale;

      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      const newScale = Math.max(0.1, Math.min(5, currentScale * delta));

      const newX = pointerX - canvasX * newScale;
      const newY = pointerY - canvasY * newScale;

      this._updateTransform({
        x: newX,
        y: newY,
        scale: newScale,
      });
    } else {
      const deltaX = -e.deltaX;
      const deltaY = -e.deltaY;

      this._updateTransform({
        x: this.x + deltaX,
        y: this.y + deltaY,
      });
    }
  };

  firstUpdated(changedProperties: Map<PropertyKey, unknown>) {
    super.firstUpdated(changedProperties);
    // Initialize context with current transform
    this.panZoomTransform = { x: this.x, y: this.y, scale: this.scale };
  }

  /**
   * Convert screen coordinates (e.g., mouse event clientX/clientY) to canvas coordinates.
   * This handles all pan/zoom transformations automatically.
   *
   * @param screenX - X coordinate in screen space (e.g., event.clientX)
   * @param screenY - Y coordinate in screen space (e.g., event.clientY)
   * @returns Object with x, y in canvas coordinate space
   *
   * @example
   * handleClick(e: MouseEvent) {
   *   const canvasPos = panZoom.screenToCanvas(e.clientX, e.clientY);
   *   console.log(`Clicked at canvas position: ${canvasPos.x}, ${canvasPos.y}`);
   * }
   */
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.x) / this.scale,
      y: (screenY - rect.top - this.y) / this.scale,
    };
  }

  /**
   * Convert canvas coordinates to screen coordinates.
   * Useful for positioning overlays or tooltips relative to canvas elements.
   *
   * @param canvasX - X coordinate in canvas space
   * @param canvasY - Y coordinate in canvas space
   * @returns Object with x, y in screen coordinate space
   *
   * @example
   * const screenPos = panZoom.canvasToScreen(element.x, element.y);
   * tooltip.style.left = `${screenPos.x}px`;
   * tooltip.style.top = `${screenPos.y}px`;
   */
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    const rect = this.getBoundingClientRect();
    return {
      x: rect.left + canvasX * this.scale + this.x,
      y: rect.top + canvasY * this.scale + this.y,
    };
  }

  /**
   * Reset the pan-zoom transform to its default values (x: 0, y: 0, scale: 1).
   * This method can be called programmatically to reset the view.
   *
   * @example
   * const panZoomRef = useRef(null);
   * <button onClick={() => panZoomRef.current.reset()}>Reset View</button>
   */
  reset(): void {
    this._updateTransform({ x: 0, y: 0, scale: 1 });
  }

  render() {
    return html`
      <div
        class="content-wrapper"
        style="transform: translate(${this.x}px, ${this.y}px) scale(${this.scale});"
      >
        <slot></slot>
      </div>
    `;
  }
}
