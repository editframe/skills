import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { focusedElementContext } from "./focusedElementContext.js";

@customElement("ef-focus-overlay")
export class EFFocusOverlay extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .overlay {
      position: fixed;
      outline: 2px solid var(--ef-focus-overlay-color, var(--ef-color-primary));
      background: var(--ef-focus-overlay-background, var(--ef-color-primary));
      outline: 2px solid var(--ef-focus-overlay-color, var(--ef-color-primary));
      mix-blend-mode: multiply;
      opacity: 0.4;
      display: none;
    }
  `;

  @consume({ context: focusedElementContext, subscribe: true })
  focusedElement?: HTMLElement | null;

  overlay = createRef<HTMLDivElement>();

  private animationFrame?: number;

  drawOverlay = () => {
    const overlay = this.overlay.value;
    if (overlay) {
      if (this.focusedElement) {
        overlay.style.display = "block";
        const rect = this.focusedElement.getBoundingClientRect();
        Object.assign(overlay.style, {
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
        this.animationFrame = requestAnimationFrame(this.drawOverlay);
      } else {
        overlay.style.display = "none";
      }
    }
  };

  render() {
    return html`<div ${ref(this.overlay)} class="overlay"></div>`;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.drawOverlay();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  protected updated(): void {
    this.drawOverlay();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-focus-overlay": EFFocusOverlay;
  }
}
