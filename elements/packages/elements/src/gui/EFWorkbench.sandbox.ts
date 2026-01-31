import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFWorkbench } from "./EFWorkbench.js";
import "./EFWorkbench.js";
import "./EFConfiguration.js";
import "./hierarchy/EFHierarchy.js";
import "./timeline/EFTimeline.js";
import "./EFFilmstrip.js";
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
      <ef-timegroup
        id="demo-timegroup"
        workbench
        mode="fixed"
        duration="5s"
        style="width: 400px; height: 300px;"
      >
        <ef-video
          src="/assets/bars-n-tone2.mp4"
          duration="5s"
          style="width: 100%; height: 100%;"
        ></ef-video>
      </ef-timegroup>
    </ef-configuration>
  `,
  
  scenarios: {
    async "wraps timegroup with workbench"(ctx) {
      const timegroup = ctx.querySelector("ef-timegroup")!;
      
      await ctx.frame();
      await ctx.wait(100); // Wait for wrapWithWorkbench to execute
      
      const workbench = ctx.querySelector<EFWorkbench>("ef-workbench");
      ctx.expect(workbench).toBeDefined();
      ctx.expect(timegroup.closest("ef-workbench")).toBe(workbench);
    },
    
    async "renders hierarchy panel"(ctx) {
      await ctx.frame();
      await ctx.wait(100);
      
      const hierarchy = ctx.querySelector("ef-hierarchy")!;
      
      ctx.expect(hierarchy).toBeDefined();
      ctx.expect(hierarchy.getAttribute("slot")).toBe("hierarchy");
      ctx.expect(hierarchy.getAttribute("target")).toBe("workbench-canvas");
    },
    
    async "renders canvas area"(ctx) {
      await ctx.frame();
      await ctx.wait(100);
      
      const canvas = ctx.querySelector("ef-canvas")!;
      
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvas.id).toBe("workbench-canvas");
    },
    
    async "renders filmstrip with timeline"(ctx) {
      await ctx.frame();
      await ctx.wait(100);
      
      const filmstrip = ctx.querySelector("ef-filmstrip")!;
      const timeline = ctx.querySelector("ef-timeline")!;
      
      ctx.expect(filmstrip).toBeDefined();
      ctx.expect(filmstrip.getAttribute("slot")).toBe("timeline");
      ctx.expect(filmstrip.getAttribute("target")).toBe("demo-timegroup");
      ctx.expect(timeline).toBeDefined();
    },
    
    async "timeline shows thumbnails for root timegroup"(ctx) {
      await ctx.frame();
      await ctx.wait(500); // Wait for timeline to initialize and render tracks
      
      const timeline = ctx.querySelector("ef-timeline")!;
      ctx.expect(timeline).toBeDefined();
      
      // Find the timegroup track row
      const timelineRow = timeline.shadowRoot?.querySelector("ef-timeline-row");
      ctx.expect(timelineRow).toBeDefined();
      
      // Find the timegroup track component
      const timegroupTrack = timelineRow?.shadowRoot?.querySelector("ef-timegroup-track");
      ctx.expect(timegroupTrack).toBeDefined();
      
      // Check that show-filmstrip is set (should be true for root timegroups)
      const hasShowFilmstrip = timegroupTrack?.hasAttribute("show-filmstrip");
      ctx.expect(hasShowFilmstrip).toBe(true);
      // Thumbnail strip removed - will be redesigned
    },
    
    async "integrates preview with controls"(ctx) {
      await ctx.frame();
      await ctx.wait(100);
      
      const workbench = ctx.querySelector<EFWorkbench>("ef-workbench")!;
      
      // Check that previewSettings context is provided
      const previewSettings = (workbench as any).previewSettings;
      ctx.expect(previewSettings).toBeDefined();
    },
    
    async "manages render mode"(ctx) {
      await ctx.frame();
      await ctx.wait(100);
      
      const workbench = ctx.querySelector<EFWorkbench>("ef-workbench")!;
      
      const renderMode = (workbench as any).renderMode;
      ctx.expect(renderMode).toBeDefined();
      // renderMode should be "foreignObject" or "native" based on the implementation
      ctx.expect(typeof renderMode).toBe("string");
    },
  },
});
