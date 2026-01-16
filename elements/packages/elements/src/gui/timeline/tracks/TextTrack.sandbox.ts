import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
import type { EFTextTrack } from "./TextTrack.js";
import "./ensureTrackItemInit.js";
import "../../../elements/EFText.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFTextTrack",
  description: "Text track component for displaying text content on timeline",
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
        <ef-text id="test-text-track" duration="5s" style="display: none;">
          Hello World
        </ef-text>
        <ef-text-track
          .element=${document.getElementById("test-text-track") || (() => {
            const t = document.createElement("ef-text");
            t.id = "test-text-track";
            t.setAttribute("duration", "5s");
            t.textContent = "Hello World";
            return t;
          })()}
          pixels-per-ms="0.1"
        ></ef-text-track>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    async "renders text track"(ctx) {
      const track = ctx.querySelector<EFTextTrack>("ef-text-track")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(track).toBeDefined();
    },
    
    async "displays text segments"(ctx) {
      const track = ctx.querySelector<EFTextTrack>("ef-text-track")!;
      const text = ctx.querySelector("ef-text")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      text.split = "word";
      await ctx.frame();
      await ctx.wait(100);
      
      const segments = text.querySelectorAll("ef-text-segment");
      ctx.expect(segments.length).toBeGreaterThan(0);
    },
    
    async "shows text icon"(ctx) {
      const track = ctx.querySelector<EFTextTrack>("ef-text-track")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const shadowRoot = track.shadowRoot;
      const icon = shadowRoot?.querySelector(".icon");
      
      ctx.expect(icon).toBeDefined();
    },
    
    async "handles trim bounds"(ctx) {
      const track = ctx.querySelector<EFTextTrack>("ef-text-track")!;
      const text = track.element as any;
      
      await ctx.wait(100);
      await ctx.frame();
      
      text.trimStartMs = 1000;
      text.trimEndMs = 4000;
      await ctx.frame();
      
      ctx.expect(text.trimStartMs).toBe(1000);
      ctx.expect(text.trimEndMs).toBe(4000);
    },
  },
});
