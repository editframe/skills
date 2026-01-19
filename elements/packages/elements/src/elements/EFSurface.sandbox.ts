import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFSurface } from "./EFSurface.js";
import "./EFSurface.js";
import "./EFTimegroup.js";
import "./EFVideo.js";

export default defineSandbox({
  name: "EFSurface",
  description: "Canvas element that mirrors the content of a target element",
  category: "elements",
  subcategory: "display",

  render: () => html`
    <div style="display: flex; gap: 20px; padding: 20px; background: #1a1a1a;">
      <div>
        <p style="color: white; margin-bottom: 8px;">Source Video:</p>
        <ef-timegroup id="source-timegroup" mode="fixed" duration="5s" style="width: 200px; height: 150px;">
          <ef-video
            id="source-video"
            src="/assets/bars-n-tone2.mp4"
            duration="5s"
            style="width: 100%; height: 100%;"
          ></ef-video>
        </ef-timegroup>
      </div>
      
      <div>
        <p style="color: white; margin-bottom: 8px;">Surface Mirror:</p>
        <ef-surface 
          target="source-video" 
          style="width: 200px; height: 150px; border: 1px solid #3b82f6;"
        ></ef-surface>
      </div>
    </div>
  `,

  scenarios: {
    async "renders surface component"(ctx) {
      const surface = ctx.querySelector<EFSurface>("ef-surface")!;
      await ctx.frame();

      ctx.expect(surface).toBeDefined();
    },

    async "creates canvas element"(ctx) {
      const surface = ctx.querySelector<EFSurface>("ef-surface")!;
      await ctx.frame();

      const canvas = surface.shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
    },

    async "accepts target attribute"(ctx) {
      const surface = ctx.querySelector<EFSurface>("ef-surface")!;
      await ctx.frame();

      ctx.expect(surface.target).toBe("source-video");
    },

    async "provides temporal-like properties"(ctx) {
      const surface = ctx.querySelector<EFSurface>("ef-surface")!;
      await ctx.frame();

      ctx.expect(typeof surface.currentTimeMs).toBe("number");
      ctx.expect(typeof surface.durationMs).toBe("number");
      ctx.expect(typeof surface.startTimeMs).toBe("number");
      ctx.expect(typeof surface.endTimeMs).toBe("number");
    },

    async "computes endTimeMs from startTimeMs and durationMs"(ctx) {
      const surface = ctx.querySelector<EFSurface>("ef-surface")!;
      await ctx.frame();

      const expectedEnd = surface.startTimeMs + surface.durationMs;
      ctx.expect(surface.endTimeMs).toBe(expectedEnd);
    },
  },
});
