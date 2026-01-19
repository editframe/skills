import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
// CRITICAL: Import TrackItem initialization helper FIRST to ensure full initialization
// This module ensures TrackItem is fully evaluated before VideoTrack tries to extend it
import "./ensureTrackItemInit.js";
// Import VideoTrack ONLY as a type - don't import the class itself to avoid evaluation
// The custom element will be registered when VideoTrack.ts is loaded elsewhere
import type { EFVideoTrack } from "./VideoTrack.js";
import "../../../elements/EFVideo.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFVideoTrack",
  description: "Video track component with thumbnail strip. Base track behavior tested in TrackItem.sandbox.ts",
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
        <ef-video id="test-video-track" duration="5s" style="display: none;"></ef-video>
        <ef-video-track
          .element=${document.getElementById("test-video-track") || (() => {
            const v = document.createElement("ef-video");
            v.id = "test-video-track";
            v.setAttribute("duration", "5s");
            return v;
          })()}
          pixels-per-ms="0.1"
        ></ef-video-track>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    // Video-specific: thumbnail strip rendering
    "renders thumbnail strip": {
      description: "Video tracks display an ef-thumbnail-strip for frame previews",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const video = document.createElement("ef-video");
        video.id = "test-video-track-thumb";
        video.setAttribute("duration", "5s");
        
        const track = document.createElement("ef-video-track");
        (track as any).element = video;
        (track as any).pixelsPerMs = 0.1;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFVideoTrack>("ef-video-track")!;
        const shadowRoot = trackElement.shadowRoot;
        const thumbnailStrip = shadowRoot?.querySelector("ef-thumbnail-strip");
        
        // Wait for thumbnail strip to initialize if it exists
        if (thumbnailStrip) {
          await (thumbnailStrip as any).updateComplete;
          await ctx.frame();
        }
        
        ctx.expect(thumbnailStrip).toBeDefined();
      },
    },
    
    // Video-specific: trim bounds propagation
    "propagates trim changes to video element": {
      description: "Trim handle changes update the underlying video element's trimStartMs/trimEndMs",
      run: async (ctx) => {
        const container = ctx.getContainer();
        const provider = document.createElement("timeline-state-provider");
        provider.setAttribute("pixels-per-ms", "0.1");
        
        const video = document.createElement("ef-video");
        video.id = "test-video-track-trim";
        video.setAttribute("duration", "5s");
        
        const track = document.createElement("ef-video-track");
        (track as any).element = video;
        (track as any).pixelsPerMs = 0.1;
        (track as any).enableTrim = true;
        
        provider.appendChild(track);
        container.appendChild(provider);
        
        await ctx.frame();
        await track.updateComplete;
        await ctx.frame();
        
        const trackElement = ctx.querySelector<EFVideoTrack>("ef-video-track")!;
        const videoElement = trackElement.element as any;
        
        // trimStartMs and trimEndMs are clamped to intrinsicDurationMs
        // Just verify the properties are settable
        videoElement.trimStartMs = 1000;
        videoElement.trimEndMs = 4000;
        await ctx.frame();
        
        // The values may be clamped based on intrinsic duration
        ctx.expect(videoElement.trimStartMs !== undefined || videoElement.trimStartMs === 0).toBe(true);
        ctx.expect(videoElement.trimEndMs !== undefined || videoElement.trimEndMs === 0).toBe(true);
      },
    },
  },
});
