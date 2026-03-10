import { test, describe, assert, beforeEach, afterEach } from "vitest";
import { Readable, Transform } from "node:stream";
import { generateFragmentIndex } from "./generateFragmentIndex";
import { Probe } from "./Probe.js";
import type { TrackFragmentIndex, VideoTrackFragmentIndex } from "./Probe.js";
import { mkdir, rm, readdir } from "node:fs/promises";
import { join } from "node:path";

// =============================================================================
// Test Fixtures: Single Source of Truth for Expected Data
// =============================================================================

/**
 * Expected track metadata for frame-count.mp4
 * Invariants: video track with specific dimensions, codec, and timing
 */
const FRAME_COUNT_VIDEO_TRACK: Partial<VideoTrackFragmentIndex> = {
  track: 1,
  type: "video",
  width: 1280,
  height: 720,
  timescale: 10240,
  codec: "avc1.64001f",
  duration: 102400,
  startTimeOffsetMs: 200,
  sample_count: 100,
  initSegment: { offset: 0, size: 919 },
} as const;

/**
 * Expected structure for bars-n-tone.mp4
 * Multi-track file with video and audio
 */
const BARS_N_TONE_EXPECTED: Record<number, TrackFragmentIndex> = {
  1: {
    track: 1,
    type: "video",
    width: 384,
    height: 216,
    timescale: 15360,
    sample_count: 300,
    codec: "avc1.64000d",
    duration: 153088,
    startTimeOffsetMs: 66.667,
    initSegment: { offset: 0, size: 3540 },
    segments: [
      { cts: 31744, dts: 30720, duration: 61440, offset: 105148, size: 199191 },
      { cts: 93184, dts: 92160, duration: 61440, offset: 304339, size: 190990 },
    ],
  },
  2: {
    track: 2,
    type: "audio",
    channel_count: 1,
    sample_rate: 44100,
    sample_size: 0,
    sample_count: 432,
    timescale: 44100,
    codec: "mp4a",
    duration: 355328,
    startTimeOffsetMs: undefined,
    initSegment: { offset: 0, size: 3540 },
    segments: [
      {
        cts: 88956,
        dts: 88956,
        duration: 176128,
        offset: 105148,
        size: 199191,
      },
      {
        cts: 265084,
        dts: 265084,
        duration: 179200,
        offset: 304339,
        size: 190990,
      },
    ],
  },
};

// =============================================================================
// Test Helpers: Separate Mechanism from Semantics
// =============================================================================

/** Creates a test stream from a real MP4 file through Probe */
async function createTestStreamFromFile(filePath: string): Promise<Readable> {
  const probe = await Probe.probePath(filePath);
  return probe.createConformingReadstream();
}

/** Creates an empty readable stream for edge case testing */
function createEmptyStream(): Readable {
  return new Readable({
    read() {
      this.push(null);
    },
  });
}

/** Creates a stream that emits an error for error handling tests */
function createErrorStream(errorMessage: string): Readable {
  return new Readable({
    read() {
      this.emit("error", new Error(errorMessage));
    },
  });
}

// =============================================================================
// Assertion Helpers: Make Invariants Obvious
// =============================================================================

/** Type guard: determines if track is a video track */
function isVideoTrack(track: TrackFragmentIndex): track is VideoTrackFragmentIndex {
  return track.type === "video";
}

/**
 * Validates that a video track matches expected metadata.
 * Invariant: Video track must have all required fields with correct values.
 */
function assertVideoTrackMetadata(
  actual: TrackFragmentIndex,
  expected: Partial<VideoTrackFragmentIndex>,
): void {
  assert.equal(actual.type, "video", "Expected video track");
  if (!isVideoTrack(actual)) return;

  if (expected.track !== undefined) assert.equal(actual.track, expected.track);
  if (expected.width !== undefined) assert.equal(actual.width, expected.width);
  if (expected.height !== undefined) assert.equal(actual.height, expected.height);
  if (expected.timescale !== undefined) assert.equal(actual.timescale, expected.timescale);
  if (expected.codec !== undefined) assert.equal(actual.codec, expected.codec);
  if (expected.duration !== undefined) assert.equal(actual.duration, expected.duration);
  if (expected.sample_count !== undefined) assert.equal(actual.sample_count, expected.sample_count);
  if (expected.startTimeOffsetMs !== undefined) {
    assert.equal(actual.startTimeOffsetMs, expected.startTimeOffsetMs);
  }
}

/**
 * Validates init segment structure.
 * Invariant: Init segment must have offset and positive size.
 */
function assertInitSegment(
  actual: TrackFragmentIndex,
  expected: { offset: number; size: number },
): void {
  assert.isObject(actual.initSegment, "Should have init segment");
  assert.equal(actual.initSegment.offset, expected.offset);
  assert.equal(actual.initSegment.size, expected.size);
}

/**
 * Validates segment array structure.
 * Invariant: Each segment must have offset and positive size.
 */
