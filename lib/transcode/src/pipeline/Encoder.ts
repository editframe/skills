/**
 * TypeScript interface for the modular Encoder component
 * Uses explicit resource management for automatic cleanup
 */

export interface EncoderOptions {
  mediaType: 'video' | 'audio';
  codecId: number; // Codec ID from CodecId constants

  // Video encoding parameters
  width?: number;
  height?: number;
  pixelFormat?: number; // AVPixelFormat enum value
  videoBitrate?: number; // Bitrate in bits per second
  frameRate?: { num: number; den: number };
  timeBase?: { num: number; den: number };

  // Audio encoding parameters
  channels?: number;
  sampleRate?: number;
  sampleFormat?: number; // AVSampleFormat enum value
  audioBitrate?: number; // Bitrate in bits per second

  // Quality and performance settings
  quality?: number; // CRF value for video (lower = better quality)
  preset?: string; // Encoding speed preset ('ultrafast', 'fast', 'medium', 'slow', 'veryslow')
  profile?: string; // Codec profile ('baseline', 'main', 'high' for H.264)
  maxBFrames?: number; // Maximum consecutive B-frames
  gopSize?: number; // Group of Pictures size
}

export interface EncodedPacket {
  readonly pts: number;
  readonly dts: number;
  readonly duration: number;
  readonly size: number;
  readonly streamIndex: number;
  readonly isKeyFrame: boolean;
  readonly mediaType: 'video' | 'audio';
  readonly data: Uint8Array; // Encoded packet data
}

export interface CodecParameters {
  readonly codecId: number;
  readonly codecType: number; // AVMEDIA_TYPE_VIDEO or AVMEDIA_TYPE_AUDIO
  readonly width?: number; // Video only
  readonly height?: number; // Video only
  readonly pixelFormat?: number; // Video only
  readonly channels?: number; // Audio only
  readonly sampleRate?: number; // Audio only
  readonly sampleFormat?: number; // Audio only
  readonly bitRate: number;
  readonly extradata: Uint8Array;
}

/**
 * Encoder - A disposable resource for encoding frames into compressed packets
 * Automatically manages codec contexts and encoding resources
 */
export interface Encoder {
  readonly mediaType: 'video' | 'audio';
  readonly codecId: number;
  readonly codecName: string;
  readonly isInitialized: boolean;
  readonly framesEncoded: number;
  readonly bytesEncoded: number;
  readonly timeBase: { num: number; den: number };

  /**
   * Get encoder-generated extradata (SPS/PPS for H.264, etc.)
   * @returns Uint8Array containing the extradata, or empty array if none available
   */
  getExtradata(): Uint8Array;

  /**
   * Get complete codec parameters from encoder
   * @returns CodecParameters object containing all encoder parameters
   */
  getCodecParameters(): CodecParameters;

  /**
   * Encode a frame into compressed packets
   * @param frame Input frame to encode
   * @returns Promise that resolves to array of encoded packets
   */
  encode(frame: EncodedFrame): Promise<EncodedPacket[]>;

  /**
   * Encode a frame using Frame object with framePtr reference
   * @param frame Frame object from decoder/filter with framePtr and optional pts
   * @returns Promise that resolves to array of encoded packets
   */
  encodeFrameInfo(frame: { framePtr: number; pts?: number }): Promise<EncodedPacket[]>;

  /**
   * Encode a frame using Frame object with framePtr reference and explicit source timebase
   * @param frame Frame object from decoder/filter with framePtr and optional pts
   * @param sourceTimeBase Timebase of the source frame for timestamp conversion
   * @returns Promise that resolves to array of encoded packets
   */
  encodeFrameInfo(frame: { framePtr: number; pts?: number }, sourceTimeBase: { num: number; den: number }): Promise<EncodedPacket[]>;

  /**
   * Flush remaining packets from the encoder
   * @returns Promise that resolves to array of remaining encoded packets
   */
  flush(): Promise<EncodedPacket[]>;

  /**
   * Explicit resource cleanup - called automatically when using 'using' declaration
   */
  [Symbol.dispose](): void;
}

// Input frame format for encoder (simplified for initial implementation)
export interface EncodedFrame {
  readonly width?: number;
  readonly height?: number;
  readonly format?: number;
  readonly pts?: number;
  readonly channels?: number;
  readonly sampleRate?: number;
  readonly samplesPerChannel?: number;
}

// Common codec IDs (subset of AVCodecID)
export const CodecId = {
  // Video codecs
  H264: 27,
  H265: 173,
  VP8: 139,
  VP9: 167,
  AV1: 225,
  MPEG4: 12,
  MPEG2: 2,

  // Audio codecs
  AAC: 86018,
  MP3: 86017,
  OPUS: 86076,
  VORBIS: 86021,
  AC3: 86019,
  FLAC: 86028,
  PCM_S16LE: 65536,
  PCM_F32LE: 65557
} as const;

