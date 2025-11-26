import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

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

  private _isDragging = false;
  private _dragStartPointerPos: { x: number; y: number } | null = null;
  private _dragStartTransform: PanZoomTransform | null = null;
  private _capturedPointerId: number | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("wheel", this._onWheel, { passive: false });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("wheel", this._onWheel);
    this.removeEventListener("pointerdown", this._onPointerDown);
    this.removeEventListener("pointermove", this._onPointerMove);
    this.removeEventListener("pointerup", this._onPointerUp);
    this.removeEventListener("pointercancel", this._onPointerUp);
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
    e.preventDefault();

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

  firstUpdated() {
    super.firstUpdated();
    this.addEventListener("pointerdown", this._onPointerDown);
    this.addEventListener("pointermove", this._onPointerMove);
    this.addEventListener("pointerup", this._onPointerUp);
    this.addEventListener("pointercancel", this._onPointerUp);
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
