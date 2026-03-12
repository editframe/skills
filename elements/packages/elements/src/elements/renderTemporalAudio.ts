import type { EFMedia } from "./EFMedia.js";
import { logger } from "../preview/logger.js";
import { type Span, clampFadeMs } from "./RangeSet.js";

// ---------------------------------------------------------------------------
// SpanScheduleEntry — pure scheduling unit for multi-span audio rendering
// ---------------------------------------------------------------------------

export interface SpanScheduleEntry {
  spanIndex: number;
  /** Source media time to fetch from */
  sourceFromMs: number;
  /** Source media time to fetch to */
  sourceToMs: number;
  /** Placement position in the OfflineAudioContext (ms from context start) */
  ctxStartMs: number;
  /** Fade-in duration in ms (equal-power, 0 = no fade) */
  fadeInMs: number;
  /** Fade-out duration in ms (equal-power, 0 = no fade) */
  fadeOutMs: number;
}

export interface BuildSpanScheduleOptions {
  elementStartTimeMs: number;
  elementEndTimeMs: number;
  spans: Span[];
  crossfadeMs: number;
  /** Root timeline query range start */
  fromMs: number;
  /** Root timeline query range end */
  toMs: number;
}

/**
 * Pure function — build an ordered list of per-span audio fetch+placement
 * instructions for a media element with resolved ranges.
 *
 * Handles query clipping (spans entirely outside the query window are
 * omitted), context placement (ctxStartMs relative to fromMs=0), and
 * crossfade fade-in/fade-out window assignment.
 */
export function buildSpanSchedule(opts: BuildSpanScheduleOptions): SpanScheduleEntry[] {
  const { elementStartTimeMs, elementEndTimeMs, spans, crossfadeMs, fromMs, toMs } = opts;

  // Element must overlap query
  if (elementEndTimeMs < fromMs || elementStartTimeMs > toMs) {
    return [];
  }

  const entries: SpanScheduleEntry[] = [];
  let localAccumulatedMs = 0; // running local time offset at the start of each span

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    const spanDurationMs = Math.max(0, span[1] - span[0]);
    if (spanDurationMs === 0) {
      continue;
    }

    // Local time window this span occupies in the element: [localStart, localEnd)
    const spanLocalStartMs = localAccumulatedMs;
    const spanLocalEndMs = localAccumulatedMs + spanDurationMs;

    // Convert local time to root timeline time
    const spanTimelineStartMs = elementStartTimeMs + spanLocalStartMs;
    const spanTimelineEndMs = elementStartTimeMs + spanLocalEndMs;

    // Clip against query range
    const queryClippedStartMs = Math.max(spanTimelineStartMs, fromMs);
    const queryClippedEndMs = Math.min(spanTimelineEndMs, toMs);

    if (queryClippedStartMs >= queryClippedEndMs) {
      localAccumulatedMs += spanDurationMs;
      continue;
    }

    // Local time offsets within this span (for source mapping)
    const spanLocalQueryStartMs = queryClippedStartMs - elementStartTimeMs - spanLocalStartMs;
    const spanLocalQueryEndMs = queryClippedEndMs - elementStartTimeMs - spanLocalStartMs;

    // Source times = span start + offset within span
    const sourceFromMs = span[0] + spanLocalQueryStartMs;
    const sourceToMs = span[0] + spanLocalQueryEndMs;

    // Context placement: how far from the audio context start (fromMs)
    const ctxStartMs = Math.max(0, queryClippedStartMs - fromMs);

    // Crossfade: only between adjacent spans (not at the very first or very last boundary).
    // At each boundary, use min(current span clamp, adjacent span clamp) to keep both
    // sides of the crossfade symmetric when one span is shorter than the crossfade window.
    const isFirst = entries.length === 0 && i === findFirstNonEmptyIndex(spans);
    const isLast = i === findLastNonEmptyIndex(spans);

    const prevSpan = isFirst ? null : findPrevNonEmptySpan(spans, i);
    const nextSpan = isLast ? null : findNextNonEmptySpan(spans, i);

    const fadeInMs = prevSpan === null
      ? 0
      : Math.min(clampFadeMs(crossfadeMs, span), clampFadeMs(crossfadeMs, prevSpan)) / 2;
    const fadeOutMs = nextSpan === null
      ? 0
      : Math.min(clampFadeMs(crossfadeMs, span), clampFadeMs(crossfadeMs, nextSpan)) / 2;

    entries.push({
      spanIndex: i,
      sourceFromMs,
      sourceToMs,
      ctxStartMs,
      fadeInMs,
      fadeOutMs,
    });

    localAccumulatedMs += spanDurationMs;
  }

  return entries;
}

