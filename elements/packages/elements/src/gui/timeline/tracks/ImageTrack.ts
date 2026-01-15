import { html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { EFImage } from "../../../elements/EFImage.js";
import { phosphorIcon, ICONS } from "../../icons.js";
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
    if (!src) {
      return phosphorIcon(ICONS.image);
    }

    // Show small thumbnail preview if we have a src
    const durationMs = image.durationMs ?? 0;
    const trackWidth = durationMs * this.pixelsPerMs;
    const thumbnailSize = Math.min(trackWidth - 8, 20); // Max 20px, leave 4px padding each side

    if (thumbnailSize < 12) {
      // Too small for thumbnail, just show icon
      return phosphorIcon(ICONS.image);
    }

    return html`
      <img
        src="${src}"
        alt="Image preview"
        style=${styleMap({
          position: "absolute",
          left: "20px",
          top: "50%",
          transform: "translateY(-50%)",
          width: `${thumbnailSize}px`,
          height: `${thumbnailSize}px`,
          objectFit: "cover",
          borderRadius: "2px",
          opacity: "0.8",
          pointerEvents: "none",
        })}
        @error=${() => {
          // Fallback to icon if image fails to load
          this.requestUpdate();
        }}
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-image-track": EFImageTrack;
  }
}

