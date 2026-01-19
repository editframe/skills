import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFWorkbench } from "./EFWorkbench.js";
import "./EFWorkbench.js";
import "./EFConfiguration.js";
import "./hierarchy/EFHierarchy.js";
import "./timeline/EFTimeline.js";
import "../elements/EFPanZoom.js";
import "../canvas/EFCanvas.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFWorkbench",
  description: "Complete editing workbench with preview, hierarchy, timeline, and canvas",
  category: "demos",
  subcategory: "workbench",
  
  render: () => html`
    <ef-configuration style="width: 1200px; height: 800px; border: 1px solid #ccc;">
      <ef-workbench>
        <ef-hierarchy
          slot="hierarchy"
          target="workbench-canvas"
          show-header
          header="LAYERS"
        ></ef-hierarchy>
        
        <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
          <ef-canvas id="workbench-canvas" style="width: 100%; height: 100%;">
            <ef-timegroup
              id="demo-timegroup"
              mode="fixed"
              duration="5s"
              style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 400px; height: 300px;"
            >
              <ef-video
                src="/assets/bars-n-tone2.mp4"
                duration="5s"
                style="width: 100%; height: 100%;"
              ></ef-video>
            </ef-timegroup>
          </ef-canvas>
        </ef-pan-zoom>
        
        <ef-timeline slot="timeline"></ef-timeline>
      </ef-workbench>
    </ef-configuration>
  `,
  
  scenarios: {
    async "renders workbench container"(ctx) {
      const workbench = ctx.querySelector<EFWorkbench>("ef-workbench")!;
      
      await ctx.frame();
      
      ctx.expect(workbench).toBeDefined();
    },
    
    async "renders hierarchy panel"(ctx) {
      const hierarchy = ctx.querySelector("ef-hierarchy")!;
      
      await ctx.frame();
      
      ctx.expect(hierarchy).toBeDefined();
      ctx.expect(hierarchy.getAttribute("slot")).toBe("hierarchy");
    },
    
    async "renders canvas area"(ctx) {
      const canvas = ctx.querySelector("ef-canvas")!;
      
      await ctx.frame();
      
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvas.id).toBe("workbench-canvas");
    },
    
    async "renders timeline"(ctx) {
      const timeline = ctx.querySelector("ef-timeline")!;
      
      await ctx.frame();
      
      ctx.expect(timeline).toBeDefined();
      ctx.expect(timeline.getAttribute("slot")).toBe("timeline");
    },
    
    async "integrates preview with controls"(ctx) {
      const workbench = ctx.querySelector<EFWorkbench>("ef-workbench")!;
      
      await ctx.frame();
      
      // Check that previewSettings context is provided
      const previewSettings = (workbench as any).previewSettings;
      ctx.expect(previewSettings).toBeDefined();
    },
    
    async "manages render mode"(ctx) {
      const workbench = ctx.querySelector<EFWorkbench>("ef-workbench")!;
      
      await ctx.frame();
      
      const renderMode = (workbench as any).renderMode;
      ctx.expect(renderMode).toBeDefined();
      // renderMode should be "foreignObject" or "native" based on the implementation
      ctx.expect(typeof renderMode).toBe("string");
    },
  },
});
