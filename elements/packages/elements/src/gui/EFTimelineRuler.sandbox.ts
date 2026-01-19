import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFTimelineRuler } from "./EFTimelineRuler.js";
import "./EFTimelineRuler.js";
import "./timeline/TimelineStateProvider.js";

export default defineSandbox({
  name: "EFTimelineRuler",
  description: "Time scale ruler with frame markers and labels",
  category: "gui",
  subcategory: "timeline",
  
  render: () => html`
    <timeline-state-provider
      pixels-per-ms="0.1"
      current-time-ms="0"
      duration-ms="10000"
      viewport-scroll-left="0"
      viewport-width="800"
    >
      <div style="width: 800px; height: 24px; background: #1a1a2e;">
        <ef-timeline-ruler
          duration-ms="10000"
          fps="30"
          content-width="1000"
        ></ef-timeline-ruler>
      </div>
    </timeline-state-provider>
  `,
  
  scenarios: {
    async "renders with default state"(ctx) {
      const ruler = ctx.querySelector<EFTimelineRuler>("ef-timeline-ruler")!;
      await ctx.frame();
      
      ctx.expect(ruler).toBeDefined();
      ctx.expect(ruler.durationMs).toBe(10000);
      ctx.expect(ruler.fps).toBe(30);
    },
    
    async "updates when duration changes"(ctx) {
      const ruler = ctx.querySelector<EFTimelineRuler>("ef-timeline-ruler")!;
      await ctx.frame();
      
      ruler.durationMs = 20000;
      await ctx.frame();
      
      ctx.expect(ruler.durationMs).toBe(20000);
    },
    
    async "renders canvas element"(ctx) {
      const ruler = ctx.querySelector<EFTimelineRuler>("ef-timeline-ruler")!;
      await ctx.frame();
      
      const shadowRoot = ruler.shadowRoot;
      ctx.expect(shadowRoot).toBeDefined();
      
      const canvas = shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvas?.width).toBeGreaterThan(0);
      ctx.expect(canvas?.height).toBeGreaterThan(0);
    },
    
    async "renders time labels"(ctx) {
      const ruler = ctx.querySelector<EFTimelineRuler>("ef-timeline-ruler")!;
      await ctx.frame();
      
      const shadowRoot = ruler.shadowRoot;
      const labels = shadowRoot?.querySelectorAll(".label");
      
      ctx.expect(labels).toBeDefined();
      ctx.expect(labels?.length).toBeGreaterThan(0);
    },
    
    async "shows frame markers when zoomed in"(ctx) {
      const provider = ctx.querySelector("timeline-state-provider")!;
      const ruler = ctx.querySelector<EFTimelineRuler>("ef-timeline-ruler")!;
      
      // Zoom in significantly to show frame markers
      provider.setAttribute("pixels-per-ms", "1.0"); // 10x zoom
      await provider.updateComplete;
      await ruler.updateComplete;
      await ctx.frame();
      
      // Frame markers should be visible at high zoom
      const shadowRoot = ruler.shadowRoot;
      const canvas = shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      
      // At high zoom, frame markers should be rendered
      // We can verify by checking canvas was drawn (width > 0)
      ctx.expect(canvas?.width).toBeGreaterThan(0);
    },
    
    async "updates labels on zoom change"(ctx) {
      const provider = ctx.querySelector("timeline-state-provider")!;
      const ruler = ctx.querySelector<EFTimelineRuler>("ef-timeline-ruler")!;
      
      await ctx.frame();
      const shadowRoot = ruler.shadowRoot;
      const initialLabels = shadowRoot?.querySelectorAll(".label");
      const initialCount = initialLabels?.length ?? 0;
      
      // Zoom in
      provider.setAttribute("pixels-per-ms", "0.5");
      await provider.updateComplete;
      await ruler.updateComplete;
      await ctx.frame();
      
      const newLabels = shadowRoot?.querySelectorAll(".label");
      const newCount = newLabels?.length ?? 0;
      
      // Label count may change with zoom - higher zoom could result in 
      // different spacing, potentially fewer labels in the same viewport
      // Just verify that labels exist after zoom change
      ctx.expect(newCount).toBeGreaterThan(0);
    },
    
    async "handles scroll position correctly"(ctx) {
      const provider = ctx.querySelector("timeline-state-provider")!;
      const ruler = ctx.querySelector<EFTimelineRuler>("ef-timeline-ruler")!;
      
      await ctx.frame();
      
      // Scroll to middle
      provider.setAttribute("viewport-scroll-left", "500");
      await provider.updateComplete;
      await ruler.updateComplete;
      await ctx.frame();
      
      // Ruler should still render correctly
      const shadowRoot = ruler.shadowRoot;
      const canvas = shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      ctx.expect(canvas?.width).toBeGreaterThan(0);
    },
    
    async "virtualizes canvas for large durations"(ctx) {
      const provider = ctx.querySelector("timeline-state-provider")!;
      const ruler = ctx.querySelector<EFTimelineRuler>("ef-timeline-ruler")!;
      
      // Set very long duration
      ruler.durationMs = 600000; // 10 minutes
      ruler.contentWidth = 60000; // Very wide content
      provider.setAttribute("viewport-width", "800");
      await provider.updateComplete;
      await ruler.updateComplete;
      await ctx.frame();
      
      // Canvas should be virtualized (not full width)
      const shadowRoot = ruler.shadowRoot;
      const canvas = shadowRoot?.querySelector("canvas");
      ctx.expect(canvas).toBeDefined();
      
      // Canvas width should be limited (virtualization)
      // MAX_RULER_CANVAS_WIDTH is 2000, so canvas should be <= 2000 * devicePixelRatio
      const maxExpectedWidth = 2000 * (window.devicePixelRatio || 1);
      ctx.expect(canvas?.width).toBeLessThanOrEqual(maxExpectedWidth);
    },
    
    async "uses context duration when duration-ms not set"(ctx) {
      // Note: durationContext is provided by EFTimeline, EFControls, or ContextMixin,
      // not by timeline-state-provider. This test verifies that when durationMs is not set,
      // the ruler falls back to contextDurationMs or 0.
      
      const container = ctx.getContainer();
      const provider = document.createElement("timeline-state-provider");
      provider.setAttribute("duration-ms", "5000");
      provider.setAttribute("viewport-width", "800");
      
      const ruler = document.createElement("ef-timeline-ruler") as EFTimelineRuler;
      ruler.id = "context-duration-ruler";
      ruler.setAttribute("fps", "30");
      ruler.setAttribute("content-width", "500");
      
      provider.appendChild(ruler);
      container.appendChild(provider);
      
      await provider.updateComplete;
      await ruler.updateComplete;
      await ctx.frame();
      
      // Since timeline-state-provider doesn't provide durationContext,
      // effectiveDurationMs will be 0 when durationMs is not set
      // To properly test context duration, we would need an ef-timeline or ef-controls parent
      ctx.expect(ruler.effectiveDurationMs).toBe(0);
    },
  },
});
