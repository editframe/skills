import type {
  AudioRendition,
  VideoRendition,
} from "../../../transcoding/types";

/**
 * State interface for media buffering - orchestration only, no data storage
 */
export interface MediaBufferState {
  currentSeekTimeMs: number;
  requestedSegments: Set<number>; // Segments we've requested for buffering
  activeRequests: Set<number>; // Segments currently being fetched
  requestQueue: number[]; // Segments queued to be requested
}

/**
 * Configuration interface for media buffering - generic for both audio and video
 */
export interface MediaBufferConfig {
  bufferDurationMs: number;
  maxParallelFetches: number;
  enableBuffering: boolean;
  enableContinuousBuffering?: boolean;
  bufferThresholdMs?: number; // Timeline-aware buffering threshold (default: 30000ms)
}

/**
 * Dependencies interface for media buffering - integrates with BaseMediaEngine
 */
export interface MediaBufferDependencies<
  T extends AudioRendition | VideoRendition,
> {
  computeSegmentId: (
    timeMs: number,
    rendition: T,
  ) => Promise<number | undefined>;
  prefetchSegment: (segmentId: number, rendition: T) => Promise<void>; // Just trigger prefetch, don't return data
  isSegmentCached: (segmentId: number, rendition: T) => boolean; // Check BaseMediaEngine cache
  getRendition: () => Promise<T | undefined>;
  logError: (message: string, error: any) => void;
}

/**
 * Compute segment range for a time window
 * Pure function - determines which segments are needed for a time range
 */
export const computeSegmentRange = <T extends AudioRendition | VideoRendition>(
  startTimeMs: number,
  endTimeMs: number,
  rendition: T,
  computeSegmentId: (timeMs: number, rendition: T) => number | undefined,
): number[] => {
  const segments: number[] = [];
  const segmentDurationMs = (rendition as any).segmentDurationMs || 1000;

  // Calculate segment indices that overlap with [startTimeMs, endTimeMs]
  const startSegmentIndex = Math.floor(startTimeMs / segmentDurationMs);
  const endSegmentIndex = Math.floor(endTimeMs / segmentDurationMs);

  for (let i = startSegmentIndex; i <= endSegmentIndex; i++) {
    const segmentId = computeSegmentId(i * segmentDurationMs, rendition);
    if (segmentId !== undefined) {
      segments.push(segmentId);
    }
  }

  return segments.filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
};

/**
 * Async version of computeSegmentRange for when computeSegmentId is async
 */
export const computeSegmentRangeAsync = async <
  T extends AudioRendition | VideoRendition,
>(
  startTimeMs: number,
  endTimeMs: number,
  durationMs: number,
  rendition: T,
  computeSegmentId: (
    timeMs: number,
    rendition: T,
  ) => Promise<number | undefined>,
): Promise<number[]> => {
  const segments: number[] = [];
  const segmentDurationMs = (rendition as any).segmentDurationMs || 1000;

  // Calculate segment indices that overlap with [startTimeMs, endTimeMs]
  const startSegmentIndex = Math.floor(startTimeMs / segmentDurationMs);
  const endSegmentIndex = Math.floor(
    Math.min(endTimeMs, durationMs) / segmentDurationMs,
  );

  for (let i = startSegmentIndex; i <= endSegmentIndex; i++) {
    const timeMs = i * segmentDurationMs;
    if (timeMs < durationMs) {
      const segmentId = await computeSegmentId(timeMs, rendition);
      if (segmentId !== undefined) {
        segments.push(segmentId);
      }
    }
  }

  return segments.filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
};

/**
 * Compute buffer queue based on desired segments and what we've already requested
 * Pure function - determines what new segments should be prefetched
 */
export const computeBufferQueue = (
  desiredSegments: number[],
  requestedSegments: Set<number>,
): number[] => {
  return desiredSegments.filter(
    (segmentId) => !requestedSegments.has(segmentId),
  );
};

/**
 * Handle seek time change and recompute buffer queue
 * Pure function - computes new queue when seek time changes
 */
export const handleSeekTimeChange = <T extends AudioRendition | VideoRendition>(
  newSeekTimeMs: number,
  bufferDurationMs: number,
  rendition: T,
  currentState: MediaBufferState,
  computeSegmentId: (timeMs: number, rendition: T) => number | undefined,
): { newQueue: number[]; overlappingRequests: number[] } => {
  const endTimeMs = newSeekTimeMs + bufferDurationMs;
  const desiredSegments = computeSegmentRange(
    newSeekTimeMs,
    endTimeMs,
    rendition,
    computeSegmentId,
  );

  // Find segments that are already being requested
  const overlappingRequests = desiredSegments.filter((segmentId) =>
    currentState.requestedSegments.has(segmentId),
  );

  const newQueue = computeBufferQueue(
    desiredSegments,
    currentState.requestedSegments,
  );

  return { newQueue, overlappingRequests };
};

/**
 * Check if a segment has been requested for buffering
 * Pure function for checking buffer orchestration state
 */
export const isSegmentRequested = (
  segmentId: number,
  bufferState: MediaBufferState | undefined,
): boolean => {
  return bufferState?.requestedSegments.has(segmentId) ?? false;
};

