import type {
  AudioRendition,
  VideoRendition,
} from "../../../transcoding/types";

/**
 * Calculate which segment contains a given timestamp
 * Returns 1-based segment ID, or undefined if segmentDurationMs is not available
 */
export const computeSegmentId = (
  timeMs: number,
  rendition: AudioRendition | VideoRendition,
): number | undefined => {
  if (!rendition.segmentDurationMs) {
    return undefined;
  }

  // Handle negative time by clamping to 0
  const adjustedTimeMs = Math.max(0, timeMs);
  const segmentIndex = Math.floor(adjustedTimeMs / rendition.segmentDurationMs);
  return segmentIndex + 1; // Convert to 1-based segment ID
};

/**
 * Calculate range of segment IDs that overlap with a time range
 * Returns array of 1-based segment IDs, or empty array if segmentDurationMs is not available
 */
export const calculateSegmentRange = (
  startTimeMs: number,
  endTimeMs: number,
  rendition: AudioRendition | VideoRendition,
): number[] => {
  if (!rendition.segmentDurationMs) {
    return [];
  }

  // Handle edge case where start equals end
  if (startTimeMs === endTimeMs) {
    const segmentId = computeSegmentId(startTimeMs, rendition);
    return segmentId ? [segmentId] : [];
  }

  const startSegmentId = computeSegmentId(startTimeMs, rendition);
  const endSegmentId = computeSegmentId(endTimeMs, rendition);

  if (startSegmentId === undefined || endSegmentId === undefined) {
    return [];
  }

  const segments: number[] = [];
  for (let segmentId = startSegmentId; segmentId <= endSegmentId; segmentId++) {
    segments.push(segmentId);
  }

  return segments;
};
