import { defineSandbox } from "../../../sandbox/index.js";
import { html } from "lit";
import type { TrackItem } from "./TrackItem.js";
import "./TrackItem.js";
import "../../../elements/EFVideo.js";
import "../../../elements/EFAudio.js";
import "../../../elements/EFImage.js";
import "../../../elements/EFText.js";

export default defineSandbox({
  name: "TrackItem",
  description: "Atom: Individual track item representing a temporal element on the timeline",
  
  render: () => html`
    <div style="width: 100%; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
      <ef-video 
        id="video-track-test"
        src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        start="1s"
        duration="3s"
        style="display: none;"
      ></ef-video>
      
      <ef-audio
        id="audio-track-test"
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        start="0.5s"
        duration="2s"
        style="display: none;"
      ></ef-audio>
      
      <ef-image
        id="image-track-test"
        src="https://picsum.photos/800/600"
        start="2s"
        duration="1.5s"
        style="display: none;"
      ></ef-image>
      
      <ef-text
        id="text-track-test"
        start="0s"
        duration="4s"
        style="display: none;"
      >Sample Text</ef-text>
      
      <div style="position: relative; width: 100%; height: 40px; background: #1e293b;">
        <ef-track-item
          .element=${document.getElementById("video-track-test")}
          pixels-per-ms="0.1"
        ></ef-track-item>
      </div>
      
      <div style="position: relative; width: 100%; height: 40px; background: #1e293b;">
        <ef-track-item
          .element=${document.getElementById("audio-track-test")}
          pixels-per-ms="0.1"
        ></ef-track-item>
      </div>
      
      <div style="position: relative; width: 100%; height: 40px; background: #1e293b;">
        <ef-track-item
          .element=${document.getElementById("image-track-test")}
          pixels-per-ms="0.1"
        ></ef-track-item>
      </div>
      
      <div style="position: relative; width: 100%; height: 40px; background: #1e293b;">
        <ef-track-item
          .element=${document.getElementById("text-track-test")}
          pixels-per-ms="0.1"
        ></ef-track-item>
      </div>
    </div>
  `,
  
  scenarios: {
    async "renders with video element"(ctx) {
      const video = ctx.querySelector("#video-track-test");
      await ctx.frame();
      
      const trackItems = ctx.querySelectorAll<TrackItem>("ef-track-item");
      const videoTrack = trackItems[0];
      
      ctx.expect(videoTrack).toBeDefined();
      ctx.expect(videoTrack.element).toBe(video);
    },
    
    async "displays element type icon"(ctx) {
      const trackItems = ctx.querySelectorAll<TrackItem>("ef-track-item");
      await ctx.frame();
      
      for (const item of trackItems) {
        const shadowRoot = item.shadowRoot;
        if (!shadowRoot) {
          throw new Error("TrackItem shadow root not found");
        }
        
        const icon = shadowRoot.querySelector(".item-icon");
        ctx.expect(icon).toBeDefined();
      }
    },
    
    async "shows element label"(ctx) {
      const trackItems = ctx.querySelectorAll<TrackItem>("ef-track-item");
      await ctx.frame();
      
      for (const item of trackItems) {
        const shadowRoot = item.shadowRoot;
        if (!shadowRoot) {
          throw new Error("TrackItem shadow root not found");
        }
        
        const label = shadowRoot.querySelector(".item-label");
        ctx.expect(label).toBeDefined();
      }
    },
    
    async "positions based on start time"(ctx) {
      const videoTrack = ctx.querySelectorAll<TrackItem>("ef-track-item")[0];
      await ctx.frame();
      
      // Video starts at 1s = 1000ms
      // With pixelsPerMs=0.1, left should be 100px
      const expectedLeft = 1000 * 0.1;
      ctx.expect(expectedLeft).toBe(100);
    },
    
    async "calculates width from duration"(ctx) {
      const videoTrack = ctx.querySelectorAll<TrackItem>("ef-track-item")[0];
      await ctx.frame();
      
      // Video duration is 3s = 3000ms
      // With pixelsPerMs=0.1, width should be 300px
      const expectedWidth = 3000 * 0.1;
      ctx.expect(expectedWidth).toBe(300);
    },
    
    async "shows trim handles when enabled"(ctx) {
      const container = ctx.getContainer();
      const video = document.createElement("ef-video");
      video.id = "trim-test-video";
      video.setAttribute("src", "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
      video.setAttribute("start", "1s");
      video.setAttribute("duration", "3s");
      video.style.display = "none";
      container.appendChild(video);
      
      const trackContainer = document.createElement("div");
      trackContainer.style.position = "relative";
      trackContainer.style.width = "100%";
      trackContainer.style.height = "40px";
      trackContainer.style.background = "#1e293b";
      container.appendChild(trackContainer);
      
      const trackItem = document.createElement("ef-track-item") as TrackItem;
      trackItem.element = video;
      trackItem.pixelsPerMs = 0.1;
      trackItem.enableTrim = true;
      trackContainer.appendChild(trackItem);
      
      await ctx.frame();
      
      const shadowRoot = trackItem.shadowRoot;
      if (!shadowRoot) {
        throw new Error("TrackItem shadow root not found");
      }
      
      const trimHandles = shadowRoot.querySelector("ef-trim-handles");
      ctx.expect(trimHandles).toBeDefined();
    },
    
    async "handles different element types"(ctx) {
      const trackItems = ctx.querySelectorAll<TrackItem>("ef-track-item");
      await ctx.frame();
      
      ctx.expect(trackItems.length).toBe(4);
      
      // Each should have a different element type
      const elements = Array.from(trackItems).map(item => item.element?.tagName.toLowerCase());
      ctx.expect(elements).toContain("ef-video");
      ctx.expect(elements).toContain("ef-audio");
      ctx.expect(elements).toContain("ef-image");
      ctx.expect(elements).toContain("ef-text");
    },
    
    async "respects pixels per ms for sizing"(ctx) {
      const trackItems = ctx.querySelectorAll<TrackItem>("ef-track-item");
      await ctx.frame();
      
      for (const item of trackItems) {
        ctx.expect(item.pixelsPerMs).toBe(0.1);
      }
    },
  },
});
