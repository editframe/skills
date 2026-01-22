import { beforeEach, describe, test } from "vitest";
import { SessionThumbnailCache, getCacheKey } from "./SessionThumbnailCache.js";
import type { ThumbnailCacheStats } from "./thumbnailCache.js";

describe("SessionThumbnailCache", () => {
  let cache: SessionThumbnailCache;

  beforeEach(() => {
    cache = new SessionThumbnailCache();
  });

  function createTestImageData(width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    // Fill with test pattern
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255; // R
      data[i + 1] = 0; // G
      data[i + 2] = 0; // B
      data[i + 3] = 255; // A
    }
    return new ImageData(data, width, height);
  }

  describe("getStats", () => {
    test("returns zero stats for empty cache", async ({ expect }) => {
      const stats = await cache.getStats();

      expect(stats.itemCount).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
      expect(stats.maxSize).toBe(1000);
    });

    test("accurately counts items in cache", async ({ expect }) => {
      const key1 = getCacheKey("root1", "video1", 1000);
      const key2 = getCacheKey("root1", "video1", 2000);
      const key3 = getCacheKey("root1", "video2", 1000);

      cache.set(key1, createTestImageData(10, 10), 1000, "video1");
      cache.set(key2, createTestImageData(10, 10), 2000, "video1");
      cache.set(key3, createTestImageData(10, 10), 1000, "video2");

      const stats = await cache.getStats();
      expect(stats.itemCount).toBe(3);
    });

    test("calculates total size correctly", async ({ expect }) => {
      const key1 = getCacheKey("root1", "video1", 1000);
      const key2 = getCacheKey("root1", "video1", 2000);
      const imageData1 = createTestImageData(10, 10); // 10 * 10 * 4 = 400 bytes
      const imageData2 = createTestImageData(20, 20); // 20 * 20 * 4 = 1600 bytes

      cache.set(key1, imageData1, 1000, "video1");
      cache.set(key2, imageData2, 2000, "video1");

      const stats = await cache.getStats();
      expect(stats.totalSizeBytes).toBe(400 + 1600);
    });

    test("reflects max size setting", async ({ expect }) => {
      cache.setMaxSize(500);
      const stats = await cache.getStats();
      expect(stats.maxSize).toBe(500);
    });

    test("updates stats after eviction", async ({ expect }) => {
      const smallCache = new SessionThumbnailCache(2);
      const key1 = getCacheKey("root1", "video1", 1000);
      const key2 = getCacheKey("root1", "video1", 2000);
      const key3 = getCacheKey("root1", "video1", 3000);

      smallCache.set(key1, createTestImageData(10, 10), 1000, "video1");
      smallCache.set(key2, createTestImageData(10, 10), 2000, "video1");
      smallCache.set(key3, createTestImageData(10, 10), 3000, "video1");

      // Eviction happens synchronously
      const stats = await smallCache.getStats();
      expect(stats.itemCount).toBe(2);
    });
  });
});
