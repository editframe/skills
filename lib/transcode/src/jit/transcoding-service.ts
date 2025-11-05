
import { createVideoSource } from '../pipeline/VideoSource';
import { transcodeAudioSegment } from './audio-transcoder';
import { transcodeVideoSegment } from './video-transcoder';
import { type TranscodeOptions, isAudioRendition, isVideoRendition } from './transcoder-types';
import { cacheMetadataFilePath } from '@/util/filePaths';
import { storageProvider } from '@/util/storageProvider.server';
import { buildFakeMp4WithPreservedStructure, fetchMoovAndFtypUnified } from '../moovScanner';

export interface QualityConfig {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
  videoCodec: string;
  audioCodec: string;
}

export const RENDITION_CONFIGS: Record<string, QualityConfig> = {
  high: {
    name: 'high',
    width: 1920,
    height: 1080,
    videoBitrate: '4000k',
    audioBitrate: '128k',
    videoCodec: 'libx264',
    audioCodec: 'aac'
  },
  medium: {
    name: 'medium',
    width: 1280,
    height: 720,
    videoBitrate: '2000k',
    audioBitrate: '96k',
    videoCodec: 'libx264',
    audioCodec: 'aac'
  },
  low: {
    name: 'low',
    width: 854,
    height: 480,
    videoBitrate: '800k',
    audioBitrate: '64k',
    videoCodec: 'libx264',
    audioCodec: 'aac'
  },
  scrub: {
    name: 'scrub',
    width: 320,
    height: 180,
    videoBitrate: '100k',
    audioBitrate: '0k',
    videoCodec: 'libx264',
    audioCodec: ''
  },
  audio: {
    name: 'audio',
    width: 0,
    height: 0,
    videoBitrate: '0k',
    audioBitrate: '128k',
    videoCodec: '',
    audioCodec: 'aac'
  }
};

/**
 * Calculate aspect-ratio-preserving dimensions for transcoding
 * Uses the longer dimension from the rendition config as the constraint
 */
export function calculateAspectRatioDimensions(
  sourceWidth: number,
  sourceHeight: number,
  rendition: string
): { width: number; height: number } {
  const config = RENDITION_CONFIGS[rendition];
  if (!config || config.width === 0 || config.height === 0) {
    return { width: sourceWidth, height: sourceHeight };
  }

  const sourceAspectRatio = sourceWidth / sourceHeight;
  const isPortrait = sourceHeight > sourceWidth;

  const maxDimension = Math.max(config.width, config.height);

  let targetWidth: number;
  let targetHeight: number;

  if (isPortrait) {
    targetHeight = maxDimension;
    targetWidth = Math.round(targetHeight * sourceAspectRatio);
  } else {
    targetWidth = maxDimension;
    targetHeight = Math.round(targetWidth / sourceAspectRatio);
  }

  targetWidth = targetWidth - (targetWidth % 2);
  targetHeight = targetHeight - (targetHeight % 2);

  return { width: targetWidth, height: targetHeight };
}

/**
 * Convert a readable stream to buffer
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get or fetch cached video metadata (synthetic MP4) using storage provider.
 * This provides persistent caching across server restarts and instances.
 */
async function getOrFetchMetadata(url: string): Promise<ArrayBuffer> {
  const cacheKey = cacheMetadataFilePath({ url });

  try {
    // Check if metadata exists in cache
    const cacheExists = await storageProvider.pathExists(cacheKey);

    if (cacheExists) {
      console.log(`Metadata cache HIT for: ${url}`);
      // Read cached synthetic MP4 using stream
      const cachedStream = await storageProvider.createReadStream(cacheKey);
      const cachedBuffer = await streamToBuffer(cachedStream);
      // Convert to ArrayBuffer
      const result = new ArrayBuffer(cachedBuffer.length);
      new Uint8Array(result).set(cachedBuffer);
      return result;
    }
  } catch (cacheError) {
    console.warn(`Error reading metadata cache for ${url}:`, cacheError);
    // Fall through to fetch metadata
  }

  console.log(`Metadata cache MISS for: ${url} - fetching from source`);

  const moovResult = await fetchMoovAndFtypUnified(url);

  if (!moovResult.ftyp || !moovResult.moov) {
    throw new Error(`Failed to fetch video metadata for: ${url}`);
  }

  // Use intervening boxes to preserve exact file structure
  const interveningBoxes = moovResult.interveningBoxes || new Uint8Array(0);

  console.log(`[Metadata] Building synthetic MP4 with preserved structure. Intervening boxes: ${interveningBoxes.length} bytes`);

  const syntheticMp4 = buildFakeMp4WithPreservedStructure(
    moovResult.ftyp,
    moovResult.moov,
    interveningBoxes
  );

  // Cache the synthetic MP4 for future use
  try {
    await storageProvider.writeFile(cacheKey, Buffer.from(syntheticMp4), {
      contentType: 'video/mp4'
    });
    console.log(`Cached metadata for: ${url} at ${cacheKey}`);
  } catch (cacheError) {
    console.warn(`Error caching metadata for ${url}:`, cacheError);
    // Continue even if caching fails
  }



  // Ensure we return ArrayBuffer, not ArrayBufferLike
  const result = new ArrayBuffer(syntheticMp4.byteLength);
  new Uint8Array(result).set(new Uint8Array(syntheticMp4));
  return result;
}

export async function getFileDuration(filePath: string): Promise<number> {
  const videoSource = await createVideoSource({
    url: filePath,
  });
  return videoSource.durationMs / 1000;
}

/**
 * Get file duration using cached metadata.
 * This avoids repeated metadata fetching for manifest generation.
 */
export async function getFileDurationWithCaching(url: string): Promise<number> {
  // Get cached metadata - this will use storage provider cache
  const syntheticMp4 = await getOrFetchMetadata(url);

  // Create video source using cached metadata
  const videoSource = await createVideoSource({
    url,
    syntheticMp4
  });

  return videoSource.durationMs / 1000;
}

/**
 * Detect which track types (audio/video) exist in a source file
 */
export async function detectAvailableTracks(url: string): Promise<{
  hasAudio: boolean;
  hasVideo: boolean;
}> {
  // Get cached metadata - this will use storage provider cache
  const syntheticMp4 = await getOrFetchMetadata(url);

  // Create video source using cached metadata
  using videoSource = await createVideoSource({
    url,
    syntheticMp4
  });

  const hasAudio = videoSource.streams.some(s => s.codecType === 'audio');
  const hasVideo = videoSource.streams.some(s => s.codecType === 'video');

  return { hasAudio, hasVideo };
}

export async function transcodeSegment(options: TranscodeOptions): Promise<string> {
  const { inputUrl, rendition, segmentDurationMs, outputDir, segmentId, isFragmented } = options;
  const renditionConfig = RENDITION_CONFIGS[rendition];

  if (!renditionConfig) {
    throw new Error(`Invalid rendition: ${rendition}`);
  }

  const syntheticMp4 = await getOrFetchMetadata(inputUrl);

  if (isAudioRendition(rendition)) {
    return transcodeAudioSegment({
      inputUrl,
      segmentId,
      segmentDurationMs,
      outputDir,
      rendition: 'audio',
      syntheticMp4,
      isFragmented
    });
  }

  if (isVideoRendition(rendition)) {
    return transcodeVideoSegment({
      inputUrl,
      segmentId,
      segmentDurationMs,
      outputDir,
      rendition,
      isScrubTrack: rendition === 'scrub',
      syntheticMp4,
      isFragmented
    });
  }

  throw new Error(`Unsupported rendition type: ${rendition}`);
}
