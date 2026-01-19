import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFScrubber } from "./EFScrubber.js";
import "./EFScrubber.js";
import "./EFPreview.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

export default defineSandbox({
  name: "EFScrubber",
  description: "Timeline scrubber control for seeking and displaying progress",
  category: "gui",
  subcategory: "controls",
  
  render: () => html`
    <ef-preview id="scrubber-preview">
      <ef-timegroup mode="fixed" duration="10s" style="width: 600px; height: 300px;">
        <ef-video
          src="/assets/bars-n-tone2.mp4"
          duration="10s"
          style="width: 100%; height: 100%;"
        ></ef-video>
      </ef-timegroup>
    </ef-preview>
    
    <ef-scrubber target="scrubber-preview" style="width: 600px; margin: 20px;"></ef-scrubber>
  `,
  
  scenarios: {
    async "renders scrubber component"(ctx) {
      const scrubber = ctx.querySelector<EFScrubber>("ef-scrubber")!;
      
      await ctx.frame();
      
      ctx.expect(scrubber).toBeDefined();
    },
    
    async "displays progress bar"(ctx) {
      const scrubber = ctx.querySelector<EFScrubber>("ef-scrubber")!;
      
      await ctx.frame();
      
      const progressBar = scrubber.shadowRoot?.querySelector(".progress");
      ctx.expect(progressBar).toBeDefined();
    },
    
    async "updates progress based on current time"(ctx) {
      const preview = ctx.querySelector("ef-preview")!;
      
      await ctx.frame();
      
      (preview as any).currentTimeMs = 5000;
      await ctx.frame();
      
      ctx.expect((preview as any).currentTimeMs).toBe(5000);
    },
    
    async "allows seeking by clicking"(ctx) {
      const scrubber = ctx.querySelector<EFScrubber>("ef-scrubber")!;
      
      await ctx.frame();
      
      const scrubberElement = scrubber.shadowRoot?.querySelector(".scrubber");
      ctx.expect(scrubberElement).toBeDefined();
    },
    
    async "supports vertical orientation"(ctx) {
      const container = ctx.getContainer();
      const scrubber = document.createElement("ef-scrubber") as EFScrubber;
      scrubber.setAttribute("orientation", "vertical");
      scrubber.style.width = "100px";
      scrubber.style.height = "400px";
      container.appendChild(scrubber);
      
      await ctx.frame();
      
      ctx.expect(scrubber.getAttribute("orientation")).toBe("vertical");
    },
    
    async "has zoom scale support"(ctx) {
      const scrubber = ctx.querySelector<EFScrubber>("ef-scrubber")!;
      
      await ctx.frame();
      
      scrubber.zoomScale = 2;
      await ctx.frame();
      
      ctx.expect(scrubber.zoomScale).toBe(2);
    },
  },
});
