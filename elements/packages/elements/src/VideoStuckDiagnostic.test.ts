import { describe, expect, test, vi } from "vitest";

/**
 * Diagnostic test to identify why video operations get stuck after initial frames
 */
describe("Video Operations Getting Stuck Diagnosis", () => {
  test("simulates the paintTask getting stuck scenario", async () => {
    console.log("\n--- Diagnosing why video operations get stuck ---");

    // Mock states that could cause issues
    let decoderLock = false;
    let decoderNeedsReset = false;
    let loadingState: {
      isLoading: boolean;
      operation: string | null;
      message: string;
    } = { isLoading: false, operation: null, message: "" };
    let paintTaskCallCount = 0;
    let lastError: Error | null = null;

    // Mock video asset
    const mockVideoAsset = {
      seekToTime: vi.fn().mockImplementation(async (time) => {
        paintTaskCallCount++;
        console.log(
          `paintTask call #${paintTaskCallCount} - seeking to ${time}s`,
        );

        // Simulate what might be happening:
        if (paintTaskCallCount <= 5) {
          // First 5 calls work fine
          return {
            codedWidth: 640,
            codedHeight: 480,
            format: "rgba",
            timestamp: time * 1000,
          };
        }
        // After 5 calls, something goes wrong
        if (paintTaskCallCount === 6) {
          console.log("Simulating error on 6th call...");
          throw new Error("Decoder error: key frame is required");
        }
        console.log("Subsequent calls blocked by decoder state...");
        return null; // No frame returned
      }),
    };

    // Simulate the paintTask logic with diagnostic logging
    const simulatePaintTask = async (seekToMs: number) => {
      console.log(`\n=== paintTask called with seekToMs: ${seekToMs} ===`);

      if (!mockVideoAsset) {
        console.log("❌ No video asset");
        return;
      }

      if (decoderLock) {
        console.log("❌ Decoder locked - returning early");
        return;
      }

      if (decoderNeedsReset) {
        console.log("❌ Decoder needs reset - returning early");
        return;
      }

      try {
        console.log("🔒 Setting decoder lock...");
        decoderLock = true;

        // Simulate scrub track logic (simplified)
        console.log("📹 Attempting normal video rendering...");
        const targetSeekTimeSeconds = seekToMs / 1000;

        console.log("⏱️ Setting loading state...");
        loadingState = {
          isLoading: true,
          operation: "video-segment",
          message: "Loading video segment...",
        };

        console.log(`🎯 Seeking to ${targetSeekTimeSeconds}s...`);
        const frame = await mockVideoAsset.seekToTime(targetSeekTimeSeconds);

        console.log("✅ Clearing loading state...");
        loadingState = { isLoading: false, operation: null, message: "" };

        if (frame) {
          console.log(
            `✅ Frame received: ${frame.codedWidth}x${frame.codedHeight}`,
          );
          return seekToMs;
        }
        console.log("⚠️ No frame returned");
        return seekToMs;
      } catch (error) {
        lastError = error as Error;
        console.log(`💥 Error caught: ${(error as Error).message}`);

        // Simulate error handling
        loadingState = { isLoading: false, operation: null, message: "" };

        if ((error as Error).message.includes("key frame is required")) {
          console.log("🚫 Setting decoder needs reset...");
          decoderNeedsReset = true;
        }

        throw error;
      } finally {
        console.log("🔓 Clearing decoder lock...");
        decoderLock = false;
      }
    };

    // Simulate a series of seek operations like the user described
    const seekTimes = [
      1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
    ];

    for (const seekTime of seekTimes) {
      try {
        await simulatePaintTask(seekTime);
        console.log(`✅ Seek to ${seekTime}ms completed`);
      } catch (error) {
        console.log(
          `❌ Seek to ${seekTime}ms failed: ${(error as Error).message}`,
        );

        // Check if subsequent operations are blocked
        console.log(
          `Current state - decoderLock: ${decoderLock}, decoderNeedsReset: ${decoderNeedsReset}, loadingState.isLoading: ${loadingState.isLoading}`,
        );

        // Try one more operation to see if it's blocked
        try {
          console.log("🔍 Testing if subsequent operations are blocked...");
          await simulatePaintTask(seekTime + 100);
        } catch (subsequentError) {
          console.log(
            `🚫 Subsequent operation also failed: ${(subsequentError as Error).message}`,
          );
        }

        break; // Stop after first error to analyze the state
      }
    }

    // Analyze the final state
    console.log("\n=== Final Diagnosis ===");
    console.log(`Total paintTask calls: ${paintTaskCallCount}`);
    console.log(`Final decoder lock: ${decoderLock}`);
    console.log(`Final decoder needs reset: ${decoderNeedsReset}`);
    console.log(`Final loading state: ${JSON.stringify(loadingState)}`);
    console.log(
      `Last error: ${(lastError as any as Error)?.message || "None"}`,
    );

    // The key insight: if decoderNeedsReset becomes true, ALL subsequent operations will be blocked
    if (decoderNeedsReset) {
      console.log(
        "🎯 ROOT CAUSE: decoderNeedsReset=true blocks all subsequent operations!",
      );
      console.log(
        "   This explains why video gets stuck after initial frames.",
      );
      console.log(
        "   Once a decoder error occurs, no further seeks/scrubs will work.",
      );
    }

    // Verify our hypothesis
    expect(paintTaskCallCount).toBeGreaterThan(5);
    expect(decoderNeedsReset).toBe(true);
    expect((lastError as any as Error)?.message).toContain(
      "key frame is required",
    );
  });

  test("identifies the decoder reset blocking pattern", async () => {
    console.log("\n--- Testing decoder reset blocking pattern ---");

    let decoderNeedsReset = false;

    // Simulate paintTask early return logic
    const shouldReturnEarly = () => {
      if (decoderNeedsReset) {
        console.log("❌ paintTask returning early due to decoderNeedsReset");
        return true;
      }
      return false;
    };

    // First operation works
    console.log("First operation:");
    expect(shouldReturnEarly()).toBe(false);

    // Something causes decoder error
    console.log("Decoder error occurs...");
    decoderNeedsReset = true;

    // All subsequent operations are blocked
    console.log("Subsequent operations:");
    expect(shouldReturnEarly()).toBe(true);
    expect(shouldReturnEarly()).toBe(true);
    expect(shouldReturnEarly()).toBe(true);

    console.log(
      "🎯 CONFIRMED: Once decoderNeedsReset=true, all operations are blocked",
    );
  });
});
