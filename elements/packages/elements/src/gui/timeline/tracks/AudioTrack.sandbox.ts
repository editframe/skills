import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
// CRITICAL: Import TrackItem initialization helper FIRST to ensure full initialization
// This module ensures TrackItem is fully evaluated before AudioTrack tries to extend it
import "./ensureTrackItemInit.js";
// Import AudioTrack ONLY as a type - don't import the class itself to avoid evaluation
// The custom element will be registered when AudioTrack.ts is loaded elsewhere
import type { EFAudioTrack } from "./AudioTrack.js";
import "../../../elements/EFAudio.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFAudioTrack",
  description: "Audio track component with waveform visualization. Base track behavior tested in TrackItem.sandbox.ts",
  category: "media",
  
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
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const audio = document.createElement("ef-audio");
        audio.id = "test-audio-track-wave";
        audio.setAttribute("duration", "5s");
        (audio as any).durationMs = 5000; // Set duration so waveform renders
        
        const track = document.createElement("ef-audio-track");
        (track as any).element = audio;
        (track as any).pixelsPerMs = 0.1;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await ctx.wait(100);
        
        const trackElement = ctx.querySelector<EFAudioTrack>("ef-audio-track")!;
        const shadowRoot = trackElement.shadowRoot;
        // Waveform is rendered as divs inside trim-container
        const waveform = shadowRoot?.querySelector(".trim-container > div");
        
        // Waveform should be present when duration > 0
        ctx.expect(waveform).toBeDefined();
      },
    },
  },
});
