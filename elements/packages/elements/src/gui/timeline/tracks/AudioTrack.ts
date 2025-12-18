import { html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { TrackItem } from "./TrackItem.js";

@customElement("ef-audio-track")
export class EFAudioTrack extends TrackItem {
  contents() {
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-audio-track": EFAudioTrack;
  }
}

