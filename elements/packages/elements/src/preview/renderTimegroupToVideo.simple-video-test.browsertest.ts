/**
 * Simple test: Does a video advance frame-by-frame during rendering?
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFVideo } from "../elements/EFVideo.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import {
  buildCloneStructure,
  syncStyles,
} from "./renderTimegroupPreview.js";

describe("Simple Video Frame Test", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
    await customElements.whenDefined("ef-video");
  });

  it("should show different video frames when rendering 5 frames", async () => {
    // Create a simple timegroup with ONE video
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.setAttribute("mode", "fixed");
    tg.setAttribute("duration", "5s");
    tg.style.cssText = "width: 640px; height: 360px; background: black; display: block;";
    
    const video = document.createElement("ef-video") as EFVideo;
    video.id = "test-video";
    video.src = "http://host.docker.internal:3000/sync-test.mp4";
    video.setAttribute("sourcein", "0s");
    video.setAttribute("sourceout", "5s");
    video.style.cssText = "width: 100%; height: 100%; position: absolute;";
    
    tg.appendChild(video);
    document.body.appendChild(tg);
    
    try {
      await tg.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Let video load
      
      // Create render clone
      const { clone: renderClone, cleanup } = await tg.createRenderClone();
      
      try {
        // Build clone structure once
        await renderClone.seekForRender(0);
        const { syncState } = buildCloneStructure(renderClone, 0);
        
        // Manually render 5 frames at 30fps (0, 33, 66, 100, 133ms)
        const frameTimes = [0, 33.333, 66.667, 100, 133.333];
        const pixelSamples: string[] = [];
        
        for (let i = 0; i < frameTimes.length; i++) {
          const timeMs = frameTimes[i]!;
          console.log(`\n=== Rendering Frame ${i} at ${timeMs.toFixed(1)}ms ===`);
          
          // Seek
          console.log(`  Before seek: renderClone.currentTimeMs=${renderClone.currentTimeMs.toFixed(1)}ms`);
          await renderClone.seekForRender(timeMs);
          console.log(`  After seek: renderClone.currentTimeMs=${renderClone.currentTimeMs.toFixed(1)}ms`);
          
          // Sync
          syncStyles(syncState, timeMs);
          
          // Check video canvas pixels
          const cloneVideo = renderClone.querySelector("ef-video") as EFVideo;
          const canvas = cloneVideo?.shadowRoot?.querySelector("canvas");
          
          if (canvas && canvas.width > 0 && canvas.height > 0) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const centerX = Math.floor(canvas.width / 2);
              const centerY = Math.floor(canvas.height / 2);
              const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
              const pixelStr = `rgba(${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]})`;
              pixelSamples.push(pixelStr);
              console.log(`  Video canvas center pixel: ${pixelStr}`);
            }
          }
        }
        
        console.log(`\n=== RESULT: Pixel Samples ===`);
        pixelSamples.forEach((p, i) => console.log(`Frame ${i}: ${p}`));
        
        // Check if pixels changed (at least 2 different values means video advanced)
        const uniquePixels = new Set(pixelSamples);
        console.log(`\nUnique pixel values: ${uniquePixels.size} out of ${pixelSamples.length}`);
        
        if (uniquePixels.size === 1) {
          console.log(`❌ FAIL: All frames have identical pixels - video not advancing!`);
        } else {
          console.log(`✅ PASS: Video frames changed - video is advancing!`);
        }
        
        // Assert that video advanced (at least 2 different frames in 5 samples)
        expect(uniquePixels.size).toBeGreaterThan(1);
        
        cleanup();
      } catch (e) {
        cleanup();
        throw e;
      }
    } finally {
      document.body.removeChild(tg);
    }
  }, { timeout: 60000 });
});
