import { once, EventEmitter } from "node:events";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import ISOBoxer from "codem-isoboxer";

import * as logging from "@/logging";
import { WithSpan, executeSpan } from "@/tracing";
import { promiseWithResolvers } from "@/util/promiseWithResolvers";
import type {
  FramegenEngine,
  VideoRenderOptions,
} from "./engines/FramegenEngine";
import { DisposableMuxer } from "./DisposableMuxer";
import { DisposableEncoder } from "./DisposableEncoder";
import { hasGpu } from "@/util/gpuDetect";
import {
  repackageInitSegment,
  repackageMediaSegment,
} from "@/muxing/repackageFragements";
import { PADDING_US } from "./createRenderOptionsForSegment.js";

// 1024 samples per audio frame at 48kHz represented in microseconds (μs)
const AUDIO_FRAME_DURATION_US = (1024.0 / 48_000.0) * 1_000_000.0;
interface VideoSegmentEncoderOptions {
  renderId: string;
  renderOptions: VideoRenderOptions;
  engine: FramegenEngine;
  abortSignal: AbortSignal;
}

interface MuxerPaths {
  videoPath: string;
  audioPath: string;
  concatPath: string;
  [Symbol.asyncDispose]: () => Promise<void>;
}

/**
 * This is a server-side class that is used to render and mux video and audio segments.
 *
 * The big picture is that we want to render our videos in parallel. We want a high level of paralleism
 * so we split into 2 to 4 second chunks. This means we end up with a lot of small pieces.
 *
 * The fundamental design choice is that we want to take advantage of FAST file concatenation operations
 * provided by the cloud storage system. This means we do not have access to any computation or muxing
 * at the final join step.
 *
 * That means our segments must be exactly concatenatable as we write them to disk.
 *
 * To this end, we use fragmented mp4 structure, so we can write one file with ftyp+moov, and others with
 * moof+mdat.
 *
 * This means we need to be able to predict as much as possible about our files as we can, and put that
 * into the moov.
 *
 * It also means we need to construct timestamps and other values based on the segment index number, so
 * when they finally come together, they'll work nicely.
 */
export class SegmentEncoder extends EventEmitter {
  private renderId: string;
  private renderOptions: VideoRenderOptions;
  private engine: FramegenEngine;
  private abortSignal: AbortSignal;
  private logger: ReturnType<typeof logging.makeLogger>;

  constructor({
    renderId,
    renderOptions,
    engine,
    abortSignal,
  }: VideoSegmentEncoderOptions) {
    super();
    this.logger = logging.makeLogger().child({
      renderId,
      sequenceNumber: renderOptions.encoderOptions.sequenceNumber ?? "init",
      component: "SegmentEncoder",
    });

    const abortHandler = () => {
      this.abortSignal.removeEventListener("abort", abortHandler);
      this.logger.warn("Tearing down due to abort signal.");
    };
    this.abortSignal = abortSignal;
    this.abortSignal.addEventListener("abort", abortHandler);

    this.engine = engine;
    this.engine.onError((error) => {
      this.abortSignal.removeEventListener("abort", abortHandler);
      this.logger.error({ error }, "Error in renderer");
    });

    this.renderOptions = renderOptions;
    this.renderId = renderId;
  }

  get width() {
    return this.renderOptions.encoderOptions.video.width;
  }

  get height() {
    return this.renderOptions.encoderOptions.video.height;
  }

  get framerate() {
    return this.renderOptions.encoderOptions.video.framerate;
  }

  get groupSize() {
    if (this.renderOptions.encoderOptions.isInitSegment) {
      return 1;
    }
    return (
      (this.renderOptions.encoderOptions.keyframeIntervalMs / 1000) *
      this.framerate
    );
  }

  get segmentDurationMs() {
    return (
      this.renderOptions.encoderOptions.toMs -
      this.renderOptions.encoderOptions.fromMs
    );
  }

  get alignedDurationUs() {
    return (
      this.renderOptions.encoderOptions.alignedToUs -
      this.renderOptions.encoderOptions.alignedFromUs
    );
  }

