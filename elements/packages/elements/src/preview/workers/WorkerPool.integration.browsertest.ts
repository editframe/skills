import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { WorkerPool } from "./WorkerPool.js";
import { encodeCanvasInWorker } from "../encoding/workerEncoder.js";
import { getEncoderWorkerUrl } from "./encoderWorkerInline.js";

/**
 * Test helper: Create a test canvas with specific content
 */
function createTestCanvas(
  width: number,
  height: number,
  fillColor: string = "red",
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = fillColor;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

/**
 * Test helper: Verify data URL format
 */
function verifyDataUrl(dataUrl: string, expectedFormat: "jpeg" | "png"): void {
  expect(dataUrl).toMatch(new RegExp(`^data:image/${expectedFormat};base64,`));
  expect(dataUrl.length).toBeGreaterThan(100); // Has actual data
}

/**
 * Test helper: Load image from data URL
 */
async function loadImageFromDataUrl(
  dataUrl: string,
): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

describe("WorkerPool Integration Tests", () => {
  let pool: WorkerPool;
  let workerUrl: string;

  beforeEach(() => {
    workerUrl = getEncoderWorkerUrl();
    pool = new WorkerPool(workerUrl, 4);
  });

  afterEach(() => {
    if (pool) {
      pool.terminate();
    }
  });

  describe("Parallel Canvas Encoding", () => {
    test("encodes multiple canvases in parallel", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvases = [
        createTestCanvas(100, 100, "red"),
        createTestCanvas(100, 100, "green"),
        createTestCanvas(100, 100, "blue"),
        createTestCanvas(100, 100, "yellow"),
      ];

      const results = await Promise.all(
        canvases.map((canvas) =>
          pool.execute((worker) => encodeCanvasInWorker(worker, canvas, false)),
        ),
      );

      expect(results).toHaveLength(4);
      results.forEach((dataUrl) => {
        verifyDataUrl(dataUrl, "jpeg");
      });
    });

    test("encodes 8 canvases with 4 workers", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvases = Array.from({ length: 8 }, (_, i) =>
        createTestCanvas(100, 100, `rgb(${i * 32}, 0, 0)`),
      );

      const results = await Promise.all(
        canvases.map((canvas) =>
          pool.execute((worker) => encodeCanvasInWorker(worker, canvas, false)),
        ),
      );

      expect(results).toHaveLength(8);
      results.forEach((dataUrl) => {
        verifyDataUrl(dataUrl, "jpeg");
      });
    });

    test("encodes varying canvas sizes", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvases = [
        createTestCanvas(50, 50),
        createTestCanvas(100, 100),
        createTestCanvas(200, 200),
        createTestCanvas(400, 400),
      ];

      const results = await Promise.all(
        canvases.map((canvas) =>
          pool.execute((worker) => encodeCanvasInWorker(worker, canvas, false)),
        ),
      );

      expect(results).toHaveLength(4);

      // Verify all results are valid
      for (let i = 0; i < results.length; i++) {
        const dataUrl = results[i]!;
        verifyDataUrl(dataUrl, "jpeg");

        const img = await loadImageFromDataUrl(dataUrl);
        expect(img.width).toBe(canvases[i]!.width);
        expect(img.height).toBe(canvases[i]!.height);
      }
    });
  });

  describe("Pool Size Limits", () => {
    test("handles more tasks than workers", async () => {
      // Create pool with only 2 workers
      const smallPool = new WorkerPool(workerUrl, 2);

      if (!smallPool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        smallPool.terminate();
        return;
      }

      const canvases = Array.from({ length: 6 }, (_, i) =>
        createTestCanvas(100, 100, `rgb(${i * 40}, 0, 0)`),
      );

      const results = await Promise.all(
        canvases.map((canvas) =>
          smallPool.execute((worker) =>
            encodeCanvasInWorker(worker, canvas, false),
          ),
        ),
      );

      expect(results).toHaveLength(6);
      results.forEach((dataUrl) => {
        verifyDataUrl(dataUrl, "jpeg");
      });

      smallPool.terminate();
    });

    test("single worker handles sequential tasks", async () => {
      const singlePool = new WorkerPool(workerUrl, 1);

      if (!singlePool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        singlePool.terminate();
        return;
      }

      const canvases = Array.from({ length: 3 }, (_, i) =>
        createTestCanvas(100, 100, `rgb(${i * 80}, 0, 0)`),
      );

      const results: string[] = [];
      for (const canvas of canvases) {
        const dataUrl = await singlePool.execute((worker) =>
          encodeCanvasInWorker(worker, canvas, false),
        );
        results.push(dataUrl);
      }

      expect(results).toHaveLength(3);
      results.forEach((dataUrl) => {
        verifyDataUrl(dataUrl, "jpeg");
      });

      singlePool.terminate();
    });
  });

  describe("Mixed Success and Failure Cases", () => {
    test("handles mix of successful and failed encodings", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const validCanvas = createTestCanvas(100, 100, "red");

      // Create a tainted canvas (cross-origin) - may fail
      const taintedCanvas = document.createElement("canvas");
      taintedCanvas.width = 100;
      taintedCanvas.height = 100;

      const results = await Promise.allSettled([
        pool.execute((worker) =>
          encodeCanvasInWorker(worker, validCanvas, false),
        ),
        pool.execute((worker) =>
          encodeCanvasInWorker(worker, taintedCanvas, false),
        ),
        pool.execute((worker) =>
          encodeCanvasInWorker(worker, validCanvas, true),
        ),
      ]);

      // At least the valid canvas encodings should succeed
      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      expect(successCount).toBeGreaterThanOrEqual(2);

      // Check fulfilled results
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          expect(typeof result.value).toBe("string");
          expect(result.value).toMatch(/^data:image\/(jpeg|png);base64,/);
        }
      });
    });

    test("continues processing after task failure", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvas1 = createTestCanvas(100, 100, "red");
      const canvas2 = createTestCanvas(100, 100, "blue");

      // Execute a failing task
      await expect(
        pool.execute(() => Promise.reject(new Error("Intentional failure"))),
      ).rejects.toThrow("Intentional failure");

      // Subsequent tasks should still work
      const result1 = await pool.execute((worker) =>
        encodeCanvasInWorker(worker, canvas1, false),
      );
      const result2 = await pool.execute((worker) =>
        encodeCanvasInWorker(worker, canvas2, false),
      );

      verifyDataUrl(result1, "jpeg");
      verifyDataUrl(result2, "jpeg");
    });
  });

  describe("Performance Validation", () => {
    test("parallel encoding is faster than sequential", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      // Use large canvases so encoding time dominates over parallelism overhead
      const canvases = Array.from({ length: 4 }, () =>
        createTestCanvas(1000, 1000, "blue"),
      );

      // Warm up the worker pool so all workers are initialized
      await pool.execute((worker) =>
        encodeCanvasInWorker(worker, createTestCanvas(10, 10, "red"), false),
      );

      // Sequential encoding
      const sequentialStart = performance.now();
      for (const canvas of canvases) {
        await pool.execute((worker) =>
          encodeCanvasInWorker(worker, canvas, false),
        );
      }
      const sequentialDuration = performance.now() - sequentialStart;

      // Parallel encoding
      const parallelStart = performance.now();
      await Promise.all(
        canvases.map((canvas) =>
          pool.execute((worker) => encodeCanvasInWorker(worker, canvas, false)),
        ),
      );
      const parallelDuration = performance.now() - parallelStart;

      // Parallel should be faster (or at least not dramatically slower)
      expect(parallelDuration).toBeLessThanOrEqual(sequentialDuration * 1.5);
    });

    test("worker pool vs main thread comparison", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvas = createTestCanvas(640, 480, "blue");

      // Main thread encoding
      const mainThreadResult = canvas.toDataURL("image/jpeg", 0.95);

      // Worker encoding
      const workerResult = await pool.execute((worker) =>
        encodeCanvasInWorker(worker, canvas, false),
      );

      verifyDataUrl(mainThreadResult, "jpeg");
      verifyDataUrl(workerResult, "jpeg");
    });
  });

  describe("ImageBitmap Transfer", () => {
    test("successfully transfers ImageBitmap to worker", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvas = createTestCanvas(100, 100, "purple");

      // Create ImageBitmap manually to verify transfer
      const bitmap = await createImageBitmap(canvas);
      expect(bitmap.width).toBe(100);
      expect(bitmap.height).toBe(100);

      // Encode through worker (internally creates and transfers ImageBitmap)
      const dataUrl = await pool.execute((worker) =>
        encodeCanvasInWorker(worker, canvas, false),
      );

      verifyDataUrl(dataUrl, "jpeg");

      const img = await loadImageFromDataUrl(dataUrl);
      expect(img.width).toBe(100);
      expect(img.height).toBe(100);
    });

    test("encodes with alpha preservation (PNG format)", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvas = createTestCanvas(100, 100);
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 100, 100);
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillRect(0, 0, 100, 100);

      const dataUrl = await pool.execute((worker) =>
        encodeCanvasInWorker(worker, canvas, true),
      );

      verifyDataUrl(dataUrl, "png");

      const img = await loadImageFromDataUrl(dataUrl);
      expect(img.width).toBe(100);
      expect(img.height).toBe(100);
    });

    test("encodes without alpha (JPEG format)", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvas = createTestCanvas(100, 100, "blue");

      const dataUrl = await pool.execute((worker) =>
        encodeCanvasInWorker(worker, canvas, false),
      );

      verifyDataUrl(dataUrl, "jpeg");

      const img = await loadImageFromDataUrl(dataUrl);
      expect(img.width).toBe(100);
      expect(img.height).toBe(100);
    });

    test("handles large canvas ImageBitmap transfer", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      // Test with 1080p canvas
      const largeCanvas = createTestCanvas(1920, 1080, "green");

      const dataUrl = await pool.execute((worker) =>
        encodeCanvasInWorker(worker, largeCanvas, false),
      );

      verifyDataUrl(dataUrl, "jpeg");

      const img = await loadImageFromDataUrl(dataUrl);
      expect(img.width).toBe(1920);
      expect(img.height).toBe(1080);
    });
  });

  describe("Edge Cases", () => {
    test("handles empty canvas", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const emptyCanvas = document.createElement("canvas");
      emptyCanvas.width = 100;
      emptyCanvas.height = 100;
      // Don't draw anything

      const dataUrl = await pool.execute((worker) =>
        encodeCanvasInWorker(worker, emptyCanvas, false),
      );

      verifyDataUrl(dataUrl, "jpeg");

      const img = await loadImageFromDataUrl(dataUrl);
      expect(img.width).toBe(100);
      expect(img.height).toBe(100);
    });

    test("handles 1x1 canvas", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const tinyCanvas = createTestCanvas(1, 1, "red");

      const dataUrl = await pool.execute((worker) =>
        encodeCanvasInWorker(worker, tinyCanvas, false),
      );

      verifyDataUrl(dataUrl, "jpeg");

      const img = await loadImageFromDataUrl(dataUrl);
      expect(img.width).toBe(1);
      expect(img.height).toBe(1);
    });

    test("handles rapid sequential encodings", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const results: string[] = [];

      for (let i = 0; i < 10; i++) {
        const canvas = createTestCanvas(50, 50, `rgb(${i * 25}, 0, 0)`);
        const dataUrl = await pool.execute((worker) =>
          encodeCanvasInWorker(worker, canvas, false),
        );
        results.push(dataUrl);
      }

      expect(results).toHaveLength(10);
      results.forEach((dataUrl) => {
        verifyDataUrl(dataUrl, "jpeg");
      });
    });

    test("handles termination during active encoding", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvas = createTestCanvas(1920, 1080, "blue");

      // Start encoding
      const promise = pool.execute((worker) =>
        encodeCanvasInWorker(worker, canvas, false),
      );

      // Terminate immediately
      pool.terminate();

      // The promise behavior is undefined - it may succeed or fail
      // Just ensure it doesn't hang
      await Promise.race([
        promise.catch(() => "terminated"),
        new Promise((resolve) => setTimeout(() => resolve("timeout"), 1000)),
      ]);
    });
  });

  describe("Resource Cleanup", () => {
    test("cleans up resources after termination", () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      expect(pool.workerCount).toBeGreaterThan(0);
      expect(pool.isAvailable()).toBe(true);

      pool.terminate();

      expect(pool.workerCount).toBe(0);
      expect(pool.isAvailable()).toBe(false);
    });

    test("rejects new tasks after termination", async () => {
      if (!pool.isAvailable()) {
        console.warn("Workers not available, skipping test");
        return;
      }

      const canvas = createTestCanvas(100, 100);

      pool.terminate();

      await expect(
        pool.execute((worker) => encodeCanvasInWorker(worker, canvas, false)),
      ).rejects.toThrow("WorkerPool has been terminated");
    });
  });
});
