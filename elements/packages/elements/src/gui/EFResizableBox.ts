import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { getCornerPoint, getOppositeCorner } from "./transformUtils.js";

const DEFAULT_MIN_SIZE = 10;

export interface BoxBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

function mapHandleToLegacy(handle: ResizeHandle): string {
  const map: Record<ResizeHandle, string> = {
    nw: "top-left",
    n: "top",
    ne: "top-right",
    e: "right",
    se: "bottom-right",
    s: "bottom",
    sw: "bottom-left",
    w: "left",
  };
  return map[handle];
}

@customElement("ef-resizable-box")
export class EFResizableBox extends LitElement {
  @property({ type: Object })
  bounds: BoxBounds = { x: 0, y: 0, width: 100, height: 100 };

  @state()
  private containerWidth = 0;

  @state()
  private containerHeight = 0;

  @property({ type: Number })
  minSize = DEFAULT_MIN_SIZE;

  @state()
  private isDragging = false;

  @state()
  private isResizing: ResizeHandle | null = null;

  private dragStart: { x: number; y: number } | null = null;
  private dragStartPosition: { x: number; y: number } = { x: 0, y: 0 };
  private resizeStartCorner: { x: number; y: number } | null = null;
  private resizeStartSize: { width: number; height: number } | null = null;
  private resizeStartPosition: { x: number; y: number } | null = null;

  static styles = css`
    .box {
      position: absolute;
      border: 2px solid var(--ef-resizable-box-border-color, var(--ef-color-primary));
      background-color: var(--ef-resizable-box-bg-color, color-mix(in srgb, var(--ef-color-primary) 20%, transparent));
      cursor: grab;
    }
    .box.dragging {
      border-color: var(--ef-resizable-box-dragging-border-color, var(--ef-color-primary));
      background-color: var(--ef-resizable-box-dragging-bg-color, color-mix(in srgb, var(--ef-color-primary) 30%, transparent));
    }
    .handle {
      position: absolute;
      background-color: var(--ef-resizable-box-handle-color, var(--ef-color-primary));
      touch-action: none;
    }
    .handle.nw { top: -4px; left: -4px; width: 8px; height: 8px; cursor: nwse-resize; }
    .handle.ne { top: -4px; right: -4px; width: 8px; height: 8px; cursor: nesw-resize; }
    .handle.sw { bottom: -4px; left: -4px; width: 8px; height: 8px; cursor: nesw-resize; }
    .handle.se { bottom: -4px; right: -4px; width: 8px; height: 8px; cursor: nwse-resize; }
    .handle.n { top: -4px; left: 4px; right: 4px; height: 8px; cursor: ns-resize; }
    .handle.e { top: 4px; bottom: 4px; right: -4px; width: 8px; cursor: ew-resize; }
    .handle.s { bottom: -4px; left: 4px; right: 4px; height: 8px; cursor: ns-resize; }
    .handle.w { top: 4px; bottom: 4px; left: -4px; width: 8px; cursor: ew-resize; }
  `;

  private resizeObserver?: ResizeObserver;