  get totalFrameCount() {
    if (this.renderOptions.encoderOptions.isInitSegment) {
      // For init segments, we need enough frames to generate at least one audio frame
      // At 48kHz, we need 1024 samples per audio frame
      // Calculate minimum frames needed to generate sufficient audio samples
      const audioSampleRate =
        this.renderOptions.encoderOptions.audio.sampleRate;
      const videoFrameRate = this.framerate;
      const minAudioSamplesNeeded = 1024; // Standard AAC frame size
      const samplesPerVideoFrame = audioSampleRate / videoFrameRate;
      const minFramesForAudio = Math.ceil(
        minAudioSamplesNeeded / samplesPerVideoFrame,
      );

      // Ensure we render at least 2-3 frames to have sufficient audio for muxer
      return Math.max(3, minFramesForAudio);
    }
    return Math.max(
      1,
      Math.ceil(this.segmentDurationMs / (1000 / this.framerate)),
    );
  }

  get bitmapImageInputArgs() {
    // Account for verification strip added by ElectronEngine (+1 pixel height)
    const bitmapHeight = this.engine.isBitmapEngine
      ? this.height + 1
      : this.height;

    // biome-ignore format: strict command line format
    return [
      "-f",
      "rawvideo",
      "-pixel_format",
      "bgra",
      "-video_size",
      `${this.width}x${bitmapHeight}`,
    ];
  }

  get encodedImageInputArgs() {
    // biome-ignore format: strict command line format
    return ["-f", "mjpeg"];
  }

  get audioBitrate() {
    return String(this.renderOptions.encoderOptions.audio.bitrate);
  }

  get audioSamplerate() {
    return String(this.renderOptions.encoderOptions.audio.sampleRate);
  }

  async muxerFiles(): Promise<MuxerPaths> {
    const uniqueId = Math.random().toString(36).substring(7);
    const tempDir = `/app/temp/${this.renderId}-${uniqueId}`;
    await mkdir(tempDir, { recursive: true });

    const sequenceNumber =
      this.renderOptions.encoderOptions.sequenceNumber ?? "init";

    const videoPath = join(tempDir, `n-${sequenceNumber}-${uniqueId}.v.mp4`);
    const audioPath = join(tempDir, `n-${sequenceNumber}-${uniqueId}.a.aac`);
    const concatPath = join(tempDir, `n-${sequenceNumber}-${uniqueId}.concat`);
    return {
      videoPath,
      audioPath,
      concatPath,
      [Symbol.asyncDispose]: async () => {
        await rm(tempDir, { recursive: true, force: true });
      },
    };
  }

  buildVideoEncoder(paths: MuxerPaths) {
    const imageInputArgs = this.engine.isBitmapEngine
      ? this.bitmapImageInputArgs
      : this.encodedImageInputArgs;

    // Debug logging to identify NaN sources
    const groupSize = this.groupSize;
    const totalFrameCount = this.totalFrameCount;
    const sequenceNumber = this.renderOptions.encoderOptions.sequenceNumber;

    this.logger.debug(
      {
        groupSize,
        totalFrameCount,
        sequenceNumber,
        keyframeIntervalMs:
          this.renderOptions.encoderOptions.keyframeIntervalMs,
        framerate: this.framerate,
        isInitSegment: this.renderOptions.encoderOptions.isInitSegment,
      },
      "buildVideoEncoder parameters",
    );

    if (Number.isNaN(groupSize) || groupSize <= 0) {
      this.logger.error(
        { groupSize, totalFrameCount, sequenceNumber },
        "Invalid groupSize detected",
      );
      throw new Error(`Invalid groupSize: ${groupSize}`);
    }

    const movflags = "cmaf+delay_moov+empty_moov";

    // Crop verification strip for bitmap engines (removes bottom 1px to get back to even height)
    const cropFilter = this.engine.isBitmapEngine
      ? ["-vf", `crop=${this.width}:${this.height}:0:0`]
      : [];

    const videoCodecArgs = hasGpu()
      ? // NVENC hardware encoder: offloads H.264 encoding to GPU NVENC silicon
        // biome-ignore format: strict command line format
        ["-c:v", "h264_nvenc", "-g", `${groupSize}`, "-preset", "p4", "-profile:v", "high", "-level:v", "4.0", "-pix_fmt", "yuv420p"]
      : // Software encoder: libx264 ultrafast for CPU instances
        // biome-ignore format: strict command line format
        ["-c:v", "libx264", "-g", `${groupSize}`, "-preset", "ultrafast", "-tune", "zerolatency", "-profile:v", "high", "-level:v", "4.0", "-pix_fmt", "yuv420p"];

    // biome-ignore format: strict command line format
    return new DisposableEncoder([
      ...imageInputArgs,
      "-framerate",
      `${this.framerate}`,
      "-i",
      "-",
      ...cropFilter,
      ...videoCodecArgs,
      "-color_range",
      "tv",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-flush_packets",
      "1",
      "-frag_duration",
      "1",
      "-movflags",
      movflags,
      "-f",
      "mp4",
      paths.videoPath,
    ]);
  }

