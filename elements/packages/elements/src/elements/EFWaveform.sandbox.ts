import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFWaveform } from "./EFWaveform.js";
import "./EFWaveform.js";
import "./EFAudio.js";
import "./EFTimegroup.js";

export default defineSandbox({
  name: "EFWaveform",
  description: "Audio waveform visualization with multiple rendering modes",
  category: "elements",
  subcategory: "visualization",
  
  render: () => html`
    <ef-timegroup mode="fixed" duration="5s" style="width: 600px; height: 200px; border: 1px solid #ccc;">
      <ef-audio
        id="waveform-audio"
        src="/assets/bars-n-tone2.mp4"
        duration="5s"
        style="display: none;"
      ></ef-audio>
      
      <ef-waveform
        id="test-waveform"
        target="waveform-audio"
        mode="bars"
        color="#3b82f6"
        style="width: 100%; height: 100%;"
      ></ef-waveform>
    </ef-timegroup>
  `,
  
  scenarios: {
    async "renders waveform component"(ctx) {
      const waveform = ctx.querySelector<EFWaveform>("ef-waveform")!;
      
      await ctx.frame();
      
      ctx.expect(waveform).toBeDefined();
      ctx.expect(waveform.canvasRef.value).toBeDefined();
    },
    
    async "connects to target audio element"(ctx) {
      const waveform = ctx.querySelector<EFWaveform>("ef-waveform")!;
      const audio = ctx.querySelector("ef-audio")!;
      
      await ctx.frame();
      
      ctx.expect(waveform.target).toBe("waveform-audio");
      ctx.expect(waveform.targetElement).toBeDefined();
    },
    
    async "supports different rendering modes"(ctx) {
      const waveform = ctx.querySelector<EFWaveform>("ef-waveform")!;
      
      await ctx.frame();
      
      ctx.expect(waveform.mode).toBe("bars");
      
      waveform.mode = "line";
      await ctx.frame();
      
      ctx.expect(waveform.mode).toBe("line");
    },
    
    async "can change color"(ctx) {
      const waveform = ctx.querySelector<EFWaveform>("ef-waveform")!;
      
      await ctx.frame();
      
      waveform.color = "#ff0000";
      await ctx.frame();
      
      ctx.expect(waveform.color).toBe("#ff0000");
    },
    
    async "has temporal properties"(ctx) {
      const waveform = ctx.querySelector<EFWaveform>("ef-waveform")!;
      
      await ctx.frame();
      
      ctx.expect(typeof waveform.durationMs).toBe("number");
      ctx.expect(waveform.durationMs).toBeGreaterThanOrEqual(0);
    },
    
    async "supports bar spacing configuration"(ctx) {
      const waveform = ctx.querySelector<EFWaveform>("ef-waveform")!;
      
      await ctx.frame();
      
      waveform.barSpacing = 1.0;
      await ctx.frame();
      
      ctx.expect(waveform.barSpacing).toBe(1.0);
    },
  },
});
