import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { attachContextRoot } from "../attachContextRoot.js";
import type { ControllableInterface } from "./Controllable.js";
import { efContext } from "./efContext.js";
import { playingContext } from "./playingContext.js";
import { TargetOrContextMixin } from "./TargetOrContextMixin.js";

attachContextRoot();

@customElement("ef-toggle-play")
export class EFTogglePlay extends TargetOrContextMixin(LitElement, efContext) {
  static styles = [
    css`
      :host {}
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

  // Attach click listener to host
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("click", this.togglePlay);
  }

  // Detach click listener from host
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this.togglePlay);
  }

  render() {
    return html`
      <div>
        ${
          this.playing
            ? html`<slot name="pause"></slot>`
            : html`<slot name="play"></slot>`
        }
      </div>
    `;
  }

  togglePlay = () => {
    if (this.efContext) {
      if (this.playing) {
        this.efContext.pause();
      } else {
        this.efContext.play();
      }
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-toggle-play": EFTogglePlay;
  }
}
