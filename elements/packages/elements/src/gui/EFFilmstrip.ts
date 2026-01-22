import { consume } from "@lit/context";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";

import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../elements/EFTemporal.js";
import { TargetController } from "../elements/TargetController.js";
import { targetTemporalContext } from "./ContextMixin.ts";
import { TWMixin } from "./TWMixin.js";
import "./timeline/EFTimeline.js";

@customElement("ef-filmstrip")
export class EFFilmstrip extends TWMixin(LitElement) {
  // CSS custom properties are now defined in track components
  // Keep this class minimal as a wrapper

  @property({ type: String })
  target = "";

  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs = 0.04;

  @property({ type: Boolean, attribute: "hide-playhead" })
  hidePlayhead = false;

  @property({ type: Boolean, attribute: "disable-internal-scroll" })
  disableInternalScroll = false;

  @property({ type: String })
  hide = "";

  @property({ type: String })
  show = "";

  @state()
  targetElement: Element | null = null;

  #targetController?: TargetController;
  #lastTargetTemporal?: TemporalMixinInterface | null;

  @consume({ context: targetTemporalContext, subscribe: true })
  @state()
  private _contextProvidedTemporal?: TemporalMixinInterface | null;

  get targetTemporal(): TemporalMixinInterface | null {
    const fromTarget =
      this.targetElement && isEFTemporal(this.targetElement)
        ? (this.targetElement as TemporalMixinInterface & HTMLElement)
        : null;
    const fromContext = this._contextProvidedTemporal;

    if (fromTarget && fromContext && fromTarget !== fromContext) {
      console.warn(
        "EFFilmstrip: Both target attribute and parent context found. Using target attribute.",
        { target: this.target, fromTarget, fromContext },
      );
    }

    return fromTarget ?? fromContext ?? null;
  }

  get hideSelectors(): string[] | undefined {
    if (!this.hide) return undefined;
    return this.hide
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  get showSelectors(): string[] | undefined {
    if (!this.show) return undefined;
    return this.show
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  timelineRef = createRef<HTMLElement>();

  connectedCallback(): void {
    super.connectedCallback();
    if (this.target) {
      this.#targetController = new TargetController(this);
    }
  }

  protected willUpdate(
    changedProperties: Map<string | number | symbol, unknown>,
  ) {
    if (changedProperties.has("target")) {
      if (this.target && !this.#targetController) {
        this.#targetController = new TargetController(this);
      }
    }

    const currentTargetTemporal = this.targetTemporal;
    if (this.#lastTargetTemporal !== currentTargetTemporal) {
      this.#lastTargetTemporal = currentTargetTemporal;
    }

    super.willUpdate(changedProperties);
  }

  render() {
    const targetId = this.targetTemporal
      ? ((this.targetTemporal as unknown as HTMLElement).id || this.target)
      : this.target;

    return html`
      <ef-timeline
        ${ref(this.timelineRef)}
        target=${targetId}
        control-target=${targetId}
        pixels-per-ms=${this.pixelsPerMs}
        ?show-playhead=${!this.hidePlayhead}
        ?show-controls=${false}
        ?show-ruler=${false}
        ?show-hierarchy=${true}
        ?show-playback-controls=${false}
        ?show-zoom-controls=${false}
        ?show-time-display=${false}
        hide=${this.hide}
        show=${this.show}
      ></ef-timeline>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-filmstrip": EFFilmstrip;
  }
}
