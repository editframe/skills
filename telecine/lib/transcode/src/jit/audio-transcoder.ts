import * as path from 'node:path';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import ISOBoxer from 'codem-isoboxer';

import { createVideoSource } from '../pipeline/VideoSource';
import { createEncoder, CodecId, type CodecParameters } from '../pipeline/Encoder';
import { createMuxer, ContainerFormat } from '../pipeline/Muxer';
import { SampleFormat } from '../pipeline/Filter';
import { frameDuration, generateCommandAndDirectivesForSegment } from './calculations';
import { repackageInitSegment } from '@/muxing/repackageFragements';
import type { AudioTranscodeOptions, SegmentInfo } from './transcoder-types';
import { AUDIO_CONSTANTS, STREAMING_CONSTANTS, TIME_CONSTANTS } from './constants';
import { generateSingleSegmentInfo, repackageFragmentedSegment, generateOutputPath } from './segment-utils';
import { execPromise } from '@/util/execPromise';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { UnifiedByteRangeFetcher } from '../async/UnifiedByteRangeFetcher';
import { spawn } from 'node:child_process';

interface AudioEncoder {
  getCodecParameters(): CodecParameters;
  [Symbol.dispose](): void;
}

/**
 * Create audio init segment for fragmented MP4 streaming
 */
async function createAudioInitSegment(
  encoder: AudioEncoder,
  outputDir: string
): Promise<string> {
  const initSegmentPath = generateOutputPath(outputDir, 'audio', 'init', 'audio', true);

  // Create a temporary first segment to generate init from
  const tempMp4Path = path.join(outputDir, 'temp.mp4');

  // Create fragmented MP4 muxer for the temp segment
  using muxer = await createMuxer({
    format: ContainerFormat.MP4,
    filename: tempMp4Path,
    movFlags: 'cmaf+empty_moov+delay_moov',
    audioCodecId: CodecId.AAC,
    audioChannels: AUDIO_CONSTANTS.CHANNELS,
    audioSampleRate: AUDIO_CONSTANTS.SAMPLE_RATE,
    audioSampleFormat: SampleFormat.FLTP,
    audioBitrate: AUDIO_CONSTANTS.BITRATE
  });

  // Add audio stream to muxer
  const codecParams = encoder.getCodecParameters();
  await muxer.addAudioStreamFromEncoder(codecParams, { num: 1, den: AUDIO_CONSTANTS.SAMPLE_RATE });
  await muxer.writeHeader();
  await muxer.finalize();

  // Create init segment from temp MP4
  const tempMp4Buffer = await readFile(tempMp4Path);
  const tempMp4IsoFile = ISOBoxer.parseBuffer(tempMp4Buffer.buffer);

  // CRITICAL FIX: For fragmented MP4s, set duration to 0
  // This is common practice for streaming scenarios where total duration is unknown
  // at init segment creation time. Players will determine actual duration from segments.
  const streamingDurationMs = STREAMING_CONSTANTS.INIT_SEGMENT_DURATION_MS;

  const initSegmentBytes = repackageInitSegment(tempMp4IsoFile, streamingDurationMs);
  await writeFile(initSegmentPath, new Uint8Array(initSegmentBytes));

  // Clean up temp file
  await unlink(tempMp4Path);

  return initSegmentPath;
}

/**
 * Generate AAC segment using FFmpeg with precise timing
 */
async function generateAacSegment(
  inputUrl: string,
  segmentInfo: SegmentInfo,
  outputDir: string,
  segmentId: string | number
): Promise<string> {
  const tempAacPath = path.join(outputDir, `temp-seg${segmentId}.aac`);

  // CRITICAL FIX: Use old signature that matches working prototype exactly
  const [aacCommand, directives] = generateCommandAndDirectivesForSegment(
    inputUrl,
    segmentInfo.index,
    segmentInfo.startTimeUs,
    segmentInfo.endTimeUs,
    segmentInfo.isLast
  );

  // Fix the AAC command to output to our temp path instead of out/segX.aac
  const fixedAacCommand = aacCommand.replace(/out\/seg\d+\.aac/, tempAacPath);

  // Execute FFmpeg command to create seamless AAC segment
  await execPromise(fixedAacCommand);

  // Create concat directive file for precise slicing
  const concatFilePath = path.join(outputDir, `temp-seg${segmentId}-concat.txt`);

  // CRITICAL FIX: Update directive to use correct filename
  const tempAacFilename = path.basename(tempAacPath);
  const fixedDirectives = directives.replace(/file seg\d+\.aac/, `file ${tempAacFilename}`);

  await writeFile(concatFilePath, fixedDirectives);

  return concatFilePath;
}

/**
 * Convert AAC segment to MP4 using FFmpeg concat directives
 */
async function convertAacToMp4(
  concatFilePath: string,
  outputPath: string,
  isFragmented: boolean
): Promise<void> {
  // Use FFmpeg to apply concat directives and create MP4 segment
  const movFlags = isFragmented
    ? 'cmaf+empty_moov+delay_moov'
    : 'faststart';

  const mp4Command = [
    'ffmpeg -hide_banner -loglevel error -nostats -y',
    `-f concat -i "${concatFilePath}"`,
    '-c:a copy -bsf:a aac_adtstoasc',
    isFragmented ? '-f mp4' : '',  // Specify MP4 format for .m4s files
    `-movflags ${movFlags}`,
    `"${outputPath}"`
  ].filter(Boolean).join(' ');

  await execPromise(mp4Command);
}

/**
 * Clean up temporary files created during AAC processing
 */
async function cleanupTempFiles(segmentId: string | number, outputDir: string): Promise<void> {
  const tempAacPath = path.join(outputDir, `temp-seg${segmentId}.aac`);
  const concatFilePath = path.join(outputDir, `temp-seg${segmentId}-concat.txt`);

  await unlink(tempAacPath);
  await unlink(concatFilePath);
}



