import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFTogglePlay } from "./EFTogglePlay.js";
import "./EFTogglePlay.js";
import "./EFPreview.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFTogglePlay",
  description: "Toggle play/pause button that switches between play and pause slots",
  category: "controls",
  
  render: () => html`
    <ef-preview id="toggle-preview">
      <ef-timegroup mode="fixed" duration="5s" style="width: 400px; height: 300px;">
        <ef-video
          src="/assets/bars-n-tone2.mp4"
          duration="5s"
          style="width: 100%; height: 100%;"
        ></ef-video>
      </ef-timegroup>
    </ef-preview>
    
    <ef-toggle-play>
      <button slot="play" style="padding: 10px 20px; font-size: 16px;">▶ Play</button>
      <button slot="pause" style="padding: 10px 20px; font-size: 16px;">⏸ Pause</button>
    </ef-toggle-play>
  `,
  
  scenarios: {
    async "renders toggle play component"(ctx) {
      const toggle = ctx.querySelector<EFTogglePlay>("ef-toggle-play")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(toggle).toBeDefined();
    },
    
    async "shows play button when not playing"(ctx) {
      const toggle = ctx.querySelector<EFTogglePlay>("ef-toggle-play")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(toggle.playing).toBe(false);
      
      const playSlot = toggle.querySelector('[slot="play"]');
      ctx.expect(playSlot).toBeDefined();
    },
    
    async "shows pause button when playing"(ctx) {
      const toggle = ctx.querySelector<EFTogglePlay>("ef-toggle-play")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      (preview as any).playbackController?.play();
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(toggle.playing).toBe(true);
      
      const pauseSlot = toggle.querySelector('[slot="pause"]');
      ctx.expect(pauseSlot).toBeDefined();
    },
    
    async "toggles playback on click"(ctx) {
      const toggle = ctx.querySelector<EFTogglePlay>("ef-toggle-play")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const initialPlaying = (preview as any).playbackController?.playing || false;
      
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await ctx.wait(100);
      await ctx.frame();
      
      const newPlaying = (preview as any).playbackController?.playing || false;
      ctx.expect(newPlaying).not.toBe(initialPlaying);
    },
  },
});
