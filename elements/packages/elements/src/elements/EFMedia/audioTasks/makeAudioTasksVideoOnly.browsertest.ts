import { describe } from "vitest";
import { test as baseTest } from "../../../../test/useMSW.js";
import type { EFMedia } from "../../EFMedia.js";
import { AssetMediaEngine } from "../AssetMediaEngine.js";

const test = baseTest.extend<{
  videoOnlyAssetEngine: AssetMediaEngine;
}>({
  videoOnlyAssetEngine: async ({}, use) => {
    const host = document.createElement("ef-video") as EFMedia;
    const engine = new AssetMediaEngine(
      host,
      "test-video-only.mp4",
      null as any,
    );

    // Simulate video-only asset data (no audio track) - this is the exact scenario
    // that caused "computeSegmentId: trackId not found for rendition {\"src\":\"uuid\"}"
    (engine as any).data = {
      1: {
        track: 1,
        type: "video",
        width: 480,
        height: 270,
        timescale: 15360,
        sample_count: 1,
        codec: "avc1.640015",
        duration: 30208,
        startTimeOffsetMs: 67,
        initSegment: { offset: 0, size: 763 },
        segments: [
          { cts: 1024, dts: 0, duration: 30720, offset: 763, size: 13997 },
        ],
      },
      // Note: No track 2 (audio) - this simulates the exact video-only asset scenario
    };

    await use(engine);
  },
});

/**
 * Regression test for: "computeSegmentId: trackId not found for rendition {\"src\":\"uuid\"}"
 *
 * This test ensures that AssetMediaEngine properly handles video-only assets
 * by returning undefined for audio renditions instead of malformed objects.
 *
 * This test would FAIL with the old implementation and PASS with the new implementation.
 */
describe("AssetMediaEngine - Video-Only Asset Handling", () => {
  test("audioRendition returns undefined for video-only asset", ({
    videoOnlyAssetEngine,
    expect,
  }) => {
    // This is the core fix - should return undefined, not {src: "..."}
    const audioRendition = videoOnlyAssetEngine.audioRendition;
    expect(audioRendition).toBeUndefined();
  });

  test("videoRendition returns valid object for video-only asset", ({
    videoOnlyAssetEngine,
    expect,
  }) => {
    const videoRendition = videoOnlyAssetEngine.videoRendition;
    expect(videoRendition).toBeDefined();
    expect(videoRendition?.trackId).toBe(1);
    expect(videoRendition?.src).toBe("test-video-only.mp4");
  });

  test("getAudioRendition returns undefined for video-only asset", ({
    videoOnlyAssetEngine,
    expect,
  }) => {
    // New API behavior - should return undefined gracefully
    const result = videoOnlyAssetEngine.getAudioRendition();
    expect(result).toBeUndefined();
  });

  test("original error scenario is prevented", ({
    videoOnlyAssetEngine,
    expect,
  }) => {
    // This is the exact scenario that caused the original error:
    // "computeSegmentId: trackId not found for rendition {\"src\":\"uuid\"}"

    const audioRendition = videoOnlyAssetEngine.getAudioRendition();

    // Before fix: audioRendition would be {trackId: undefined, src: "..."}
    // After fix: audioRendition should be undefined
    expect(audioRendition).toBeUndefined();

    // This prevents the downstream error where trackId was missing entirely
    if (audioRendition !== undefined) {
      // If audioRendition exists, it should have a valid trackId
      expect(audioRendition.trackId).toBeDefined();
      expect(typeof audioRendition.trackId).toBe("number");
    }
  });
});
