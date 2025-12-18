import { html, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { TrackItem } from "./TrackItem.js";
import { renderTrackChildren } from "./renderTrackChildren.js";

@customElement("ef-timegroup-track")
export class EFTimegroupTrack extends TrackItem {
  /**
   * When true, children are not rendered (used in unified row architecture
   * where children get their own rows).
   */
  @property({ type: Boolean, attribute: "skip-children" })
  skipChildren = false;

  contents() {
    return html`
      <span>TIME GROUP</span>
      ${this.skipChildren
        ? nothing
        : renderTrackChildren(
            Array.from(this.element.children || []),
            this.pixelsPerMs,
            this.hideSelectors,
            this.showSelectors,
            false,
            this.enableTrim,
          )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-timegroup-track": EFTimegroupTrack;
  }
}

