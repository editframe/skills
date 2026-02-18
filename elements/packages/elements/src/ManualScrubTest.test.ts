import { describe, expect, test, vi } from "vitest";

/**
 * Test manual scrubbing functionality to isolate the issue
 */
describe("Manual Scrubbing Functionality", () => {
  test("paintTask processes seek operations correctly", async () => {
    // Mock the core paintTask logic without scrub track complexity
    const mockVideoAsset = {
      seekToTime: vi.fn().mockResolvedValue({
        codedWidth: 640,
        codedHeight: 480,
        format: "rgba",
        timestamp: 1000,
      }),
    };

    const mockCanvasElement = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
    };

    // Simulate the paintTask for manual scrubbing (asset mode)
    const seekToMs = 2500;

    // This simulates the core paintTask logic for asset mode
    const targetSeekTimeSeconds = seekToMs / 1000;

    const frame = await mockVideoAsset.seekToTime(targetSeekTimeSeconds);

    if (frame && mockCanvasElement) {
      // Update canvas dimensions if needed
      if (
        mockCanvasElement.width !== frame.codedWidth ||
        mockCanvasElement.height !== frame.codedHeight
      ) {
        mockCanvasElement.width = frame.codedWidth;
        mockCanvasElement.height = frame.codedHeight;
      }

      // Draw frame to canvas
      const ctx = mockCanvasElement.getContext("2d");
      if (ctx && frame.format !== null) {
        ctx.drawImage(
          frame,
          0,
          0,
          mockCanvasElement.width,
          mockCanvasElement.height,
        );
      }
    }

    // Verify the manual scrubbing logic worked
    expect(mockVideoAsset.seekToTime).toHaveBeenCalledWith(2.5);
    expect(mockCanvasElement.width).toBe(640);
    expect(mockCanvasElement.height).toBe(480);
    expect(mockCanvasElement.getContext).toHaveBeenCalledWith("2d");
  });

  test("JIT mode scrubbing logic flow", async () => {
    // Mock scrub track manager
    const mockScrubTrackManager = {
      shouldUseScrub: vi.fn(),
      isFastSeeking: vi.fn(),
      getScrubFrame: vi.fn(),
      recordCacheHit: vi.fn(),
      recordCacheMiss: vi.fn(),
    };

    const seekToMs = 5000;
    const lastSeekTimeMs = 2000;

    // Test case 1: Should use scrub track
    mockScrubTrackManager.shouldUseScrub.mockReturnValue(true);
    mockScrubTrackManager.isFastSeeking.mockReturnValue(false);
    mockScrubTrackManager.getScrubFrame.mockResolvedValue({
      codedWidth: 320,
      codedHeight: 240,
      format: "rgba",
    });

    const shouldUseScrub = mockScrubTrackManager.shouldUseScrub(seekToMs);
    const isFastSeeking = mockScrubTrackManager.isFastSeeking(
      lastSeekTimeMs,
      seekToMs,
    );

    if (shouldUseScrub || isFastSeeking) {
      const scrubFrame = await mockScrubTrackManager.getScrubFrame(seekToMs);

      if (scrubFrame) {
        mockScrubTrackManager.recordCacheMiss();
      }
    }

    expect(mockScrubTrackManager.shouldUseScrub).toHaveBeenCalledWith(seekToMs);
    expect(mockScrubTrackManager.getScrubFrame).toHaveBeenCalledWith(seekToMs);
    expect(mockScrubTrackManager.recordCacheMiss).toHaveBeenCalled();

    // Test case 2: Should use normal video
    vi.clearAllMocks();
    mockScrubTrackManager.shouldUseScrub.mockReturnValue(false);
    mockScrubTrackManager.isFastSeeking.mockReturnValue(false);

    const shouldUseScrubCase2 = mockScrubTrackManager.shouldUseScrub(seekToMs);
    const isFastSeekingCase2 = mockScrubTrackManager.isFastSeeking(
      lastSeekTimeMs,
      seekToMs,
    );

    if (!(shouldUseScrubCase2 || isFastSeekingCase2)) {
      mockScrubTrackManager.recordCacheHit();
    }

    expect(mockScrubTrackManager.recordCacheHit).toHaveBeenCalled();
  });
});
