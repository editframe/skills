import * as path from 'node:path';
import { mkdir } from 'node:fs/promises';

const SAMPLE_RATE = Number.parseFloat(process.env.SAMPLE_RATE || '48000.0');

export function frameDuration(): number {
  return 1024.0 / SAMPLE_RATE * 1000000.0;
}

export function getClosestAlignedTime(targetTime: number): number {
  const decimalFramesToTargetTime = targetTime / frameDuration();
  const nearestFrameIndexForTargetTime = Math.round(decimalFramesToTargetTime);
  return nearestFrameIndexForTargetTime * frameDuration();
}

// IMPLEMENTATION GUIDELINES: Video-specific timing functions to avoid AAC alignment issues
export function videoFrameDuration(frameRate: { num: number; den: number }): number {
  // Calculate video frame duration in microseconds
  return (frameRate.den / frameRate.num) * 1000000.0;
}

export function getClosestVideoAlignedTime(targetTime: number, frameRate: { num: number; den: number }): number {
  const frameDur = videoFrameDuration(frameRate);
  const decimalFramesToTargetTime = targetTime / frameDur;
  const nearestFrameIndexForTargetTime = Math.round(decimalFramesToTargetTime);
  return nearestFrameIndexForTargetTime * frameDur;
}

// IMPLEMENTATION GUIDELINES: Function overloads for backward compatibility
// Old signature used by run.ts and transcoding service
export function generateCommandAndDirectivesForSegment(
  inputFile: string,
  segmentIndex: number,
  startTime: number,
  endTime: number,
  isLast: boolean
): [string, string];

// New signature for the async version with explicit paths
export function generateCommandAndDirectivesForSegment(
  inputFile: string,
  segmentInfo: { actualStartTimeUs: number; actualDurationUs: number },
  aacFilePath: string
): Promise<[string, string]>;

