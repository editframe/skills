import { html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { EFAudio } from "../../../elements/EFAudio.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
import { TrackItem } from "./TrackItem.js";

@customElement("ef-audio-track")
export class EFAudioTrack extends TrackItem {
  /**
   * Render a simple waveform visualization for audio tracks
   * This is a placeholder - in production this would use actual audio analysis
   */
  contents() {
    const audio = this.element as EFAudio;
    if (!(audio instanceof EFAudio)) {
      return nothing;
    }

    const durationMs = audio.durationMs ?? 0;
    if (durationMs === 0) {
      return nothing;
    }

    // Generate a simple waveform pattern
    // In production, this would use actual audio waveform data
    const bars = 20; // Number of waveform bars
    const barWidth = Math.max(2, (durationMs * this.pixelsPerMs) / bars - 1);
    const heights = Array.from({ length: bars }, () => Math.random() * 0.6 + 0.2);

    return html`
      <div style=${styleMap({
        position: "absolute",
        left: "20px",
        right: "4px",
        top: "0",
        bottom: "0",
        display: "flex",
        alignItems: "center",
        gap: "1px",
        opacity: "0.6",
      })}>
        ${heights.map((height) => html`
          <div style=${styleMap({
            width: `${barWidth}px`,
            height: `${height * 100}%`,
            backgroundColor: this.getElementTypeColor(),
            borderRadius: "1px",
          })}></div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-audio-track": EFAudioTrack;
  }
}

