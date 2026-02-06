/**
 * Test that canvas content driven by addFrameTask renders correctly in render clones.
 * 
 * This validates that synchronous rendering works without relying on requestAnimationFrame,
 * which is critical for:
 * - Rendering in hidden browser tabs
 * - Video export at any FPS
 * - Deterministic frame capture
 * 
 * While this test uses Canvas 2D for simplicity, the same principle applies to WebGL/Three.js
 * rendering via the flushR3F() function in the telecine R3F components.
 */

import { describe, test, expect, beforeEach } from "vitest";
import type { EFTimegroup } from "./EFTimegroup.js";
import "./EFTimegroup.js";

describe("Canvas addFrameTask render clone synchronous rendering", () => {
  beforeEach(() => {
    while (document.body.children.length) {
      document.body.children[0]?.remove();
    }
  });

  test("should render canvas content synchronously in render clone", async () => {
    // Create a minimal timegroup with a canvas
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.width = "400px";
    tg.style.height = "300px";
    tg.setAttribute("duration", "1s");
    
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.id = "test-canvas";
    
    tg.appendChild(canvas);
    
    // Use initializer to set up rendering on both prime and clone
    tg.initializer = (instance) => {
      const instanceCanvas = instance.querySelector("#test-canvas") as HTMLCanvasElement;
      if (!instanceCanvas) return;
      
      const ctx = instanceCanvas.getContext("2d")!;
      
      // Register frame task that updates canvas based on time
      // This simulates what Three.js/R3F does with gl.render()
      instance.addFrameTask(({ currentTimeMs }) => {
        // Change color from red (0ms) to blue (1000ms)
        const t = currentTimeMs / 1000; // 0 to 1
        const r = Math.floor(255 * (1 - t));
        const b = Math.floor(255 * t);
        
        // Fill canvas with time-based color
        ctx.fillStyle = `rgb(${r}, 0, ${b})`;
        ctx.fillRect(0, 0, 400, 300);
      });
    };
    
    document.body.appendChild(tg);
    await tg.updateComplete;

    // Create render clone
    const { clone, cleanup } = await tg.createRenderClone();

    try {
      // Find the canvas in the clone
      const cloneCanvas = clone.querySelector("#test-canvas") as HTMLCanvasElement;
      expect(cloneCanvas).toBeTruthy();
      expect(cloneCanvas.width).toBe(400);
      expect(cloneCanvas.height).toBe(300);

      const cloneCtx = cloneCanvas.getContext("2d")!;
      
      // Seek to 0ms and capture pixels
      await clone.seekForRender(0);
      const pixels0 = cloneCtx.getImageData(200, 150, 1, 1).data; // Center pixel
      
      // Seek to 900ms (near end but within duration) and capture pixels
      await clone.seekForRender(900);
      const pixels900 = cloneCtx.getImageData(200, 150, 1, 1).data; // Center pixel

      // Verify that pixels changed (red at 0ms, blue at 900ms)
      // At 0ms: should be red (high R, low B)
      expect(pixels0[0]).toBeGreaterThan(200); // Red channel high at start
      expect(pixels0[2]).toBeLessThan(50);     // Blue channel low at start
      
      // At 900ms: should be mostly blue (low R, high B)
      // t = 900/1000 = 0.9, so r = 255 * 0.1 = 25, b = 255 * 0.9 = 229
      expect(pixels900[0]).toBeLessThan(50);     // Red channel low at end
      expect(pixels900[2]).toBeGreaterThan(200); // Blue channel high at end

      // Verify pixels are significantly different
      const redDiff = Math.abs(pixels0[0] - pixels900[0]);
      const blueDiff = Math.abs(pixels0[2] - pixels900[2]);
      
      expect(redDiff).toBeGreaterThan(150);
      expect(blueDiff).toBeGreaterThan(150);

    } finally {
      cleanup();
      document.body.removeChild(tg);
    }
  });

  test("should render deterministically at same time position", async () => {
    // Create timegroup with canvas
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.style.width = "400px";
    tg.style.height = "300px";
    tg.setAttribute("duration", "1s");
    
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    canvas.id = "test-canvas-2";
    tg.appendChild(canvas);
    
    // Use initializer to set up rendering
    tg.initializer = (instance) => {
      const instanceCanvas = instance.querySelector("#test-canvas-2") as HTMLCanvasElement;
      if (!instanceCanvas) return;
      
      const ctx = instanceCanvas.getContext("2d")!;
      
      instance.addFrameTask(({ currentTimeMs }) => {
        // Draw something deterministic based on time
        const t = currentTimeMs / 1000;
        const x = Math.floor(t * 300); // Position moves 0 to 300
        
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = "#00ff00";
        ctx.fillRect(x, 100, 50, 50);
      });
    };
    
    document.body.appendChild(tg);
    await tg.updateComplete;

    // Create render clone
    const { clone, cleanup } = await tg.createRenderClone();

    try {
      const cloneCanvas = clone.querySelector("#test-canvas-2") as HTMLCanvasElement;
      const cloneCtx = cloneCanvas.getContext("2d")!;

      // Seek to 500ms twice and verify pixels are identical
      await clone.seekForRender(500);
      const pixels1 = cloneCtx.getImageData(0, 0, 400, 300).data;

      await clone.seekForRender(500);
      const pixels2 = cloneCtx.getImageData(0, 0, 400, 300).data;

      // Compare all pixels - should be identical (deterministic rendering)
      let identicalPixels = true;
      for (let i = 0; i < pixels1.length; i++) {
        if (pixels1[i] !== pixels2[i]) {
          identicalPixels = false;
          break;
        }
      }

      expect(identicalPixels).toBe(true);

    } finally {
      cleanup();
      document.body.removeChild(tg);
    }
  });
});
