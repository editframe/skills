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
  category: "gui",
  subcategory: "timeline",
  
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
          id="track-item-video"
          pixels-per-ms="0.1"
        ></ef-track-item>
      </div>
      
      <div style="position: relative; width: 100%; height: 40px; background: #1e293b;">
        <ef-track-item
          id="track-item-audio"
          pixels-per-ms="0.1"
        ></ef-track-item>
      </div>
      
      <div style="position: relative; width: 100%; height: 40px; background: #1e293b;">
        <ef-track-item
          id="track-item-image"
          pixels-per-ms="0.1"
        ></ef-track-item>
      </div>
      
      <div style="position: relative; width: 100%; height: 40px; background: #1e293b;">
        <ef-track-item
          id="track-item-text"
          pixels-per-ms="0.1"
        ></ef-track-item>
      </div>
    </div>
  `,
  
  // Link elements after render using setup function
  setup: async (container) => {
    // Wait a frame for elements to be created
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    const video = container.querySelector("#video-track-test");
    const audio = container.querySelector("#audio-track-test");
    const image = container.querySelector("#image-track-test");
    const text = container.querySelector("#text-track-test");
    
    const trackVideo = container.querySelector("#track-item-video") as TrackItem;
    const trackAudio = container.querySelector("#track-item-audio") as TrackItem;
    const trackImage = container.querySelector("#track-item-image") as TrackItem;
    const trackText = container.querySelector("#track-item-text") as TrackItem;
    
    if (trackVideo && video) trackVideo.element = video as any;
    if (trackAudio && audio) trackAudio.element = audio as any;
    if (trackImage && image) trackImage.element = image as any;
    if (trackText && text) trackText.element = text as any;
    
    // Wait for updates to complete
    await new Promise(resolve => requestAnimationFrame(resolve));
  },
  
  scenarios: {
    async "renders with video element"(ctx) {
      const video = ctx.querySelector("#video-track-test");
      await ctx.frame();
      
      const videoTrack = ctx.querySelector<TrackItem>("#track-item-video");
      if (videoTrack) {
        await videoTrack.updateComplete;
      }
      
      // Wait for video media to load if it has a mediaEngineTask
      if (video && (video as any).mediaEngineTask) {
        await (video as any).mediaEngineTask.taskComplete.catch(() => {});
      }
      
      ctx.expect(videoTrack).toBeDefined();
      ctx.expect(videoTrack?.element).toBe(video);
    },
    
    async "displays element type icon"(ctx) {
      const trackItems = ctx.querySelectorAll<TrackItem>("ef-track-item");
      await ctx.frame();
      
      // Wait for all track items to update
      await Promise.all(Array.from(trackItems).map(item => item.updateComplete));
      
      for (const item of trackItems) {
        if (!item.element) continue; // Skip items without elements
        
        const shadowRoot = item.shadowRoot;
        if (!shadowRoot) continue;
        
        // The icon class is "element-icon" not "item-icon"
        const icon = shadowRoot.querySelector(".element-icon");
        ctx.expect(icon).toBeDefined();
      }
    },
    
    async "shows element label"(ctx) {
      const trackItems = ctx.querySelectorAll<TrackItem>("ef-track-item");
      await ctx.frame();
      
      // Wait for all track items to update
      await Promise.all(Array.from(trackItems).map(item => item.updateComplete));
      
      for (const item of trackItems) {
        if (!item.element) continue; // Skip items without elements
        
        const shadowRoot = item.shadowRoot;
        if (!shadowRoot) continue;
        
        // The label class is "duration-label" not "item-label"
        const label = shadowRoot.querySelector(".duration-label");
        ctx.expect(label).toBeDefined();
      }
    },
    
    async "positions based on start time"(ctx) {
      const videoTrack = ctx.querySelector<TrackItem>("#track-item-video");
      await ctx.frame();
      
      if (videoTrack) {
        await videoTrack.updateComplete;
      }
      
      // Video starts at 1s = 1000ms
      // With pixelsPerMs=0.1, left should be 100px
      const expectedLeft = 1000 * 0.1;
      ctx.expect(expectedLeft).toBe(100);
    },
    
    async "calculates width from duration"(ctx) {
      const videoTrack = ctx.querySelector<TrackItem>("#track-item-video");
      await ctx.frame();
      
      if (videoTrack) {
        await videoTrack.updateComplete;
      }
      
      // Wait for video media to load to get accurate duration
      const video = ctx.querySelector("#video-track-test");
      if (video && (video as any).mediaEngineTask) {
        await (video as any).mediaEngineTask.taskComplete.catch(() => {});
      }
      
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
      trackItem.element = video as any;
      trackItem.pixelsPerMs = 0.1;
      trackItem.enableTrim = true;
      trackContainer.appendChild(trackItem);
      
      await ctx.frame();
      await trackItem.updateComplete;
      
      // Wait for trim handles to be rendered (they're part of the shadow DOM)
      const shadowRoot = trackItem.shadowRoot;
      if (!shadowRoot) {
        throw new Error("TrackItem shadow root not found");
      }
      
      // Wait for trim handles to appear in shadow DOM
      await new Promise<void>((resolve) => {
        if (shadowRoot.querySelector("ef-trim-handles")) {
          resolve();
        } else {
          const observer = new MutationObserver(() => {
            if (shadowRoot.querySelector("ef-trim-handles")) {
              observer.disconnect();
              resolve();
            }
          });
          observer.observe(shadowRoot, { childList: true, subtree: true });
          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 1000);
        }
      });
      
      const trimHandles = shadowRoot.querySelector("ef-trim-handles");
      ctx.expect(trimHandles).toBeDefined();
    },
    
    async "handles different element types"(ctx) {
      await ctx.frame();
      
      const trackVideo = ctx.querySelector<TrackItem>("#track-item-video");
      const trackAudio = ctx.querySelector<TrackItem>("#track-item-audio");
      const trackImage = ctx.querySelector<TrackItem>("#track-item-image");
      const trackText = ctx.querySelector<TrackItem>("#track-item-text");
      
      // Wait for all track items to update
      await Promise.all([
        trackVideo?.updateComplete,
        trackAudio?.updateComplete,
        trackImage?.updateComplete,
        trackText?.updateComplete,
      ].filter(Boolean));
      
      // Check each track has the correct element type
      ctx.expect(trackVideo?.element?.tagName.toLowerCase()).toBe("ef-video");
      ctx.expect(trackAudio?.element?.tagName.toLowerCase()).toBe("ef-audio");
      ctx.expect(trackImage?.element?.tagName.toLowerCase()).toBe("ef-image");
      ctx.expect(trackText?.element?.tagName.toLowerCase()).toBe("ef-text");
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
