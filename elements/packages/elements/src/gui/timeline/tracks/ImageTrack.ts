import { html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { EFImage } from "../../../elements/EFImage.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
import { TrackItem } from "./TrackItem.js";

@customElement("ef-image-track")
export class EFImageTrack extends TrackItem {
  contents() {
    const image = this.element as EFImage;
    if (!(image instanceof EFImage)) {
      return nothing;
    }

    // Try to get image src for thumbnail preview
    const src = image.getAttribute("src") || (image as any).src;
    
    // Calculate track dimensions - show repeating thumbnails to fill the track
    const durationMs = image.durationMs ?? 0;
    const trackWidth = durationMs * this.pixelsPerMs;
    const thumbnailHeight = 18;
    const thumbnailWidth = Math.min(32, trackWidth);

    if (!src || thumbnailWidth < 8) {
      return nothing;
    }

    // Calculate how many thumbnails can fit
    const thumbnailCount = Math.max(1, Math.floor((trackWidth - 8) / (thumbnailWidth + 2)));

    return html`
      <div style=${styleMap({
        position: "absolute",
        left: "4px",
        right: "4px",
        top: "2px",
        bottom: "2px",
        display: "flex",
        alignItems: "center",
        gap: "2px",
        overflow: "hidden",
      })}>
        ${Array.from({ length: thumbnailCount }, () => html`
          <img
            src="${src}"
            alt=""
            style=${styleMap({
              height: `${thumbnailHeight}px`,
              width: `${thumbnailWidth}px`,
              objectFit: "cover",
              borderRadius: "2px",
              opacity: "0.75",
              pointerEvents: "none",
              flexShrink: "0",
            })}
          />
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-image-track": EFImageTrack;
  }
}