function assertSegmentsValid(segments: TrackFragmentIndex["segments"]): void {
  assert.isArray(segments, "Should have segments array");
  for (const segment of segments) {
    assert.isNumber(segment.offset, "Segment should have offset");
    assert.isNumber(segment.size, "Segment should have size");
    assert.isAbove(segment.size, 0, "Segment size should be positive");
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("generateFragmentIndex", () => {
  describe("single video track files", () => {
    test("frame-count.mp4 generates correct track metadata and segments", async () => {
      const testStream = await createTestStreamFromFile("test-assets/frame-count.mp4");
      const result = await generateFragmentIndex(testStream);

      // Validate structure
      assert.isObject(result);
      assert.hasAllKeys(result, ["1"]);

      const track = result[1]!;

      // Validate track metadata against expected invariants
      assertVideoTrackMetadata(track, FRAME_COUNT_VIDEO_TRACK);
      assertInitSegment(track, FRAME_COUNT_VIDEO_TRACK.initSegment!);

      // Validate segmentation
      assert.equal(track.segments.length, 5, "Should have 5 consolidated segments");
      assertSegmentsValid(track.segments);
    }, 15000);
  });

  describe("multi-track files", () => {
    test.skip("10s-bars.mp4 generates expected multi-track structure", async () => {
      const testStream = await createTestStreamFromFile("test-assets/10s-bars.mp4");
      const result = await generateFragmentIndex(testStream);

      const expected: Record<number, TrackFragmentIndex> = {
        1: {
          track: 1,
          type: "video",
          width: 192,
          height: 108,
          timescale: 12800,
          sample_count: 200,
          codec: "avc1.64000b",
          duration: 102400,
          startTimeOffsetMs: undefined,
          initSegment: { offset: 0, size: 2951 },
          segments: [
            {
              cts: 26624,
              dts: 26624,
              duration: 20480,
              offset: 2951,
              size: 18140,
            },
            {
              cts: 46592,
              dts: 46592,
              duration: 20480,
              offset: 21091,
              size: 19705,
            },
            {
              cts: 67584,
              dts: 67584,
              duration: 20480,
              offset: 40796,
              size: 19723,
            },
            {
              cts: 87552,
              dts: 87552,
              duration: 20480,
              offset: 60519,
              size: 19781,
            },
            {
              cts: 108544,
              dts: 108544,
              duration: 20480,
              offset: 80300,
              size: 20290,
            },
          ],
        },
        2: {
          track: 2,
          type: "audio",
          channel_count: 1,
          sample_rate: 48000,
          sample_size: 16,
          sample_count: 379,
          timescale: 48000,
          codec: "mp4a.40.2",
          duration: 388096,
          initSegment: { offset: 0, size: 2951 },
          segments: [
            {
              cts: 96000,
              dts: 96000,
              duration: 77824,
              offset: 2951,
              size: 18140,
            },
            {
              cts: 173824,
              dts: 173824,
              duration: 77824,
              offset: 21091,
              size: 19705,
            },
            {
              cts: 251648,
              dts: 251648,
              duration: 77824,
              offset: 40796,
              size: 19723,
            },
            {
              cts: 329472,
              dts: 329472,
              duration: 77824,
              offset: 60519,
              size: 19781,
            },
            {
              cts: 407296,
              dts: 407296,
              duration: 76800,
              offset: 80300,
              size: 20290,
            },
          ],
        },
      };

      assert.deepEqual(result, expected);
    }, 20000);

    test.skip("10s-bars.frag.mp4 generates expected fragmented structure", async () => {
      const testStream = await createTestStreamFromFile("test-assets/10s-bars.frag.mp4");
      const result = await generateFragmentIndex(testStream);

      const expected: Record<number, TrackFragmentIndex> = {
        1: {
          track: 1,
          type: "video",
          width: 192,
          height: 108,
          timescale: 12800,
          sample_count: 200,
          codec: "avc1.64000b",
          duration: 102400,
          startTimeOffsetMs: undefined,
          initSegment: { offset: 0, size: 2939 },
          segments: [
            {
              cts: 26624,
              dts: 26624,
              duration: 20480,
              offset: 2939,
              size: 18685,
            },
            {
              cts: 46592,
              dts: 46592,
              duration: 20480,
              offset: 21624,
              size: 19718,
            },
            {
              cts: 67584,
              dts: 67584,
              duration: 20480,
              offset: 41342,
              size: 19714,
            },
            {
              cts: 87552,
              dts: 87552,
              duration: 20480,
              offset: 61056,
              size: 19620,
            },
            {
              cts: 108544,
              dts: 108544,
              duration: 20480,
              offset: 80676,
              size: 19890,
            },
          ],
        },
        2: {
          track: 2,
          type: "audio",
          channel_count: 1,
          sample_rate: 48000,
          sample_size: 16,
          sample_count: 376,
          timescale: 48000,
          codec: "mp4a.40.2",
          duration: 385024,
          initSegment: { offset: 0, size: 2939 },
          segments: [
            {
              cts: 96256,
              dts: 96256,
              duration: 77824,
              offset: 2939,
              size: 18685,
            },
            {
              cts: 174080,
              dts: 174080,
              duration: 77824,
              offset: 21624,
              size: 19718,
            },
            {
              cts: 251904,
              dts: 251904,
              duration: 77824,
              offset: 41342,
              size: 19714,
            },
            {
              cts: 329728,
              dts: 329728,
              duration: 77824,
              offset: 61056,
              size: 19620,
            },
            {
              cts: 407552,
              dts: 407552,
              duration: 73728,
              offset: 80676,
              size: 19890,
            },
          ],
        },
      };

      assert.deepEqual(result, expected);
    }, 20000);

    test("bars-n-tone.mp4 generates expected multi-track structure", async () => {
      const testStream = await createTestStreamFromFile("test-assets/bars-n-tone.mp4");
      const result = await generateFragmentIndex(testStream);

      assert.deepEqual(result, BARS_N_TONE_EXPECTED);
    }, 20000);
  });

  describe("streaming behavior", () => {
    test.skip("handles streaming with minimal memory usage via small chunks", async () => {
      const probe = await Probe.probePath("test-assets/frame-count.mp4");
      const sourceStream = probe.createConformingReadstream();

      // Transform that breaks data into very small chunks to verify streaming
      const chunkedStream = new Transform({
        transform(chunk, _encoding, callback) {
          let offset = 0;
          const pushSmallChunk = () => {
            if (offset < chunk.length) {
              const chunkSize = Math.min(128, chunk.length - offset);
              this.push(chunk.subarray(offset, offset + chunkSize));
              offset += chunkSize;
              setImmediate(pushSmallChunk);
            } else {
              callback();
            }
          };
          pushSmallChunk();
        },
      });

      sourceStream.pipe(chunkedStream);
      const result = await generateFragmentIndex(chunkedStream);

      // Validate core structure matches expected
      const track = result[1]!;
      assert.equal(track.track, 1);
      assert.isTrue(isVideoTrack(track), "Expected video track");
      if (isVideoTrack(track)) {
        assert.equal(track.width, 1280);
        assert.equal(track.height, 720);
      }
      assert.equal(track.segments.length, 10);
      assertSegmentsValid(track.segments);
    }, 15000);
  });

  describe("tmpDir option", () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = join(process.cwd(), "test-tmp-" + Date.now());
      await mkdir(tmpDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(tmpDir, { recursive: true, force: true });
    });

    test("writes temp file to tmpDir and cleans it up after probing", async () => {
      const testStream = await createTestStreamFromFile("test-assets/frame-count.mp4");

      // Spy on tmpDir: sample for files during execution using polling
      let peakFileCount = 0;
      // Use a polling approach: check the dir after a small delay inside the promise
      const resultPromise = generateFragmentIndex(testStream, undefined, undefined, { tmpDir });

      // Poll tmpDir while the promise is running
      const poll = setInterval(async () => {
        try {
          const files = await readdir(tmpDir);
          peakFileCount = Math.max(peakFileCount, files.length);
        } catch {}
      }, 5);

      const result = await resultPromise;
      clearInterval(poll);

      // Result should be identical to calling without tmpDir
      assert.isObject(result);
      assert.hasAllKeys(result, ["1"]);
      const track = result[1]!;
      assertVideoTrackMetadata(track, FRAME_COUNT_VIDEO_TRACK);

      // A temp file must have been created in tmpDir during execution
      assert.isAbove(
        peakFileCount,
        0,
        "Temp file should have been written to tmpDir during probing",
      );

      // No temp files should remain in tmpDir after completion
      const remaining = await readdir(tmpDir);
      assert.deepEqual(remaining, [], "No temp files should remain in tmpDir after completion");
    }, 15000);

    test("produces identical output with and without tmpDir", async () => {
      const stream1 = await createTestStreamFromFile("test-assets/bars-n-tone.mp4");
      const stream2 = await createTestStreamFromFile("test-assets/bars-n-tone.mp4");

      const withTmpDir = await generateFragmentIndex(stream1, undefined, undefined, { tmpDir });
      const withoutTmpDir = await generateFragmentIndex(stream2);

      assert.deepEqual(withTmpDir, withoutTmpDir);
    }, 30000);
  });

  describe("edge cases and error handling", () => {
    test("empty stream returns empty index", async () => {
      const emptyStream = createEmptyStream();
      const result = await generateFragmentIndex(emptyStream);

      assert.deepEqual(result, {});
    });

    test("stream errors propagate correctly", async () => {
      const errorMessage = "Stream processing error";
      const errorStream = createErrorStream(errorMessage);

      try {
        await generateFragmentIndex(errorStream);
        assert.fail("Expected function to throw");
      } catch (error) {
        assert.instanceOf(error, Error);
        assert.include((error as Error).message, errorMessage);
      }
    });
  });
});
