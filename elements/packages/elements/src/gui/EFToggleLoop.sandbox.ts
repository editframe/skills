import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFToggleLoop } from "./EFToggleLoop.js";
import "./EFToggleLoop.js";
import "./EFPreview.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFToggleLoop",
  description: "Toggle loop button that toggles looping playback",
  category: "gui",
  subcategory: "controls",

  render: () => html`
    <ef-preview id="loop-preview">
      <ef-timegroup mode="fixed" duration="5s" style="width: 400px; height: 300px;">
        <ef-video
          src="/assets/bars-n-tone2.mp4"
          duration="5s"
          style="width: 100%; height: 100%;"
        ></ef-video>
      </ef-timegroup>
    </ef-preview>
    
    <ef-toggle-loop target="loop-preview">
      <button style="padding: 10px 20px; font-size: 16px;">🔁 Toggle Loop</button>
    </ef-toggle-loop>
  `,

  scenarios: {
    async "renders toggle loop component"(ctx) {
      const toggle = ctx.querySelector<EFToggleLoop>("ef-toggle-loop")!;
      await ctx.frame();

      ctx.expect(toggle).toBeDefined();
    },

    async "connects to target context"(ctx) {
      const toggle = ctx.querySelector<EFToggleLoop>("ef-toggle-loop")!;
      await ctx.frame();

      ctx.expect(toggle.context).toBeDefined();
    },

    async "toggles loop on click"(ctx) {
      const toggle = ctx.querySelector<EFToggleLoop>("ef-toggle-loop")!;
      const preview = ctx.querySelector("ef-preview")!;
      await ctx.frame();

      const initialLoop = (preview as any).loop || false;

      const button = toggle.querySelector("button")!;
      button.click();
      await ctx.frame();

      const newLoop = (preview as any).loop;
      ctx.expect(newLoop).toBe(!initialLoop);
    },

    async "renders slotted content"(ctx) {
      const toggle = ctx.querySelector<EFToggleLoop>("ef-toggle-loop")!;
      await ctx.frame();

      const button = toggle.querySelector("button");
      ctx.expect(button).toBeDefined();
      ctx.expect(button!.textContent).toContain("Toggle Loop");
    },
  },
});
