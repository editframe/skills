import type { TrackFragmentIndex } from "@editframe/assets";
import type { TrackRef } from "./SegmentIndex.js";

export interface TimingModel {
  toContainerSeconds(
    timeMs: number,
    segmentId: number,
    track: TrackRef,
  ): number;
}

/**
 * For byte-range sliced segments from full track files (FileMediaEngine).
 * mediabunny sees segment-relative timestamps since we sliced at segment boundaries,
 * so we subtract the segment's CTS to get relative time.
 */
export function createByteRangeTiming(
  data: Record<number, TrackFragmentIndex>,
): TimingModel {
  return {
    toContainerSeconds(
      timeMs: number,
      segmentId: number,
      track: TrackRef,
    ): number {
      const trackId =
        typeof track.id === "number"
          ? track.id
          : Number.parseInt(track.id, 10);
      const trackData = data[trackId];
      if (!trackData) throw new Error("Track not found");

      const segment = trackData.segments[segmentId];
      if (!segment) throw new Error("Segment not found");

      const segmentStartMs = (segment.cts / trackData.timescale) * 1000;
      return (timeMs - segmentStartMs) / 1000;
    },
  };
}

/**
 * For JIT transcoded segments (JitMediaEngine).
 * Segments are self-contained — just convert ms to seconds.
 */
export function createJitTiming(): TimingModel {
  return {
    toContainerSeconds(
      timeMs: number,
      _segmentId: number,
      _track: TrackRef,
    ): number {
      return timeMs / 1000;
    },
  };
}
