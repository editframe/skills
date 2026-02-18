import { describe, expect, test, vi } from "vitest";

/**
 * Diagnostic test to identify why video operations get stuck after initial frames
 */
describe("Video Operations Getting Stuck Diagnosis", () => {
  test("simulates the paintTask getting stuck scenario", async () => {
    // Mock states that could cause issues
    let decoderLock = false;
    let decoderNeedsReset = false;
    let paintTaskCallCount = 0;
    let lastError: Error | null = null;

    // Mock video asset
    const mockVideoAsset = {
      seekToTime: vi.fn().mockImplementation(async (time) => {
        paintTaskCallCount++;

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
          throw new Error("Decoder error: key frame is required");
        }
        return null; // No frame returned
      }),
    };

    // Simulate the paintTask logic with diagnostic logging
    const simulatePaintTask = async (seekToMs: number) => {
      if (!mockVideoAsset) {
        return;
      }

      if (decoderLock) {
        return;
      }

      if (decoderNeedsReset) {
        return;
      }

      try {
        decoderLock = true;

        // Simulate scrub track logic (simplified)
        const targetSeekTimeSeconds = seekToMs / 1000;

        const frame = await mockVideoAsset.seekToTime(targetSeekTimeSeconds);

        if (frame) {
          return seekToMs;
        }
        return seekToMs;
      } catch (error) {
        lastError = error as Error;

        if ((error as Error).message.includes("key frame is required")) {
          decoderNeedsReset = true;
        }

        throw error;
      } finally {
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
      } catch (error) {
        // Try one more operation to see if it's blocked
        try {
          await simulatePaintTask(seekTime + 100);
        } catch (subsequentError) {
          // subsequent operation also failed
        }

        break; // Stop after first error to analyze the state
      }
    }

    // Verify our hypothesis
    expect(paintTaskCallCount).toBeGreaterThan(5);
    expect(decoderNeedsReset).toBe(true);
    expect((lastError as any as Error)?.message).toContain(
      "key frame is required",
    );
  });

  test("identifies the decoder reset blocking pattern", async () => {
    let decoderNeedsReset = false;

    // Simulate paintTask early return logic
    const shouldReturnEarly = () => {
      if (decoderNeedsReset) {
        return true;
      }
      return false;
    };

    // First operation works
    expect(shouldReturnEarly()).toBe(false);

    // Something causes decoder error
    decoderNeedsReset = true;

    // All subsequent operations are blocked
    expect(shouldReturnEarly()).toBe(true);
    expect(shouldReturnEarly()).toBe(true);
    expect(shouldReturnEarly()).toBe(true);
  });
});
