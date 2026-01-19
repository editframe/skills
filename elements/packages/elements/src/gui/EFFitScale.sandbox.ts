import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFFitScale } from "./EFFitScale.js";
import "./EFFitScale.js";

export default defineSandbox({
  name: "EFFitScale",
  description: "Scales content to fit within container while preserving aspect ratio",
  category: "gui",
  subcategory: "layout",

  render: () => html`
    <div style="width: 400px; height: 300px; border: 2px solid #3b82f6; background: #1a1a1a;">
      <ef-fit-scale>
        <div 
          style="width: 800px; height: 600px; background: linear-gradient(45deg, #ef4444, #f97316);"
        >
          <span style="color: white; font-size: 24px; padding: 20px; display: block;">
            800x600 Content
          </span>
        </div>
      </ef-fit-scale>
    </div>
  `,

  scenarios: {
    async "renders fit-scale component"(ctx) {
      const fitScale = ctx.querySelector<EFFitScale>("ef-fit-scale")!;
      await ctx.frame();

      ctx.expect(fitScale).toBeDefined();
    },

    async "applies grid layout styles to host"(ctx) {
      const fitScale = ctx.querySelector<EFFitScale>("ef-fit-scale")!;
      await ctx.frame();

      ctx.expect(fitScale.style.display).toBe("grid");
      ctx.expect(fitScale.style.width).toBe("100%");
      ctx.expect(fitScale.style.height).toBe("100%");
    },

    async "generates unique ID"(ctx) {
      const fitScale = ctx.querySelector<EFFitScale>("ef-fit-scale")!;
      await ctx.frame();

      ctx.expect(fitScale.id).toBeDefined();
      ctx.expect(fitScale.id.length).toBeGreaterThan(0);
    },

    async "finds content child element"(ctx) {
      const fitScale = ctx.querySelector<EFFitScale>("ef-fit-scale")!;
      await fitScale.updateComplete;
      await ctx.frame();

      const contentChild = fitScale.contentChild;
      ctx.expect(contentChild).toBeDefined();
    },

    async "calculates scale info"(ctx) {
      const fitScale = ctx.querySelector<EFFitScale>("ef-fit-scale")!;
      await fitScale.updateComplete;
      await ctx.frame();

      const scaleInfo = fitScale.scaleInfo;
      ctx.expect(scaleInfo).toBeDefined();
      ctx.expect(scaleInfo.containerWidth).toBeGreaterThan(0);
      ctx.expect(scaleInfo.containerHeight).toBeGreaterThan(0);
    },

    async "applies transform to content child"(ctx) {
      const fitScale = ctx.querySelector<EFFitScale>("ef-fit-scale")!;
      await fitScale.updateComplete;
      await ctx.frame();

      const contentChild = fitScale.contentChild;
      if (contentChild) {
        ctx.expect(contentChild.style.transform).toContain("translate");
        ctx.expect(contentChild.style.transform).toContain("scale");
      }
    },
  },
});
