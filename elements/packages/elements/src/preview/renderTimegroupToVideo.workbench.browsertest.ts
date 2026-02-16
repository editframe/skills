/**
 * Integration tests for renderTimegroupToVideo that replicate the full workbench export path.
 * 
 * These tests exercise the same code path as the UI, including:
 * - Progress callbacks
 * - Temporal culling (elements appearing/disappearing over time)
 * - DOM mutations between frames (canvas, video, text changes)
 * - Multi-frame exports (30+ frames to catch state accumulation issues)
 * 
 * These tests would have caught the insertBefore error that wasn't caught by unit tests.
 */

import { html, render } from "lit";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getApiHost } from "../../test/setup.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFVideo } from "../elements/EFVideo.js";
import type { EFWorkbench } from "../gui/EFWorkbench.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "../elements/EFText.js";
import "../gui/EFConfiguration.js";
import "../gui/EFWorkbench.js";
import "../gui/EFPreview.js";
import "../canvas/EFCanvas.js";
import "../elements/EFPanZoom.js";
import { renderTimegroupToVideo, type RenderProgress } from "./renderTimegroupToVideo.js";
import { logger } from "./logger.js";

beforeAll(async () => {
  await customElements.whenDefined("ef-timegroup");
  await customElements.whenDefined("ef-video");
  await customElements.whenDefined("ef-text");
  await customElements.whenDefined("ef-configuration");
  await customElements.whenDefined("ef-workbench");
});

beforeEach(() => {
  localStorage.clear();
});

/**
 * Decode the first frame of an MP4 video and check if it has non-black content
 */
async function decodeFirstFrame(videoBuffer: Uint8Array): Promise<{
  width: number;
  height: number;
  hasContent: boolean;
  samplePixel: [number, number, number, number];
  nonBlackPercentage: number;
}> {
  const blob = new Blob([videoBuffer], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);
  
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
  });
  
  video.currentTime = 0;
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });
  
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0);
  
  const centerX = Math.floor(canvas.width / 2);
  const centerY = Math.floor(canvas.height / 2);
  const centerPixel = ctx.getImageData(centerX, centerY, 1, 1).data;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let nonBlackPixels = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i]!;
    const g = imageData.data[i + 1]!;
    const b = imageData.data[i + 2]!;
    if (r > 10 || g > 10 || b > 10) {
      nonBlackPixels++;
    }
  }
  
  const totalPixels = canvas.width * canvas.height;
  const nonBlackPercentage = (nonBlackPixels / totalPixels) * 100;
  const hasContent = nonBlackPixels > totalPixels * 0.1;
  
  URL.revokeObjectURL(url);
  
  return {
    width: canvas.width,
    height: canvas.height,
    hasContent,
    samplePixel: [centerPixel[0]!, centerPixel[1]!, centerPixel[2]!, centerPixel[3]!],
    nonBlackPercentage,
  };
}

