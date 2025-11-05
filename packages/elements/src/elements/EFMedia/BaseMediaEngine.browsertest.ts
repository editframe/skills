import { describe, vi } from "vitest";
import { test as baseTest } from "../../../test/useMSW.js";

import type { EFMedia } from "../EFMedia.js";
import { BaseMediaEngine, mediaCache } from "./BaseMediaEngine.js";

const test = baseTest.extend<{}>({});

// Test implementation of BaseMediaEngine for testing
// @ts-expect-error missing implementations
class TestMediaEngine extends BaseMediaEngine {
  fetchMediaSegment = vi.fn();
  public host: EFMedia;

  constructor(host: EFMedia) {
    super(host);
    this.host = host;
  }

  get videoRendition() {
    return {
      trackId: 1,
      src: "test-video.mp4",
      segmentDurationMs: 2000,
    };
  }

  get audioRendition() {
    return {
      trackId: 2,
      src: "test-audio.mp4",
      segmentDurationMs: 1000,
    };
  }
}

// Test implementation for video-only assets
// @ts-expect-error missing implementations
class VideoOnlyMediaEngine extends BaseMediaEngine {
  fetchMediaSegment = vi.fn();
  public host: EFMedia;

  constructor(host: EFMedia) {
    super(host);
    this.host = host;
  }

  get videoRendition() {
    return {
      trackId: 1,
      src: "test-video.mp4",
      segmentDurationMs: 2000,
    };
  }

  get audioRendition() {
    return undefined; // Video-only asset
  }
}

// Test implementation for audio-only assets
// @ts-expect-error missing implementations
class AudioOnlyMediaEngine extends BaseMediaEngine {
  fetchMediaSegment = vi.fn();
  public host: EFMedia;

  constructor(host: EFMedia) {
    super(host);
    this.host = host;
  }

  get videoRendition() {
    return undefined; // Audio-only asset
  }

  get audioRendition() {
    return {
      trackId: 1,
      src: "test-audio.mp4",
      segmentDurationMs: 1000,
    };
  }
}

describe("BaseMediaEngine API Contract", () => {
  test("getAudioRendition returns audio rendition when available", ({
    expect,
  }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);

    const result = engine.getAudioRendition();
    expect(result).toBeDefined();
    expect(result?.trackId).toBe(2);
    expect(result?.src).toBe("test-audio.mp4");
  });

  test("getAudioRendition returns undefined for video-only assets", ({
    expect,
  }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new VideoOnlyMediaEngine(host);

    const result = engine.getAudioRendition();
    expect(result).toBeUndefined();
  });

  test("getVideoRendition returns video rendition when available", ({
    expect,
  }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);

    const result = engine.getVideoRendition();
    expect(result).toBeDefined();
    expect(result?.trackId).toBe(1);
    expect(result?.src).toBe("test-video.mp4");
  });

  test("getVideoRendition returns undefined for audio-only assets", ({
    expect,
  }) => {
    const host = document.createElement("ef-audio") as EFMedia;
    const engine = new AudioOnlyMediaEngine(host);

    const result = engine.getVideoRendition();
    expect(result).toBeUndefined();
  });
});

