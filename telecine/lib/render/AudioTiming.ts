/**
 * Shared audio timing utilities for gapless audio concatenation.
 * Extracted from SegmentEncoder.server.ts and createRenderOptionsForSegment.ts
 */

/**
 * AAC frame duration constants
 * 1024 samples per AAC frame at 48kHz sample rate
 */
export const AUDIO_FRAME_DURATION_US = (1024.0 / 48000) * 1000000; // microseconds

/**
 * Standard AAC sample rate used in the system
 */
export const STANDARD_SAMPLE_RATE = 48000;

/**
 * Standard AAC frame size (samples per frame)
 */
export const AAC_FRAME_SIZE_SAMPLES = 1024;

export function getClosestAlignedAACFrameIndex(targetTimeUs: number): number {
  const framesToTarget = targetTimeUs / AUDIO_FRAME_DURATION_US;
  const nearestFrameIndex = Math.round(framesToTarget);
  return nearestFrameIndex;
}

/**
 * Get the closest AAC frame-aligned time in microseconds
 */
export function getClosestAlignedTimeUs(targetTimeUs: number): number {
  const framesToTarget = targetTimeUs / AUDIO_FRAME_DURATION_US;
  const nearestFrameIndex = Math.round(framesToTarget);
  return nearestFrameIndex * AUDIO_FRAME_DURATION_US;
}

/**
 * Calculate aligned timing boundaries for a segment with padding
 */
export interface SegmentTimingOptions {
  segmentStartMs: number;
  segmentEndMs: number;
  sequenceNumber: number;
  isInitSegment: boolean;
  isLastSegment?: boolean;
}

export interface AlignedTiming {
  alignedFromUs: number;
  alignedToUs: number;
  paddedStart: boolean;
  paddedEnd: boolean;
}

export function calculateAlignedTiming(
  options: SegmentTimingOptions,
): AlignedTiming {
  const {
    segmentStartMs,
    segmentEndMs,
    sequenceNumber,
    isInitSegment,
    isLastSegment = false,
  } = options;

  const paddedStart = !isInitSegment && sequenceNumber > 0;
  const paddedEnd = !isInitSegment && !isLastSegment;

  // DYNAMIC AUDIO ALIGNMENT: Calculate frame count based on actual segment duration
  // This ensures audio rendering scales properly with arbitrary segment durations
  // instead of using hardcoded values that only work for specific segment sizes

  // SYMMETRIC PADDING: Add 4 AAC frames before and after segment boundaries
  // Exception: no padding before first segment, no padding after last segment
  let startPaddingFrames = paddedStart ? 4 : 0; // 4 frames before (except first)
  let endPaddingFrames = paddedEnd ? 4 : 0; // 4 frames after (except last)

  // Calculate aligned timing for audio rendering (AAC-aligned first, then padding)
  // 1. Find nearest AAC boundaries to segment boundaries
  const segmentStartAlignedUs = getClosestAlignedTimeUs(segmentStartMs * 1000);
  const segmentEndAlignedUs = getClosestAlignedTimeUs(segmentEndMs * 1000);

  // 2. Add/subtract exact frame counts for padding
  const alignedFromUs =
    segmentStartAlignedUs - startPaddingFrames * AUDIO_FRAME_DURATION_US;
  const alignedToUs =
    segmentEndAlignedUs + endPaddingFrames * AUDIO_FRAME_DURATION_US;

  return {
    alignedFromUs,
    alignedToUs,
    paddedStart: paddedStart,
    paddedEnd: paddedEnd,
  };
}

export function generateConcatTimings(
  fromMs: number,
  toMs: number,
  sequenceNumber: number,
) {
  const fromIndex = getClosestAlignedAACFrameIndex(fromMs * 1000);
  const toIndex = getClosestAlignedAACFrameIndex(toMs * 1000);
  const durationFrames = toIndex - fromIndex;

  const alignedDurationUs = durationFrames * AUDIO_FRAME_DURATION_US;
  const trimStartFrames = sequenceNumber > 0 ? 2 : 0;
  const trimStartUs = trimStartFrames * AUDIO_FRAME_DURATION_US;

  return {
    fromIndex,
    toIndex,
    durationFrames,
    seekToUs: trimStartUs,
    durationUs: alignedDurationUs,
    seekToMs: trimStartUs / 1000,
    durationMs: alignedDurationUs / 1000,
    seekTo: trimStartUs / 1000000,
    duration: alignedDurationUs / 1000000,
  };
}

/**
 * Generate concat directive string for precise audio trimming
 */
export function generateConcatDirective(
  fromMs: number,
  toMs: number,
  sequenceNumber: number,
  _isLastSegment: boolean = false,
  audioFilePath: string,
): string {
  const concatTimings = generateConcatTimings(fromMs, toMs, sequenceNumber);

  console.log("CONCAT TIMINGS", concatTimings);
  const concatDirective = [
    `file '${audioFilePath}'`,
    `inpoint ${concatTimings.seekToUs.toFixed(0)}us`,
    `outpoint ${Math.trunc(Math.trunc(concatTimings.seekToUs) + Math.trunc(concatTimings.durationUs))}us`,
    // `duration ${Math.trunc(concatTimings.durationUs)}us`,
    "\n",
  ].join("\n");

  console.log("CONCAT DIRECTIVE", concatDirective);

  return concatDirective;
}