// Common pixel formats (subset of AVPixelFormat)
export const PixelFormat = {
  YUV420P: 0,
  RGB24: 2,
  BGR24: 3,
  YUV422P: 4,
  YUV444P: 5,
  RGBA: 26,
  BGRA: 27,
  NV12: 23,
  NV21: 24
} as const;

// Common sample formats (subset of AVSampleFormat)
export const SampleFormat = {
  NONE: -1,
  U8: 0,
  S16: 1,
  S32: 2,
  FLT: 3,
  DBL: 4,
  U8P: 5,
  S16P: 6,
  S32P: 7,
  FLTP: 8,
  DBLP: 9
} as const;

/**
 * Factory function to create an Encoder instance
 * The returned Encoder can be used with 'using' declaration for automatic cleanup
 * 
 * @example
 * ```typescript
 * // H.264 video encoder
 * using videoEncoder = await createEncoder({
 *   mediaType: 'video',
 *   codecId: CodecId.H264,
 *   width: 1920,
 *   height: 1080,
 *   pixelFormat: PixelFormat.YUV420P,
 *   videoBitrate: 2000000, // 2 Mbps
 *   quality: 23, // CRF
 *   preset: 'medium',
 *   profile: 'high'
 * });
 * 
 * // AAC audio encoder
 * using audioEncoder = await createEncoder({
 *   mediaType: 'audio',
 *   codecId: CodecId.AAC,
 *   channels: 2,
 *   sampleRate: 44100,
 *   sampleFormat: SampleFormat.FLTP,
 *   audioBitrate: 128000 // 128 kbps
 * });
 * 
 * const encodedPackets = await videoEncoder.encode(inputFrame);
 * ```
 */
export async function createEncoder(options: EncoderOptions): Promise<Encoder> {
  const { createEncoderNative } = await import('../playback.js');

  const nativeEncoder = createEncoderNative(options);

  // Initialize the native encoder
  const success = await nativeEncoder.initialize();
  if (!success) {
    nativeEncoder.dispose();
    throw new Error(`Failed to initialize Encoder: ${options.codecId}`);
  }

  return {
    get mediaType() { return nativeEncoder.mediaType; },
    get codecId() { return nativeEncoder.codecId; },
    get codecName() { return nativeEncoder.codecName; },
    get isInitialized() { return nativeEncoder.isInitialized; },
    get framesEncoded() { return nativeEncoder.framesEncoded; },
    get bytesEncoded() { return nativeEncoder.bytesEncoded; },
    get timeBase() { return nativeEncoder.getTimeBase(); },

    getExtradata(): Uint8Array {
      return nativeEncoder.getExtradata();
    },

    getCodecParameters(): CodecParameters {
      return nativeEncoder.getCodecParameters();
    },

    async encode(frame: EncodedFrame): Promise<EncodedPacket[]> {
      return new Promise<EncodedPacket[]>((resolve, reject) => {
        nativeEncoder.encodeAsync(frame, (error: Error | null, packets: EncodedPacket[]) => {
          if (error) {
            reject(error);
          } else {
            resolve(packets);
          }
        });
      });
    },

    async encodeFrameInfo(frame: { framePtr: number; pts?: number }, sourceTimeBase?: { num: number; den: number }): Promise<EncodedPacket[]> {
      if (sourceTimeBase) {
        return nativeEncoder.encodeFrameInfo(frame, sourceTimeBase);
      } else {
        return nativeEncoder.encodeFrameInfo(frame);
      }
    },

    async flush(): Promise<EncodedPacket[]> {
      return nativeEncoder.flush();
    },

    [Symbol.dispose](): void {
      nativeEncoder.dispose();
    }
  };
}

/**
 * Convenience function to test Encoder creation
 * Useful for debugging and validation
 */
export async function validateEncoder(options: EncoderOptions): Promise<{
  valid: boolean;
  error?: string;
  mediaType?: string;
  codecName?: string;
  codecId?: number;
}> {
  try {
    using encoder = await createEncoder(options);

    return {
      valid: true,
      mediaType: encoder.mediaType,
      codecName: encoder.codecName,
      codecId: encoder.codecId
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get list of supported video codecs
 * @returns Object mapping codec names to codec IDs
 */
export function getSupportedVideoCodecs() {
  return {
    'H.264': CodecId.H264,
    'H.265/HEVC': CodecId.H265,
    'VP8': CodecId.VP8,
    'VP9': CodecId.VP9,
    'AV1': CodecId.AV1,
    'MPEG-4': CodecId.MPEG4,
    'MPEG-2': CodecId.MPEG2
  } as const;
}

/**
 * Get list of supported audio codecs
 * @returns Object mapping codec names to codec IDs
 */
export function getSupportedAudioCodecs() {
  return {
    'AAC': CodecId.AAC,
    'MP3': CodecId.MP3,
    'Opus': CodecId.OPUS,
    'Vorbis': CodecId.VORBIS,
    'AC-3': CodecId.AC3,
    'FLAC': CodecId.FLAC,
    'PCM 16-bit': CodecId.PCM_S16LE,
    'PCM 32-bit float': CodecId.PCM_F32LE
  } as const;
} 