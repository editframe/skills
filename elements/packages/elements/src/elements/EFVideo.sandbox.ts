import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFVideo } from "./EFVideo.js";
import "./EFVideo.js";
import "./EFTimegroup.js";
import "../gui/EFTogglePlay.js"
import "../gui/EFControls.js"
import "../gui/EFScrubber.js"
import "../gui/EFTimeDisplay.js"
import "../gui/EFPreview.js"
import { EFTimegroup } from "./EFTimegroup.js";

export default defineSandbox({
  name: "EFVideo",
  description: "Video playback element with canvas-based rendering and seeking",
  category: "elements",
  subcategory: "media",
  
  render: () => html`
      <ef-timegroup id="test-timegroup" mode="fixed" duration="5s" style="width: 640px; height: 360px; border: 1px solid #ccc;">
        <ef-video
          id="test-video"
          src="/assets/bars-n-tone2.mp4"
          duration="5s"
          style="width: 100%; height: 100%;"
        ></ef-video>
      </ef-timegroup>
      <ef-controls target="test-timegroup" class="flex flex-row gap-2">
        <ef-toggle-play>
          <button slot="play">Play</button>
          <button slot="pause">Pause</button>
        </ef-toggle-play>
        <ef-time-display></ef-time-display>
        <ef-scrubber></ef-scrubber>
    </ef-controls>
  `,
  setup: async (container) => {
    const timegroup = container.querySelector<EFTimegroup>("ef-timegroup")!;
    await timegroup.waitForMediaDurations();
  },
  
  scenarios: {
    async "renders video element"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      ctx.expect(video).toBeDefined();
      ctx.expect(video.canvasElement).toBeDefined();
      ctx.expect(video.mediaEngineTask).toBeDefined();
    },
    
    async "initializes with source"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      
      ctx.expect(video.src).toBe("/assets/bars-n-tone2.mp4");
      ctx.expect(video.durationMs).toBeGreaterThan(0);
    },
    
    async "can seek to specific time"(ctx) {
      const timegroup = ctx.querySelector<EFTimegroup>("ef-timegroup")!;
      await timegroup.seek(2000);
      ctx.expect(timegroup.currentTimeMs).toBe(2000);
    },
    
    async "handles source changes"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      
      await ctx.frame();
      
      const originalSrc = video.src;
      // Use bars-n-tone.mp4 (different from bars-n-tone2.mp4 used in render)
      video.src = "/assets/bars-n-tone.mp4";
      await video.updateComplete;
      await video.waitForMediaDurations();
      
      ctx.expect(video.src).toBe("/assets/bars-n-tone.mp4");
      ctx.expect(video.src !== originalSrc).toBe(true);
    },
    
    async "has loading state"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      ctx.expect(video.loadingState).toBeDefined();
      ctx.expect(typeof video.loadingState.isLoading).toBe("boolean");
    },
  },
});
