/**
 * Muxer Component - Container Format Muxing
 * Multiplexes encoded video and audio packets into container formats like MP4, WebM, MKV, etc.
 */

import { createMuxerNative } from '../playback.js';
import type { CodecParameters } from './Encoder.js';

// Time base rational number
export interface Rational {
  num: number;
  den: number;
}

// Container format constants
export const ContainerFormat = {
  MP4: 'mp4',
  MOV: 'mov',
  WEBM: 'webm',
  MKV: 'matroska',  // Correct FFmpeg format name for MKV
  AVI: 'avi',
  FLV: 'flv',
  M4V: 'm4v',
  _3GP: '3gp',
  TS: 'mpegts',
  MXF: 'mxf',
  ADTS: 'adts',     // ADTS AAC format for precise audio timing
  WAV: 'wav'        // WAV format for uncompressed audio
} as const;

export type ContainerFormatType = typeof ContainerFormat[keyof typeof ContainerFormat];

// Codec ID constants (reused from Encoder)
export const CodecId = {
  // Video codecs
  H264: 27,
  H265: 173,
  VP8: 139,
  VP9: 167,
  AV1: 225,
  MPEG4: 12,
  MPEG2: 2,
  THEORA: 30,
  // Audio codecs
  AAC: 86018,
  MP3: 86017,
  OPUS: 86076,
  VORBIS: 86021,
  AC3: 86019,
  FLAC: 86028,
  PCM: 65536
} as const;

// Pixel format constants (reused from Encoder)
export const PixelFormat = {
  YUV420P: 0,
  YUYV422: 1,
  RGB24: 2,
  BGR24: 3,
  YUV422P: 4,
  YUV444P: 5,
  YUV410P: 6,
  YUV411P: 7,
  GRAY8: 8,
  NV12: 23,
  NV21: 24,
  ARGB: 25,
  RGBA: 26,
  ABGR: 27,
  BGRA: 28
} as const;

// Sample format constants (reused from Encoder)
export const SampleFormat = {
  U8: 0,
  S16: 1,
  S32: 5,
  FLT: 3,
  DBL: 4,
  U8P: 6,
  S16P: 7,
  S32P: 10,
  FLTP: 8,
  DBLP: 9
} as const;

// Muxer configuration options
export interface MuxerOptions {
  // Required: Container format and output
  format: ContainerFormatType;
  filename: string;

  // Video stream options (optional, if video stream will be added)
  videoCodecId?: number;
  videoWidth?: number;
  videoHeight?: number;
  videoFrameRate?: Rational;
  videoTimeBase?: Rational;
  videoBitrate?: number;
  videoPixelFormat?: number;

  // Audio stream options (optional, if audio stream will be added)
  audioCodecId?: number;
  audioChannels?: number;
  audioSampleRate?: number;
  audioSampleFormat?: number;
  audioTimeBase?: Rational;
  audioBitrate?: number;

  // Container-specific options
  fastStart?: boolean;         // Move moov atom to beginning (MP4)
  fragmentDuration?: number;   // Fragment duration in microseconds (fragmented MP4)
  movFlags?: string;          // MP4 muxer flags

  // Metadata
  title?: string;
  artist?: string;
  album?: string;
  comment?: string;
  copyright?: string;
  description?: string;
}

// Video stream configuration
export interface VideoStreamConfig {
  codecId: number;
  width: number;
  height: number;
  frameRate: Rational;
  timeBase: Rational;
  bitrate?: number;
  pixelFormat?: number;
  extradata?: Uint8Array;     // Codec-specific data (e.g., SPS/PPS for H.264)
}

// Audio stream configuration
export interface AudioStreamConfig {
  codecId: number;
  channels: number;
  sampleRate: number;
  timeBase: Rational;
  bitrate?: number;
  sampleFormat?: number;
  extradata?: Uint8Array;     // Codec-specific data for preserving metadata like AAC profile
}

// Input packet for muxing
export interface InputPacket {
  data: Uint8Array;
  pts: number;
  dts?: number;
  streamIndex: number;        // 0 for video, 1 for audio
  duration?: number;
  flags?: number;             // Packet flags (keyframe, etc.)
  sourceTimeBase?: Rational;  // Timebase of the source (encoder) for proper rescaling
}

