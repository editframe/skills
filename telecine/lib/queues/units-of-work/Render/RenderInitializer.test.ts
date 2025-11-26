import { describe, test, expect } from "vitest";
import { RenderInitializerQueue } from "./RenderInitializerQueue";
import { RenderInitializerWorker } from "./RenderInitializer";

describe("RenderInitializer", () => {
  describe("Queue Configuration", () => {
    test("initializes queue with correct settings", () => {
      expect(RenderInitializerQueue.name).toBe("render-initializer");
      expect(RenderInitializerQueue.maxWorkerCount).toBeGreaterThan(0);
      expect(RenderInitializerQueue.workerConcurrency).toBeGreaterThan(0);
    });

    test("has processStarts handler", () => {
      expect(RenderInitializerQueue.processStarts).toBeDefined();
      expect(typeof RenderInitializerQueue.processStarts).toBe("function");
    });
  });

  describe("Worker Lifecycle", () => {
    test("worker initializes with queue binding", () => {
      expect(RenderInitializerWorker.queue).toBe(RenderInitializerQueue);
    });

    test("worker has execute method", () => {
      expect(RenderInitializerWorker.execute).toBeDefined();
      expect(typeof RenderInitializerWorker.execute).toBe("function");
    });
  });
});
