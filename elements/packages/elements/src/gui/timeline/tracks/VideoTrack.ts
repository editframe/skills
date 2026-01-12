import { css, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { EFVideo } from "../../../elements/EFVideo.js";
import "../../../elements/EFThumbnailStrip.js";
import { TrackItem } from "./TrackItem.js";

@customElement("ef-video-track")
export class EFVideoTrack extends TrackItem {
  static styles = [
    TrackItem.styles,
    css`
      ef-thumbnail-strip {
        height: 100%;
        border: none;
        border-radius: 0;
        background: transparent;
      }
    `,
  ];

  render() {
    const video = this.element as EFVideo;
    const elementId = (this.element as HTMLElement).id || "";

    // Don't render thumbnail strip until we have a valid EFVideo element
    if (!(video instanceof EFVideo)) {
      return nothing;
    }
    const trimStartMs = this.element.trimStartMs ?? 0;
    const trimEndMs = this.element.trimEndMs ?? 0;
    const intrinsicDurationMs =
      this.element.intrinsicDurationMs ?? this.element.durationMs;

    return html`<div style=${styleMap(this.gutterStyles)}>
      <div
        style="background-color: var(--filmstrip-bg);"
        ?data-focused=${this.isFocused}
        @mouseenter=${() => {
          if (this.focusContext) {
            this.focusContext.focusedElement = this.element;
          }
        }}
        @mouseleave=${() => {
          if (this.focusContext) {
            this.focusContext.focusedElement = null;
          }
        }}
      >
        <div
          ?data-focused=${this.isFocused}
          class="trim-container relative mb-0 block text-nowrap border text-sm"
          style=${styleMap({
            ...this.trimPortionStyles,
            height: "24px",
            backgroundColor: this.isFocused
              ? "var(--filmstrip-item-focused)"
              : "var(--filmstrip-item-bg)",
            borderColor: "var(--filmstrip-border)",
          })}
        >
          <!-- TODO: Re-enable when thumbnail strip performance is improved
          <ef-thumbnail-strip
            .targetElement=${video}
            .useIntrinsicDuration=${true}
          ></ef-thumbnail-strip>
          -->
          ${
            this.enableTrim
              ? html`<ef-trim-handles
                element-id=${elementId}
                pixels-per-ms=${this.pixelsPerMs}
                trim-start-ms=${trimStartMs}
                trim-end-ms=${trimEndMs}
                intrinsic-duration-ms=${intrinsicDurationMs}
                @trim-change=${this.handleTrimChange}
              ></ef-trim-handles>`
              : nothing
          }
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-video-track": EFVideoTrack;
  }
}
