import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DelayedLoadingState } from "./DelayedLoadingState.js";

describe("DelayedLoadingState Integration (EFVideo Pattern)", () => {
  let delayedLoadingState: DelayedLoadingState;
  let loadingStateHistory: Array<{
    isLoading: boolean;
    message: string;
    timestamp: number;
  }> = [];

  beforeEach(() => {
    vi.useFakeTimers();
    loadingStateHistory = [];

    // Simulate EFVideo's loading state callback
    delayedLoadingState = new DelayedLoadingState(250, (isLoading, message) => {
      loadingStateHistory.push({
        isLoading,
        message,
        timestamp: Date.now(),
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should handle typical video seeking scenario", async () => {
    // Simulate fast seek to cached content (should not show loading)
    delayedLoadingState.startLoading("video-segment", "Loading video segment...");

    // Fast operation completes in 100ms
    vi.advanceTimersByTime(100);
    delayedLoadingState.clearLoading("video-segment");

    // Advance past threshold to ensure no loading was shown
    vi.advanceTimersByTime(200);

    expect(loadingStateHistory).toHaveLength(0);
  });

  test("should handle slow uncached video loading", async () => {
    // Simulate slow seek to uncached content
    delayedLoadingState.startLoading("video-segment", "Loading video segment...");

    // No loading shown yet
    expect(loadingStateHistory).toHaveLength(0);

    // After 250ms, loading should be shown
    vi.advanceTimersByTime(250);
    expect(loadingStateHistory).toHaveLength(1);
    expect(loadingStateHistory[0]).toEqual({
      isLoading: true,
      message: "Loading video segment...",
      timestamp: expect.any(Number),
    });

    // Simulate operation completing after 1 second
    vi.advanceTimersByTime(750);
    delayedLoadingState.clearLoading("video-segment");

    expect(loadingStateHistory).toHaveLength(2);
    expect(loadingStateHistory[1]).toEqual({
      isLoading: false,
      message: "",
      timestamp: expect.any(Number),
    });
  });

  test("should handle scrub track fallback scenario", async () => {
    // Simulate scrub track attempt
    delayedLoadingState.startLoading("scrub-segment-load", "Loading scrub segment...");

    // Scrub fails quickly, fallback to normal video
    vi.advanceTimersByTime(50);
    delayedLoadingState.clearLoading("scrub-segment-load");
    delayedLoadingState.startLoading("video-segment-fallback", "Loading high quality video...");

    // At this point, the new operation just started, so we need 250ms from now
    expect(loadingStateHistory).toHaveLength(0);

    // After 250ms from the start of the fallback operation, should show loading
    vi.advanceTimersByTime(250);
    expect(loadingStateHistory).toHaveLength(1);
    expect(loadingStateHistory[0]).toEqual({
      isLoading: true,
      message: "Loading high quality video...",
      timestamp: expect.any(Number),
    });

    // Complete fallback
    delayedLoadingState.clearLoading("video-segment-fallback");
    expect(loadingStateHistory).toHaveLength(2);
    expect(loadingStateHistory[1]?.isLoading).toBe(false);
  });

  test("should handle background preloading without user-visible loading", async () => {
    // Start foreground operation
    delayedLoadingState.startLoading("video-segment", "Loading current video...");

    // Start background preloading (should not affect loading state)
    delayedLoadingState.startLoading("preload-segment-1", "Preloading future segment", {
      background: true,
    });
    delayedLoadingState.startLoading("preload-segment-2", "Preloading future segment", {
      background: true,
    });

    // Advance past threshold
    vi.advanceTimersByTime(250);

    // Should only show loading for foreground operation
    expect(loadingStateHistory).toHaveLength(1);
    expect(loadingStateHistory[0]).toEqual({
      isLoading: true,
      message: "Loading current video...",
      timestamp: expect.any(Number),
    });

    // Complete foreground operation
    delayedLoadingState.clearLoading("video-segment");

    // Should clear loading even though background operations continue
    expect(loadingStateHistory).toHaveLength(2);
    expect(loadingStateHistory[1]?.isLoading).toBe(false);

    // Background operations complete (should not trigger any callbacks)
    delayedLoadingState.clearLoading("preload-segment-1");
    delayedLoadingState.clearLoading("preload-segment-2");

    // No additional loading state changes
    expect(loadingStateHistory).toHaveLength(2);
  });

  test("should handle rapid seeking with mixed cached/uncached content", async () => {
    // Rapid seek 1: cached (fast)
    delayedLoadingState.startLoading("seek-1", "Loading segment 1...");
    vi.advanceTimersByTime(50);
    delayedLoadingState.clearLoading("seek-1");

    // Rapid seek 2: cached (fast)
    delayedLoadingState.startLoading("seek-2", "Loading segment 2...");
    vi.advanceTimersByTime(50);
    delayedLoadingState.clearLoading("seek-2");

    // Rapid seek 3: uncached (slow) - this starts a new 250ms timer
    delayedLoadingState.startLoading("seek-3", "Loading segment 3...");

    // Should not be loading yet (new operation just started)
    expect(loadingStateHistory).toHaveLength(0);

    // After 250ms from the start of seek-3, should show loading
    vi.advanceTimersByTime(250);

    // Now should show loading for the slow operation
    expect(loadingStateHistory).toHaveLength(1);
    expect(loadingStateHistory[0]).toEqual({
      isLoading: true,
      message: "Loading segment 3...",
      timestamp: expect.any(Number),
    });

    // Complete slow seek
    delayedLoadingState.clearLoading("seek-3");
    expect(loadingStateHistory).toHaveLength(2);
    expect(loadingStateHistory[1]?.isLoading).toBe(false);
  });

  test("should handle component cleanup scenario", async () => {
    // Start multiple operations
    delayedLoadingState.startLoading("video-segment", "Loading video...");
    delayedLoadingState.startLoading("scrub-segment", "Loading scrub...");
    delayedLoadingState.startLoading("preload-1", "Preloading...", {
      background: true,
    });

    // Advance past threshold
    vi.advanceTimersByTime(250);
    expect(loadingStateHistory).toHaveLength(1);
    expect(loadingStateHistory[0]?.isLoading).toBe(true);

    // Simulate component disconnect (cleanup all)
    delayedLoadingState.clearAllLoading();

    // Should clear loading state
    expect(loadingStateHistory).toHaveLength(2);
    expect(loadingStateHistory[1]?.isLoading).toBe(false);

    // No further operations should affect state
    vi.advanceTimersByTime(1000);
    expect(loadingStateHistory).toHaveLength(2);
  });
});
