/**
 * Waveform extraction utilities for DAW-style audio visualization.
 *
 * Extracts min/max peak pairs from audio data at a given resolution.
 * Designed for timeline visualization where we need to see amplitude
 * overview across the entire audio duration.
 */

import type { EFMedia } from "../../../elements/EFMedia.js";

/** Samples per second for waveform data - balances resolution vs. data size */
export const WAVEFORM_SAMPLES_PER_SECOND = 100;

/** Waveform peak data: alternating min/max values normalized to [-1, 1] */
export interface WaveformData {
  /** Peak data: [min0, max0, min1, max1, ...] normalized to [-1, 1] */
  peaks: Float32Array;
  /** Duration of the audio in milliseconds */
  durationMs: number;
  /** Samples per second (for interpreting peaks array) */
  samplesPerSecond: number;
}

/** Simple cache for waveform data keyed by audio URL */
const waveformCache = new Map<string, WaveformData>();

/**
 * Extract waveform peak data from a media element.
 * Fetches audio through the media engine's transcoding pipeline,
 * then decodes with Web Audio API.
 * Results are cached by src URL.
 */
export async function extractWaveformData(
  element: EFMedia,
  signal?: AbortSignal,
): Promise<WaveformData | null> {
  const src = element.src;
  if (!src) return null;

  const cached = waveformCache.get(src);
  if (cached) {
    return cached;
  }

  try {
    const mediaEngine = await element.getMediaEngine(signal);
    signal?.throwIfAborted();

    if (!mediaEngine?.tracks.audio) {
      return null;
    }

    const durationMs = mediaEngine.durationMs;
    if (!durationMs || durationMs <= 0) {
      return null;
    }

    const abortSignal = signal ?? new AbortController().signal;
    const audioSpan = await element.fetchAudioSpanningTime(
      0,
      durationMs,
      abortSignal,
    );
    signal?.throwIfAborted();

    if (!audioSpan) {
      return null;
    }

    const arrayBuffer = await audioSpan.blob.arrayBuffer();
    signal?.throwIfAborted();

    // Decode audio data
    const audioContext = new OfflineAudioContext(1, 1, 44100);
    let audioBuffer: AudioBuffer;

    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (decodeError) {
      console.warn("Failed to decode audio for waveform:", decodeError);
      return null;
    }

    signal?.throwIfAborted();

    // Extract peaks from the decoded audio
    const peaks = extractPeaksFromBuffer(
      audioBuffer,
      WAVEFORM_SAMPLES_PER_SECOND,
    );
    const decodedDurationMs = audioBuffer.duration * 1000;

    const waveformData: WaveformData = {
      peaks,
      durationMs: decodedDurationMs,
      samplesPerSecond: WAVEFORM_SAMPLES_PER_SECOND,
    };

    waveformCache.set(src, waveformData);

    return waveformData;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    console.warn("Error extracting waveform data:", error);
    return null;
  }
}

/**
 * Extract min/max peaks from an AudioBuffer.
 * Returns Float32Array with alternating [min, max, min, max, ...] values.
 */
function extractPeaksFromBuffer(
  buffer: AudioBuffer,
  samplesPerSecond: number,
): Float32Array {
  const channelData = buffer.getChannelData(0); // Use first channel
  const sampleRate = buffer.sampleRate;
  const duration = buffer.duration;

  // Calculate how many samples to output
  const outputSamples = Math.ceil(duration * samplesPerSecond);

  // Each output sample has min and max
  const peaks = new Float32Array(outputSamples * 2);

  // Samples per output window
  const samplesPerWindow = Math.floor(sampleRate / samplesPerSecond);

  for (let i = 0; i < outputSamples; i++) {
    const startSample = i * samplesPerWindow;
    const endSample = Math.min(
      startSample + samplesPerWindow,
      channelData.length,
    );

    let min = 0;
    let max = 0;

    for (let j = startSample; j < endSample; j++) {
      const sample = channelData[j] ?? 0;
      if (sample < min) min = sample;
      if (sample > max) max = sample;
    }

    // Store as alternating min/max pairs
    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }

  return peaks;
}

/**
 * Render waveform data to a canvas context.
 * Draws a filled waveform path centered vertically.
 */
export function renderWaveformToCanvas(
  ctx: CanvasRenderingContext2D,
  waveformData: WaveformData,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  startMs: number = 0,
  endMs?: number,
): void {
  const { peaks, durationMs, samplesPerSecond } = waveformData;
  const actualEndMs = endMs ?? durationMs;

  // Calculate which samples to render
  const startSample = Math.floor((startMs / 1000) * samplesPerSecond);
  const endSample = Math.ceil((actualEndMs / 1000) * samplesPerSecond);
  const sampleCount = endSample - startSample;

  if (sampleCount <= 0) return;

  const centerY = y + height / 2;
  const halfHeight = height / 2;
  const pixelsPerSample = width / sampleCount;

  ctx.fillStyle = color;
  ctx.beginPath();

  // Draw top half (max values) left to right
  for (let i = 0; i < sampleCount; i++) {
    const sampleIndex = startSample + i;
    const peakIndex = sampleIndex * 2;
    const maxValue = peaks[peakIndex + 1] ?? 0;

    const px = x + i * pixelsPerSample;
    const py = centerY - maxValue * halfHeight;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  // Draw bottom half (min values) right to left
  for (let i = sampleCount - 1; i >= 0; i--) {
    const sampleIndex = startSample + i;
    const peakIndex = sampleIndex * 2;
    const minValue = peaks[peakIndex] ?? 0;

    const px = x + i * pixelsPerSample;
    const py = centerY - minValue * halfHeight;

    ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Clear waveform cache (useful for testing or memory management)
 */
export function clearWaveformCache(): void {
  waveformCache.clear();
}
