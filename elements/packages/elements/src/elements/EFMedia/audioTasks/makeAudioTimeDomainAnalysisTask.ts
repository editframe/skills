import { Task } from "@lit/task";

import { EF_INTERACTIVE } from "../../../EF_INTERACTIVE.js";
import { LRUCache } from "../../../utils/LRUCache.js";
import { type EFMedia, IgnorableError } from "../../EFMedia.js";

// DECAY_WEIGHT constant - same as original
const DECAY_WEIGHT = 0.8;

export function makeAudioTimeDomainAnalysisTask(element: EFMedia) {
  // Internal cache for this task instance (same as original #byteTimeDomainCache)
  const cache = new LRUCache<string, Uint8Array>(1000);

  return new Task(element, {
    autoRun: EF_INTERACTIVE,
    onError: (error) => {
      if (error instanceof IgnorableError) {
        console.info("byteTimeDomainTask skipped: no audio track");
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

      const { fetchAudioSpanningTime: fetchAudioSpan } =
        await import("../shared/AudioSpanUtils.ts");
      const audioSpan = await fetchAudioSpan(element, fromMs, toMs, signal);

      if (!audioSpan || !audioSpan.blob) {
        console.warn("Time domain analysis skipped: no audio data available");
        return null;
      }

      // Decode the real audio data
      const tempAudioContext = new OfflineAudioContext(2, 48000, 48000);
      const arrayBuffer = await audioSpan.blob.arrayBuffer();
      const audioBuffer = await tempAudioContext.decodeAudioData(arrayBuffer);

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
    },
  });
}
