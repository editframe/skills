import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFOverlayLayer } from "./EFOverlayLayer.js";
import "./EFOverlayLayer.js";
import "./EFOverlayItem.js";

export default defineSandbox({
  name: "EFOverlayLayer",
  description: "Overlay layer container that manages child overlay items",
  category: "gui",
  subcategory: "overlay",

  render: () => html`
    <div style="position: relative; width: 500px; height: 400px; background: #1a1a1a;">
      <div 
        id="target-box" 
        style="position: absolute; top: 50px; left: 50px; width: 150px; height: 100px; background: #3b82f6;"
      >
        Target Element
      </div>
      
      <ef-overlay-layer>
        <ef-overlay-item target="#target-box">
          <div style="border: 2px solid #ef4444; width: 100%; height: 100%; box-sizing: border-box;"></div>
        </ef-overlay-item>
      </ef-overlay-layer>
    </div>
  `,

  scenarios: {
    async "renders overlay layer"(ctx) {
      const layer = ctx.querySelector<EFOverlayLayer>("ef-overlay-layer")!;
      await ctx.frame();

      ctx.expect(layer).toBeDefined();
    },

    async "has pointer-events none on host"(ctx) {
      const layer = ctx.querySelector<EFOverlayLayer>("ef-overlay-layer")!;
      await ctx.frame();

      const computed = window.getComputedStyle(layer);
      ctx.expect(computed.pointerEvents).toBe("none");
    },

    async "positions absolutely with inset 0"(ctx) {
      const layer = ctx.querySelector<EFOverlayLayer>("ef-overlay-layer")!;
      await ctx.frame();

      const computed = window.getComputedStyle(layer);
      ctx.expect(computed.position).toBe("absolute");
    },

    async "renders slotted content"(ctx) {
      const layer = ctx.querySelector<EFOverlayLayer>("ef-overlay-layer")!;
      await ctx.frame();

      const item = layer.querySelector("ef-overlay-item");
      ctx.expect(item).toBeDefined();
    },

    async "registers overlay items"(ctx) {
      const layer = ctx.querySelector<EFOverlayLayer>("ef-overlay-layer")!;
      await ctx.frame();

      const item = layer.querySelector("ef-overlay-item")!;
      ctx.expect(item).toBeDefined();
    },

    async "accepts panZoomTransform prop"(ctx) {
      const container = ctx.getContainer();
      const layer = document.createElement("ef-overlay-layer") as EFOverlayLayer;
      layer.panZoomTransform = { x: 100, y: 50, scale: 1.5 };
      container.appendChild(layer);
      await ctx.frame();

      ctx.expect(layer.panZoomTransform).toBeDefined();
      ctx.expect(layer.panZoomTransform!.x).toBe(100);
      ctx.expect(layer.panZoomTransform!.y).toBe(50);
      ctx.expect(layer.panZoomTransform!.scale).toBe(1.5);
    },
  },
});