function findFirstNonEmptyIndex(spans: Span[]): number {
  for (let i = 0; i < spans.length; i++) {
    if (spans[i]![1] > spans[i]![0]) return i;
  }
  return 0;
}

function findLastNonEmptyIndex(spans: Span[]): number {
  for (let i = spans.length - 1; i >= 0; i--) {
    if (spans[i]![1] > spans[i]![0]) return i;
  }
  return spans.length - 1;
}

function findPrevNonEmptySpan(spans: Span[], fromIndex: number): Span | null {
  for (let i = fromIndex - 1; i >= 0; i--) {
    const s = spans[i]!;
    if (s[1] > s[0]) return s;
  }
  return null;
}

function findNextNonEmptySpan(spans: Span[], fromIndex: number): Span | null {
  for (let i = fromIndex + 1; i < spans.length; i++) {
    const s = spans[i]!;
    if (s[1] > s[0]) return s;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Equal-power crossfade curves (precomputed)
// ---------------------------------------------------------------------------

const CURVE_LEN = 128;
const fadeInCurve = Float32Array.from(
  { length: CURVE_LEN },
  (_, i) => Math.sin(((i + 1) / CURVE_LEN) * (Math.PI / 2)) ** 2,
);
const fadeOutCurve = Float32Array.from(
  { length: CURVE_LEN },
  (_, i) => Math.cos(((i + 1) / CURVE_LEN) * (Math.PI / 2)) ** 2,
);

// ---------------------------------------------------------------------------
// TemporalAudioHost interface
// ---------------------------------------------------------------------------

interface TemporalAudioHost {
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  getMediaElements(): EFMedia[];
  waitForMediaDurations?(): Promise<void>;
}

// ---------------------------------------------------------------------------
// renderTemporalAudio
// ---------------------------------------------------------------------------

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
    throw new Error(`Duration must be greater than 0 when rendering audio. ${contextSize}ms`);
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
  logger.debug(
    `[renderTemporalAudio] Found ${mediaElements.length} media elements, time range: ${fromMs}-${toMs}ms`,
  );

  await Promise.all(
    mediaElements.map(async (mediaElement) => {
      logger.debug(
        `[renderTemporalAudio] Checking ${mediaElement.tagName} at ${mediaElement.startTimeMs}-${mediaElement.endTimeMs}ms, mute=${mediaElement.mute}`,
      );

      if (mediaElement.mute) {
        return;
      }

      const resolvedRanges = mediaElement.resolvedRanges;

      if (resolvedRanges !== null) {
        // Multi-span path
        await renderSpans(audioContext, mediaElement, resolvedRanges, fromMs, toMs, signal);
        return;
      }

      // Legacy single-span path (unchanged)
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

      const sourceInMs = mediaElement.sourceInMs || mediaElement.trimStartMs || 0;
      const mediaSourceFromMs = mediaLocalFromMs + sourceInMs;
      const mediaSourceToMs = mediaLocalToMs + sourceInMs;

      // Check abort before processing each media element
      signal?.throwIfAborted();

      logger.debug(
        `[renderTemporalAudio] Fetching audio for ${mediaElement.tagName} from ${mediaSourceFromMs}-${mediaSourceToMs}ms`,
      );
      const audio = await mediaElement.fetchAudioSpanningTime(
        mediaSourceFromMs,
        mediaSourceToMs,
        signal,
      );
      if (!audio) {
        logger.debug(`[renderTemporalAudio] No audio returned for ${mediaElement.tagName}`);
        return;
      }
      logger.debug(
        `[renderTemporalAudio] Got audio blob size: ${audio.blob.size}, range: ${audio.startMs}-${audio.endMs}ms`,
      );

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
        if (
          decodeError instanceof Error &&
          decodeError.message.includes("Unable to decode audio data")
        ) {
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
      const actualDurationMs = Math.min(requestedDurationMs, availableAudioMs - safeOffsetMs);

      if (actualDurationMs <= 0) {
        return;
      }

      bufferSource.start(ctxStartMs / 1000, safeOffsetMs / 1000, actualDurationMs / 1000);
    }),
  );

  return audioContext.startRendering();
}

// ---------------------------------------------------------------------------
// Multi-span rendering helper
// ---------------------------------------------------------------------------

async function renderSpans(
  audioContext: OfflineAudioContext,
  mediaElement: EFMedia,
  spans: Span[],
  fromMs: number,
  toMs: number,
  signal: AbortSignal | undefined,
): Promise<void> {
  const schedule = buildSpanSchedule({
    elementStartTimeMs: mediaElement.startTimeMs,
    elementEndTimeMs: mediaElement.endTimeMs,
    spans,
    crossfadeMs: mediaElement.crossfadeMs,
    fromMs,
    toMs,
  });

  if (schedule.length === 0) {
    return;
  }

  await Promise.all(
    schedule.map(async (entry) => {
      signal?.throwIfAborted();

      const audio = await mediaElement.fetchAudioSpanningTime(
        entry.sourceFromMs,
        entry.sourceToMs,
        signal,
      );
      if (!audio) return;

      let decodedBuffer: AudioBuffer;
      try {
        const arrayBuffer = await audio.blob.arrayBuffer();
        if (arrayBuffer.byteLength < 100) return;
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } catch (decodeError) {
        if (
          decodeError instanceof Error &&
          decodeError.message.includes("Unable to decode audio data")
        ) {
          return;
        }
        throw decodeError;
      }

      const bufferSource = audioContext.createBufferSource();
      bufferSource.buffer = decodedBuffer;

      const offsetInBufferMs = Math.max(0, entry.sourceFromMs - audio.startMs);
      const requestedDurationMs = entry.sourceToMs - entry.sourceFromMs;
      const availableAudioMs = audio.endMs - audio.startMs;
      const actualDurationMs = Math.min(requestedDurationMs, availableAudioMs - offsetInBufferMs);

      if (actualDurationMs <= 0) return;

      if (entry.fadeInMs > 0 || entry.fadeOutMs > 0) {
        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        bufferSource.connect(gainNode);

        const startSec = entry.ctxStartMs / 1000;
        const endSec = (entry.ctxStartMs + actualDurationMs) / 1000;

        if (entry.fadeInMs > 0) {
          const fadeInEnd = startSec + entry.fadeInMs / 1000;
          gainNode.gain.setValueAtTime(0, startSec);
          gainNode.gain.setValueCurveAtTime(fadeInCurve, startSec, entry.fadeInMs / 1000);
          gainNode.gain.setValueAtTime(1, fadeInEnd);
        } else {
          gainNode.gain.setValueAtTime(1, startSec);
        }

        if (entry.fadeOutMs > 0) {
          const fadeOutStart = endSec - entry.fadeOutMs / 1000;
          gainNode.gain.setValueAtTime(1, fadeOutStart);
          gainNode.gain.setValueCurveAtTime(fadeOutCurve, fadeOutStart, entry.fadeOutMs / 1000);
        }
      } else {
        bufferSource.connect(audioContext.destination);
      }

      bufferSource.start(
        entry.ctxStartMs / 1000,
        offsetInBufferMs / 1000,
        actualDurationMs / 1000,
      );
    }),
  );
}
