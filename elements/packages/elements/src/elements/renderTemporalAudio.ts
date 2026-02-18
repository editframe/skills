import type { EFMedia } from "./EFMedia.js";
import { logger } from "../preview/logger.js";

interface TemporalAudioHost {
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  getMediaElements(): EFMedia[];
  waitForMediaDurations?(): Promise<void>;
}

export async function renderTemporalAudio(
  host: TemporalAudioHost,
  fromMs: number,
  toMs: number,
  signal?: AbortSignal,
): Promise<AudioBuffer> {
  const durationMs = toMs - fromMs;
  const duration = durationMs / 1000;
  const exactSamples = 48000 * duration;
  const aacFrames = exactSamples / 1024;
  const alignedFrames = Math.round(aacFrames);
  const contextSize = alignedFrames * 1024;

  if (contextSize <= 0) {
    throw new Error(
      `Duration must be greater than 0 when rendering audio. ${contextSize}ms`,
    );
  }

  // Check abort before starting
  signal?.throwIfAborted();

  const audioContext = new OfflineAudioContext(2, contextSize, 48000);

  if (host.waitForMediaDurations) {
    await host.waitForMediaDurations();
    // Check abort after potentially slow operation
    signal?.throwIfAborted();
  }

  const mediaElements = host.getMediaElements();
  logger.debug(`[renderTemporalAudio] Found ${mediaElements.length} media elements, time range: ${fromMs}-${toMs}ms`);
  
  await Promise.all(
    mediaElements.map(async (mediaElement) => {
      logger.debug(`[renderTemporalAudio] Checking ${mediaElement.tagName} at ${mediaElement.startTimeMs}-${mediaElement.endTimeMs}ms, mute=${mediaElement.mute}`);
      
      if (mediaElement.mute) {
        return;
      }

      const mediaStartsBeforeEnd = mediaElement.startTimeMs <= toMs;
      const mediaEndsAfterStart = mediaElement.endTimeMs >= fromMs;
      const mediaOverlaps = mediaStartsBeforeEnd && mediaEndsAfterStart;
      if (!mediaOverlaps) {
        logger.debug(`[renderTemporalAudio] ${mediaElement.tagName} does not overlap`);
        return;
      }

      const mediaLocalFromMs = Math.max(0, fromMs - mediaElement.startTimeMs);
      const mediaLocalToMs = Math.min(
        mediaElement.endTimeMs - mediaElement.startTimeMs,
        toMs - mediaElement.startTimeMs,
      );

      if (mediaLocalFromMs >= mediaLocalToMs) {
        return;
      }

      const sourceInMs =
        mediaElement.sourceInMs || mediaElement.trimStartMs || 0;
      const mediaSourceFromMs = mediaLocalFromMs + sourceInMs;
      const mediaSourceToMs = mediaLocalToMs + sourceInMs;

      // Check abort before processing each media element
      signal?.throwIfAborted();
      
      logger.debug(`[renderTemporalAudio] Fetching audio for ${mediaElement.tagName} from ${mediaSourceFromMs}-${mediaSourceToMs}ms`);
      const audio = await mediaElement.fetchAudioSpanningTime(
        mediaSourceFromMs,
        mediaSourceToMs,
        signal,
      );
      if (!audio) {
        logger.debug(`[renderTemporalAudio] No audio returned for ${mediaElement.tagName}`);
        return;
      }
      logger.debug(`[renderTemporalAudio] Got audio blob size: ${audio.blob.size}, range: ${audio.startMs}-${audio.endMs}ms`);

      const bufferSource = audioContext.createBufferSource();
      
      // Decode audio data with error handling for invalid/incomplete audio
      let decodedBuffer;
      try {
        const arrayBuffer = await audio.blob.arrayBuffer();
        // Skip if buffer is too small to be valid audio
        if (arrayBuffer.byteLength < 100) {
          return;
        }
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } catch (decodeError) {
        // Unable to decode audio data - skip this segment silently
        // This can happen with corrupted/incomplete audio segments
        if (decodeError instanceof Error && 
            decodeError.message.includes("Unable to decode audio data")) {
          return;
        }
        throw decodeError;
      }
      
      bufferSource.buffer = decodedBuffer;
      bufferSource.connect(audioContext.destination);

      const ctxStartMs = Math.max(0, mediaElement.startTimeMs - fromMs);

      const requestedSourceFromMs = mediaSourceFromMs;
      const actualSourceStartMs = audio.startMs;
      const offsetInBufferMs = requestedSourceFromMs - actualSourceStartMs;

      const safeOffsetMs = Math.max(0, offsetInBufferMs);

      const requestedDurationMs = mediaSourceToMs - mediaSourceFromMs;
      const availableAudioMs = audio.endMs - audio.startMs;
      const actualDurationMs = Math.min(
        requestedDurationMs,
        availableAudioMs - safeOffsetMs,
      );

      if (actualDurationMs <= 0) {
        return;
      }

      bufferSource.start(
        ctxStartMs / 1000,
        safeOffsetMs / 1000,
        actualDurationMs / 1000,
      );
    }),
  );

  return audioContext.startRendering();
}
