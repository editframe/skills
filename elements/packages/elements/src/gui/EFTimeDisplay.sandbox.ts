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
  category: "gui",
  subcategory: "controls",
  
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
    
    <ef-time-display target="time-preview" style="padding: 10px; font-size: 14px;"></ef-time-display>
  `,
  
  scenarios: {
    async "renders time display"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      
      await ctx.frame();
      
      ctx.expect(timeDisplay).toBeDefined();
    },
    
    async "displays formatted time"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.frame();
      
      (preview as any).currentTimeMs = 5000;
      (preview as any).durationMs = 10000;
      await ctx.frame();
      
      const timeText = timeDisplay.shadowRoot?.textContent || "";
      ctx.expect(timeText).toContain(":");
    },
    
    async "updates when current time changes"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      
      await ctx.frame();
      
      const initialText = timeDisplay.shadowRoot?.textContent || "";
      
      // EFTimeDisplay consumes currentTimeContext, so setting the property directly
      // won't trigger Lit's update cycle. We need to call requestUpdate().
      timeDisplay.currentTimeMs = 7000;
      timeDisplay.requestUpdate();
      await timeDisplay.updateComplete;
      await ctx.frame();
      
      const newText = timeDisplay.shadowRoot?.textContent || "";
      ctx.expect(newText !== initialText).toBe(true);
    },
    
    async "handles NaN values gracefully"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      
      await ctx.frame();
      
      timeDisplay.currentTimeMs = Number.NaN;
      await ctx.frame();
      
      const timeText = timeDisplay.shadowRoot?.textContent || "";
      ctx.expect(timeText).toContain("0:00");
    },
    
    async "formats time as minutes:seconds"(ctx) {
      const timeDisplay = ctx.querySelector<EFTimeDisplay>("ef-time-display")!;
      
      await ctx.frame();
      
      timeDisplay.currentTimeMs = 125000;
      timeDisplay.durationMs = 300000;
      await ctx.frame();
      
      const timeText = timeDisplay.shadowRoot?.textContent || "";
      ctx.expect(timeText).toMatch(/\d+:\d+/);
    },
  },
});
