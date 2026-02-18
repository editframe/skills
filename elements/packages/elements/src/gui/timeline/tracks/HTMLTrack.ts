import { html } from "lit";
import { customElement } from "lit/decorators.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
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
