import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { TrackItem } from "./TrackItem.js";
import { renderTrackChildren } from "./renderTrackChildren.js";

@customElement("ef-html-track")
export class EFHTMLTrack extends TrackItem {
  contents() {
    return html`
      <span>${this.element.tagName}</span>
      ${renderTrackChildren(
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
    "ef-html-track": EFHTMLTrack;
  }
}

