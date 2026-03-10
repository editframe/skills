import { test, describe, assert } from "vitest";
import { generateTrackFromPath } from "./generateTrack";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

describe("generateTrack", () => {
  test("should generate video track", async () => {
    const trackStream = await generateTrackFromPath("test-assets/10s-bars.mp4", 1);

    // Collect the generated track data
    const chunks: Buffer[] = [];
    const dest = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    await pipeline(trackStream, dest);

    // Verify we got MP4 data
    assert.isAbove(chunks.length, 0, "Should generate MP4 chunks");
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    assert.isAbove(totalSize, 1000, "Should generate substantial MP4 data");

    // Verify it's valid MP4 by checking for ftyp box
    const allData = Buffer.concat(chunks);
    const ftypIndex = allData.indexOf("ftyp");
    assert.isAbove(ftypIndex, -1, "Should contain ftyp box (valid MP4)");
  }, 15000);

  test("should generate audio track", async () => {
    const trackStream = await generateTrackFromPath("test-assets/10s-bars.mp4", 2);

    // Collect the generated track data
    const chunks: Buffer[] = [];
    const dest = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    await pipeline(trackStream, dest);

    // Verify we got MP4 data
    assert.isAbove(chunks.length, 0, "Should generate MP4 chunks");
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    assert.isAbove(totalSize, 1000, "Should generate substantial MP4 data");

    // Verify it's valid MP4 by checking for ftyp box
    const allData = Buffer.concat(chunks);
    const ftypIndex = allData.indexOf("ftyp");
    assert.isAbove(ftypIndex, -1, "Should contain ftyp box (valid MP4)");
  }, 15000);

  test("should handle invalid track IDs gracefully", async () => {
    try {
      await generateTrackFromPath("test-assets/frame-count.mp4", 5);
      assert.fail("Should have thrown for invalid track ID");
    } catch (error) {
      assert.instanceOf(error, Error);
      assert.include(error.message, "Track 5 not found");
    }
  });

  test("should work with single track files", async () => {
    const trackStream = await generateTrackFromPath("test-assets/frame-count.mp4", 1);

    const chunks: Buffer[] = [];
    const dest = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    await pipeline(trackStream, dest);

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    assert.isAbove(totalSize, 1000, "Should generate data for single track file");
  }, 15000);
});
