import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFVideo } from "./EFVideo.js";
import "./EFVideo.js";
import "./EFTimegroup.js";

export default defineSandbox({
  name: "EFVideo",
  description: "Video playback element with canvas-based rendering and seeking",
  category: "media",
  
  render: () => html`
    <ef-timegroup mode="fixed" duration="5s" style="width: 640px; height: 360px; border: 1px solid #ccc;">
      <ef-video
        id="test-video"
        src="/assets/bars-n-tone2.mp4"
        duration="5s"
        style="width: 100%; height: 100%;"
      ></ef-video>
    </ef-timegroup>
  `,
  
  scenarios: {
    async "renders video element"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(video).toBeDefined();
      ctx.expect(video.canvasElement).toBeDefined();
    },
    
    async "initializes with source"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(video.src).toBe("/assets/bars-n-tone2.mp4");
      ctx.expect(video.durationMs).toBeGreaterThan(0);
    },
    
    async "can seek to specific time"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      const timegroup = ctx.querySelector("ef-timegroup")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      timegroup.currentTimeMs = 2000;
      await ctx.frame();
      await ctx.wait(100);
      
      ctx.expect(timegroup.currentTimeMs).toBe(2000);
    },
    
    async "updates current time during playback"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      const timegroup = ctx.querySelector("ef-timegroup")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const initialTime = timegroup.currentTimeMs;
      
      timegroup.playbackController.play();
      await ctx.wait(500);
      await ctx.frame();
      
      const newTime = timegroup.currentTimeMs;
      ctx.expect(newTime).toBeGreaterThan(initialTime);
    },
    
    async "handles source changes"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const originalSrc = video.src;
      video.src = "/assets/color.mp4";
      await ctx.frame();
      await ctx.wait(100);
      
      ctx.expect(video.src).toBe("/assets/color.mp4");
      ctx.expect(video.src).not.toBe(originalSrc);
    },
    
    async "has loading state"(ctx) {
      const video = ctx.querySelector<EFVideo>("ef-video")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(video.loadingState).toBeDefined();
      ctx.expect(typeof video.loadingState.isLoading).toBe("boolean");
    },
  },
});
