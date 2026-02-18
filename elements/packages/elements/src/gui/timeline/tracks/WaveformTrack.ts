import { nothing, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { phosphorIcon, ICONS } from "../../icons.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
import { TrackItem } from "./TrackItem.js";

@customElement("ef-waveform-track")
export class EFWaveformTrack extends TrackItem {
  contents() {
    return phosphorIcon(ICONS.waveform);
  }

  renderChildren(): Array<TemplateResult<1> | typeof nothing> | typeof nothing {
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-waveform-track": EFWaveformTrack;
  }
}
