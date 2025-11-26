import type { VideoRenderOptions } from "./engines/FramegenEngine";

/**
 * 1024 samples per AAC frame
 * 48,000 samples per second
 * 1,000,000 microseconds per second
 */
export const AUDIO_FRAME_DURATION_US = (1024.0 / 48000) * 1000000;
export const PADDING_FRAMES = 4;
export const PADDING_US = AUDIO_FRAME_DURATION_US * PADDING_FRAMES;

export const getClosestAlignedTimeUs = (targetTimeUs: number) => {
  const framesToTarget = targetTimeUs / AUDIO_FRAME_DURATION_US;
  const nearestFrameIndex = Math.round(framesToTarget);
  return nearestFrameIndex * AUDIO_FRAME_DURATION_US;
};

interface AnyRenderOptionProps<SegmentType extends "init" | number> {
  segmentIndex: SegmentType;
  segmentDurationMs: number;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  strategy: "v1" | "v2";
}
type RenderOptionProps =
  | AnyRenderOptionProps<"init">
  | AnyRenderOptionProps<number>;
function createInitSegmentOptions() {
  return {
    segmentStartMs: 0,
    segmentEndMs: 100,
    sequenceNumber: 0,
    isFirstSegment: false,
    isLastSegment: false,
  };
}
function createMediaSegmentOptions(
  segmentIndex: number,
  durationMs: number,
  segmentDurationMs: number,
) {
  const maxSegmentIndex = Math.ceil(durationMs / segmentDurationMs);

  if (
    Number.isNaN(segmentIndex) ||
    segmentIndex < 0 ||
    segmentIndex >= maxSegmentIndex
  ) {
    throw new Response("Segment index out of range", { status: 404 });
  }

  const segmentStartMs = segmentIndex * segmentDurationMs;
  const segmentEndMs = Math.min(
    (segmentIndex + 1) * segmentDurationMs,
    durationMs,
  );

  return {
    segmentStartMs,
    segmentEndMs,
    sequenceNumber: segmentIndex,
    isFirstSegment: segmentIndex === 0,
    isLastSegment: segmentIndex === maxSegmentIndex - 1,
  };
}

export function isInitSegmentRequest(
  options: RenderOptionProps,
): options is AnyRenderOptionProps<"init"> {
  return options.segmentIndex === "init";
}

export function createVideoRenderOptionsForSegment(
  options: RenderOptionProps,
): VideoRenderOptions {
  const isInitSegment = isInitSegmentRequest(options);

  const segmentOptions = isInitSegment
    ? createInitSegmentOptions()
    : createMediaSegmentOptions(
        options.segmentIndex,
        options.durationMs,
        options.segmentDurationMs,
      );

  const shouldPadStart = !segmentOptions.isFirstSegment;
  const shouldPadEnd = !segmentOptions.isLastSegment;

  const nominalFromUs = segmentOptions.segmentStartMs * 1000;
  const nominalToUs = segmentOptions.segmentEndMs * 1000;
  const alignedFromUsWithoutPadding = getClosestAlignedTimeUs(nominalFromUs);
  const alignedToUsWithoutPadding = getClosestAlignedTimeUs(nominalToUs);

  const alignedFromUs = shouldPadStart
    ? alignedFromUsWithoutPadding - PADDING_US
    : alignedFromUsWithoutPadding;

  const alignedToUs = shouldPadEnd
    ? alignedToUsWithoutPadding + PADDING_US
    : alignedToUsWithoutPadding;

  return {
    mode: "canvas",
    strategy: options.strategy,
    fetchHost:
      process.env.FRAMEGEN_OUTBOUND_HOST ??
      process.env.WEB_HOST ??
      "http://localhost:3000",
    durationMs: options.durationMs,
    encoderOptions: {
      keyframeIntervalMs: 2000,
      fromMs: segmentOptions.segmentStartMs,
      toMs: segmentOptions.segmentEndMs,
      shouldPadStart,
      shouldPadEnd,
      alignedFromUs,
      alignedToUs,
      isInitSegment,
      sequenceNumber: segmentOptions.sequenceNumber,
      video: {
        width: options.width,
        height: options.height,
        framerate: options.fps,
        // codec: "avc1.4d0028",
        codec: "avc1.640029",
        bitrate: 10000000,
      },
      noAudio: true,
      audio: {
        sampleRate: 48000,
        codec: "mp4a.40.2",
        numberOfChannels: 1,
        bitrate: 128000,
      },
    },
  };
}
