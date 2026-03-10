import type { TrackFragmentIndex } from "@editframe/assets";
import type { ManifestResponse } from "../../transcoding/types/index.js";
import { convertToScaledTime, roundToMilliseconds } from "./shared/PrecisionUtils.js";

export type TrackRole = "video" | "audio" | "scrub";

export interface TrackRef {
  readonly role: TrackRole;
  readonly id: string | number;
  readonly src: string;
  readonly segmentDurationMs?: number;
  readonly segmentDurationsMs?: number[];
  readonly startTimeOffsetMs?: number;
}

export interface TrackSet {
  video?: TrackRef;
  audio?: TrackRef;
  scrub?: TrackRef;
}

export interface SegmentTimeRange {
  segmentId: number;
  startMs: number;
  endMs: number;
}

export interface SegmentIndex {
  readonly durationMs: number;
  readonly tracks: TrackSet;
  segmentAt(timeMs: number, track: TrackRef): number | undefined;
  segmentsInRange(fromMs: number, toMs: number, track: TrackRef): SegmentTimeRange[];
}

// ---------------------------------------------------------------------------
// FragmentIndex — backed by TrackFragmentIndex (local and file-id files)
// ---------------------------------------------------------------------------

export function createFragmentIndex(
  data: Record<number, TrackFragmentIndex>,
  src: string,
): SegmentIndex {
  const longestFragment = Object.values(data).reduce(
    (max, fragment) => Math.max(max, fragment.duration / fragment.timescale),
    0,
  );
  const durationMs = longestFragment * 1000;

  const audioTrack = Object.values(data).find((t) => t.type === "audio");
  const videoTrack = Object.values(data).find(
    (t) => t.type === "video" && t.track !== undefined && t.track > 0,
  );
  const scrubTrack = data[-1];

  const tracks: TrackSet = {};

  if (videoTrack && videoTrack.track !== undefined) {
    tracks.video = {
      role: "video",
      id: videoTrack.track,
      src,
      startTimeOffsetMs: videoTrack.startTimeOffsetMs,
    };
  }

  if (audioTrack && audioTrack.track !== undefined) {
    tracks.audio = {
      role: "audio",
      id: audioTrack.track,
      src,
    };
  }

  if (scrubTrack && scrubTrack.track !== undefined) {
    const segmentDurationsMs =
      scrubTrack.segments.length > 0
        ? scrubTrack.segments.map((s) => (s.duration / scrubTrack.timescale) * 1000)
        : undefined;
    tracks.scrub = {
      role: "scrub",
      id: scrubTrack.track,
      src,
      segmentDurationMs: 30000,
      segmentDurationsMs,
      startTimeOffsetMs: scrubTrack.startTimeOffsetMs,
    };
  }

  return {
    durationMs,
    tracks,

    segmentAt(timeMs: number, track: TrackRef): number | undefined {
      const trackId = typeof track.id === "number" ? track.id : Number.parseInt(track.id, 10);
      const trackData = data[trackId];
      if (!trackData) {
        throw new Error(`Track ${trackId} not found`);
      }
      const { timescale, segments } = trackData;

      const startTimeOffsetMs = track.startTimeOffsetMs || 0;
      const offsetSeekTimeMs = roundToMilliseconds(timeMs + startTimeOffsetMs);
      const scaledSeekTime = convertToScaledTime(offsetSeekTimeMs, timescale);

      for (let i = segments.length - 1; i >= 0; i--) {
        const segment = segments[i]!;
        const segmentEndTime = segment.cts + segment.duration;
        if (segment.cts <= scaledSeekTime && scaledSeekTime < segmentEndTime) {
          return i;
        }
      }

      // Gap handling: find nearest segment
      let nearestSegmentIndex = 0;
      let nearestDistance = Number.MAX_SAFE_INTEGER;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;
        const segmentEndTime = segment.cts + segment.duration;

        let distance: number;
        if (scaledSeekTime < segment.cts) {
          distance = segment.cts - scaledSeekTime;
        } else if (scaledSeekTime >= segmentEndTime) {
          distance = scaledSeekTime - segmentEndTime;
        } else {
          return i;
        }

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSegmentIndex = i;
        }
      }

      return nearestSegmentIndex;
    },

    segmentsInRange(fromMs: number, toMs: number, track: TrackRef): SegmentTimeRange[] {
      if (fromMs >= toMs) return [];

      const trackId = typeof track.id === "number" ? track.id : Number.parseInt(track.id, 10);
      const trackData = data[trackId];
      if (!trackData) return [];

      const { timescale, segments } = trackData;
      const ranges: SegmentTimeRange[] = [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;
        const segmentStartMs = (segment.cts / timescale) * 1000;
        const segmentEndMs = ((segment.cts + segment.duration) / timescale) * 1000;

        if (segmentStartMs < toMs && segmentEndMs > fromMs) {
          ranges.push({
            segmentId: i,
            startMs: segmentStartMs,
            endMs: segmentEndMs,
          });
        }
      }

      return ranges;
    },
  };
}

