import { readFile, writeFile } from "node:fs/promises";
import ISOBoxer from "codem-isoboxer";

import {
  frameDuration,
  getClosestAlignedTime,
  videoFrameDuration,
  getClosestVideoAlignedTime,
} from "./calculations";
import { TIME_CONSTANTS } from "./constants";
import { repackageMediaSegment } from "@/muxing/repackageFragements";
import type { SegmentInfo } from "./transcoder-types";

/**
 * Generate segment timing information for both audio and video transcoding
 *
 * @param segmentIndex - Zero-based segment index
 * @param duration - Total duration in seconds (audio) or milliseconds (video)
 * @param segmentDuration - Segment duration in milliseconds
 * @param framePaddingMultiplier - Multiplier for frame padding (2 for both audio/video)
 * @param durationInSeconds - Whether duration parameter is in seconds (audio) vs milliseconds (video)
 * @param useAlignedTimes - Whether to use aligned times for startTimeUs/endTimeUs (audio=true, video=false)
 * @param videoFrameRate - Video frame rate for video-specific alignment (optional, for video only)
 * @returns SegmentInfo with precise timing calculations
 */
export function generateSingleSegmentInfo(
  segmentIndex: number,
  duration: number,
  segmentDuration: number,
  framePaddingMultiplier: number,
  durationInSeconds = false,
  useAlignedTimes = false,
  videoFrameRate?: { num: number; den: number },
): SegmentInfo {
  // IMPLEMENTATION GUIDELINES: All times must be in microseconds for consistency
  // segmentDuration is in milliseconds, duration is in seconds (audio) or milliseconds (video)
  const startTimeUs = Math.round(
    segmentIndex *
      segmentDuration *
      TIME_CONSTANTS.MICROSECONDS_PER_MILLISECOND,
  ); // Convert ms to us

  const durationUs = durationInSeconds
    ? duration * TIME_CONSTANTS.MICROSECONDS_PER_SECOND // Convert s to us (audio)
    : duration * TIME_CONSTANTS.MICROSECONDS_PER_MILLISECOND; // Convert ms to us (video)

  const endTimeUs = Math.min(
    Math.round(
      (segmentIndex + 1) *
        segmentDuration *
        TIME_CONSTANTS.MICROSECONDS_PER_MILLISECOND,
    ),
    durationUs,
  );

  const totalDurationForSegmentCalculation = durationInSeconds
    ? duration
    : duration / TIME_CONSTANTS.MILLISECONDS_PER_SECOND;
  const segmentDurationInSeconds =
    segmentDuration / TIME_CONSTANTS.MILLISECONDS_PER_SECOND;
  const isLast =
    segmentIndex ===
    Math.ceil(totalDurationForSegmentCalculation / segmentDurationInSeconds) -
      1;

  // IMPLEMENTATION GUIDELINES: Use video-specific alignment for video segments to ensure exact frame counts
  // For video segments, align to video frame boundaries instead of AAC frame boundaries
  let alignedStartTime: number;
  let alignedEndTime: number;
  let frameDurationForPadding: number;

  if (videoFrameRate) {
    // Use video frame alignment for video segments
    alignedStartTime = getClosestVideoAlignedTime(startTimeUs, videoFrameRate);
    alignedEndTime = getClosestVideoAlignedTime(endTimeUs, videoFrameRate);
    frameDurationForPadding = videoFrameDuration(videoFrameRate);
  } else {
    // Use AAC frame alignment for audio segments (original behavior)
    alignedStartTime = getClosestAlignedTime(startTimeUs);
    alignedEndTime = getClosestAlignedTime(endTimeUs);
    frameDurationForPadding = frameDuration();
  }

  // Use aligned duration for seamless splicing (matches original "realDuration")
  const realDurationUs = alignedEndTime - alignedStartTime;

  // Follow original calculations.ts logic exactly for seamless splicing
  let startTimeWithPadding = Math.max(
    alignedStartTime - frameDurationForPadding * framePaddingMultiplier,
    0,
  );

  // CRITICAL FIX: Apply extra time to ALL segments for consistent interframe context
  const extraTimeAtBeginning = frameDurationForPadding * framePaddingMultiplier;

  // Special handling for first segment - we can't go back in time from byte zero
  if (segmentIndex === 0) {
    // For first segment, we can't add extra time at the beginning
    // startTimeWithPadding stays as calculated above
  } else {
    // For subsequent segments, add extra time for interframe context
    startTimeWithPadding = Math.max(
      startTimeWithPadding - extraTimeAtBeginning,
      0,
    );
  }

  return {
    index: segmentIndex,
    startTimeUs:
      useAlignedTimes || videoFrameRate ? alignedStartTime : startTimeUs,
    endTimeUs: useAlignedTimes || videoFrameRate ? alignedEndTime : endTimeUs,
    isLast,
    actualStartTimeUs: startTimeWithPadding,
    actualDurationUs:
      useAlignedTimes || videoFrameRate
        ? realDurationUs
        : endTimeUs - startTimeUs,
  };
}

