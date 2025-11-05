import {
  AudioSampleSink,
  BufferSource,
  Input,
  InputAudioTrack,
  type InputTrack,
  InputVideoTrack,
  MP4,
  VideoSampleSink,
} from "mediabunny";
import { withSpan } from "../../otel/tracingHelpers.js";
import { type MediaSample, SampleBuffer } from "../SampleBuffer";
import { roundToMilliseconds } from "./shared/PrecisionUtils";

interface BufferedSeekingInputOptions {
  videoBufferSize?: number;
  audioBufferSize?: number;
  /**
   * Timeline offset in milliseconds to map user timeline to media timeline.
   * Applied during seeking to handle media that doesn't start at 0ms.
   */
  startTimeOffsetMs?: number;
}

const defaultOptions: BufferedSeekingInputOptions = {
  videoBufferSize: 30,
  audioBufferSize: 100,
  startTimeOffsetMs: 0,
};

export class NoSample extends RangeError {}

export class ConcurrentSeekError extends RangeError {}

export class BufferedSeekingInput {
  private input: Input;
  private trackIterators: Map<number, AsyncIterator<MediaSample>> = new Map();
  private trackBuffers: Map<number, SampleBuffer> = new Map();
  private options: BufferedSeekingInputOptions;
  // Separate locks for different operation types to prevent unnecessary blocking
  private trackIteratorCreationPromises: Map<number, Promise<any>> = new Map();
  private trackSeekPromises: Map<number, Promise<any>> = new Map();

  /**
   * Timeline offset in milliseconds to map user timeline to media timeline.
   * Applied during seeking to handle media that doesn't start at 0ms.
   */
  private readonly startTimeOffsetMs: number;

  constructor(arrayBuffer: ArrayBuffer, options?: BufferedSeekingInputOptions) {
    const bufferSource = new BufferSource(arrayBuffer);
    const input = new Input({
      source: bufferSource,
      formats: [MP4],
    });
    this.input = input;
    this.options = { ...defaultOptions, ...options };
    this.startTimeOffsetMs = this.options.startTimeOffsetMs ?? 0;
  }

  // Buffer inspection API for testing
  getBufferSize(trackId: number): number {
    const buffer = this.trackBuffers.get(trackId);
    return buffer ? buffer.length : 0;
  }

  getBufferContents(trackId: number): readonly MediaSample[] {
    const buffer = this.trackBuffers.get(trackId);
    return buffer ? Object.freeze([...buffer.getContents()]) : [];
  }

  getBufferTimestamps(trackId: number): number[] {
    const contents = this.getBufferContents(trackId);
    return contents.map((sample) => sample.timestamp || 0);
  }

  clearBuffer(trackId: number): void {
    const buffer = this.trackBuffers.get(trackId);
    if (buffer) {
      buffer.clear();
    }
  }

  computeDuration() {
    return this.input.computeDuration();
  }

  async getTrack(trackId: number) {
    const tracks = await this.input.getTracks();
    const track = tracks.find((track) => track.id === trackId);
    if (!track) {
      throw new Error(`Track ${trackId} not found`);
    }
    return track;
  }

  async getAudioTrack(trackId: number) {
    const tracks = await this.input.getAudioTracks();
    const track = tracks.find(
      (track) => track.id === trackId && track.type === "audio",
    );
    if (!track) {
      throw new Error(`Track ${trackId} not found`);
    }
    return track;
  }

  async getVideoTrack(trackId: number) {
    const tracks = await this.input.getVideoTracks();
    const track = tracks.find(
      (track) => track.id === trackId && track.type === "video",
    );
    if (!track) {
      throw new Error(`Track ${trackId} not found`);
    }
    return track;
  }

  async getFirstVideoTrack() {
    const tracks = await this.input.getVideoTracks();
    return tracks[0];
  }

  async getFirstAudioTrack() {
    const tracks = await this.input.getAudioTracks();
    return tracks[0];
  }

  getTrackIterator(track: InputTrack) {
    if (this.trackIterators.has(track.id)) {
      // biome-ignore lint/style/noNonNullAssertion: we know the map has the key
      return this.trackIterators.get(track.id)!;
    }

    const trackIterator = this.createTrackIterator(track);

    this.trackIterators.set(track.id, trackIterator);

    return trackIterator;
  }

  createTrackSampleSink(track: InputTrack) {
    if (track instanceof InputAudioTrack) {
      return new AudioSampleSink(track);
    }
    if (track instanceof InputVideoTrack) {
      return new VideoSampleSink(track);
    }
    throw new Error(`Unsupported track type ${track.type}`);
  }

