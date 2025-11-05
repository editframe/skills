import { Task } from "@lit/task";

import { EF_INTERACTIVE } from "../../../EF_INTERACTIVE";
import { EF_RENDERING } from "../../../EF_RENDERING";
import type { VideoRendition } from "../../../transcoding/types";
import type { EFVideo } from "../../EFVideo";
import {
  type MediaBufferConfig,
  type MediaBufferState,
  manageMediaBuffer,
} from "../shared/BufferUtils";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

/**
 * Configuration for video buffering - extends the generic interface
 */
export interface VideoBufferConfig extends MediaBufferConfig {}

/**
 * State of the video buffer - uses the generic interface
 */
export interface VideoBufferState extends MediaBufferState {}

type VideoBufferTask = Task<readonly [number], VideoBufferState>;
export const makeVideoBufferTask = (host: EFVideo): VideoBufferTask => {
  let currentState: VideoBufferState = {
    currentSeekTimeMs: 0,
    requestedSegments: new Set(),
    activeRequests: new Set(),
    requestQueue: [],
  };

  return new Task(host, {
    autoRun: EF_INTERACTIVE, // Make lazy - only run when element becomes timeline-active
    args: () => [host.desiredSeekTimeMs] as const,
    onError: (error) => {
      console.error("videoBufferTask error", error);
    },
    onComplete: (value) => {
      currentState = value;
    },
    task: async ([seekTimeMs], { signal }) => {
      // Skip buffering entirely in rendering mode
      if (EF_RENDERING()) {
        return currentState; // Return existing state without any buffering activity
      }

      // Get media engine to potentially override buffer configuration
      const mediaEngine = await getLatestMediaEngine(host, signal);

      // Use media engine's buffer config, falling back to host properties
      const engineConfig = mediaEngine.getBufferConfig();
      const bufferDurationMs = engineConfig.videoBufferDurationMs;
      const maxParallelFetches = engineConfig.maxVideoBufferFetches;

      const currentConfig: VideoBufferConfig = {
        bufferDurationMs,
        maxParallelFetches,
        enableBuffering: host.enableVideoBuffering,
        bufferThresholdMs: engineConfig.bufferThresholdMs,
      };

      // Timeline context for priority-based buffering
      const timelineContext =
        host.rootTimegroup?.currentTimeMs !== undefined
          ? {
              elementStartMs: host.startTimeMs,
              elementEndMs: host.endTimeMs,
              playheadMs: host.rootTimegroup.currentTimeMs,
            }
          : undefined;

      return manageMediaBuffer<VideoRendition>(
        seekTimeMs,
        currentConfig,
        currentState,
        (host as any).intrinsicDurationMs || 10000,
        signal,
        {
          computeSegmentId: async (timeMs, rendition) => {
            // Use media engine's computeSegmentId
            const mediaEngine = await getLatestMediaEngine(host, signal);
            return mediaEngine.computeSegmentId(timeMs, rendition);
          },
          prefetchSegment: async (segmentId, rendition) => {
            // Trigger prefetch through BaseMediaEngine - let it handle caching
            const mediaEngine = await getLatestMediaEngine(host, signal);
            await mediaEngine.fetchMediaSegment(segmentId, rendition);
            // Don't return data - just ensure it's cached in BaseMediaEngine
          },
          isSegmentCached: (segmentId, rendition) => {
            // Check if segment is already cached in BaseMediaEngine
            const mediaEngine = host.mediaEngineTask.value;
            if (!mediaEngine) return false;

            return mediaEngine.isSegmentCached(segmentId, rendition);
          },
          getRendition: async () => {
            // Get real video rendition from media engine
            const mediaEngine = await getLatestMediaEngine(host, signal);
            return mediaEngine.getVideoRendition();
          },
          logError: console.error,
        },
        timelineContext,
      );
    },
  });
};
