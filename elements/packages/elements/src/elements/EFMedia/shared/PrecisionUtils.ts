/**
 * Centralized precision utilities for consistent timing calculations across the media pipeline.
 *
 * The key insight is that floating-point precision errors can cause inconsistencies between:
 * 1. Segment selection logic (in AssetMediaEngine.computeSegmentId)
 * 2. Sample finding logic (in SampleBuffer.find)
 * 3. Timeline mapping (in BufferedSeekingInput.seek)
 *
 * All timing calculations must use the same rounding strategy to ensure consistency.
 */

/**
 * Round time to millisecond precision to handle floating-point precision issues.
 * Uses Math.round for consistent behavior across the entire pipeline.
 *
 * This function should be used for ALL time-related calculations that need to be
 * compared between different parts of the system.
 */
export const roundToMilliseconds = (timeMs: number): number => {
  // Round to 3 decimal places (microsecond precision)
  return Math.round(timeMs * 1000) / 1000;
};

/**
 * Convert media time (in seconds) to scaled time units using consistent rounding.
 * This is used in segment selection to convert from milliseconds to timescale units.
 */
export const convertToScaledTime = (
  timeMs: number,
  timescale: number,
): number => {
  const scaledTime = (timeMs / 1000) * timescale;
  return Math.round(scaledTime);
};

/**
 * Convert scaled time units back to media time (in milliseconds) using consistent rounding.
 * This is the inverse of convertToScaledTime.
 */
export const convertFromScaledTime = (
  scaledTime: number,
  timescale: number,
): number => {
  const timeMs = (scaledTime / timescale) * 1000;
  return roundToMilliseconds(timeMs);
};
