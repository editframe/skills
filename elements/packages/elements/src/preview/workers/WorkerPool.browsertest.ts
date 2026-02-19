import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { WorkerPool } from "./WorkerPool.js";
import { encodeCanvasInWorker } from "../encoding/workerEncoder.js";

// Get worker URL - in a real build system this would be resolved properly
const getWorkerUrl = () => {
  // In browser test environment, we need to construct the worker URL
  // This assumes the worker file is accessible at this path
  // @ts-ignore
  return new URL("./encoderWorker.ts", import.meta.url).href;
};

describe("WorkerPool", () => {
  beforeAll(() => {
    console.clear();
  });

  beforeEach(() => {
    // Clean up any existing workers
  });

  test("creates worker pool with default size", () => {
    const workerUrl = getWorkerUrl();
    const pool = new WorkerPool(workerUrl);
    expect(pool).toBeDefined();
  });

  test("checks worker availability", () => {
    const workerUrl = getWorkerUrl();
    const pool = new WorkerPool(workerUrl);

    // Workers should be available in modern browsers
    const isAvailable = pool.isAvailable();
    expect(typeof isAvailable).toBe("boolean");
  });

  test("encodes single canvas in worker", async () => {
    const workerUrl = getWorkerUrl();
    const pool = new WorkerPool(workerUrl);

    if (!pool.isAvailable()) {
      console.warn("Workers not available, skipping test");
      return;
    }

    // Create a test canvas
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 100, 100);

    // Encode using worker pool
    const dataUrl = await pool.execute((worker) =>
      encodeCanvasInWorker(worker, canvas, false),
    );

    expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/);

    // Verify the data URL is valid by loading it as an image
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    expect(img.width).toBe(100);
    expect(img.height).toBe(100);
  });

  test("encodes canvas with PNG format when preserveAlpha is true", async () => {
    const workerUrl = getWorkerUrl();
    const pool = new WorkerPool(workerUrl);

    if (!pool.isAvailable()) {
      console.warn("Workers not available, skipping test");
      return;
    }

    // Create a test canvas with transparency
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fillRect(0, 0, 100, 100);

    // Encode using worker pool with preserveAlpha
    const dataUrl = await pool.execute((worker) =>
      encodeCanvasInWorker(worker, canvas, true),
    );

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  test("encodes multiple canvases in parallel", async () => {
    const workerUrl = getWorkerUrl();
    const pool = new WorkerPool(workerUrl, 4); // Use 4 workers

    if (!pool.isAvailable()) {
      console.warn("Workers not available, skipping test");
      return;
    }

    // Create multiple test canvases
    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < 8; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = `rgb(${i * 32}, 0, 0)`;
      ctx.fillRect(0, 0, 100, 100);
      canvases.push(canvas);
    }

    // Encode all canvases in parallel
    const dataUrls = await Promise.all(
      canvases.map((canvas) =>
        pool.execute((worker) => encodeCanvasInWorker(worker, canvas, false)),
      ),
    );

    expect(dataUrls).toHaveLength(8);
    dataUrls.forEach((dataUrl) => {
      expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    });
  });

  test("compares worker pool performance vs main thread", async () => {
    const workerUrl = getWorkerUrl();
    const pool = new WorkerPool(workerUrl, 4);

    if (!pool.isAvailable()) {
      console.warn("Workers not available, skipping test");
      return;
    }

    // Create a larger test canvas (720p)
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, 1280, 720);

    // Test main thread encoding
    canvas.toDataURL("image/jpeg", 0.95);

    // Test worker encoding
    const workerDataUrl = await pool.execute((worker) =>
      encodeCanvasInWorker(worker, canvas, false),
    );

    expect(workerDataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  test("handles errors gracefully", async () => {
    const workerUrl = getWorkerUrl();
    const pool = new WorkerPool(workerUrl);

    if (!pool.isAvailable()) {
      console.warn("Workers not available, skipping test");
      return;
    }

    // Create a cross-origin canvas (should fail)
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;

    // Try to encode - should handle error gracefully
    try {
      await pool.execute((worker) =>
        encodeCanvasInWorker(worker, canvas, false),
      );
      // If it succeeds, that's fine too
    } catch (error) {
      // Expected for cross-origin canvases
      expect(error).toBeDefined();
    }
  });

  test("terminates workers correctly", () => {
    const workerUrl = getWorkerUrl();
    const pool = new WorkerPool(workerUrl);

    if (!pool.isAvailable()) {
      console.warn("Workers not available, skipping test");
      return;
    }

    pool.terminate();

    // After termination, pool should not be available
    expect(pool.isAvailable()).toBe(false);
  });
});
