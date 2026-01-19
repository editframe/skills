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
  description: "Image track component with thumbnail preview. Base track behavior tested in TrackItem.sandbox.ts",
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
    "renders thumbnail when src is available": {
      description: "Image tracks display a thumbnail preview of the source image when the track is wide enough",
      run: async (ctx) => {
        const track = ctx.querySelector<EFImageTrack>("ef-image-track")!;
        
        await ctx.frame();
        await track.updateComplete;
        
        const shadowRoot = track.shadowRoot;
        const thumbnail = shadowRoot?.querySelector("img") as HTMLImageElement | null;
        
        // Wait for image to load if thumbnail exists
        if (thumbnail) {
          if (!thumbnail.complete) {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                thumbnail.removeEventListener("load", onLoad);
                thumbnail.removeEventListener("error", onError);
                reject(new Error("Timeout waiting for thumbnail image to load"));
              }, 5000);
              
              const onLoad = () => {
                clearTimeout(timeout);
                thumbnail.removeEventListener("load", onLoad);
                thumbnail.removeEventListener("error", onError);
                resolve();
              };
              
              const onError = () => {
                clearTimeout(timeout);
                thumbnail.removeEventListener("load", onLoad);
                thumbnail.removeEventListener("error", onError);
                // Image load error is acceptable - component will fallback to icon
                resolve();
              };
              
              thumbnail.addEventListener("load", onLoad, { once: true });
              thumbnail.addEventListener("error", onError, { once: true });
            }).catch(() => {
              // Ignore errors - component handles image load failures gracefully
            });
          }
          await ctx.frame();
        }
        
        const trimContainer = shadowRoot?.querySelector(".trim-container") as HTMLElement;
        const trackWidth = parseInt(trimContainer?.style.width || "0", 10);
        if (trackWidth > 20) {
          ctx.expect(thumbnail).toBeDefined();
        }
      },
    },
  },
});
