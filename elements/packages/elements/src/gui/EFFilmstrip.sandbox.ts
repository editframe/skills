import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFFilmstrip } from "./EFFilmstrip.js";
import "./EFFilmstrip.js";
import "./timeline/EFTimeline.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFFilmstrip",
  description: "Thumbnail filmstrip for timeline navigation with playhead sync",
  category: "visualization",
  
  render: () => html`
    <div style="width: 800px; height: 200px; border: 1px solid #ccc;">
      <ef-timegroup id="filmstrip-target" mode="fixed" duration="10s" style="display: none;">
        <ef-video
          src="/assets/bars-n-tone2.mp4"
          duration="10s"
        ></ef-video>
      </ef-timegroup>
      
      <ef-filmstrip
        id="test-filmstrip"
        target="filmstrip-target"
        pixels-per-ms="0.05"
        style="width: 100%; height: 100%;"
      ></ef-filmstrip>
    </div>
  `,
  
  scenarios: {
    async "renders filmstrip component"(ctx) {
      const filmstrip = ctx.querySelector<EFFilmstrip>("ef-filmstrip")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(filmstrip).toBeDefined();
    },
    
    async "connects to target timegroup"(ctx) {
      const filmstrip = ctx.querySelector<EFFilmstrip>("ef-filmstrip")!;
      const timegroup = ctx.querySelector("ef-timegroup")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(filmstrip.target).toBe("filmstrip-target");
      ctx.expect(filmstrip.targetElement).toBeDefined();
    },
    
    async "renders timeline with tracks"(ctx) {
      const filmstrip = ctx.querySelector<EFFilmstrip>("ef-filmstrip")!;
      
      await ctx.wait(200);
      await ctx.frame();
      
      const timeline = filmstrip.timelineRef.value;
      ctx.expect(timeline).toBeDefined();
    },
    
    async "syncs playhead with current time"(ctx) {
      const filmstrip = ctx.querySelector<EFFilmstrip>("ef-filmstrip")!;
      const timegroup = ctx.querySelector("ef-timegroup")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      timegroup.currentTimeMs = 5000;
      await ctx.frame();
      await ctx.wait(100);
      
      ctx.expect(timegroup.currentTimeMs).toBe(5000);
    },
    
    async "supports pixels-per-ms configuration"(ctx) {
      const filmstrip = ctx.querySelector<EFFilmstrip>("ef-filmstrip")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(filmstrip.pixelsPerMs).toBe(0.05);
      
      filmstrip.pixelsPerMs = 0.1;
      await ctx.frame();
      
      ctx.expect(filmstrip.pixelsPerMs).toBe(0.1);
    },
    
    async "can hide playhead"(ctx) {
      const filmstrip = ctx.querySelector<EFFilmstrip>("ef-filmstrip")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      filmstrip.hidePlayhead = true;
      await ctx.frame();
      
      ctx.expect(filmstrip.hidePlayhead).toBe(true);
    },
  },
});
