import { describe, test, expect } from "vitest";
import {
  AUDIO_FRAME_DURATION_US,
  STANDARD_SAMPLE_RATE,
  AAC_FRAME_SIZE_SAMPLES,
  getClosestAlignedTimeUs,
  getClosestAlignedAACFrameIndex,
  calculateAlignedTiming,
  generateConcatTimings,
  generateConcatDirective,
  type SegmentTimingOptions,
} from "./AudioTiming.js";

describe("AudioTiming", () => {
  describe("Constants", () => {
    test("AAC frame duration constants are mathematically correct", () => {
      const expectedMs = (1024 / 48000) * 1000;
      const expectedUs = expectedMs * 1000;

      expect(AUDIO_FRAME_DURATION_US).toBeCloseTo(expectedUs, 6);
      expect(STANDARD_SAMPLE_RATE).toBe(48000);
      expect(AAC_FRAME_SIZE_SAMPLES).toBe(1024);
    });

    test("frame duration is approximately 21.33ms", () => {
      const frameMs = AUDIO_FRAME_DURATION_US / 1000;
      expect(frameMs).toBeCloseTo(21.333333, 5);
    });
  });

  describe("getClosestAlignedTimeUs", () => {
    test("aligns to exact AAC frame boundaries", () => {
      expect(getClosestAlignedTimeUs(0)).toBe(0);
      expect(getClosestAlignedTimeUs(AUDIO_FRAME_DURATION_US)).toBeCloseTo(
        AUDIO_FRAME_DURATION_US,
        6,
      );
      expect(getClosestAlignedTimeUs(AUDIO_FRAME_DURATION_US * 2)).toBeCloseTo(
        AUDIO_FRAME_DURATION_US * 2,
        6,
      );
    });

    test("rounds to nearest frame boundary", () => {
      const halfFrame = AUDIO_FRAME_DURATION_US / 2;

      expect(getClosestAlignedTimeUs(halfFrame * 0.8)).toBeCloseTo(0, 6);

      expect(getClosestAlignedTimeUs(halfFrame * 1.2)).toBeCloseTo(
        AUDIO_FRAME_DURATION_US,
        6,
      );
    });

    test("handles common video timing values", () => {
      const testCases = [
        { inputMs: 1000, expectedFrames: Math.round(1000000 / AUDIO_FRAME_DURATION_US) },
        { inputMs: 2000, expectedFrames: Math.round(2000000 / AUDIO_FRAME_DURATION_US) },
        { inputMs: 5000, expectedFrames: Math.round(5000000 / AUDIO_FRAME_DURATION_US) },
      ];

      testCases.forEach(({ inputMs, expectedFrames }) => {
        const inputUs = inputMs * 1000;
        const result = getClosestAlignedTimeUs(inputUs);
        const expectedUs = expectedFrames * AUDIO_FRAME_DURATION_US;

        expect(result).toBeCloseTo(expectedUs, 6);
      });
    });
  });

  describe("calculateAlignedTiming", () => {
    test("calculates timing for init segment without padding", () => {
      const options: SegmentTimingOptions = {
        segmentStartMs: 0,
        segmentEndMs: 1000,
        sequenceNumber: 0,
        isInitSegment: true,
      };

      const result = calculateAlignedTiming(options);

      expect(result.paddedStart).toBe(false);
      expect(result.paddedEnd).toBe(false);
      expect(result.alignedFromUs).toBe(0);
      expect(result.alignedToUs).toBeCloseTo(
        getClosestAlignedTimeUs(1000 * 1000),
        6,
      );
    });

    test("calculates timing for first media segment without start padding", () => {
      const options: SegmentTimingOptions = {
        segmentStartMs: 0,
        segmentEndMs: 2000,
        sequenceNumber: 0,
        isInitSegment: false,
      };

      const result = calculateAlignedTiming(options);

      expect(result.paddedStart).toBe(false);
      expect(result.paddedEnd).toBe(true);
      expect(result.alignedFromUs).toBe(0);
      expect(result.alignedToUs).toBeCloseTo(
        getClosestAlignedTimeUs(2000 * 1000) + AUDIO_FRAME_DURATION_US * 4,
        6,
      );
    });

    test("calculates timing for middle media segment with 4-frame padding", () => {
      const options: SegmentTimingOptions = {
        segmentStartMs: 2000,
        segmentEndMs: 4000,
        sequenceNumber: 1,
        isInitSegment: false,
      };

      const result = calculateAlignedTiming(options);

      expect(result.paddedStart).toBe(true);
      expect(result.paddedEnd).toBe(true);

      expect(result.alignedFromUs).toBeCloseTo(
        getClosestAlignedTimeUs(2000 * 1000) - AUDIO_FRAME_DURATION_US * 4,
        6,
      );

      expect(result.alignedToUs).toBeCloseTo(
        getClosestAlignedTimeUs(4000 * 1000) + AUDIO_FRAME_DURATION_US * 4,
        6,
      );
    });

    test("calculates timing for last segment without end padding", () => {
      const options: SegmentTimingOptions = {
        segmentStartMs: 4000,
        segmentEndMs: 6000,
        sequenceNumber: 2,
        isInitSegment: false,
        isLastSegment: true,
      };

      const result = calculateAlignedTiming(options);

      expect(result.paddedStart).toBe(true);
      expect(result.paddedEnd).toBe(false);

      expect(result.alignedFromUs).toBeCloseTo(
        getClosestAlignedTimeUs(4000 * 1000) - AUDIO_FRAME_DURATION_US * 4,
        6,
      );

      expect(result.alignedToUs).toBeCloseTo(
        getClosestAlignedTimeUs(6000 * 1000),
        6,
      );
    });

    test("handles edge case of very short segment", () => {
      const options: SegmentTimingOptions = {
        segmentStartMs: 100,
        segmentEndMs: 200,
        sequenceNumber: 1,
        isInitSegment: false,
      };

      const result = calculateAlignedTiming(options);

      expect(result.paddedStart).toBe(true);
      expect(result.paddedEnd).toBe(true);

      expect(result.alignedToUs).toBeGreaterThan(result.alignedFromUs);
    });
  });

  describe("generateConcatTimings", () => {
    test("returns frame indices and durations for first segment", () => {
      const result = generateConcatTimings(0, 1000, 0);

      expect(result.fromIndex).toBe(
        getClosestAlignedAACFrameIndex(0),
      );
      expect(result.toIndex).toBe(
        getClosestAlignedAACFrameIndex(1000 * 1000),
      );
      expect(result.durationFrames).toBe(result.toIndex - result.fromIndex);
      expect(result.seekToUs).toBe(0);
      expect(result.seekToMs).toBe(0);
    });

    test("applies 2-frame trim start for subsequent segments", () => {
      const result = generateConcatTimings(2000, 4000, 1);

      expect(result.seekToUs).toBe(AUDIO_FRAME_DURATION_US * 2);
      expect(result.seekToMs).toBeCloseTo(result.seekToUs / 1000, 6);
    });

    test("duration fields are consistent", () => {
      const result = generateConcatTimings(0, 2000, 0);

      const expectedDurationUs =
        result.durationFrames * AUDIO_FRAME_DURATION_US;

      expect(result.durationUs).toBeCloseTo(expectedDurationUs, 6);
      expect(result.durationMs).toBeCloseTo(expectedDurationUs / 1000, 6);
      expect(result.duration).toBeCloseTo(expectedDurationUs / 1000000, 6);
    });
  });

  describe("generateConcatDirective", () => {
    test("generates file, inpoint, and outpoint lines without duration", () => {
      const result = generateConcatDirective(
        0,
        1000,
        0,
        false,
        "/path/to/audio.aac",
      );

      expect(result).toContain("file '/path/to/audio.aac'");
      expect(result).toContain("inpoint");
      expect(result).toContain("outpoint");
      expect(result).not.toContain("duration");
      expect(result.endsWith("\n")).toBe(true);
    });

    test("uses seek trim for non-first segments", () => {
      const result = generateConcatDirective(
        2000,
        4000,
        1,
        false,
        "/test/audio.aac",
      );

      const seekToUs = AUDIO_FRAME_DURATION_US * 2;
      expect(result).toContain(`inpoint ${seekToUs.toFixed(0)}us`);
    });
  });
});
