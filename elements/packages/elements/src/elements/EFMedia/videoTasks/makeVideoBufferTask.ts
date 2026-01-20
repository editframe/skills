import { Task } from "@lit/task";

import { EF_INTERACTIVE } from "../../../EF_INTERACTIVE";
import { EF_RENDERING } from "../../../EF_RENDERING";
import type { VideoRendition } from "../../../transcoding/types";
import type { EFVideo } from "../../EFVideo";
import { AssetMediaEngine } from "../AssetMediaEngine";
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

  // Capture task reference for use in onError
  let task: VideoBufferTask;

  task = new Task(host, {
    autoRun: EF_INTERACTIVE, // Make lazy - only run when element becomes timeline-active
    args: () => [host.desiredSeekTimeMs] as const,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete in onError.
      // This is called BEFORE reject(), so the handler is attached in time.
      task.taskComplete.catch(() => {});
      
      // Don't log AbortErrors - these are expected when tasks are cancelled
      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        ))
      ) {
        return;
      }
      // Don't log errors when there's no valid media source, file not found, or auth errors - these are expected
      if (error instanceof Error && (
        error.message === "No valid media source" ||
        error.message.includes("File not found") ||
        error.message.includes("is not valid JSON") ||
        error.message.includes("401") ||
        error.message.includes("UNAUTHORIZED") ||
        error.message.includes("Failed to fetch")
      )) {
        return;
      }
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

      // Check if media engine task has errored (no valid source) before attempting to use it
      if (host.mediaEngineTask.error) {
        return currentState;
      }

      // Get media engine to potentially override buffer configuration
      let mediaEngine;
      try {
        mediaEngine = await getLatestMediaEngine(host, signal);
      } catch (error) {
        // If media engine task failed (no valid source), return current state silently
        if (error instanceof Error && error.message === "No valid media source") {
          return currentState;
        }
        // Re-throw unexpected errors
        throw error;
      }

      // Return existing state if no valid media engine (no valid source)
      if (!mediaEngine) {
        return currentState;
      }

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
            if (!mediaEngine) return undefined;
            return mediaEngine.computeSegmentId(timeMs, rendition);
          },
          prefetchSegment: async (segmentId, rendition) => {
            // Trigger prefetch through BaseMediaEngine - let it handle caching
            try {
              const mediaEngine = await getLatestMediaEngine(host, signal);
              if (!mediaEngine) return;
              
              // Check if the segment exists in AssetMediaEngine data before prefetching
              // Scrub track uses trackId -1, which is handled specially, so skip check for that
              if (mediaEngine instanceof AssetMediaEngine && rendition.trackId !== -1) {
                const trackData = mediaEngine.data?.[rendition.trackId];
                if (!trackData?.segments || segmentId >= trackData.segments.length) {
                  // Segment doesn't exist in the data - don't prefetch
                  return;
                }
              }
              
              await mediaEngine.fetchMediaSegment(segmentId, rendition, signal);
            } catch (error) {
              // If segment doesn't exist or fetch fails (401, etc.), skip prefetch silently
              if (
                error instanceof Error &&
                (error.message.includes("Media segment not found") ||
                  error.message.includes("Track not found") ||
                  error.message.includes("Failed to fetch") ||
                  error.message.includes("401") ||
                  error.message.includes("UNAUTHORIZED") ||
                  error.message.includes("File not found"))
              ) {
                return;
              }
              throw error;
            }
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
            try {
              const mediaEngine = await getLatestMediaEngine(host, signal);
              if (!mediaEngine) {
                throw new Error("Video rendition not available");
              }
              return mediaEngine.getVideoRendition();
            } catch (error) {
              // If media engine task failed (no valid source), throw error for getRendition
              if (error instanceof Error && error.message === "No valid media source") {
                throw new Error("Video rendition not available");
              }
              throw error;
            }
          },
          logError: console.error,
        },
        timelineContext,
      );
    },
  });

  // CRITICAL: Attach .catch() handler IMMEDIATELY to prevent unhandled rejections.
  // This must be done synchronously after task creation, before any updates can trigger run().
  // When hostUpdate() triggers _performTask() -> run(), the rejection needs to already have a handler.
  task.taskComplete.catch(() => {});

  return task;
};
