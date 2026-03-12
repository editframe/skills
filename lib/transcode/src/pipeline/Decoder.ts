/**
 * TypeScript interface for the modular Decoder component
 * Uses explicit resource management for automatic cleanup
 */

export interface DecoderOptions {
  codecId: number;
  mediaType?: "video" | "audio";

  // Video parameters (optional)
  width?: number;
  height?: number;

  // Audio parameters (optional)
  channels?: number;
  sampleRate?: number;

  // Source stream timebase (prevents timestamp corruption during flush)
  timeBase?: { num: number; den: number };

  // Codec-specific data (optional)
  extradata?: ArrayBufferLike;
}

export interface Frame {
  readonly framePtr: number; // Frame pointer for accessing actual frame data
  readonly pts: number;
  readonly dts: number;
  readonly format: number;
  readonly mediaType: "video" | "audio" | "unknown";

  // Video frame properties
  readonly width?: number;
  readonly height?: number;

  // Audio frame properties
  readonly channels?: number;
  readonly sampleRate?: number;
  readonly samplesPerChannel?: number;

  // Frame data planes (metadata only for now)
  readonly planes: ReadonlyArray<{
    readonly linesize: number;
  }>;
}

export interface Packet {
  readonly data: Uint8Array;
  readonly pts?: number;
  readonly dts: number;
  readonly streamIndex: number;
  readonly size: number;
  readonly isKeyFrame: boolean;
}

/**
 * Decoder - A disposable resource for decoding video/audio packets
 * Automatically manages FFmpeg codec contexts and frame buffers
 */
export interface Decoder {
  readonly codecId: number;
  readonly codecName: string;
  readonly mediaType: "video" | "audio" | "unknown";
  readonly isInitialized: boolean;

  /**
   * Decode a packet into one or more frames
   * @param packet The packet to decode
   * @returns Promise that resolves to array of decoded frames
   */
  decode(packet: Packet): Promise<Frame[]>;

  /**
   * Flush remaining frames from the decoder
   * Call this at the end of the stream to get any buffered frames
   * @returns Promise that resolves to array of remaining frames
   */
  flush(): Promise<Frame[]>;

  /**
   * Reset PTS tracking for segment-based decoding
   * Call this when starting a new segment to reset timestamp tracking
   */
  resetPtsTracking(): void;

  /**
   * Explicit resource cleanup - called automatically when using 'using' declaration
   */
  [Symbol.dispose](): void;
}

/**
 * Factory function to create a Decoder instance
 * The returned Decoder can be used with 'using' declaration for automatic cleanup
 *
 * @example
 * ```typescript
 * using decoder = await createDecoder({
 *   codecId: 27, // H.264
 *   mediaType: 'video',
 *   width: 1280,
 *   height: 720
 * });
 *
 * const frames = await decoder.decode(packet);
 * console.log(`Decoded ${frames.length} frames`);
 * ```
 */
export async function createDecoder(options: DecoderOptions): Promise<Decoder> {
  const { createDecoderNative } = await import("../playback.js");

  // Convert ArrayBufferLike to Uint8Array if provided
  const extradata = options.extradata
    ? new Uint8Array(options.extradata)
    : undefined;

  const nativeDecoder = createDecoderNative({
    codecId: options.codecId,
    mediaType: options.mediaType,
    width: options.width,
    height: options.height,
    channels: options.channels,
    sampleRate: options.sampleRate,
    timeBase: options.timeBase,
    extradata,
  });

  // Initialize the native decoder
  const success = await nativeDecoder.initialize();
  if (!success) {
    nativeDecoder.dispose();
    throw new Error(
      `Failed to initialize Decoder for codec ID ${options.codecId}`,
    );
  }

  return {
    get codecId() {
      return nativeDecoder.codecId;
    },
    get codecName() {
      return nativeDecoder.codecName;
    },
    get mediaType() {
      return nativeDecoder.mediaType;
    },
    get isInitialized() {
      return nativeDecoder.isInitialized;
    },

    async decode(packet: Packet): Promise<Frame[]> {
      return new Promise<Frame[]>((resolve, reject) => {
        nativeDecoder.decodeAsync(
          packet,
          (error: Error | null, frames: Frame[]) => {
            if (error) {
              reject(error);
            } else {
              resolve(frames);
            }
          },
        );
      });
    },

    async flush(): Promise<Frame[]> {
      return nativeDecoder.flush();
    },

    resetPtsTracking(): void {
      nativeDecoder.resetPtsTracking();
    },

    [Symbol.dispose](): void {
      nativeDecoder.dispose();
    },
  };
}

/**
 * Common codec IDs for convenience
 * Based on FFmpeg's AVCodecID enum
 */
export const CodecId = {
  // Video codecs
  H264: 27,
  H265: 173,
  VP8: 139,
  VP9: 167,
  AV1: 225,
  MPEG4: 13,
  MPEG2VIDEO: 2,

  // Audio codecs
  AAC: 86018,
  MP3: 86017,
  OPUS: 86076,
  VORBIS: 86021,
  AC3: 86019,
  PCM_S16LE: 65536,
} as const;

/**
 * Convenience function to validate decoder creation
 * Useful for debugging and validation
 */
export async function validateDecoder(options: DecoderOptions): Promise<{
  valid: boolean;
  error?: string;
  codecName?: string;
  mediaType?: string;
}> {
  try {
    using decoder = await createDecoder(options);

    return {
      valid: true,
      codecName: decoder.codecName,
      mediaType: decoder.mediaType,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
