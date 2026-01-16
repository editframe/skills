import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFPreview } from "./EFPreview.js";
import "./EFPreview.js";
import "./EFControls.js";
import "./EFTogglePlay.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFPreview",
  description: "Preview container with focus tracking and playback control integration",
  category: "panels",
  
  render: () => html`
    <div style="width: 800px; height: 500px; border: 1px solid #ccc;">
      <ef-preview id="test-preview">
        <ef-timegroup mode="fixed" duration="5s" style="width: 100%; height: 400px;">
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
      </ef-controls>
    </div>
  `,
  
  scenarios: {
    async "renders preview component"(ctx) {
      const preview = ctx.querySelector<EFPreview>("ef-preview")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(preview).toBeDefined();
    },
    
    async "tracks focused element on hover"(ctx) {
      const preview = ctx.querySelector<EFPreview>("ef-preview")!;
      const video = ctx.querySelector("ef-video")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const hoverEvent = new MouseEvent("pointerover", {
        bubbles: true,
        cancelable: true,
        target: video,
      });
      preview.dispatchEvent(hoverEvent);
      await ctx.frame();
      
      ctx.expect(preview.focusedElement).toBeDefined();
    },
    
    async "clears focus on pointer out"(ctx) {
      const preview = ctx.querySelector<EFPreview>("ef-preview")!;
      const video = ctx.querySelector("ef-video")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const hoverEvent = new MouseEvent("pointerover", {
        bubbles: true,
        cancelable: true,
        target: video,
      });
      preview.dispatchEvent(hoverEvent);
      await ctx.frame();
      
      const outEvent = new MouseEvent("pointerout", {
        bubbles: true,
        cancelable: true,
        relatedTarget: preview,
      });
      preview.dispatchEvent(outEvent);
      await ctx.frame();
      
      ctx.expect(preview.focusedElement).toBeUndefined();
    },
    
    async "provides focused element context"(ctx) {
      const preview = ctx.querySelector<EFPreview>("ef-preview")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(preview.focusedElement).toBeDefined();
    },
    
    async "has crosshair cursor"(ctx) {
      const preview = ctx.querySelector<EFPreview>("ef-preview")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const styles = getComputedStyle(preview);
      ctx.expect(styles.cursor).toBe("crosshair");
    },
  },
});
