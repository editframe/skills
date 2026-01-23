import { Task } from "@lit/task";
import { EF_INTERACTIVE } from "../../../EF_INTERACTIVE.js";
import { LRUCache } from "../../../utils/LRUCache.js";
import type { EFMedia } from "../../EFMedia.js";

// DECAY_WEIGHT constant - same as original
const DECAY_WEIGHT = 0.8;

function processFFTData(
  fftData: Uint8Array,
  zeroThresholdPercent = 0.1,
): Uint8Array {
  // Step 1: Determine the threshold for zeros
  const totalBins = fftData.length;
  const zeroThresholdCount = Math.floor(totalBins * zeroThresholdPercent);

  // Step 2: Interrogate the FFT output to find the cutoff point
  let zeroCount = 0;
  let cutoffIndex = totalBins; // Default to the end of the array

  for (let i = totalBins - 1; i >= 0; i--) {
    if (fftData[i] ?? 0 < 10) {
      zeroCount++;
    } else {
      // If we encounter a non-zero value, we can stop
      if (zeroCount >= zeroThresholdCount) {
        cutoffIndex = i + 1; // Include this index
        break;
      }
    }
  }

  if (cutoffIndex < zeroThresholdCount) {
    return fftData;
  }

  // Step 3: Resample the "good" portion of the data
  const goodData = fftData.slice(0, cutoffIndex);
  const resampledData = interpolateData(goodData, fftData.length);

  // Step 4: Attenuate the top 10% of interpolated samples
  const attenuationStartIndex = Math.floor(totalBins * 0.9);
  for (let i = attenuationStartIndex; i < totalBins; i++) {
    // Calculate attenuation factor that goes from 1 to 0 over the top 10%
    const attenuationProgress =
      (i - attenuationStartIndex) / (totalBins - attenuationStartIndex) + 0.2;
    const attenuationFactor = Math.max(0, 1 - attenuationProgress);
    resampledData[i] = Math.floor((resampledData[i] ?? 0) * attenuationFactor);
  }

  return resampledData;
}

function interpolateData(data: Uint8Array, targetSize: number): Uint8Array {
  const resampled = new Uint8Array(targetSize);
  const dataLength = data.length;

  for (let i = 0; i < targetSize; i++) {
    // Calculate the corresponding index in the original data
    const ratio = (i / (targetSize - 1)) * (dataLength - 1);
    const index = Math.floor(ratio);
    const fraction = ratio - index;

    // Handle edge cases
    if (index >= dataLength - 1) {
      resampled[i] = data[dataLength - 1] ?? 0; // Last value
    } else {
      // Linear interpolation
      resampled[i] = Math.round(
        (data[index] ?? 0) * (1 - fraction) + (data[index + 1] ?? 0) * fraction,
      );
    }
  }

  return resampled;
}

export function makeAudioFrequencyAnalysisTask(element: EFMedia): Task<readonly [number], Uint8Array> {
  // Internal cache for this task instance (same as original #frequencyDataCache)
  const cache = new LRUCache<string, Uint8Array>(100);

  // Capture task reference for use in onError
  let task: Task<readonly [number], Uint8Array>;

  task = new Task(element, {
    autoRun: EF_INTERACTIVE,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // This prevents unhandled rejection when hostUpdate() triggers _performTask() without awaiting.
      task.taskComplete.catch(() => {});
      
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
      console.error("frequencyDataTask error", error);
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
      const cachedSmoothedData = cache.get(preliminaryCacheKey);
      if (cachedSmoothedData) {
        return cachedSmoothedData;
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

      const framesData = await Promise.all(
        Array.from({ length: element.fftDecay }, async (_, i) => {
          const frameOffset = i * (1000 / 30);
          const startTime = Math.max(
            0,
            (currentTimeMs - frameOffset - startOffsetMs) / 1000,
          );

          // Cache key for this specific frame
          const cacheKey = `${element.shouldInterpolateFrequencies}:${element.fftSize}:${element.fftGain}:${startOffsetMs}:${startTime}`;

          // Check cache for this specific frame
          const cachedFrame = cache.get(cacheKey);
          if (cachedFrame) {
            return cachedFrame;
          }

          // Running 48000 * (1 / 30) = 1600 broke something terrible, it came out as 0,
          // I'm assuming weird floating point nonsense to do with running on rosetta
          const SIZE = 48000 / 30;
          let audioContext: OfflineAudioContext;
          try {
            audioContext = new OfflineAudioContext(2, SIZE, 48000);
          } catch (error) {
            throw new Error(
              `[EFMedia.frequencyDataTask] Failed to create OfflineAudioContext(2, ${SIZE}, 48000) for frame ${i} at time ${startTime}s: ${error instanceof Error ? error.message : String(error)}. This is for audio frequency analysis.`,
            );
          }
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = element.fftSize;
          analyser.minDecibels = -90;
          analyser.maxDecibels = -10;

          const gainNode = audioContext.createGain();
          gainNode.gain.value = element.fftGain;

          const filter = audioContext.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 15000;
          filter.Q.value = 0.05;

          const audioBufferSource = audioContext.createBufferSource();
          audioBufferSource.buffer = audioBuffer;

          audioBufferSource.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(analyser);
          analyser.connect(audioContext.destination);

          audioBufferSource.start(0, startTime, 1 / 30);

          try {
            await audioContext.startRendering();
            
            // Check for abort after expensive rendering operation
            signal?.throwIfAborted();
            
            const frameData = new Uint8Array(element.fftSize / 2);
            analyser.getByteFrequencyData(frameData);

            // Cache this frame's analysis
            cache.set(cacheKey, frameData);
            return frameData;
          } finally {
            audioBufferSource.disconnect();
            analyser.disconnect();
          }
        }),
      );

      const frameLength = framesData[0]?.length ?? 0;

      // Combine frames with decay
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

      // Apply frequency weights using instance FREQ_WEIGHTS
      smoothedData.forEach((value, i) => {
        const freqWeight = element.FREQ_WEIGHTS[i] ?? 0;
        smoothedData[i] = Math.min(255, Math.round(value * freqWeight));
      });

      // Only return the lower half of the frequency data
      // The top half is zeroed out, which makes for aesthetically unpleasing waveforms
      const slicedData = smoothedData.slice(
        0,
        Math.floor(smoothedData.length / 2),
      );
      const processedData = element.shouldInterpolateFrequencies
        ? processFFTData(slicedData)
        : slicedData;
        // Cache with the preliminary key so future requests can skip audio fetching
        cache.set(preliminaryCacheKey, processedData);
        return processedData;
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
