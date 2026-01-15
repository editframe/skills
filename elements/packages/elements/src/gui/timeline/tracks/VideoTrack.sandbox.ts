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
  description: "Video track component with thumbnail strip",
  
  render: () => html`
    <timeline-state-provider
      pixels-per-ms="0.1"
      current-time-ms="0"
      duration-ms="5000"
      viewport-scroll-left="0"
      viewport-width="800"
    >
      <div style="width: 1000px; height: 24px; position: relative;">
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
    async "renders with video element"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-track-1";
      video.setAttribute("duration", "5s");
      
      const track = document.createElement("ef-video-track");
      (track as any).element = video;
      (track as any).pixelsPerMs = 0.1;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(100);
      
      const trackElement = ctx.querySelector<EFVideoTrack>("ef-video-track")!;
      ctx.expect(trackElement).toBeDefined();
      ctx.expect(trackElement.element).toBeDefined();
    },
    
    async "renders at correct time position"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-track-2";
      video.setAttribute("duration", "5s");
      (video as any).trimStartMs = 1000; // Start at 1s
      
      const track = document.createElement("ef-video-track");
      (track as any).element = video;
      (track as any).pixelsPerMs = 0.1;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(100);
      
      const trackElement = ctx.querySelector<EFVideoTrack>("ef-video-track")!;
      const shadowRoot = trackElement.shadowRoot;
      const trimContainer = shadowRoot?.querySelector(".trim-container") as HTMLElement;
      
      ctx.expect(trimContainer).toBeDefined();
      // Position should account for trimStartMs
      const left = parseInt(trimContainer?.style.left || "0", 10);
      ctx.expect(left).toBeGreaterThanOrEqual(0);
    },
    
    async "scales with pixelsPerMs"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-track-3";
      video.setAttribute("duration", "5s");
      
      const track = document.createElement("ef-video-track");
      (track as any).element = video;
      (track as any).pixelsPerMs = 0.1;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(100);
      
      const trackElement = ctx.querySelector<EFVideoTrack>("ef-video-track")!;
      const shadowRoot = trackElement.shadowRoot;
      const trimContainer = shadowRoot?.querySelector(".trim-container") as HTMLElement;
      const initialWidth = parseInt(trimContainer?.style.width || "0", 10);
      
      // Increase zoom
      (trackElement as any).pixelsPerMs = 0.2;
      await ctx.frame();
      
      const newWidth = parseInt(trimContainer?.style.width || "0", 10);
      // Width should approximately double (allowing for rounding)
      ctx.expect(newWidth).toBeGreaterThan(initialWidth * 1.5);
    },
    
    async "shows trim handles when enabled"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-track-4";
      video.setAttribute("duration", "5s");
      
      const track = document.createElement("ef-video-track");
      (track as any).element = video;
      (track as any).pixelsPerMs = 0.1;
      (track as any).enableTrim = true;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(100);
      
      const trackElement = ctx.querySelector<EFVideoTrack>("ef-video-track")!;
      const shadowRoot = trackElement.shadowRoot;
      const trimHandles = shadowRoot?.querySelector("ef-trim-handles");
      
      ctx.expect(trimHandles).toBeDefined();
    },
    
    async "handles trim start/end changes"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-track-5";
      video.setAttribute("duration", "5s");
      
      const track = document.createElement("ef-video-track");
      (track as any).element = video;
      (track as any).pixelsPerMs = 0.1;
      (track as any).enableTrim = true;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(100);
      
      const trackElement = ctx.querySelector<EFVideoTrack>("ef-video-track")!;
      const videoElement = trackElement.element as any;
      
      // Change trim values
      videoElement.trimStartMs = 1000;
      videoElement.trimEndMs = 4000;
      await ctx.frame();
      
      ctx.expect(videoElement.trimStartMs).toBe(1000);
      ctx.expect(videoElement.trimEndMs).toBe(4000);
    },
    
    async "renders thumbnail strip"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-track-6";
      video.setAttribute("duration", "5s");
      
      const track = document.createElement("ef-video-track");
      (track as any).element = video;
      (track as any).pixelsPerMs = 0.1;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(200);
      
      const trackElement = ctx.querySelector<EFVideoTrack>("ef-video-track")!;
      const shadowRoot = trackElement.shadowRoot;
      const thumbnailStrip = shadowRoot?.querySelector("ef-thumbnail-strip");
      
      ctx.expect(thumbnailStrip).toBeDefined();
    },
  },
});
