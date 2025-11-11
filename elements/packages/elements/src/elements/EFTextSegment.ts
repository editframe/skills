import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { EFTemporal } from "./EFTemporal.js";
import type { EFText } from "./EFText.js";

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

  private _animationsPaused = false;

  connectedCallback() {
    super.connectedCallback();
    // CRITICAL: Pause all animations once when segment is first connected
    // CSS animations start automatically and must be paused so updateAnimations can control them
    // Only do this once on initial load
    if (!this._animationsPaused) {
      // Wait for segment to be fully updated before pausing animations
      this.updateComplete.then(() => {
        requestAnimationFrame(() => {
          const animations = this.getAnimations();
          for (const animation of animations) {
            // Ensure animation is in a playable state
            // If it's finished, reset it
            if (animation.playState === "finished") {
              animation.cancel();
              animation.play();
              animation.pause();
            } else if (animation.playState === "running") {
              // Pause if running, preserving current visual state
              animation.pause();
            }
            // Don't reset currentTime here - let updateAnimations set it based on timeline
            // This preserves any visual state that was already applied
          }
          this._animationsPaused = true;
          // Note: updateAnimations is called from parent EFText after all segments are created
          // This avoids calling it multiple times (once per segment)
        });
      });
    }
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
