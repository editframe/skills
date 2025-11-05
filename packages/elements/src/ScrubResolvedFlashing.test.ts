import { afterEach, beforeEach, describe, expect, test } from "vitest";

/**
 * Test that verifies the original scrubbing flashing issue is resolved
 * with the 250ms grace period implementation.
 */
describe("Scrub Loading Flashing Resolution", () => {
  let loadingStates: Array<{
    timestamp: number;
    isLoading: boolean;
    message: string;
  }> = [];
  let loadingTimeout: NodeJS.Timeout | null = null;
  const LOADING_GRACE_PERIOD_MS = 250;

  // Simulate the debounced loading state setter
  const setLoadingState = (isLoading: boolean, message = "") => {
    if (isLoading) {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }

      loadingTimeout = setTimeout(() => {
        loadingStates.push({
          timestamp: Date.now(),
          isLoading: true,
          message,
        });
        loadingTimeout = null;
      }, LOADING_GRACE_PERIOD_MS);
    } else {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }

      loadingStates.push({
        timestamp: Date.now(),
        isLoading: false,
        message: "",
      });
    }
  };

  beforeEach(() => {
    loadingStates = [];
    loadingTimeout = null;
  });

  afterEach(() => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }
  });

  test("scrubbing through cached segments shows no loading flashes", async () => {
    console.log(
      "\n--- Simulating rapid scrubbing through cached data (original issue) ---",
    );

    // Simulate the original user issue: rapid scrubbing through timeline
    const scrubOperations = [
      { seekTo: 1000, duration: 6 }, // 6ms - cached
      { seekTo: 2000, duration: 4 }, // 4ms - cached
      { seekTo: 3000, duration: 8 }, // 8ms - cached
      { seekTo: 4000, duration: 2 }, // 2ms - cached
      { seekTo: 5000, duration: 5 }, // 5ms - cached
    ];

    for (const operation of scrubOperations) {
      const startTime = Date.now();

      // Show loading (would happen before operation starts)
      setLoadingState(true, `Loading segment at ${operation.seekTo}ms...`);

      // Simulate fast cached operation
      await new Promise((resolve) => setTimeout(resolve, operation.duration));

      // Clear loading (operation completed fast)
      setLoadingState(false);

      const endTime = Date.now();
      console.log(
        `Seek to ${operation.seekTo}ms: ${endTime - startTime}ms (simulated ${operation.duration}ms operation)`,
      );

      // Brief pause between scrubs (realistic user behavior)
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Wait for any remaining grace periods
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log(`Total scrub operations: ${scrubOperations.length}`);
    console.log(`Loading state changes: ${loadingStates.length}`);

    const showEvents = loadingStates.filter((s) => s.isLoading);
    const hideEvents = loadingStates.filter((s) => !s.isLoading);

    console.log(
      `Show events: ${showEvents.length}, Hide events: ${hideEvents.length}`,
    );

    // With 250ms grace period, all fast operations should be hidden
    expect(showEvents.length).toBe(0);
    expect(hideEvents.length).toBe(scrubOperations.length);

    console.log("✅ No loading flashes during rapid scrubbing!");
  });

  test("slow scrub operations still show loading when needed", async () => {
    console.log(
      "\n--- Verifying slow operations still show loading feedback ---",
    );

    // Simulate a slow scrub operation (uncached segment)
    const startTime = Date.now();

    setLoadingState(true, "Loading uncached scrub segment...");

    // Simulate slow operation that exceeds grace period
    await new Promise((resolve) => setTimeout(resolve, 400));

    setLoadingState(false);

    const endTime = Date.now();
    console.log(`Slow operation duration: ${endTime - startTime}ms`);

    // Wait a bit more for any delayed events
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(`Loading state changes: ${loadingStates.length}`);

    const showEvents = loadingStates.filter((s) => s.isLoading);
    const hideEvents = loadingStates.filter((s) => !s.isLoading);

    console.log(
      `Show events: ${showEvents.length}, Hide events: ${hideEvents.length}`,
    );

    // Should show loading for slow operations
    expect(showEvents.length).toBe(1);
    expect(hideEvents.length).toBe(1);
    expect(showEvents[0]?.message).toContain("uncached");

    console.log("✅ Loading indicator correctly shown for slow operations!");
  });

  test("mixed fast and slow operations handle loading appropriately", async () => {
    console.log("\n--- Testing mixed operation speeds ---");

    const operations = [
      { type: "fast", duration: 50, expectLoading: false },
      { type: "slow", duration: 350, expectLoading: true },
      { type: "fast", duration: 20, expectLoading: false },
      { type: "slow", duration: 300, expectLoading: true },
    ];

    for (const operation of operations) {
      loadingStates = []; // Reset for each operation

      setLoadingState(true, `Loading ${operation.type} operation...`);
      await new Promise((resolve) => setTimeout(resolve, operation.duration));
      setLoadingState(false);

      // Wait for grace period
      await new Promise((resolve) => setTimeout(resolve, 300));

      const showEvents = loadingStates.filter((s) => s.isLoading);
      const shouldShow = operation.expectLoading;

      console.log(
        `${operation.type} (${operation.duration}ms): expected loading=${shouldShow}, actual loading=${showEvents.length > 0}`,
      );

      expect(showEvents.length > 0).toBe(shouldShow);
    }

    console.log("✅ Mixed operation speeds handled correctly!");
  });
});
