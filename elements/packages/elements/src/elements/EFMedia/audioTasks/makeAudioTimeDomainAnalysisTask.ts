import { Task } from "@lit/task";

import { EF_INTERACTIVE } from "../../../EF_INTERACTIVE.js";
import { LRUCache } from "../../../utils/LRUCache.js";
import { type EFMedia, IgnorableError } from "../../EFMedia.js";

// DECAY_WEIGHT constant - same as original
const DECAY_WEIGHT = 0.8;

export function makeAudioTimeDomainAnalysisTask(element: EFMedia): Task<EFMedia, readonly [number], Uint8Array> {
  // Internal cache for this task instance (same as original #byteTimeDomainCache)
  const cache = new LRUCache<string, Uint8Array>(1000);

  // Capture task reference for use in onError
  let task: Task<EFMedia, readonly [number], Uint8Array>;

  task = new Task(element, {
    autoRun: EF_INTERACTIVE,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // This prevents unhandled rejection when hostUpdate() triggers _performTask() without awaiting.
      task.taskComplete.catch(() => {});
      
      if (error instanceof IgnorableError) {
        console.info("byteTimeDomainTask skipped: no audio track");
        return;
      }
      
      // Don't log AbortErrors - these are expected when tasks are cancelled
      const isAbortError = 
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        ));
      
      if (isAbortError) {
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
      console.error("byteTimeDomainTask error", error);
    },
    args: () =>
      [
        element.currentSourceTimeMs,
        element.fftSize,
        element.fftDecay,
        element.fftGain,
        element.shouldInterpolateFrequencies,
      ] as const,
    task: async (_, { signal }) => {
      if (element.currentSourceTimeMs < 0) return null;

      const currentTimeMs = element.currentSourceTimeMs;

      // Calculate exact audio window needed based on fftDecay and frame timing
      const frameIntervalMs = 1000 / 30; // 33.33ms per frame

      // Need audio from earliest frame to current frame
      const earliestFrameMs =
        currentTimeMs - (element.fftDecay - 1) * frameIntervalMs;
      const fromMs = Math.max(0, earliestFrameMs);
      const maxToMs = currentTimeMs + frameIntervalMs; // Include current frame
      const videoDurationMs = element.intrinsicDurationMs || 0;
      const toMs =
        videoDurationMs > 0 ? Math.min(maxToMs, videoDurationMs) : maxToMs;

      // If the clamping results in an invalid range (seeking beyond the end), skip analysis silently
      if (fromMs >= toMs) {
        return null;
      }

      // Check cache early - before expensive audio fetching
      // Use a preliminary cache key that doesn't depend on actual startOffsetMs from audio span
      const preliminaryCacheKey = `${element.shouldInterpolateFrequencies}:${element.fftSize}:${element.fftDecay}:${element.fftGain}:${fromMs}:${currentTimeMs}`;
      const cachedData = cache.get(preliminaryCacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Check if media engine task has errored (no valid source) before attempting to use it
      if (element.mediaEngineTask.error) {
        return null;
      }
      
      // Check if audio rendition exists before attempting to fetch audio data
      // This prevents unnecessary HTTP requests and warnings when audio is not available
      let mediaEngine;
      try {
        mediaEngine = await element.mediaEngineTask.taskComplete;
      } catch (error) {
        // If media engine task failed (no valid source), return null silently
        if (error instanceof Error && error.message === "No valid media source") {
          return null;
        }
        // Re-throw unexpected errors
        throw error;
      }
      
      // Check for abort after awaiting media engine
      signal?.throwIfAborted();
      
      if (!mediaEngine?.audioRendition) {
        // No audio rendition available - skip silently (no warning needed)
        return null;
      }

      // Check if audioInputTask has errored or returned undefined before fetching
      // This prevents fetch calls when we know they'll fail (e.g., 401 auth required)
      if (element.audioInputTask.error) {
        return null;
      }
      const audioInputValue = element.audioInputTask.value;
      if (audioInputValue === undefined) {
        // Audio input is not available - don't try to fetch
        return null;
      }

      const { fetchAudioSpanningTime: fetchAudioSpan } =
        await import("../shared/AudioSpanUtils.js");
      
      // Try to fetch audio span, but return null if it fails with expected errors
      try {
        const audioSpan = await fetchAudioSpan(element, fromMs, toMs, signal);

        if (!audioSpan || !audioSpan.blob) {
          // Audio data not available - skip silently (already checked for rendition above)
          return null;
        }

        // Validate blob has sufficient data before attempting decode
        // Empty or very small blobs will fail decodeAudioData
        if (audioSpan.blob.size < 100) {
          // Too small to be valid audio data - skip silently
          return null;
        }

        // Decode the real audio data
        const tempAudioContext = new OfflineAudioContext(2, 48000, 48000);
        const arrayBuffer = await audioSpan.blob.arrayBuffer();
        
        // Check for abort after expensive arrayBuffer operation
        signal?.throwIfAborted();
        
        // Validate arrayBuffer before decode attempt
        if (arrayBuffer.byteLength < 100) {
          return null;
        }
        
        let audioBuffer;
        try {
          audioBuffer = await tempAudioContext.decodeAudioData(arrayBuffer);
          
          // Check for abort after expensive decode operation
          signal?.throwIfAborted();
        } catch (decodeError) {
          // Unable to decode audio data - this means the data isn't valid audio
          // This can happen with corrupted/incomplete segments - skip silently
          if (decodeError instanceof Error && 
              decodeError.message.includes("Unable to decode audio data")) {
            return null;
          }
          throw decodeError;
        }

      // Use actual startOffset from audioSpan (relative to requested time)
      const startOffsetMs = audioSpan.startMs;

      // Process multiple frames with decay, similar to the reference code
      const framesData = await Promise.all(
        Array.from({ length: element.fftDecay }, async (_, frameIndex) => {
          const frameOffset = frameIndex * (1000 / 30);
          const startTime = Math.max(
            0,
            (currentTimeMs - frameOffset - startOffsetMs) / 1000,
          );

          const cacheKey = `${element.shouldInterpolateFrequencies}:${element.fftSize}:${element.fftGain}:${startOffsetMs}:${startTime}`;
          const cachedFrame = cache.get(cacheKey);
          if (cachedFrame) {
            return cachedFrame;
          }

          let audioContext: OfflineAudioContext;
          try {
            audioContext = new OfflineAudioContext(2, 48000 * (1 / 30), 48000);
          } catch (error) {
            throw new Error(
              `[EFMedia.byteTimeDomainTask] Failed to create OfflineAudioContext(2, ${48000 * (1 / 30)}, 48000) for frame ${frameIndex} at time ${startTime}s: ${error instanceof Error ? error.message : String(error)}. This is for audio time domain analysis.`,
            );
          }

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;

          // Create analyzer for PCM data
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = element.fftSize; // Ensure enough samples
          analyser.minDecibels = -90;
          analyser.maxDecibels = -20;

          const gainNode = audioContext.createGain();
          gainNode.gain.value = element.fftGain; // Amplify the signal

          source.connect(gainNode);
          gainNode.connect(analyser);
          analyser.connect(audioContext.destination);

          source.start(0, startTime, 1 / 30);

          const dataLength = analyser.fftSize / 2;
          try {
            await audioContext.startRendering();
            
            // Check for abort after expensive rendering operation
            signal?.throwIfAborted();
            
            const frameData = new Uint8Array(dataLength);
            analyser.getByteTimeDomainData(frameData);

            // const points = frameData;
            // Calculate RMS and midpoint values
            const points = new Uint8Array(dataLength);
            for (let i = 0; i < dataLength; i++) {
              const pointSamples = frameData.slice(
                i * (frameData.length / dataLength),
                (i + 1) * (frameData.length / dataLength),
              );

              // Calculate RMS while preserving sign
              const rms = Math.sqrt(
                pointSamples.reduce((sum, sample) => {
                  const normalized = (sample - 128) / 128;
                  return sum + normalized * normalized;
                }, 0) / pointSamples.length,
              );

              // Get average sign of the samples to determine direction
              const avgSign = Math.sign(
                pointSamples.reduce((sum, sample) => sum + (sample - 128), 0),
              );

              // Convert RMS back to byte range, preserving direction
              points[i] = Math.min(255, Math.round(128 + avgSign * rms * 128));
            }

            cache.set(cacheKey, points);
            return points;
          } finally {
            source.disconnect();
            analyser.disconnect();
          }
        }),
      );

      // Combine frames with decay weighting
      const frameLength = framesData[0]?.length ?? 0;
      const smoothedData = new Uint8Array(frameLength);

      for (let i = 0; i < frameLength; i++) {
        let weightedSum = 0;
        let weightSum = 0;

        framesData.forEach((frame: Uint8Array, frameIndex: number) => {
          const decayWeight = DECAY_WEIGHT ** frameIndex;
          weightedSum += (frame[i] ?? 0) * decayWeight;
          weightSum += decayWeight;
        });

        smoothedData[i] = Math.min(255, Math.round(weightedSum / weightSum));
      }

        // Cache with the preliminary key so future requests can skip audio fetching
        cache.set(preliminaryCacheKey, smoothedData);
        return smoothedData;
      } catch (error) {
        // If aborted, re-throw to propagate cancellation
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        // If fetch fails with expected errors (401, missing segments, etc.), return null gracefully
        if (
          error instanceof Error &&
          (error.message.includes("401") ||
            error.message.includes("UNAUTHORIZED") ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("File not found") ||
            error.message.includes("Media segment not found") ||
            error.message.includes("No segments found"))
        ) {
          return null;
        }
        // Re-throw unexpected errors
        throw error;
      }
    },
  });

  return task;
}