  buildAudioEncoder(paths: MuxerPaths) {
    // biome-ignore format: strict command line format
    return new DisposableEncoder([
      "-ac",
      "2",
      "-sample_fmt",
      "fltp",
      "-f",
      "f32le",
      "-ar",
      this.audioSamplerate,
      "-i",
      "-",
      "-c:a",
      "aac",
      "-f",
      "adts",
      "-b:a",
      this.audioBitrate,
      "-sample_rate",
      this.audioSamplerate,
      "-muxdelay",
      "0",
      "-flush_packets",
      "1",
      paths.audioPath,
    ]);
  }

  buildMuxer(paths: MuxerPaths) {
    if (this.renderOptions.encoderOptions.isInitSegment) {
      this.logger.debug("Routing to buildMuxerForInitSegment");
      return this.buildMuxerForInitSegment(paths);
    }

    const hasAudio = !this.renderOptions.encoderOptions.noAudio;
    const fragDurationUs =
      (this.renderOptions.encoderOptions.toMs -
        this.renderOptions.encoderOptions.fromMs) *
      1000 *
      2;

    // Build command based on whether audio is present
    const command = hasAudio
      ? [
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          paths.concatPath,
          "-i",
          paths.videoPath,
          "-bsf:a",
          "aac_adtstoasc",
          "-c",
          "copy",
          "-flush_packets",
          "1",
          "-frag_duration",
          String(fragDurationUs),
          "-min_frag_duration",
          String(fragDurationUs),
          "-movflags",
          "cmaf+empty_moov+delay_moov",
          "-pix_fmt",
          "yuv420p",
          "-f",
          "mp4",
          "pipe:1",
        ]
      : [
          "-i",
          paths.videoPath,
          "-c",
          "copy",
          "-flush_packets",
          "1",
          "-frag_duration",
          String(fragDurationUs),
          "-min_frag_duration",
          String(fragDurationUs),
          "-movflags",
          "cmaf+empty_moov+delay_moov",
          "-pix_fmt",
          "yuv420p",
          "-f",
          "mp4",
          "pipe:1",
        ];

    // biome-ignore format: strict command line format
    return new DisposableMuxer(command);
  }

  buildMuxerForInitSegment(paths: MuxerPaths) {
    // Init segments don't need fragmentation or precise timing - generate normal MP4 for header extraction
    // Use audio and video files directly without concat directive

    const hasAudio = !this.renderOptions.encoderOptions.noAudio;

    const command = hasAudio
      ? [
          "-i",
          paths.audioPath,
          "-i",
          paths.videoPath,
          "-bsf:a",
          "aac_adtstoasc",
          "-c",
          "copy",
          "-flush_packets",
          "1",
          "-movflags",
          "frag_keyframe+empty_moov+delay_moov",
          "-pix_fmt",
          "yuv420p",
          "-color_range",
          "tv",
          "-colorspace",
          "bt709",
          "-color_primaries",
          "bt709",
          "-color_trc",
          "bt709",
          "-f",
          "mp4",
          "pipe:1",
        ]
      : [
          "-i",
          paths.videoPath,
          "-c",
          "copy",
          "-flush_packets",
          "1",
          "-movflags",
          "frag_keyframe+empty_moov+delay_moov",
          "-pix_fmt",
          "yuv420p",
          "-color_range",
          "tv",
          "-colorspace",
          "bt709",
          "-color_primaries",
          "bt709",
          "-color_trc",
          "bt709",
          "-f",
          "mp4",
          "pipe:1",
        ];

    this.logger.debug(
      {
        command,
        hasAudio,
        audioPath: hasAudio ? paths.audioPath : "N/A",
        videoPath: paths.videoPath,
      },
      "Building init segment muxer command",
    );

    // biome-ignore format: strict command line format
    return new DisposableMuxer(command);
  }

