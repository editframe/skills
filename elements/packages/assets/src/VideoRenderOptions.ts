import { z } from "zod";

export const VideoRenderOptions = z.object({
  mode: z.enum(["canvas", "screenshot"]),
  strategy: z.enum(["v1", "v2"]),
  showFrameBox: z.boolean().optional(),
  enableTracing: z.boolean().default(false).optional(),
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
