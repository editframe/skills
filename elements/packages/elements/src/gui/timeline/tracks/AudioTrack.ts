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
   * Generate a more realistic-looking waveform pattern
   * Uses sine waves with harmonics to create a natural audio-like pattern
   */
  #generateWaveformHeights(barCount: number, seed: number = 0): number[] {
    const heights: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const t = i / barCount;
      // Combine multiple frequencies for a more natural look
      const base = 0.3 + 
        0.25 * Math.sin(t * Math.PI * 4 + seed) +
        0.15 * Math.sin(t * Math.PI * 7 + seed * 1.3) +
        0.1 * Math.sin(t * Math.PI * 13 + seed * 0.7);
      // Add slight variation
      const variation = 0.1 * Math.sin(t * Math.PI * 23 + seed * 2);
      heights.push(Math.max(0.15, Math.min(0.85, base + variation)));
    }
    return heights;
  }

  /**
   * Render a waveform visualization for audio tracks
   * This is a placeholder pattern - real waveform data would come from audio analysis
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

    // Calculate bar count based on track width
    const trackWidth = durationMs * this.pixelsPerMs;
    const barCount = Math.max(10, Math.min(100, Math.floor(trackWidth / 4)));
    const barWidth = Math.max(2, (trackWidth - 24) / barCount - 1);
    
    // Use element's source start time as seed for consistent pattern per clip
    const seed = (audio.sourceStartMs ?? 0) / 1000;
    const heights = this.#generateWaveformHeights(barCount, seed);

    return html`
      <div style=${styleMap({
        position: "absolute",
        left: "4px",
        right: "4px",
        top: "2px",
        bottom: "2px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "1px",
        overflow: "hidden",
      })}>
        ${heights.map((height) => html`
          <div style=${styleMap({
            width: `${barWidth}px`,
            minWidth: "2px",
            height: `${height * 100}%`,
            backgroundColor: this.getElementTypeColor(),
            borderRadius: "1px",
            opacity: "0.7",
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

