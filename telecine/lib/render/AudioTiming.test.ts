import { describe, test, expect } from "vitest";
import {
  AUDIO_FRAME_DURATION_US,
  AUDIO_FRAME_DURATION_US,
  STANDARD_SAMPLE_RATE,
  AAC_FRAME_SIZE_SAMPLES,
  getClosestAlignedTimeUs,
  calculateAlignedTiming,
  calculateAudioTiming,
  generateConcatDirective,
  audioTimingToSampleInfo,
  type SegmentTimingOptions,
  type AudioTimingInfo,
} from "./AudioTiming.js";

describe("AudioTiming", () => {
  describe("Constants", () => {
    test("AAC frame duration constants are mathematically correct", () => {
      // 1024 samples at 48kHz = 21.333... milliseconds
      const expectedMs = (1024 / 48000) * 1000;
      const expectedUs = expectedMs * 1000;

      expect(AUDIO_FRAME_DURATION_US).toBeCloseTo(expectedUs, 6);
      expect(AUDIO_FRAME_DURATION_US).toBeCloseTo(expectedUs, 6); // Same value in this implementation
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
      // Test exact frame boundaries
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

      // Should round down when closer to 0
      expect(getClosestAlignedTimeUs(halfFrame * 0.8)).toBeCloseTo(0, 6);

      // Should round up when closer to next frame
      expect(getClosestAlignedTimeUs(halfFrame * 1.2)).toBeCloseTo(
        AUDIO_FRAME_DURATION_US,
        6,
      );
    });

    test("handles common video timing values", () => {
      // Test with common millisecond values converted to microseconds
      const testCases = [
        {
          inputMs: 1000,
          expectedFrames: Math.round(1000000 / AUDIO_FRAME_DURATION_US),
        },
        {
          inputMs: 2000,
          expectedFrames: Math.round(2000000 / AUDIO_FRAME_DURATION_US),
        },
        {
          inputMs: 5000,
          expectedFrames: Math.round(5000000 / AUDIO_FRAME_DURATION_US),
        },
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
      // Should have end padding of 2 frames
      expect(result.alignedToUs).toBeCloseTo(
        getClosestAlignedTimeUs(2000 * 1000) + AUDIO_FRAME_DURATION_US * 2,
        6,
      );
    });

    test("calculates timing for middle media segment with both paddings", () => {
      const options: SegmentTimingOptions = {
        segmentStartMs: 2000,
        segmentEndMs: 4000,
        sequenceNumber: 1,
        isInitSegment: false,
      };

      const result = calculateAlignedTiming(options);

      expect(result.paddedStart).toBe(true);
      expect(result.paddedEnd).toBe(true);

      // Should have start padding of 2 frames
      expect(result.alignedFromUs).toBeCloseTo(
        getClosestAlignedTimeUs(2000 * 1000) - AUDIO_FRAME_DURATION_US * 2,
        6,
      );

      // Should have end padding of 2 frames
      expect(result.alignedToUs).toBeCloseTo(
        getClosestAlignedTimeUs(4000 * 1000) + AUDIO_FRAME_DURATION_US * 2,
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

      // Even short segments should get proper padding
      expect(result.alignedToUs).toBeGreaterThan(result.alignedFromUs);
    });
  });

  describe("calculateAudioTiming", () => {
    test("calculates timing for first segment without start trimming", () => {
      const alignedDurationUs = 50000; // Arbitrary duration
      const sequenceNumber = 0;

      const result = calculateAudioTiming(alignedDurationUs, sequenceNumber);

      expect(result.inpointUs).toBe(0); // No start trimming for first segment
      expect(result.outpointUs).toBeCloseTo(
        alignedDurationUs - AUDIO_FRAME_DURATION_US,
        6,
      );
      expect(result.durationUs).toBeCloseTo(
        result.outpointUs - result.inpointUs,
        6,
      );
    });

    test("calculates timing for subsequent segments with start trimming", () => {
      const alignedDurationUs = 100000; // Arbitrary duration
      const sequenceNumber = 1;

      const result = calculateAudioTiming(alignedDurationUs, sequenceNumber);

      expect(result.inpointUs).toBeCloseTo(AUDIO_FRAME_DURATION_US * 4, 6); // 4 frame start trim
      expect(result.outpointUs).toBeCloseTo(
        alignedDurationUs - AUDIO_FRAME_DURATION_US,
        6,
      );
      // Duration should be the max of 0 and (outpoint - inpoint), matching SegmentEncoder logic
      const expectedDuration = Math.max(
        0,
        result.outpointUs - result.inpointUs,
      );
      expect(result.durationUs).toBeCloseTo(expectedDuration, 6);
    });

    test("prevents negative duration", () => {
      // Test with very short duration that would normally result in negative
      const shortDurationUs = AUDIO_FRAME_DURATION_US * 2; // Only 2 frames worth
      const sequenceNumber = 1;

      const result = calculateAudioTiming(shortDurationUs, sequenceNumber);

      expect(result.durationUs).toBeGreaterThanOrEqual(0);
    });

    test("handles zero duration edge case", () => {
      const result = calculateAudioTiming(0, 1);
      expect(result.durationUs).toBe(0);
    });
  });

  describe("generateConcatDirective", () => {
    test("generates properly formatted concat directive", () => {
      const audioFilePath = "/path/to/audio.aac";
      const audioTiming: AudioTimingInfo = {
        inpointUs: 1000.5,
        outpointUs: 50000.75,
        durationUs: 49000.25,
      };

      const result = generateConcatDirective(audioFilePath, audioTiming);

      expect(result).toContain(`file '${audioFilePath}'`);
      expect(result).toContain("inpoint 1000.5000000000us");
      expect(result).toContain("outpoint 50000.7500000000us");
      expect(result).toContain("duration 49000.2500000000us");
      expect(result.endsWith("\n")).toBe(true);
    });

    test("handles edge case with zero values", () => {
      const audioFilePath = "/test/path.aac";
      const audioTiming: AudioTimingInfo = {
        inpointUs: 0,
        outpointUs: 0,
        durationUs: 0,
      };

      const result = generateConcatDirective(audioFilePath, audioTiming);

      expect(result).toContain("inpoint 0.0000000000us");
      expect(result).toContain("outpoint 0.0000000000us");
      expect(result).toContain("duration 0.0000000000us");
    });
  });

  describe("Integration Tests", () => {
    test("end-to-end timing calculation matches SegmentEncoder logic", () => {
      // Simulate a typical segment from SegmentEncoder
      const segmentOptions: SegmentTimingOptions = {
        segmentStartMs: 2000,
        segmentEndMs: 4000,
        sequenceNumber: 1,
        isInitSegment: false,
      };

      const alignedTiming = calculateAlignedTiming(segmentOptions);
      const alignedDurationUs =
        alignedTiming.alignedToUs - alignedTiming.alignedFromUs;
      const audioTiming = calculateAudioTiming(
        alignedDurationUs,
        segmentOptions.sequenceNumber,
      );

      // Verify the pipeline produces sensible results
      expect(alignedDurationUs).toBeGreaterThan(0);
      expect(audioTiming.durationUs).toBeGreaterThan(0);
      expect(audioTiming.durationUs).toBeLessThan(alignedDurationUs);

      // Generate concat directive
      const directive = generateConcatDirective("/test/audio.aac", audioTiming);
      expect(directive).toContain("file");
      expect(directive).toContain("inpoint");
      expect(directive).toContain("outpoint");
      expect(directive).toContain("duration");
    });

    test("refactored SegmentEncoder timing calculations are identical to original", () => {
      // Test the exact same scenarios that SegmentEncoder would use
      const testCases = [
        {
          segmentStartMs: 0,
          segmentEndMs: 2000,
          sequenceNumber: 0,
          isInitSegment: false,
        },
        {
          segmentStartMs: 2000,
          segmentEndMs: 4000,
          sequenceNumber: 1,
          isInitSegment: false,
        },
        {
          segmentStartMs: 4000,
          segmentEndMs: 6000,
          sequenceNumber: 2,
          isInitSegment: false,
        },
        {
          segmentStartMs: 0,
          segmentEndMs: 100,
          sequenceNumber: 0,
          isInitSegment: true,
        },
      ];

      testCases.forEach(
        ({ segmentStartMs, segmentEndMs, sequenceNumber, isInitSegment }) => {
          // Calculate using our shared utility
          const alignedTiming = calculateAlignedTiming({
            segmentStartMs,
            segmentEndMs,
            sequenceNumber,
            isInitSegment,
          });

          const alignedDurationUs =
            alignedTiming.alignedToUs - alignedTiming.alignedFromUs;
          const audioTiming = calculateAudioTiming(
            alignedDurationUs,
            sequenceNumber,
          );

          // Verify timing calculations are consistent with SegmentEncoder expectations
          expect(alignedTiming.paddedStart).toBe(
            !isInitSegment && sequenceNumber > 0,
          );
          expect(alignedTiming.paddedEnd).toBe(!isInitSegment);

          // For non-init segments with padding, verify the padding amounts
          if (!isInitSegment) {
            if (sequenceNumber > 0) {
              // Should have 2 frames of start padding
              const expectedAlignedFromUs =
                getClosestAlignedTimeUs(segmentStartMs * 1000) -
                AUDIO_FRAME_DURATION_US * 2;
              expect(alignedTiming.alignedFromUs).toBeCloseTo(
                expectedAlignedFromUs,
                6,
              );
            }

            // Should have 2 frames of end padding
            const expectedAlignedToUs =
              getClosestAlignedTimeUs(segmentEndMs * 1000) +
              AUDIO_FRAME_DURATION_US * 2;
            expect(alignedTiming.alignedToUs).toBeCloseTo(
              expectedAlignedToUs,
              6,
            );
          }

          // Verify audio timing for concat directive
          if (sequenceNumber > 0) {
            expect(audioTiming.inpointUs).toBeCloseTo(
              AUDIO_FRAME_DURATION_US * 4,
              6,
            );
          } else {
            expect(audioTiming.inpointUs).toBe(0);
          }

          expect(audioTiming.outpointUs).toBeCloseTo(
            alignedDurationUs - AUDIO_FRAME_DURATION_US,
            6,
          );
          expect(audioTiming.durationUs).toBeGreaterThanOrEqual(0);
        },
      );
    });

    test("timing calculations are consistent across multiple segments", () => {
      // Test that consecutive segments have consistent timing
      const baseDurationMs = 2000;
      const segments = [
        { start: 0, seq: 0, isInit: false },
        { start: 2000, seq: 1, isInit: false },
        { start: 4000, seq: 2, isInit: false },
      ];

      const timings = segments.map((seg) => {
        const options: SegmentTimingOptions = {
          segmentStartMs: seg.start,
          segmentEndMs: seg.start + baseDurationMs,
          sequenceNumber: seg.seq,
          isInitSegment: seg.isInit,
        };
        return calculateAlignedTiming(options);
      });

      // Verify padding logic is consistent
      expect(timings[0]!.paddedStart).toBe(false); // First segment
      expect(timings[1]!.paddedStart).toBe(true); // Later segments
      expect(timings[2]!.paddedStart).toBe(true);

      // All non-init segments should have end padding
      timings.forEach((timing) => {
        expect(timing.paddedEnd).toBe(true);
      });
    });
  });
});
