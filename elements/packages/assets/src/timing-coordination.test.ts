import { test, describe, expect, beforeEach, afterEach } from "vitest";
import { rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

/**
 * Test to verify that our race condition fix properly coordinates
 * stream completion with fragment index generation
 */
describe("timing coordination", () => {
  let testDir: string;
  const testFilePath = "/packages/test-assets/bars-n-tone.mp4";

  beforeEach(async () => {
    // Verify test file exists
    try {
      await access(testFilePath);
    } catch (error) {
      throw new Error(`Test file not found: ${testFilePath}. Current directory: ${process.cwd()}`);
    }

    testDir = join(process.cwd(), "test-assets", ".cache", "timing-test");
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("stream should not end until fragment index is complete", async () => {
    const { generateSingleTrackFromPath } = await import("./generateSingleTrack.js");

    // Track timing of events
    let streamEndTime: number | null = null;
    let fragmentIndexCompleteTime: number | null = null;
    const startTime = Date.now();

    const result = await generateSingleTrackFromPath(testFilePath, 2);

    // Track when stream ends
    result.stream.on("end", () => {
      streamEndTime = Date.now() - startTime;
    });

    // Track when fragment index completes
    const fragmentIndexPromise = result.fragmentIndex.then(() => {
      fragmentIndexCompleteTime = Date.now() - startTime;
    });

    // Consume the stream
    const chunks: Buffer[] = [];
    result.stream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    // Wait for both to complete
    await Promise.all([
      new Promise<void>((resolve) => result.stream.on("end", resolve)),
      fragmentIndexPromise,
    ]);

    // Verify both completed
    expect(streamEndTime).not.toBeNull();
    expect(fragmentIndexCompleteTime).not.toBeNull();

    // CRITICAL: Stream should end AFTER or at the same time as fragment index
    // This ensures idempotentTask doesn't complete before fragment index is ready
    expect(streamEndTime!).toBeGreaterThanOrEqual(fragmentIndexCompleteTime!);

    // Verify we got data
    expect(chunks.length).toBeGreaterThan(0);
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    expect(totalSize).toBeGreaterThan(0);
  }, 10000);
});