// Muxer statistics
export interface MuxerStats {
  videoPacketsWritten: number;
  audioPacketsWritten: number;
  totalBytesWritten: number;
  videoDuration: number;      // in seconds
  audioDuration: number;      // in seconds
  isFinalized: boolean;
}

// Validation result
export interface MuxerValidationResult {
  valid: boolean;
  format?: ContainerFormatType;
  filename?: string;
  hasVideoStream?: boolean;
  hasAudioStream?: boolean;
  error?: string;
}

// Native muxer interface
interface MuxerNative {
  initialize(options: MuxerOptions): boolean;
  addVideoStream(config: VideoStreamConfig): boolean;
  addAudioStream(config: AudioStreamConfig): boolean;
  addVideoStreamFromEncoder(codecParams: any, timeBase: Rational, frameRate: Rational): boolean;
  addAudioStreamFromEncoder(codecParams: any, timeBase: Rational): boolean;
  writeHeader(): boolean;
  writePacketAsync(packet: InputPacket, callback: (error: Error | null, success: boolean) => void): void;
  finalize(): boolean;
  dispose(): void;

  readonly isInitialized: boolean;
  readonly hasVideoStream: boolean;
  readonly hasAudioStream: boolean;
  readonly format: string;
  readonly filename: string;
  readonly stats: MuxerStats;
}

// High-level Muxer interface
export interface Muxer {
  readonly format: ContainerFormatType;
  readonly filename: string;
  readonly isInitialized: boolean;
  readonly hasVideoStream: boolean;
  readonly hasAudioStream: boolean;
  readonly stats: MuxerStats;

  // Stream management
  addVideoStream(config: VideoStreamConfig): Promise<boolean>;
  addAudioStream(config: AudioStreamConfig): Promise<boolean>;
  addVideoStreamFromEncoder(codecParams: CodecParameters, timeBase: Rational, frameRate: Rational): Promise<boolean>;
  addAudioStreamFromEncoder(codecParams: CodecParameters, timeBase: Rational): Promise<boolean>;
  writeHeader(): Promise<boolean>;

  // Packet writing
  writePacket(packet: InputPacket): Promise<boolean>;

  // Finalization
  finalize(): Promise<boolean>;

  // Resource management
  [Symbol.dispose](): void;
}

// Implementation class
class MuxerImpl implements Muxer {
  private native: MuxerNative;
  private disposed = false;

  constructor(native: MuxerNative) {
    this.native = native;
  }

  get format(): ContainerFormatType {
    return this.native.format as ContainerFormatType;
  }

  get filename(): string {
    return this.native.filename;
  }

  get isInitialized(): boolean {
    return this.native.isInitialized;
  }

  get hasVideoStream(): boolean {
    return this.native.hasVideoStream;
  }

  get hasAudioStream(): boolean {
    return this.native.hasAudioStream;
  }

  get stats(): MuxerStats {
    return this.native.stats;
  }

  async addVideoStream(config: VideoStreamConfig): Promise<boolean> {
    if (this.disposed) {
      throw new Error('Muxer has been disposed');
    }
    return this.native.addVideoStream(config);
  }

  async addAudioStream(config: AudioStreamConfig): Promise<boolean> {
    if (this.disposed) {
      throw new Error('Muxer has been disposed');
    }
    return this.native.addAudioStream(config);
  }

  async addVideoStreamFromEncoder(codecParams: CodecParameters, timeBase: Rational, frameRate: Rational): Promise<boolean> {
    if (this.disposed) {
      throw new Error('Muxer has been disposed');
    }
    return this.native.addVideoStreamFromEncoder(codecParams, timeBase, frameRate);
  }

  async addAudioStreamFromEncoder(codecParams: CodecParameters, timeBase: Rational): Promise<boolean> {
    if (this.disposed) {
      throw new Error('Muxer has been disposed');
    }
    return this.native.addAudioStreamFromEncoder(codecParams, timeBase);
  }

  async writeHeader(): Promise<boolean> {
    if (this.disposed) {
      throw new Error('Muxer has been disposed');
    }
    return this.native.writeHeader();
  }