  connectedCallback() {
    super.connectedCallback();
    if (this.offsetParent) {
      this.containerWidth = this.offsetParent.clientWidth;
      this.containerHeight = this.offsetParent.clientHeight;
    }
    this.resizeObserver = new ResizeObserver(() => {
      if (this.offsetParent) {
        this.containerWidth = this.offsetParent.clientWidth;
        this.containerHeight = this.offsetParent.clientHeight;
      }
    });
    if (this.offsetParent) {
      this.resizeObserver.observe(this.offsetParent);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.cleanup();
  }

  private handlePointerDown = (
    e: PointerEvent,
    mode: "move" | "resize",
    handle?: ResizeHandle,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.isResizing = mode === "resize" ? handle || null : null;

    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragStartPosition = { x: this.bounds.x, y: this.bounds.y };

    if (mode === "resize" && handle) {
      const oppositeCorner = getOppositeCorner(handle);
      const rotationRadians = 0;
      const initialCorner = getCornerPoint(
        this.bounds.x,
        this.bounds.y,
        this.bounds.width,
        this.bounds.height,
        rotationRadians,
        oppositeCorner.x,
        oppositeCorner.y,
      );
      this.resizeStartCorner = initialCorner;
      this.resizeStartSize = {
        width: this.bounds.width,
        height: this.bounds.height,
      };
      this.resizeStartPosition = { x: this.bounds.x, y: this.bounds.y };
    }

    document.addEventListener("pointermove", this.handlePointerMove, {
      passive: false,
    });
    document.addEventListener("pointerup", this.handlePointerUp, {
      passive: false,
    });
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isDragging || !this.dragStart) return;

    e.preventDefault();

    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;

    if (
      this.isResizing &&
      this.resizeStartCorner &&
      this.resizeStartSize &&
      this.resizeStartPosition
    ) {
      const oppositeCorner = getOppositeCorner(this.isResizing);
      const rotationRadians = 0;

      let newWidth = this.resizeStartSize.width;
      let newHeight = this.resizeStartSize.height;

      if (this.isResizing.includes("e")) {
        newWidth = this.resizeStartSize.width + deltaX;
      } else if (this.isResizing.includes("w")) {
        newWidth = this.resizeStartSize.width - deltaX;
      }

      if (this.isResizing.includes("s")) {
        newHeight = this.resizeStartSize.height + deltaY;
      } else if (this.isResizing.includes("n")) {
        newHeight = this.resizeStartSize.height - deltaY;
      }

      newWidth = Math.max(
        this.minSize,
        Math.min(this.containerWidth - this.bounds.x, newWidth),
      );
      newHeight = Math.max(
        this.minSize,
        Math.min(this.containerHeight - this.bounds.y, newHeight),
      );

      const newOppositeCorner = getCornerPoint(
        this.resizeStartPosition.x,
        this.resizeStartPosition.y,
        newWidth,
        newHeight,
        rotationRadians,
        oppositeCorner.x,
        oppositeCorner.y,
      );

      const offsetX = this.resizeStartCorner.x - newOppositeCorner.x;
      const offsetY = this.resizeStartCorner.y - newOppositeCorner.y;

      const newX = Math.max(
        0,
        Math.min(
          this.containerWidth - newWidth,
          this.resizeStartPosition.x + offsetX,
        ),
      );
      const newY = Math.max(
        0,
        Math.min(
          this.containerHeight - newHeight,
          this.resizeStartPosition.y + offsetY,
        ),
      );

      this.bounds = {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };
    } else {
      const constrainedX = Math.max(
        0,
        Math.min(
          this.containerWidth - this.bounds.width,
          this.dragStartPosition.x + deltaX,
        ),
      );
      const constrainedY = Math.max(
        0,
        Math.min(
          this.containerHeight - this.bounds.height,
          this.dragStartPosition.y + deltaY,
        ),
      );

      this.bounds = {
        ...this.bounds,
        x: constrainedX,
        y: constrainedY,
      };
    }

    this.dispatchBoundsChange();
  };

  private handlePointerUp = (e: PointerEvent) => {
    e.preventDefault();
    this.cleanup();
  };

  private cleanup() {
    this.isDragging = false;
    this.isResizing = null;
    this.dragStart = null;
    this.dragStartPosition = { x: 0, y: 0 };
    this.resizeStartCorner = null;
    this.resizeStartSize = null;
    this.resizeStartPosition = null;
    document.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("pointerup", this.handlePointerUp);
  }

  private dispatchBoundsChange() {
    this.dispatchEvent(
      new CustomEvent("bounds-change", {
        detail: { bounds: this.bounds },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const boxStyles = {
      left: `${this.bounds.x}px`,
      top: `${this.bounds.y}px`,
      width: `${this.bounds.width}px`,
      height: `${this.bounds.height}px`,
    };

    const handles: ResizeHandle[] = [
      "nw",
      "n",
      "ne",
      "e",
      "se",
      "s",
      "sw",
      "w",
    ];

    return html`
      <div
        class="box ${this.isDragging ? "dragging" : ""}"
        style=${styleMap(boxStyles)}
        @pointerdown=${(e: PointerEvent) => this.handlePointerDown(e, "move")}
      >
        ${handles.map(
          (handle) => html`
            <div
              class="handle ${handle}"
              @pointerdown=${(e: PointerEvent) => {
                e.stopPropagation();
                this.handlePointerDown(e, "resize", handle);
              }}
            ></div>
          `,
        )}
        <slot></slot>
      </div>
    `;
  }
}