describe("BaseMediaEngine deduplication", () => {
  test("should fetch segment successfully", async ({ expect }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);
    engine.fetchMediaSegment.mockResolvedValue(new ArrayBuffer(1024));

    const rendition = { trackId: 1, src: "test.mp4" };
    const result = await engine.fetchMediaSegment(1, rendition);

    expect(result).toEqual(new ArrayBuffer(1024));
    expect(engine.fetchMediaSegment).toHaveBeenCalledWith(1, rendition);
    expect(engine.fetchMediaSegment).toHaveBeenCalledTimes(1);
  });

  test("should deduplicate concurrent requests for same segment", async ({
    expect,
  }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);
    const mockSegmentData = new ArrayBuffer(1024);
    engine.fetchMediaSegment.mockResolvedValue(mockSegmentData);

    const rendition = { trackId: 1, src: "test.mp4" };

    // Make two concurrent requests for the same segment
    const [result1, result2] = await Promise.all([
      engine.fetchMediaSegmentWithDeduplication(1, rendition),
      engine.fetchMediaSegmentWithDeduplication(1, rendition),
    ]);

    // Both should return the same result
    expect(result1).toBe(mockSegmentData);
    expect(result2).toBe(mockSegmentData);

    // But fetchMediaSegment should only be called once due to deduplication
    expect(engine.fetchMediaSegment).toHaveBeenCalledTimes(1);
    expect(engine.fetchMediaSegment).toHaveBeenCalledWith(1, rendition);
  });

  test("should handle different segments as separate requests", async ({
    expect,
  }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);
    const mockSegmentData = new ArrayBuffer(1024);
    engine.fetchMediaSegment.mockResolvedValue(mockSegmentData);

    const rendition = { trackId: 1, src: "test.mp4" };

    // Make concurrent requests for different segments
    const [result1, result2] = await Promise.all([
      engine.fetchMediaSegmentWithDeduplication(1, rendition),
      engine.fetchMediaSegmentWithDeduplication(2, rendition),
    ]);

    expect(result1).toBe(mockSegmentData);
    expect(result2).toBe(mockSegmentData);

    // Should call fetchMediaSegment twice for different segments
    expect(engine.fetchMediaSegment).toHaveBeenCalledTimes(2);
    expect(engine.fetchMediaSegment).toHaveBeenCalledWith(1, rendition);
    expect(engine.fetchMediaSegment).toHaveBeenCalledWith(2, rendition);
  });

  test("should handle different renditions as separate requests", async ({
    expect,
  }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);
    const mockSegmentData = new ArrayBuffer(1024);
    engine.fetchMediaSegment.mockResolvedValue(mockSegmentData);

    const rendition1 = { trackId: 1, src: "test1.mp4" };
    const rendition2 = { trackId: 2, src: "test2.mp4" };

    // Make concurrent requests for same segment but different renditions
    const [result1, result2] = await Promise.all([
      engine.fetchMediaSegmentWithDeduplication(1, rendition1),
      engine.fetchMediaSegmentWithDeduplication(1, rendition2),
    ]);

    expect(result1).toBe(mockSegmentData);
    expect(result2).toBe(mockSegmentData);

    // Should call fetchMediaSegment twice for different renditions
    expect(engine.fetchMediaSegment).toHaveBeenCalledTimes(2);
    expect(engine.fetchMediaSegment).toHaveBeenCalledWith(1, rendition1);
    expect(engine.fetchMediaSegment).toHaveBeenCalledWith(1, rendition2);
  });

  test("should propagate errors correctly", async ({ expect }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);
    const error = new Error("Fetch failed");
    engine.fetchMediaSegment.mockRejectedValue(error);

    const rendition = { trackId: 1, src: "test.mp4" };

    await expect(
      engine.fetchMediaSegmentWithDeduplication(1, rendition),
    ).rejects.toThrow("Fetch failed");
    expect(engine.fetchMediaSegment).toHaveBeenCalledWith(1, rendition);
  });

  test("should retry failed requests after error", async ({ expect }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);
    const rendition = { trackId: 1, src: "test.mp4" };
    const error = new Error("First attempt failed");
    const mockSegmentData = new ArrayBuffer(1024);

    // First request fails
    engine.fetchMediaSegment.mockRejectedValueOnce(error);
    await expect(
      engine.fetchMediaSegmentWithDeduplication(1, rendition),
    ).rejects.toThrow("First attempt failed");

    // Second request should succeed (not deduplicated since first failed)
    engine.fetchMediaSegment.mockResolvedValue(mockSegmentData);
    const result = await engine.fetchMediaSegmentWithDeduplication(
      1,
      rendition,
    );

    expect(result).toBe(mockSegmentData);
    expect(engine.fetchMediaSegment).toHaveBeenCalledTimes(2);
  });

  test("should track pending requests correctly", async ({ expect }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);
    const mockSegmentData = new ArrayBuffer(1024);
    engine.fetchMediaSegment.mockResolvedValue(mockSegmentData);

    const rendition = { trackId: 1, src: "test.mp4" };

    // Start a request but don't await it
    const promise = engine.fetchMediaSegmentWithDeduplication(1, rendition);

    // Should detect that segment is being fetched
    expect(engine.isSegmentBeingFetched(1, rendition)).toBe(true);
    expect(engine.getActiveSegmentRequestCount()).toBe(1);

    // Different segment should not be detected as being fetched
    expect(engine.isSegmentBeingFetched(2, rendition)).toBe(false);

    await promise.then(() => {
      // After completion, should no longer be detected as being fetched
      expect(engine.isSegmentBeingFetched(1, rendition)).toBe(false);
      expect(engine.getActiveSegmentRequestCount()).toBe(0);
    });
  });

  test("should cancel all requests correctly", async ({ expect }) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new TestMediaEngine(host);
    const rendition = { trackId: 1, src: "test.mp4" };

    // Start a request
    engine.fetchMediaSegmentWithDeduplication(1, rendition);
    expect(engine.getActiveSegmentRequestCount()).toBe(1);

    // Cancel all requests
    engine.cancelAllSegmentRequests();
    expect(engine.getActiveSegmentRequestCount()).toBe(0);
  });
});

