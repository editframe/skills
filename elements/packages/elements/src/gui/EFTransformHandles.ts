import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { panZoomTransformContext } from "./panZoomTransformContext.js";
import type { PanZoomTransform } from "../elements/EFPanZoom.js";
import {
  type ResizeHandle,
  calculateDragBounds,
  calculateResizeBounds,
  getResizeHandleCursor,
} from "./transformCalculations.js";
import { getCornerPoint, getOppositeCorner } from "./transformUtils.js";

const DEFAULT_MIN_SIZE = 10;

export interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

/**
 * Interaction mode enumeration.
 * Only one mode can be active at a time (invariant).
 */
type InteractionMode = "idle" | "dragging" | "resizing" | "rotating";

@customElement("ef-transform-handles")
export class EFTransformHandles extends LitElement {
  @property({ type: Object })
  bounds: TransformBounds = { x: 0, y: 0, width: 100, height: 100 };

  @property({ type: Number })
  minSize = DEFAULT_MIN_SIZE;

  @property({ type: String })
  target?: string;

  @consume({ context: panZoomTransformContext, subscribe: true })
  panZoomTransformFromContext?: PanZoomTransform;

  @property({ type: Number, attribute: "canvas-scale" })
  canvasScale = 1;

  @property({ type: Boolean, attribute: "enable-rotation" })
  enableRotation = false;

  @property({ type: Boolean, attribute: "enable-resize" })
  enableResize = true;

  @property({ type: Boolean, attribute: "corners-only" })
  cornersOnly = false;

  @property({ type: Boolean, attribute: "lock-aspect-ratio" })
  lockAspectRatio = false;

  @property({ type: Boolean, attribute: "enable-drag" })
  enableDrag = true;

  @property({ type: Number, attribute: "rotation-step" })
  rotationStep?: number;

  /**
   * Current interaction mode.
   * Invariant: Only one mode active at a time.
   */
  @state()
  interactionMode: InteractionMode = "idle";

  /**
   * Active resize handle when in "resizing" mode.
   * Only valid when interactionMode === "resizing".
   */
  private activeResizeHandle: ResizeHandle | null = null;

  /**
   * Mouse start position for calculating deltas.
   * Only valid during active interaction.
   */
  private mouseStart: { x: number; y: number } | null = null;

