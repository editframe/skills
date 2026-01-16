import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFCanvasItem } from "./EFCanvasItem.js";
import "./EFCanvasItem.js";
import "./EFCanvas.js";
import "../gui/EFPanZoom.js";

export default defineSandbox({
  name: "EFCanvasItem",
  description: "Canvas item wrapper (deprecated - use plain HTML elements instead)",
  category: "layout",
  
  render: () => html`
    <ef-pan-zoom style="width: 600px; height: 400px; border: 1px solid #ccc;">
      <ef-canvas id="canvas-item-canvas" style="width: 100%; height: 100%;">
        <ef-canvas-item
          id="test-canvas-item"
          style="left: 100px; top: 100px; width: 200px; height: 150px; background: rgba(59, 130, 246, 0.3); border: 2px solid #3b82f6;"
        >
          <div style="padding: 20px; color: white;">Canvas Item Content</div>
        </ef-canvas-item>
      </ef-canvas>
    </ef-pan-zoom>
  `,
  
  scenarios: {
    async "renders canvas item"(ctx) {
      const item = ctx.querySelector<EFCanvasItem>("ef-canvas-item")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(item).toBeDefined();
    },
    
    async "registers with parent canvas"(ctx) {
      const item = ctx.querySelector<EFCanvasItem>("ef-canvas-item")!;
      const canvas = ctx.querySelector("ef-canvas")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(item.id).toBe("test-canvas-item");
      ctx.expect((item as any).canvas).toBe(canvas);
    },
    
    async "has absolute positioning"(ctx) {
      const item = ctx.querySelector<EFCanvasItem>("ef-canvas-item")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const styles = getComputedStyle(item);
      ctx.expect(styles.position).toBe("absolute");
    },
    
    async "unregisters on disconnect"(ctx) {
      const container = ctx.getContainer();
      const item = document.createElement("ef-canvas-item") as EFCanvasItem;
      item.id = "temp-item";
      item.style.left = "50px";
      item.style.top = "50px";
      item.style.width = "100px";
      item.style.height = "100px";
      item.style.background = "blue";
      
      const canvas = ctx.querySelector("ef-canvas")!;
      canvas.appendChild(item);
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect((item as any).canvas).toBeDefined();
      
      item.remove();
      await ctx.frame();
      
      ctx.expect((item as any).canvas).toBeNull();
    },
  },
});