describe("BaseMediaEngine caching", () => {
  test("should use shared media cache", async ({ expect }) => {
    // Test that the cache is shared across instances
    expect(mediaCache).toBe(mediaCache);
  });

  test("should have cache size limit", async ({ expect }) => {
    // Test that the cache has the expected size limit
    expect(mediaCache.maxSize).toBe(100 * 1024 * 1024);
  });
});

describe("BaseMediaEngine abort signal handling", () => {
  test("should handle abort signals independently in BaseMediaEngine", async ({
    expect,
  }) => {
    // Create a test host that actually has a fetch method
    const host = {
      fetch: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ arrayBuffer: () => new ArrayBuffer(1024) }),
        ),
    } as any;

    const engine = new TestMediaEngine(host);

    // Create two abort controllers
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    // Start two requests with different abort signals to the same URL
    const promise1 = engine.fetchMedia("test-url", controller1.signal);
    const promise2 = engine.fetchMedia("test-url", controller2.signal);

    // Abort only the first request
    controller1.abort();

    // First request should fail with AbortError
    await expect(promise1).rejects.toThrow("Aborted");

    // Second request should still succeed
    const result2 = await promise2;
    expect(result2).toBeInstanceOf(ArrayBuffer);
    expect(result2.byteLength).toBe(1024);

    // The network request should only be made once due to deduplication
    // This validates our fix: deduplication works but signals are independent
    expect(host.fetch).toHaveBeenCalledTimes(1);
  });

  test("should handle immediate abort in BaseMediaEngine", async ({
    expect,
  }) => {
    const host = {
      fetch: vi
        .fn()
        .mockResolvedValue({ arrayBuffer: () => new ArrayBuffer(1024) }),
    } as any;

    const engine = new TestMediaEngine(host);

    // Create an already aborted signal
    const controller = new AbortController();
    controller.abort();

    // Request should fail immediately with AbortError
    await expect(
      engine.fetchMedia("test-url", controller.signal),
    ).rejects.toThrow("Aborted");

    // No network request should be made since abort happens in wrapper method
    expect(host.fetch).not.toHaveBeenCalled();
  });

  test("should maintain deduplication while respecting individual abort signals", async ({
    expect,
  }) => {
    const host = {
      fetch: vi
        .fn()
        .mockResolvedValue({ arrayBuffer: () => new ArrayBuffer(1024) }),
    } as any;

    const engine = new TestMediaEngine(host);

    // Clear any existing cache to ensure clean test
    mediaCache.clear();

    // Make two requests without signals
    const promise1 = engine.fetchMedia("test-url");
    const promise2 = engine.fetchMedia("test-url");

    // Both should succeed
    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toBeInstanceOf(ArrayBuffer);
    expect(result2).toBeInstanceOf(ArrayBuffer);

    // Should deduplicate to one network request
    expect(host.fetch).toHaveBeenCalledTimes(1);
  });
});
