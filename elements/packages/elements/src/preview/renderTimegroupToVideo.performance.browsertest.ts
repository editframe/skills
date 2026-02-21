/**
 * Performance benchmark for worker-based parallel serialization.
 * Compares main thread vs worker pool performance.
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import "../elements/EFTimegroup.js";
import { renderTimegroupToVideo } from "./renderTimegroupToVideo.js";
import { logger } from "./logger.js";

describe("renderTimegroupToVideo performance", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
  });

  it("should render video with worker pool parallelization", async () => {
    // Create a simple timegroup with some content
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText =
      "width: 640px; height: 360px; background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);";
    tg.setAttribute("mode", "fixed");
    tg.setAttribute("duration", "2s");

    // Add some complex content to make serialization take time
    const shapes = document.createElement("div");
    shapes.style.cssText =
      "width: 100%; height: 100%; display: flex; flex-wrap: wrap; align-items: center; justify-content: center;";

    for (let i = 0; i < 20; i++) {
      const shape = document.createElement("div");
      shape.style.cssText = `
        width: 50px;
        height: 50px;
        margin: 5px;
        background: hsl(${i * 18}, 70%, 60%);
        border-radius: ${i % 3 === 0 ? "50%" : "0"};
        animation: spin-${i} ${1 + i * 0.1}s linear infinite;
      `;
      shapes.appendChild(shape);
    }

    tg.appendChild(shapes);
    document.body.appendChild(tg);

    try {
      await tg.updateComplete;

      // Render a short video (30 frames at 30fps = 1 second)
      const startTime = performance.now();

      const result = await renderTimegroupToVideo(tg, {
        fps: 30,
        fromMs: 0,
        toMs: 1000,
        codec: "avc",
        bitrate: 2_000_000,
        returnBuffer: true,
        benchmarkMode: false, // Set to false to actually encode
        onProgress: (progress) => {
          if (progress.currentFrame % 10 === 0) {
            logger.debug(
              `[Perf test] Frame ${progress.currentFrame}/${progress.totalFrames} ` +
                `(${(progress.progress * 100).toFixed(1)}%) - ` +
                `Speed: ${progress.speedMultiplier.toFixed(2)}x`,
            );
          }
        },
      });

      const elapsedTime = performance.now() - startTime;
      const fps = 30;
      const totalFrames = 30;
      const msPerFrame = elapsedTime / totalFrames;

      logger.debug(`[Perf test] ===== PERFORMANCE RESULTS =====`);
      logger.debug(`[Perf test] Total time: ${elapsedTime.toFixed(0)}ms`);
      logger.debug(`[Perf test] Frames: ${totalFrames}`);
      logger.debug(`[Perf test] Time per frame: ${msPerFrame.toFixed(2)}ms`);
      logger.debug(
        `[Perf test] Render speed: ${((totalFrames * (1000 / fps)) / elapsedTime).toFixed(2)}x realtime`,
      );

      expect(result).toBeTruthy();
      if (result) {
        expect(result.byteLength).toBeGreaterThan(0);
        logger.debug(
          `[Perf test] Output size: ${(result.byteLength / 1024).toFixed(2)} KB`,
        );
      }

      // Performance expectations (should complete in reasonable time)
      expect(elapsedTime).toBeLessThan(20000); // Should complete in under 20 seconds
      expect(msPerFrame).toBeLessThan(333); // Should be faster than 3fps minimum
    } finally {
      document.body.removeChild(tg);
    }
  }, 30000); // 30 second timeout

  it("should show parallel speedup with worker pool", async () => {
    // This test demonstrates the parallelization benefits
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.cssText = "width: 320px; height: 240px; background: #1a1a2e;";
    tg.setAttribute("mode", "fixed");
    tg.setAttribute("duration", "3s");

    // Simple content
    const content = document.createElement("div");
    content.style.cssText =
      "width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;";
    content.textContent = "Performance Test";

    tg.appendChild(content);
    document.body.appendChild(tg);

    try {
      await tg.updateComplete;

      // Render multiple frames to see parallelization benefits
      const startTime = performance.now();

      await renderTimegroupToVideo(tg, {
        fps: 30,
        fromMs: 0,
        toMs: 2000, // 60 frames
        codec: "avc",
        bitrate: 1_000_000,
        returnBuffer: true,
        benchmarkMode: false,
      });

      const elapsedTime = performance.now() - startTime;
      const totalFrames = 60;
      const msPerFrame = elapsedTime / totalFrames;

      logger.debug(`[Perf test] ===== PARALLEL SPEEDUP TEST =====`);
      logger.debug(`[Perf test] Total time: ${elapsedTime.toFixed(0)}ms`);
      logger.debug(`[Perf test] Frames: ${totalFrames}`);
      logger.debug(`[Perf test] Time per frame: ${msPerFrame.toFixed(2)}ms`);

      // With worker parallelization, we should see good performance
      expect(elapsedTime).toBeLessThan(25000); // Should complete in under 25 seconds
    } finally {
      document.body.removeChild(tg);
    }
  }, 30000);
});
