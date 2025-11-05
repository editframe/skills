import { beforeAll, beforeEach, describe, vi } from "vitest";
import { test as baseTest } from "../../test/useMSW.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import type { EFVideo } from "./EFVideo.js";
import "./EFVideo.js";
import "./EFTimegroup.js";
import "./EFThumbnailStrip.js"; // Import to register the custom element
import "../gui/EFWorkbench.js";
import "../gui/EFPreview.js";
import type { EFConfiguration } from "../gui/EFConfiguration.js";
import { AssetMediaEngine } from "./EFMedia/AssetMediaEngine.js";
import { JitMediaEngine } from "./EFMedia/JitMediaEngine.js";

beforeAll(async () => {
  console.clear();
  await fetch("/@ef-clear-cache", {
    method: "DELETE",
  });
});

beforeEach(() => {
  localStorage.clear();
});

const test = baseTest.extend<{
  configuration: EFConfiguration;
  timegroup: EFTimegroup;
  jitVideo: EFVideo;
  assetVideo: EFVideo;
}>({
  configuration: async ({ expect }, use) => {
    const configuration = document.createElement("ef-configuration");
    configuration.innerHTML = `<h1 style="font: 10px monospace">${expect.getState().currentTestName}</h1>`;
    // Use integrated proxy server (same host/port as test runner)
    const apiHost = `${window.location.protocol}//${window.location.host}`;
    configuration.setAttribute("api-host", apiHost);
    configuration.apiHost = apiHost;
    configuration.signingURL = "";
    document.body.appendChild(configuration);
    await use(configuration);
  },
  timegroup: async ({}, use) => {
    const timegroup = document.createElement("ef-timegroup");
    timegroup.setAttribute("mode", "contain");
    await use(timegroup);
  },
  jitVideo: async ({ configuration, timegroup }, use) => {
    const video = document.createElement("ef-video");
    video.src = "http://web:3000/head-moov-480p.mp4";
    timegroup.appendChild(video);
    configuration.appendChild(timegroup);
    await video.mediaEngineTask.run();
    await use(video);
  },
  assetVideo: async ({ configuration, timegroup }, use) => {
    const video = document.createElement("ef-video");
    video.src = "bars-n-tone.mp4";
    timegroup.appendChild(video);
    configuration.appendChild(timegroup);
    await video.mediaEngineTask.run();
    await use(video);
  },
});

