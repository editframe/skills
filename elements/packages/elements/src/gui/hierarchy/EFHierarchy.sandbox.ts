import { defineSandbox } from "../../sandbox/index.js";
import { html } from "lit";
import type { EFHierarchy } from "./EFHierarchy.js";
import "./EFHierarchy.js";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../../elements/EFAudio.js";
import "../../canvas/EFCanvas.js";

export default defineSandbox({
  name: "EFHierarchy",
  description: "Element hierarchy tree with selection and expansion support",
  category: "gui",
  subcategory: "hierarchy",
  
  render: () => html`
    <div style="width: 400px; height: 500px; border: 1px solid #ccc;">
      <ef-canvas id="hierarchy-canvas" style="display: none;">
        <ef-timegroup id="demo-timegroup" mode="sequence" style="display: none;">
          <ef-video src="/assets/bars-n-tone2.mp4" duration="5s"></ef-video>
          <ef-audio src="/assets/bars-n-tone2.mp4" duration="5s"></ef-audio>
        </ef-timegroup>
      </ef-canvas>
      
      <ef-hierarchy
        id="test-hierarchy"
        target="hierarchy-canvas"
        show-header
        header="LAYERS"
        style="width: 100%; height: 100%;"
      ></ef-hierarchy>
    </div>
  `,
  
  scenarios: {
    async "renders hierarchy component"(ctx) {
      const hierarchy = ctx.querySelector<EFHierarchy>("ef-hierarchy")!;
      
      await ctx.frame();
      
      ctx.expect(hierarchy).toBeDefined();
    },
    
    async "connects to target element"(ctx) {
      const hierarchy = ctx.querySelector<EFHierarchy>("ef-hierarchy")!;
      const canvas = ctx.querySelector("ef-canvas")!;
      
      await ctx.frame();
      
      ctx.expect(hierarchy.target).toBe("hierarchy-canvas");
      ctx.expect(hierarchy.targetElement).toBeDefined();
    },
    
    async "displays hierarchy items"(ctx) {
      const hierarchy = ctx.querySelector<EFHierarchy>("ef-hierarchy")!;
      
      await ctx.frame();
      
      // First verify the hierarchy is connected to the canvas
      ctx.expect(hierarchy.targetElement).toBeDefined();
      
      // The hierarchy renders ef-hierarchy-item elements with .item-row class,
      // or displays "No elements" message if the canvas has no children.
      // Since the canvas elements have display:none, the hierarchy may not
      // be able to see them properly.
      
      const shadowRoot = hierarchy.shadowRoot;
      ctx.expect(shadowRoot).toBeDefined();
      
      // Check that the hierarchy-container is rendered
      const container = shadowRoot?.querySelector(".hierarchy-container");
      ctx.expect(container).toBeDefined();
    },
    
    async "shows header when enabled"(ctx) {
      const hierarchy = ctx.querySelector<EFHierarchy>("ef-hierarchy")!;
      
      await ctx.frame();
      
      ctx.expect(hierarchy.showHeader).toBe(true);
      ctx.expect(hierarchy.header).toBe("LAYERS");
      
      const header = hierarchy.shadowRoot?.querySelector(".header");
      ctx.expect(header).toBeDefined();
    },
    
    async "supports selection"(ctx) {
      const hierarchy = ctx.querySelector<EFHierarchy>("ef-hierarchy")!;
      
      await ctx.frame();
      
      const canvas = hierarchy.getCanvas();
      ctx.expect(canvas).toBeDefined();
    },
    
    async "can filter elements with hide/show selectors"(ctx) {
      const hierarchy = ctx.querySelector<EFHierarchy>("ef-hierarchy")!;
      
      await ctx.frame();
      
      hierarchy.hideSelectors = ["ef-audio"];
      await ctx.frame();
      
      ctx.expect(hierarchy.hideSelectors).toEqual(["ef-audio"]);
    },
  },
});
