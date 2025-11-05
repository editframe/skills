import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { attachContextRoot } from "../attachContextRoot.js";
import type { ControllableInterface } from "./Controllable.js";
import { efContext } from "./efContext.js";
import { playingContext } from "./playingContext.js";
import { TargetOrContextMixin } from "./TargetOrContextMixin.js";

attachContextRoot();

@customElement("ef-play")
export class EFPlay extends TargetOrContextMixin(LitElement, efContext) {
  static styles = [
    css`
      :host {
        display: block;
      }
      :host([hidden]) {
        display: none;
      }
      div {
        all: inherit;
      }
    `,
  ];

  @consume({ context: playingContext, subscribe: true })
  @state()
  playing = false;

  get efContext(): ControllableInterface | null {
    return this.effectiveContext;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("click", this.handleClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this.handleClick);
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);

    if (changedProperties.has("playing")) {
      this.style.display = this.playing ? "none" : "";
    }
  }

  render() {
    return html`
      <div>
        <slot></slot>
      </div>
    `;
  }

  handleClick = () => {
    if (this.efContext) {
      this.efContext.play();
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-play": EFPlay;
  }
}
