import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFPause } from "./EFPause.js";
import "./EFPause.js";
import "./EFPreview.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFPause",
  description: "Pause button that shows when playing and pauses playback",
  category: "gui",
  subcategory: "controls",
  
  render: () => html`
    <ef-preview id="pause-preview">
      <ef-timegroup mode="fixed" duration="5s" style="width: 400px; height: 300px;">
        <ef-video
          src="/assets/bars-n-tone2.mp4"
          duration="5s"
          style="width: 100%; height: 100%;"
        ></ef-video>
      </ef-timegroup>
    </ef-preview>
    
    <ef-pause target="pause-preview">
      <button style="padding: 10px 20px; font-size: 16px;">⏸ Pause</button>
    </ef-pause>
  `,
  
  scenarios: {
    async "renders pause button"(ctx) {
      const pause = ctx.querySelector<EFPause>("ef-pause")!;
      
      await ctx.frame();
      
      ctx.expect(pause).toBeDefined();
    },
    
    async "hides when not playing"(ctx) {
      const pause = ctx.querySelector<EFPause>("ef-pause")!;
      
      await ctx.frame();
      
      ctx.expect(pause.playing).toBe(false);
      ctx.expect(pause.style.display).toBe("none");
    },
    
    async "shows when playing"(ctx) {
      const pause = ctx.querySelector<EFPause>("ef-pause")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.frame();
      
      await (preview as any).play();
      await ctx.frame();
      
      ctx.expect(pause.playing).toBe(true);
      ctx.expect(pause.style.display !== "none").toBe(true);
    },
    
    async "triggers pause on click"(ctx) {
      const pause = ctx.querySelector<EFPause>("ef-pause")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.frame();
      
      await (preview as any).play();
      await ctx.frame();
      
      const wasPlaying = (preview as any).playing || false;
      
      pause.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await ctx.frame();
      
      const nowPlaying = (preview as any).playing || false;
      ctx.expect(nowPlaying !== wasPlaying).toBe(true);
    },
  },
});
