import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFImage } from "./EFImage.js";
import "./EFImage.js";
import "./EFTimegroup.js";

export default defineSandbox({
  name: "EFImage",
  description: "Image display element with canvas-based rendering for API assets",
  category: "media",
  
  render: () => html`
    <ef-timegroup mode="fixed" duration="2s" style="width: 400px; height: 300px; border: 1px solid #ccc;">
      <ef-image
        id="test-image"
        src="/assets/editframe.png"
        style="width: 200px; height: 200px;"
      ></ef-image>
    </ef-timegroup>
  `,
  
  scenarios: {
    async "renders image element"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(image).toBeDefined();
    },
    
    async "loads image from source"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      await ctx.wait(200);
      await ctx.frame();
      
      ctx.expect(image.src).toBe("/assets/editframe.png");
      
      const imgElement = image.imageRef.value;
      if (imgElement) {
        ctx.expect(imgElement.src).toContain("editframe.png");
      }
    },
    
    async "supports direct URL sources"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      image.src = "https://example.com/image.png";
      await ctx.frame();
      
      ctx.expect(image.src).toBe("https://example.com/image.png");
    },
    
    async "has temporal properties"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(typeof image.durationMs).toBe("number");
      ctx.expect(image.durationMs).toBeGreaterThanOrEqual(0);
    },
    
    async "can change source"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const originalSrc = image.src;
      image.src = "/assets/bonnifield-logo.png";
      await ctx.frame();
      await ctx.wait(100);
      
      ctx.expect(image.src).toBe("/assets/bonnifield-logo.png");
      ctx.expect(image.src).not.toBe(originalSrc);
    },
  },
});
