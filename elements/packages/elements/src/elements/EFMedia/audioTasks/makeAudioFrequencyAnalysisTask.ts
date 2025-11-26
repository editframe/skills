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

export function makeAudioFrequencyAnalysisTask(element: EFMedia) {
  // Internal cache for this task instance (same as original #frequencyDataCache)
  const cache = new LRUCache<string, Uint8Array>(100);

  return new Task(element, {
    autoRun: EF_INTERACTIVE,
    onError: (error) => {
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

      const { fetchAudioSpanningTime: fetchAudioSpan } =
        await import("../shared/AudioSpanUtils.ts");
      const audioSpan = await fetchAudioSpan(element, fromMs, toMs, signal);

      if (!audioSpan || !audioSpan.blob) {
        console.warn("Frequency analysis skipped: no audio data available");
        return null;
      }

      // Decode the real audio data
      const tempAudioContext = new OfflineAudioContext(2, 48000, 48000);
      const arrayBuffer = await audioSpan.blob.arrayBuffer();
      const audioBuffer = await tempAudioContext.decodeAudioData(arrayBuffer);

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
    },
  });
}
