import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { getCornerPoint, getOppositeCorner } from "./transformUtils.js";

const DEFAULT_MIN_SIZE = 10;

export interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

@customElement("ef-transform-handles")
export class EFTransformHandles extends LitElement {
  @property({ type: Object })
  bounds: TransformBounds = { x: 0, y: 0, width: 100, height: 100 };

  @property({ type: Number })
  minSize = DEFAULT_MIN_SIZE;

  @property({ type: String })
  target?: string;

  @property({ type: Number, attribute: "canvas-scale" })
  canvasScale = 1;

  @property({ type: Boolean, attribute: "enable-rotation" })
  enableRotation = false;

  @property({ type: Boolean, attribute: "enable-resize" })
  enableResize = true;

  @property({ type: Boolean, attribute: "enable-drag" })
  enableDrag = true;

  @property({ type: Number, attribute: "rotation-step" })
  rotationStep?: number;

  @state()
  private isDragging = false;

  @state()
  private isResizing: ResizeHandle | null = null;

  @state()
  private isRotating = false;

  private dragStart: { x: number; y: number } | null = null;
  private dragStartPosition: { x: number; y: number } = { x: 0, y: 0 };
  private rotationStartAngle: number | null = null;
  private rotationStartRotation = 0;
  private resizeStartCorner: { x: number; y: number } | null = null;
  private resizeStartSize: { width: number; height: number } | null = null;
  private resizeStartPosition: { x: number; y: number } | null = null;
  private dimensionsRef = { width: 0, height: 0 };

  static styles = css`
    :host {
      display: block;
      position: absolute;
      pointer-events: none;
    }
    .overlay {
      position: absolute;
      border: 2px solid var(--ef-transform-handles-border-color, #3b82f6);
      pointer-events: none;
    }
    .overlay.dragging {
      border-color: var(--ef-transform-handles-dragging-border-color, #2563eb);
    }
    .drag-area {
      position: absolute;
      inset: 0;
      cursor: move;
      pointer-events: auto;
    }
    .handle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--ef-transform-handles-handle-color, white);
      border: 1px solid var(--ef-transform-handles-handle-border-color, #3b82f6);
      pointer-events: auto;
    }
    .handle.nw { top: -4px; left: -4px; cursor: nw-resize; }
    .handle.n { top: -4px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
    .handle.ne { top: -4px; right: -4px; cursor: ne-resize; }
    .handle.e { top: 50%; right: -4px; transform: translateY(-50%); cursor: e-resize; }
    .handle.se { bottom: -4px; right: -4px; cursor: se-resize; }
    .handle.s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
    .handle.sw { bottom: -4px; left: -4px; cursor: sw-resize; }
    .handle.w { top: 50%; left: -4px; transform: translateY(-50%); cursor: w-resize; }
    .rotate-handle {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      cursor: grab;
      pointer-events: auto;
    }
    .rotate-handle-circle {
      width: 24px;
      height: 24px;
      background: var(--ef-transform-handles-rotate-handle-color, #10b981);
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rotate-handle-circle span {
      font-size: 12px;
      color: white;
    }
  `;

  private resizeObserver?: ResizeObserver;