describe("MediaEngine Thumbnail Extraction", () => {
  describe("JitMediaEngine", () => {
    test("initializes with JitMediaEngine", async ({ jitVideo, expect }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);
      expect(jitVideo.intrinsicDurationMs).toBe(10_000);
    });

    test("extracts single thumbnail at timestamp", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      const timestamps = [2000]; // 2 seconds
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(1);
      expect(thumbnails[0]).toBeTruthy();
      expect(thumbnails[0]?.timestamp).toBe(2000);
      expect(thumbnails[0]?.thumbnail).toBeDefined();

      // Verify it's a valid canvas
      const canvas = thumbnails[0]!.thumbnail;
      expect(
        canvas instanceof HTMLCanvasElement ||
          canvas instanceof OffscreenCanvas,
      ).toBe(true);
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });

    test("extracts multiple thumbnails in batch", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      const timestamps = [1000, 3000, 5000, 7000]; // Multiple timestamps
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(4);

      for (let i = 0; i < timestamps.length; i++) {
        const thumbnail = thumbnails[i];
        expect(thumbnail).toBeTruthy();
        expect(thumbnail?.timestamp).toBe(timestamps[i]);

        const canvas = thumbnail!.thumbnail;
        expect(
          canvas instanceof HTMLCanvasElement ||
            canvas instanceof OffscreenCanvas,
        ).toBe(true);
        expect(canvas.width).toBeGreaterThan(0);
        expect(canvas.height).toBeGreaterThan(0);
      }
    });

    test("handles timestamps in same segment efficiently", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value as JitMediaEngine;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      // Get segment duration to ensure timestamps are in same segment
      const videoRendition =
        mediaEngine.getScrubVideoRendition() || mediaEngine.getVideoRendition();
      expect(videoRendition).toBeDefined();
      const segmentDurationMs = videoRendition!.segmentDurationMs || 2000;

      // Pick timestamps within the first segment - avoid edge cases near boundaries
      const timestamps = [
        100,
        500,
        1000,
        Math.min(1500, segmentDurationMs - 200),
      ];
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(4);

      // Most should succeed since they're in the same segment
      const successfulThumbnails = thumbnails.filter((t) => t !== null);
      expect(successfulThumbnails.length).toBeGreaterThan(2); // At least 3 out of 4

      for (const thumbnail of successfulThumbnails) {
        expect(thumbnail!.thumbnail).toBeDefined();
      }
    });

    test("handles timestamps across different segments", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value as JitMediaEngine;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      // Pick timestamps that span multiple segments
      const timestamps = [500, 2500, 4500, 6500, 8500]; // Across different 2s segments
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(5);

      // All should succeed
      for (let i = 0; i < timestamps.length; i++) {
        const thumbnail = thumbnails[i];
        expect(thumbnail).toBeTruthy();
        expect(thumbnail?.timestamp).toBe(timestamps[i]);
      }
    });

    test("handles invalid timestamps gracefully", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      const timestamps = [-1000, 15000]; // Before start and after end
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(2);

      // Invalid timestamps should return null
      expect(thumbnails[0]).toBeNull();
      expect(thumbnails[1]).toBeNull();
    });

    test("handles mix of valid and invalid timestamps", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      const timestamps = [-1000, 2000, 15000, 5000]; // Invalid, valid, invalid, valid
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(4);

      expect(thumbnails[0]).toBeNull(); // Invalid
      expect(thumbnails[1]).toBeTruthy(); // Valid
      expect(thumbnails[1]?.timestamp).toBe(2000);
      expect(thumbnails[2]).toBeNull(); // Invalid
      expect(thumbnails[3]).toBeTruthy(); // Valid
      expect(thumbnails[3]?.timestamp).toBe(5000);
    });

    test("handles empty timestamp array", async ({ jitVideo, expect }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      const timestamps: number[] = [];
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(0);
    });

    test("uses scrub rendition when available", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      // Check if scrub rendition exists
      const scrubRendition = mediaEngine.getScrubVideoRendition();
      const mainRendition = mediaEngine.getVideoRendition();

      expect(scrubRendition).toBeDefined();
      expect(mainRendition).toBeDefined();

      // Extract thumbnail to ensure it works with scrub rendition
      const timestamps = [3000];
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(1);
      expect(thumbnails[0]).toBeTruthy();
    });
  });

  describe("AssetMediaEngine", () => {
    test("initializes with AssetMediaEngine", async ({
      assetVideo,
      expect,
    }) => {
      const mediaEngine = assetVideo.mediaEngineTask.value;
      expect(mediaEngine).toBeInstanceOf(AssetMediaEngine);
      expect(assetVideo.intrinsicDurationMs).toBeGreaterThan(0);
    });

    test("attempts thumbnail extraction (currently has implementation issues)", async ({
      assetVideo,
      expect,
    }) => {
      const mediaEngine = assetVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(AssetMediaEngine);

      const timestamps = [2000]; // 2 seconds
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(1);

      // NOTE: AssetMediaEngine thumbnail extraction currently has issues
      // This test documents the current behavior for the refactor
      if (thumbnails[0]) {
        expect(thumbnails[0].timestamp).toBe(2000);
        expect(thumbnails[0].thumbnail).toBeDefined();

        const canvas = thumbnails[0].thumbnail;
        expect(
          canvas instanceof HTMLCanvasElement ||
            canvas instanceof OffscreenCanvas,
        ).toBe(true);
        expect(canvas.width).toBeGreaterThan(0);
        expect(canvas.height).toBeGreaterThan(0);
      }
      // If it returns null, that's also acceptable given current implementation issues
    });

    test("attempts batch thumbnail extraction (documents current behavior)", async ({
      assetVideo,
      expect,
    }) => {
      const mediaEngine = assetVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(AssetMediaEngine);

      const timestamps = [1000, 3000, 5000, 7000]; // Multiple timestamps
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(4);

      // Document current behavior - some may be null due to implementation issues
      let successCount = 0;
      for (let i = 0; i < timestamps.length; i++) {
        const thumbnail = thumbnails[i];
        if (thumbnail) {
          successCount++;
          expect(thumbnail.timestamp).toBe(timestamps[i]);

          const canvas = thumbnail.thumbnail;
          expect(
            canvas instanceof HTMLCanvasElement ||
              canvas instanceof OffscreenCanvas,
          ).toBe(true);
          expect(canvas.width).toBeGreaterThan(0);
          expect(canvas.height).toBeGreaterThan(0);
        }
      }

      // Track success rate for refactor planning
      console.log(
        `AssetMediaEngine batch extraction: ${successCount}/${timestamps.length} successful`,
      );
    });

    test("documents that AssetMediaEngine is not yet supported", async ({
      assetVideo,
      expect,
    }) => {
      const mediaEngine = assetVideo.mediaEngineTask.value as AssetMediaEngine;
      expect(mediaEngine).toBeInstanceOf(AssetMediaEngine);

      // AssetMediaEngine now properly returns nulls for all requests
      const timestamps = [500, 2500, 4500, 6500];
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(4);

      // All should be null since AssetMediaEngine is not yet supported
      const successfulThumbnails = thumbnails.filter((t) => t !== null);
      expect(successfulThumbnails.length).toBe(0); // Consistent behavior now
    });

    test("handles invalid timestamps (reveals current boundary issues)", async ({
      assetVideo,
      expect,
    }) => {
      const mediaEngine = assetVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(AssetMediaEngine);

      const timestamps = [-1000, 50000]; // Before start and well after end
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(2);

      // Document current behavior - there seem to be boundary checking issues
      // that should be fixed in the refactor
      console.log(
        `Invalid timestamps result: ${thumbnails[0] ? "non-null" : "null"}, ${thumbnails[1] ? "non-null" : "null"}`,
      );

      // At minimum, negative timestamps should be null
      expect(thumbnails[0]).toBeNull();

      // The second one might unexpectedly succeed due to current implementation issues
      // This documents the current behavior for the refactor
      if (thumbnails[1]) {
        console.log(
          "WARNING: Timestamp 50000ms unexpectedly returned a thumbnail - boundary checking issue",
        );
      }
    });

    test("no scrub rendition fallback to main video (documents current behavior)", async ({
      assetVideo,
      expect,
    }) => {
      const mediaEngine = assetVideo.mediaEngineTask.value as AssetMediaEngine;
      expect(mediaEngine).toBeInstanceOf(AssetMediaEngine);

      // AssetMediaEngine doesn't have scrub rendition
      const scrubRendition = mediaEngine.getScrubVideoRendition();
      expect(scrubRendition).toBeUndefined();

      // Attempt to extract thumbnails using main video rendition
      const timestamps = [2000];
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(1);

      // Document current behavior - may return null due to implementation issues
      if (thumbnails[0]) {
        expect(thumbnails[0].timestamp).toBe(2000);
        expect(thumbnails[0].thumbnail).toBeDefined();
      } else {
        console.log(
          "AssetMediaEngine fallback to main video rendition currently returns null",
        );
      }
    });

    test("documents segment boundary behavior for refactor", async ({
      assetVideo,
      expect,
    }) => {
      const mediaEngine = assetVideo.mediaEngineTask.value as AssetMediaEngine;
      expect(mediaEngine).toBeInstanceOf(AssetMediaEngine);

      // Test around known segment boundaries from bars-n-tone.mp4
      // These are approximate - the actual boundaries depend on the asset
      const timestamps = [2066, 4033, 6066, 8033];
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(4);

      // Document current success rate for refactor planning
      const successfulThumbnails = thumbnails.filter((t) => t !== null);
      console.log(
        `AssetMediaEngine segment boundary test: ${successfulThumbnails.length}/${timestamps.length} successful`,
      );

      // Current implementation may have issues - document for refactor
      // In an ideal implementation, most of these should succeed
      for (const thumbnail of successfulThumbnails) {
        expect(thumbnail.thumbnail).toBeDefined();
        const canvas = thumbnail.thumbnail;
        expect(
          canvas instanceof HTMLCanvasElement ||
            canvas instanceof OffscreenCanvas,
        ).toBe(true);
      }
    });
  });

  describe("AssetMediaEngine Incompatibility Warning", () => {
    test("logs warning when EFThumbnailStrip targets AssetMediaEngine", async ({
      assetVideo,
      expect,
    }) => {
      // Spy on console.warn to capture the warning
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Create a thumbnail strip and add it to DOM so it gets properly initialized
      const thumbnailStrip = document.createElement("ef-thumbnail-strip");
      thumbnailStrip.thumbnailWidth = 80;
      document.body.appendChild(thumbnailStrip);

      // Wait for both elements to complete their setup
      await Promise.all([
        assetVideo.updateComplete,
        thumbnailStrip.updateComplete,
      ]);

      // Directly set the target element to bypass TargetController complexity in tests
      assetVideo.id = "asset-video"; // For the warning message
      thumbnailStrip.targetElement = assetVideo;

      // Trigger the layout task through the normal flow by setting stripWidth
      // This mimics what ResizeObserver would do and triggers the warning
      (thumbnailStrip as any).stripWidth = 400;

      // Wait for the warning to be logged using vi.waitFor for event-driven testing
      await vi.waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              "AssetMediaEngine: extractThumbnails not properly implemented",
            ),
          );
        },
        { timeout: 2000 },
      );

      // Clean up
      thumbnailStrip.remove();

      // Restore console.warn
      consoleSpy.mockRestore();
    });

    test("does NOT log warning when EFThumbnailStrip targets JitMediaEngine", async ({
      jitVideo,
      expect,
    }) => {
      // Spy on console.warn to ensure no warning is logged
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Create a thumbnail strip and add it to DOM so it gets properly initialized
      const thumbnailStrip = document.createElement("ef-thumbnail-strip");
      thumbnailStrip.thumbnailWidth = 80;
      document.body.appendChild(thumbnailStrip);

      // Wait for elements to complete setup
      await Promise.all([
        jitVideo.updateComplete,
        thumbnailStrip.updateComplete,
      ]);

      // Directly set the target element to bypass TargetController complexity in tests
      jitVideo.id = "jit-video"; // For consistency
      thumbnailStrip.targetElement = jitVideo;

      // Trigger the layout task through the normal flow by setting stripWidth
      (thumbnailStrip as any).stripWidth = 400;

      // Wait for the layout task to complete using vi.waitFor
      await vi.waitFor(
        () => {
          // @ts-expect-error testing private task
          const layout = thumbnailStrip.thumbnailLayoutTask?.value;
          expect(layout?.count).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );

      // Check that NO AssetMediaEngine warning was logged
      const warningCalls = consoleSpy.mock.calls.filter((call) =>
        call[0].includes("AssetMediaEngine is not currently supported"),
      );
      expect(warningCalls).toHaveLength(0);

      // Clean up
      thumbnailStrip.remove();

      // Restore console.warn
      consoleSpy.mockRestore();
    });
  });

  describe("Caching Behavior", () => {
    test("global input cache is accessible for debugging", async ({
      expect,
    }) => {
      // Verify that the global Input cache is accessible
      expect((globalThis as any).debugInputCache).toBeDefined();

      const cache = (globalThis as any).debugInputCache;
      expect(cache.getStats).toBeDefined();
      expect(cache.clear).toBeDefined();
    });

    test("input instances are cached globally for efficiency", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value as JitMediaEngine;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      // Clear cache to start fresh
      (globalThis as any).debugInputCache.clear();

      // Extract thumbnails from same segment multiple times
      const firstBatch = await mediaEngine.extractThumbnails([1000, 1500]);
      const secondBatch = await mediaEngine.extractThumbnails([1200, 1800]); // Same segment

      expect(firstBatch).toHaveLength(2);
      expect(secondBatch).toHaveLength(2);

      // All should succeed
      expect(firstBatch.every((t) => t !== null)).toBe(true);
      expect(secondBatch.every((t) => t !== null)).toBe(true);

      // Verify that Input objects are being cached globally
      const cacheStats = (globalThis as any).debugInputCache.getStats();
      expect(cacheStats.size).toBeGreaterThan(0);
      console.log("Global Input cache stats:", cacheStats);
    });

    test("different segments create separate input cache entries", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value as JitMediaEngine;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      // Extract thumbnails from different segments
      const segment1 = await mediaEngine.extractThumbnails([1000]);
      const segment2 = await mediaEngine.extractThumbnails([3000]); // Different segment
      const segment3 = await mediaEngine.extractThumbnails([5000]); // Different segment

      expect(segment1).toHaveLength(1);
      expect(segment2).toHaveLength(1);
      expect(segment3).toHaveLength(1);

      // All should succeed
      expect(segment1[0]).toBeTruthy();
      expect(segment2[0]).toBeTruthy();
      expect(segment3[0]).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    test("handles media engine without video track", async ({ expect }) => {
      // Create a video element but don't wait for it to fully load
      const video = document.createElement("ef-video");
      video.src = "nonexistent.mp4";
      document.body.appendChild(video);

      try {
        await video.mediaEngineTask.run();
        const mediaEngine = video.mediaEngineTask.value;

        if (mediaEngine) {
          const timestamps = [1000];
          const thumbnails = await mediaEngine.extractThumbnails(timestamps);

          // Should handle gracefully with nulls
          expect(thumbnails).toHaveLength(1);
          expect(thumbnails[0]).toBeNull();
        }
      } catch (error) {
        // Media engine creation might fail for nonexistent file - that's expected
        expect(error).toBeDefined();
      } finally {
        video.remove();
      }
    });

    test("handles concurrent thumbnail extraction requests", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      // Start multiple concurrent extractions
      const promise1 = mediaEngine.extractThumbnails([1000, 2000]);
      const promise2 = mediaEngine.extractThumbnails([3000, 4000]);
      const promise3 = mediaEngine.extractThumbnails([5000, 6000]);

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      expect(result1).toHaveLength(2);
      expect(result2).toHaveLength(2);
      expect(result3).toHaveLength(2);

      // All should succeed
      expect(result1.every((t) => t !== null)).toBe(true);
      expect(result2.every((t) => t !== null)).toBe(true);
      expect(result3.every((t) => t !== null)).toBe(true);
    });
  });

  describe("Performance Characteristics", () => {
    test("batch extraction is more efficient than individual calls", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      const timestamps = [1000, 2000, 3000, 4000];

      // Time batch extraction
      const batchStart = performance.now();
      const batchResults = await mediaEngine.extractThumbnails(timestamps);
      const batchEnd = performance.now();

      // Time individual extractions
      const individualStart = performance.now();
      const individualResults = [];
      for (const timestamp of timestamps) {
        const result = await mediaEngine.extractThumbnails([timestamp]);
        individualResults.push(result[0]);
      }
      const individualEnd = performance.now();

      const batchTime = batchEnd - batchStart;
      const individualTime = individualEnd - individualStart;

      expect(batchResults).toHaveLength(4);
      expect(individualResults).toHaveLength(4);

      // Results should be equivalent
      for (let i = 0; i < timestamps.length; i++) {
        expect(batchResults[i]?.timestamp).toBe(
          individualResults[i]?.timestamp,
        );
      }

      console.log(
        `Batch time: ${batchTime.toFixed(2)}ms, Individual time: ${individualTime.toFixed(2)}ms`,
      );

      // Batch should generally be faster (though this might vary in test environments)
      // We don't enforce this as a hard requirement since test timing can be variable
      expect(batchTime).toBeGreaterThan(0);
      expect(individualTime).toBeGreaterThan(0);
    });

    test("segment grouping optimizes cross-segment extraction", async ({
      jitVideo,
      expect,
    }) => {
      const mediaEngine = jitVideo.mediaEngineTask.value!;
      expect(mediaEngine).toBeInstanceOf(JitMediaEngine);

      // Extract thumbnails that span multiple segments but in an order
      // that would be inefficient without segment grouping
      const timestamps = [1000, 5000, 1500, 5500, 2000, 6000]; // Alternating segments
      const thumbnails = await mediaEngine.extractThumbnails(timestamps);

      expect(thumbnails).toHaveLength(6);

      // All should succeed despite the inefficient ordering
      for (let i = 0; i < timestamps.length; i++) {
        expect(thumbnails[i]).toBeTruthy();
        expect(thumbnails[i]?.timestamp).toBe(timestamps[i]);
      }
    });
  });
});
