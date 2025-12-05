import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { TWMixin } from "../TWMixin.js";

export interface TrimChangeDetail {
  elementId: string;
  type: "start" | "end";
  deltaMs: number;
  newValueMs: number;
}

@customElement("ef-trim-handles")
export class EFTrimHandles extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }

      .handle {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 8px;
        cursor: ew-resize;
        pointer-events: auto;
        z-index: 10;
      }

      .handle::before {
        content: "";
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 60%;
        min-height: 12px;
        max-height: 24px;
        background: var(--trim-handle-color, rgba(255, 255, 255, 0.7));
        border-radius: 2px;
        transition: background 0.15s ease;
      }

      .handle:hover::before,
      .handle.dragging::before {
        background: var(--trim-handle-active-color, #3b82f6);
      }

      .handle-start {
        left: -4px;
      }

      .handle-start::before {
        left: 2px;
      }

      .handle-end {
        right: -4px;
      }

      .handle-end::before {
        right: 2px;
      }

      .handle.dragging {
        cursor: grabbing;
      }

      .trim-overlay {
        position: absolute;
        top: 0;
        bottom: 0;
        background: var(--trim-overlay-color, rgba(0, 0, 0, 0.4));
        pointer-events: none;
      }

      .trim-overlay-start {
        left: 0;
      }

      .trim-overlay-end {
        right: 0;
      }
    `,
  ];

  @property({ type: String, attribute: "element-id" })
  elementId = "";

  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs = 0.04;

  @property({ type: Number, attribute: "trim-start-ms" })
  trimStartMs = 0;

  @property({ type: Number, attribute: "trim-end-ms" })
  trimEndMs = 0;

  @property({ type: Number, attribute: "intrinsic-duration-ms" })
  intrinsicDurationMs = 0;

  @property({ type: Boolean, attribute: "show-overlays" })
  showOverlays = true;

  @state()
  private draggingHandle: "start" | "end" | null = null;

  @state()
  private dragStartX = 0;

  @state()
  private dragStartValue = 0;

  private handlePointerDown(e: PointerEvent, type: "start" | "end"): void {
    e.preventDefault();
    e.stopPropagation();

    this.draggingHandle = type;
    this.dragStartX = e.clientX;
    this.dragStartValue = type === "start" ? this.trimStartMs : this.trimEndMs;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    target.addEventListener("pointermove", this.handlePointerMove);
    target.addEventListener("pointerup", this.handlePointerUp);
    target.addEventListener("pointercancel", this.handlePointerUp);
  }

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.draggingHandle) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaMs = deltaX / this.pixelsPerMs;

    let newValueMs: number;

    if (this.draggingHandle === "start") {
      newValueMs = Math.max(0, this.dragStartValue + deltaMs);
      newValueMs = Math.min(newValueMs, this.intrinsicDurationMs - (this.trimEndMs || 0));
    } else {
      newValueMs = Math.max(0, this.dragStartValue - deltaMs);
      newValueMs = Math.min(newValueMs, this.intrinsicDurationMs - this.trimStartMs);
    }

    this.dispatchEvent(
      new CustomEvent<TrimChangeDetail>("trim-change", {
        detail: {
          elementId: this.elementId,
          type: this.draggingHandle,
          deltaMs,
          newValueMs,
        },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private handlePointerUp = (e: PointerEvent): void => {
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    target.removeEventListener("pointermove", this.handlePointerMove);
    target.removeEventListener("pointerup", this.handlePointerUp);
    target.removeEventListener("pointercancel", this.handlePointerUp);

    if (this.draggingHandle) {
      this.dispatchEvent(
        new CustomEvent("trim-change-end", {
          detail: {
            elementId: this.elementId,
            type: this.draggingHandle,
          },
          bubbles: true,
          composed: true,
        }),
      );
    }

    this.draggingHandle = null;
  };

  render() {
    const trimStartWidth = this.trimStartMs * this.pixelsPerMs;
    const trimEndWidth = (this.trimEndMs || 0) * this.pixelsPerMs;

    return html`
      ${this.showOverlays && this.trimStartMs > 0
        ? html`<div
            class="trim-overlay trim-overlay-start"
            style=${styleMap({ width: `${trimStartWidth}px` })}
          ></div>`
        : nothing}
      ${this.showOverlays && this.trimEndMs > 0
        ? html`<div
            class="trim-overlay trim-overlay-end"
            style=${styleMap({ width: `${trimEndWidth}px` })}
          ></div>`
        : nothing}

      <div
        class="handle handle-start ${this.draggingHandle === "start" ? "dragging" : ""}"
        @pointerdown=${(e: PointerEvent) => this.handlePointerDown(e, "start")}
      ></div>
      <div
        class="handle handle-end ${this.draggingHandle === "end" ? "dragging" : ""}"
        @pointerdown=${(e: PointerEvent) => this.handlePointerDown(e, "end")}
      ></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-trim-handles": EFTrimHandles;
  }
}

