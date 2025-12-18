import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";
import type {
  ThumbnailResult,
  VideoRendition,
} from "../../../transcoding/types/index.js";
import type { BaseMediaEngine } from "../BaseMediaEngine.js";
import { globalInputCache } from "./GlobalInputCache.js";

/**
 * Shared thumbnail extraction logic for all MediaEngine implementations
 * Eliminates code duplication and provides consistent behavior
 */
export class ThumbnailExtractor {
  constructor(private mediaEngine: BaseMediaEngine) {}

  /**
   * Extract thumbnails at multiple timestamps efficiently using segment batching
   */
  async extractThumbnails(
    timestamps: number[],
    rendition: VideoRendition,
    durationMs: number,
  ): Promise<(ThumbnailResult | null)[]> {
    if (timestamps.length === 0) {
      return [];
    }

    // Validate and filter timestamps within bounds
    const validTimestamps = timestamps.filter(
      (timeMs) => timeMs >= 0 && timeMs <= durationMs,
    );

    if (validTimestamps.length === 0) {
      console.warn(
        `ThumbnailExtractor: All timestamps out of bounds (0-${durationMs}ms)`,
      );
      return timestamps.map(() => null);
    }

    // Group timestamps by segment for batch processing
    const segmentGroups = this.groupTimestampsBySegment(
      validTimestamps,
      rendition,
    );

    // Extract batched by segment using CanvasSink
    const results = new Map<number, ThumbnailResult | null>();

    for (const [segmentId, segmentTimestamps] of segmentGroups) {
      try {
        const segmentResults = await this.extractSegmentThumbnails(
          segmentId,
          segmentTimestamps,
          rendition,
        );

        for (const [timestamp, thumbnail] of segmentResults) {
          results.set(timestamp, thumbnail);
        }
      } catch (error) {
        console.warn(
          `ThumbnailExtractor: Failed to extract thumbnails for segment ${segmentId}:`,
          error,
        );
        // Mark all timestamps in this segment as failed
        for (const timestamp of segmentTimestamps) {
          results.set(timestamp, null);
        }
      }
    }

    // Return in original order, null for any that failed or were out of bounds
    return timestamps.map((t) => {
      // If timestamp was out of bounds, return null
      if (t < 0 || t > durationMs) {
        return null;
      }
      return results.get(t) || null;
    });
  }

  /**
   * Group timestamps by segment ID for efficient batch processing
   */
  private groupTimestampsBySegment(
    timestamps: number[],
    rendition: VideoRendition,
  ): Map<number, number[]> {
    const segmentGroups = new Map<number, number[]>();

    for (const timeMs of timestamps) {
      try {
        const segmentId = this.mediaEngine.computeSegmentId(timeMs, rendition);
        if (segmentId !== undefined) {
          if (!segmentGroups.has(segmentId)) {
            segmentGroups.set(segmentId, []);
          }
          const segmentGroup = segmentGroups.get(segmentId) ?? [];
          if (!segmentGroup) {
            segmentGroups.set(segmentId, []);
          }
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

  /**
   * Extract thumbnails for a specific segment using CanvasSink
   */
  private async extractSegmentThumbnails(
    segmentId: number,
    timestamps: number[],
    rendition: VideoRendition,
  ): Promise<Map<number, ThumbnailResult | null>> {
    const results = new Map<number, ThumbnailResult | null>();

    try {
      // Get segment data through existing media engine methods (uses caches)
      const abortController = new AbortController();
      const [initSegment, mediaSegment] = await Promise.all([
        this.mediaEngine.fetchInitSegment(rendition, abortController.signal),
        this.mediaEngine.fetchMediaSegment(segmentId, rendition),
      ]);

      // Create Input for this segment using global shared cache
      const segmentBlob = new Blob([initSegment, mediaSegment]);

      let input = globalInputCache.get(rendition.src, segmentId, rendition.id);
      if (!input) {
        input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(segmentBlob),
        });
        globalInputCache.set(rendition.src, segmentId, input, rendition.id);
      }

      // Set up CanvasSink for batched extraction
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) {
        // No video track - return nulls for all timestamps
        for (const timestamp of timestamps) {
          results.set(timestamp, null);
        }
        return results;
      }

      const sink = new CanvasSink(videoTrack);

      // IMPORTANT: Sort timestamps for mediabunny - it expects monotonically sorted timestamps
      // Create array of {original, sorted} to map back after extraction
      const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

      // Convert sorted global timestamps to segment-relative (in seconds for mediabunny)
      const relativeTimestamps = this.convertToSegmentRelativeTimestamps(
        sortedTimestamps,
        segmentId,
        rendition,
      );

      // Batch extract all thumbnails for this segment (in sorted order)
      const timestampResults = [];
      for await (const result of sink.canvasesAtTimestamps(
        relativeTimestamps,
      )) {
        timestampResults.push(result);
      }

      // Map results back to original (sorted) timestamps
      for (let i = 0; i < sortedTimestamps.length; i++) {
        const globalTimestamp = sortedTimestamps[i];
        if (globalTimestamp === undefined) {
          continue;
        }

        const result = timestampResults[i];

        if (result?.canvas) {
          const canvas = result.canvas;
          if (
            canvas instanceof HTMLCanvasElement ||
            canvas instanceof OffscreenCanvas
          ) {
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
      console.error(
        `ThumbnailExtractor: Failed to extract thumbnails for segment ${segmentId}:`,
        error,
      );
      // Return nulls for all timestamps on error
      for (const timestamp of timestamps) {
        results.set(timestamp, null);
      }
    }

    return results;
  }

  /**
   * Convert global timestamps to segment-relative timestamps for mediabunny
   * This is where the main difference between JIT and Asset engines lies
   */
  private convertToSegmentRelativeTimestamps(
    globalTimestamps: number[],
    segmentId: number,
    rendition: VideoRendition,
  ): number[] {
    return this.mediaEngine.convertToSegmentRelativeTimestamps(
      globalTimestamps,
      segmentId,
      rendition,
    );
  }
}
