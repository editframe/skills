import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DelayedLoadingState } from "./DelayedLoadingState.js";

describe("DelayedLoadingState", () => {
  let delayedLoadingState: DelayedLoadingState;
  let mockStateChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockStateChange = vi.fn();
    delayedLoadingState = new DelayedLoadingState(
      250,
      mockStateChange as unknown as (
        isLoading: boolean,
        message: string,
      ) => void,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should not show loading immediately for fast operations", () => {
    // Start an operation
    delayedLoadingState.startLoading(
      "test-operation",
      "Testing fast operation",
    );

    // Check that loading is not shown immediately
    expect(delayedLoadingState.isLoading).toBe(false);
    expect(mockStateChange).not.toHaveBeenCalled();

    // Clear the operation before 250ms
    delayedLoadingState.clearLoading("test-operation");

    // Advance past 250ms threshold
    vi.advanceTimersByTime(300);

    // Loading should never have been shown
    expect(delayedLoadingState.isLoading).toBe(false);
    expect(mockStateChange).not.toHaveBeenCalled();
  });

  test("should show loading indicator only after 250ms delay", () => {
    // Start an operation
    delayedLoadingState.startLoading(
      "slow-operation",
      "Testing slow operation",
    );

    // Check that loading is not shown immediately
    expect(delayedLoadingState.isLoading).toBe(false);
    expect(mockStateChange).not.toHaveBeenCalled();

    // Advance time to just before 250ms threshold
    vi.advanceTimersByTime(249);
    expect(delayedLoadingState.isLoading).toBe(false);
    expect(mockStateChange).not.toHaveBeenCalled();

    // Advance past 250ms threshold
    vi.advanceTimersByTime(1);
    expect(delayedLoadingState.isLoading).toBe(true);
    expect(delayedLoadingState.message).toBe("Testing slow operation");
    expect(mockStateChange).toHaveBeenCalledWith(
      true,
      "Testing slow operation",
    );

    // Clear the operation
    delayedLoadingState.clearLoading("slow-operation");
    expect(delayedLoadingState.isLoading).toBe(false);
    expect(mockStateChange).toHaveBeenCalledWith(false, "");
  });

  test("should handle multiple concurrent operations", () => {
    // Start multiple operations
    delayedLoadingState.startLoading("operation-1", "Operation 1");
    delayedLoadingState.startLoading("operation-2", "Operation 2");

    // Advance past threshold
    vi.advanceTimersByTime(250);
    expect(delayedLoadingState.isLoading).toBe(true);
    expect(mockStateChange).toHaveBeenCalledWith(true, expect.any(String));

    // Complete one operation
    delayedLoadingState.clearLoading("operation-1");
    expect(delayedLoadingState.isLoading).toBe(true); // Still loading due to operation-2

    // Complete second operation
    delayedLoadingState.clearLoading("operation-2");
    expect(delayedLoadingState.isLoading).toBe(false);
    expect(mockStateChange).toHaveBeenCalledWith(false, "");
  });

  test("should not show loading for background operations", () => {
    // Start a background operation
    delayedLoadingState.startLoading(
      "background-preload",
      "Preloading segment",
      { background: true },
    );

    // Advance well past threshold
    vi.advanceTimersByTime(1000);

    // Loading should not be shown for background operations
    expect(delayedLoadingState.isLoading).toBe(false);
    expect(mockStateChange).not.toHaveBeenCalled();

    // Clean up
    delayedLoadingState.clearLoading("background-preload");
  });

  test("should use most recent operation message", () => {
    // Start multiple operations with different messages
    delayedLoadingState.startLoading("operation-1", "Loading video...");
    vi.advanceTimersByTime(50); // Small delay between operations
    delayedLoadingState.startLoading("operation-2", "Processing audio...");

    // Advance past threshold
    vi.advanceTimersByTime(250);

    // Should show the most recent message
    expect(delayedLoadingState.isLoading).toBe(true);
    expect(delayedLoadingState.message).toBe("Processing audio...");
    expect(mockStateChange).toHaveBeenCalledWith(true, "Processing audio...");
  });

  test("should properly clean up all operations", () => {
    // Start multiple operations
    delayedLoadingState.startLoading("operation-1", "Operation 1");
    delayedLoadingState.startLoading("operation-2", "Operation 2");

    // Advance past threshold to trigger loading
    vi.advanceTimersByTime(250);
    expect(delayedLoadingState.isLoading).toBe(true);

    // Clear all operations
    delayedLoadingState.clearAllLoading();

    // Loading state should be cleared
    expect(delayedLoadingState.isLoading).toBe(false);
    expect(mockStateChange).toHaveBeenCalledWith(false, "");
  });

  test("should handle mixed background and foreground operations", () => {
    // Start background operation
    delayedLoadingState.startLoading("background-op", "Background work", {
      background: true,
    });

    // Start foreground operation
    delayedLoadingState.startLoading("foreground-op", "User visible work");

    // Advance past threshold
    vi.advanceTimersByTime(250);

    // Should show loading due to foreground operation
    expect(delayedLoadingState.isLoading).toBe(true);
    expect(delayedLoadingState.message).toBe("User visible work");

    // Clear foreground operation
    delayedLoadingState.clearLoading("foreground-op");

    // Should not be loading anymore, even though background operation continues
    expect(delayedLoadingState.isLoading).toBe(false);

    // Clear background operation
    delayedLoadingState.clearLoading("background-op");
  });
});
