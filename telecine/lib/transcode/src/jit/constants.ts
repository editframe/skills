/**
 * Constants for JIT transcoding to avoid magic numbers
 */

export const AUDIO_CONSTANTS = {
  /** Standard AAC sample rate (Hz) */
  SAMPLE_RATE: 48000,
  /** Standard AAC bitrate (bits per second) */
  BITRATE: 128000,
  /** Standard stereo channels */
  CHANNELS: 2,
  /** AAC frame size in samples */
  FRAME_SIZE: 1024,
  /** Frame padding multiplier for AAC context */
  FRAME_PADDING_MULTIPLIER: 2
} as const;

export const VIDEO_CONSTANTS = {
  /** Standard video timebase denominator */
  STANDARD_TIMEBASE_DENOMINATOR: 90000,
  /** GOP size for video encoding */
  GOP_SIZE: 999,
  /** Default frame rate for video */
  DEFAULT_FRAME_RATE: { num: 25, den: 1 },
  /** Frame padding multiplier for video context */
  FRAME_PADDING_MULTIPLIER: 2
} as const;

export const TIME_CONSTANTS = {
  /** Microseconds per second */
  MICROSECONDS_PER_SECOND: 1000000,
  /** Milliseconds per second */
  MILLISECONDS_PER_SECOND: 1000,
  /** Microseconds per millisecond */
  MICROSECONDS_PER_MILLISECOND: 1000
} as const;

export const STREAMING_CONSTANTS = {
  /** Duration for init segments in streaming scenarios */
  INIT_SEGMENT_DURATION_MS: 0
} as const; 