import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, eventOptions, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";

import { ContextMixin } from "./ContextMixin.js";
import { TWMixin } from "./TWMixin.js";

@customElement("ef-workbench")
export class EFWorkbench extends ContextMixin(TWMixin(LitElement)) {
  static styles = [
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ];

  @property({ type: Boolean })
  rendering = false;

  focusOverlay = createRef<HTMLDivElement>();

  @eventOptions({ passive: false, capture: true })
  handleStageWheel(event: WheelEvent) {
    event.preventDefault();
  }

  connectedCallback(): void {
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.body.style.width = "";
    document.body.style.height = "";
    document.documentElement.style.width = "";
    document.documentElement.style.height = "";
  }

  update(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    super.update(changedProperties);

    if (changedProperties.has("focusedElement")) {
      this.drawOverlays();
    }
  }

  drawOverlays = () => {
    const focusOverlay = this.focusOverlay.value;
    if (focusOverlay) {
      if (this.focusedElement) {
        focusOverlay.style.display = "block";
        const rect = this.focusedElement.getBoundingClientRect();
        Object.assign(focusOverlay.style, {
          position: "fixed",
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
        requestAnimationFrame(this.drawOverlays);
      } else {
        focusOverlay.style.display = "none";
      }
    }
  };

  render() {
    // TODO: this.rendering is not correctly set when using the framegen bridge
    // so to hack we're checking for the existence of EF_RENDERING on the window
    if (
      this.rendering ||
      (typeof window !== "undefined" && window.EF_RENDERING?.() === true)
    ) {
      return html`
        <slot class="fixed inset-0 h-full w-full" name="canvas"></slot>
      `;
    }
    return html`
      <div
        class="grid h-full w-full bg-slate-800"
        style="grid-template-rows: 1fr 300px; grid-template-columns: 100%;"
      >
        <div
          class="relative h-full w-full overflow-hidden"
          @wheel=${this.handleStageWheel}
        >
          <ef-fit-scale class="h-full grid place-content-center">
            <slot name="canvas" class="contents"></slot>
          </ef-fit-scale>
          <div
            class="border border-blue-500 bg-blue-200 bg-opacity-20 absolute"
            ${ref(this.focusOverlay)}
          ></div>
        </div>

        <slot class="overflow inline-block" name="timeline"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-workbench": EFWorkbench;
  }
}
