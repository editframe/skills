import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getEncoderWorkerUrl } from "./encoderWorkerInline.js";

/**
 * Unit tests for encoderWorker script - runs in browser environment
 * Tests the worker's message handling, encoding logic, and error handling.
 */

/**
 * Test helper: Wait for worker message with timeout
 */
function waitForWorkerMessage(worker: Worker, timeout: number = 5000): Promise<MessageEvent> {
  return new Promise<MessageEvent>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for worker message after ${timeout}ms`));
    }, timeout);

    const handler = (event: MessageEvent) => {
      clearTimeout(timer);
      worker.removeEventListener("message", handler);
      resolve(event);
    };

    worker.addEventListener("message", handler);
  });
}

/**
 * Test helper: Create test ImageBitmap from canvas
 */
async function createTestImageBitmap(
  width: number,
  height: number,
  fillColor: string = "red",
): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = fillColor;
  ctx.fillRect(0, 0, width, height);
  return await createImageBitmap(canvas);
}

describe("encoderWorker Script Tests", () => {
  let worker: Worker;
  let workerUrl: string;

  beforeEach(() => {
    workerUrl = getEncoderWorkerUrl();
    worker = new Worker(workerUrl, { type: "module" });
  });

  afterEach(() => {
    if (worker) {
      worker.terminate();
    }
  });

  describe("Worker Initialization", () => {
    test("sends startup message on load", async () => {
      const event = await waitForWorkerMessage(worker, 1000);

      expect(event.data).toBe("encoderWorker-loaded");
    });

    test("can receive messages after initialization", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      // Send a test message
      const bitmap = await createTestImageBitmap(10, 10);
      worker.postMessage(
        {
          taskId: "init-test",
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data).toHaveProperty("taskId");
      expect(response.data.taskId).toBe("init-test");
    });
  });

  describe("Encoding Request Handling", () => {
    test("responds to valid JPEG encoding request", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(100, 100, "blue");
      const taskId = "jpeg-test-123";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data).toMatchObject({
        taskId,
        dataUrl: expect.stringMatching(/^data:image\/jpeg;base64,/),
      });
      expect(response.data.error).toBeUndefined();
    });

    test("responds to valid PNG encoding request", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(100, 100, "rgba(255, 0, 0, 0.5)");
      const taskId = "png-test-456";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: true,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data).toMatchObject({
        taskId,
        dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
      });
      expect(response.data.error).toBeUndefined();
    });

    test("handles multiple sequential requests", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      for (let i = 0; i < 3; i++) {
        const bitmap = await createTestImageBitmap(50, 50, `rgb(${i * 80}, 0, 0)`);
        const taskId = `multi-test-${i}`;

        worker.postMessage(
          {
            taskId,
            bitmap,
            preserveAlpha: false,
          },
          [bitmap],
        );

        const response = await waitForWorkerMessage(worker, 5000);

        expect(response.data.taskId).toBe(taskId);
        expect(response.data.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
      }
    });
  });

  describe("ImageBitmap to Data URL Conversion", () => {
    test("encodes different canvas sizes correctly", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const sizes = [
        { width: 50, height: 50 },
        { width: 100, height: 200 },
        { width: 300, height: 100 },
      ];

      for (const size of sizes) {
        const bitmap = await createTestImageBitmap(size.width, size.height);
        const taskId = `size-test-${size.width}x${size.height}`;

        worker.postMessage(
          {
            taskId,
            bitmap,
            preserveAlpha: false,
          },
          [bitmap],
        );

        const response = await waitForWorkerMessage(worker, 5000);

        expect(response.data.taskId).toBe(taskId);
        expect(response.data.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
        expect(response.data.dataUrl.length).toBeGreaterThan(100);
      }
    });

    test("produces valid base64 data URL", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(100, 100, "green");
      const taskId = "base64-test";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      const dataUrl = response.data.dataUrl;
      expect(dataUrl).toMatch(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/);

      // Verify the data URL can be loaded as an image
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      expect(img.width).toBe(100);
      expect(img.height).toBe(100);
    });
  });

  describe("Format Selection", () => {
    test("uses JPEG when preserveAlpha is false", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(100, 100, "purple");
      const taskId = "jpeg-format-test";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    });

    test("uses PNG when preserveAlpha is true", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(100, 100, "rgba(0, 255, 0, 0.7)");
      const taskId = "png-format-test";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: true,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data.dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    test("PNG preserves transparency information", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d")!;
      // Create transparent canvas
      ctx.clearRect(0, 0, 100, 100);
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillRect(25, 25, 50, 50);

      const bitmap = await createImageBitmap(canvas);
      const taskId = "transparency-test";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: true,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data.dataUrl).toMatch(/^data:image\/png;base64,/);

      // Verify the image loads correctly
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = response.data.dataUrl;
      });

      expect(img.width).toBe(100);
      expect(img.height).toBe(100);
    });
  });

  describe("TaskId Correctness", () => {
    test("returns same taskId in response", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(100, 100);
      const taskId = "unique-task-id-12345";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data.taskId).toBe(taskId);
    });

    test("handles UUID-style taskIds", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(50, 50);
      const taskId = "550e8400-e29b-41d4-a716-446655440000";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data.taskId).toBe(taskId);
    });

    test("handles complex taskIds with special characters", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(50, 50);
      const taskId = "task-2024-01-15_10:30:45.123";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data.taskId).toBe(taskId);
    });
  });

  describe("Error Cases", () => {
    test("handles empty/invalid bitmap gracefully", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const taskId = "invalid-bitmap-test";

      // Send invalid data (no bitmap)
      worker.postMessage({
        taskId,
        bitmap: null,
        preserveAlpha: false,
      });

      const response = await waitForWorkerMessage(worker, 5000);

      // Worker should either error or handle gracefully
      expect(response.data.taskId).toBe(taskId);
      if (response.data.error) {
        expect(typeof response.data.error).toBe("string");
      }
    });

    test("handles very small canvases (1x1)", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(1, 1, "red");
      const taskId = "tiny-bitmap-test";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);

      expect(response.data.taskId).toBe(taskId);
      expect(response.data.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    });

    test("handles large canvases (1920x1080)", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(1920, 1080, "blue");
      const taskId = "large-bitmap-test";

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 10000); // Longer timeout for large image

      expect(response.data.taskId).toBe(taskId);
      expect(response.data.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
      expect(response.data.dataUrl.length).toBeGreaterThan(1000);
    });
  });

  describe("Performance Characteristics", () => {
    test("processes requests in reasonable time", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const bitmap = await createTestImageBitmap(640, 480, "orange");
      const taskId = "performance-test";

      const startTime = performance.now();

      worker.postMessage(
        {
          taskId,
          bitmap,
          preserveAlpha: false,
        },
        [bitmap],
      );

      const response = await waitForWorkerMessage(worker, 5000);
      const duration = performance.now() - startTime;

      expect(response.data.taskId).toBe(taskId);
      expect(response.data.dataUrl).toMatch(/^data:image\/jpeg;base64,/);

      // Should complete in under 1 second for 640x480
      expect(duration).toBeLessThan(1000);
    });

    test("handles rapid sequential requests efficiently", async () => {
      // Wait for initialization
      await waitForWorkerMessage(worker, 1000);

      const count = 5;
      const startTime = performance.now();

      for (let i = 0; i < count; i++) {
        const bitmap = await createTestImageBitmap(100, 100, `rgb(${i * 50}, 0, 0)`);
        const taskId = `rapid-test-${i}`;

        worker.postMessage(
          {
            taskId,
            bitmap,
            preserveAlpha: false,
          },
          [bitmap],
        );

        const response = await waitForWorkerMessage(worker, 5000);
        expect(response.data.taskId).toBe(taskId);
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / count;

      // Average should be reasonable
      expect(avgTime).toBeLessThan(500);
    });
  });
});
