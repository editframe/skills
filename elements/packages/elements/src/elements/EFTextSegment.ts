import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { EFTemporal } from "./EFTemporal.ts";
import { EFText } from "./EFText.js";

@customElement("ef-text-segment")
export class EFTextSegment extends EFTemporal(LitElement) {
  static styles = [
    css`
      :host {
        display: inline-block;
      }
      :host([data-whitespace]) {
        display: inline;
      }
      :host([data-line-segment]) {
        display: block;
      }
      :host([hidden]) {
        opacity: 0;
        pointer-events: none;
      }
    `,
  ];

  render() {
    // Set CSS variables in render() to ensure they're always set
    // This is necessary because Lit may clear inline styles during updates
    this.setCSSVariables();
    return html`${this.segmentText}`;
  }

  private setCSSVariables(): void {
    // Set deterministic --ef-seed value based on segment index
    const seed = (this.segmentIndex * 9007) % 233; // Prime numbers for better distribution
    const seedValue = seed / 233; // Normalize to 0-1 range
    this.style.setProperty("--ef-seed", seedValue.toString());

    // Set stagger offset CSS variable
    // staggerOffsetMs is always set (defaults to 0), so we can always set the CSS variable
    const offsetMs = this.staggerOffsetMs ?? 0;
    this.style.setProperty("--ef-stagger-offset", `${offsetMs}ms`);

    // Set index CSS variable
    this.style.setProperty("--ef-index", this.segmentIndex.toString());
  }

  protected firstUpdated(): void {
    this.setCSSVariables();
  }

  protected updated(): void {
    this.setCSSVariables();
  }

  @property({ type: String, attribute: false })
  segmentText = "";

  @property({ type: Number, attribute: false })
  segmentIndex = 0;

  @property({ type: Number, attribute: false })
  staggerOffsetMs?: number;

  @property({ type: Number, attribute: false })
  segmentStartMs = 0;

  @property({ type: Number, attribute: false })
  segmentEndMs = 0;

  @property({ type: Boolean, reflect: true })
  hidden = false;

  get startTimeMs() {
    const parentText = this.closest("ef-text") as EFText;
    const parentStartTime = parentText?.startTimeMs || 0;
    return parentStartTime + (this.segmentStartMs || 0);
  }

  get endTimeMs() {
    // Derive from parent's live durationMs rather than the snapshot stored in segmentEndMs.
    // This ensures segments track changes when the parent's duration updates
    // (e.g., a contain-mode timegroup whose duration changes after a video loads).
    const parentText = this.closest("ef-text") as EFText;
    if (parentText) {
      return parentText.startTimeMs + parentText.durationMs;
    }
    return this.segmentEndMs || 0;
  }

  get durationMs(): number {
    const parentText = this.closest("ef-text") as EFText;
    if (parentText) {
      return parentText.durationMs;
    }
    return this.segmentEndMs - this.segmentStartMs;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-text-segment": EFTextSegment;
  }
}
