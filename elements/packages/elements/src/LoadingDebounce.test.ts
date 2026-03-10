import { afterEach, beforeEach, describe, expect, test } from "vitest";

/**
 * Test the debounced loading state logic that prevents flashing for fast operations
 */
describe("Loading Indicator Debouncing", () => {
  let loadingStates: Array<{
    timestamp: number;
    isLoading: boolean;
    message: string;
  }> = [];
  let loadingTimeout: NodeJS.Timeout | null = null;
  const LOADING_GRACE_PERIOD_MS = 250;

  // Mock loading state object
  let mockLoadingState = {
    isLoading: false,
    operation: null as string | null,
    message: "",
  };

  // Simulate the debounced loading state setter
  const setLoadingState = (isLoading: boolean, operation: string | null = null, message = "") => {
    if (isLoading) {
      // Don't show loading immediately - start grace period timer
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }

      loadingTimeout = setTimeout(() => {
        mockLoadingState = {
          isLoading: true,
          operation,
          message,
        };
        loadingStates.push({
          timestamp: Date.now(),
          isLoading: true,
          message,
        });
        loadingTimeout = null;
      }, LOADING_GRACE_PERIOD_MS);
    } else {
      // Clear immediately when hiding loading
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }

      mockLoadingState = {
        isLoading: false,
        operation: null,
        message: "",
      };
      loadingStates.push({
        timestamp: Date.now(),
        isLoading: false,
        message: "",
      });
    }
  };

  const clearLoadingState = () => {
    setLoadingState(false);
  };

  beforeEach(() => {
    loadingStates = [];
    mockLoadingState = { isLoading: false, operation: null, message: "" };
    loadingTimeout = null;
  });

  afterEach(() => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }
  });

  test("fast operation under 250ms does not show loading indicator", async () => {
    // Simulate fast operation
    setLoadingState(true, "video-segment", "Loading video segment...");

    // Wait 10ms (fast operation)
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Clear loading before grace period expires
    clearLoadingState();

    // Wait for grace period to potentially expire
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Should only see the clear event, not the show event (because grace period prevented it)
    expect(loadingStates.length).toBe(1);
    expect(loadingStates[0]?.isLoading).toBe(false);
    expect(mockLoadingState.isLoading).toBe(false);
  });

  test("slow operation over 250ms shows loading indicator", async () => {
    // Simulate slow operation
    setLoadingState(true, "video-segment", "Loading video segment...");

    // Wait for grace period to expire
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Now clear loading
    clearLoadingState();

    // Should see both show and hide events
    expect(loadingStates.length).toBe(2);
    expect(loadingStates[0]?.isLoading).toBe(true); // Showed after grace period
    expect(loadingStates[1]?.isLoading).toBe(false); // Cleared at end
  });

  test("multiple rapid operations only show loading once", async () => {
    const operations = ["seek-1", "seek-2", "seek-3", "seek-4", "seek-5"];

    for (const operation of operations) {
      // Start loading
      setLoadingState(true, "video-segment", `Loading ${operation}...`);

      // Fast completion (20ms each)
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Clear loading
      clearLoadingState();

      // Brief pause between operations
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    // Wait for any remaining grace periods
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Should only see clear events, no show events (all operations were too fast)
    const showEvents = loadingStates.filter((s) => s.isLoading);
    const hideEvents = loadingStates.filter((s) => !s.isLoading);

    expect(showEvents.length).toBe(0); // No loading shown due to grace period
    expect(hideEvents.length).toBe(operations.length); // Only clear events
  });

  test("cancelling loading during grace period prevents flash", async () => {
    // Start loading
    setLoadingState(true, "video-segment", "Loading video segment...");

    // Wait part of grace period (100ms < 250ms grace period)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cancel before grace period expires
    clearLoadingState();

    // Wait to ensure grace period would have expired
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should only see the clear event, loading never showed
    expect(loadingStates.length).toBe(1);
    expect(loadingStates[0]?.isLoading).toBe(false);
    expect(mockLoadingState.isLoading).toBe(false);
  });

  test("measures timing accuracy of grace period", async () => {
    const timingTests = [
      { waitTime: 100, shouldShow: false, name: "under-grace-period" },
      { waitTime: 200, shouldShow: false, name: "still-under-grace-period" },
      { waitTime: 300, shouldShow: true, name: "over-grace-period" },
      { waitTime: 500, shouldShow: true, name: "well-over-grace-period" },
    ];

    for (const test of timingTests) {
      // Reset state
      loadingStates = [];

      // Start loading
      setLoadingState(true, "video-segment", `Testing ${test.name}...`);

      // Wait specified time
      await new Promise((resolve) => setTimeout(resolve, test.waitTime));

      // Clear loading
      clearLoadingState();

      // Wait a bit more to ensure any delayed events fire
      await new Promise((resolve) => setTimeout(resolve, 50));

      const showEvents = loadingStates.filter((s) => s.isLoading);
      const didShow = showEvents.length > 0;

      expect(didShow).toBe(test.shouldShow);
    }
  });
});
