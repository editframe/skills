import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFControls } from "./EFControls.js";
import "./EFControls.js";
import "./EFPreview.js";
import "./EFTogglePlay.js";
import "./EFScrubber.js";
import "./EFTimeDisplay.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFControls",
  description: "Playback controls container that bridges contexts from preview to child controls",
  category: "gui",
  subcategory: "controls",
  
  render: () => html`
    <div style="width: 800px; height: 400px; border: 1px solid #ccc;">
      <ef-preview id="test-preview">
        <ef-timegroup mode="fixed" duration="5s" style="width: 100%; height: 300px;">
          <ef-video
            src="/assets/bars-n-tone2.mp4"
            duration="5s"
            style="width: 100%; height: 100%;"
          ></ef-video>
        </ef-timegroup>
      </ef-preview>
      
      <ef-controls target="test-preview" style="padding: 10px; border-top: 1px solid #ccc;">
        <ef-toggle-play>
          <button slot="play">▶ Play</button>
          <button slot="pause">⏸ Pause</button>
        </ef-toggle-play>
        <ef-scrubber style="margin: 10px 0;"></ef-scrubber>
        <ef-time-display></ef-time-display>
      </ef-controls>
    </div>
  `,
  
  scenarios: {
    async "renders controls container"(ctx) {
      const controls = ctx.querySelector<EFControls>("ef-controls")!;
      
      await ctx.frame();
      
      ctx.expect(controls).toBeDefined();
      ctx.expect(controls.target).toBe("test-preview");
    },
    
    async "connects to target preview"(ctx) {
      const controls = ctx.querySelector<EFControls>("ef-controls")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.frame();
      
      ctx.expect(controls.targetElement).toBeDefined();
      ctx.expect(controls.targetElement).toBe(preview);
    },
    
    async "provides playing context"(ctx) {
      const controls = ctx.querySelector<EFControls>("ef-controls")!;
      
      await ctx.frame();
      
      ctx.expect(typeof controls.playing).toBe("boolean");
    },
    
    async "provides currentTime context"(ctx) {
      const controls = ctx.querySelector<EFControls>("ef-controls")!;
      
      await ctx.frame();
      
      ctx.expect(typeof controls.currentTimeMs).toBe("number");
      ctx.expect(controls.currentTimeMs).toBeGreaterThanOrEqual(0);
    },
    
    async "provides duration context"(ctx) {
      const controls = ctx.querySelector<EFControls>("ef-controls")!;
      
      await ctx.frame();
      
      ctx.expect(typeof controls.durationMs).toBe("number");
      ctx.expect(controls.durationMs).toBeGreaterThan(0);
    },
    
    async "updates playing state when preview plays"(ctx) {
      const controls = ctx.querySelector<EFControls>("ef-controls")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.frame();
      
      const initialPlaying = controls.playing;
      
      await (preview as any).play();
      await ctx.frame();
      
      const newPlaying = controls.playing;
      ctx.expect(newPlaying !== initialPlaying).toBe(true);
    },
  },
});
