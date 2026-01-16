import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFResizableBox } from "./EFResizableBox.js";
import "./EFResizableBox.js";

export default defineSandbox({
  name: "EFResizableBox",
  description: "Resizable container with drag and resize handles",
  category: "layout",
  
  render: () => html`
    <div style="width: 600px; height: 400px; border: 1px solid #ccc; position: relative;">
      <ef-resizable-box
        id="test-resizable"
        .bounds=${{ x: 100, y: 100, width: 200, height: 150 }}
        min-size="50"
        style="position: absolute;"
      ></ef-resizable-box>
    </div>
  `,
  
  scenarios: {
    async "renders resizable box"(ctx) {
      const box = ctx.querySelector<EFResizableBox>("ef-resizable-box")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(box).toBeDefined();
    },
    
    async "displays with initial bounds"(ctx) {
      const box = ctx.querySelector<EFResizableBox>("ef-resizable-box")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(box.bounds.x).toBe(100);
      ctx.expect(box.bounds.y).toBe(100);
      ctx.expect(box.bounds.width).toBe(200);
      ctx.expect(box.bounds.height).toBe(150);
    },
    
    async "renders resize handles"(ctx) {
      const box = ctx.querySelector<EFResizableBox>("ef-resizable-box")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const handles = box.shadowRoot?.querySelectorAll(".handle");
      ctx.expect(handles).toBeDefined();
      ctx.expect(handles!.length).toBe(8);
    },
    
    async "respects minimum size"(ctx) {
      const box = ctx.querySelector<EFResizableBox>("ef-resizable-box")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(box.minSize).toBe(50);
      
      box.bounds = { x: 100, y: 100, width: 30, height: 30 };
      await ctx.frame();
      
      ctx.expect(box.bounds.width).toBeGreaterThanOrEqual(50);
      ctx.expect(box.bounds.height).toBeGreaterThanOrEqual(50);
    },
    
    async "can change bounds"(ctx) {
      const box = ctx.querySelector<EFResizableBox>("ef-resizable-box")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      box.bounds = { x: 150, y: 150, width: 250, height: 200 };
      await ctx.frame();
      
      ctx.expect(box.bounds.x).toBe(150);
      ctx.expect(box.bounds.y).toBe(150);
      ctx.expect(box.bounds.width).toBe(250);
      ctx.expect(box.bounds.height).toBe(200);
    },
    
    async "emits bounds-changed event"(ctx) {
      const box = ctx.querySelector<EFResizableBox>("ef-resizable-box")!;
      let emittedBounds: any = null;
      
      box.addEventListener("bounds-changed", (e: any) => {
        emittedBounds = e.detail.bounds;
      });
      
      await ctx.wait(100);
      await ctx.frame();
      
      box.bounds = { x: 200, y: 200, width: 300, height: 250 };
      await ctx.frame();
      
      ctx.expect(emittedBounds).toBeDefined();
    },
  },
});