  /**
   * Generate concat directive for ffmpeg to extract specific timing from audio file.
   *
   * @param audioPath Path to the audio file
   * @param shouldTrimStart Whether to add padding at the start
   * @param shouldTrimEnd Whether to add padding at the end
   * @returns Object containing the directive string and timing values for debugging
   */
  generateConcatDirective(
    audioPath: string,
    shouldTrimStart: boolean,
    shouldTrimEnd: boolean,
  ) {
    const rawInpointUs =
      AUDIO_FRAME_DURATION_US + (shouldTrimStart ? PADDING_US : 0);
    const outpointUs = shouldTrimEnd
      ? this.alignedDurationUs - PADDING_US
      : this.alignedDurationUs;

    // Clamp inpoint to never exceed outpoint to avoid invalid ranges
    const inpointUs = Math.min(rawInpointUs, outpointUs);
    const durationUs = Math.max(0, outpointUs - inpointUs);

    const directive = [
      `file '${audioPath}'`,
      `inpoint ${inpointUs.toFixed(10)}us`,
      `outpoint ${outpointUs.toFixed(10)}us`,
      `duration ${durationUs.toFixed(10)}us`,
      "\n",
    ].join("\n");

    return {
      directive,
      inpointUs,
      outpointUs,
      durationUs,
    };
  }

