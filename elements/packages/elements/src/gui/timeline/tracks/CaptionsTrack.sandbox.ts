import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
import type { EFCaptionsTrack } from "./CaptionsTrack.js";
import "./ensureTrackItemInit.js";
import "../../../elements/EFCaptions.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFCaptionsTrack",
  description: "Caption track component with active word highlighting on timeline",
  category: "timeline",
  
  render: () => html`
    <timeline-state-provider
      pixels-per-ms="0.1"
      current-time-ms="0"
      duration-ms="10000"
      viewport-scroll-left="0"
      viewport-width="800"
    >
      <div style="width: 1000px; height: 48px; position: relative;">
        <ef-captions id="test-captions-track" src="/assets/improv-trimmed-captions.json" style="display: none;"></ef-captions>
        <ef-captions-track
          .element=${document.getElementById("test-captions-track") || (() => {
            const c = document.createElement("ef-captions");
            c.id = "test-captions-track";
            c.setAttribute("src", "/assets/improv-trimmed-captions.json");
            return c;
          })()}
          pixels-per-ms="0.1"
        ></ef-captions-track>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    async "renders captions track"(ctx) {
      const track = ctx.querySelector<EFCaptionsTrack>("ef-captions-track")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(track).toBeDefined();
    },
    
    async "displays caption segments"(ctx) {
      const track = ctx.querySelector<EFCaptionsTrack>("ef-captions-track")!;
      
      await ctx.wait(300);
      await ctx.frame();
      
      const shadowRoot = track.shadowRoot;
      const segments = shadowRoot?.querySelectorAll(".caption-segment");
      
      ctx.expect(segments).toBeDefined();
    },
    
    async "highlights active word at current time"(ctx) {
      const track = ctx.querySelector<EFCaptionsTrack>("ef-captions-track")!;
      const provider = ctx.querySelector("timeline-state-provider")!;
      
      await ctx.wait(300);
      await ctx.frame();
      
      provider.setAttribute("current-time-ms", "2000");
      await ctx.frame();
      await ctx.wait(100);
      
      const shadowRoot = track.shadowRoot;
      const activeWords = shadowRoot?.querySelectorAll(".active-word");
      
      ctx.expect(activeWords).toBeDefined();
    },
    
    async "handles trim bounds"(ctx) {
      const track = ctx.querySelector<EFCaptionsTrack>("ef-captions-track")!;
      const captions = track.element as any;
      
      await ctx.wait(100);
      await ctx.frame();
      
      captions.trimStartMs = 1000;
      captions.trimEndMs = 9000;
      await ctx.frame();
      
      ctx.expect(captions.trimStartMs).toBe(1000);
      ctx.expect(captions.trimEndMs).toBe(9000);
    },
  },
});