/**
 * Get requested segments from a list of segment IDs
 * Pure function that returns which segments have been requested for buffering
 */
export const getRequestedSegments = (
  segmentIds: number[],
  bufferState: MediaBufferState | undefined,
): Set<number> => {
  if (!bufferState) {
    return new Set();
  }
  return new Set(
    segmentIds.filter((id) => bufferState.requestedSegments.has(id)),
  );
};

/**
 * Get unrequested segments from a list of segment IDs
 * Pure function that returns which segments haven't been requested yet
 */
export const getUnrequestedSegments = (
  segmentIds: number[],
  bufferState: MediaBufferState | undefined,
): number[] => {
  if (!bufferState) {
    return segmentIds;
  }
  return segmentIds.filter((id) => !bufferState.requestedSegments.has(id));
};

/**
 * Calculate distance from element to playhead position
 * Returns 0 if element is currently active, otherwise returns distance in milliseconds
 */
export const calculatePlayheadDistance = (
  element: { startTimeMs: number; endTimeMs: number },
  playheadMs: number,
): number => {
  // Element hasn't started yet
  if (playheadMs < element.startTimeMs) {
    return element.startTimeMs - playheadMs;
  }
  // Element already finished
  if (playheadMs > element.endTimeMs) {
    return playheadMs - element.endTimeMs;
  }
  // Element is currently active
  return 0;
};

/**
 * Core media buffering orchestration logic - prefetch only, no data storage
 * Integrates with BaseMediaEngine's existing caching and request deduplication
 */
export const manageMediaBuffer = async <
  T extends AudioRendition | VideoRendition,
>(
  seekTimeMs: number,
  config: MediaBufferConfig,
  currentState: MediaBufferState,
  durationMs: number,
  signal: AbortSignal,
  deps: MediaBufferDependencies<T>,
  timelineContext?: {
    elementStartMs: number;
    elementEndMs: number;
    playheadMs: number;
  },
): Promise<MediaBufferState> => {
  if (!config.enableBuffering) {
    return currentState;
  }

  // Timeline-aware buffering: skip if element is too far from playhead
  if (timelineContext && config.bufferThresholdMs !== undefined) {
    const distance = calculatePlayheadDistance(
      {
        startTimeMs: timelineContext.elementStartMs,
        endTimeMs: timelineContext.elementEndMs,
      },
      timelineContext.playheadMs,
    );

    if (distance > config.bufferThresholdMs) {
      // Element is too far from playhead, skip buffering
      return currentState;
    }
  }

  const rendition = await deps.getRendition();
  if (!rendition) {
    // Cannot buffer without a rendition
    return currentState;
  }
  const endTimeMs = seekTimeMs + config.bufferDurationMs;

  const desiredSegments = await computeSegmentRangeAsync(
    seekTimeMs,
    endTimeMs,
    durationMs,
    rendition,
    deps.computeSegmentId,
  );
  // Filter out segments already cached by BaseMediaEngine
  const uncachedSegments = desiredSegments.filter(
    (segmentId) => !deps.isSegmentCached(segmentId, rendition),
  );

  const newQueue = computeBufferQueue(
    uncachedSegments,
    currentState.requestedSegments,
  );

  // Shared state for concurrency control - prevents race conditions
  const newRequestedSegments = new Set(currentState.requestedSegments);
  const newActiveRequests = new Set(currentState.activeRequests);
  const remainingQueue = [...newQueue];

  // Thread-safe function to start next segment when slot becomes available
  const startNextSegment = (): void => {
    // Check if we have capacity and segments to fetch
    if (
      newActiveRequests.size >= config.maxParallelFetches ||
      remainingQueue.length === 0 ||
      signal.aborted
    ) {
      return;
    }

    const nextSegmentId = remainingQueue.shift();
    if (nextSegmentId === undefined) return;

    // Skip if already requested or now cached
    if (
      newRequestedSegments.has(nextSegmentId) ||
      deps.isSegmentCached(nextSegmentId, rendition)
    ) {
      startNextSegment(); // Try next segment immediately
      return;
    }

    newRequestedSegments.add(nextSegmentId);
    newActiveRequests.add(nextSegmentId);

    // Start the prefetch request
    deps
      .prefetchSegment(nextSegmentId, rendition)
      .then(() => {
        if (signal.aborted) return;
        newActiveRequests.delete(nextSegmentId);
        // Start next segment if continuous buffering is enabled
        if (config.enableContinuousBuffering ?? true) {
          startNextSegment();
        }
      })
      .catch((error) => {
        if (signal.aborted) return;
        newActiveRequests.delete(nextSegmentId);
        deps.logError(`Failed to prefetch segment ${nextSegmentId}`, error);
        // Continue even after error if continuous buffering is enabled
        if (config.enableContinuousBuffering ?? true) {
          startNextSegment();
        }
      });
  };

  // Start initial batch of requests up to maxParallelFetches limit
  const initialBatchSize = Math.min(config.maxParallelFetches, newQueue.length);
  for (let i = 0; i < initialBatchSize; i++) {
    startNextSegment();
  }

  const result = {
    currentSeekTimeMs: seekTimeMs,
    requestedSegments: newRequestedSegments,
    activeRequests: newActiveRequests,
    requestQueue: remainingQueue, // What's left in the queue
  };
  return result;
};
