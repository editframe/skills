/**
 * Tests for canvas encoding module.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { encodeCanvasesInParallel, resetWorkerPool } from "./canvasEncoder.js";
import { encodeCanvasOnMainThread } from "./mainThreadEncoder.js";

describe("canvasEncoder", () => {
  beforeEach(() => {
    resetWorkerPool();
  });

  describe("encodeCanvasOnMainThread", () => {
    it("should return null for empty canvas", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 0;
      canvas.height = 0;

      const result = encodeCanvasOnMainThread(canvas, 1);
      expect(result).toBeNull();
    });

    it("should encode canvas to PNG when preserveAlpha is true", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      canvas.dataset.preserveAlpha = "true";

      const result = encodeCanvasOnMainThread(canvas, 1);
      expect(result).not.toBeNull();
      expect(result?.preserveAlpha).toBe(true);
      expect(result?.dataUrl).toMatch(/^data:image\/png/);
    });

    it("should encode canvas to JPEG when preserveAlpha is false", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;

      const result = encodeCanvasOnMainThread(canvas, 1);
      expect(result).not.toBeNull();
      expect(result?.preserveAlpha).toBe(false);
      expect(result?.dataUrl).toMatch(/^data:image\/jpeg/);
    });

    it("should scale canvas when scale < 1", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;

      const ctx = canvas.getContext("2d");
      ctx?.fillRect(0, 0, 100, 100);

      const result = encodeCanvasOnMainThread(canvas, 0.5);
      expect(result).not.toBeNull();
      expect(result?.dataUrl).toBeTruthy();
    });
  });

  describe("encodeCanvasesInParallel", () => {
    it("should encode multiple canvases", async () => {
      const canvases = [
        createTestCanvas(100, 100),
        createTestCanvas(200, 200),
        createTestCanvas(300, 300),
      ];

      const results = await encodeCanvasesInParallel(canvases);

      expect(results).toHaveLength(3);
      expect(results[0]?.canvas).toBe(canvases[0]);
      expect(results[1]?.canvas).toBe(canvases[1]);
      expect(results[2]?.canvas).toBe(canvases[2]);

      results.forEach((result) => {
        expect(result.dataUrl).toBeTruthy();
        expect(result.dataUrl).toMatch(/^data:image\/(jpeg|png)/);
      });
    });

    it("should filter out empty canvases", async () => {
      const canvases = [
        createTestCanvas(100, 100),
        createTestCanvas(0, 0), // empty
        createTestCanvas(200, 200),
      ];

      const results = await encodeCanvasesInParallel(canvases);

      expect(results).toHaveLength(2);
      expect(results[0]?.canvas).toBe(canvases[0]);
      expect(results[1]?.canvas).toBe(canvases[2]);
    });

    it("should apply scale factor", async () => {
      const canvases = [createTestCanvas(100, 100)];

      const results = await encodeCanvasesInParallel(canvases, { scale: 0.5 });

      expect(results).toHaveLength(1);
      expect(results[0]?.dataUrl).toBeTruthy();
    });

    it("should handle empty array", async () => {
      const results = await encodeCanvasesInParallel([]);
      expect(results).toHaveLength(0);
    });
  });
});

// Helper function to create a test canvas
function createTestCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  // Draw something on the canvas so it has content
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, width, height);
  }

  return canvas;
}