// Implementation that handles both signatures
export function generateCommandAndDirectivesForSegment(
  inputFile: string,
  segmentIndexOrInfo: number | { actualStartTimeUs: number; actualDurationUs: number },
  startTimeOrPath: number | string,
  endTime?: number,
  isLast?: boolean
): [string, string] | Promise<[string, string]> {

  // Handle old signature (synchronous)
  if (typeof segmentIndexOrInfo === 'number' && typeof startTimeOrPath === 'number') {
    const segmentIndex = segmentIndexOrInfo;
    const startTime = startTimeOrPath;
    const alignedStartTime = getClosestAlignedTime(startTime);
    const alignedEndTime = getClosestAlignedTime(endTime!);

    // We're subtracting two frames from the start time because ffmpeg always internally
    // adds 2 frames of priming to the start of the stream.
    let startTimeWithPadding = Math.max(alignedStartTime - frameDuration() * 2, 0);

    // We add extra padding at the end, too, because ffmpeg tapers the last few frames
    // to avoid a pop when audio stops. We don't want tapering--we just want the signal.
    // So by shifting the end, we shift the taper past the content we care about it. We'll
    // chop off this tapered part using outpoint later.
    const endTimeWithPadding = alignedEndTime + frameDuration() * 2;

    let inpoint = frameDuration() * 2;  // Account for FFmpeg's internal priming

    // We ask to also encode two frames before the start of our segment because
    // the AAC format is interframe. That is, the encoding of each frame depends
    // on the previous frame. This is also why AAC pads the start with silence.
    // By adding some extra padding ourselves, we ensure that the "real" data we
    // want will have been encoded as if the correct data preceded it.
    // CRITICAL FIX: Apply extra time to ALL segments for consistent AAC interframe context
    const extraTimeAtBeginning = frameDuration() * 2;

    // BOUNDARY ISSUE EXPLANATION: First vs Second Segment Asymmetry
    // 
    // First segment (index 0):
    //   - Can't add extra padding at start (can't go back in time from byte zero)
    //   - inpoint = 2 frames (only FFmpeg priming)
    //   - outpoint = inpoint + duration - 1 frame (boundary subtraction)
    //
    // Second segment (index 1):  
    //   - Gets full 2 frames of extra padding at start for AAC interframe context
    //   - inpoint = 4 frames (FFmpeg priming + extra time)
    //   - outpoint = inpoint + duration - 1 frame (boundary subtraction)
    //
    // RESULT: Potential audio discontinuity at first->second boundary due to:
    //   - First segment lacks the AAC interframe context padding
    //   - Second segment has full padding, creating timing mismatch
    //   - The boundary between them may have artifacts from this asymmetry

    if (segmentIndex === 0) {
      // For first segment, we can't add extra time at the beginning
      // startTimeWithPadding stays as calculated above (only basic FFmpeg padding)
      // inpoint also stays as just the FFmpeg priming (no extra AAC context)
    } else {
      // For subsequent segments, add extra time for AAC interframe context
      // This creates the asymmetry that can cause boundary artifacts
      startTimeWithPadding = Math.max(startTimeWithPadding - extraTimeAtBeginning, 0);
      inpoint += extraTimeAtBeginning;
    }

    const paddedDuration = endTimeWithPadding - startTimeWithPadding;

    // Create AAC segment command
    const aacCmd = [
      'ffmpeg -hide_banner -loglevel error -nostats -y',
      `-ss ${startTimeWithPadding}us -t ${paddedDuration}us -i "${inputFile}"`,
      `-c:a aac -ac 2 -ar ${SAMPLE_RATE} -f adts`,  // Force stereo output with -ac 2
      `out/seg${segmentIndex + 1}.aac`
    ].join(' ');

    // Calculate outpoint with frame subtraction for segment boundaries
    // inpoint is inclusive and outpoint is exclusive. To avoid overlap, we subtract
    // the duration of one frame from the outpoint.
    // SPECIAL CASE: First segment boundary compensation
    const realDurationUs = alignedEndTime - alignedStartTime;
    let subtractUs = frameDuration();

    if (isLast!) {
      subtractUs = 0;
    } else if (segmentIndex === 0) {
      // BOUNDARY FIX: First segment doesn't subtract boundary frame
      // This compensates for the asymmetry where second segment has +2 more frames in inpoint
      // By not subtracting here, we extend first segment to better align with second segment's timing
      subtractUs = 0;
    }

    const outpointUs = inpoint + realDurationUs - subtractUs;

    // Create concat directive file content
    const directives = [
      'ffconcat version 1.0',
      `file seg${segmentIndex + 1}.aac`,
      `inpoint ${inpoint}us`,
      `outpoint ${outpointUs}us`
    ].join('\n');

    return [aacCmd, directives];
  }

  // Handle new signature (asynchronous)
  if (typeof segmentIndexOrInfo === 'object' && typeof startTimeOrPath === 'string') {
    const segmentInfo = segmentIndexOrInfo;
    const aacFilePath = startTimeOrPath;

    return (async () => {
      // Ensure output directory exists
      const outputDir = path.dirname(aacFilePath);
      await mkdir(outputDir, { recursive: true });

      const startTime = getClosestAlignedTime(segmentInfo.actualStartTimeUs);
      const endTime = getClosestAlignedTime(segmentInfo.actualStartTimeUs + segmentInfo.actualDurationUs);

      // We're subtracting two frames from the start time because ffmpeg always internally
      // adds 2 frames of priming to the start of the stream.
      let startTimeWithPadding = Math.max(startTime - frameDuration() * 2, 0);

      // We add extra padding at the end, too, because ffmpeg tapers the last few frames
      // to avoid a pop when audio stops. We don't want tapering--we just want the signal.
      // So by shifting the end, we shift the taper past the content we care about it. We'll
      // chop off this tapered part using outpoint later.
      const endTimeWithPadding = endTime + frameDuration() * 2;

      let inpoint = frameDuration() * 2;  // Account for FFmpeg's internal priming

      // We ask to also encode two frames before the start of our segment because
      // the AAC format is interframe. That is, the encoding of each frame depends
      // on the previous frame. This is also why AAC pads the start with silence.
      // By adding some extra padding ourselves, we ensure that the "real" data we
      // want will have been encoded as if the correct data preceded it.
      const extraTimeAtBeginning = frameDuration() * 2;
      startTimeWithPadding = Math.max(startTimeWithPadding - extraTimeAtBeginning, 0);
      inpoint += extraTimeAtBeginning;

      const paddedDuration = endTimeWithPadding - startTimeWithPadding;

      // Create AAC segment
      const aacCmd = [
        'ffmpeg -hide_banner -loglevel error -nostats -y',
        `-ss ${startTimeWithPadding}us -t ${paddedDuration}us -i "${inputFile}"`,
        `-c:a aac -ac 2 -ar ${SAMPLE_RATE} -f adts`,  // Force stereo output with -ac 2
        `"${aacFilePath}"`
      ].join(' ');

      // Create concat directive file content
      const directives = [
        'ffconcat version 1.0',
        `file ${path.basename(aacFilePath)}`,
        `inpoint ${inpoint}us`,
        `outpoint ${inpoint + segmentInfo.actualDurationUs}us`
      ].join('\n');

      return [aacCmd, directives];
    })();
  }

  throw new Error('Invalid arguments to generateCommandAndDirectivesForSegment');
} 