  connectedCallback() {
    super.connectedCallback();
    this.updateDimensions();
    this.resizeObserver = new ResizeObserver(() => {
      this.updateDimensions();
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

  private updateDimensions() {
    if (this.target) {
      const element =
        typeof this.target === "string"
          ? (document.querySelector(this.target) as HTMLElement)
          : this.target;
      if (element) {
        this.dimensionsRef.width = element.offsetWidth;
        this.dimensionsRef.height = element.offsetHeight;
      }
    }
  }

  private getCurrentBounds(): TransformBounds {
    if (this.target) {
      const element =
        typeof this.target === "string"
          ? (document.querySelector(this.target) as HTMLElement)
          : null;
      if (element) {
        const rect = element.getBoundingClientRect();
        const parentRect = this.offsetParent?.getBoundingClientRect() || {
          left: 0,
          top: 0,
        };
        const bounds: TransformBounds = {
          x: rect.left - parentRect.left,
          y: rect.top - parentRect.top,
          width: rect.width,
          height: rect.height,
        };

        if (this.enableRotation) {
          const computedStyle = window.getComputedStyle(element);
          const transform = computedStyle.transform;
          bounds.rotation = this.parseRotationFromTransform(transform);
        }

        return bounds;
      }
    }
    const bounds = { ...this.bounds };
    if (!this.enableRotation) {
      delete bounds.rotation;
    }
    return bounds;
  }

  private parseRotationFromTransform(transform: string): number {
    if (!transform || transform === "none") return 0;
    const matrix = transform.match(/matrix\(([^)]+)\)/);
    if (!matrix) return 0;
    const values = matrix[1].split(",").map((v) => parseFloat(v.trim()));
    if (values.length < 4) return 0;
    const a = values[0];
    const b = values[1];
    return Math.atan2(b, a) * (180 / Math.PI);
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.enableDrag) return;
    e.stopPropagation();
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    const currentBounds = this.getCurrentBounds();
    this.dragStartPosition = { x: currentBounds.x, y: currentBounds.y };
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  };

  private handleResizeMouseDown = (e: MouseEvent, handle: ResizeHandle) => {
    if (!this.enableResize) return;
    e.stopPropagation();
    this.isResizing = handle;
    this.dragStart = { x: e.clientX, y: e.clientY };

    const currentBounds = this.getCurrentBounds();
    const currentWidth = currentBounds.width || this.dimensionsRef.width;
    const currentHeight = currentBounds.height || this.dimensionsRef.height;
    const currentRotation = this.enableRotation
      ? (currentBounds.rotation ?? 0)
      : 0;

    const oppositeCorner = getOppositeCorner(handle);
    const rotationRadians = (currentRotation * Math.PI) / 180;
    const initialCorner = getCornerPoint(
      currentBounds.x,
      currentBounds.y,
      currentWidth,
      currentHeight,
      rotationRadians,
      oppositeCorner.x,
      oppositeCorner.y,
    );

    this.resizeStartCorner = initialCorner;
    this.resizeStartSize = { width: currentWidth, height: currentHeight };
    this.resizeStartPosition = { x: currentBounds.x, y: currentBounds.y };

    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  };

  private handleRotateMouseDown = (e: MouseEvent) => {
    if (!this.enableRotation) return;
    e.stopPropagation();
    this.isRotating = true;
    this.dragStart = { x: e.clientX, y: e.clientY };

    const targetElement = this.target
      ? typeof this.target === "string"
        ? (document.querySelector(this.target) as HTMLElement)
        : this.target
      : null;

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const radians = Math.atan2(dy, dx);
      const degrees = radians * (180 / Math.PI) + 90;
      this.rotationStartAngle = degrees;
      const currentBounds = this.getCurrentBounds();
      this.rotationStartRotation = currentBounds.rotation ?? 0;
    }

    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.dragStart) return;

    const currentBounds = this.getCurrentBounds();
    const currentX = currentBounds.x;
    const currentY = currentBounds.y;
    const currentWidth = currentBounds.width || this.dimensionsRef.width;
    const currentHeight = currentBounds.height || this.dimensionsRef.height;
    const currentRotation = this.enableRotation
      ? (currentBounds.rotation ?? 0)
      : 0;

