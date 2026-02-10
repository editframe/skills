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
        width: var(--trim-handle-width, 8px);
        cursor: ew-resize;
        pointer-events: auto;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .handle-inner {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--trim-handle-color, rgba(255, 255, 255, 0.7));
        transition: background 0.15s ease;
      }

      .handle:hover .handle-inner,
      .handle.dragging .handle-inner {
        background: var(--trim-handle-active-color, #3b82f6);
      }

      .handle-start .handle-inner {
        border-radius: var(--trim-handle-border-radius-start, 2px 0 0 2px);
      }

      .handle-end .handle-inner {
        border-radius: var(--trim-handle-border-radius-end, 0 2px 2px 0);
      }

      /* Track mode: handles pinned at container edges */
      :host([mode="track"]) .handle-start {
        left: -4px;
      }
      :host([mode="track"]) .handle-end {
        right: -4px;
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

      .selected-border {
        position: absolute;
        left: 0;
        right: 0;
        height: var(--trim-selected-border-width, 0px);
        background: var(--trim-selected-border-color, transparent);
        pointer-events: none;
        z-index: 15;
      }

      .selected-border-top {
        top: 0;
      }

      .selected-border-bottom {
        bottom: 0;
      }
    `,
  ];

  @property({ type: String, reflect: true })
  mode: "standalone" | "track" = "standalone";

  @property({ type: String, attribute: "element-id" })
  elementId = "";

  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs: number | null = null;

  @property({ type: Number, attribute: "trim-start-ms" })
  trimStartMs = 0;

  @property({ type: Number, attribute: "trim-end-ms" })
  trimEndMs = 0;

  @property({ type: Number, attribute: "intrinsic-duration-ms" })
  intrinsicDurationMs = 0;

  @property({ type: Boolean, attribute: "show-overlays" })
  showOverlays = true;

  @property({ type: String, attribute: "seek-target" })
  seekTarget = "";

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
  #resizeObserver: ResizeObserver | null = null;
  #hostWidth = 0;

  #seekToTarget(type: "start" | "end" | "region", trimStartMs: number, trimEndMs: number): void {
    if (!this.seekTarget) return;
    const target = (this.getRootNode() as Document | ShadowRoot).getElementById(this.seekTarget) as any;
    if (!target || !("currentTimeMs" in target)) return;

    if (type === "end") {
      target.currentTimeMs = this.intrinsicDurationMs - trimStartMs - trimEndMs;
    } else {
      target.currentTimeMs = 0;
    }
  }

  get #effectivePixelsPerMs(): number {
    if (this.pixelsPerMs != null) {
      return this.pixelsPerMs;
    }
    if (this.#hostWidth > 0 && this.intrinsicDurationMs > 0) {
      return this.#hostWidth / this.intrinsicDurationMs;
    }
    return 0.04;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      if (width !== this.#hostWidth) {
        this.#hostWidth = width;
        this.requestUpdate();
      }
    });
    this.#resizeObserver.observe(this);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

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

    const pxPerMs = this.#effectivePixelsPerMs;
    const deltaX = e.clientX - this.dragStartX;
    const deltaMs = deltaX / pxPerMs;

    if (this.draggingHandle === "region") {
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
      this.#seekToTarget("region", newTrimStart, newTrimEnd);
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
      this.#seekToTarget("start", newValueMs, this.trimEndMs);
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
      this.#seekToTarget("end", this.trimStartMs, newValueMs);
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
    const pxPerMs = this.#effectivePixelsPerMs;
    const trimStartPx = this.trimStartMs * pxPerMs;
    const trimEndPx = (this.trimEndMs || 0) * pxPerMs;
    const isStandalone = this.mode === "standalone";
    const handleWidthPx = parseFloat(getComputedStyle(this).getPropertyValue('--trim-handle-width')) || 8;

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
          ? html`
              <div
                class="region ${this.draggingHandle === "region" ? "dragging" : ""}"
                style=${styleMap({
                  left: `${trimStartPx + handleWidthPx}px`,
                  right: `${trimEndPx + handleWidthPx}px`,
                })}
                @pointerdown=${(e: PointerEvent) => this.handleRegionPointerDown(e)}
              ></div>
              <div class="selected-border selected-border-top"
                style=${styleMap({
                  left: `${trimStartPx}px`,
                  right: `${trimEndPx}px`,
                })}
              ></div>
              <div class="selected-border selected-border-bottom"
                style=${styleMap({
                  left: `${trimStartPx}px`,
                  right: `${trimEndPx}px`,
                })}
              ></div>
            `
          : nothing
      }

      <div
        class="handle handle-start ${this.draggingHandle === "start" ? "dragging" : ""}"
        style=${isStandalone ? styleMap({ left: `${trimStartPx}px` }) : nothing}
        @pointerdown=${(e: PointerEvent) => this.handlePointerDown(e, "start")}
      >
        <div class="handle-inner">
          <slot name="handle-start"></slot>
        </div>
      </div>
      <div
        class="handle handle-end ${this.draggingHandle === "end" ? "dragging" : ""}"
        style=${isStandalone ? styleMap({ right: `${trimEndPx}px` }) : nothing}
        @pointerdown=${(e: PointerEvent) => this.handlePointerDown(e, "end")}
      >
        <div class="handle-inner">
          <slot name="handle-end"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-trim-handles": EFTrimHandles;
  }
}
