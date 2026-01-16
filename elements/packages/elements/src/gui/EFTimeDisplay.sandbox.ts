import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFTimeDisplay } from "./EFTimeDisplay.js";
import "./EFTimeDisplay.js";
import "./EFPreview.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFTimeDisplay",
  description: "Time display component showing current time and duration",
  category: "controls",
  
  render: () => html`
    <ef-preview id="time-preview">
      <ef-timegroup mode="fixed" duration="10s" style="width: 400px; height: 300px;">
        <ef-video
          src="/assets/bars-n-tone2.mp4"
          duration="10s"
          style="width: 100%; height: 100%;"
        ></ef-video>
      </ef-timegroup>
    </ef-preview>
    
    <ef-time-display style="padding: 10px; font-size: 14px;"></ef-time-display>
  `,
  
  scenarios: {
    async "renders time display"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(timeDisplay).toBeDefined();
    },
    
    async "displays formatted time"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      (preview as any).currentTimeMs = 5000;
      (preview as any).durationMs = 10000;
      await ctx.frame();
      await ctx.wait(100);
      
      const timeText = timeDisplay.shadowRoot?.textContent || "";
      ctx.expect(timeText).toContain(":");
    },
    
    async "updates when current time changes"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const initialText = timeDisplay.shadowRoot?.textContent || "";
      
      (preview as any).currentTimeMs = 7000;
      await ctx.frame();
      await ctx.wait(100);
      
      const newText = timeDisplay.shadowRoot?.textContent || "";
      ctx.expect(newText).not.toBe(initialText);
    },
    
    async "handles NaN values gracefully"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      timeDisplay.currentTimeMs = Number.NaN;
      await ctx.frame();
      
      const timeText = timeDisplay.shadowRoot?.textContent || "";
      ctx.expect(timeText).toContain("0:00");
    },
    
    async "formats time as minutes:seconds"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      timeDisplay.currentTimeMs = 125000;
      timeDisplay.durationMs = 300000;
      await ctx.frame();
      
      const timeText = timeDisplay.shadowRoot?.textContent || "";
      ctx.expect(timeText).toMatch(/\d+:\d+/);
    },
  },
});
