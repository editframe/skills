import { describe, it, expect } from "vitest"
import {
  type Span,
  parseIncludeRanges,
  parseExcludeRanges,
  localToSourceTime,
  totalDuration,
  clampFadeMs,
  validateIncludeSpans,
  validateExcludeSpans,
} from "./RangeSet.js"

// ---------------------------------------------------------------------------
// parseIncludeRanges
// ---------------------------------------------------------------------------

describe("parseIncludeRanges", () => {
  it("parses a single span in seconds", () => {
    expect(parseIncludeRanges("1s-3s")).toEqual([[1000, 3000]])
  })

  it("parses a single span in milliseconds", () => {
    expect(parseIncludeRanges("1000ms-3000ms")).toEqual([[1000, 3000]])
  })

  it("parses multiple spans", () => {
    expect(parseIncludeRanges("1s-3s, 5s-8s")).toEqual([
      [1000, 3000],
      [5000, 8000],
    ])
  })

  it("preserves duplicate spans (ordered-list semantics)", () => {
    expect(parseIncludeRanges("1s-3s, 1s-3s, 1s-3s")).toEqual([
      [1000, 3000],
      [1000, 3000],
      [1000, 3000],
    ])
  })

  it("preserves span order even when non-chronological", () => {
    expect(parseIncludeRanges("5s-8s, 1s-3s")).toEqual([
      [5000, 8000],
      [1000, 3000],
    ])
  })

  it("tolerates extra whitespace", () => {
    expect(parseIncludeRanges("  1s - 3s ,  5s - 8s  ")).toEqual([
      [1000, 3000],
      [5000, 8000],
    ])
  })

  it("parses mixed units", () => {
    expect(parseIncludeRanges("1s-3000ms")).toEqual([[1000, 3000]])
  })

  it("throws on malformed input", () => {
    expect(() => parseIncludeRanges("1s")).toThrow()
    expect(() => parseIncludeRanges("1s-")).toThrow()
    expect(() => parseIncludeRanges("-3s")).toThrow()
  })

  it("throws on invalid time unit", () => {
    expect(() => parseIncludeRanges("1m-3m")).toThrow()
  })

  it("parses fractional seconds", () => {
    expect(parseIncludeRanges("1.5s-3.5s")).toEqual([[1500, 3500]])
  })

  it("returns empty array for empty string", () => {
    expect(parseIncludeRanges("")).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// parseExcludeRanges
// ---------------------------------------------------------------------------

describe("parseExcludeRanges", () => {
  it("returns complement of excluded span against full source duration", () => {
    // source 0-10s, exclude 3s-7s → include [0,3000],[7000,10000]
    expect(parseExcludeRanges("3s-7s", 10000)).toEqual([
      [0, 3000],
      [7000, 10000],
    ])
  })

  it("excludes from start", () => {
    // source 0-10s, exclude 0-3s → include [3000,10000]
    expect(parseExcludeRanges("0s-3s", 10000)).toEqual([[3000, 10000]])
  })

  it("excludes to end", () => {
    // source 0-10s, exclude 7s-10s → include [0,7000]
    expect(parseExcludeRanges("7s-10s", 10000)).toEqual([[0, 7000]])
  })

  it("excludes full source → empty result", () => {
    expect(parseExcludeRanges("0s-10s", 10000)).toEqual([])
  })

  it("merges overlapping exclude spans before complementing", () => {
    // exclude [2s-5s, 4s-8s] → merges to [2s-8s] → complement [0,2000],[8000,10000]
    expect(parseExcludeRanges("2s-5s, 4s-8s", 10000)).toEqual([
      [0, 2000],
      [8000, 10000],
    ])
  })

  it("sorts out-of-order exclude spans before complementing", () => {
    expect(parseExcludeRanges("7s-10s, 0s-3s", 10000)).toEqual([[3000, 7000]])
  })

  it("handles adjacent (touching) exclude spans by merging", () => {
    // [2s-5s, 5s-8s] → merge to [2s-8s]
    expect(parseExcludeRanges("2s-5s, 5s-8s", 10000)).toEqual([
      [0, 2000],
      [8000, 10000],
    ])
  })

  it("multiple non-overlapping excludes produce multiple include spans", () => {
    expect(parseExcludeRanges("1s-2s, 4s-5s, 8s-9s", 10000)).toEqual([
      [0, 1000],
      [2000, 4000],
      [5000, 8000],
      [9000, 10000],
    ])
  })
})

// ---------------------------------------------------------------------------
// localToSourceTime
// ---------------------------------------------------------------------------

describe("localToSourceTime", () => {
  it("maps time within a single span", () => {
    const spans: Span[] = [[1000, 3000]]
    expect(localToSourceTime(0, spans)).toBe(1000)
    expect(localToSourceTime(1000, spans)).toBe(2000)
    expect(localToSourceTime(1999, spans)).toBe(2999)
  })

  it("maps time at the exact start of a second span", () => {
    const spans: Span[] = [
      [1000, 3000],
      [5000, 8000],
    ]
    // local 0–1999 → source 1000–2999 (span 0)
    // local 2000–4999 → source 5000–7999 (span 1)
    expect(localToSourceTime(2000, spans)).toBe(5000)
    expect(localToSourceTime(3000, spans)).toBe(6000)
    expect(localToSourceTime(4999, spans)).toBe(7999)
  })

  it("handles repeated spans (playlist semantics)", () => {
    const spans: Span[] = [
      [1000, 3000],
      [1000, 3000],
      [1000, 3000],
    ]
    // Each span contributes 2000ms
    expect(localToSourceTime(0, spans)).toBe(1000)
    expect(localToSourceTime(1999, spans)).toBe(2999)
    expect(localToSourceTime(2000, spans)).toBe(1000) // second repeat
    expect(localToSourceTime(4000, spans)).toBe(1000) // third repeat
    expect(localToSourceTime(5999, spans)).toBe(2999)
  })

  it("returns undefined when localMs equals total duration (past end)", () => {
    const spans: Span[] = [[1000, 3000]]
    expect(localToSourceTime(2000, spans)).toBeUndefined()
  })

  it("returns undefined when localMs exceeds total duration", () => {
    const spans: Span[] = [[1000, 3000]]
    expect(localToSourceTime(5000, spans)).toBeUndefined()
  })

  it("handles a zero-duration span gracefully (skips it)", () => {
    // Zero-duration span should be skipped without infinite loop
    const spans: Span[] = [
      [1000, 1000],
      [2000, 4000],
    ]
    expect(localToSourceTime(0, spans)).toBe(2000)
    expect(localToSourceTime(1999, spans)).toBe(3999)
  })

  it("localMs=0 on empty spans returns undefined", () => {
    expect(localToSourceTime(0, [])).toBeUndefined()
  })

  it("handles non-chronological spans in order", () => {
    // Spans don't need to be in source order for include-ranges
    const spans: Span[] = [
      [5000, 8000],
      [1000, 3000],
    ]
    expect(localToSourceTime(0, spans)).toBe(5000)
    expect(localToSourceTime(2999, spans)).toBe(7999)
    expect(localToSourceTime(3000, spans)).toBe(1000)
    expect(localToSourceTime(4999, spans)).toBe(2999)
  })
})

// ---------------------------------------------------------------------------
// totalDuration
// ---------------------------------------------------------------------------

describe("totalDuration", () => {
  it("returns 0 for empty spans", () => {
    expect(totalDuration([])).toBe(0)
  })

  it("returns span duration for a single span", () => {
    expect(totalDuration([[1000, 3000]])).toBe(2000)
  })

  it("sums durations of multiple spans", () => {
    expect(
      totalDuration([
        [1000, 3000],
        [5000, 8000],
      ]),
    ).toBe(5000)
  })

  it("counts each repeat separately", () => {
    expect(
      totalDuration([
        [1000, 3000],
        [1000, 3000],
        [1000, 3000],
      ]),
    ).toBe(6000)
  })
})

// ---------------------------------------------------------------------------
// clampFadeMs
// ---------------------------------------------------------------------------

describe("clampFadeMs", () => {
  it("returns fadeMs when span is large enough", () => {
    // span duration = 2000ms, fadeMs=50 → need 25ms per side, fine
    expect(clampFadeMs(50, [1000, 3000])).toBe(50)
  })

  it("clamps when span is shorter than fadeMs * 2", () => {
    // span duration = 20ms, fadeMs=50 → clamp to 20ms (span duration)
    expect(clampFadeMs(50, [1000, 1020])).toBe(20)
  })

  it("returns 0 when fadeMs is 0", () => {
    expect(clampFadeMs(0, [1000, 3000])).toBe(0)
  })

  it("returns 0 for zero-duration span", () => {
    expect(clampFadeMs(50, [1000, 1000])).toBe(0)
  })

  it("clamps correctly when exactly at the boundary (fadeMs * 2 === span duration)", () => {
    // span duration = 100ms, fadeMs=50 → exactly at boundary, return 50
    expect(clampFadeMs(50, [1000, 1100])).toBe(50)
  })
})

// ---------------------------------------------------------------------------
// validateIncludeSpans
// ---------------------------------------------------------------------------

describe("validateIncludeSpans", () => {
  it("returns no warnings for valid non-overlapping spans", () => {
    const { warnings } = validateIncludeSpans([
      [1000, 3000],
      [5000, 8000],
    ])
    expect(warnings).toHaveLength(0)
  })

  it("returns no warnings for repeated spans (intentional)", () => {
    const { warnings } = validateIncludeSpans([
      [1000, 3000],
      [1000, 3000],
    ])
    expect(warnings).toHaveLength(0)
  })

  it("warns on zero-duration span", () => {
    const { warnings } = validateIncludeSpans([[1000, 1000]])
    expect(warnings.length).toBeGreaterThan(0)
  })

  it("warns on negative-duration span", () => {
    const { warnings } = validateIncludeSpans([[3000, 1000]])
    expect(warnings.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// validateExcludeSpans
// ---------------------------------------------------------------------------

describe("validateExcludeSpans", () => {
  it("returns no warnings for valid non-overlapping sorted spans", () => {
    const { warnings, canonical } = validateExcludeSpans([
      [1000, 3000],
      [5000, 8000],
    ])
    expect(warnings).toHaveLength(0)
    expect(canonical).toEqual([
      [1000, 3000],
      [5000, 8000],
    ])
  })

  it("warns and merges overlapping spans", () => {
    const { warnings, canonical } = validateExcludeSpans([
      [1000, 4000],
      [3000, 6000],
    ])
    expect(warnings.length).toBeGreaterThan(0)
    expect(canonical).toEqual([[1000, 6000]])
  })

  it("sorts out-of-order spans silently", () => {
    const { warnings, canonical } = validateExcludeSpans([
      [5000, 8000],
      [1000, 3000],
    ])
    // sorting alone (no overlap) → no warning
    expect(warnings).toHaveLength(0)
    expect(canonical).toEqual([
      [1000, 3000],
      [5000, 8000],
    ])
  })

  it("warns on exact duplicate spans", () => {
    const { warnings, canonical } = validateExcludeSpans([
      [1000, 3000],
      [1000, 3000],
    ])
    expect(warnings.length).toBeGreaterThan(0)
    expect(canonical).toEqual([[1000, 3000]])
  })

  it("merges adjacent spans", () => {
    const { canonical } = validateExcludeSpans([
      [1000, 3000],
      [3000, 5000],
    ])
    expect(canonical).toEqual([[1000, 5000]])
  })
})
