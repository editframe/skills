import type { AudioSample, VideoSample } from "mediabunny";
import { roundToMilliseconds } from "./EFMedia/shared/PrecisionUtils";
export type MediaSample = VideoSample | AudioSample;

// Generic sample buffer that works with both VideoSample and AudioSample
export class SampleBuffer {
  private buffer: MediaSample[] = [];
  private bufferSize: number;

  constructor(bufferSize = 10) {
    this.bufferSize = bufferSize;
  }

  push(sample: MediaSample) {
    // Defensive copy to avoid concurrent modification during iteration
    const currentBuffer = [...this.buffer];
    currentBuffer.push(sample);

    if (currentBuffer.length > this.bufferSize) {
      const shifted = currentBuffer.shift();
      if (shifted) {
        try {
          shifted.close();
        } catch (_error) {
          // Sample already closed, continue
        }
      }
    }

    // Update buffer atomically
    this.buffer = currentBuffer;
  }

  clear() {
    // Get current buffer and clear atomically
    const toClose = this.buffer;
    this.buffer = [];

    // Close samples after clearing to avoid holding references
    for (const sample of toClose) {
      try {
        sample.close();
      } catch (_error) {
        // Sample already closed, continue
      }
    }
  }

  peek(): MediaSample | undefined {
    // Defensive read - get current buffer state
    const currentBuffer = this.buffer;
    return currentBuffer[0];
  }

  find(desiredSeekTimeMs: number): MediaSample | undefined {
    const currentBuffer = [...this.buffer];

    if (currentBuffer.length === 0) return undefined;

    // Use consistent precision handling across the entire pipeline
    const targetTimeMs = roundToMilliseconds(desiredSeekTimeMs);

    // Find the sample that contains the target time
    for (const sample of currentBuffer) {
      const sampleStartMs = roundToMilliseconds((sample.timestamp || 0) * 1000);
      const sampleDurationMs = roundToMilliseconds(
        (sample.duration || 0) * 1000,
      );
      const sampleEndMs = roundToMilliseconds(sampleStartMs + sampleDurationMs);

      // Check if the desired time falls within this sample's time span [start, end], inclusive of end
      if (targetTimeMs >= sampleStartMs && targetTimeMs < sampleEndMs) {
        return sample;
      }
    }

    return undefined; // No sample contains the target time
  }

  get length() {
    return this.buffer.length;
  }

  get firstTimestamp() {
    // Defensive read - get current buffer state
    const currentBuffer = this.buffer;
    return currentBuffer[0]?.timestamp || 0;
  }

  getContents(): MediaSample[] {
    // Defensive copy to avoid concurrent modification during iteration
    return [...this.buffer];
  }
}
