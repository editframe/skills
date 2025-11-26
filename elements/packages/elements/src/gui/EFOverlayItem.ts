import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { EFOverlayLayer } from "./EFOverlayLayer.js";

/**
 * Position changed event detail.
 */
export interface OverlayItemPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Individual overlay item that tracks a target element.
 * Must be a direct child of ef-overlay-layer.
 *
 * NEW ARCHITECTURE: This component is now PASSIVE - it does not run its own RAF loop.
 * Instead, it registers with its parent EFOverlayLayer, which manages position updates
 * for all children in a synchronized RAF loop. This eliminates race conditions and
 * ensures transforms are applied before positions are read.
 */
@customElement("ef-overlay-item")
export class EFOverlayItem extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        position: absolute;
        pointer-events: auto;
        transform-origin: center;
      }
    `,
  ];

  @property({ type: String, attribute: "element-id" })
  elementId?: string;

  @property({ attribute: false })
  target?: HTMLElement | string;

  private currentPosition: OverlayItemPosition | null = null;

  private parseRotationFromTransform(transform: string): number {
    if (!transform || transform === "none") return 0;

    // Try to match rotate() function syntax first
    const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
    if (rotateMatch) {
      const value = rotateMatch[1].trim();
      const numValue = parseFloat(value);
      const unit = value.replace(String(numValue), "").trim();
      if (unit === "rad" || unit === "radians") {
        return (numValue * 180) / Math.PI;
      }
      return numValue;
    }

    // Handle matrix transform: matrix(a, b, c, d, tx, ty)
    // For rotation: a = cos(θ), b = sin(θ), c = -sin(θ), d = cos(θ)
    // So we can extract θ using atan2(b, a)
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const values = matrixMatch[1].split(",").map((v) => parseFloat(v.trim()));
      if (values.length >= 2) {
        const a = values[0]; // cos(θ)
        const b = values[1]; // sin(θ)
        const radians = Math.atan2(b, a);
        return (radians * 180) / Math.PI;
      }
    }

    return 0;
  }

  private resolveTarget(): HTMLElement | null {
    if (this.elementId) {
      let element = document.querySelector(
        `[data-element-id="${this.elementId}"]`,
      ) as HTMLElement;

      if (!element) {
        element = document.querySelector(
          `[data-timegroup-id="${this.elementId}"]`,
        ) as HTMLElement;
      }

      return element || null;
    }

    if (!this.target) return null;

    if (typeof this.target === "string") {
      return (
        (document.querySelector(this.target) as HTMLElement) ||
        document.getElementById(this.target)
      );
    }

    // For direct HTMLElement references, verify the element is still in the DOM
    if (!this.target.isConnected) {
      return null;
    }

    return this.target;
  }

  /**
   * Update position based on target element.
   * Called by parent EFOverlayLayer in its synchronized RAF loop.
   * PUBLIC API - called by parent layer.
   */
  updatePosition() {
    const targetElement = this.resolveTarget();
    if (!targetElement) {
      // Target not found - hide the overlay item
      if (this.style.display !== "none") {
        this.style.display = "none";
      }
      return;
    }

    // Target found - ensure we're visible
    if (this.style.display === "none") {
      this.style.display = "";
    }

    // Use parent element as overlay layer (like old system)
    const overlayLayer = this.parentElement;
    if (!overlayLayer) {
      return;
    }

    const overlayLayerRect = overlayLayer.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    if (targetRect.width === 0 && targetRect.height === 0) return;

    const computedStyle = window.getComputedStyle(targetElement);
    const rotation = this.parseRotationFromTransform(computedStyle.transform);

    const overlayPosition = {
      x: targetRect.left - overlayLayerRect.left,
      y: targetRect.top - overlayLayerRect.top,
      width: targetRect.width,
      height: targetRect.height,
      rotation,
    };

    // DEBUG: Log size changes
    if (
      this.currentPosition &&
      Math.abs(this.currentPosition.width - overlayPosition.width) > 1
    ) {
      console.log("EFOverlayItem size change:", {
        target: this.target,
        oldWidth: this.currentPosition.width,
        newWidth: overlayPosition.width,
        targetRect: { width: targetRect.width, height: targetRect.height },
        timestamp: performance.now(),
      });
    }

    if (overlayPosition.width <= 0 || overlayPosition.height <= 0) return;

    const positionChanged =
      !this.currentPosition ||
      Math.abs(this.currentPosition.x - overlayPosition.x) > 0.01 ||
      Math.abs(this.currentPosition.y - overlayPosition.y) > 0.01 ||
      Math.abs(this.currentPosition.width - overlayPosition.width) > 0.01 ||
      Math.abs(this.currentPosition.height - overlayPosition.height) > 0.01 ||
      Math.abs(this.currentPosition.rotation - overlayPosition.rotation) > 0.01;

    if (positionChanged) {
      this.currentPosition = overlayPosition;

      this.style.left = `${overlayPosition.x}px`;
      this.style.top = `${overlayPosition.y}px`;
      this.style.width = `${overlayPosition.width}px`;
      this.style.height = `${overlayPosition.height}px`;

      if (overlayPosition.rotation !== 0) {
        this.style.transform = `rotate(${overlayPosition.rotation}deg)`;
      } else {
        this.style.transform = "";
      }

      this.dispatchEvent(
        new CustomEvent<OverlayItemPosition>("position-changed", {
          detail: { ...overlayPosition },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Register with parent overlay layer for coordinated updates
    const parent = this.parentElement as EFOverlayLayer | null;
    if (parent && typeof (parent as any).registerOverlayItem === "function") {
      (parent as any).registerOverlayItem(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Unregister from parent overlay layer
    const parent = this.parentElement as EFOverlayLayer | null;
    if (parent && typeof (parent as any).unregisterOverlayItem === "function") {
      (parent as any).unregisterOverlayItem(this);
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-overlay-item": EFOverlayItem;
  }
}