/**
 * Repackage MP4 segment for fragmented streaming
 *
 * This function handles the common repackaging logic used by both audio and video
 * transcoders to convert regular MP4 files into fragmented MP4 segments (.m4s).
 *
 * @param outputPath - Path to the MP4 file to repackage
 * @param segmentInfo - Segment timing information
 * @param segmentIndex - Zero-based segment index
 * @param extraFrameDurationMs - Extra frame duration to add for audio (0 for video)
 * @returns Promise that resolves when repackaging is complete
 */
export async function repackageFragmentedSegment(
  outputPath: string,
  segmentInfo: SegmentInfo,
  segmentIndex: number,
  extraFrameDurationMs = 0,
): Promise<void> {
  const mp4Buffer = await readFile(outputPath);
  const mp4IsoFile = ISOBoxer.parseBuffer(mp4Buffer.buffer);

  // Calculate base media decode time accounting for segment timing
  let baseMediaDecodeTimeMs =
    segmentInfo.startTimeUs / TIME_CONSTANTS.MICROSECONDS_PER_MILLISECOND; // Convert microseconds to milliseconds

  // Audio-specific adjustment for first segment having extra sample
  if (segmentIndex > 0 && extraFrameDurationMs > 0) {
    baseMediaDecodeTimeMs += extraFrameDurationMs;
  }

  const mediaSegmentBytes = repackageMediaSegment(
    mp4IsoFile,
    segmentIndex,
    baseMediaDecodeTimeMs,
  );
  await writeFile(outputPath, new Uint8Array(mediaSegmentBytes));
}

/**
 * Generate consistent output file names for both audio and video segments
 *
 * @param outputDir - Base output directory
 * @param streamType - Type of stream ('audio' or 'video')
 * @param segmentId - Segment ID ('init' or number)
 * @param rendition - Rendition name (for video) or 'audio' (for audio)
 * @param isFragmented - Whether to use .m4s or .mp4 extension
 * @param isStandalone - Whether to add 'standalone' suffix
 * @returns Full output file path
 */
export function generateOutputPath(
  outputDir: string,
  streamType: "audio" | "video",
  segmentId: string | number,
  rendition: string,
  isFragmented: boolean,
  isStandalone = false,
): string {
  const extension = isFragmented ? ".m4s" : ".mp4";
  const standaloneSuffix = isStandalone ? "-standalone" : "";

  if (segmentId === "init") {
    // Special handling for video init segments in standalone mode
    if (streamType === "video" && isStandalone) {
      return `${outputDir}/${rendition}-seginit-standalone${extension}`;
    }
    return `${outputDir}/${rendition}-init${extension}`;
  }

  if (streamType === "audio") {
    return `${outputDir}/${rendition}-seg${segmentId}${standaloneSuffix}${extension}`;
  }

  // Video
  return `${outputDir}/${rendition}-seg${segmentId}${standaloneSuffix}${extension}`;
}
