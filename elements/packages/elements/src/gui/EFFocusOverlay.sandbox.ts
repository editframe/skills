import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFFocusOverlay } from "./EFFocusOverlay.js";
import "./EFFocusOverlay.js";

export default defineSandbox({
  name: "EFFocusOverlay",
  description: "Overlay that highlights the currently focused element",
  category: "gui",
  subcategory: "overlay",

  render: () => html`
    <div style="position: relative; width: 400px; height: 300px; background: #1a1a1a;">
      <div 
        id="target-element" 
        style="position: absolute; top: 50px; left: 50px; width: 100px; height: 80px; background: #3b82f6;"
      >
        Target
      </div>
      <ef-focus-overlay></ef-focus-overlay>
    </div>
  `,

  scenarios: {
    async "renders overlay component"(ctx) {
      const overlay = ctx.querySelector<EFFocusOverlay>("ef-focus-overlay")!;
      await ctx.frame();

      ctx.expect(overlay).toBeDefined();
    },

    async "has pointer-events none on host"(ctx) {
      const overlay = ctx.querySelector<EFFocusOverlay>("ef-focus-overlay")!;
      await ctx.frame();

      const computed = window.getComputedStyle(overlay);
      ctx.expect(computed.pointerEvents).toBe("none");
    },

    async "renders overlay div in shadow DOM"(ctx) {
      const overlay = ctx.querySelector<EFFocusOverlay>("ef-focus-overlay")!;
      await ctx.frame();

      const overlayDiv = overlay.shadowRoot?.querySelector(".overlay");
      ctx.expect(overlayDiv).toBeDefined();
    },

    async "overlay hidden when no focused element"(ctx) {
      const overlay = ctx.querySelector<EFFocusOverlay>("ef-focus-overlay")!;
      await ctx.frame();

      const overlayDiv = overlay.shadowRoot?.querySelector(".overlay") as HTMLElement;
      ctx.expect(overlayDiv.style.display).toBe("none");
    },
  },
});
