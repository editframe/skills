import { describe, expect, test } from "vitest";
import { LRUCache, OrderedLRUCache } from "./LRUCache";

describe("LRUCache", () => {
  test("basic LRU functionality", () => {
    const cache = new LRUCache<string, number>(3);

    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
    expect(cache.size).toBe(3);

    // Should evict oldest when adding fourth item
    cache.set("d", 4);
    expect(cache.size).toBe(3);
    expect(cache.has("a")).toBe(false); // 'a' was least recently used
    expect(cache.get("d")).toBe(4);
  });
});

describe("OrderedLRUCache", () => {
  test("basic LRU functionality with ordered keys", () => {
    const cache = new OrderedLRUCache<number, string>(3);

    cache.set(10, "ten");
    cache.set(5, "five");
    cache.set(15, "fifteen");

    expect(cache.get(10)).toBe("ten");
    expect(cache.get(5)).toBe("five");
    expect(cache.get(15)).toBe("fifteen");
    expect(cache.size).toBe(3);
  });

  test("maintains sorted key order", () => {
    const cache = new OrderedLRUCache<number, string>(5);

    cache.set(30, "thirty");
    cache.set(10, "ten");
    cache.set(20, "twenty");
    cache.set(40, "forty");
    cache.set(15, "fifteen");

    const sortedKeys = cache.getSortedKeys();
    expect(sortedKeys).toEqual([10, 15, 20, 30, 40]);
  });

  test("binary search exact match", () => {
    const cache = new OrderedLRUCache<number, string>(5);

    cache.set(10, "ten");
    cache.set(20, "twenty");
    cache.set(30, "thirty");

    expect(cache.findExact(20)).toBe("twenty");
    expect(cache.findExact(25)).toBe(undefined);
  });

  test("find nearest in range", () => {
    const cache = new OrderedLRUCache<number, string>(5);

    cache.set(10, "ten");
    cache.set(20, "twenty");
    cache.set(30, "thirty");
    cache.set(40, "forty");

    // Test various range scenarios
    const range12_5 = cache.findNearestInRange(12, 5);
    expect(range12_5.map((item) => item.key)).toEqual([10]); // 12±5 = [7,17] contains only 10

    const range25_8 = cache.findNearestInRange(25, 8);
    expect(range25_8.map((item) => item.key)).toEqual([20, 30]); // 25±8 = [17,33] contains 20,30

    const range35_3 = cache.findNearestInRange(35, 3);
    expect(range35_3.map((item) => item.key)).toEqual([]); // 35±3 = [32,38] contains nothing

    const range50_15 = cache.findNearestInRange(50, 15);
    expect(range50_15.map((item) => item.key)).toEqual([40]); // 50±15 = [35,65] contains only 40

    const range25_15 = cache.findNearestInRange(25, 15);
    expect(range25_15.map((item) => item.key)).toEqual([10, 20, 30, 40]); // 25±15 = [10,40] contains all
  });

  test("range search", () => {
    const cache = new OrderedLRUCache<number, string>(10);

    cache.set(10, "ten");
    cache.set(15, "fifteen");
    cache.set(20, "twenty");
    cache.set(25, "twenty-five");
    cache.set(30, "thirty");
    cache.set(35, "thirty-five");

    const range1 = cache.findRange(15, 30);
    expect(range1.map((item) => item.key)).toEqual([15, 20, 25, 30]);

    const range2 = cache.findRange(12, 23);
    expect(range2.map((item) => item.key)).toEqual([15, 20]);

    const range3 = cache.findRange(40, 50);
    expect(range3).toEqual([]); // No keys in range
  });

  test("LRU eviction maintains sorted order", () => {
    const cache = new OrderedLRUCache<number, string>(3);

    cache.set(30, "thirty");
    cache.set(10, "ten");
    cache.set(20, "twenty");

    // Access 10 to make it most recent
    cache.get(10);

    // Add new item, should evict 30 (least recently used)
    cache.set(40, "forty");

    expect(cache.has(30)).toBe(false);
    expect(cache.getSortedKeys()).toEqual([10, 20, 40]);
  });

  test("works with string keys and custom comparator", () => {
    const cache = new OrderedLRUCache<string, number>(5, (a, b) => a.localeCompare(b));

    cache.set("banana", 2);
    cache.set("apple", 1);
    cache.set("cherry", 3);
    cache.set("date", 4);

    expect(cache.getSortedKeys()).toEqual(["apple", "banana", "cherry", "date"]);

    // For strings, findNearestInRange only works for exact matches since we can't calculate string distance
    const nearestExact = cache.findNearestInRange("cherry", "cherry");
    expect(nearestExact.map((item) => item.key)).toEqual(["cherry"]);

    // But range searches work normally
    const range = cache.findRange("banana", "date");
    expect(range.map((item) => item.key)).toEqual(["banana", "cherry", "date"]);
  });

  test("handles empty cache gracefully", () => {
    const cache = new OrderedLRUCache<number, string>(5);

    expect(cache.findExact(10)).toBe(undefined);
    expect(cache.findNearestInRange(10, 5)).toEqual([]);
    expect(cache.findRange(1, 10)).toEqual([]);
    expect(cache.getSortedKeys()).toEqual([]);
  });

  test("handles single item cache", () => {
    const cache = new OrderedLRUCache<number, string>(5);
    cache.set(10, "ten");

    expect(cache.findNearestInRange(5, 10)).toEqual([{ key: 10, value: "ten" }]); // 5±10 = [-5,15] contains 10
    expect(cache.findNearestInRange(15, 10)).toEqual([{ key: 10, value: "ten" }]); // 15±10 = [5,25] contains 10
    expect(cache.findRange(1, 20)).toEqual([{ key: 10, value: "ten" }]);
  });

  test("updates existing keys without duplicating in sorted index", () => {
    const cache = new OrderedLRUCache<number, string>(5);

    cache.set(10, "ten");
    cache.set(20, "twenty");
    cache.set(10, "TEN"); // Update existing key

    expect(cache.getSortedKeys()).toEqual([10, 20]); // No duplicates
    expect(cache.get(10)).toBe("TEN");
    expect(cache.size).toBe(2);
  });

  // Example use case: video segment caching by timestamp
  test("video segment caching use case", () => {
    interface VideoSegment {
      url: string;
      duration: number;
      bitrate: number;
    }

    const segmentCache = new OrderedLRUCache<number, VideoSegment>(10);

    // Add segments with timestamps as keys
    segmentCache.set(0, { url: "/seg0.mp4", duration: 5000, bitrate: 1000 });
    segmentCache.set(5000, { url: "/seg1.mp4", duration: 5000, bitrate: 1000 });
    segmentCache.set(10000, {
      url: "/seg2.mp4",
      duration: 5000,
      bitrate: 1000,
    });
    segmentCache.set(15000, {
      url: "/seg3.mp4",
      duration: 5000,
      bitrate: 1000,
    });

    // Find segment at specific time
    const segment = segmentCache.findExact(10000);
    expect(segment?.url).toBe("/seg2.mp4");

    // Find segments near seeking position 7500ms (within 3 seconds)
    const nearSeekPoint = segmentCache.findNearestInRange(7500, 3000);
    expect(nearSeekPoint.map((s) => s.key)).toEqual([5000, 10000]); // 7500±3000 = [4500,10500] contains these

    // Get all segments in time range 5s-15s
    const range = segmentCache.findRange(5000, 15000);
    expect(range.length).toBe(3);
    expect(range.map((s) => s.key)).toEqual([5000, 10000, 15000]);
  });

  test("findNearestInRange edge cases", () => {
    const cache = new OrderedLRUCache<number, string>(10);

    cache.set(100, "hundred");
    cache.set(200, "two-hundred");
    cache.set(300, "three-hundred");

    // Test that it can return empty array when no items in range
    const emptyResult = cache.findNearestInRange(50, 10);
    expect(emptyResult).toEqual([]); // 50±10 = [40,60] contains nothing

    // Test exact center match
    const exactCenter = cache.findNearestInRange(200, 0);
    expect(exactCenter.map((item) => item.key)).toEqual([200]); // 200±0 = [200,200] exact match

    // Test asymmetric range (center closer to one side)
    const asymmetric = cache.findNearestInRange(150, 60);
    expect(asymmetric.map((item) => item.key)).toEqual([100, 200]); // 150±60 = [90,210] contains 100,200

    // Test very large range containing all items
    const allItems = cache.findNearestInRange(200, 500);
    expect(allItems.map((item) => item.key)).toEqual([100, 200, 300]); // 200±500 = [-300,700] contains all
  });

  // This test is cute, but we can't perfectly controll wall time
  // in CI, so it's flaky.
  test.skip("performance characteristics with large dataset", () => {
    const cache = new OrderedLRUCache<number, string>(1000);

    // Insert many items
    const insertStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      cache.set(Math.random() * 10000, `value-${i}`);
    }
    const insertTime = performance.now() - insertStart;

    // Perform searches
    const searchStart = performance.now();
    for (let i = 0; i < 100; i++) {
      cache.findNearestInRange(Math.random() * 10000, 500);
      cache.findRange(Math.random() * 5000, Math.random() * 5000 + 1000);
    }
    const searchTime = performance.now() - searchStart;

    // These should complete quickly for O(log n) operations
    expect(insertTime).toBeLessThan(100); // Should be very fast
    expect(searchTime).toBeLessThan(50); // Searches should be even faster

    expect(cache.size).toBe(1000);
    expect(cache.getSortedKeys().length).toBe(1000);
  });
});
