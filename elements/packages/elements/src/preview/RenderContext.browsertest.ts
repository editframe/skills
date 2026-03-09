/**
 * Tests for RenderContext caching system.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { RenderContext } from "./RenderContext.js";

/**
 * Create a mock element with renderVersion for testing.
 */
function createMockVersionedElement(id: string, version: number): Element {
  return {
    tagName: "EF-IMAGE",
    id,
    renderVersion: version,
  } as unknown as Element;
}

describe("RenderContext", () => {
  let context: RenderContext;

  beforeEach(() => {
    context = new RenderContext();
  });

  describe("canvas cache (static elements)", () => {
    test("returns undefined for element without renderVersion", () => {
      const element = document.createElement("div");
      expect(context.getCachedCanvasDataUrl(element)).toBeUndefined();
    });

    test("caches dataURL for element with renderVersion", () => {
      const element = createMockVersionedElement("test-image", 1);
      context.setCachedCanvasDataUrl(element, "data:image/png;base64,abc");
      expect(context.getCachedCanvasDataUrl(element)).toBe("data:image/png;base64,abc");
    });

    test("returns undefined for different renderVersion", () => {
      const element1 = createMockVersionedElement("test-image", 1);
      context.setCachedCanvasDataUrl(element1, "data:image/png;base64,abc");

      // Create element with different version (simulates version change)
      const element2 = createMockVersionedElement("test-image", 2);
      expect(context.getCachedCanvasDataUrl(element2)).toBeUndefined();
    });

    test("tracks cache hits and misses", () => {
      const element = createMockVersionedElement("test-image", 1);

      // Miss
      context.getCachedCanvasDataUrl(element);
      expect(context.metrics.canvasCacheMisses).toBe(1);
      expect(context.metrics.canvasCacheHits).toBe(0);

      // Set and hit
      context.setCachedCanvasDataUrl(element, "data:image/png;base64,abc");
      context.getCachedCanvasDataUrl(element);
      expect(context.metrics.canvasCacheHits).toBe(1);
    });
  });

  describe("video frame cache", () => {
    test("caches video frame by element and timestamp", () => {
      const video = document.createElement("div");
      video.id = "test-video";

      const frame = {
        dataUrl: "data:image/jpeg;base64,xyz",
        width: 1920,
        height: 1080,
      };
      context.setCachedVideoFrame(video, 5000, frame);

      const cached = context.getCachedVideoFrame(video, 5000);
      expect(cached).toEqual(frame);
    });

    test("returns undefined for different timestamp", () => {
      const video = document.createElement("div");
      video.id = "test-video";

      const frame = {
        dataUrl: "data:image/jpeg;base64,xyz",
        width: 1920,
        height: 1080,
      };
      context.setCachedVideoFrame(video, 5000, frame);

      expect(context.getCachedVideoFrame(video, 5001)).toBeUndefined();
    });

    test("different videos have separate caches", () => {
      const video1 = document.createElement("div");
      video1.id = "video-1";
      const video2 = document.createElement("div");
      video2.id = "video-2";

      const frame1 = {
        dataUrl: "data:image/jpeg;base64,frame1",
        width: 1920,
        height: 1080,
      };
      const frame2 = {
        dataUrl: "data:image/jpeg;base64,frame2",
        width: 1920,
        height: 1080,
      };

      context.setCachedVideoFrame(video1, 5000, frame1);
      context.setCachedVideoFrame(video2, 5000, frame2);

      expect(context.getCachedVideoFrame(video1, 5000)?.dataUrl).toBe(
        "data:image/jpeg;base64,frame1",
      );
      expect(context.getCachedVideoFrame(video2, 5000)?.dataUrl).toBe(
        "data:image/jpeg;base64,frame2",
      );
    });

    test("rounds timestamps to nearest ms", () => {
      const video = document.createElement("div");
      video.id = "test-video";

      const frame = {
        dataUrl: "data:image/jpeg;base64,xyz",
        width: 1920,
        height: 1080,
      };
      context.setCachedVideoFrame(video, 5000.4, frame);

      // Should find it at rounded value
      expect(context.getCachedVideoFrame(video, 5000)).toEqual(frame);
    });

    test("tracks cache hits and misses", () => {
      const video = document.createElement("div");
      video.id = "test-video";

      // Miss
      context.getCachedVideoFrame(video, 5000);
      expect(context.metrics.videoFrameCacheMisses).toBe(1);
      expect(context.metrics.videoFrameCacheHits).toBe(0);

      // Set and hit
      context.setCachedVideoFrame(video, 5000, {
        dataUrl: "test",
        width: 100,
        height: 100,
      });
      context.getCachedVideoFrame(video, 5000);
      expect(context.metrics.videoFrameCacheHits).toBe(1);
    });
  });

  describe("disposal", () => {
    test("dispose clears all caches", () => {
      const element = createMockVersionedElement("test-image", 1);
      context.setCachedCanvasDataUrl(element, "data:test");

      const video = document.createElement("div");
      video.id = "test-video";
      context.setCachedVideoFrame(video, 5000, {
        dataUrl: "test",
        width: 100,
        height: 100,
      });

      expect(context.canvasCacheSize).toBeGreaterThan(0);
      expect(context.videoFrameCacheSize).toBeGreaterThan(0);

      context.dispose();

      expect(context.canvasCacheSize).toBe(0);
      expect(context.videoFrameCacheSize).toBe(0);
      expect(context.disposed).toBe(true);
    });

    test("operations are no-op after disposal", () => {
      context.dispose();

      const element = createMockVersionedElement("test-image", 1);

      // Should not throw, just no-op
      context.setCachedCanvasDataUrl(element, "data:test");
      expect(context.getCachedCanvasDataUrl(element)).toBeUndefined();

      const video = document.createElement("div");
      video.id = "test-video";
      context.setCachedVideoFrame(video, 5000, {
        dataUrl: "test",
        width: 100,
        height: 100,
      });
      expect(context.getCachedVideoFrame(video, 5000)).toBeUndefined();
    });

    test("multiple dispose calls are safe", () => {
      expect(() => {
        context.dispose();
        context.dispose();
        context.dispose();
      }).not.toThrow();
    });
  });

  describe("LRU eviction", () => {
    test("evicts oldest entries when canvas cache exceeds max size", () => {
      const smallContext = new RenderContext({ maxCanvasCacheSize: 3 });

      for (let i = 0; i < 5; i++) {
        const element = createMockVersionedElement(`element-${i}`, 1);
        smallContext.setCachedCanvasDataUrl(element, `data:${i}`);
      }

      // Should have evicted oldest entries
      expect(smallContext.canvasCacheSize).toBe(3);
    });

    test("evicts oldest entries when video frame cache exceeds max size", () => {
      const smallContext = new RenderContext({ maxVideoFrameCacheSize: 3 });

      const video = document.createElement("div");
      video.id = "test-video";

      for (let i = 0; i < 5; i++) {
        smallContext.setCachedVideoFrame(video, i * 1000, {
          dataUrl: `data:${i}`,
          width: 100,
          height: 100,
        });
      }

      // Should have evicted oldest entries
      expect(smallContext.videoFrameCacheSize).toBe(3);
    });
  });
});
