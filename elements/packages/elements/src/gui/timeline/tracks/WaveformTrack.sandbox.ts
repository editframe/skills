import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
import type { EFWaveformTrack } from "./WaveformTrack.js";
import "./ensureTrackItemInit.js";
import "../../../elements/EFWaveform.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFWaveformTrack",
  description: "Waveform track component for audio waveform visualization on timeline",
  category: "timeline",
  
  render: () => html`
    <timeline-state-provider
      pixels-per-ms="0.1"
      current-time-ms="0"
      duration-ms="5000"
      viewport-scroll-left="0"
      viewport-width="800"
    >
      <div style="width: 1000px; height: 48px; position: relative;">
        <ef-waveform id="test-waveform-track" duration="5s" style="display: none;"></ef-waveform>
        <ef-waveform-track
          .element=${document.getElementById("test-waveform-track") || (() => {
            const w = document.createElement("ef-waveform");
            w.id = "test-waveform-track";
            w.setAttribute("duration", "5s");
            return w;
          })()}
          pixels-per-ms="0.1"
        ></ef-waveform-track>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    async "renders waveform track"(ctx) {
      const track = ctx.querySelector<EFWaveformTrack>("ef-waveform-track")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(track).toBeDefined();
    },
    
    async "displays waveform icon"(ctx) {
      const track = ctx.querySelector<EFWaveformTrack>("ef-waveform-track")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const shadowRoot = track.shadowRoot;
      const icon = shadowRoot?.querySelector("svg");
      
      ctx.expect(icon).toBeDefined();
    },
    
    async "handles trim bounds"(ctx) {
      const track = ctx.querySelector<EFWaveformTrack>("ef-waveform-track")!;
      const waveform = track.element as any;
      
      await ctx.wait(100);
      await ctx.frame();
      
      waveform.trimStartMs = 1000;
      waveform.trimEndMs = 4000;
      await ctx.frame();
      
      ctx.expect(waveform.trimStartMs).toBe(1000);
      ctx.expect(waveform.trimEndMs).toBe(4000);
    },
  },
});
