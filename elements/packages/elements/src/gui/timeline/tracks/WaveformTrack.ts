import { html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { TrackItem } from "./TrackItem.js";

@customElement("ef-waveform-track")
export class EFWaveformTrack extends TrackItem {
  contents() {
    return html` 🌊 `;
  }

  renderChildren() {
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-waveform-track": EFWaveformTrack;
  }
}

