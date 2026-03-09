import type { TrackFragmentIndex } from "@editframe/assets";
import type { RenditionId } from "../../transcoding/types/index.js";
import type { TrackRef } from "./SegmentIndex.js";
import type { CachedFetcher } from "./CachedFetcher.js";

export interface SegmentTransport {
  fetchInitSegment(track: TrackRef, signal: AbortSignal): Promise<ArrayBuffer>;
  fetchMediaSegment(segmentId: number, track: TrackRef, signal: AbortSignal): Promise<ArrayBuffer>;
  isCached(segmentId: number, track: TrackRef): boolean;
}

// ---------------------------------------------------------------------------
// UrlTransport — each segment has its own URL
// Used by AssetMediaEngine (via JIT URLs) and JitMediaEngine natively.
// ---------------------------------------------------------------------------

interface UrlTransportOptions {
  fetcher: CachedFetcher;
  src: string;
  templates: { initSegment: string; mediaSegment: string };
  audioTrackId: number | undefined;
  videoTrackId: number | undefined;
}

function resolveRenditionId(track: TrackRef): RenditionId {
  if (track.role === "audio") return "audio";
  if (track.role === "scrub") return "scrub";
  if (typeof track.id === "string") return track.id as RenditionId;
  // For numeric IDs (fragment-based), map to JIT rendition names
  if (track.id === -1) return "scrub";
  if (track.id === 2) return "audio";
  return "high";
}

export function createUrlTransport(opts: UrlTransportOptions): SegmentTransport {
  const { fetcher, src, templates, audioTrackId, videoTrackId } = opts;

  function buildSegmentUrl(segmentId: "init" | number, track: TrackRef): string {
    const renditionId = resolveRenditionId(track);
    const template = segmentId === "init" ? templates.initSegment : templates.mediaSegment;
    const trackId =
      typeof track.id === "number"
        ? track.id
        : track.role === "audio"
          ? audioTrackId
          : videoTrackId;
    return template
      .replace("{rendition}", renditionId)
      .replace("{segmentId}", segmentId.toString())
      .replace("{src}", src)
      .replace("{trackId}", trackId?.toString() ?? "");
  }

  return {
    async fetchInitSegment(track: TrackRef, signal: AbortSignal): Promise<ArrayBuffer> {
      const url = buildSegmentUrl("init", track);
      return fetcher.fetchArrayBuffer(url, signal);
    },

    async fetchMediaSegment(
      segmentId: number,
      track: TrackRef,
      signal: AbortSignal,
    ): Promise<ArrayBuffer> {
      const url = buildSegmentUrl(segmentId, track);
      return fetcher.fetchArrayBuffer(url, signal);
    },

    isCached(segmentId: number, track: TrackRef): boolean {
      const url = buildSegmentUrl(segmentId, track);
      return fetcher.has(url);
    },
  };
}

// ---------------------------------------------------------------------------
// ByteRangeTransport — fetches full track binary, slices segments
// Used by FileMediaEngine.
// ---------------------------------------------------------------------------

export function createByteRangeTransport(
  data: Record<number, TrackFragmentIndex>,
  fileId: string,
  apiHost: string,
  fetcher: CachedFetcher,
): SegmentTransport {
  function buildTrackUrl(trackId: number): string {
    return `${apiHost}/api/v1/files/${fileId}/tracks/${trackId}`;
  }

  function getTrackId(track: TrackRef): number {
    const trackId = typeof track.id === "number" ? track.id : Number.parseInt(track.id, 10);
    if (Number.isNaN(trackId)) {
      throw new Error(`Invalid track ID: ${track.id}`);
    }
    return trackId;
  }

  return {
    async fetchInitSegment(track: TrackRef, signal: AbortSignal): Promise<ArrayBuffer> {
      const trackId = getTrackId(track);
      const trackData = data[trackId];
      if (!trackData) throw new Error(`Track ${trackId} not found`);

      const { offset, size } = trackData.initSegment;
      const url = buildTrackUrl(trackId);
      const fullTrack = await fetcher.fetchArrayBuffer(url, signal);
      return fullTrack.slice(offset, offset + size);
    },

    async fetchMediaSegment(
      segmentId: number,
      track: TrackRef,
      signal: AbortSignal,
    ): Promise<ArrayBuffer> {
      const trackId = getTrackId(track);
      const trackData = data[trackId];
      if (!trackData) throw new Error(`Track ${trackId} not found`);

      const segment = trackData.segments[segmentId];
      if (!segment) {
        throw new Error(`Segment ${segmentId} not found for track ${trackId}`);
      }

      const url = buildTrackUrl(trackId);
      const fullTrack = await fetcher.fetchArrayBuffer(url, signal);
      return fullTrack.slice(segment.offset, segment.offset + segment.size);
    },

    isCached(_segmentId: number, track: TrackRef): boolean {
      const trackId = getTrackId(track);
      const url = buildTrackUrl(trackId);
      return fetcher.has(url);
    },
  };
}
