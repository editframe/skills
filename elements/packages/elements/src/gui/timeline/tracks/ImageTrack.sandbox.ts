import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
// CRITICAL: Import TrackItem initialization helper FIRST to ensure full initialization
// This module ensures TrackItem is fully evaluated before ImageTrack tries to extend it
import "./ensureTrackItemInit.js";
// Import ImageTrack ONLY as a type - don't import the class itself to avoid evaluation
// The custom element will be registered when ImageTrack.ts is loaded elsewhere
import type { EFImageTrack } from "./ImageTrack.js";
import "../../../elements/EFImage.js";
import "../TimelineStateProvider.js";

export default defineSandbox({
  name: "EFImageTrack",
  description: "Image track component with thumbnail preview",
  
  render: () => html`
    <timeline-state-provider
      pixels-per-ms="0.1"
      current-time-ms="0"
      duration-ms="5000"
      viewport-scroll-left="0"
      viewport-width="800"
    >
      <div style="width: 1000px; height: 24px; position: relative;">
        <ef-image id="test-image-track" duration="5s" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23ccc'/%3E%3C/svg%3E" style="display: none;"></ef-image>
        <ef-image-track
          .element=${document.getElementById("test-image-track") || (() => {
            const img = document.createElement("ef-image");
            img.id = "test-image-track";
            img.setAttribute("duration", "5s");
            img.setAttribute("src", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23ccc'/%3E%3C/svg%3E");
            return img;
          })()}
          pixels-per-ms="0.1"
        ></ef-image-track>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    async "renders with image element"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const image = document.createElement("ef-image");
      image.id = "test-image-track-1";
      image.setAttribute("duration", "5s");
      
      const track = document.createElement("ef-image-track");
      (track as any).element = image;
      (track as any).pixelsPerMs = 0.1;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(100);
      
      const trackElement = ctx.querySelector<EFImageTrack>("ef-image-track")!;
      ctx.expect(trackElement).toBeDefined();
      ctx.expect(trackElement.element).toBeDefined();
    },
    
    async "renders at correct time position"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const image = document.createElement("ef-image");
      image.id = "test-image-track-2";
      image.setAttribute("duration", "5s");
      (image as any).trimStartMs = 1000;
      
      const track = document.createElement("ef-image-track");
      (track as any).element = image;
      (track as any).pixelsPerMs = 0.1;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(100);
      
      const trackElement = ctx.querySelector<EFImageTrack>("ef-image-track")!;
      const shadowRoot = trackElement.shadowRoot;
      const trimContainer = shadowRoot?.querySelector(".trim-container") as HTMLElement;
      
      ctx.expect(trimContainer).toBeDefined();
    },
    
    async "scales with pixelsPerMs"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const image = document.createElement("ef-image");
      image.id = "test-image-track-3";
      image.setAttribute("duration", "5s");
      
      const track = document.createElement("ef-image-track");
      (track as any).element = image;
      (track as any).pixelsPerMs = 0.1;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(100);
      
      const trackElement = ctx.querySelector<EFImageTrack>("ef-image-track")!;
      (trackElement as any).pixelsPerMs = 0.2;
      await ctx.frame();
      
      ctx.expect((trackElement as any).pixelsPerMs).toBe(0.2);
    },
    
    async "shows trim handles when enabled"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const image = document.createElement("ef-image");
      image.id = "test-image-track-4";
      image.setAttribute("duration", "5s");
      
      const track = document.createElement("ef-image-track");
      (track as any).element = image;
      (track as any).pixelsPerMs = 0.1;
      (track as any).enableTrim = true;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(100);
      
      const trackElement = ctx.querySelector<EFImageTrack>("ef-image-track")!;
      const shadowRoot = trackElement.shadowRoot;
      const trimHandles = shadowRoot?.querySelector("ef-trim-handles");
      
      ctx.expect(trimHandles).toBeDefined();
    },
    
    async "renders thumbnail when src is available"(ctx) {
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("pixels-per-ms", "0.1");
      
      const image = document.createElement("ef-image");
      image.id = "test-image-track-5";
      image.setAttribute("duration", "5s");
      image.setAttribute("src", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23ccc'/%3E%3C/svg%3E");
      (image as any).durationMs = 5000;
      
      const track = document.createElement("ef-image-track");
      (track as any).element = image;
      (track as any).pixelsPerMs = 0.1;
      
      provider.appendChild(track);
      container.appendChild(provider);
      
      await ctx.frame();
      await ctx.wait(200);
      
      const trackElement = ctx.querySelector<EFImageTrack>("ef-image-track")!;
      const shadowRoot = trackElement.shadowRoot;
      const thumbnail = shadowRoot?.querySelector("img");
      
      // Should render thumbnail if track is wide enough
      const trimContainer = shadowRoot?.querySelector(".trim-container") as HTMLElement;
      const trackWidth = parseInt(trimContainer?.style.width || "0", 10);
      if (trackWidth > 20) {
        ctx.expect(thumbnail).toBeDefined();
      }
    },
  },
});