describe("renderTimegroupToVideo - workbench integration", () => {
  
  it("should export video through workbench path with progress callbacks", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
        <ef-workbench style="width: 900px; height: 700px;">
          <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
            <ef-canvas style="width: 800px; height: 450px; display: block;">
              <ef-timegroup id="workbench-test" mode="fixed" duration="3s"
                style="width: 800px; height: 450px; background: #1a1a2e;">
                <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
                <ef-text duration="3s"
                  style="position: absolute; top: 20px; left: 20px; color: white; font-size: 24px; font-weight: bold;">
                  Workbench Export Test
                </ef-text>
              </ef-timegroup>
            </ef-canvas>
          </ef-pan-zoom>
        </ef-workbench>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    try {
      const workbench = container.querySelector("ef-workbench") as EFWorkbench;
      const timegroup = container.querySelector("#workbench-test") as EFTimegroup;
      
      await workbench.updateComplete;
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();
      
      logger.debug("[Workbench Integration Test] Starting export with progress tracking...");
      
      const progressUpdates: RenderProgress[] = [];
      const startTime = performance.now();
      
      // Export like the workbench does - with progress callbacks
      const videoBuffer = await renderTimegroupToVideo(timegroup, {
        fps: 10,
        scale: 0.5,
        fromMs: 500,
        toMs: 1500,
        returnBuffer: true,
        streaming: false,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
          logger.debug(
            `[Workbench Integration Test] Progress: ${progress.progress.toFixed(1)}%, ` +
            `Frame ${progress.currentFrame}/${progress.totalFrames}, ` +
            `Speed: ${progress.speedMultiplier.toFixed(2)}x`
          );
        },
      });
      
      const totalTime = performance.now() - startTime;
      const avgSpeedMultiplier = progressUpdates.length > 0 
        ? progressUpdates.reduce((sum, p) => sum + p.speedMultiplier, 0) / progressUpdates.length 
        : 0;
      const frameCount = progressUpdates.length > 0 ? progressUpdates[progressUpdates.length - 1]!.totalFrames : 0;
      
      console.log(`[PERF] Workbench progress callbacks: ${totalTime.toFixed(0)}ms, ${frameCount} frames, ${avgSpeedMultiplier.toFixed(2)}x realtime, ${(totalTime / Math.max(frameCount, 1)).toFixed(1)}ms/frame`);
      
      expect(videoBuffer).toBeDefined();
      expect(videoBuffer!.length).toBeGreaterThan(1000);
      
      // Verify progress callbacks were called (may be infrequent for short exports)
      expect(progressUpdates.length).toBeGreaterThan(0);
      logger.debug(`[Workbench Integration Test] Received ${progressUpdates.length} progress updates`);
      if (progressUpdates.length > 0) {
        logger.debug(`[Workbench Integration Test] First progress: ${progressUpdates[0]?.progress}%`);
        logger.debug(`[Workbench Integration Test] Last progress: ${progressUpdates[progressUpdates.length - 1]?.progress}%`);
      }
      
      // Verify video has content
      const frameData = await decodeFirstFrame(videoBuffer!);
      expect(frameData.hasContent).toBe(true);
      
      logger.debug(`[Workbench Integration Test] Export completed with ${progressUpdates.length} progress updates`);
      
    } finally {
      container.remove();
    }
  }, 60000);
  
  it("should handle temporal culling - elements appearing and disappearing over time", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Create a composition with elements that appear/disappear at different times
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
        <ef-workbench style="width: 900px; height: 700px;">
          <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
            <ef-canvas style="width: 800px; height: 450px; display: block;">
              <ef-timegroup id="temporal-culling-test" mode="fixed" duration="5s"
                style="width: 800px; height: 450px; background: #2c2c54;">
                
                <!-- Background video - visible entire duration -->
                <ef-video src="bars-n-tone.mp4" 
                  style="width: 100%; height: 100%; object-fit: cover;"></ef-video>
                
                <!-- Text that appears only in first 2 seconds -->
                <ef-text timein="0s" timeout="2s"
                  style="position: absolute; top: 50px; left: 50px; color: yellow; font-size: 32px; font-weight: bold;">
                  First Scene
                </ef-text>
                
                <!-- Text that appears from 2s to 4s -->
                <ef-text timein="2s" timeout="4s"
                  style="position: absolute; top: 50px; left: 50px; color: lime; font-size: 32px; font-weight: bold;">
                  Second Scene
                </ef-text>
                
                <!-- Text that appears only in last second -->
                <ef-text timein="4s" timeout="5s"
                  style="position: absolute; top: 50px; left: 50px; color: cyan; font-size: 32px; font-weight: bold;">
                  Third Scene
                </ef-text>
                
                <!-- Element that blinks in and out -->
                <ef-text timein="1s" timeout="1.5s"
                  style="position: absolute; bottom: 50px; right: 50px; color: white; font-size: 20px;">
                  Blink 1
                </ef-text>
                <ef-text timein="3s" timeout="3.5s"
                  style="position: absolute; bottom: 50px; right: 50px; color: white; font-size: 20px;">
                  Blink 2
                </ef-text>
                
              </ef-timegroup>
            </ef-canvas>
          </ef-pan-zoom>
        </ef-workbench>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    try {
      const workbench = container.querySelector("ef-workbench") as EFWorkbench;
      const timegroup = container.querySelector("#temporal-culling-test") as EFTimegroup;
      
      await workbench.updateComplete;
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();
      
      logger.debug("[Temporal Culling Test] Starting export across all time ranges...");
      
      const progressUpdates: RenderProgress[] = [];
      const startTime = performance.now();
      
      // Export the full 5 seconds - this will exercise temporal culling as elements appear/disappear
      const videoBuffer = await renderTimegroupToVideo(timegroup, {
        fps: 15, // 75 frames total - good stress test
        scale: 0.5,
        fromMs: 0,
        toMs: 5000,
        returnBuffer: true,
        streaming: false,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
      });
      
      const totalTime = performance.now() - startTime;
      const avgSpeedMultiplier = progressUpdates.length > 0 
        ? progressUpdates.reduce((sum, p) => sum + p.speedMultiplier, 0) / progressUpdates.length 
        : 0;
      const frameCount = progressUpdates.length > 0 ? progressUpdates[progressUpdates.length - 1]!.totalFrames : 0;
      
      console.log(`[PERF] Temporal culling: ${totalTime.toFixed(0)}ms, ${frameCount} frames, ${avgSpeedMultiplier.toFixed(2)}x realtime, ${(totalTime / Math.max(frameCount, 1)).toFixed(1)}ms/frame`);
      
      expect(videoBuffer).toBeDefined();
      expect(videoBuffer!.length).toBeGreaterThan(1000);
      
      const frameData = await decodeFirstFrame(videoBuffer!);
      expect(frameData.hasContent).toBe(true);
      
      logger.debug("[Temporal Culling Test] Successfully exported video with temporal culling");
      
    } finally {
      container.remove();
    }
  }, 90000);
  
  it("should handle nested timegroups with different time ranges", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
        <ef-workbench style="width: 900px; height: 700px;">
          <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
            <ef-canvas style="width: 800px; height: 450px; display: block;">
              <ef-timegroup id="nested-test" mode="sequence"
                style="width: 800px; height: 450px; background: #0f172a;">
                
                <!-- Scene 1: 2 seconds -->
                <ef-timegroup mode="fixed" duration="2s" style="width: 100%; height: 100%;">
                  <ef-video src="bars-n-tone.mp4" sourcein="0s" sourceout="2s"
                    style="width: 100%; height: 100%; object-fit: cover;"></ef-video>
                  <ef-text duration="2s"
                    style="position: absolute; top: 40px; left: 40px; color: white; font-size: 28px; font-weight: bold;">
                    Scene One
                  </ef-text>
                </ef-timegroup>
                
                <!-- Scene 2: 2 seconds -->
                <ef-timegroup mode="fixed" duration="2s" style="width: 100%; height: 100%;">
                  <ef-video src="bars-n-tone.mp4" sourcein="2s" sourceout="4s"
                    style="width: 100%; height: 100%; object-fit: cover;"></ef-video>
                  <ef-text duration="2s"
                    style="position: absolute; bottom: 40px; left: 40px; color: white; font-size: 28px; font-weight: bold;">
                    Scene Two
                  </ef-text>
                </ef-timegroup>
                
              </ef-timegroup>
            </ef-canvas>
          </ef-pan-zoom>
        </ef-workbench>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    try {
      const workbench = container.querySelector("ef-workbench") as EFWorkbench;
      const timegroup = container.querySelector("#nested-test") as EFTimegroup;
      
      await workbench.updateComplete;
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();
      
      logger.debug("[Nested Timegroups Test] Starting export with scene transitions...");
      
      const progressUpdates: RenderProgress[] = [];
      const startTime = performance.now();
      
      // Export across the scene boundary
      const videoBuffer = await renderTimegroupToVideo(timegroup, {
        fps: 10,
        scale: 0.5,
        fromMs: 1000, // Start in scene 1
        toMs: 3000,   // End in scene 2
        returnBuffer: true,
        streaming: false,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
      });
      
      const totalTime = performance.now() - startTime;
      const avgSpeedMultiplier = progressUpdates.length > 0 
        ? progressUpdates.reduce((sum, p) => sum + p.speedMultiplier, 0) / progressUpdates.length 
        : 0;
      const frameCount = progressUpdates.length > 0 ? progressUpdates[progressUpdates.length - 1]!.totalFrames : 0;
      
      console.log(`[PERF] Nested timegroups: ${totalTime.toFixed(0)}ms, ${frameCount} frames, ${avgSpeedMultiplier.toFixed(2)}x realtime, ${(totalTime / Math.max(frameCount, 1)).toFixed(1)}ms/frame`);
      
      expect(videoBuffer).toBeDefined();
      expect(videoBuffer!.length).toBeGreaterThan(1000);
      
      const frameData = await decodeFirstFrame(videoBuffer!);
      expect(frameData.hasContent).toBe(true);
      
      logger.debug("[Nested Timegroups Test] Successfully exported video across scene transitions");
      
    } finally {
      container.remove();
    }
  }, 90000);
  
  it("should handle DOM mutations between frames - canvas, video, changing text", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Create a complex composition with multiple canvas elements and changing content
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
        <ef-workbench style="width: 900px; height: 700px;">
          <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
            <ef-canvas style="width: 800px; height: 450px; display: block;">
              <ef-timegroup id="dom-mutation-test" mode="fixed" duration="3s"
                style="width: 800px; height: 450px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                
                <!-- Video element (seeking between frames) -->
                <ef-video src="bars-n-tone.mp4" 
                  style="width: 50%; height: 50%; object-fit: cover; position: absolute; top: 0; left: 0;"></ef-video>
                
                <!-- Multiple text elements that change over time -->
                <ef-text timein="0s" timeout="1s"
                  style="position: absolute; top: 200px; left: 50%; transform: translateX(-50%); color: white; font-size: 48px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                  Frame Set 1
                </ef-text>
                
                <ef-text timein="1s" timeout="2s"
                  style="position: absolute; top: 200px; left: 50%; transform: translateX(-50%); color: yellow; font-size: 48px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                  Frame Set 2
                </ef-text>
                
                <ef-text timein="2s" timeout="3s"
                  style="position: absolute; top: 200px; left: 50%; transform: translateX(-50%); color: lime; font-size: 48px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                  Frame Set 3
                </ef-text>
                
                <!-- Counter text to show frame progression -->
                <ef-text duration="3s"
                  style="position: absolute; bottom: 20px; right: 20px; color: white; font-size: 20px; font-family: monospace;">
                  Testing DOM Mutations
                </ef-text>
                
              </ef-timegroup>
            </ef-canvas>
          </ef-pan-zoom>
        </ef-workbench>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    try {
      const workbench = container.querySelector("ef-workbench") as EFWorkbench;
      const timegroup = container.querySelector("#dom-mutation-test") as EFTimegroup;
      
      await workbench.updateComplete;
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();
      
      logger.debug("[DOM Mutation Test] Starting export with complex DOM changes...");
      
      const progressUpdates: RenderProgress[] = [];
      const startTime = performance.now();
      
      // Export 30+ frames to stress test DOM restoration logic
      const videoBuffer = await renderTimegroupToVideo(timegroup, {
        fps: 12, // 36 frames - enough to catch state accumulation issues
        scale: 0.5,
        fromMs: 0,
        toMs: 3000,
        returnBuffer: true,
        streaming: false,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
      });
      
      const totalTime = performance.now() - startTime;
      const avgSpeedMultiplier = progressUpdates.length > 0 
        ? progressUpdates.reduce((sum, p) => sum + p.speedMultiplier, 0) / progressUpdates.length 
        : 0;
      const frameCount = progressUpdates.length > 0 ? progressUpdates[progressUpdates.length - 1]!.totalFrames : 0;
      
      console.log(`[PERF] DOM mutations: ${totalTime.toFixed(0)}ms, ${frameCount} frames, ${avgSpeedMultiplier.toFixed(2)}x realtime, ${(totalTime / Math.max(frameCount, 1)).toFixed(1)}ms/frame`);
      
      expect(videoBuffer).toBeDefined();
      expect(videoBuffer!.length).toBeGreaterThan(1000);
      
      const frameData = await decodeFirstFrame(videoBuffer!);
      expect(frameData.hasContent).toBe(true);
      
      logger.debug("[DOM Mutation Test] Successfully exported 36 frames with DOM mutations");
      
    } finally {
      container.remove();
    }
  }, 90000);
  
  it("should reuse clone structure across all frames without DOM corruption", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
        <ef-workbench style="width: 900px; height: 700px;">
          <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
            <ef-canvas style="width: 1280px; height: 720px; display: block;">
              <ef-timegroup id="clone-reuse-test" mode="fixed" duration="2s"
                style="width: 1280px; height: 720px; background: #111827;">
                
                <!-- This test would have caught the insertBefore error -->
                <!-- Multiple videos and text elements that appear/disappear -->
                
                <ef-video src="bars-n-tone.mp4" 
                  style="width: 100%; height: 100%; object-fit: cover;"></ef-video>
                
                <ef-text timein="0s" timeout="0.5s"
                  style="position: absolute; top: 100px; left: 100px; color: white; font-size: 36px;">
                  A
                </ef-text>
                
                <ef-text timein="0.5s" timeout="1s"
                  style="position: absolute; top: 100px; left: 100px; color: white; font-size: 36px;">
                  B
                </ef-text>
                
                <ef-text timein="1s" timeout="1.5s"
                  style="position: absolute; top: 100px; left: 100px; color: white; font-size: 36px;">
                  C
                </ef-text>
                
                <ef-text timein="1.5s" timeout="2s"
                  style="position: absolute; top: 100px; left: 100px; color: white; font-size: 36px;">
                  D
                </ef-text>
                
                <!-- Overlapping elements to stress test the restore logic -->
                <ef-text timein="0.25s" timeout="1.75s"
                  style="position: absolute; bottom: 100px; right: 100px; color: yellow; font-size: 24px;">
                  Overlay
                </ef-text>
                
              </ef-timegroup>
            </ef-canvas>
          </ef-pan-zoom>
        </ef-workbench>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    try {
      const workbench = container.querySelector("ef-workbench") as EFWorkbench;
      const timegroup = container.querySelector("#clone-reuse-test") as EFTimegroup;
      
      await workbench.updateComplete;
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();
      
      logger.debug("[Clone Reuse Test] Testing 720p export with 30 frames...");
      
      let lastProgress = 0;
      let progressCallCount = 0;
      const progressUpdates: RenderProgress[] = [];
      const startTime = performance.now();
      
      // This is the key test - 30 frames at 720p with elements appearing/disappearing
      // Would have caught the insertBefore error from improper DOM restoration
      const videoBuffer = await renderTimegroupToVideo(timegroup, {
        fps: 15, // 30 frames
        scale: 1, // Full 720p to stress test
        fromMs: 0,
        toMs: 2000,
        returnBuffer: true,
        streaming: false,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
        onProgress: (progress) => {
          progressCallCount++;
          lastProgress = progress.progress;
          progressUpdates.push({ ...progress });
          
          // Log every 10th frame
          if (progress.currentFrame % 10 === 0) {
            logger.debug(
              `[Clone Reuse Test] Frame ${progress.currentFrame}/${progress.totalFrames}, ` +
              `${progress.progress.toFixed(1)}%`
            );
          }
        },
      });
      
      const totalTime = performance.now() - startTime;
      const avgSpeedMultiplier = progressUpdates.length > 0 
        ? progressUpdates.reduce((sum, p) => sum + p.speedMultiplier, 0) / progressUpdates.length 
        : 0;
      const frameCount = progressUpdates.length > 0 ? progressUpdates[progressUpdates.length - 1]!.totalFrames : 0;
      
      console.log(`[PERF] Clone reuse 720p: ${totalTime.toFixed(0)}ms, ${frameCount} frames, ${avgSpeedMultiplier.toFixed(2)}x realtime, ${(totalTime / Math.max(frameCount, 1)).toFixed(1)}ms/frame`);
      
      expect(videoBuffer).toBeDefined();
      expect(videoBuffer!.length).toBeGreaterThan(1000);
      
      // Verify progress callbacks were called
      // Note: Progress callbacks may be infrequent depending on encoding performance
      expect(progressCallCount).toBeGreaterThan(0);
      logger.debug(`[Clone Reuse Test] Received ${progressCallCount} progress callbacks, last progress: ${lastProgress}%`);
      
      const frameData = await decodeFirstFrame(videoBuffer!);
      expect(frameData.width).toBe(1280);
      expect(frameData.height).toBe(720);
      expect(frameData.hasContent).toBe(true);
      
      logger.debug("[Clone Reuse Test] Successfully exported 30 frames at 720p without DOM errors");
      
    } finally {
      container.remove();
    }
  }, 90000);
  
  it("should handle 1080p multi-frame export without errors", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
        <ef-workbench style="width: 900px; height: 700px;">
          <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
            <ef-canvas style="width: 1920px; height: 1080px; display: block;">
              <ef-timegroup id="hd-1080p-test" mode="fixed" duration="2s"
                style="width: 1920px; height: 1080px; background: radial-gradient(circle at center, #3b82f6 0%, #1e3a8a 100%);">
                
                <ef-video src="bars-n-tone.mp4" 
                  style="width: 60%; height: 60%; object-fit: contain; position: absolute; top: 20%; left: 20%;"></ef-video>
                
                <ef-text duration="2s"
                  style="position: absolute; top: 50px; left: 50%; transform: translateX(-50%); color: white; font-size: 64px; font-weight: bold; text-shadow: 3px 3px 6px rgba(0,0,0,0.8);">
                  1080p Export Test
                </ef-text>
                
                <!-- Multiple overlays to test complex rendering -->
                <ef-text timein="0s" timeout="1s"
                  style="position: absolute; bottom: 100px; left: 100px; color: lime; font-size: 32px;">
                  First Half
                </ef-text>
                
                <ef-text timein="1s" timeout="2s"
                  style="position: absolute; bottom: 100px; left: 100px; color: yellow; font-size: 32px;">
                  Second Half
                </ef-text>
                
              </ef-timegroup>
            </ef-canvas>
          </ef-pan-zoom>
        </ef-workbench>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    try {
      const workbench = container.querySelector("ef-workbench") as EFWorkbench;
      const timegroup = container.querySelector("#hd-1080p-test") as EFTimegroup;
      
      await workbench.updateComplete;
      await timegroup.updateComplete;
      await timegroup.waitForMediaDurations();
      
      logger.debug("[1080p Test] Starting high-resolution export...");
      
      const progressUpdates: RenderProgress[] = [];
      const startTime = performance.now();
      
      // Export at 50% scale (960x540) for 30 frames
      const videoBuffer = await renderTimegroupToVideo(timegroup, {
        fps: 15, // 30 frames
        scale: 0.5,
        fromMs: 0,
        toMs: 2000,
        returnBuffer: true,
        streaming: false,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
      });
      
      const totalTime = performance.now() - startTime;
      const avgSpeedMultiplier = progressUpdates.length > 0 
        ? progressUpdates.reduce((sum, p) => sum + p.speedMultiplier, 0) / progressUpdates.length 
        : 0;
      const frameCount = progressUpdates.length > 0 ? progressUpdates[progressUpdates.length - 1]!.totalFrames : 0;
      
      console.log(`[PERF] 1080p export: ${totalTime.toFixed(0)}ms, ${frameCount} frames, ${avgSpeedMultiplier.toFixed(2)}x realtime, ${(totalTime / Math.max(frameCount, 1)).toFixed(1)}ms/frame`);
      
      expect(videoBuffer).toBeDefined();
      expect(videoBuffer!.length).toBeGreaterThan(1000);
      
      const frameData = await decodeFirstFrame(videoBuffer!);
      expect(frameData.width).toBe(960);
      expect(frameData.height).toBe(540);
      expect(frameData.hasContent).toBe(true);
      
      logger.debug("[1080p Test] Successfully exported 1080p composition scaled to 960x540");
      
    } finally {
      container.remove();
    }
  }, 90000);
  
  it("performance: measure actual export speed at multiple resolutions", async () => {
    const apiHost = getApiHost();

    const resolutions = [
      { name: "720p", width: 1280, height: 720 },
      { name: "1080p", width: 1920, height: 1080 }
    ];

    console.log("[PERF] ========================================");
    console.log("[PERF] Performance Benchmark Test");
    console.log("[PERF] ========================================");

    for (const res of resolutions) {
      const container = document.createElement("div");
      render(
        html`
        <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
          <ef-workbench style="width: 900px; height: 700px;">
            <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
              <ef-canvas style="width: ${res.width}px; height: ${res.height}px; display: block;">
                <ef-timegroup id="perf-test-${res.name}" mode="fixed" duration="2s"
                  style="width: ${res.width}px; height: ${res.height}px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                  
                  <ef-video src="bars-n-tone.mp4" 
                    style="width: 100%; height: 100%; object-fit: cover;"></ef-video>
                  
                  <ef-text duration="2s"
                    style="position: absolute; top: 50px; left: 50%; transform: translateX(-50%); color: white; font-size: 48px; font-weight: bold; text-shadow: 3px 3px 6px rgba(0,0,0,0.8);">
                    Performance Test ${res.name}
                  </ef-text>
                  
                  <ef-text timein="0s" timeout="1s"
                    style="position: absolute; bottom: 50px; left: 50px; color: yellow; font-size: 32px;">
                    First Half
                  </ef-text>
                  
                  <ef-text timein="1s" timeout="2s"
                    style="position: absolute; bottom: 50px; left: 50px; color: lime; font-size: 32px;">
                    Second Half
                  </ef-text>
                  
                </ef-timegroup>
              </ef-canvas>
            </ef-pan-zoom>
          </ef-workbench>
        </ef-configuration>
      `,
        container,
      );
      document.body.appendChild(container);
      
      try {
        const workbench = container.querySelector("ef-workbench") as EFWorkbench;
        const timegroup = container.querySelector(`#perf-test-${res.name}`) as EFTimegroup;
        
        await workbench.updateComplete;
        await timegroup.updateComplete;
        await timegroup.waitForMediaDurations();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`[PERF] Testing ${res.name} (${res.width}x${res.height})...`);
        
        const progressUpdates: RenderProgress[] = [];
        const startTime = performance.now();
        let firstFrameTime: number | null = null;
        let encodingStartTime: number | null = null;
        
        // Export 30 frames to get meaningful performance data
        const videoBuffer = await renderTimegroupToVideo(timegroup, {
          fps: 15, // 30 frames
          scale: 1, // Full resolution
          fromMs: 0,
          toMs: 2000,
          returnBuffer: true,
          streaming: false,
          contentReadyMode: "blocking",
          blockingTimeoutMs: 5000,
          onProgress: (progress) => {
            if (firstFrameTime === null && progress.currentFrame === 1) {
              firstFrameTime = performance.now();
            }
            if (encodingStartTime === null && progress.currentFrame === progress.totalFrames) {
              encodingStartTime = performance.now();
            }
            progressUpdates.push({ ...progress });
          },
        });
        
        const totalTime = performance.now() - startTime;
        const avgSpeedMultiplier = progressUpdates.length > 0 
          ? progressUpdates.reduce((sum, p) => sum + p.speedMultiplier, 0) / progressUpdates.length 
          : 0;
        const frameCount = progressUpdates.length > 0 ? progressUpdates[progressUpdates.length - 1]!.totalFrames : 0;
        const msPerFrame = totalTime / Math.max(frameCount, 1);
        
        // Calculate timing breakdown
        const timeToFirstFrame = firstFrameTime ? firstFrameTime - startTime : 0;
        const encodingTime = encodingStartTime ? totalTime - (encodingStartTime - startTime) : 0;
        const renderTime = totalTime - encodingTime;
        
        console.log(`[PERF] ${res.name}: ${totalTime.toFixed(0)}ms, ${frameCount} frames, ${avgSpeedMultiplier.toFixed(2)}x realtime, ${msPerFrame.toFixed(1)}ms/frame`);
        console.log(`[PERF]   - Setup: ${timeToFirstFrame.toFixed(0)}ms`);
        console.log(`[PERF]   - Render: ${renderTime.toFixed(0)}ms (${(renderTime / frameCount).toFixed(1)}ms/frame)`);
        console.log(`[PERF]   - Encoding: ${encodingTime.toFixed(0)}ms`);
        console.log(`[PERF]   - Speed details by frame:`);
        
        // Log speed multiplier progression for first, middle, and last frames
        if (progressUpdates.length >= 3) {
          const first = progressUpdates[0]!;
          const mid = progressUpdates[Math.floor(progressUpdates.length / 2)]!;
          const last = progressUpdates[progressUpdates.length - 1]!;
          console.log(`[PERF]     Frame 1: ${first.speedMultiplier.toFixed(2)}x`);
          console.log(`[PERF]     Frame ${mid.currentFrame}: ${mid.speedMultiplier.toFixed(2)}x`);
          console.log(`[PERF]     Frame ${last.currentFrame}: ${last.speedMultiplier.toFixed(2)}x`);
        }
        
        expect(videoBuffer).toBeDefined();
        expect(videoBuffer!.length).toBeGreaterThan(1000);
        
        const frameData = await decodeFirstFrame(videoBuffer!);
        expect(frameData.width).toBe(res.width);
        expect(frameData.height).toBe(res.height);
        expect(frameData.hasContent).toBe(true);
        
      } finally {
        container.remove();
      }
    }
    
    console.log("[PERF] ========================================");
    console.log("[PERF] Benchmark Complete");
    console.log("[PERF] ========================================");
    
  }, 180000);
  
});
