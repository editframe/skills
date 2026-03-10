import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";
import type { ThumbnailResult } from "../../../transcoding/types/index.js";
import type { MediaEngine } from "../MediaEngine.js";
import type { TrackRef } from "../SegmentIndex.js";
import { globalInputCache } from "./GlobalInputCache.js";
import { withTimeout, DEFAULT_MEDIABUNNY_TIMEOUT_MS } from "./timeoutUtils.js";

export class ThumbnailExtractor {
  constructor(private mediaEngine: MediaEngine) {}

  async extractThumbnails(
    timestamps: number[],
    track: TrackRef,
    durationMs: number,
    signal?: AbortSignal,
  ): Promise<(ThumbnailResult | null)[]> {
    if (timestamps.length === 0) {
      return [];
    }

    const validTimestamps = timestamps.filter((timeMs) => timeMs >= 0 && timeMs <= durationMs);

    if (validTimestamps.length === 0) {
      console.warn(`ThumbnailExtractor: All timestamps out of bounds (0-${durationMs}ms)`);
      return timestamps.map(() => null);
    }

    const segmentGroups = this.groupTimestampsBySegment(validTimestamps, track);
    const results = new Map<number, ThumbnailResult | null>();

    for (const [segmentId, segmentTimestamps] of segmentGroups) {
      signal?.throwIfAborted();

      try {
        const segmentResults = await this.extractSegmentThumbnails(
          segmentId,
          segmentTimestamps,
          track,
          signal,
        );

        for (const [timestamp, thumbnail] of segmentResults) {
          results.set(timestamp, thumbnail);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        console.warn(
          `ThumbnailExtractor: Failed to extract thumbnails for segment ${segmentId}:`,
          error,
        );
        for (const timestamp of segmentTimestamps) {
          results.set(timestamp, null);
        }
      }
    }

    return timestamps.map((t) => {
      if (t < 0 || t > durationMs) {
        return null;
      }
      return results.get(t) || null;
    });
  }

  private groupTimestampsBySegment(timestamps: number[], track: TrackRef): Map<number, number[]> {
    const segmentGroups = new Map<number, number[]>();

    for (const timeMs of timestamps) {
      try {
        const segmentId = this.mediaEngine.index.segmentAt(timeMs, track);
        if (segmentId !== undefined) {
          if (!segmentGroups.has(segmentId)) {
            segmentGroups.set(segmentId, []);
          }
          const segmentGroup = segmentGroups.get(segmentId)!;
          segmentGroup.push(timeMs);
        }
      } catch (error) {
        console.warn(
          `ThumbnailExtractor: Could not compute segment for timestamp ${timeMs}:`,
          error,
        );
      }
    }

    return segmentGroups;
  }

  private async extractSegmentThumbnails(
    segmentId: number,
    timestamps: number[],
    track: TrackRef,
    signal?: AbortSignal,
  ): Promise<Map<number, ThumbnailResult | null>> {
    const results = new Map<number, ThumbnailResult | null>();

    try {
      signal?.throwIfAborted();

      const initP = this.mediaEngine.transport.fetchInitSegment(track, signal!);
      const mediaP = this.mediaEngine.transport.fetchMediaSegment(segmentId, track, signal!);
      initP.catch(() => {});
      mediaP.catch(() => {});
      const [initSegment, mediaSegment] = await Promise.all([initP, mediaP]);

      signal?.throwIfAborted();

      const segmentBlob = new Blob([initSegment, mediaSegment]);
      const renditionId = typeof track.id === "string" ? track.id : undefined;

      let input = globalInputCache.get(track.src, segmentId, renditionId);
      if (!input) {
        input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(segmentBlob),
        });
        globalInputCache.set(track.src, segmentId, input, renditionId);
      }

      const videoTrack = await withTimeout(
        input.getPrimaryVideoTrack(),
        5000,
        "ThumbnailExtractor.getPrimaryVideoTrack",
        signal,
      );
      if (!videoTrack) {
        for (const timestamp of timestamps) {
          results.set(timestamp, null);
        }
        return results;
      }

      const sink = new CanvasSink(videoTrack);
      const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

      const relativeTimestamps = sortedTimestamps.map((ms) =>
        this.mediaEngine.timing.toContainerSeconds(ms, segmentId, track),
      );

      const timestampResults = [];
      const canvasIterator = sink.canvasesAtTimestamps(relativeTimestamps);
      for await (const result of canvasIterator) {
        const canvasResult = await withTimeout(
          Promise.resolve(result),
          DEFAULT_MEDIABUNNY_TIMEOUT_MS,
          "ThumbnailExtractor canvasesAtTimestamps iteration",
          signal,
        );
        timestampResults.push(canvasResult);
      }

      for (let i = 0; i < sortedTimestamps.length; i++) {
        const globalTimestamp = sortedTimestamps[i];
        if (globalTimestamp === undefined) {
          continue;
        }

        const result = timestampResults[i];

        if (result?.canvas) {
          const canvas = result.canvas;
          if (canvas instanceof HTMLCanvasElement || canvas instanceof OffscreenCanvas) {
            results.set(globalTimestamp, {
              timestamp: globalTimestamp,
              thumbnail: canvas,
            });
          } else {
            results.set(globalTimestamp, null);
          }
        } else {
          results.set(globalTimestamp, null);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      console.warn(
        `ThumbnailExtractor: Failed to extract thumbnails for segment ${segmentId}:`,
        error,
      );
      for (const timestamp of timestamps) {
        results.set(timestamp, null);
      }
    }

    return results;
  }
}