  async writePacket(packet: InputPacket): Promise<boolean> {
    if (this.disposed) {
      throw new Error('Muxer has been disposed');
    }
    return new Promise<boolean>((resolve, reject) => {
      this.native.writePacketAsync(packet, (error: Error | null, success: boolean) => {
        if (error) {
          reject(error);
        } else {
          resolve(success);
        }
      });
    });
  }

  async finalize(): Promise<boolean> {
    if (this.disposed) {
      throw new Error('Muxer has been disposed');
    }
    return this.native.finalize();
  }

  [Symbol.dispose](): void {
    if (!this.disposed) {
      this.native.dispose();
      this.disposed = true;
    }
  }
}

/**
 * Create a new Muxer instance
 * 
 * @param options - Muxer configuration options
 * @returns Promise resolving to a Muxer instance
 * 
 * @example
 * ```typescript
 * // MP4 with H.264 video and AAC audio
 * using muxer = await createMuxer({
 *   format: ContainerFormat.MP4,
 *   filename: 'output.mp4',
 *   fastStart: true
 * });
 * 
 * // Add video stream
 * await muxer.addVideoStream({
 *   codecId: CodecId.H264,
 *   width: 1920,
 *   height: 1080,
 *   frameRate: { num: 30, den: 1 },
 *   timeBase: { num: 1, den: 30 },
 *   bitrate: 2000000
 * });
 * 
 * // Add audio stream
 * await muxer.addAudioStream({
 *   codecId: CodecId.AAC,
 *   channels: 2,
 *   sampleRate: 44100,
 *   timeBase: { num: 1, den: 44100 },
 *   bitrate: 128000
 * });
 * 
 * // Write header
 * await muxer.writeHeader();
 * 
 * // Write packets...
 * await muxer.writePacket({
 *   data: encodedVideoData,
 *   pts: timestamp,
 *   streamIndex: 0, // video
 *   flags: 1 // keyframe
 * });
 * 
 * // Finalize
 * await muxer.finalize();
 * ```
 */
export async function createMuxer(options: MuxerOptions): Promise<Muxer> {
  const native = createMuxerNative() as MuxerNative;

  const success = native.initialize(options);
  if (!success) {
    native.dispose();
    throw new Error('Failed to initialize Muxer');
  }

  return new MuxerImpl(native);
}

/**
 * Validate muxer configuration without creating a muxer
 * 
 * @param options - Muxer options to validate
 * @returns Promise resolving to validation result
 */
export async function validateMuxer(options: MuxerOptions): Promise<MuxerValidationResult> {
  try {
    using muxer = await createMuxer(options);

    return {
      valid: true,
      format: muxer.format,
      filename: muxer.filename,
      hasVideoStream: muxer.hasVideoStream,
      hasAudioStream: muxer.hasAudioStream
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get supported container formats
 * 
 * @returns Object mapping format names to format strings
 */
export function getSupportedFormats(): Record<string, string> {
  return ContainerFormat;
}

/**
 * Create rational number for frame rates and time bases
 * 
 * @param num - Numerator
 * @param den - Denominator
 * @returns Rational number
 */
export function createRational(num: number, den: number): Rational {
  return { num, den };
}

/**
 * Convert frame rate to rational
 * 
 * @param fps - Frames per second
 * @returns Rational representation
 */
export function fpsToRational(fps: number): Rational {
  // Handle common frame rates
  if (fps === 23.976) return { num: 24000, den: 1001 };
  if (fps === 29.97) return { num: 30000, den: 1001 };
  if (fps === 59.94) return { num: 60000, den: 1001 };

  // For integer frame rates
  if (Number.isInteger(fps)) {
    return { num: fps, den: 1 };
  }

  // For decimal frame rates, multiply by 1000 and simplify
  const num = Math.round(fps * 1000);
  const den = 1000;
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(num, den);

  return { num: num / divisor, den: den / divisor };
}

/**
 * Create time base for given sample rate
 * 
 * @param sampleRate - Audio sample rate in Hz
 * @returns Time base rational
 */
export function sampleRateToTimeBase(sampleRate: number): Rational {
  return { num: 1, den: sampleRate };
} 