import { test, describe, assert } from "vitest";
import { generateScrubTrack } from "./generateScrubTrack";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

describe("generateScrubTrack", () => {
  test("should generate scrub track for video file", async () => {
    const cacheRoot = "test-assets/.cache";
    const absolutePath = "test-assets/10s-bars.mp4";

    const taskResult = await generateScrubTrack(cacheRoot, absolutePath);

    // Verify task result has cache path and MD5
    assert.isDefined(taskResult.cachePath, "Should have cache path");
    assert.isDefined(taskResult.md5Sum, "Should have MD5 sum");

    // Read the cached file to verify it was generated
    const { createReadStream } = await import("node:fs");
    const fileStream = createReadStream(taskResult.cachePath);

    // Collect the generated scrub track data
    const chunks: Buffer[] = [];
    const dest = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    await pipeline(fileStream, dest);

    // Verify we got MP4 data
    assert.isAbove(chunks.length, 0, "Should generate MP4 chunks");
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    assert.isAbove(totalSize, 1000, "Should generate substantial MP4 data");

    // Verify it's valid MP4 by checking for ftyp box
    const allData = Buffer.concat(chunks);
    const ftypIndex = allData.indexOf("ftyp");
    assert.isAbove(ftypIndex, -1, "Should contain ftyp box (valid MP4)");
  }, 30000);

  test("should handle files without video streams", async () => {
    // This test would need an audio-only file, skip for now
    // as we don't have one in test-assets
  });

  test("should cache scrub track and return same result on second call", async () => {
    const cacheRoot = "test-assets/.cache";
    const absolutePath = "test-assets/10s-bars.mp4";

    const result1 = await generateScrubTrack(cacheRoot, absolutePath);
    const result2 = await generateScrubTrack(cacheRoot, absolutePath);

    // Should return same cache path and MD5 (cached)
    assert.equal(result1.cachePath, result2.cachePath, "Should return same cache path");
    assert.equal(result1.md5Sum, result2.md5Sum, "Should return same MD5 sum");
  }, 30000);
});
