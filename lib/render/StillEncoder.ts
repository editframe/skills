import { join } from "node:path";
import { mkdir, readFile, rm } from "node:fs/promises";

import type { OutputConfiguration } from "@editframe/api";

import { DisposableEncoder } from "./DisposableEncoder";
import type {
  FramegenEngine,
  VideoRenderOptions,
} from "./engines/FramegenEngine";
import { WithSpan, executeSpan } from "@/tracing";

interface StillEncoderOptions {
  renderId: string;
  outputConfig: OutputConfiguration;
  engine: FramegenEngine;
  renderOptions: VideoRenderOptions;
  abortSignal: AbortSignal;
}

export class StillEncoder {
  private renderId: string;
  private outputConfig: OutputConfiguration;
  private engine: FramegenEngine;
  private abortSignal: AbortSignal;
  private renderOptions: VideoRenderOptions;

  constructor({
    renderId,
    outputConfig,
    engine,
    renderOptions,
    abortSignal,
  }: StillEncoderOptions) {
    this.renderId = renderId;
    this.outputConfig = outputConfig;
    this.engine = engine;
    this.renderOptions = renderOptions;
    this.abortSignal = abortSignal;
  }

  @WithSpan()
  async encode(): Promise<Buffer> {
    await using encoderfiles = await this.encoderFiles();
    await using encoder = this.buildEncoder(encoderfiles.outputPath);

    await executeSpan("StillEncoder.initialize", async (span) => {
      span.setAttributes({
        renderId: this.renderId,
        width: this.renderOptions.encoderOptions.video.width,
        height: this.renderOptions.encoderOptions.video.height,
        outputContainer: this.outputConfig.container,
      });

      await this.engine.initialize(this.renderOptions);
    });

    await executeSpan("StillEncoder.renderFrame", async (span) => {
      span.setAttributes({
        renderId: this.renderId,
        frameNumber: 1,
      });

      await this.engine.beginFrame(1, false);
      await this.engine.captureFrame(1, 30);
    });

    await executeSpan("StillEncoder.captureFrame", async (span) => {
      span.setAttributes({
        renderId: this.renderId,
        frameNumber: 0,
      });

      await this.engine.beginFrame(0, true);
      const screenshot = await this.engine.captureFrame(0, 30);

      encoder.process.stdin.write(screenshot);
    });

    await encoder.closeAndAwaitExit();

    // Read the output file (ffmpeg will have flushed it when stdin closed)
    return await readFile(encoderfiles.outputPath);
  }

  get encoderArgs() {
    if (this.outputConfig.jpegConfig) {
      return [
        "-vcodec",
        "mjpeg",
        "-q:v",
        String(this.outputConfig.jpegConfig.quality ?? 80),
      ];
    }
    if (this.outputConfig.pngConfig) {
      return [
        "-vcodec",
        "png",
        "-compression_level",
        String(this.outputConfig.pngConfig.compression ?? 0),
        "-pix_fmt",
        this.outputConfig.pngConfig.transparency ? "rgba" : "rgb24",
      ];
    }
    if (this.outputConfig.webpConfig) {
      return [
        "-vcodec",
        "libwebp",
        "-q:v",
        String(this.outputConfig.webpConfig.quality ?? 80),
        "-compression_level",
        String(this.outputConfig.webpConfig.compression ?? 0),
        "-pix_fmt",
        this.outputConfig.webpConfig.transparency ? "yuva420p" : "yuv420p",
      ];
    }
    throw new Error(
      `Unsupported still container: ${this.outputConfig.container}`,
    );
  }

  get width() {
    return this.renderOptions.encoderOptions.video.width;
  }

  get height() {
    return this.renderOptions.encoderOptions.video.height;
  }

  get bitmapImageInputArgs() {
    // biome-ignore format: strict command line format
    return [
      "-f",
      "rawvideo",
      "-pixel_format",
      "bgra",
      "-video_size",
      `${this.width}x${this.height}`,
    ];
  }

  get encodedImageInputArgs() {
    // biome-ignore format: strict command line format
    return ["-f", "image2pipe"];
  }

  private buildEncoder(outputPath: string) {
    const imageInputArgs = this.engine.isBitmapEngine
      ? this.bitmapImageInputArgs
      : this.encodedImageInputArgs;

    const encoder = new DisposableEncoder([
      ...imageInputArgs,
      "-i",
      "-",
      ...this.encoderArgs,
      outputPath,
    ]);

    return encoder;
  }

  async encoderFiles() {
    const uniqueId = Math.random().toString(36).substring(7);
    const tempDir = `/app/temp/${uniqueId}`;
    await mkdir(tempDir, { recursive: true });
    const outputPath = join(
      tempDir,
      `${uniqueId}.${this.outputConfig.container}`,
    );
    return {
      outputPath,
      [Symbol.asyncDispose]: async () => {
        await rm(tempDir, { recursive: true, force: true });
      },
    };
  }
}
