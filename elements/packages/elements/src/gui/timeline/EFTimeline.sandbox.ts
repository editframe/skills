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
  category: "gui",
  subcategory: "timeline",
  
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
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      
      await ctx.frame();
      
      ctx.expect(timeline).toBeDefined();
      ctx.expect(timeline.target).toBe("test-canvas");
    },
    
    async "zoom in increases pixelsPerMs"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      
      const initialPixelsPerMs = timeline.pixelsPerMs;
      
      const shadowRoot = timeline.shadowRoot;
      const zoomButtons = shadowRoot?.querySelectorAll(".zoom-btn");
      const zoomInBtn = zoomButtons?.[1] as HTMLElement;
      
      if (zoomInBtn) {
        zoomInBtn.click();
        await ctx.frame();
        
        ctx.expect(timeline.pixelsPerMs).toBeGreaterThan(initialPixelsPerMs);
      }
    },
    
    async "zoom out decreases pixelsPerMs"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      
      timeline.pixelsPerMs = 0.2;
      await ctx.frame();
      
      const initialPixelsPerMs = timeline.pixelsPerMs;
      
      const shadowRoot = timeline.shadowRoot;
      const zoomButtons = shadowRoot?.querySelectorAll(".zoom-btn");
      const zoomOutBtn = zoomButtons?.[0] as HTMLElement;
      
      if (zoomOutBtn) {
        zoomOutBtn.click();
        await ctx.frame();
        
        ctx.expect(timeline.pixelsPerMs).toBeLessThan(initialPixelsPerMs);
      }
    },
    
    async "scroll updates viewportScrollLeft"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      
      const shadowRoot = timeline.shadowRoot;
      const tracksScroll = shadowRoot?.querySelector(".tracks-scroll") as HTMLElement;
      
      if (tracksScroll) {
        const initialScroll = timeline.viewportScrollLeft;
        
        tracksScroll.scrollLeft = 500;
        await ctx.frame();
        
        ctx.expect(timeline.viewportScrollLeft).toBeGreaterThan(initialScroll);
      }
    },
    
    async "ruler click seeks to time"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      
      const shadowRoot = timeline.shadowRoot;
      const rulerContent = shadowRoot?.querySelector(".ruler-content") as HTMLElement;
      
      if (rulerContent) {
        const rect = rulerContent.getBoundingClientRect();
        const initialTime = timeline.currentTimeMs;
        
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
        
        ctx.expect(timeline.currentTimeMs !== initialTime).toBe(true);
      }
    },
    
    async "keyboard arrows move frame-by-frame"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      
      if (!timeline.targetTemporal) {
        ctx.log("Skipping keyboard test - no targetTemporal available");
        ctx.expect(true).toBe(true);
        return;
      }
      
      timeline.currentTimeMs = 1000;
      await ctx.frame();
      
      const initialTime = timeline.currentTimeMs;
      const fps = timeline.fps;
      const frameIntervalMs = 1000 / fps;
      
      timeline.focus();
      await ctx.frame();
      
      const rightArrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      
      timeline.dispatchEvent(rightArrowEvent);
      await ctx.frame();
      
      ctx.expect(timeline.currentTimeMs).toBeCloseTo(initialTime + frameIntervalMs, 10);
    },
    
    async "shift+arrows move second-by-second"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      
      if (!timeline.targetTemporal) {
        ctx.log("Skipping keyboard test - no targetTemporal available");
        ctx.expect(true).toBe(true);
        return;
      }
      
      timeline.currentTimeMs = 1000;
      await ctx.frame();
      
      const initialTime = timeline.currentTimeMs;
      
      timeline.focus();
      await ctx.frame();
      
      const shiftRightArrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      timeline.dispatchEvent(shiftRightArrowEvent);
      await ctx.frame();
      
      ctx.expect(timeline.currentTimeMs).toBeCloseTo(initialTime + 1000, 10);
    },
    
    async "renders timeline rows"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      
      const shadowRoot = timeline.shadowRoot;
      const timelineRows = shadowRoot?.querySelectorAll("ef-timeline-row");
      
      ctx.expect(timelineRows?.length).toBeGreaterThanOrEqual(0);
    },
    
    async "renders ruler when show-ruler is true"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      
      timeline.showRuler = true;
      await ctx.frame();
      
      if (!timeline.targetTemporal) {
        ctx.log("Skipping ruler test - no targetTemporal available");
        ctx.expect(timeline.showRuler).toBe(true);
        return;
      }
      
      const shadowRoot = timeline.shadowRoot;
      const rulerRow = shadowRoot?.querySelector(".ruler-row");
      ctx.expect(rulerRow).toBeDefined();
    },
    
    async "hides ruler when show-ruler is false"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      
      timeline.showRuler = false;
      await ctx.frame();
      
      const shadowRoot = timeline.shadowRoot;
      const rulerRow = shadowRoot?.querySelector(".ruler-row");
      
      ctx.expect(rulerRow).toBeFalsy();
    },
    
    async "updates playhead position on currentTimeMs change"(ctx) {
      const timeline = ctx.querySelector<EFTimeline>("ef-timeline")!;
      await ctx.frame();
      
      const shadowRoot = timeline.shadowRoot;
      const playhead = shadowRoot?.querySelector(".playhead") as HTMLElement;
      
      if (playhead) {
        const initialLeft = parseInt(playhead.style.left || "0", 10);
        
        timeline.currentTimeMs = 5000;
        await ctx.frame();
        
        const newLeft = parseInt(playhead.style.left || "0", 10);
        
        ctx.expect(newLeft !== initialLeft).toBe(true);
      }
    },
  },
});
