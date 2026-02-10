import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { TWMixin } from "../TWMixin.js";
import {
  timelineEditingContext,
  type TimelineEditingContext,
} from "./timelineEditingContext.js";

export interface TrimChangeDetail {
  elementId: string;
  type: "start" | "end" | "region";
  deltaMs: number;
  trimStartMs: number;
  trimEndMs: number;
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

      /* Track mode: handles pinned at container edges */
      :host([mode="track"]) .handle-start {
        left: -4px;
      }
      :host([mode="track"]) .handle-start::before {
        left: 2px;
      }
      :host([mode="track"]) .handle-end {
        right: -4px;
      }
      :host([mode="track"]) .handle-end::before {
        right: 2px;
      }

      /* Standalone mode (default): handles positioned via inline style */
      .handle-start::before {
        left: 2px;
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

      .region {
        position: absolute;
        top: 0;
        bottom: 0;
        cursor: grab;
        pointer-events: auto;
        z-index: 5;
      }

      .region.dragging {
        cursor: grabbing;
      }
    `,
  ];

  @property({ type: String, reflect: true })
  mode: "standalone" | "track" = "standalone";

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

  @consume({ context: timelineEditingContext, subscribe: true })
  editingContext?: TimelineEditingContext;

  @state()
  private draggingHandle: "start" | "end" | "region" | null = null;

  @state()
  private dragStartX = 0;

  @state()
  private dragStartValue = 0;

  #regionDragStartTrimStart = 0;
  #regionDragStartTrimEnd = 0;

  private handlePointerDown(e: PointerEvent, type: "start" | "end"): void {
    e.preventDefault();
    e.stopPropagation();

    this.draggingHandle = type;
    this.dragStartX = e.clientX;
    this.dragStartValue = type === "start" ? this.trimStartMs : this.trimEndMs;

    if (this.editingContext) {
      this.editingContext.setState({
        mode: "trimming",
        elementId: this.elementId,
        handle: type,
      });
    }

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    target.addEventListener("pointermove", this.handlePointerMove);
    target.addEventListener("pointerup", this.handlePointerUp);
    target.addEventListener("pointercancel", this.handlePointerUp);
  }

  private handleRegionPointerDown(e: PointerEvent): void {
    e.preventDefault();
    e.stopPropagation();

    this.draggingHandle = "region";
    this.dragStartX = e.clientX;
    this.#regionDragStartTrimStart = this.trimStartMs;
    this.#regionDragStartTrimEnd = this.trimEndMs;

    if (this.editingContext) {
      this.editingContext.setState({
        mode: "trimming",
        elementId: this.elementId,
        handle: "start",
      });
    }

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

    if (this.draggingHandle === "region") {
      // Clamp deltaMs so neither trimStart nor trimEnd goes below 0
      const clampedDelta = Math.max(
        -this.#regionDragStartTrimStart,
        Math.min(this.#regionDragStartTrimEnd, deltaMs),
      );

      const newTrimStart = this.#regionDragStartTrimStart + clampedDelta;
      const newTrimEnd = this.#regionDragStartTrimEnd - clampedDelta;

      this.dispatchEvent(
        new CustomEvent<TrimChangeDetail>("trim-change", {
          detail: {
            elementId: this.elementId,
            type: "region",
            deltaMs: clampedDelta,
            trimStartMs: newTrimStart,
            trimEndMs: newTrimEnd,
          },
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    let newValueMs: number;

    if (this.draggingHandle === "start") {
      newValueMs = Math.max(0, this.dragStartValue + deltaMs);
      newValueMs = Math.min(
        newValueMs,
        this.intrinsicDurationMs - (this.trimEndMs || 0),
      );

      this.dispatchEvent(
        new CustomEvent<TrimChangeDetail>("trim-change", {
          detail: {
            elementId: this.elementId,
            type: "start",
            deltaMs,
            trimStartMs: newValueMs,
            trimEndMs: this.trimEndMs,
          },
          bubbles: true,
          composed: true,
        }),
      );
    } else {
      newValueMs = Math.max(0, this.dragStartValue - deltaMs);
      newValueMs = Math.min(
        newValueMs,
        this.intrinsicDurationMs - this.trimStartMs,
      );

      this.dispatchEvent(
        new CustomEvent<TrimChangeDetail>("trim-change", {
          detail: {
            elementId: this.elementId,
            type: "end",
            deltaMs,
            trimStartMs: this.trimStartMs,
            trimEndMs: newValueMs,
          },
          bubbles: true,
          composed: true,
        }),
      );
    }
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

    if (this.editingContext) {
      this.editingContext.setState({ mode: "idle" });
    }
  };

  render() {
    const trimStartPx = this.trimStartMs * this.pixelsPerMs;
    const trimEndPx = (this.trimEndMs || 0) * this.pixelsPerMs;
    const isStandalone = this.mode === "standalone";
    const handleWidth = 8;

    return html`
      ${
        this.showOverlays && this.trimStartMs > 0
          ? html`<div
            class="trim-overlay trim-overlay-start"
            style=${styleMap({ width: `${trimStartPx}px` })}
          ></div>`
          : nothing
      }
      ${
        this.showOverlays && this.trimEndMs > 0
          ? html`<div
            class="trim-overlay trim-overlay-end"
            style=${styleMap({ width: `${trimEndPx}px` })}
          ></div>`
          : nothing
      }

      ${
        isStandalone
          ? html`<div
              class="region ${this.draggingHandle === "region" ? "dragging" : ""}"
              style=${styleMap({
                left: `${trimStartPx + handleWidth}px`,
                right: `${trimEndPx + handleWidth}px`,
              })}
              @pointerdown=${(e: PointerEvent) => this.handleRegionPointerDown(e)}
            ></div>`
          : nothing
      }

      <div
        class="handle handle-start ${this.draggingHandle === "start" ? "dragging" : ""}"
        style=${isStandalone ? styleMap({ left: `${trimStartPx}px` }) : nothing}
        @pointerdown=${(e: PointerEvent) => this.handlePointerDown(e, "start")}
      ></div>
      <div
        class="handle handle-end ${this.draggingHandle === "end" ? "dragging" : ""}"
        style=${isStandalone ? styleMap({ right: `${trimEndPx}px` }) : nothing}
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
