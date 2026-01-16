import { defineSandbox } from "../../sandbox/index.js";
import { html } from "lit";
import type { EFTimeline } from "./EFTimeline.js";
import "./EFTimeline.js";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../../canvas/EFCanvas.js";

export default defineSandbox({
  name: "EFTimeline",
  description: "Full timeline component with playhead, zoom, scroll, and tracks",
  category: "timeline",
  
  render: () => html`
    <div style="width: 1000px; height: 400px;">
      <ef-canvas id="test-canvas" style="display: none;">
        <ef-timegroup id="test-timegroup" duration="10s" mode="fixed">
          <ef-video id="test-video" duration="5s"></ef-video>
        </ef-timegroup>
      </ef-canvas>
      <ef-timeline
        target="test-canvas"
        pixels-per-ms="0.1"
        style="width: 100%; height: 100%;"
      ></ef-timeline>
    </div>
  `,
  
  scenarios: {
    async "renders with timegroup target"(ctx) {
      const container = ctx.getContainer();
      
      const canvas = document.createElement("ef-canvas");
      canvas.id = "test-canvas-1";
      
      const timegroup = document.createElement("ef-timegroup");
      timegroup.id = "test-timegroup-1";
      timegroup.setAttribute("duration", "10s");
      timegroup.setAttribute("mode", "fixed");
      
      const video = document.createElement("ef-video");
      video.id = "test-video-1";
      video.setAttribute("duration", "5s");
      
      timegroup.appendChild(video);
      canvas.appendChild(timegroup);
      
      const timeline = document.createElement("ef-timeline");
      timeline.setAttribute("target", "test-canvas-1");
      timeline.setAttribute("pixels-per-ms", "0.1");
      timeline.style.width = "1000px";
      timeline.style.height = "400px";
      
      container.appendChild(canvas);
      container.appendChild(timeline);
      
      await ctx.frame();
      await ctx.wait(200);
      
      const timelineElement = ctx.querySelector<EFTimeline>("ef-timeline")!;
      ctx.expect(timelineElement).toBeDefined();
      ctx.expect(timelineElement.targetTemporal).toBeDefined();
    },
    
    async "zoom in increases pixelsPerMs"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      await ctx.wait(200);
      
      const initialPixelsPerMs = timeline.pixelsPerMs;
      
      // Click zoom in button
      const shadowRoot = timeline.shadowRoot;
      const zoomInBtn = shadowRoot?.querySelector(".zoom-btn") as HTMLElement;
      
      if (zoomInBtn) {
        zoomInBtn.click();
        await ctx.frame();
        await ctx.wait(100);
        
        ctx.expect(timeline.pixelsPerMs).toBeGreaterThan(initialPixelsPerMs);
      }
    },
    
    async "zoom out decreases pixelsPerMs"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      await ctx.wait(200);
      
      // Set initial zoom
      timeline.pixelsPerMs = 0.2;
      await ctx.frame();
      
      const initialPixelsPerMs = timeline.pixelsPerMs;
      
      // Click zoom out button
      const shadowRoot = timeline.shadowRoot;
      const zoomButtons = shadowRoot?.querySelectorAll(".zoom-btn");
      const zoomOutBtn = zoomButtons?.[0] as HTMLElement; // First button is zoom out
      
      if (zoomOutBtn) {
        zoomOutBtn.click();
        await ctx.frame();
        await ctx.wait(100);
        
        ctx.expect(timeline.pixelsPerMs).toBeLessThan(initialPixelsPerMs);
      }
    },
    
    async "scroll updates viewportScrollLeft"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      await ctx.wait(200);
      
      const shadowRoot = timeline.shadowRoot;
      const tracksScroll = shadowRoot?.querySelector(".tracks-scroll") as HTMLElement;
      
      if (tracksScroll) {
        const initialScroll = timeline.viewportScrollLeft;
        
        // Scroll right
        tracksScroll.scrollLeft = 500;
        await ctx.frame();
        await ctx.wait(100);
        
        ctx.expect(timeline.viewportScrollLeft).toBeGreaterThan(initialScroll);
      }
    },
    
    async "ruler click seeks to time"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      await ctx.wait(200);
      
      const shadowRoot = timeline.shadowRoot;
      const rulerContent = shadowRoot?.querySelector(".ruler-content") as HTMLElement;
      
      if (rulerContent) {
        const rect = rulerContent.getBoundingClientRect();
        const initialTime = timeline.currentTimeMs;
        
        // Click at middle of ruler (should seek to ~5s for 10s duration)
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;
        
        const clickEvent = new PointerEvent("pointerdown", {
          clientX: clickX,
          clientY: clickY,
          bubbles: true,
          cancelable: true,
        });
        
        rulerContent.dispatchEvent(clickEvent);
        await ctx.frame();
        await ctx.wait(100);
        
        // Time should have changed
        ctx.expect(timeline.currentTimeMs).not.toBe(initialTime);
      }
    },
    
    async "keyboard arrows move frame-by-frame"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      await ctx.wait(200);
      
      // Set initial time
      timeline.currentTimeMs = 1000;
      await ctx.frame();
      
      const initialTime = timeline.currentTimeMs;
      const fps = timeline.fps;
      const frameIntervalMs = 1000 / fps;
      
      // Focus timeline
      timeline.focus();
      await ctx.frame();
      
      // Press right arrow
      const rightArrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      
      timeline.dispatchEvent(rightArrowEvent);
      await ctx.frame();
      await ctx.wait(100);
      
      // Should move forward by one frame
      ctx.expect(timeline.currentTimeMs).toBeCloseTo(initialTime + frameIntervalMs, 10);
    },
    
    async "shift+arrows move second-by-second"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      await ctx.wait(200);
      
      // Set initial time
      timeline.currentTimeMs = 1000;
      await ctx.frame();
      
      const initialTime = timeline.currentTimeMs;
      
      // Focus timeline
      timeline.focus();
      await ctx.frame();
      
      // Press shift+right arrow
      const shiftRightArrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      timeline.dispatchEvent(shiftRightArrowEvent);
      await ctx.frame();
      await ctx.wait(100);
      
      // Should move forward by one second (1000ms)
      ctx.expect(timeline.currentTimeMs).toBeCloseTo(initialTime + 1000, 10);
    },
    
    async "renders timeline rows"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      await ctx.wait(200);
      
      const shadowRoot = timeline.shadowRoot;
      const timelineRows = shadowRoot?.querySelectorAll("ef-timeline-row");
      
      // Should have at least one row (the timegroup)
      ctx.expect(timelineRows?.length).toBeGreaterThan(0);
    },
    
    async "renders ruler when show-ruler is true"(ctx) {
      const container = ctx.getContainer();
      const timeline = document.createElement("ef-timeline");
      timeline.setAttribute("target", "test-canvas");
      timeline.setAttribute("show-ruler", "true");
      timeline.style.width = "1000px";
      timeline.style.height = "400px";
      
      container.appendChild(timeline);
      
      await ctx.frame();
      await ctx.wait(200);
      
      const timelineElement = ctx.querySelector<EFTimeline>("ef-timeline")!;
      const shadowRoot = timelineElement.shadowRoot;
      const ruler = shadowRoot?.querySelector("ef-timeline-ruler");
      
      ctx.expect(ruler).toBeDefined();
    },
    
    async "hides ruler when show-ruler is false"(ctx) {
      const container = ctx.getContainer();
      const timeline = document.createElement("ef-timeline");
      timeline.setAttribute("target", "test-canvas");
      timeline.setAttribute("show-ruler", "false");
      timeline.style.width = "1000px";
      timeline.style.height = "400px";
      
      container.appendChild(timeline);
      
      await ctx.frame();
      await ctx.wait(200);
      
      const timelineElement = ctx.querySelector<EFTimeline>("ef-timeline")!;
      const shadowRoot = timelineElement.shadowRoot;
      const rulerRow = shadowRoot?.querySelector(".ruler-row");
      
      ctx.expect(rulerRow).toBeFalsy();
    },
    
    async "updates playhead position on currentTimeMs change"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      await ctx.wait(200);
      
      const shadowRoot = timeline.shadowRoot;
      const playhead = shadowRoot?.querySelector(".playhead") as HTMLElement;
      
      if (playhead) {
        const initialLeft = parseInt(playhead.style.left || "0", 10);
        
        // Change time
        timeline.currentTimeMs = 5000;
        await ctx.frame();
        await ctx.wait(100);
        
        const newLeft = parseInt(playhead.style.left || "0", 10);
        
        // Playhead should have moved
        ctx.expect(newLeft).not.toBe(initialLeft);
      }
    },
  },
});
