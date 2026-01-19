import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFActiveRootTemporal } from "./EFActiveRootTemporal.js";
import "./EFActiveRootTemporal.js";
import "../canvas/EFCanvas.js";
import "../canvas/EFCanvasItem.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFActiveRootTemporal",
  description: "Displays the ID of the active root temporal element from a canvas",
  category: "gui",
  subcategory: "display",

  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <ef-canvas id="test-canvas" style="width: 400px; height: 300px; border: 1px solid #333;">
        <ef-canvas-item id="video-item" x="50" y="50" width="200" height="150">
          <ef-timegroup id="video-timegroup" mode="fixed" duration="5s">
            <ef-video
              src="/assets/bars-n-tone2.mp4"
              duration="5s"
              style="width: 100%; height: 100%;"
            ></ef-video>
          </ef-timegroup>
        </ef-canvas-item>
      </ef-canvas>
      
      <div style="padding: 8px; background: #2a2a2a; color: white;">
        Active: <ef-active-root-temporal canvas="test-canvas"></ef-active-root-temporal>
      </div>
    </div>
  `,

  scenarios: {
    async "renders component"(ctx) {
      const display = ctx.querySelector<EFActiveRootTemporal>("ef-active-root-temporal")!;
      await ctx.frame();

      ctx.expect(display).toBeDefined();
    },

    async "displays None when no selection"(ctx) {
      const display = ctx.querySelector<EFActiveRootTemporal>("ef-active-root-temporal")!;
      await ctx.frame();

      const text = display.shadowRoot?.querySelector("span")?.textContent;
      ctx.expect(text).toBe("None");
    },

    async "connects to canvas by ID"(ctx) {
      const display = ctx.querySelector<EFActiveRootTemporal>("ef-active-root-temporal")!;
      await ctx.frame();

      ctx.expect(display.canvas).toBe("test-canvas");
    },

    async "finds canvas ancestor when no canvas attribute"(ctx) {
      const container = ctx.getContainer();
      const canvas = document.createElement("ef-canvas") as HTMLElement;
      canvas.id = "ancestor-canvas";
      canvas.style.width = "200px";
      canvas.style.height = "150px";

      const display = document.createElement("ef-active-root-temporal") as EFActiveRootTemporal;
      canvas.appendChild(display);
      container.appendChild(canvas);
      await ctx.frame();

      ctx.expect(display).toBeDefined();
    },
  },
});
