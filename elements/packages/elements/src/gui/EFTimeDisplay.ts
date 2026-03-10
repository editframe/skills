import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { currentTimeContext } from "./currentTimeContext.js";
import { durationContext } from "./durationContext.js";
import { efContext } from "./efContext.js";
import { TargetOrContextMixin } from "./TargetOrContextMixin.js";

@customElement("ef-time-display")
export class EFTimeDisplay extends TargetOrContextMixin(LitElement, efContext) {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      font-family: var(--ef-font-family, system-ui);
      font-size: var(--ef-font-size-xs, 0.75rem);
      color: var(--ef-text-color, var(--ef-color-text));
      white-space: nowrap;
    }

    ::part(time) {}
  `;

  @property({ type: Number, attribute: "current-time-ms" })
  currentTimeMs = Number.NaN;

  @property({ type: Number, attribute: "duration-ms" })
  durationMs = 0;

  @consume({ context: currentTimeContext, subscribe: true })
  contextCurrentTimeMs = Number.NaN;

  @consume({ context: durationContext, subscribe: true })
  contextDurationMs = 0;

  get effectiveCurrentTimeMs(): number {
    if (!Number.isNaN(this.currentTimeMs)) return this.currentTimeMs;
    if (!Number.isNaN(this.contextCurrentTimeMs)) return this.contextCurrentTimeMs;
    return 0;
  }

  get effectiveDurationMs(): number {
    return this.durationMs || this.contextDurationMs || 0;
  }

  private formatTime(ms: number): string {
    // Handle NaN, undefined, null, or negative values
    if (!Number.isFinite(ms) || ms < 0) {
      return "0:00";
    }

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  render() {
    const currentTime = this.effectiveCurrentTimeMs;
    const totalTime = this.effectiveDurationMs;

    return html`
      <span part="time">
        ${this.formatTime(currentTime)} / ${this.formatTime(totalTime)}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-time-display": EFTimeDisplay;
  }
}
