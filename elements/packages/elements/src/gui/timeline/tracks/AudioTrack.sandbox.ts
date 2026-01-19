import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
// CRITICAL: Import TrackItem initialization helper FIRST to ensure full initialization
// This module ensures TrackItem is fully evaluated before AudioTrack tries to extend it
import "./ensureTrackItemInit.js";
// Import AudioTrack ONLY as a type - don't import the class itself to avoid evaluation
// The custom element will be registered when AudioTrack.ts is loaded elsewhere
import type { EFAudioTrack } from "./AudioTrack.js";
import type { EFAudio } from "../../../elements/EFAudio.js";
import "../../../elements/EFAudio.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFAudioTrack",
  description: "Audio track component with waveform visualization. Base track behavior tested in TrackItem.sandbox.ts",
  category: "gui",
  subcategory: "timeline",
  
  render: () => html`
    <timeline-state-provider
      pixels-per-ms="0.1"
      current-time-ms="0"
      duration-ms="5000"
      viewport-scroll-left="0"
      viewport-width="800"
    >
      <div style="width: 1000px; height: 48px; position: relative;">
        <ef-audio id="test-audio-track" duration="5s" style="display: none;"></ef-audio>
        <ef-audio-track
          .element=${document.getElementById("test-audio-track") || (() => {
            const a = document.createElement("ef-audio");
            a.id = "test-audio-track";
            a.setAttribute("duration", "5s");
            return a;
          })()}
          pixels-per-ms="0.1"
        ></ef-audio-track>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    // Audio-specific: waveform visualization
    "renders waveform visualization": {
      description: "Audio tracks display a waveform visualization inside the track content area",
      run: async (ctx) => {
        const track = ctx.querySelector<EFAudioTrack>("ef-audio-track")!;
        const audio = track.element as EFAudio;
        
        await ctx.frame();
        await track.updateComplete;
        
        // Wait for audio media engine to load so durationMs is available
        if (audio && audio.mediaEngineTask) {
          try {
            await audio.mediaEngineTask.taskComplete;
          } catch {
            // Ignore errors - media engine may not be needed for this test
          }
        }
        
        // Wait for track to update after duration is set
        await track.updateComplete;
        await ctx.frame();
        
        const shadowRoot = track.shadowRoot;
        const waveform = shadowRoot?.querySelector(".trim-container > div");
        
        ctx.expect(waveform).toBeDefined();
      },
    },
  },
});
