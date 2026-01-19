import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFPlay } from "./EFPlay.js";
import "./EFPlay.js";
import "./EFPreview.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFPlay",
  description: "Play button that shows when not playing and triggers playback",
  category: "gui",
  subcategory: "controls",
  
  render: () => html`
    <ef-preview id="play-preview">
      <ef-timegroup mode="fixed" duration="5s" style="width: 400px; height: 300px;">
        <ef-video
          src="/assets/bars-n-tone2.mp4"
          duration="5s"
          style="width: 100%; height: 100%;"
        ></ef-video>
      </ef-timegroup>
    </ef-preview>
    
    <ef-play target="play-preview">
      <button style="padding: 10px 20px; font-size: 16px;">▶ Play</button>
    </ef-play>
  `,
  
  scenarios: {
    async "renders play button"(ctx) {
      const play = ctx.querySelector<EFPlay>("ef-play")!;
      
      await play.updateComplete;
      await ctx.frame();
      
      ctx.expect(play).toBeDefined();
    },
    
    async "shows when not playing"(ctx) {
      const play = ctx.querySelector<EFPlay>("ef-play")!;
      
      await play.updateComplete;
      await ctx.frame();
      
      ctx.expect(play.playing).toBe(false);
      ctx.expect(play.style.display !== "none").toBe(true);
    },
    
    async "hides when playing"(ctx) {
      const play = ctx.querySelector<EFPlay>("ef-play")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await play.updateComplete;
      await ctx.frame();
      
      await (preview as any).play();
      await play.updateComplete;
      await ctx.frame();
      
      ctx.expect(play.playing).toBe(true);
      ctx.expect(play.style.display).toBe("none");
    },
    
    async "triggers playback on click"(ctx) {
      const play = ctx.querySelector<EFPlay>("ef-play")!;
      const preview = ctx.querySelector("ef-preview")!;
      
      await play.updateComplete;
      await ctx.frame();
      
      const initialPlaying = (preview as any).playing || false;
      
      play.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await play.updateComplete;
      await ctx.frame();
      
      const newPlaying = (preview as any).playing || false;
      ctx.expect(newPlaying !== initialPlaying).toBe(true);
    },
  },
});
