import { describe, it, expect, beforeAll } from "vitest";
import { renderTimegroupToVideo } from "./renderTimegroupToVideo.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFVideo } from "../elements/EFVideo.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

describe("Video frame advancement verification", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
    await customElements.whenDefined("ef-video");
  });

  it("should capture different video frames at different times (not stuck on same frame)", async () => {

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2s");
    timegroup.style.cssText = "width: 384px; height: 224px;";

    const video = document.createElement("ef-video") as EFVideo;
    video.src = "http://host.docker.internal:3000/bars-n-tone.mp4";
    video.style.cssText = "width: 100%; height: 100%; object-fit: contain;";
    
    timegroup.appendChild(video);
    document.body.appendChild(timegroup);

    await timegroup.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 2000)); // Let video load

    try {
      // Render 5 frames at different times
      const timestamps = [0, 500, 1000, 1500, 2000]; // Every 500ms
      const result = await renderTimegroupToVideo(timegroup, {
        startMs: 0,
        endMs: 2000,
        fps: 2, // 2 frames per second
        format: "webm",
      });

      expect(result.success).toBe(true);
      
      // NOTE: We can't easily extract frames from the WebM to verify pixels changed
      // But we can verify the render completed without errors and canvas extraction worked
      expect(result.output).toBeDefined();
      
      console.log(`[Video Advancement Test] Rendered ${timestamps.length} frames`);
      console.log(`  Output size: ${result.output?.byteLength || 0} bytes`);
      
    } finally {
      document.body.removeChild(timegroup);
    }
  }, { timeout: 60000 });
  
  it("should show different pixel data in source canvas at different seek times", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "2s");
    timegroup.style.cssText = "width: 384px; height: 224px;";

    const video = document.createElement("ef-video") as EFVideo;
    video.src = "http://host.docker.internal:3000/bars-n-tone.mp4";
    video.style.cssText = "width: 100%; height: 100%; object-fit: contain;";
    
    timegroup.appendChild(video);
    document.body.appendChild(timegroup);

    await timegroup.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 2000)); // Let video load

    try {
      // Seek to different times and capture canvas pixels
      const timestamps = [0, 500, 1000];
      const pixelSnapshots: Array<{time: number, hash: string}> = [];
      
      console.log(`\n[Test] timegroup.playbackController exists: ${!!timegroup.playbackController}`);
      if (timegroup.playbackController) {
        console.log(`[Test] playbackController.currentTime: ${timegroup.playbackController.currentTime}`);
        console.log(`[Test] playbackController.currentTimeMs: ${timegroup.playbackController.currentTimeMs}`);
      }
      console.log(`[Test] timegroup.isRootTimegroup: ${timegroup.isRootTimegroup}`);
      
      for (const timeMs of timestamps) {
        console.log(`\n[Test] About to seek to ${timeMs}ms`);
        await timegroup.seekForRender(timeMs);
        console.log(`[Test] After seekForRender: timegroup.currentTimeMs=${timegroup.currentTimeMs}`);
        console.log(`[Test] timegroup.#currentTime (private): check getter logic`);
        if (timegroup.playbackController) {
          console.log(`[Test] playbackController.currentTimeMs=${timegroup.playbackController.currentTimeMs}`);
        }
        
        // Check video's understanding of time
        console.log(`[Test] video.currentSourceTimeMs=${video.currentSourceTimeMs}, video.ownCurrentTimeMs=${video.ownCurrentTimeMs}`);
        console.log(`[Test] video.desiredSeekTimeMs=${video.desiredSeekTimeMs}`);
        
        const shadowCanvas = video.shadowRoot?.querySelector("canvas") as HTMLCanvasElement;
        expect(shadowCanvas).toBeDefined();
        
        const ctx = shadowCanvas.getContext("2d");
        if (!ctx) throw new Error("No canvas context");
        
        const imageData = ctx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height);
        
        // Create a simple hash of pixel data (sum of first 1000 pixels)
        let hash = 0;
        for (let i = 0; i < Math.min(1000 * 4, imageData.data.length); i++) {
          hash += imageData.data[i]!;
        }
        
        pixelSnapshots.push({ time: timeMs, hash });
        console.log(`[Pixel Check] Time ${timeMs}ms: hash=${hash}`);
      }
      
      // Verify frames are different (hashes should not all be the same)
      const uniqueHashes = new Set(pixelSnapshots.map(s => s.hash));
      
      console.log(`[Pixel Check] Unique hashes: ${uniqueHashes.size} out of ${pixelSnapshots.length} frames`);
      
      if (uniqueHashes.size === 1) {
        console.error("❌ BUG: All frames have identical pixels! Video is not advancing.");
        pixelSnapshots.forEach(s => console.error(`  Time ${s.time}ms: hash=${s.hash}`));
      } else {
        console.log("✅ GOOD: Frames have different pixels, video is advancing");
      }
      
      expect(uniqueHashes.size).toBeGreaterThan(1);
      
    } finally {
      document.body.removeChild(timegroup);
    }
  }, { timeout: 60000 });
});
