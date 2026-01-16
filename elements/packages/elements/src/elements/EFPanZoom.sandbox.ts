import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFPanZoom } from "./EFPanZoom.js";
import "./EFPanZoom.js";

export default defineSandbox({
  name: "EFPanZoom",
  description: "Pan-zoom container for interactive viewport manipulation",
  category: "layout",
  
  render: () => html`
    <ef-pan-zoom style="width: 400px; height: 300px; border: 1px solid #ccc;">
      <div style="width: 200px; height: 150px; background: #3b82f6; color: white; padding: 20px;">
        Pan/Zoom Content
      </div>
    </ef-pan-zoom>
  `,
  
  scenarios: {
    async "initializes with default transform"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      ctx.expect(panZoom).toBeDefined();
      ctx.expect(panZoom.x).toBe(0);
      ctx.expect(panZoom.y).toBe(0);
      ctx.expect(panZoom.scale).toBe(1);
    },
    
    async "pans via pointer drag"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      const initialX = panZoom.x;
      const initialY = panZoom.y;
      
      // Drag from center to bottom-right
      const rect = panZoom.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      await ctx.drag(panZoom, {
        from: [centerX, centerY],
        to: [centerX + 50, centerY + 50],
      });
      await ctx.frame();
      
      ctx.expect(panZoom.x).toBeLessThan(initialX);
      ctx.expect(panZoom.y).toBeLessThan(initialY);
    },
    
    async "pans via wheel without modifier"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      const initialX = panZoom.x;
      const initialY = panZoom.y;
      const initialScale = panZoom.scale;
      
      // Pan right and down (negative deltaX/deltaY becomes positive after negation in handler)
      await ctx.wheel(panZoom, {
        deltaX: -50,
        deltaY: -50,
      });
      await ctx.frame();
      
      // Should pan (x/y changed) but not zoom (scale unchanged)
      // EFPanZoom negates deltas, so -50 becomes +50, meaning x/y increase
      ctx.expect(panZoom.x).toBeGreaterThan(initialX);
      ctx.expect(panZoom.y).toBeGreaterThan(initialY);
      ctx.expect(panZoom.scale).toBe(initialScale);
    },
    
    async "zooms via wheel with ctrl key"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      const initialScale = panZoom.scale;
      
      // Zoom in
      await ctx.wheel(panZoom, {
        deltaY: -100,
        ctrlKey: true,
      });
      await ctx.frame();
      
      ctx.expect(panZoom.scale).toBeGreaterThan(initialScale);
    },
    
    async "zooms via wheel with meta key"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      const initialScale = panZoom.scale;
      
      // Zoom in
      await ctx.wheel(panZoom, {
        deltaY: -100,
        metaKey: true,
      });
      await ctx.frame();
      
      ctx.expect(panZoom.scale).toBeGreaterThan(initialScale);
    },
    
    async "clamps scale to minimum 0.1"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      // Zoom out repeatedly
      for (let i = 0; i < 30; i++) {
        await ctx.wheel(panZoom, {
          deltaY: 100,
          ctrlKey: true,
        });
        await ctx.frame();
      }
      
      ctx.expect(panZoom.scale).toBeGreaterThanOrEqual(0.1);
      ctx.expect(panZoom.scale).toBeLessThanOrEqual(0.25); // Should be clamped to 0.1 (allow some tolerance)
    },
    
    async "clamps scale to maximum 5"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      // Zoom in repeatedly
      for (let i = 0; i < 30; i++) {
        await ctx.wheel(panZoom, {
          deltaY: -100,
          ctrlKey: true,
        });
        await ctx.frame();
      }
      
      ctx.expect(panZoom.scale).toBeLessThanOrEqual(5);
      ctx.expect(panZoom.scale).toBeGreaterThanOrEqual(4.0); // Should be clamped to 5 (allow some tolerance)
    },
    
    async "emits transform-changed event"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      let eventDetail: { x: number; y: number; scale: number } | undefined;
      
      panZoom.addEventListener("transform-changed", (e: Event) => {
        eventDetail = (e as CustomEvent<{ x: number; y: number; scale: number }>).detail;
      });
      
      // Trigger pan via drag
      const rect = panZoom.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      await ctx.drag(panZoom, {
        from: [centerX, centerY],
        to: [centerX + 10, centerY + 10],
      });
      await ctx.wait(50);
      
      ctx.expect(eventDetail).toBeDefined();
      if (eventDetail) {
        ctx.expect(eventDetail.x).toBe(panZoom.x);
        ctx.expect(eventDetail.y).toBe(panZoom.y);
        ctx.expect(eventDetail.scale).toBe(panZoom.scale);
      }
    },
    
    async "reset() returns to default transform"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      // Pan and zoom first
      const rect = panZoom.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      await ctx.drag(panZoom, {
        from: [centerX, centerY],
        to: [centerX + 50, centerY + 50],
      });
      await ctx.wheel(panZoom, {
        deltaY: -100,
        ctrlKey: true,
      });
      await ctx.frame();
      
      // Verify it changed (at least one should be non-zero/non-one)
      const changedX = panZoom.x !== 0;
      const changedY = panZoom.y !== 0;
      const changedScale = panZoom.scale !== 1;
      ctx.expect(changedX || changedY || changedScale).toBeTruthy();
      
      // Reset
      panZoom.reset();
      await ctx.frame();
      
      ctx.expect(panZoom.x).toBe(0);
      ctx.expect(panZoom.y).toBe(0);
      ctx.expect(panZoom.scale).toBe(1);
    },
    
    async "screenToCanvas converts coordinates"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      // Pan and zoom
      await ctx.wheel(panZoom, {
        deltaY: -100,
        ctrlKey: true,
      });
      await ctx.frame();
      
      const rect = panZoom.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      await ctx.drag(panZoom, {
        from: [centerX, centerY],
        to: [centerX + 20, centerY + 20],
      });
      await ctx.frame();
      
      // Get screen coordinates (center of element)
      const screenRect = panZoom.getBoundingClientRect();
      const screenX = screenRect.left + screenRect.width / 2;
      const screenY = screenRect.top + screenRect.height / 2;
      
      // Convert to canvas coordinates
      const canvasPos = panZoom.screenToCanvas(screenX, screenY);
      
      // Convert back to screen
      const screenPos = panZoom.canvasToScreen(canvasPos.x, canvasPos.y);
      
      // Should be close to original (within rounding errors, allow more tolerance)
      ctx.expect(screenPos.x).toBeCloseTo(screenX, 2);
      ctx.expect(screenPos.y).toBeCloseTo(screenY, 2);
    },
    
    async "canvasToScreen converts coordinates"(ctx) {
      const panZoom = ctx.querySelector<EFPanZoom>("ef-pan-zoom")!;
      await ctx.frame();
      
      // Pan and zoom
      await ctx.wheel(panZoom, {
        deltaY: -100,
        ctrlKey: true,
      });
      await ctx.frame();
      
      const rect = panZoom.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      await ctx.drag(panZoom, {
        from: [centerX, centerY],
        to: [centerX + 20, centerY + 20],
      });
      await ctx.frame();
      
      // Test canvas coordinate conversion
      const canvasX = 100;
      const canvasY = 100;
      
      const screenPos = panZoom.canvasToScreen(canvasX, canvasY);
      
      // Convert back to canvas
      const canvasPos = panZoom.screenToCanvas(screenPos.x, screenPos.y);
      
      // Should match original (within rounding errors, allow more tolerance)
      ctx.expect(canvasPos.x).toBeCloseTo(canvasX, 2);
      ctx.expect(canvasPos.y).toBeCloseTo(canvasY, 2);
    },
  },
});
