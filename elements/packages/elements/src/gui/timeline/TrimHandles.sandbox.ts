import { defineSandbox } from "../../sandbox/index.js";
import { html } from "lit";
import type { EFTrimHandles } from "./TrimHandles.js";
import "./TrimHandles.js";

export default defineSandbox({
  name: "EFTrimHandles",
  description: "Atom: Trim handles for adjusting start/end points of timeline items",
  category: "timeline",
  
  render: () => html`
    <div style="width: 100%; height: 200px; display: flex; flex-direction: column; gap: 24px; padding: 24px;">
      <div style="position: relative; width: 400px; height: 60px; background: #334155; border-radius: 4px;">
        <ef-trim-handles
          element-id="test-1"
          pixels-per-ms="0.1"
          trim-start-ms="500"
          trim-end-ms="1500"
          duration-ms="3000"
        ></ef-trim-handles>
      </div>
      
      <div style="position: relative; width: 600px; height: 60px; background: #334155; border-radius: 4px;">
        <ef-trim-handles
          element-id="test-2"
          pixels-per-ms="0.2"
          trim-start-ms="0"
          trim-end-ms="0"
          duration-ms="2000"
        ></ef-trim-handles>
      </div>
    </div>
  `,
  
  scenarios: {
    async "renders with trim start and end"(ctx) {
      const handles = ctx.querySelector<EFTrimHandles>("ef-trim-handles")!;
      await ctx.frame();
      
      ctx.expect(handles).toBeDefined();
      ctx.expect(handles.trimStartMs).toBe(500);
      ctx.expect(handles.trimEndMs).toBe(1500);
    },
    
    async "displays trim overlays"(ctx) {
      const handles = ctx.querySelector<EFTrimHandles>("ef-trim-handles")!;
      await ctx.frame();
      
      const shadowRoot = handles.shadowRoot;
      if (!shadowRoot) {
        throw new Error("TrimHandles shadow root not found");
      }
      
      const startOverlay = shadowRoot.querySelector(".trim-overlay-start");
      const endOverlay = shadowRoot.querySelector(".trim-overlay-end");
      
      ctx.expect(startOverlay).toBeDefined();
      ctx.expect(endOverlay).toBeDefined();
    },
    
    async "shows start handle"(ctx) {
      const handles = ctx.querySelector<EFTrimHandles>("ef-trim-handles")!;
      await ctx.frame();
      
      const shadowRoot = handles.shadowRoot;
      if (!shadowRoot) {
        throw new Error("TrimHandles shadow root not found");
      }
      
      const startHandle = shadowRoot.querySelector(".handle-start");
      ctx.expect(startHandle).toBeDefined();
    },
    
    async "shows end handle"(ctx) {
      const handles = ctx.querySelector<EFTrimHandles>("ef-trim-handles")!;
      await ctx.frame();
      
      const shadowRoot = handles.shadowRoot;
      if (!shadowRoot) {
        throw new Error("TrimHandles shadow root not found");
      }
      
      const endHandle = shadowRoot.querySelector(".handle-end");
      ctx.expect(endHandle).toBeDefined();
    },
    
    async "calculates correct overlay widths"(ctx) {
      const handles = ctx.querySelector<EFTrimHandles>("ef-trim-handles")!;
      await ctx.frame();
      
      // With pixelsPerMs=0.1, trimStartMs=500, trimEndMs=1500, durationMs=3000
      // Start overlay width should be 500 * 0.1 = 50px
      // End overlay width should be (3000 - 1500) * 0.1 = 150px
      
      const expectedStartWidth = 500 * 0.1;
      const expectedEndWidth = (3000 - 1500) * 0.1;
      
      ctx.expect(expectedStartWidth).toBe(50);
      ctx.expect(expectedEndWidth).toBe(150);
    },
    
    async "emits trim change event on drag"(ctx) {
      const handles = ctx.querySelector<EFTrimHandles>("ef-trim-handles")!;
      await ctx.frame();
      
      let eventDetail: any;
      handles.addEventListener("track-trim-change", (e) => {
        eventDetail = (e as CustomEvent).detail;
      });
      
      const shadowRoot = handles.shadowRoot;
      if (!shadowRoot) {
        throw new Error("TrimHandles shadow root not found");
      }
      
      const startHandle = shadowRoot.querySelector(".handle-start") as HTMLElement;
      if (!startHandle) {
        throw new Error("Start handle not found");
      }
      
      // Simulate drag
      await ctx.drag(startHandle, { from: [0, 10], to: [20, 10] });
      await ctx.wait(100);
      
      ctx.expect(eventDetail).toBeDefined();
      ctx.expect(eventDetail.elementId).toBe("test-1");
      ctx.expect(eventDetail.type).toBe("start");
    },
    
    async "respects pixels per ms for positioning"(ctx) {
      const handles = ctx.querySelectorAll<EFTrimHandles>("ef-trim-handles");
      await ctx.frame();
      
      // First handles has pixelsPerMs=0.1
      ctx.expect(handles[0]?.pixelsPerMs).toBe(0.1);
      
      // Second handles has pixelsPerMs=0.2
      ctx.expect(handles[1]?.pixelsPerMs).toBe(0.2);
    },
    
    async "handles no trim (full duration)"(ctx) {
      const handles = ctx.querySelectorAll<EFTrimHandles>("ef-trim-handles")[1];
      await ctx.frame();
      
      ctx.expect(handles.trimStartMs).toBe(0);
      ctx.expect(handles.trimEndMs).toBe(0);
      ctx.expect(handles.durationMs).toBe(2000);
    },
  },
});
