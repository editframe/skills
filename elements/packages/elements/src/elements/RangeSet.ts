import { parseTimeToMs } from "./parseTimeToMs.js"

// [startMs, endMs) — start inclusive, end exclusive
export type Span = [number, number]

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseSpan(raw: string): Span {
  const trimmed = raw.trim()
  // Split on '-' that is surrounded by a time token on each side.
  // Tokens end in 's' or 'ms'. We split on the '-' between two such tokens.
  const match = trimmed.match(/^(\d+(?:\.\d+)?(?:ms|s))\s*-\s*(\d+(?:\.\d+)?(?:ms|s))$/)
  if (!match || match[1] === undefined || match[2] === undefined) {
    throw new Error(
      `Invalid span "${raw}". Expected format: "1s-3s", "1000ms-3000ms", or "1.5s-3.5s"`,
    )
  }
  const startMs = parseTimeToMs(match[1])
  const endMs = parseTimeToMs(match[2])
  return [startMs, endMs]
}

/**
 * Parse an include-ranges attribute string into an ordered Span[].
 * Duplicate and non-chronological spans are preserved (playlist semantics).
 *
 * @example
 * parseIncludeRanges("1s-3s, 1s-3s, 5s-8s")
 * // → [[1000,3000],[1000,3000],[5000,8000]]
 */
export function parseIncludeRanges(attr: string): Span[] {
  const trimmed = attr.trim()
  if (trimmed === "") return []
  return trimmed.split(",").map(parseSpan)
}

/**
 * Parse an exclude-ranges attribute string and return its complement as Span[].
 * Input spans are sorted and merged before complementing.
 * Requires the intrinsic source duration to compute the complement.
 *
 * @example
 * parseExcludeRanges("3s-7s", 10000)
 * // → [[0,3000],[7000,10000]]
 */
export function parseExcludeRanges(attr: string, intrinsicDurationMs: number): Span[] {
  const trimmed = attr.trim()
  if (trimmed === "") return [[0, intrinsicDurationMs]]
  const spans = trimmed.split(",").map(parseSpan)
  const { canonical } = validateExcludeSpans(spans)
  return complementSpans(canonical, intrinsicDurationMs)
}

// ---------------------------------------------------------------------------
// Core mapping
// ---------------------------------------------------------------------------

/**
 * Map a local element time (0-based, relative to element start) to the
 * corresponding source media time using an ordered span list.
 *
 * Returns undefined when localMs is at or beyond the total span duration.
 * Zero-duration spans are skipped.
 */
export function localToSourceTime(localMs: number, spans: Span[]): number | undefined {
  let accumulated = 0
  for (const [spanStart, spanEnd] of spans) {
    const spanDuration = spanEnd - spanStart
    if (spanDuration <= 0) continue
    if (localMs < accumulated + spanDuration) {
      return spanStart + (localMs - accumulated)
    }
    accumulated += spanDuration
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

/**
 * Sum of all span durations. Counts each repeat independently.
 */
export function totalDuration(spans: Span[]): number {
  return spans.reduce((sum, [start, end]) => sum + Math.max(0, end - start), 0)
}

// ---------------------------------------------------------------------------
// Crossfade helpers
// ---------------------------------------------------------------------------

/**
 * Clamp the requested crossfade window to what a span can provide.
 * Each side of the crossfade consumes fadeMs/2, so the span must be at
 * least fadeMs long to support the full window. If shorter, clamp to
 * the span's own duration.
 */
export function clampFadeMs(fadeMs: number, span: Span): number {
  const spanDuration = Math.max(0, span[1] - span[0])
  return Math.min(fadeMs, spanDuration)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate include spans.
 * Repeated spans are legal (playlist semantics) — no warning issued.
 * Zero or negative duration spans produce warnings.
 */
export function validateIncludeSpans(spans: Span[]): { warnings: string[] } {
  const warnings: string[] = []
  for (const [start, end] of spans) {
    if (end <= start) {
      warnings.push(
        `Include span [${start}, ${end}] has zero or negative duration and will be skipped.`,
      )
    }
  }
  return { warnings }
}

/**
 * Validate exclude spans.
 * - Sorts by start time
 * - Warns on exact duplicates and overlapping spans, then merges them
 * - Adjacent spans (touching) are merged silently
 *
 * Returns canonical (sorted, merged) form.
 */
export function validateExcludeSpans(spans: Span[]): { warnings: string[]; canonical: Span[] } {
  const warnings: string[] = []

  // Sort by start
  const sorted = [...spans].sort((a, b) => a[0] - b[0])

  // Detect duplicates before merging
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i]!
    const next = sorted[i + 1]!
    if (cur[0] === next[0] && cur[1] === next[1]) {
      warnings.push(`Duplicate exclude span [${cur[0]}, ${cur[1]}] found and will be merged.`)
    }
  }

  // Merge overlapping and adjacent spans
  const canonical: Span[] = []
  for (const span of sorted) {
    if (canonical.length === 0) {
      canonical.push([span[0], span[1]])
      continue
    }
    // canonical is non-empty so last is always defined
    const last = canonical[canonical.length - 1] as Span
    if (span[0] <= last[1]) {
      // Overlapping or adjacent — merge
      if (span[1] > last[1]) {
        // Only warn if actually overlapping (not just adjacent)
        if (span[0] < last[1]) {
          warnings.push(
            `Overlapping exclude spans merged: [${last[0]}, ${last[1]}] and [${span[0]}, ${span[1]}].`,
          )
        }
        last[1] = span[1]
      }
    } else {
      canonical.push([span[0], span[1]])
    }
  }

  return { warnings, canonical }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function complementSpans(excludeSpans: Span[], totalMs: number): Span[] {
  const result: Span[] = []
  let cursor = 0
  for (const [exStart, exEnd] of excludeSpans) {
    if (cursor < exStart) {
      result.push([cursor, exStart])
    }
    cursor = exEnd
  }
  if (cursor < totalMs) {
    result.push([cursor, totalMs])
  }
  return result
}
