import type {
  AudioSpan,
  MediaEngine,
  SegmentTimeRange,
} from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";

/**
 * Fetch audio segment data using MediaEngine
 * Pure function with explicit dependencies
 */
const fetchAudioSegmentData = async (
  segmentIds: number[],
  mediaEngine: MediaEngine,
  signal?: AbortSignal,
): Promise<Map<number, ArrayBuffer>> => {
  const audioRendition = mediaEngine.audioRendition;
  if (!audioRendition) {
    throw new Error("Audio rendition not available");
  }

  const segmentData = new Map<number, ArrayBuffer>();

  // Fetch all segments - MediaEngine handles deduplication internally
  const fetchPromises = segmentIds.map(async (segmentId) => {
    const arrayBuffer = await mediaEngine.fetchMediaSegment(
      segmentId,
      audioRendition,
      signal,
    );
    return [segmentId, arrayBuffer] as [number, ArrayBuffer];
  });

  const fetchedSegments = await Promise.all(fetchPromises);
  signal?.throwIfAborted();

  for (const [segmentId, arrayBuffer] of fetchedSegments) {
    segmentData.set(segmentId, arrayBuffer);
  }

  return segmentData;
};

/**
 * Create audio span blob from init segment and media segments
 * Pure function for blob creation
 */
const createAudioSpanBlob = (
  initSegment: ArrayBuffer,
  mediaSegments: ArrayBuffer[],
): Blob => {
  const chunks = [initSegment, ...mediaSegments];
  return new Blob(chunks, { type: "audio/mp4" });
};

/**
 * Fetch audio spanning a time range
 * Main function that orchestrates segment calculation, fetching, and blob creation
 */
export const fetchAudioSpanningTime = async (
  host: EFMedia,
  fromMs: number,
  toMs: number,
  signal?: AbortSignal,
): Promise<AudioSpan | undefined> => {
  // Validate inputs
  if (fromMs >= toMs || fromMs < 0) {
    throw new Error(`Invalid time range: fromMs=${fromMs}, toMs=${toMs}`);
  }

  // Get dependencies from host
  const mediaEngine = await host.mediaEngineTask.taskComplete;
  signal?.throwIfAborted();
  
  const initSegment = await host.audioInitSegmentFetchTask.taskComplete;
  signal?.throwIfAborted();

  // Return undefined if no audio rendition available
  if (!mediaEngine?.audioRendition) {
    return undefined;
  }

  if (!initSegment) {
    return undefined;
  }

  // Calculate segments needed using the media engine's method
  const segmentRanges = mediaEngine.calculateAudioSegmentRange(
    fromMs,
    toMs,
    mediaEngine.audioRendition,
    host.intrinsicDurationMs || 10000,
  );

  if (segmentRanges.length === 0) {
    throw new Error(`No segments found for time range ${fromMs}-${toMs}ms`);
  }

  // Fetch segment data
  const segmentIds = segmentRanges.map((r: SegmentTimeRange) => r.segmentId);
  const segmentData = await fetchAudioSegmentData(
    segmentIds,
    mediaEngine,
    signal,
  );

  // Create ordered array of segments
  const orderedSegments = segmentIds.map((id: number) => {
    const segment = segmentData.get(id);
    if (!segment) {
      throw new Error(`Missing segment data for segment ID ${id}`);
    }
    return segment;
  });

  // Create blob
  const blob = createAudioSpanBlob(initSegment, orderedSegments);

  // Calculate actual time boundaries
  const actualStartMs = Math.min(
    ...segmentRanges.map((r: SegmentTimeRange) => r.startMs),
  );
  const actualEndMs = Math.max(
    ...segmentRanges.map((r: SegmentTimeRange) => r.endMs),
  );

  return {
    startMs: actualStartMs,
    endMs: actualEndMs,
    blob,
  };
};
