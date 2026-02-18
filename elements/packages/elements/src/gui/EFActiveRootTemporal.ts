import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { EFCanvas } from "../canvas/EFCanvas.js";
import type { TemporalMixinInterface } from "../elements/EFTemporal.js";

/**
 * Displays the ID of the active root temporal element from a canvas.
 * Automatically updates when selection changes.
 *
 * @example
 * ```html
 * <ef-active-root-temporal canvas="canvas"></ef-active-root-temporal>
 * ```
 */
@customElement("ef-active-root-temporal")
export class EFActiveRootTemporal extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }
  `;

  /**
   * Canvas element ID or selector to bind to.
   * If not specified, will search for the nearest ef-canvas ancestor.
   */
  @property({ type: String })
  canvas = "";

  @state()
  private activeRootTemporal: (TemporalMixinInterface & HTMLElement) | null =
    null;

  private canvasElement: EFCanvas | null = null;
  private activeroottemporalchangeHandler?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    this.findCanvas();
    this.setupListener();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeListener();
  }

  protected updated(
    changedProperties: Map<string | number | symbol, unknown>,
  ): void {
    if (changedProperties.has("canvas")) {
      this.findCanvas();
      this.setupListener();
    }
  }

  /**
   * Find the canvas element to bind to.
   */
  private findCanvas(): void {
    // If canvas attribute is set, use it
    if (this.canvas) {
      const byId = document.getElementById(this.canvas);
      if (byId && byId.tagName === "EF-CANVAS") {
        this.canvasElement = byId as EFCanvas;
        return;
      }

      // Try as selector
      try {
        const bySelector = document.querySelector(
          this.canvas,
        ) as EFCanvas | null;
        if (bySelector && bySelector.tagName === "EF-CANVAS") {
          this.canvasElement = bySelector;
          return;
        }
      } catch {
        // Invalid selector, ignore
      }
    }

    // Fall back to nearest ancestor
    const ancestor = this.closest("ef-canvas") as EFCanvas | null;
    if (ancestor) {
      this.canvasElement = ancestor;
      return;
    }

    this.canvasElement = null;
  }

  /**
   * Setup listener for activeroottemporalchange events.
   */
  private setupListener(): void {
    this.removeListener();

    if (!this.canvasElement) {
      this.activeRootTemporal = null;
      return;
    }

    // Get initial value
    const canvasEl = this.canvasElement as any;
    this.activeRootTemporal = canvasEl.activeRootTemporal || null;

    // Listen for changes
    this.activeroottemporalchangeHandler = () => {
      const canvasEl = this.canvasElement as any;
      this.activeRootTemporal = canvasEl.activeRootTemporal || null;
    };

    this.canvasElement.addEventListener(
      "activeroottemporalchange",
      this.activeroottemporalchangeHandler,
    );
  }

  /**
   * Remove event listener.
   */
  private removeListener(): void {
    if (this.canvasElement && this.activeroottemporalchangeHandler) {
      this.canvasElement.removeEventListener(
        "activeroottemporalchange",
        this.activeroottemporalchangeHandler,
      );
      this.activeroottemporalchangeHandler = undefined;
    }
  }

  render() {
    const displayText =
      this.activeRootTemporal?.id || this.textContent || "None";
    return html`<span>${displayText}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-active-root-temporal": EFActiveRootTemporal;
  }
}