  createTrackIterator(track: InputTrack) {
    const sampleSink = this.createTrackSampleSink(track);
    return sampleSink.samples();
  }

  createTrackBuffer(track: InputTrack) {
    if (track.type === "audio") {
      const bufferSize = this.options.audioBufferSize;
      const sampleBuffer = new SampleBuffer(bufferSize);
      return sampleBuffer;
    }
    const bufferSize = this.options.videoBufferSize;
    const sampleBuffer = new SampleBuffer(bufferSize);
    return sampleBuffer;
  }

  getTrackBuffer(track: InputTrack) {
    const maybeTrackBuffer = this.trackBuffers.get(track.id);

    if (maybeTrackBuffer) {
      return maybeTrackBuffer;
    }

    const trackBuffer = this.createTrackBuffer(track);
    this.trackBuffers.set(track.id, trackBuffer);
    return trackBuffer;
  }

  async seek(trackId: number, timeMs: number) {
    return withSpan(
      "bufferedInput.seek",
      {
        trackId,
        timeMs,
        startTimeOffsetMs: this.startTimeOffsetMs,
      },
      undefined,
      async (span) => {
        // Apply timeline offset to map user timeline to media timeline
        const mediaTimeMs = timeMs + this.startTimeOffsetMs;

        // Round using consistent precision handling
        const roundedMediaTimeMs = roundToMilliseconds(mediaTimeMs);
        span.setAttribute("roundedMediaTimeMs", roundedMediaTimeMs);

        // Serialize seek operations per track (but don't block iterator creation)
        const existingSeek = this.trackSeekPromises.get(trackId);
        if (existingSeek) {
          span.setAttribute("waitedForExistingSeek", true);
          await existingSeek;
        }

        const seekPromise = this.seekSafe(trackId, roundedMediaTimeMs);
        this.trackSeekPromises.set(trackId, seekPromise);

        try {
          return await seekPromise;
        } finally {
          this.trackSeekPromises.delete(trackId);
        }
      },
    );
  }

  private async resetIterator(track: InputTrack) {
    const trackBuffer = this.trackBuffers.get(track.id);
    trackBuffer?.clear();
    // Clean up iterator safely - wait for any ongoing iterator creation
    const ongoingIteratorCreation = this.trackIteratorCreationPromises.get(
      track.id,
    );
    if (ongoingIteratorCreation) {
      await ongoingIteratorCreation;
    }

    const iterator = this.trackIterators.get(track.id);
    if (iterator) {
      try {
        await iterator.return?.();
      } catch (_error) {
        // Iterator cleanup failed, continue anyway
      }
    }
    this.trackIterators.delete(track.id);
  }

  #seekLock?: PromiseWithResolvers<void>;

