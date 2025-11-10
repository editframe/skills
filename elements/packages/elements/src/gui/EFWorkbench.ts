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
        
        /* Light mode colors */
        --workbench-bg: rgb(30 41 59); /* slate-800 */
        --workbench-overlay-border: rgb(59 130 246); /* blue-500 */
        --workbench-overlay-bg: rgb(191 219 254); /* blue-200 */
      }
      
      :host(.dark), :host-context(.dark) {
        /* Dark mode colors */
        --workbench-bg: rgb(2 6 23); /* slate-950 */
        --workbench-overlay-border: rgb(96 165 250); /* blue-400 */
        --workbench-overlay-bg: rgb(30 58 138); /* blue-900 */
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
        class="grid h-full w-full"
        style="grid-template-rows: 1fr 300px; grid-template-columns: 100%; background-color: var(--workbench-bg);"
      >
        <div
          class="relative h-full w-full overflow-hidden"
          @wheel=${this.handleStageWheel}
        >
          <ef-fit-scale class="h-full grid place-content-center">
            <slot name="canvas" class="contents"></slot>
          </ef-fit-scale>
          <div
            class="border bg-opacity-20 absolute"
            style="border-color: var(--workbench-overlay-border); background-color: var(--workbench-overlay-bg);"
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
