import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { phosphorIcon, ICONS } from "../../icons.js";
import { TrackItem } from "./TrackItem.js";

@customElement("ef-image-track")
export class EFImageTrack extends TrackItem {
  contents() {
    return phosphorIcon(ICONS.image);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-image-track": EFImageTrack;
  }
}