  private async seekSafe(trackId: number, timeMs: number) {
    return withSpan(
      "bufferedInput.seekSafe",
      {
        trackId,
        timeMs,
      },
      undefined,
      async (span) => {
        if (this.#seekLock) {
          span.setAttribute("waitedForSeekLock", true);
          await this.#seekLock.promise;
        }
        const seekLock = Promise.withResolvers<void>();
        this.#seekLock = seekLock;

        try {
          const track = await this.getTrack(trackId);
          span.setAttribute("trackType", track.type);

          const trackBuffer = this.getTrackBuffer(track);

          const roundedTimeMs = roundToMilliseconds(timeMs);
          const firstTimestampMs = roundToMilliseconds(
            (await track.getFirstTimestamp()) * 1000,
          );
          span.setAttribute("firstTimestampMs", firstTimestampMs);

          if (roundedTimeMs < firstTimestampMs) {
            console.error("Seeking outside bounds of input", {
              roundedTimeMs,
              firstTimestampMs,
            });
            throw new NoSample(
              `Seeking outside bounds of input ${roundedTimeMs} < ${firstTimestampMs}`,
            );
          }

          // Check if we need to reset iterator for seeks outside current buffer range
          const bufferContents = trackBuffer.getContents();
          span.setAttribute("bufferContentsLength", bufferContents.length);

          if (bufferContents.length > 0) {
            const bufferStartMs = roundToMilliseconds(
              trackBuffer.firstTimestamp * 1000,
            );
            span.setAttribute("bufferStartMs", bufferStartMs);

            if (roundedTimeMs < bufferStartMs) {
              span.setAttribute("resetIterator", true);
              await this.resetIterator(track);
            }
          }

          const alreadyInBuffer = trackBuffer.find(timeMs);
          if (alreadyInBuffer) {
            span.setAttribute("foundInBuffer", true);
            span.setAttribute("bufferSize", trackBuffer.length);
            const contents = trackBuffer.getContents();
            if (contents.length > 0) {
              span.setAttribute(
                "bufferTimestamps",
                contents
                  .map((s) => Math.round((s.timestamp || 0) * 1000))
                  .slice(0, 10)
                  .join(","),
              );
            }
            return alreadyInBuffer;
          }

          // Buffer miss - record buffer state
          span.setAttribute("foundInBuffer", false);
          span.setAttribute("bufferSize", trackBuffer.length);
          span.setAttribute("requestedTimeMs", Math.round(timeMs));

          const contents = trackBuffer.getContents();
          if (contents.length > 0) {
            const firstSample = contents[0];
            const lastSample = contents[contents.length - 1];
            if (firstSample && lastSample) {
              const bufferStartMs = Math.round(
                (firstSample.timestamp || 0) * 1000,
              );
              const bufferEndMs = Math.round(
                ((lastSample.timestamp || 0) + (lastSample.duration || 0)) *
                  1000,
              );
              span.setAttribute("bufferStartMs", bufferStartMs);
              span.setAttribute("bufferEndMs", bufferEndMs);
              span.setAttribute(
                "bufferRangeMs",
                `${bufferStartMs}-${bufferEndMs}`,
              );
            }
          }

          const iterator = this.getTrackIterator(track);
          let iterationCount = 0;
          const decodeStart = performance.now();

          while (true) {
            iterationCount++;
            const iterStart = performance.now();
            const { done, value: decodedSample } = await iterator.next();
            const iterEnd = performance.now();

            // Record individual iteration timing for first 5 iterations
            if (iterationCount <= 5) {
              span.setAttribute(
                `iter${iterationCount}Ms`,
                Math.round((iterEnd - iterStart) * 100) / 100,
              );
            }

            if (decodedSample) {
              trackBuffer.push(decodedSample);
              if (iterationCount <= 5) {
                span.setAttribute(
                  `iter${iterationCount}Timestamp`,
                  Math.round((decodedSample.timestamp || 0) * 1000),
                );
              }
            }

            const foundSample = trackBuffer.find(roundedTimeMs);
            if (foundSample) {
              const decodeEnd = performance.now();
              span.setAttribute("iterationCount", iterationCount);
              span.setAttribute(
                "decodeMs",
                Math.round((decodeEnd - decodeStart) * 100) / 100,
              );
              span.setAttribute(
                "avgIterMs",
                Math.round(((decodeEnd - decodeStart) / iterationCount) * 100) /
                  100,
              );
              span.setAttribute("foundSample", true);
              span.setAttribute(
                "foundTimestamp",
                Math.round((foundSample.timestamp || 0) * 1000),
              );
              return foundSample;
            }
            if (done) {
              break;
            }
          }

          span.setAttribute("iterationCount", iterationCount);
          span.setAttribute("reachedEnd", true);

          // Check if we're seeking to the exact end of the track (legitimate use case)
          const finalBufferContents = trackBuffer.getContents();
          if (finalBufferContents.length > 0) {
            const lastSample =
              finalBufferContents[finalBufferContents.length - 1];
            const lastSampleEndMs = roundToMilliseconds(
              ((lastSample?.timestamp || 0) + (lastSample?.duration || 0)) *
                1000,
            );

            // Only return last sample if seeking to exactly the track duration
            // (end of video) AND we have the final segment loaded
            const trackDurationMs = (await track.computeDuration()) * 1000;
            const isSeekingToTrackEnd =
              roundToMilliseconds(timeMs) ===
              roundToMilliseconds(trackDurationMs);
            const isAtEndOfTrack =
              roundToMilliseconds(timeMs) >= lastSampleEndMs;

            if (isSeekingToTrackEnd && isAtEndOfTrack) {
              span.setAttribute("returnedLastSample", true);
              return lastSample;
            }
          }

          // For all other cases (seeking within track but outside buffer range), throw error
          // The caller should ensure the correct segment is loaded before seeking
          throw new NoSample(
            `Sample not found for time ${timeMs} in ${track.type} track ${trackId}`,
          );
        } finally {
          this.#seekLock = undefined;
          seekLock.resolve();
        }
      },
    );
  }
}
