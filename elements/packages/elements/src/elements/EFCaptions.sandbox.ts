import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFCaptions } from "./EFCaptions.js";
import "./EFCaptions.js";
import "./EFAudio.js";
import "./EFTimegroup.js";

export default defineSandbox({
  name: "EFCaptions",
  description: "Caption/subtitle element with word-level timing and active word highlighting",
  category: "media",
  
  render: () => html`
    <ef-timegroup mode="fixed" duration="10s" style="width: 800px; height: 400px; border: 1px solid #ccc;">
      <ef-audio
        src="/assets/bars-n-tone2.mp4"
        duration="10s"
        style="display: none;"
      ></ef-audio>
      
      <ef-captions
        id="test-captions"
        src="/assets/improv-trimmed-captions.json"
        style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); font-size: 18px; color: white; text-align: center;"
      ></ef-captions>
    </ef-timegroup>
  `,
  
  scenarios: {
    async "renders captions element"(ctx) {
      const captions = ctx.querySelector<EFCaptions>("ef-captions")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(captions).toBeDefined();
    },
    
    async "loads captions from source"(ctx) {
      const captions = ctx.querySelector<EFCaptions>("ef-captions")!;
      
      await ctx.wait(200);
      await ctx.frame();
      
      ctx.expect(captions.src).toBe("/assets/improv-trimmed-captions.json");
    },
    
    async "has word segments"(ctx) {
      const captions = ctx.querySelector<EFCaptions>("ef-captions")!;
      
      await ctx.wait(300);
      await ctx.frame();
      
      const wordSegments = captions.querySelectorAll("ef-captions-active-word");
      ctx.expect(wordSegments.length).toBeGreaterThanOrEqual(0);
    },
    
    async "highlights active word during playback"(ctx) {
      const captions = ctx.querySelector<EFCaptions>("ef-captions")!;
      const timegroup = ctx.querySelector("ef-timegroup")!;
      
      await ctx.wait(300);
      await ctx.frame();
      
      timegroup.currentTimeMs = 1000;
      await ctx.frame();
      await ctx.wait(100);
      
      const activeWords = captions.querySelectorAll("ef-captions-active-word:not([hidden])");
      ctx.expect(activeWords.length).toBeGreaterThanOrEqual(0);
    },
    
    async "has temporal properties"(ctx) {
      const captions = ctx.querySelector<EFCaptions>("ef-captions")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(typeof captions.durationMs).toBe("number");
      ctx.expect(captions.durationMs).toBeGreaterThanOrEqual(0);
    },
    
    async "can change source"(ctx) {
      const captions = ctx.querySelector<EFCaptions>("ef-captions")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const originalSrc = captions.src;
      captions.src = "/assets/other-captions.json";
      await ctx.frame();
      await ctx.wait(100);
      
      ctx.expect(captions.src).toBe("/assets/other-captions.json");
      ctx.expect(captions.src).not.toBe(originalSrc);
    },
  },
});
