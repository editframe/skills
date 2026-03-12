import * as crypto from "node:crypto";
import { storageProvider } from "@/util/storageProvider.server";
import { getFileDuration } from "@/transcode/src/jit/transcoding-service";
import { convertMp3ToMp4 } from "@/transcode/src/jit/audio-transcoder";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { createWriteStream } from "node:fs";
import { calculateSegmentDurations } from "@/transcode/src/jit/calculateSegmentDurations";

// Helper to generate cache key for MP3 → MP4 conversion
export function generateMp3ConversionCacheKey(originalMp3Url: string): string {
  const urlHash = crypto.createHash("md5").update(originalMp3Url).digest("hex");
  return `mp3-conversions/${urlHash}.mp4`;
}

// Helper to convert MP3 to MP4 and cache the result
export async function convertMp3ToMp4AndCache(mp3Url: string): Promise<string> {
  const cacheKey = generateMp3ConversionCacheKey(mp3Url);

  // Check if conversion already exists in storage provider
  const cacheExists = await storageProvider.pathExists(cacheKey);

  if (cacheExists) {
    console.log(`MP3 conversion cache hit: ${mp3Url}`);
    return cacheKey;
  }

  console.log(`Converting MP3 to MP4: ${mp3Url}`);

  try {
    // Convert MP3 to MP4
    const mp4Buffer = await convertMp3ToMp4(mp3Url);

    // Store in storage provider instead of local disk
    await storageProvider.writeFile(cacheKey, mp4Buffer, {
      contentType: "video/mp4",
    });

    console.log(`Cached MP3 conversion: ${cacheKey}`);
    return cacheKey;
  } catch (error) {
    console.error(`Failed to convert MP3 to MP4: ${mp3Url}`, error);
    throw error;
  }
}

// Helper to resolve the effective URL for transcoding
// For MP3 URLs: downloads cached MP4 to temp file and returns file path
// For other URLs: returns original URL unchanged
export async function resolveEffectiveTranscodingUrl(
  originalUrl: string,
): Promise<string> {
  if (!isMP3Url(originalUrl)) {
    return originalUrl;
  }

  const cacheKey = generateMp3ConversionCacheKey(originalUrl);

  // Check if conversion exists in storage provider
  const cacheExists = await storageProvider.pathExists(cacheKey);

  if (!cacheExists) {
    throw new Error(
      `MP3 conversion not found. Call manifest endpoint first: ${originalUrl}`,
    );
  }

  // Download cached MP4 to temporary file for transcoding
  const tempDir = path.join(os.tmpdir(), "mp3-transcoding");
  await fs.mkdir(tempDir, { recursive: true });

  const urlHash = crypto.createHash("md5").update(originalUrl).digest("hex");
  const tempFilePath = path.join(tempDir, `${urlHash}.mp4`);

  // Check if temp file already exists and is recent (avoid re-downloading)
  try {
    const stats = await fs.stat(tempFilePath);
    const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
    if (ageMinutes < 60) {
      // Reuse temp file if less than 1 hour old
      console.log(`Reusing cached MP4 temp file: ${tempFilePath}`);
      return tempFilePath;
    }
  } catch {
    // File doesn't exist, continue with download
  }

  console.log(
    `Downloading cached MP4 for transcoding: ${cacheKey} -> ${tempFilePath}`,
  );

  try {
    // Download from storage provider to temp file
    const cachedStream = await storageProvider.createReadStream(cacheKey);
    const writeStream = createWriteStream(tempFilePath);

    await new Promise<void>((resolve, reject) => {
      cachedStream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      cachedStream.on("error", reject);
    });

    return tempFilePath;
  } catch (error) {
    console.error(`Failed to download cached MP4: ${cacheKey}`, error);
    throw new Error(
      `Failed to access cached MP4 for transcoding: ${originalUrl}`,
    );
  }
}

// Helper to generate MP3 manifest
export async function generateMp3Manifest(mp3Url: string, baseUrl: string) {
  // Ensure MP3 is converted to MP4 and cached
  await convertMp3ToMp4AndCache(mp3Url);

  // Get a local file path for duration extraction (downloads from storage provider to temp file)
  const localMp4Path = await resolveEffectiveTranscodingUrl(mp3Url);

  // Get duration from the local MP4 file using the correct function for local files
  const duration = await getFileDuration(localMp4Path);
  const durationMs = duration * 1000;

  // Calculate AAC frame-aligned segment durations (returns milliseconds)
  const targetSegmentDurationMs = 15000; // 15 seconds target
  const audioSegmentDurations = calculateSegmentDurations(
    durationMs,
    targetSegmentDurationMs,
    {
      mediaType: "audio",
    },
  );

  return {
    version: "1.0",
    type: "jit-audio",
    sourceUrl: mp3Url, // Always use original MP3 URL
    duration: duration,
    durationMs: durationMs,
    baseUrl: baseUrl,

    // Audio-only renditions for MP3
    videoRenditions: [], // No video for MP3
    audioRenditions: [
      {
        id: "audio",
        channels: 2,
        sampleRate: 48000,
        bitrate: 128000,
        codec: "mp4a.40.2", // AAC-LC
        container: "audio/mp4",
        mimeType: 'audio/mp4; codecs="mp4a.40.2"',
        segmentDuration: 15, // 15 seconds target
        segmentDurationMs: targetSegmentDurationMs,
        segmentDurationsMs: audioSegmentDurations,
        language: "en",
      },
    ],

    // Segment URL templates use ORIGINAL MP3 URL - no internal paths exposed
    endpoints: {
      initSegment: `${baseUrl}/api/v1/transcode/{rendition}/init.m4s?url=${encodeURIComponent(mp3Url)}`,
      mediaSegment: `${baseUrl}/api/v1/transcode/{rendition}/{segmentId}.m4s?url=${encodeURIComponent(mp3Url)}`,
    },

    jitInfo: {
      parallelTranscodingSupported: true,
      expectedTranscodeLatency: 100, // Faster for pre-converted MP3s
      segmentCount: audioSegmentDurations.length,
    },
  };
}

// Helper to detect if a URL is an MP3 file
export function isMP3Url(url: string): boolean {
  return url.toLowerCase().endsWith(".mp3");
}

// Helper to validate MP3 rendition
export function validateMp3Rendition(rendition: string): boolean {
  return rendition === "audio";
}

// Helper to validate 15s time alignment for MP3
export function validateMp3TimeAlignment(startTimeMs: number): {
  isValid: boolean;
  nearestValidTime?: number;
} {
  const isValid = startTimeMs % 15000 === 0;
  const nearestValidTime = Math.round(startTimeMs / 15000) * 15000;

  return {
    isValid,
    nearestValidTime: isValid ? undefined : nearestValidTime,
  };
}
