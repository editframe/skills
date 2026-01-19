import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFCanvas } from "./EFCanvas.js";
import "./EFCanvas.js";
import "../elements/EFPanZoom.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "../elements/EFImage.js";

export default defineSandbox({
  name: "EFCanvas",
  description: "Canvas container with selection support and coordinate transforms",
  category: "gui",
  subcategory: "canvas",
  
  render: () => html`
    <ef-pan-zoom style="width: 800px; height: 600px; border: 1px solid #ccc;">
      <ef-canvas
        id="test-canvas"
        enable-transform-handles
        data-element-id-attribute="data-id"
      >
        <ef-timegroup
          data-id="timegroup-1"
          mode="fixed"
          duration="5s"
          style="position: absolute; left: 100px; top: 100px; width: 200px; height: 150px; border: 2px solid blue;"
        >
          <ef-video
            src="/assets/bars-n-tone2.mp4"
            duration="5s"
            style="width: 100%; height: 100%;"
          ></ef-video>
        </ef-timegroup>
        
        <ef-image
          data-id="image-1"
          src="/assets/editframe.png"
          style="position: absolute; left: 350px; top: 100px; width: 150px; height: 150px; border: 2px solid green;"
        ></ef-image>
      </ef-canvas>
    </ef-pan-zoom>
  `,
  
  scenarios: {
    async "renders canvas container"(ctx) {
      const canvas = ctx.querySelector<EFCanvas>("ef-canvas")!;
      
      await ctx.frame();
      
      ctx.expect(canvas).toBeDefined();
    },
    
    async "registers elements in canvas"(ctx) {
      const canvas = ctx.querySelector<EFCanvas>("ef-canvas")!;
      
      await ctx.frame();
      
      const timegroup = ctx.querySelector("ef-timegroup")!;
      const image = ctx.querySelector("ef-image")!;
      
      ctx.expect(timegroup).toBeDefined();
      ctx.expect(image).toBeDefined();
    },
    
    async "supports selection"(ctx) {
      const canvas = ctx.querySelector<EFCanvas>("ef-canvas")!;
      
      await ctx.frame();
      
      const selectionController = (canvas as any).selectionController;
      ctx.expect(selectionController).toBeDefined();
      
      // SelectionController provides selectionContext with selectedIds (a Set)
      const selectionContext = selectionController.selectionContext;
      ctx.expect(selectionContext).toBeDefined();
      ctx.expect(selectionContext.selectedIds instanceof Set).toBe(true);
    },
    
    async "has coordinate transform support"(ctx) {
      const canvas = ctx.querySelector<EFCanvas>("ef-canvas")!;
      
      await ctx.frame();
      
      ctx.expect(canvas.panZoomTransform).toBeDefined();
    },
    
    async "can enable/disable transform handles"(ctx) {
      const canvas = ctx.querySelector<EFCanvas>("ef-canvas")!;
      
      await ctx.frame();
      
      ctx.expect(canvas.enableTransformHandles).toBe(true);
      
      canvas.enableTransformHandles = false;
      await ctx.frame();
      
      ctx.expect(canvas.enableTransformHandles).toBe(false);
    },
    
    async "manages element registry"(ctx) {
      const canvas = ctx.querySelector<EFCanvas>("ef-canvas")!;
      
      await ctx.frame();
      
      const registry = (canvas as any).elementRegistry;
      ctx.expect(registry).toBeDefined();
      ctx.expect(registry instanceof Map).toBe(true);
    },
  },
});
