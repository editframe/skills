import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFTextSegment } from "./EFTextSegment.js";
import "./EFTextSegment.js";
import "./EFText.js";
import "./EFTimegroup.js";

export default defineSandbox({
  name: "EFTextSegment",
  description: "Individual text segment with temporal properties and animation support",
  category: "elements",
  subcategory: "text",

  render: () => html`
    <ef-timegroup mode="fixed" duration="5s" style="width: 400px; height: 200px; background: #1a1a1a;">
      <ef-text style="font-size: 24px; color: white;" split="none">
        <template>
          <ef-text-segment></ef-text-segment>
        </template>
        Hello World
      </ef-text>
    </ef-timegroup>
  `,

  scenarios: {
    async "renders with segment text"(ctx) {
      await ctx.frame();
      
      const text = ctx.querySelector("ef-text");
      ctx.expect(text).toBeDefined();
      if (!text) return;
      
      await (text as any).updateComplete;
      await (text as any).whenSegmentsReady();
      await ctx.frame();
      
      const segment = text.querySelector<EFTextSegment>("ef-text-segment");
      ctx.expect(segment).toBeDefined();
      if (!segment) return;
      
      await segment.updateComplete;
      await ctx.frame();

      // EFText splits "Hello World" by word, so segments are "Hello" and "World" (no trailing space)
      ctx.expect(segment.segmentText === "Hello" || segment.segmentText === "World").toBe(true);
    },

    async "sets segment index"(ctx) {
      await ctx.frame();
      
      const text = ctx.querySelector("ef-text");
      ctx.expect(text).toBeDefined();
      if (!text) return;
      
      await (text as any).updateComplete;
      await (text as any).whenSegmentsReady();
      await ctx.frame();
      
      const segments = text.querySelectorAll<EFTextSegment>("ef-text-segment");
      ctx.expect(segments.length).toBeGreaterThanOrEqual(2);
      
      await Promise.all(Array.from(segments).map(s => s.updateComplete));
      await ctx.frame();

      // EFText creates segments with sequential indices
      ctx.expect(segments[0]!.segmentIndex).toBe(0);
      ctx.expect(segments[1]!.segmentIndex).toBe(1);
    },

    async "sets CSS variables for seed and index"(ctx) {
      await ctx.frame();
      
      const text = ctx.querySelector("ef-text");
      ctx.expect(text).toBeDefined();
      if (!text) return;
      
      await (text as any).updateComplete;
      await (text as any).whenSegmentsReady();
      await ctx.frame();
      
      const segment = text.querySelector<EFTextSegment>("ef-text-segment");
      ctx.expect(segment).toBeDefined();
      if (!segment) return;
      
      await segment.updateComplete;
      await ctx.frame();

      const seed = segment.style.getPropertyValue("--ef-seed");
      const index = segment.style.getPropertyValue("--ef-index");

      ctx.expect(seed).toBeDefined();
      ctx.expect(index).toBe("0");
    },

    async "sets stagger offset CSS variable"(ctx) {
      const container = ctx.getContainer();
      const segment = document.createElement("ef-text-segment") as EFTextSegment;
      segment.segmentText = "Test";
      segment.staggerOffsetMs = 100;
      container.appendChild(segment);
      await ctx.frame();

      const offset = segment.style.getPropertyValue("--ef-stagger-offset");
      ctx.expect(offset).toBe("100ms");
    },

    async "supports hidden attribute"(ctx) {
      await ctx.frame();
      
      const text = ctx.querySelector("ef-text");
      ctx.expect(text).toBeDefined();
      if (!text) return;
      
      await (text as any).updateComplete;
      await (text as any).whenSegmentsReady();
      await ctx.frame();
      
      const segment = text.querySelector<EFTextSegment>("ef-text-segment");
      ctx.expect(segment).toBeDefined();
      if (!segment) return;
      
      await segment.updateComplete;
      await ctx.frame();

      segment.hidden = true;
      await segment.updateComplete;
      await ctx.frame();

      ctx.expect(segment.hidden).toBe(true);
    },

    async "calculates duration from segment times"(ctx) {
      const container = ctx.getContainer();
      const segment = document.createElement("ef-text-segment") as EFTextSegment;
      segment.segmentText = "Test";
      segment.segmentStartMs = 100;
      segment.segmentEndMs = 500;
      container.appendChild(segment);
      await ctx.frame();

      ctx.expect(segment.durationMs).toBe(400);
    },
  },
});
