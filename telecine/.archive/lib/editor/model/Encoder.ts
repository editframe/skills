import { AudioLayer } from "./AudioLayer/AudioLayer";
import { Layer } from "./Layer";
import { memoize } from "@/util/memoize";

interface EncodeProgress {
  frame: number;
  totalFrames: number;
  progress: number;
}
export interface EncoderOptions {
  fromMs?: number;
  toMs?: number;
  keyframeIntervalMs: number;
  video?: WithRequired<VideoEncoderConfig, "framerate">;
  audio?: AudioEncoderConfig;
}

type VideoChunkCallback = (
  chunk: EncodedVideoChunk,
  metadata?: EncodedVideoChunkMetadata,
) => void;

type AudioChunkCallback = (
  chunk: EncodedAudioChunk,
  metadata?: EncodedAudioChunkMetadata,
) => void;

type RawAudioChunkCallback = (chunk: Float32Array) => void;

type TickCallback = (tick: number) => void;

export class Encoder {
  static AUDIO_SAMPLE_RATE = 48000;
  constructor(private readonly encoderOptions: EncoderOptions) {}

  private readonly eventListeners: Record<
    string,
    Set<(...args: any[]) => void>
  > = {};

  addEventListener(
    type: "wav-audio-chunk",
    callback: RawAudioChunkCallback,
  ): void;
  addEventListener(type: "video-chunk", callback: VideoChunkCallback): void;
  addEventListener(type: "audio-chunk", callback: AudioChunkCallback): void;
  addEventListener(type: "tick", callback: TickCallback): void;
  addEventListener(type: string, callback: (...args: any[]) => void): void {
    (this.eventListeners[type] ||= new Set()).add(callback);
  }

  removeEventListener(
    type: "wav-audio-chunk",
    callback: RawAudioChunkCallback,
  ): void;
  removeEventListener(type: "video-chunk", callback: VideoChunkCallback): void;
  removeEventListener(type: "audio-chunk", callback: AudioChunkCallback): void;
  removeEventListener(type: "tick", callback: TickCallback): void;
  removeEventListener(type: string, callback: any): void {
    this.eventListeners[type]?.delete(callback);
  }

  emit(type: "wav-audio-chunk", chunk: Float32Array): void;
  emit(
    type: "video-chunk",
    chunk: EncodedVideoChunk,
    metadata?: EncodedVideoChunkMetadata,
  ): void;
  emit(
    type: "audio-chunk",
    chunk: EncodedAudioChunk,
    metadata?: EncodedAudioChunkMetadata,
  ): void;
  emit(type: "tick", tick: number): void;
  emit(type: string, ...args: any[]): void {
    this.eventListeners[type]?.forEach((listener) => {
      listener(...args);
    });
  }

  @memoize
  get videoEncoder(): VideoEncoder {
    const videoEncoder = new VideoEncoder({
      output: (chunk, metadata) => {
        this.emit("video-chunk", chunk, metadata);
      },
      error: (error) => {
        console.error(error);
      },
    });

    videoEncoder.configure({
      ...this.encoderOptions.video,
      avc: {
        format: "annexb",
      },
    });

    return videoEncoder;
  }

  @memoize
  get audioEncoder(): AudioEncoder {
    const audioEncoder = new AudioEncoder({
      output: (chunk, metadata) => {
        this.emit("audio-chunk", chunk, metadata);
      },
      error: (error) => {
        console.error(error);
      },
    });

    audioEncoder.configure({
      ...this.encoderOptions.audio,
      aac: { format: "adts" },
    });
    return audioEncoder;
  }

  async renderAudioBuffer(temporalRoot: Layer): Promise<AudioBuffer> {
    const audioContext = new OfflineAudioContext(
      1,
      Encoder.AUDIO_SAMPLE_RATE * (temporalRoot.durationMs / 1000),
      Encoder.AUDIO_SAMPLE_RATE,
    );

    const audioLayers = temporalRoot.audioLayers;

    await Promise.all(
      audioLayers.map(async (audioLayer) => {
        await AudioLayer.fetchAudioBufferFor(audioLayer);
      }),
    );

    for (const audioLayer of audioLayers) {
      const audioBufferSource = audioContext.createBufferSource();
      audioBufferSource.buffer = audioLayer.audioBuffer;
      audioBufferSource.connect(audioContext.destination);
      audioBufferSource.start(
        audioLayer.absoluteStartTimeMs / 1000,
        audioLayer.trim.startMs / 1000,
        audioLayer.durationMs / 1000,
      );
    }

    // eslint-disable-next-line @typescript-eslint/return-await
    return audioContext.startRendering();
  }