    if (this.isDragging) {
      const screenDeltaX = e.clientX - this.dragStart.x;
      const screenDeltaY = e.clientY - this.dragStart.y;
      const canvasDeltaX = screenDeltaX / this.canvasScale;
      const canvasDeltaY = screenDeltaY / this.canvasScale;

      const newX = this.dragStartPosition.x + canvasDeltaX;
      const newY = this.dragStartPosition.y + canvasDeltaY;

      this.bounds = {
        ...this.bounds,
        x: newX,
        y: newY,
      };

      this.dragStart = { x: e.clientX, y: e.clientY };
      this.dragStartPosition = { x: newX, y: newY };

      this.dispatchBoundsChange();
    } else if (
      this.isResizing &&
      this.resizeStartCorner &&
      this.resizeStartSize &&
      this.resizeStartPosition
    ) {
      const screenDeltaX = e.clientX - this.dragStart.x;
      const screenDeltaY = e.clientY - this.dragStart.y;
      const canvasDeltaX = screenDeltaX / this.canvasScale;
      const canvasDeltaY = screenDeltaY / this.canvasScale;

      const rotationRadians = (currentRotation * Math.PI) / 180;
      const oppositeCorner = getOppositeCorner(this.isResizing);
      const initialCorner = this.resizeStartCorner;

      const cos = Math.cos(-rotationRadians);
      const sin = Math.sin(-rotationRadians);
      const rotatedDeltaX = cos * canvasDeltaX - sin * canvasDeltaY;
      const rotatedDeltaY = sin * canvasDeltaX + cos * canvasDeltaY;

      let newWidth = currentWidth;
      let newHeight = currentHeight;

      if (this.isResizing.includes("e")) {
        newWidth = currentWidth + rotatedDeltaX;
      } else if (this.isResizing.includes("w")) {
        newWidth = currentWidth - rotatedDeltaX;
      }

      if (this.isResizing.includes("s")) {
        newHeight = currentHeight + rotatedDeltaY;
      } else if (this.isResizing.includes("n")) {
        newHeight = currentHeight - rotatedDeltaY;
      }

      newWidth = Math.max(this.minSize, newWidth);
      newHeight = Math.max(this.minSize, newHeight);

      const newOppositeCorner = getCornerPoint(
        currentX,
        currentY,
        newWidth,
        newHeight,
        rotationRadians,
        oppositeCorner.x,
        oppositeCorner.y,
      );

      const offsetX = initialCorner.x - newOppositeCorner.x;
      const offsetY = initialCorner.y - newOppositeCorner.y;

      const newX = currentX + offsetX;
      const newY = currentY + offsetY;

      this.bounds = {
        ...this.bounds,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };

      this.dragStart = { x: e.clientX, y: e.clientY };

      this.dispatchBoundsChange();
    } else if (this.isRotating && this.rotationStartAngle !== null) {
      const targetElement = this.target
        ? typeof this.target === "string"
          ? (document.querySelector(this.target) as HTMLElement)
          : this.target
        : null;

      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const radians = Math.atan2(dy, dx);
      const currentAngle = radians * (180 / Math.PI) + 90;

      const deltaAngle = currentAngle - this.rotationStartAngle;
      let newRotation = this.rotationStartRotation + deltaAngle;

      if (this.rotationStep !== undefined) {
        newRotation =
          Math.round(newRotation / this.rotationStep) * this.rotationStep;
      }

      this.bounds = {
        ...this.bounds,
        rotation: newRotation,
      };

      this.dragStart = { x: e.clientX, y: e.clientY };

      this.dispatchRotationChange();
    }
  };

  private handleMouseUp = () => {
    this.cleanup();
  };

  private cleanup() {
    this.isDragging = false;
    this.isResizing = null;
    this.isRotating = false;
    this.dragStart = null;
    this.dragStartPosition = { x: 0, y: 0 };
    this.rotationStartAngle = null;
    this.rotationStartRotation = 0;
    this.resizeStartCorner = null;
    this.resizeStartSize = null;
    this.resizeStartPosition = null;
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
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

  private dispatchRotationChange() {
    this.dispatchEvent(
      new CustomEvent("rotation-change", {
        detail: { rotation: this.bounds.rotation },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const currentBounds = this.getCurrentBounds();
    const rotation = this.enableRotation ? (currentBounds.rotation ?? 0) : 0;

    const overlayStyles: Record<string, string> = {
      left: `${currentBounds.x}px`,
      top: `${currentBounds.y}px`,
      width: `${currentBounds.width}px`,
      height: `${currentBounds.height}px`,
    };

    if (this.enableRotation && rotation !== 0) {
      overlayStyles.transform = `rotate(${rotation}deg)`;
      overlayStyles.transformOrigin = "center";
    }

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
        class="overlay ${this.isDragging ? "dragging" : ""}"
        style=${styleMap(overlayStyles)}
      >
        ${
          this.enableDrag
            ? html`
              <div
                class="drag-area"
                @mousedown=${this.handleMouseDown}
              ></div>
            `
            : ""
        }
        ${
          this.enableResize
            ? handles.map(
                (handle) => html`
                <div
                  class="handle ${handle}"
                  @mousedown=${(e: MouseEvent) => this.handleResizeMouseDown(e, handle)}
                ></div>
              `,
              )
            : ""
        }
        ${
          this.enableRotation
            ? html`
              <div class="rotate-handle" @mousedown=${this.handleRotateMouseDown}>
                <div class="rotate-handle-circle">
                  <span>↻</span>
                </div>
              </div>
            `
            : ""
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-transform-handles": EFTransformHandles;
  }
}
