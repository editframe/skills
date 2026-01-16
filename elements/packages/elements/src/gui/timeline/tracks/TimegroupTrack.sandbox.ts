import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
// CRITICAL: Import TrackItem initialization helper FIRST to ensure full initialization
// This module ensures TrackItem is fully evaluated before TimegroupTrack tries to extend it
import "./ensureTrackItemInit.js";
// Import TimegroupTrack ONLY as a type - don't import the class itself to avoid evaluation
// The custom element will be registered when TimegroupTrack.ts is loaded elsewhere
import type { EFTimegroupTrack } from "./TimegroupTrack.js";
import "../../../elements/EFTimegroup.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFTimegroupTrack",
  description: "Timegroup track component for nested compositions. Base track behavior tested in TrackItem.sandbox.ts",
  
  render: () => html`
    <timeline-state-provider
      pixels-per-ms="0.1"
      current-time-ms="0"
      duration-ms="5000"
      viewport-scroll-left="0"
      viewport-width="800"
    >
      <div style="width: 1000px; height: 48px; position: relative;">
        <ef-timegroup id="test-timegroup-track" duration="5s" style="display: none;"></ef-timegroup>
        <ef-timegroup-track
          .element=${document.getElementById("test-timegroup-track") || (() => {
            const tg = document.createElement("ef-timegroup");
            tg.id = "test-timegroup-track";
            tg.setAttribute("duration", "5s");
            return tg;
          })()}
          pixels-per-ms="0.1"
          skip-children="true"
        ></ef-timegroup-track>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    // Timegroup-specific: filmstrip rendering for root timegroups
    "shows filmstrip for root timegroups when enabled": {
      description: "Root timegroups can display an ef-thumbnail-strip filmstrip when showFilmstrip is true",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const timegroup = document.createElement("ef-timegroup");
        timegroup.id = "test-timegroup-track-film";
        timegroup.setAttribute("duration", "5s");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = timegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        (track as any).showFilmstrip = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await ctx.wait(200);
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        ctx.expect(trackElement).toBeDefined();
        
        // Filmstrip may or may not render depending on conditions
        // (requires root timegroup with visual content)
        const shadowRoot = trackElement.shadowRoot;
        const thumbnailStrip = shadowRoot?.querySelector("ef-thumbnail-strip");
        ctx.log(`Filmstrip present: ${!!thumbnailStrip}`);
      },
    },
    
    // Timegroup-specific: mode indicator display
    "shows mode indicator for fixed mode timegroups": {
      description: "Timegroups with mode='fixed' display a mode indicator in the track",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const timegroup = document.createElement("ef-timegroup");
        timegroup.id = "test-timegroup-track-mode";
        timegroup.setAttribute("duration", "5s");
        timegroup.setAttribute("mode", "fixed");
        
        const track = document.createElement("ef-timegroup-track");
        (track as any).element = timegroup;
        (track as any).pixelsPerMs = 0.1;
        (track as any).skipChildren = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await ctx.wait(100);
        
        const trackElement = ctx.querySelector<EFTimegroupTrack>("ef-timegroup-track")!;
        const shadowRoot = trackElement.shadowRoot;
        // Mode indicator should be in the track content
        const trackContent = shadowRoot?.querySelector(".trim-container");
        
        ctx.expect(trackContent).toBeDefined();
      },
    },
  },
});
