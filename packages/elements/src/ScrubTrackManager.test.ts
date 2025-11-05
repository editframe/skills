// TODO: ScrubTrackManager and JitTranscodingClient are temporarily disabled
// They will return in a later release

import { describe, test } from "vitest";

describe("ScrubTrackManager", () => {
  test.skip("ScrubTrackManager tests temporarily disabled", () => {
    // These tests will return in a later release when JitTranscodingClient is re-implemented
  });
});

/*
import { beforeEach, describe, expect, test, vi } from "vitest";
// Import is used in mock definition
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { JitTranscodingClient } from "./transcoding/types/index.js";
import { ScrubTrackManager } from "./ScrubTrackManager.js";

// Mock JitTranscodingClient
vi.mock("./transcoding/types/index.js", () => ({
  JitTranscodingClient: vi.fn().mockImplementation(() => ({
    isJitTranscodeEligible: vi.fn(() => true),
    hasSegmentInCache: vi.fn(() => false),
    getCurrentQuality: vi.fn(() => "medium"),
    loadSegment: vi.fn(() => Promise.resolve(new ArrayBuffer(1000))),
    getMetadata: vi.fn(() =>
      Promise.resolve({
        durationMs: 300000, // 5 minutes
        presets: ["low", "medium", "high", "scrub"],
      }),
    ),
  })),
}));

describe("ScrubTrackManager", () => {
  let manager: ScrubTrackManager;
  let mockJitClient: any;

  beforeEach(() => {
    mockJitClient = {} as JitTranscodingClient;
    manager = new ScrubTrackManager(
      "http://example.com/video.mp4",
      mockJitClient,
    );
  });

  test("should initialize with video URL and JIT client", () => {
    expect(manager).toBeInstanceOf(ScrubTrackManager);
    expect(manager.videoUrl).toBe("http://example.com/video.mp4");
  });

  test("should start preloading scrub segments on initialization", async () => {
    await manager.initialize();

    // Should attempt to load first few scrub segments (30s chunks)
    expect(mockJitClient.loadSegment).toHaveBeenCalledWith(
      "http://example.com/video.mp4",
      "scrub",
      0, // First segment starts at 0ms
    );
    expect(mockJitClient.loadSegment).toHaveBeenCalledWith(
      "http://example.com/video.mp4",
      "scrub",
      30000, // Second segment starts at 30s
    );
    expect(mockJitClient.loadSegment).toHaveBeenCalledWith(
      "http://example.com/video.mp4",
      "scrub",
      60000, // Third segment starts at 60s
    );
  });

  test("should determine when to use scrub track vs normal video", () => {
    // When normal video is not cached, should use scrub track
    mockJitClient.hasSegmentInCache.mockReturnValue(false);
    mockJitClient.getCurrentQuality.mockReturnValue("medium");
    expect(manager.shouldUseScrubTrack(150000)).toBe(true);
    expect(mockJitClient.hasSegmentInCache).toHaveBeenCalledWith(
      "http://example.com/video.mp4",
      "medium",
      150000,
    );

    // When normal video is cached, should use normal video
    mockJitClient.hasSegmentInCache.mockReturnValue(true);
    expect(manager.shouldUseScrubTrack(150000)).toBe(false);
  });

  test("should detect fast seeking vs normal playback", () => {
    const currentTime = 30000; // 30s
    const seekTime = 120000; // 2 minutes

    // Large time jump should be considered fast seeking
    expect(manager.isFastSeeking(currentTime, seekTime)).toBe(true);

    // Small time jump should be normal seeking
    expect(manager.isFastSeeking(currentTime, currentTime + 2000)).toBe(false);
  });

  test("should align seek times to 30s boundaries for scrub tracks", () => {
    expect(manager.alignToScrubBoundary(5000)).toBe(0);
    expect(manager.alignToScrubBoundary(25000)).toBe(0);
    expect(manager.alignToScrubBoundary(35000)).toBe(30000);
    expect(manager.alignToScrubBoundary(95000)).toBe(90000);
  });

  test("should provide scrub frame for uncached seeks", async () => {
    const seekTimeMs = 150000; // 2.5 minutes
    mockJitClient.hasSegmentInCache.mockReturnValue(false);

    await manager.getScrubFrame(seekTimeMs);

    // Should load scrub segment aligned to 30s boundary (150000ms aligns to 150000ms = 2.5 minutes)
    expect(mockJitClient.loadSegment).toHaveBeenCalledWith(
      "http://example.com/video.mp4",
      "scrub",
      150000,
    );
  });

  test("should track cache statistics for optimization", () => {
    manager.recordCacheHit();
    manager.recordCacheMiss();
    manager.recordCacheHit();

    const stats = manager.getCacheStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(2 / 3);
  });

  test("should preload upcoming scrub segments based on seek patterns", async () => {
    await manager.initialize();
    vi.clearAllMocks();

    // Simulate seeking to 2 minutes (120000ms)
    await manager.getScrubFrame(120000);

    // Should preload nearby segments - the implementation preloads around the aligned time (120000)
    expect(mockJitClient.loadSegment).toHaveBeenCalledWith(
      "http://example.com/video.mp4",
      "scrub",
      120000, // The center aligned time that was loaded
    );
  });

  test("should manage memory by limiting scrub cache size", async () => {
    // Configure small cache size for testing
    manager = new ScrubTrackManager(
      "http://example.com/video.mp4",
      mockJitClient,
      {
        maxScrubCacheSegments: 2,
      },
    );

    await manager.initialize();

    // Load more segments than cache can hold
    await manager.getScrubFrame(0);
    await manager.getScrubFrame(30000);
    await manager.getScrubFrame(60000);

    const cacheSize = manager.getScrubCacheSize();
    expect(cacheSize).toBeLessThanOrEqual(2);
  });

  test("should handle video duration changes", async () => {
    await manager.initialize();

    // Update metadata with new duration
    mockJitClient.getMetadata.mockResolvedValue({
      durationMs: 600000, // 10 minutes instead of 5
      presets: ["low", "medium", "high", "scrub"],
    });

    await manager.updateMetadata();

    // Should recalculate total segments based on new duration
    expect(manager.getTotalScrubSegments()).toBe(20); // 600000ms / 30000ms = 20 segments
  });
});
*/
