import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import type { ControllableInterface } from "./Controllable.js";
import { efContext } from "./efContext.js";
import { TargetOrContextMixin } from "./TargetOrContextMixin.js";

@customElement("ef-toggle-loop")
export class EFToggleLoop extends TargetOrContextMixin(LitElement, efContext) {
  static styles = [
    css`
      :host {}
    `,
  ];

  get context(): ControllableInterface | null {
    return this.effectiveContext;
  }

  render() {
    return html`
      <slot @click=${() => {
        if (this.context) {
          this.context.loop = !this.context.loop;
        }
      }}></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-toggle-loop": EFToggleLoop;
  }
}
