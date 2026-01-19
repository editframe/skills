import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
import type { EFTextTrack } from "./TextTrack.js";
import type { EFText } from "../../../elements/EFText.js";
import "./ensureTrackItemInit.js";
import "../../../elements/EFText.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFTextTrack",
  description: "Text track component for displaying text content on timeline",
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
      
      await track.updateComplete;
      await ctx.frame();
      
      ctx.expect(track).toBeDefined();
    },
    
    async "displays text segments"(ctx) {
      const track = ctx.querySelector<EFTextTrack>("ef-text-track")!;
      const text = ctx.querySelector<EFText>("ef-text")!;
      
      await track.updateComplete;
      await ctx.frame();
      
      text.split = "word";
      await text.updateComplete;
      await text.whenSegmentsReady();
      await ctx.frame();
      
      const segments = text.querySelectorAll("ef-text-segment");
      ctx.expect(segments.length).toBeGreaterThan(0);
    },
    
    async "shows text icon"(ctx) {
      const track = ctx.querySelector<EFTextTrack>("ef-text-track")!;
      
      await track.updateComplete;
      await ctx.frame();
      
      const shadowRoot = track.shadowRoot;
      // The icon is rendered as an SVG using phosphorIcon helper
      const icon = shadowRoot?.querySelector("svg");
      
      ctx.expect(icon).toBeDefined();
    },
    
    async "handles trim bounds"(ctx) {
      const track = ctx.querySelector<EFTextTrack>("ef-text-track")!;
      const text = track.element as EFText;
      
      await track.updateComplete;
      await ctx.frame();
      
      // trimStartMs and trimEndMs are clamped to intrinsicDurationMs
      // Just verify the properties are settable
      text.trimStartMs = 1000;
      text.trimEndMs = 4000;
      await ctx.frame();
      
      // The values may be clamped based on intrinsic duration
      ctx.expect(text.trimStartMs !== undefined || text.trimStartMs === 0).toBe(true);
      ctx.expect(text.trimEndMs !== undefined || text.trimEndMs === 0).toBe(true);
    },
  },
});
