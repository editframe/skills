import { test, describe, assert } from "vitest";
import { generateSingleTrackFromPath, generateSingleTrackWithIndex } from "./generateSingleTrack";
import { Probe } from "./Probe.js";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

describe("generateSingleTrack", () => {
  test("should generate single video track stream and fragment index", async () => {
    const result = await generateSingleTrackFromPath("test-assets/10s-bars.mp4", 1);

    // Collect the stream data
    const chunks: Buffer[] = [];
    const dest = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });

    await pipeline(result.stream, dest);
    const fragmentIndex = await result.fragmentIndex;

    // Should have collected MP4 data
    assert.isAbove(chunks.length, 0, "Should have MP4 chunks");
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    assert.isAbove(totalSize, 1000, "Should have substantial MP4 data");

    // Should have fragment index for single track
    assert.isObject(fragmentIndex);
    const trackIds = Object.keys(fragmentIndex).map(Number);
    assert.equal(trackIds.length, 1, "Should have exactly one track in index");

    const track = fragmentIndex[trackIds[0]!]!;
    assert.equal(track.type, "video", "Track should be video type");
    assert.isAbove(track.segments.length, 0, "Should have segments");
    assert.equal(track.initSegment.offset, 0, "Init segment should start at 0");
    assert.isAbove(track.initSegment.size, 0, "Init segment should have size");

    console.log(`Generated ${totalSize} bytes for video track with ${track.segments.length} segments`);
  }, 15000);

  test("should generate single audio track stream and fragment index", async () => {
    const result = await generateSingleTrackFromPath("test-assets/10s-bars.mp4", 2);

    // Collect the stream data
    const chunks: Buffer[] = [];
    const dest = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });

    await pipeline(result.stream, dest);
    const fragmentIndex = await result.fragmentIndex;

    // Should have collected MP4 data
    assert.isAbove(chunks.length, 0, "Should have MP4 chunks");
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    assert.isAbove(totalSize, 1000, "Should have substantial MP4 data");

    // Should have fragment index for single track
    assert.isObject(fragmentIndex);
    const trackIds = Object.keys(fragmentIndex).map(Number);
    assert.equal(trackIds.length, 1, "Should have exactly one track in index");

    const track = fragmentIndex[trackIds[0]!]!;
    assert.equal(track.type, "audio", "Track should be audio type");
    assert.isAbove(track.segments.length, 0, "Should have segments");
    assert.equal(track.initSegment.offset, 0, "Init segment should start at 0");
    assert.isAbove(track.initSegment.size, 0, "Init segment should have size");

    console.log(`Generated ${totalSize} bytes for audio track with ${track.segments.length} segments`);
  }, 15000);

  test("should handle track extraction with fragment index events", async () => {
    const trackStream = await generateSingleTrackWithIndex("test-assets/frame-count.mp4", 1);

    let fragmentIndex: any = null;
    let chunks: Buffer[] = [];

    // Listen for fragment index event
    trackStream.on('fragmentIndex', (index) => {
      fragmentIndex = index;
    });

    // Collect stream data
    trackStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Wait for stream completion
    await new Promise<void>((resolve, reject) => {
      trackStream.on('end', resolve);
      trackStream.on('error', reject);
    });

    // Verify we got both data and index
    assert.isAbove(chunks.length, 0, "Should have MP4 chunks");
    assert.isNotNull(fragmentIndex, "Should have received fragment index");

    const trackIds = Object.keys(fragmentIndex).map(Number);
    assert.equal(trackIds.length, 1, "Should have exactly one track");

    const track = fragmentIndex[trackIds[0]!];
    assert.equal(track.type, "video", "Should be video track");
    assert.isAbove(track.segments.length, 0, "Should have segments");

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    console.log(`Event-based: ${totalSize} bytes, ${track.segments.length} segments`);
  }, 15000);

  test("should handle invalid track IDs gracefully", async () => {
    try {
      await generateSingleTrackFromPath("test-assets/frame-count.mp4", 5);
      assert.fail("Should have thrown for invalid track ID");
    } catch (error) {
      assert.instanceOf(error, Error);
      assert.include(error.message, "Track 5 not found");
    }
  });

  test("should work with different file types", async () => {
    const testFiles = [
      { path: "test-assets/10s-bars.mp4", trackIndex: 1, expectedType: "video" },
      { path: "test-assets/10s-bars.mp4", trackIndex: 2, expectedType: "audio" },
      { path: "test-assets/bars-n-tone.mp4", trackIndex: 1, expectedType: "video" },
      { path: "test-assets/bars-n-tone.mp4", trackIndex: 2, expectedType: "audio" },
    ];

    for (const testFile of testFiles) {
      console.log(`\nTesting ${testFile.path} track ${testFile.trackIndex}...`);

      const result = await generateSingleTrackFromPath(testFile.path, testFile.trackIndex);

      // Collect minimal data to verify it works
      const chunks: Buffer[] = [];
      const dest = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      await pipeline(result.stream, dest);
      const fragmentIndex = await result.fragmentIndex;

      assert.isAbove(chunks.length, 0, `${testFile.path} should produce data`);
      assert.isObject(fragmentIndex, `${testFile.path} should have fragment index`);

      const trackIds = Object.keys(fragmentIndex).map(Number);
      assert.equal(trackIds.length, 1, `${testFile.path} should have one track`);

      const track = fragmentIndex[trackIds[0]!]!;
      assert.equal(track.type, testFile.expectedType, `${testFile.path} should be ${testFile.expectedType}`);

      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      console.log(`${testFile.path} track ${testFile.trackIndex}: ${totalSize} bytes, ${track.segments.length} segments`);
    }
  }, 30000);
});
