import { Task } from "@lit/task";

import { EF_INTERACTIVE } from "../../../EF_INTERACTIVE";
import { EF_RENDERING } from "../../../EF_RENDERING";
import type { AudioRendition } from "../../../transcoding/types";
import type { EFMedia } from "../../EFMedia";
import { AssetMediaEngine } from "../AssetMediaEngine";
import {
  type MediaBufferConfig,
  type MediaBufferState,
  manageMediaBuffer,
} from "../shared/BufferUtils";
import { getLatestMediaEngine } from "../tasks/makeMediaEngineTask";

/**
 * Configuration for audio buffering - extends the generic interface
 */
export interface AudioBufferConfig extends MediaBufferConfig {}

/**
 * State of the audio buffer - uses the generic interface
 */
export interface AudioBufferState extends MediaBufferState {}

type AudioBufferTask = Task<readonly [number], AudioBufferState>;
export const makeAudioBufferTask = (host: EFMedia): AudioBufferTask => {
  let currentState: AudioBufferState = {
    currentSeekTimeMs: 0,
    requestedSegments: new Set(),
    activeRequests: new Set(),
    requestQueue: [],
  };

  return new Task(host, {
    autoRun: EF_INTERACTIVE, // Make lazy - only run when element becomes timeline-active
    args: () => [host.desiredSeekTimeMs] as const,
    onError: (error) => {
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
      console.error("audioBufferTask error", error);
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

      // Return existing state if no audio rendition available
      if (!mediaEngine.audioRendition) {
        return currentState;
      }

      // Use media engine's buffer config, falling back to host properties
      const engineConfig = mediaEngine.getBufferConfig();
      const bufferDurationMs = engineConfig.audioBufferDurationMs;
      const maxParallelFetches = engineConfig.maxAudioBufferFetches;

      const currentConfig: AudioBufferConfig = {
        bufferDurationMs,
        maxParallelFetches,
        enableBuffering: host.enableAudioBuffering,
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

      return manageMediaBuffer<AudioRendition>(
        seekTimeMs,
        currentConfig,
        currentState,
        (host as any).intrinsicDurationMs || 10000,
        signal,
        {
          computeSegmentId: async (timeMs, rendition) => {
            // Use media engine's computeSegmentId
            try {
              const mediaEngine = await getLatestMediaEngine(host, signal);
              return mediaEngine.computeSegmentId(timeMs, rendition);
            } catch (error) {
              // If media engine task failed (no valid source), return undefined
              if (error instanceof Error && error.message === "No valid media source") {
                return undefined;
              }
              throw error;
            }
          },
          prefetchSegment: async (segmentId, rendition) => {
            // Trigger prefetch through BaseMediaEngine - let it handle caching
            try {
              const mediaEngine = await getLatestMediaEngine(host, signal);
              
              // Check if the segment exists in AssetMediaEngine data before prefetching
              if (mediaEngine instanceof AssetMediaEngine) {
                const trackData = mediaEngine.data?.[rendition.trackId];
                if (!trackData?.segments || segmentId >= trackData.segments.length) {
                  // Segment doesn't exist in the data - don't prefetch
                  return;
                }
              }
              
              await mediaEngine.fetchMediaSegment(segmentId, rendition);
            } catch (error) {
              // If media engine task failed, segment doesn't exist, or fetch fails (401, etc.), skip prefetch silently
              if (
                error instanceof Error &&
                (error.message === "No valid media source" ||
                  error.message.includes("Media segment not found") ||
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
            try {
              const mediaEngine = await getLatestMediaEngine(host, signal);
              const audioRendition = mediaEngine.audioRendition;
              if (!audioRendition) {
                throw new Error("Audio rendition not available");
              }
              return audioRendition;
            } catch (error) {
              // If media engine task failed (no valid source), throw error for getRendition
              if (error instanceof Error && error.message === "No valid media source") {
                throw new Error("Audio rendition not available");
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
};