// ---------------------------------------------------------------------------
// ManifestIndex — backed by ManifestResponse (JIT transcoding)
// ---------------------------------------------------------------------------

export function createManifestIndex(manifest: ManifestResponse): SegmentIndex {
  const durationMs = manifest.durationMs;
  const tracks: TrackSet = {};

  if (manifest.videoRenditions && manifest.videoRenditions.length > 0) {
    const r = manifest.videoRenditions[0]!;
    tracks.video = {
      role: "video",
      id: r.id,
      src: manifest.sourceUrl,
      segmentDurationMs: r.segmentDurationMs,
      segmentDurationsMs: r.segmentDurationsMs,
      startTimeOffsetMs: r.startTimeOffsetMs,
    };

    const scrubRendition = manifest.videoRenditions.find((v) => v.id === "scrub");
    if (scrubRendition) {
      tracks.scrub = {
        role: "scrub",
        id: scrubRendition.id,
        src: manifest.sourceUrl,
        segmentDurationMs: scrubRendition.segmentDurationMs,
        segmentDurationsMs: scrubRendition.segmentDurationsMs,
        startTimeOffsetMs: scrubRendition.startTimeOffsetMs,
      };
    }
  }

  if (manifest.audioRenditions && manifest.audioRenditions.length > 0) {
    const r = manifest.audioRenditions[0]!;
    tracks.audio = {
      role: "audio",
      id: r.id,
      src: manifest.sourceUrl,
      segmentDurationMs: r.segmentDurationMs,
      segmentDurationsMs: r.segmentDurationsMs,
      startTimeOffsetMs: r.startTimeOffsetMs,
    };
  }

  function computeSegmentIdForTrack(
    desiredSeekTimeMs: number,
    track: TrackRef,
  ): number | undefined {
    if (desiredSeekTimeMs > durationMs) {
      return undefined;
    }

    if (track.segmentDurationsMs && track.segmentDurationsMs.length > 0) {
      let cumulativeTime = 0;
      for (let i = 0; i < track.segmentDurationsMs.length; i++) {
        const segmentDuration = track.segmentDurationsMs[i];
        if (segmentDuration === undefined) {
          throw new Error("Segment duration is required for JIT metadata");
        }
        const segmentStartMs = cumulativeTime;
        const segmentEndMs = cumulativeTime + segmentDuration;

        const isLastSegment = i === track.segmentDurationsMs.length - 1;
        const includesEndTime = isLastSegment && desiredSeekTimeMs === durationMs;

        if (
          desiredSeekTimeMs >= segmentStartMs &&
          (desiredSeekTimeMs < segmentEndMs || includesEndTime)
        ) {
          return i + 1;
        }

        cumulativeTime += segmentDuration;
        if (cumulativeTime >= durationMs) break;
      }
      return undefined;
    }

    if (!track.segmentDurationMs) {
      throw new Error("Segment duration is required for JIT metadata");
    }

    const segmentIndex = Math.floor(desiredSeekTimeMs / track.segmentDurationMs);
    const segmentStartMs = segmentIndex * track.segmentDurationMs;
    if (segmentStartMs >= durationMs) {
      return undefined;
    }
    return segmentIndex + 1;
  }

  return {
    durationMs,
    tracks,

    segmentAt(timeMs: number, track: TrackRef): number | undefined {
      return computeSegmentIdForTrack(timeMs, track);
    },

    segmentsInRange(fromMs: number, toMs: number, track: TrackRef): SegmentTimeRange[] {
      if (fromMs >= toMs) return [];

      const segments: SegmentTimeRange[] = [];

      if (track.segmentDurationsMs && track.segmentDurationsMs.length > 0) {
        let cumulativeTime = 0;
        for (let i = 0; i < track.segmentDurationsMs.length; i++) {
          const segmentDuration = track.segmentDurationsMs[i];
          if (segmentDuration === undefined) continue;
          const segmentStartMs = cumulativeTime;
          const segmentEndMs = Math.min(cumulativeTime + segmentDuration, durationMs);

          if (segmentStartMs >= durationMs) break;

          if (segmentStartMs < toMs && segmentEndMs > fromMs) {
            segments.push({
              segmentId: i + 1,
              startMs: segmentStartMs,
              endMs: segmentEndMs,
            });
          }

          cumulativeTime += segmentDuration;
          if (cumulativeTime >= durationMs) break;
        }
        return segments;
      }

      const segmentDurationMs = track.segmentDurationMs || 1000;
      const startSegmentIndex = Math.floor(fromMs / segmentDurationMs);
      const endSegmentIndex = Math.floor(toMs / segmentDurationMs);

      for (let i = startSegmentIndex; i <= endSegmentIndex; i++) {
        const segmentId = i + 1;
        const segmentStartMs = i * segmentDurationMs;
        const segmentEndMs = Math.min((i + 1) * segmentDurationMs, durationMs);

        if (segmentStartMs >= durationMs) break;
        if (segmentStartMs < toMs && segmentEndMs > fromMs) {
          segments.push({
            segmentId,
            startMs: segmentStartMs,
            endMs: segmentEndMs,
          });
        }
      }

      return segments;
    },
  };
}
