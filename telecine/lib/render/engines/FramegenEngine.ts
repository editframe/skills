import { z } from "zod";

// TODO: these are duplicated in lib/packages/packages/assets/src/VideoRenderOptions.ts
// with subtle differences, we should unify them.
export const VideoRenderOptions = z.object({
  mode: z.enum(["canvas", "screenshot"]),
  strategy: z.enum(["v1", "v2"]),
  showFrameBox: z.boolean().optional(),
  durationMs: z.number(),
  encoderOptions: z.object({
    sequenceNumber: z.number(),
    keyframeIntervalMs: z.number(),
    /**
     * The nominal start time of the segment in milliseconds.
     * Does not include any padding.
     */
    fromMs: z.number(),
    /**
     * The nominal end time of the segment in milliseconds.
     * Does not include any padding.
     */
    toMs: z.number(),
    /**
     * Whether or not this segment has audio padding at the start.
     */
    shouldPadStart: z.boolean(),
    /**
     * Whether or not this segment has audio padding at the end.
     */
    shouldPadEnd: z.boolean(),
    /**
     * The aligned start time of the segment in microseconds.
     * This includes the padding if any.
     */
    alignedFromUs: z.number(),
    /**
     * The aligned end time of the segment in microseconds.
     * This includes the padding if any.
     */
    alignedToUs: z.number(),
    isInitSegment: z.boolean(),
    noVideo: z.boolean().optional(),
    noAudio: z.boolean().optional(),
    video: z.object({
      width: z.number(),
      height: z.number(),
      framerate: z.number(),
      codec: z.string(),
      bitrate: z.number(),
    }),
    audio: z.object({
      sampleRate: z.number(),
      codec: z.string(),
      numberOfChannels: z.number(),
      bitrate: z.number(),
    }),
  }),
  fetchHost: z.string(),
});

export type VideoRenderOptions = z.infer<typeof VideoRenderOptions>;

export interface FramegenProps {
  width: number;
  height: number;
  location: string;
  orgId: string;
}

export interface FramegenEngine {
  onError(handler: (error: Error) => void): void;

  initialize(renderOptions: VideoRenderOptions): Promise<void>;

  beginFrame(
    frameNumber: number,
    isLast: boolean,
  ): Promise<Buffer | ArrayBuffer>;

  captureFrame(frameNumber: number, fps: number): Promise<Buffer | ArrayBuffer>;

  isBitmapEngine: boolean;
}
