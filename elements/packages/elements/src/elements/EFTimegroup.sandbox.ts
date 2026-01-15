import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFTimegroup } from "./EFTimegroup.js";
import "./EFTimegroup.js";

export default defineSandbox({
  name: "EFTimegroup",
  description: "Temporal container for synchronized media playback",
  
  render: () => html`
    <ef-timegroup mode="fixed" duration="2s" style="width: 400px; height: 300px; border: 1px solid #ccc;">
      <div style="padding: 20px;">
        <h3>Test Content</h3>
        <p>This is a test timegroup with 2 second duration.</p>
      </div>
    </ef-timegroup>
  `,
  
  scenarios: {
    async "initializes with correct duration"(ctx) {
      const timegroup = ctx.querySelector<EFTimegroup>("ef-timegroup")!;
      
      // Wait for timegroup to initialize
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(timegroup).toBeDefined();
      ctx.expect(timegroup.durationMs).toBe(2000);
    },
    
    async "starts at time 0"(ctx) {
      const timegroup = ctx.querySelector<EFTimegroup>("ef-timegroup")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(timegroup.currentTimeMs).toBe(0);
    },
    
    async "can set currentTimeMs"(ctx) {
      const timegroup = ctx.querySelector<EFTimegroup>("ef-timegroup")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      timegroup.currentTimeMs = 500;
      await ctx.frame();
      
      ctx.expect(timegroup.currentTimeMs).toBe(500);
    },
    
    async "clamps currentTimeMs to duration"(ctx) {
      const timegroup = ctx.querySelector<EFTimegroup>("ef-timegroup")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      timegroup.currentTimeMs = 5000; // Beyond 2s duration
      await ctx.frame();
      
      ctx.expect(timegroup.currentTimeMs).toBeLessThanOrEqual(2000);
    },
    
    async "has playbackController"(ctx) {
      const timegroup = ctx.querySelector<EFTimegroup>("ef-timegroup")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(timegroup.playbackController).toBeDefined();
    },
  },
});
