import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { EFTemporal, type TemporalMixinInterface } from "./EFTemporal.ts";

@customElement("ef-text-segment")
export class EFTextSegment extends EFTemporal(LitElement) {
  static styles = [
    css`
      :host {
        display: inline-block;
        white-space: pre;
        line-height: 1;
      }
      :host([data-line-segment]) {
        display: block;
        white-space: normal;
      }
      :host([hidden]) {
        opacity: 0;
        pointer-events: none;
      }
    `,
  ];

  /**
   * Registers animation styles that should be shared across all text segments.
   * This is the correct way to inject animation styles for segments - not via innerHTML.
   * 
   * @param id Unique identifier for this stylesheet (e.g., "my-animations")
   * @param cssText The CSS rules to inject
   * 
   * @example
   * EFTextSegment.registerAnimations("bounceIn", `
   *   @keyframes bounceIn {
   *     from { transform: scale(0); }
   *     to { transform: scale(1); }
   *   }
   *   .bounce-in {
   *     animation: bounceIn 0.5s ease-out;
   *   }
   * `);
   */
  static registerAnimations(id: string, cssText: string): void {
    if (globalAnimationSheets.has(id)) {
      // Already registered
      return;
    }

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    globalAnimationSheets.set(id, sheet);

    // Apply to all existing instances
    document.querySelectorAll("ef-text-segment").forEach((segment) => {
      if (segment.shadowRoot) {
        const adoptedSheets = segment.shadowRoot.adoptedStyleSheets;
        if (!adoptedSheets.includes(sheet)) {
          segment.shadowRoot.adoptedStyleSheets = [...adoptedSheets, sheet];
        }
      }
    });
  }

  /**
   * Unregisters previously registered animation styles.
   * 
   * @param id The identifier of the stylesheet to remove
   */
  static unregisterAnimations(id: string): void {
    const sheet = globalAnimationSheets.get(id);
    if (!sheet) {
      return;
    }

    globalAnimationSheets.delete(id);

    // Remove from all existing instances
    document.querySelectorAll("ef-text-segment").forEach((segment) => {
      if (segment.shadowRoot) {
        segment.shadowRoot.adoptedStyleSheets =
          segment.shadowRoot.adoptedStyleSheets.filter((s) => s !== sheet);
      }
    });
  }

  render() {
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

    return html`${this.segmentText}`;
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
    // Get parent text element's absolute start time, then add our local offset
    const parentText = this.closest("ef-text") as EFText;
    const parentStartTime = parentText?.startTimeMs || 0;
    return parentStartTime + (this.segmentStartMs || 0);
  }

  get endTimeMs() {
    const parentText = this.closest("ef-text") as EFText;
    const parentStartTime = parentText?.startTimeMs || 0;
    return parentStartTime + (this.segmentEndMs || 0);
  }

  get durationMs(): number {
    return this.segmentEndMs - this.segmentStartMs;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-text-segment": EFTextSegment;
  }
}
