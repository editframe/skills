import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { EFCanvas } from "./EFCanvas.js";
import { CanvasAPI } from "./api/CanvasAPI.js";

/**
 * Canvas item wrapper component.
 *
 * @deprecated This component is deprecated. All DOM nodes in ef-canvas are now automatically
 * treated as canvas elements. Use plain HTML elements (div, etc.) instead.
 *
 * @example
 * ```html
 * <!-- Old way (deprecated) -->
 * <ef-canvas>
 *   <ef-canvas-item id="item-1" style="left: 100px; top: 100px;">
 *     <div>My content</div>
 *   </ef-canvas-item>
 * </ef-canvas>
 *
 * <!-- New way -->
 * <ef-canvas>
 *   <div id="item-1" style="left: 100px; top: 100px;">
 *     <div>My content</div>
 *   </div>
 * </ef-canvas>
 * ```
 */
@customElement("ef-canvas-item")
export class EFCanvasItem extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: absolute;
    }
  `;

  @property({ type: String, reflect: true })
  id = "";

  private canvas: EFCanvas | null = null;
  private api: CanvasAPI | null = null;
  private registeredId: string | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.findAndRegister();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unregister();
  }

  /**
   * Find parent ef-canvas and register this element.
   */
  private findAndRegister() {
    // Find parent ef-canvas
    this.canvas = this.closest("ef-canvas") as EFCanvas | null;
    if (!this.canvas) {
      console.warn("[EFCanvasItem] No parent ef-canvas found. Element will not be registered.");
      return;
    }

    // Wait for canvas to be ready
    this.canvas.updateComplete.then(() => {
      // Create API instance
      this.api = new CanvasAPI(this.canvas!);

      // Element must have an ID - check before registering
      if (!this.id) {
        console.error(
          "[EFCanvasItem] Element must have an 'id' attribute. Set it before adding to canvas.",
        );
        return;
      }

      // Register this element with the canvas
      // Pass the id explicitly - canvas will throw if it's missing or duplicate
      this.registeredId = this.api.registerElement(this, this.id);
    });
  }

  /**
   * Unregister this element from the canvas.
   */
  private unregister() {
    if (this.api && this.registeredId) {
      this.api.unregisterElement(this.registeredId);
      this.registeredId = null;
    }
    this.api = null;
    this.canvas = null;
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-canvas-item": EFCanvasItem;
  }
}
