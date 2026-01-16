import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFText } from "./EFText.js";
import "./EFText.js";
import "./EFTextSegment.js";
import "./EFTimegroup.js";

export default defineSandbox({
  name: "EFText",
  description: "Text rendering element with split modes and animation support",
  category: "media",
  
  render: () => html`
    <ef-timegroup mode="fixed" duration="3s" style="width: 600px; height: 400px; border: 1px solid #ccc; padding: 20px;">
      <ef-text
        id="test-text"
        split="word"
        style="font-size: 24px; color: white;"
      >
        Hello World
      </ef-text>
    </ef-timegroup>
  `,
  
  scenarios: {
    async "renders text element"(ctx) {
      const text = ctx.querySelector<EFText>("ef-text")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(text).toBeDefined();
    },
    
    async "splits text by word"(ctx) {
      const text = ctx.querySelector<EFText>("ef-text")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(text.split).toBe("word");
      
      const segments = text.querySelectorAll("ef-text-segment");
      ctx.expect(segments.length).toBeGreaterThan(0);
    },
    
    async "supports line split mode"(ctx) {
      const container = ctx.getContainer();
      const text = document.createElement("ef-text") as EFText;
      text.split = "line";
      text.textContent = "Line 1\nLine 2\nLine 3";
      text.style.fontSize = "20px";
      text.style.color = "white";
      container.appendChild(text);
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(text.split).toBe("line");
    },
    
    async "supports char split mode"(ctx) {
      const container = ctx.getContainer();
      const text = document.createElement("ef-text") as EFText;
      text.split = "char";
      text.textContent = "ABC";
      text.style.fontSize = "20px";
      text.style.color = "white";
      container.appendChild(text);
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(text.split).toBe("char");
    },
    
    async "supports stagger animation"(ctx) {
      const text = ctx.querySelector<EFText>("ef-text")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      text.staggerMs = 100;
      await ctx.frame();
      
      ctx.expect(text.staggerMs).toBe(100);
    },
    
    async "has temporal properties"(ctx) {
      const text = ctx.querySelector<EFText>("ef-text")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(typeof text.durationMs).toBe("number");
      ctx.expect(text.durationMs).toBeGreaterThanOrEqual(0);
    },
  },
});
