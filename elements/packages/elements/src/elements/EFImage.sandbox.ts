import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFImage } from "./EFImage.js";
import "./EFImage.js";
import "./EFTimegroup.js";

export default defineSandbox({
  name: "EFImage",
  description: "Image display element with canvas-based rendering for API assets",
  category: "elements",
  subcategory: "media",
  
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
      
      await ctx.frame();
      
      ctx.expect(image).toBeDefined();
    },
    
    async "loads image from source"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      await ctx.frame();
      
      ctx.expect(image.src).toBe("/assets/editframe.png");
      
      const imgElement = image.imageRef.value;
      if (imgElement) {
        ctx.expect(imgElement.src).toContain("editframe.png");
      }
    },
    
    async "supports direct URL sources"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      await ctx.frame();
      
      // Use local asset URL instead of external URL
      image.src = "/assets/editframe.png";
      await ctx.frame();
      
      ctx.expect(image.src).toBe("/assets/editframe.png");
    },
    
    async "has temporal properties"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      await ctx.frame();
      
      ctx.expect(typeof image.durationMs).toBe("number");
      ctx.expect(image.durationMs).toBeGreaterThanOrEqual(0);
    },
    
    async "can change source"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      await ctx.frame();
      
      const originalSrc = image.src;
      image.src = "/assets/bonnifield-logo.png";
      await ctx.frame();
      
      ctx.expect(image.src).toBe("/assets/bonnifield-logo.png");
      ctx.expect(image.src !== originalSrc).toBe(true);
    },
    
    async "renders SVG images with viewBox"(ctx) {
      const image = ctx.querySelector<EFImage>("ef-image")!;
      
      // Create an SVG with only viewBox (no width/height attributes)
      const svgContent = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#3b82f6" /><text x="50" y="55" text-anchor="middle" fill="white" font-size="20">SVG</text></svg>';
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      
      image.src = url;
      await ctx.frame();
      
      // Wait for image to load
      await image.loadImage();
      
      const canvas = image.canvasRef.value;
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvas!.width).toBeGreaterThan(0);
      ctx.expect(canvas!.height).toBeGreaterThan(0);
      
      // Verify canvas has content (not blank)
      const canvasCtx = canvas!.getContext("2d");
      const imageData = canvasCtx!.getImageData(0, 0, canvas!.width, canvas!.height);
      const hasNonZeroPixels = imageData.data.some(byte => byte !== 0);
      ctx.expect(hasNonZeroPixels).toBe(true);
      
      URL.revokeObjectURL(url);
    },
  },
});