/**
 * Create audio media segment using FFmpeg processing pipeline
 */
async function createAudioMediaSegment(
  inputUrl: string,
  segmentInfo: SegmentInfo,
  outputDir: string,
  segmentId: string | number,
  isFragmented: boolean
): Promise<string> {
  const outputPath = generateOutputPath(outputDir, 'audio', segmentId, 'audio', isFragmented, !isFragmented);

  // IMPLEMENTATION GUIDELINES: Perfect seamless audio requires working with original encoded bitstream
  // Use FFmpeg to create perfectly sliced AAC segments, then package into MP4

  // Generate AAC segment with precise timing
  const concatFilePath = await generateAacSegment(inputUrl, segmentInfo, outputDir, segmentId);

  // Convert AAC to MP4 using concat directives
  await convertAacToMp4(concatFilePath, outputPath, isFragmented);

  // Clean up temporary files
  await cleanupTempFiles(segmentId, outputDir);

  // If this is a fragmented segment, repackage it
  if (isFragmented) {
    // Calculate extra frame duration for audio timing adjustment
    const extraFrameDurationMs = frameDuration() / TIME_CONSTANTS.MICROSECONDS_PER_MILLISECOND; // Convert microseconds to milliseconds
    await repackageFragmentedSegment(outputPath, segmentInfo, segmentInfo.index, extraFrameDurationMs);
  }

  return outputPath;
}

// Placeholder implementation for MP3 to MP4 conversion
// This should be replaced with actual FFmpeg-based implementation

export async function convertMp3ToMp4(mp3Url: string): Promise<Buffer> {
  // Create a simple TempFile implementation
  class TempFile {
    private _path: string;

    constructor(prefix = 'mp3-conversion', extension = '.tmp') {
      this._path = path.join(tmpdir(), `${prefix}-${randomUUID()}${extension}`);
    }

    get path(): string {
      return this._path;
    }

    async readAsBuffer(): Promise<Buffer> {
      return readFile(this._path);
    }

    async cleanup(): Promise<void> {
      try {
        await unlink(this._path);
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

  try {
    // Step 1: Download the entire MP3 file
    const fetcher = new UnifiedByteRangeFetcher();
    const fetchResult = await fetcher.fetchByteRange({
      url: mp3Url,
    });

    if (!fetchResult.success) {
      throw new Error(`Failed to download MP3 file: ${fetchResult.error}`);
    }

    // Step 2: Create temporary files
    using inputFile = new TempFile('mp3-input', '.mp3');
    using outputFile = new TempFile('mp4-output', '.mp4');

    // Write MP3 data to input file
    await writeFile(inputFile.path, fetchResult.data);

    // Step 3: Convert MP3 to MP4 using FFmpeg
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputFile.path,           // Input MP3 file
        '-c:a', 'aac',                  // Convert to AAC audio codec
        '-b:a', '128k',                 // Set bitrate to 128kbps
        '-ac', '2',                     // Force stereo (2 channels)
        '-ar', '48000',                 // Set sample rate to 48kHz
        '-movflags', '+faststart',      // Optimize for streaming (moov atom at beginning)
        '-f', 'mp4',                    // Force MP4 format
        '-y',                           // Overwrite output file if exists
        outputFile.path                 // Output MP4 file
      ]);

      let stderr = '';

      // Collect stderr for error reporting
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg conversion failed with code ${code}: ${stderr}`));
        } else {
          resolve();
        }
      });

      // Handle process errors
      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg process error: ${error.message}`));
      });
    });

    // Step 4: Read the converted MP4 file
    const mp4Buffer = await outputFile.readAsBuffer();

    return mp4Buffer;

  } catch (error) {
    console.error(`Failed to convert MP3 to MP4: ${mp3Url}`, error);
    throw error;
  }
}

export async function transcodeAudioSegment(options: AudioTranscodeOptions): Promise<string> {
  const { inputUrl, segmentId, segmentDurationMs: segmentDuration, outputDir } = options;

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Create VideoSource with metadata
  using source = await createVideoSource({
    url: inputUrl,
    syntheticMp4: options.syntheticMp4
  });

  const duration = source.durationMs / TIME_CONSTANTS.MILLISECONDS_PER_SECOND;

  // Find audio stream
  const audioStream = source.streams.find(s => s.codecType === 'audio');
  if (!audioStream) {
    throw new Error('No audio stream found');
  }

  // Create encoder first so we can use it for init segment
  using encoder = await createEncoder({
    mediaType: 'audio',
    codecId: CodecId.AAC,
    channels: AUDIO_CONSTANTS.CHANNELS,
    sampleRate: AUDIO_CONSTANTS.SAMPLE_RATE,
    sampleFormat: SampleFormat.FLTP,
    audioBitrate: AUDIO_CONSTANTS.BITRATE,
    timeBase: { num: 1, den: AUDIO_CONSTANTS.SAMPLE_RATE }
  });

  // Handle init segment
  if (segmentId === 'init') {
    return await createAudioInitSegment(encoder, outputDir);
  }

  // Handle media segment
  const segmentIndex = Number(segmentId) - 1; // Convert to 0-based index
  const segmentInfo = generateSingleSegmentInfo(
    segmentIndex,
    duration,
    segmentDuration,
    AUDIO_CONSTANTS.FRAME_PADDING_MULTIPLIER,
    true, // duration is in seconds for audio
    true  // use aligned times for audio
  );
  const isFragmented = options.isFragmented !== false;

  return await createAudioMediaSegment(
    inputUrl,
    segmentInfo,
    outputDir,
    segmentId,
    isFragmented
  );
}