  /**
   * Initial bounds at interaction start - NEVER mutated during interaction.
   * All calculations derive from this + mouse deltas.
   * Note: Not a @state() property to avoid re-renders during interaction.
   */
  private initialBounds: TransformBounds | null = null;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      pointer-events: none;
    }
    .overlay {
      position: absolute;
      border: 2px solid var(--ef-transform-handles-border-color, var(--ef-color-primary));
      pointer-events: none;
    }
    .overlay.dragging {
      border-color: var(--ef-transform-handles-dragging-border-color, var(--ef-color-primary));
    }
    .drag-area {
      position: absolute;
      inset: 0;
      cursor: move;
      pointer-events: none;
    }
    /* Only enable pointer events when actively dragging */
    .drag-area:active {
      pointer-events: auto;
    }
    .handle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--ef-transform-handles-handle-color, var(--ef-color-bg-elevated));
      border: 1px solid var(--ef-transform-handles-handle-border-color, var(--ef-color-primary));
      pointer-events: auto;
      /* Only capture pointer events, allow wheel events to pass through */
      touch-action: none;
    }
    .handle.nw { top: -4px; left: -4px; }
    .handle.n { top: -4px; left: 50%; transform: translateX(-50%); }
    .handle.ne { top: -4px; right: -4px; }
    .handle.e { top: 50%; right: -4px; transform: translateY(-50%); }
    .handle.se { bottom: -4px; right: -4px; }
    .handle.s { bottom: -4px; left: 50%; transform: translateX(-50%); }
    .handle.sw { bottom: -4px; left: -4px; }
    .handle.w { top: 50%; left: -4px; transform: translateY(-50%); }
    .rotate-handle {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      cursor: grab;
      pointer-events: auto;
      /* Only capture pointer events, allow wheel events to pass through */
      touch-action: none;
    }
    .rotate-handle-circle {
      width: 24px;
      height: 24px;
      background: var(--ef-transform-handles-rotate-handle-color, var(--ef-color-success));
      border: 2px solid var(--ef-color-bg-elevated);
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

  /**
   * Single source of truth for zoom scale.
   * Priority: context > prop > 1.0
   */
  private getZoomScale(): number {
    return this.panZoomTransformFromContext?.scale ?? this.canvasScale ?? 1;
  }

  /**
   * Convert screen pixel bounds to canvas coordinates.
   */
  private screenToCanvas(bounds: TransformBounds): TransformBounds {
    const scale = this.getZoomScale();
    return {
      x: bounds.x / scale,
      y: bounds.y / scale,
      width: bounds.width / scale,
      height: bounds.height / scale,
      rotation: bounds.rotation,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => {
      // Dimensions are read directly when needed
    });
    if (this.offsetParent) {
      this.resizeObserver.observe(this.offsetParent);
    }
    // Forward wheel events to parent panzoom so zoom works even when pointer is over handles
    // Wheel events should pass through, but we'll forward them to ensure panzoom receives them
    this.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        // Only forward if not actively interacting with handles
        if (this.interactionMode === "idle") {
          // Find parent panzoom and forward the event
          const panZoom = this.closest("ef-pan-zoom");
          if (panZoom) {
            // Create a new wheel event and dispatch it on panzoom
            const wheelEvent = new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              clientX: e.clientX,
              clientY: e.clientY,
              deltaX: e.deltaX,
              deltaY: e.deltaY,
              deltaZ: e.deltaZ,
              deltaMode: e.deltaMode,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
              shiftKey: e.shiftKey,
              altKey: e.altKey,
            });
            panZoom.dispatchEvent(wheelEvent);
          }
        }
      },
      { passive: true },
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.cleanup();
  }

  /**
   * Transition interaction mode state machine.
   * Ensures only one mode is active at a time (invariant).
   */
  private transitionInteractionMode(
    event: "mousedown-drag" | "mousedown-resize" | "mousedown-rotate" | "mouseup",
  ): InteractionMode {
    if (event === "mouseup") {
      return "idle";
    }
    // Only allow transition from idle
    if (this.interactionMode !== "idle") {
      return this.interactionMode;
    }
    switch (event) {
      case "mousedown-drag":
        return "dragging";
      case "mousedown-resize":
        return "resizing";
      case "mousedown-rotate":
        return "rotating";
      default:
        return "idle";
    }
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.enableDrag) return;
    e.stopPropagation();
    this.interactionMode = this.transitionInteractionMode("mousedown-drag");
    this.mouseStart = { x: e.clientX, y: e.clientY };
    this.initialBounds = { ...this.bounds };
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  };

  private handleResizeMouseDown = (e: MouseEvent, handle: ResizeHandle) => {
    if (!this.enableResize) return;
    e.stopPropagation();
    e.preventDefault();
    this.interactionMode = this.transitionInteractionMode("mousedown-resize");
    this.activeResizeHandle = handle;
    this.mouseStart = { x: e.clientX, y: e.clientY };
    // Store initial bounds as-is (in screen pixels) - we'll convert to canvas when calculating
    this.initialBounds = { ...this.bounds };
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  };

  private handleRotateMouseDown = (e: MouseEvent) => {
    if (!this.enableRotation) return;
    e.stopPropagation();
    this.interactionMode = this.transitionInteractionMode("mousedown-rotate");
    this.mouseStart = { x: e.clientX, y: e.clientY };
    this.initialBounds = { ...this.bounds };
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  };

  /**
   * Dispatch bounds change event (one-way data flow).
   * Parent updates element, then reads element and updates handle bounds prop.
   * We don't modify this.bounds directly - always render from prop.
   */
  private dispatchBoundsChange(bounds: TransformBounds): void {
    this.dispatchEvent(
      new CustomEvent("bounds-change", {
        detail: { bounds },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.mouseStart || !this.initialBounds) return;

    // Calculate mouse deltas in viewport coordinates
    const screenDeltaX = e.clientX - this.mouseStart.x;
    const screenDeltaY = e.clientY - this.mouseStart.y;

    switch (this.interactionMode) {
      case "dragging": {
        const zoomScale = this.getZoomScale();
        const initialCanvas = this.screenToCanvas(this.initialBounds);

        const newPosition = calculateDragBounds(
          { x: initialCanvas.x, y: initialCanvas.y },
          screenDeltaX,
          screenDeltaY,
          zoomScale,
        );

        this.dispatchBoundsChange({
          ...newPosition,
          width: initialCanvas.width,
          height: initialCanvas.height,
          rotation: this.initialBounds.rotation,
        });
        break;
      }

      case "resizing": {
        if (!this.activeResizeHandle) return;

        const zoomScale = this.getZoomScale();
        const initialCanvas = this.screenToCanvas(this.initialBounds);
        const rotation = this.enableRotation ? (this.initialBounds.rotation ?? 0) : 0;

        // Calculate the fixed corner (opposite to handle being dragged)
        const oppositeCorner = getOppositeCorner(this.activeResizeHandle);
        const rotationRadians = (rotation * Math.PI) / 180;
        const fixedCorner = getCornerPoint(
          initialCanvas.x,
          initialCanvas.y,
          initialCanvas.width,
          initialCanvas.height,
          rotationRadians,
          oppositeCorner.x,
          oppositeCorner.y,
        );

        const newCanvasBounds = calculateResizeBounds(
          { width: initialCanvas.width, height: initialCanvas.height },
          { x: initialCanvas.x, y: initialCanvas.y },
          fixedCorner,
          this.activeResizeHandle,
          screenDeltaX,
          screenDeltaY,
          rotation,
          this.minSize / zoomScale,
          zoomScale,
          {
            lockAspectRatio: this.lockAspectRatio || e.shiftKey,
            resizeFromCenter: e.ctrlKey || e.metaKey,
          },
        );

        // Preserve rotation
        newCanvasBounds.rotation = this.initialBounds.rotation;
        this.dispatchBoundsChange(newCanvasBounds);
        break;
      }

      case "rotating": {
        // Calculate center in screen coordinates (bounds are overlay-relative)
        const overlayRect = this.offsetParent?.getBoundingClientRect() ?? {
          left: 0,
          top: 0,
        };
        const centerX = overlayRect.left + this.initialBounds.x + this.initialBounds.width / 2;
        const centerY = overlayRect.top + this.initialBounds.y + this.initialBounds.height / 2;

        // Calculate angle from mouse start to current position
        const startAngle =
          Math.atan2(this.mouseStart.y - centerY, this.mouseStart.x - centerX) * (180 / Math.PI) +
          90;
        const currentAngle =
          Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;

        // Normalize angle difference to [-180, 180] to avoid wrapping issues
        let deltaAngle = currentAngle - startAngle;
        while (deltaAngle > 180) deltaAngle -= 360;
        while (deltaAngle < -180) deltaAngle += 360;

        let newRotation = (this.initialBounds.rotation ?? 0) + deltaAngle;
        if (this.rotationStep !== undefined && this.rotationStep > 0) {
          newRotation = Math.round(newRotation / this.rotationStep) * this.rotationStep;
        }

        this.dispatchEvent(
          new CustomEvent("rotation-change", {
            detail: { rotation: newRotation },
            bubbles: true,
            composed: true,
          }),
        );
        break;
      }

      case "idle":
        // No action needed
        break;
    }
  };

  private handleMouseUp = () => {
    this.cleanup();
  };

  private cleanup() {
    this.interactionMode = this.transitionInteractionMode("mouseup");
    this.activeResizeHandle = null;
    this.mouseStart = null;
    this.initialBounds = null;
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
  }

  render() {
    // Always render from bounds prop (one-way data flow)
    // During interaction: dispatch events, parent updates element, parent updates handle bounds prop
    const currentBounds = this.bounds;
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

    const allHandles: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    const cornerHandles: ResizeHandle[] = ["nw", "ne", "se", "sw"];
    const handles = this.cornersOnly ? cornerHandles : allHandles;

    return html`
      <div
        class="overlay ${this.interactionMode === "dragging" ? "dragging" : ""}"
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
            ? handles.map((handle) => {
                const rotation = this.enableRotation ? (currentBounds.rotation ?? 0) : 0;
                const cursor = getResizeHandleCursor(handle, rotation);
                return html`
                <div
                  class="handle ${handle}"
                      style=${styleMap({ cursor })}
                  @mousedown=${(e: MouseEvent) => this.handleResizeMouseDown(e, handle)}
                ></div>
                  `;
              })
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