  async *encode(
    temporalRoot: Layer,
  ): AsyncGenerator<EncodeProgress, void, unknown> {
    const renderedAudio = await this.renderAudioBuffer(temporalRoot);
    const canvas = new OffscreenCanvas(
      temporalRoot.cssWidth,
      temporalRoot.cssHeight,
    );
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hasVideo = this.encoderOptions.video !== undefined;

    temporalRoot.setCurrentTimeMs(this.encoderOptions.fromMs ?? 0);

    const renderStart = performance.now();
    const encodedFrameCount = 0;
    let nextKeyFrameMs = 0;
    const keyFrameEveryMs = this.encoderOptions.keyframeIntervalMs;
    const renderDurationMs =
      this.encoderOptions.toMs ?? temporalRoot.durationMs;
    const renderStopPointMs = Math.min(
      temporalRoot.currentTimeMs + renderDurationMs,
      temporalRoot.durationMs,
    );

    const totalFrames = Math.round(
      (this.encoderOptions.video?.framerate ?? 25) * (renderDurationMs / 1000),
    );
    let framesGenerated = 0;
    let currentSample = 0;
    console.log("Starting render");
    console.log("currentTimeMs", temporalRoot.currentTimeMs);
    console.log("renderDuration", renderDurationMs);
    while (temporalRoot.currentTimeMs < renderStopPointMs) {
      console.log("rendering frame", framesGenerated);
      /** ACTUALLY RENDER THE VIDEO FRAME */
      await temporalRoot.renderToCanvas(ctx);
      console.log("rendered frame", framesGenerated);

      /** WAIT FOR ENCODER QUEUES TO DRAIN */
      await Promise.all([
        this.waitUntilVideoQueueDrained(),
        // this.waitUntilAudioQueueDrained(),
      ]);
      console.log("drained queues", framesGenerated);

      /** DECIDE WHETHER KEYFRAME OR NOT */
      let keyFrame = false;
      if (temporalRoot.currentTimeMs >= nextKeyFrameMs) {
        keyFrame = true;
        nextKeyFrameMs = nextKeyFrameMs + keyFrameEveryMs;
      }

      /** ADVANCE VIDEO TIME BEFORE DECIDING WHICH AUDIO SAMPLES TO USE */
      temporalRoot.setCurrentTimeMs(
        temporalRoot.currentTimeMs + 1000 / this.encoderOptions.video.framerate,
      );
      /** CREATE SAMPLES */
      const audioSampleCount =
        Math.round(
          (temporalRoot.currentTimeMs / 1000) *
            this.encoderOptions.audio.sampleRate,
        ) - currentSample;

      const samples = new Float32Array(
        audioSampleCount * renderedAudio.numberOfChannels,
      );

      for (let i = 0; i < renderedAudio.numberOfChannels; i++) {
        const channelData = renderedAudio.getChannelData(i);
        samples.set(
          channelData.slice(currentSample, currentSample + audioSampleCount),
          i * audioSampleCount,
        );
      }

      // // const audioData = new AudioData({
      // //   // WebAudio ALWAYS uses 32-bit planar floating point samples
      // //   format: "f32-planar",
      // //   // WebAudio ALWAYS uses 48kHz as the sample rate
      // //   sampleRate: Encoder.AUDIO_SAMPLE_RATE,
      // //   numberOfChannels: 1,
      // //   timestamp: currentSample / Encoder.AUDIO_SAMPLE_RATE,
      // //   numberOfFrames: samples.length,
      // //   data: samples.buffer,
      // // });

      this.emit("wav-audio-chunk", samples);

      const videoFrame = new VideoFrame(canvas, {
        timestamp:
          (framesGenerated * 1_000_000) / this.encoderOptions.video.framerate,
      });

      console.log("encoding", framesGenerated);
      /** ENCODE SAMPLE */
      this.videoEncoder.encode(videoFrame, { keyFrame });
      // this.audioEncoder.encode(audioData);

      /** ADVANCE SAMPLE COUNT AFTER GENERATING AUDIO DATA OBJECT */
      currentSample += audioSampleCount;

      /** CLOSE FRAMES */
      // audioData.close();
      videoFrame.close();

      framesGenerated++;

      console.log("yielding", framesGenerated);
      yield {
        frame: framesGenerated,
        totalFrames,
        progress: framesGenerated / totalFrames,
      };
    }

    // await this.audioEncoder.flush();
    await this.videoEncoder.flush();

    // this.audioEncoder.close();
    this.videoEncoder.close();

    const renderEnd = performance.now();
    const renderElapsed = renderEnd - renderStart;
    console.log("rendered", renderDurationMs, "frames", renderElapsed, "ms");
    console.log("encoded", encodedFrameCount, "frames");
    console.log(renderDurationMs / renderElapsed, "x realtime");
  }

  async waitUntilVideoQueueDrained(): Promise<void> {
    if (this.videoEncoder.encodeQueueSize === 0) return;
    await new Promise<void>((resolve) => {
      this.videoEncoder.addEventListener("dequeue", () => {
        resolve();
      });
    });
    await this.waitUntilVideoQueueDrained();
  }

  async waitUntilAudioQueueDrained(): Promise<void> {
    if (this.audioEncoder.encodeQueueSize === 0) return;
    await new Promise<void>((resolve) => {
      // @ts-expect-error this is according to the AudioEncoder spec
      this.audioEncoder.addEventListener("dequeue", () => {
        resolve();
      });
    });
    await this.waitUntilAudioQueueDrained();
  }
}
