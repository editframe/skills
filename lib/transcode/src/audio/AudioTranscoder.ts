import { UnifiedByteRangeFetcher } from '../async/UnifiedByteRangeFetcher.js';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';

/**
 * Audio transcoding result
 */
export interface AudioTranscodeResult {
  success: boolean;
  outputData: Uint8Array;
  actualStartTimeMs: number;
  actualDurationMs: number;
  error?: string;
  audioInfo?: {
    sourceCodec: string;
    targetCodec: string;
    channels: number;
    sampleRate: number;
    bitrate: number;
  };
}

/**
 * Audio metadata information
 */
export interface AudioMetadata {
  durationMs: number;
  codec: string;
  channels: number;
  sampleRate: number;
  bitrate?: number;
}

/**
 * Temporary file helper with automatic cleanup
 */
class TempFile {
  private _path: string;

  constructor(prefix = 'transcode/audio', extension = '.tmp') {
    this._path = path.join(os.tmpdir(), `${prefix}-${crypto.randomUUID()}${extension}`);
  }

  get path(): string {
    return this._path;
  }

  async readAsUint8Array(): Promise<Uint8Array> {
    const buffer = await fs.readFile(this._path);
    return new Uint8Array(buffer);
  }

  async cleanup(): Promise<void> {
    try {
      await fs.unlink(this._path);
    } catch {
      // Ignore cleanup errors
    }
  }

  [Symbol.dispose](): void {
    this.cleanup().catch(() => {
      // Ignore cleanup errors in disposal
    });
  }
}

/**
 * Simplified audio transcoder using FFmpeg subprocess
 * 
 * This approach avoids the complexity of the JitTranscoder pipeline
 * and provides a clean solution specifically for MP3-to-MP4 transcoding.
 */
export class AudioTranscoder {
  private constructor() { }

  /**
   * Extract metadata from an audio file using FFmpeg
   */
  static async extractMetadata(url: string): Promise<AudioMetadata> {
    // Download the audio file first
    const fetcher = new UnifiedByteRangeFetcher();

    // For MP3 metadata, we need the whole file to be accurate
    const fetchResult = await fetcher.fetchByteRange({
      url,
      startByte: 0,
      endByte: -1 // Full file
    });

    if (!fetchResult.success) {
      throw new Error(`Failed to download audio file: ${fetchResult.error}`);
    }

    // Write to temporary file
    using tempFile = new TempFile('metadata', '.mp3');
    await fs.writeFile(tempFile.path, fetchResult.data);

    // Use FFprobe to extract metadata
    // This is a load-bearing await. If we return the promise before awaiting it, the tempfile will be deleted before the promise is resolved.
    // this is because we're using `using` to declare the tempfile, which is a scoped variable.
    return await new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-print_format', 'json',
        '-show_streams',
        '-show_format',
        tempFile.path
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          console.error("FFprobe failed:", stderr);
          reject(new Error("Failed to extract metadata for audio file."));
          return;
        }

        try {
          const info = JSON.parse(stdout);
          const audioStream = info.streams?.find((s: any) => s.codec_type === 'audio');

          if (!audioStream) {
            reject(new Error('No audio stream found'));
            return;
          }

          const durationSeconds = Number.parseFloat(info.format?.duration || audioStream.duration || '0');

          resolve({
            durationMs: Math.round(durationSeconds * 1000),
            codec: audioStream.codec_name || 'unknown',
            channels: Number.parseInt(audioStream.channels || '2', 10),
            sampleRate: Number.parseInt(audioStream.sample_rate || '48000', 10),
            bitrate: Number.parseInt(audioStream.bit_rate || info.format?.bit_rate || '0', 10)
          });
        } catch (parseError) {
          reject(new Error(`Failed to parse FFprobe output: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
        }
      });
    });
  }

  /**
   * Transcode an audio segment to MP4/AAC using FFmpeg
   */
  static async transcodeSegment(
    url: string,
    startTimeMs: number,
    durationMs: number,
    targetBitrate = 128000,
    targetChannels = 2,
    targetSampleRate = 48000
  ): Promise<AudioTranscodeResult> {
    const result: AudioTranscodeResult = {
      success: false,
      outputData: new Uint8Array(0),
      actualStartTimeMs: startTimeMs,
      actualDurationMs: durationMs
    };

    try {
      // Step 1: Download the entire audio file
      const fetcher = new UnifiedByteRangeFetcher();
      const fetchResult = await fetcher.fetchByteRange({
        url,
        startByte: 0,
        endByte: -1
      });

      if (!fetchResult.success) {
        throw new Error(`Failed to download audio file: ${fetchResult.error}`);
      }

      // Step 2: Create temporary files
      using inputFile = new TempFile('input', '.mp3');
      using outputFile = new TempFile('output', '.mp4');

      await fs.writeFile(inputFile.path, fetchResult.data);

      // Step 3: Run FFmpeg to transcode the segment
      const startSeconds = startTimeMs / 1000;
      const durationSeconds = durationMs / 1000;

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', inputFile.path,
          '-ss', startSeconds.toString(),
          '-t', durationSeconds.toString(),
          '-c:a', 'aac',
          '-b:a', `${targetBitrate}`,
          '-ac', targetChannels.toString(),
          '-ar', targetSampleRate.toString(),
          '-movflags', '+faststart',
          '-y', // Overwrite output file
          outputFile.path
        ]);

        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`FFmpeg failed: ${stderr}`));
          } else {
            resolve();
          }
        });
      });

      // Step 4: Read the output
      result.outputData = await outputFile.readAsUint8Array();
      result.success = true;
      result.audioInfo = {
        sourceCodec: 'mp3',
        targetCodec: 'aac',
        channels: targetChannels,
        sampleRate: targetSampleRate,
        bitrate: targetBitrate
      };

      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * High-level convenience function for MP3-to-MP4 transcoding
   */
  static async transcodeMp3Segment(
    url: string,
    startTimeMs: number,
    durationMs = 15000,
    quality: 'medium' = 'medium'
  ): Promise<AudioTranscodeResult> {
    // Quality presets
    const qualityPresets = {
      medium: {
        bitrate: 128000,
        channels: 2,
        sampleRate: 48000
      }
    };

    const preset = qualityPresets[quality];

    return AudioTranscoder.transcodeSegment(
      url,
      startTimeMs,
      durationMs,
      preset.bitrate,
      preset.channels,
      preset.sampleRate
    );
  }
} 