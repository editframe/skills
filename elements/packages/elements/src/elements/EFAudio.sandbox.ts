import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFAudio } from "./EFAudio.js";
import "./EFAudio.js";
import "./EFTimegroup.js";

export default defineSandbox({
  name: "EFAudio",
  description: "Audio playback element with volume control and waveform sync",
  category: "media",
  
  render: () => html`
    <ef-timegroup mode="fixed" duration="5s" style="width: 400px; height: 200px; border: 1px solid #ccc;">
      <ef-audio
        id="test-audio"
        src="/assets/bars-n-tone2.mp4"
        duration="5s"
        volume="0.8"
      ></ef-audio>
    </ef-timegroup>
  `,
  
  scenarios: {
    async "renders audio element"(ctx) {
      const audio = ctx.querySelector<EFAudio>("ef-audio")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(audio).toBeDefined();
      ctx.expect(audio.audioElementRef.value).toBeDefined();
    },
    
    async "initializes with source and volume"(ctx) {
      const audio = ctx.querySelector<EFAudio>("ef-audio")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      ctx.expect(audio.src).toBe("/assets/bars-n-tone2.mp4");
      ctx.expect(audio.volume).toBe(0.8);
      ctx.expect(audio.durationMs).toBeGreaterThan(0);
    },
    
    async "syncs volume to audio element"(ctx) {
      const audio = ctx.querySelector<EFAudio>("ef-audio")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const audioElement = audio.audioElementRef.value;
      ctx.expect(audioElement).toBeDefined();
      ctx.expect(audioElement!.volume).toBe(0.8);
      
      audio.volume = 0.5;
      await ctx.frame();
      
      ctx.expect(audioElement!.volume).toBe(0.5);
    },
    
    async "can change volume"(ctx) {
      const audio = ctx.querySelector<EFAudio>("ef-audio")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      audio.volume = 0.3;
      await ctx.frame();
      
      ctx.expect(audio.volume).toBe(0.3);
      ctx.expect(audio.audioElementRef.value!.volume).toBe(0.3);
    },
    
    async "plays audio in timegroup"(ctx) {
      const audio = ctx.querySelector<EFAudio>("ef-audio")!;
      const timegroup = ctx.querySelector("ef-timegroup")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const initialTime = timegroup.currentTimeMs;
      
      timegroup.playbackController.play();
      await ctx.wait(300);
      await ctx.frame();
      
      const newTime = timegroup.currentTimeMs;
      ctx.expect(newTime).toBeGreaterThan(initialTime);
    },
    
    async "handles source changes"(ctx) {
      const audio = ctx.querySelector<EFAudio>("ef-audio")!;
      
      await ctx.wait(100);
      await ctx.frame();
      
      const originalSrc = audio.src;
      audio.src = "/assets/color.mp4";
      await ctx.frame();
      await ctx.wait(100);
      
      ctx.expect(audio.src).toBe("/assets/color.mp4");
      ctx.expect(audio.src).not.toBe(originalSrc);
    },
  },
});