  @WithSpan()
  async renderAndMux() {
    this.abortSignal.throwIfAborted();

    const hasAudio = !this.renderOptions.encoderOptions.noAudio;

    await using paths = await this.muxerFiles();
    await using videoEncoder = this.buildVideoEncoder(paths);
    await using audioEncoder = hasAudio ? this.buildAudioEncoder(paths) : null;

    const startRenderAndMux = performance.now();

    this.logger.trace(this.renderOptions, "initializing engine");

    await executeSpan("SegmentEncoder.initialize", async (span) => {
      span.setAttributes({
        renderId: this.renderId,
        sequenceNumber:
          this.renderOptions.encoderOptions.sequenceNumber ?? "init",
        width: this.width,
        height: this.height,
        framerate: this.framerate,
        totalFrameCount: this.totalFrameCount,
      });

      await this.engine.initialize(this.renderOptions);
    });

    const initializeTime = performance.now();

    this.logger.trace("Initialized framegen");

    // Emit encoding started event
    this.emit("encodingStarted");

    let audioWritesCanGoAhead = true;
    const frameStartTime = performance.now();

    // Draw the first frame once to bypass rendering a blank frame.
    await this.engine.beginFrame(1, false);
    await this.engine.captureFrame(
      1,
      this.renderOptions.encoderOptions.video.framerate,
    );

    const frameTimes: number[] = [];
    let longestFrameTime = 0;

    // Start frame 0's beginFrame before the loop so it can overlap with other work
    let pendingBeginFrame: Promise<Buffer | ArrayBuffer> = this.engine.beginFrame(
      0,
      this.totalFrameCount === 1,
    );

    for (
      let frameNumber = 0;
      frameNumber < this.totalFrameCount;
      frameNumber++
    ) {
      await executeSpan("SegmentEncoder.renderFrame", async (span) => {
        span.setAttributes({
          renderId: this.renderId,
          sequenceNumber:
            this.renderOptions.encoderOptions.sequenceNumber ?? "init",
          frameNumber,
          totalFrameCount: this.totalFrameCount,
          width: this.width,
          height: this.height,
          framerate: this.framerate,
          isLastFrame: frameNumber === this.totalFrameCount - 1,
        });

        const frameStart = performance.now();
        this.abortSignal.throwIfAborted();

        this.logger.trace(
          { frameNumber, totalFrameCount: this.totalFrameCount, frameStart },
          "Awaiting beginFrame",
        );
        const audioSamples = await pendingBeginFrame;

        this.logger.trace(
          { frameNumber, totalFrameCount: this.totalFrameCount, frameStart },
          "Calling engine.captureFrame",
        );

        const imageBuffer = await this.engine.captureFrame(
          frameNumber,
          this.renderOptions.encoderOptions.video.framerate,
        );

        if (imageBuffer.byteLength === 0) {
          this.logger.error(
            {
              frameNumber,
              engineType: this.engine.constructor.name,
            },
            "captureFrame returned empty buffer",
          );
          throw new Error(
            `captureFrame returned empty buffer for frame ${frameNumber}`,
          );
        }

        span.setAttributes({
          imageBufferBytes: imageBuffer.byteLength,
          audioSamplesBytes: audioSamples?.byteLength ?? 0,
        });

        // captureFrame(N) is complete — safe to advance DOM to frame N+1 now.
        // Start beginFrame(N+1) concurrently with writing frame N to ffmpeg.
        const isLastFrame = frameNumber === this.totalFrameCount - 1;
        if (!isLastFrame) {
          pendingBeginFrame = this.engine.beginFrame(
            frameNumber + 1,
            frameNumber + 1 === this.totalFrameCount - 1,
          );
        }

        const writePromise = promiseWithResolvers<void>();
        if (videoEncoder.process.stdin.destroyed) {
          this.logger.error("Video encoder stdin is destroyed");
          throw new Error("Video encoder stdin is destroyed");
        }
        const videoWritesCanGoAhead = videoEncoder.process.stdin.write(
          imageBuffer,
          "binary",
          (error) => {
            if (error) {
              writePromise.reject(error);
            } else {
              writePromise.resolve();
            }
          },
        );

        if (!videoWritesCanGoAhead) {
          await once(videoEncoder.process.stdin, "drain");
        }
        // This MUST come after the optional drain event, otherwise we're waiting on a callback
        // that can only occur after buffered writes have been flushed.
        await writePromise.promise;

        const frameTime = performance.now() - frameStart;
        frameTimes.push(frameTime);
        longestFrameTime = Math.max(longestFrameTime, frameTime);

        span.setAttributes({
          frameTimeMs: Number(frameTime.toFixed(2)),
        });

        this.logger.trace(
          {
            frameNumber,
            totalFrameCount: this.totalFrameCount,
            frameTime,
            audioSamplesBytes: audioSamples?.byteLength,
          },
          "Frame ended",
        );

        // Emit frame rendered event
        this.emit("frameRendered", {
          frameNumber,
          totalFrames: this.totalFrameCount,
        });
        if (audioEncoder && audioSamples?.byteLength > 0) {
          audioWritesCanGoAhead = audioEncoder.process.stdin.write(
            audioSamples,
            "binary",
          );
          if (!audioWritesCanGoAhead) {
            await once(audioEncoder.process.stdin, "drain");
          }
        }
      });
    }

    this.logger.trace("Awaiting encoders exit");

    const encoderPromises = [videoEncoder.closeAndAwaitExit()];
    if (audioEncoder) {
      encoderPromises.push(audioEncoder.closeAndAwaitExit());
    }
    await Promise.all(encoderPromises);

    this.logger.trace("Encoders exited");
    const encoderExitTime = performance.now();

    // For init segments, skip concat directive since files work perfectly when muxed directly
    // For regular segments, create concat directive for precise logical boundary extraction
    let concatEndTime = encoderExitTime; // Default for init segments

    if (!this.renderOptions.encoderOptions.isInitSegment && hasAudio) {
      const shouldTrimStart = this.renderOptions.encoderOptions.shouldPadStart;
      const shouldTrimEnd = this.renderOptions.encoderOptions.shouldPadEnd;

      const concatResult = this.generateConcatDirective(
        paths.audioPath,
        shouldTrimStart,
        shouldTrimEnd,
      );

      this.logger.debug(
        {
          sequenceNumber: this.renderOptions.encoderOptions.sequenceNumber ?? 0,
          shouldTrimStart,
          shouldTrimEnd,
          inpointUs: concatResult.inpointUs.toFixed(10),
          outpointUs: concatResult.outpointUs.toFixed(10),
          durationUs: concatResult.durationUs.toFixed(10),
          paddingFrames: shouldTrimStart ? 2 : 0,
          alignedDurationUs: this.alignedDurationUs,
          AUDIO_FRAME_DURATION_US,
          concatDirective: concatResult.directive,
        },
        "Concat directive with exact timing values",
      );

      await writeFile(paths.concatPath, concatResult.directive, "utf-8");
      concatEndTime = performance.now();
    } else {
      this.logger.debug(
        hasAudio
          ? "Skipping concat directive for init segment - using files directly"
          : "Skipping concat directive - no audio",
      );
    }

    await using muxer = this.buildMuxer(paths);

    const buffer = await muxer.muxedBufferPromise;

    const muxerEndTime = performance.now();

    const isoFile = ISOBoxer.parseBuffer(buffer);

    // Calculate timing differences
    const timings = {
      initialize: initializeTime - startRenderAndMux,
      frameGeneration: encoderExitTime - frameStartTime,
      concat: concatEndTime - encoderExitTime,
      muxer: muxerEndTime - concatEndTime,
      total: performance.now() - startRenderAndMux,
    };

    // Calculate standard deviation
    const avgFrameTime =
      frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const variance =
      frameTimes.reduce((sq, n) => sq + (n - avgFrameTime) ** 2, 0) /
      frameTimes.length;
    const stdDeviation = Math.sqrt(variance);

    // Calculate percentiles
    const sortedFrameTimes = [...frameTimes].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sortedFrameTimes.length) - 1;
      return sortedFrameTimes[index] ?? 0;
    };

    const percentiles = {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };

    // Create timing report as an object
    const percentageBreakdown = Object.entries(timings)
      .filter(([key]) => key !== "total")
      .reduce(
        (acc, [key, value]) => {
          acc[key] = Number(((value / timings.total) * 100).toFixed(2));
          return acc;
        },
        {} as Record<string, number>,
      );

    this.logger.info(
      {
        timings: {
          initialize: Number(timings.initialize.toFixed(2)),
          frameGeneration: Number(timings.frameGeneration.toFixed(2)),
          longestFrame: Number(longestFrameTime.toFixed(2)),
          frameTimeStdDeviation: Number(stdDeviation.toFixed(2)),
          percentiles: {
            p50: Number(percentiles.p50.toFixed(2)),
            p90: Number(percentiles.p90.toFixed(2)),
            p95: Number(percentiles.p95.toFixed(2)),
            p99: Number(percentiles.p99.toFixed(2)),
          },
          concat: Number(timings.concat.toFixed(2)),
          muxer: Number(timings.muxer.toFixed(2)),
          total: Number(timings.total.toFixed(2)),
        },
        percentageBreakdown,
      },
      "Timing report",
    );

    return isoFile;
  }

  generateFragmentBuffer() {
    this.abortSignal.throwIfAborted();
    if (this.renderOptions.encoderOptions.isInitSegment) {
      this.logger.trace("Generating init segment");
      return this.generateInitSegment();
    }
    this.logger.trace("Generating media segment");
    return this.generateMediaSegment();
  }

  @WithSpan()
  async generateStandaloneSegment() {
    const isoFile = await this.renderAndMux();
    return isoFile.write();
  }

  @WithSpan()
  async generateInitSegment() {
    return repackageInitSegment(
      await this.renderAndMux(),
      this.renderOptions.durationMs,
    );
  }

  @WithSpan()
  async generateMediaSegment() {
    const isoFile = await this.renderAndMux();

    let audioBmdtsUs = this.renderOptions.encoderOptions.alignedFromUs;
    if (this.renderOptions.encoderOptions.shouldPadStart) {
      audioBmdtsUs += PADDING_US;
    }

    const videoBmdtsMs = this.renderOptions.encoderOptions.fromMs;
    this.logger.debug(
      { audioBmdtsUs, videoBmdtsMs, renderOptions: this.renderOptions },
      "Repackage media segment",
    );

    return repackageMediaSegment(
      isoFile,
      this.renderOptions.encoderOptions.sequenceNumber ?? 0,
      0,
      (timescale) => {
        if (timescale === 48000) {
          // Convert microseconds to samples using integer arithmetic to avoid precision loss
          // audioBmdtsUs * 48000 / 1000000 = audioBmdtsUs * 48 / 1000
          return Math.round((audioBmdtsUs * 48) / 1000);
        } else {
          return (videoBmdtsMs / 1_000) * timescale;
        }
      },
    );
  }
}
