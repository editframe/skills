import { describe, it, expect } from "vitest"
import { computeLookaheadSourceTimes } from "./EFVideo.js"
import type { Span } from "./RangeSet.js"

// ---------------------------------------------------------------------------
// computeLookaheadSourceTimes
// ---------------------------------------------------------------------------
// Tests the pure function that walks forward through resolved ranges to
// produce a list of source media times for segment prefetch lookahead.
//
// Without ranges, this is a simple linear walk. With ranges, it must jump
// to the next span's start when a span boundary is crossed.
// ---------------------------------------------------------------------------

describe("computeLookaheadSourceTimes", () => {
  describe("no ranges (legacy linear walk)", () => {
    it("returns sequential probe times when no spans", () => {
      const times = computeLookaheadSourceTimes({
        currentSourceTimeMs: 0,
        resolvedRanges: null,
        segmentDurationMs: 2000,
        maxLookahead: 3,
      })
      expect(times).toEqual([0, 2000, 4000])
    })

    it("starts from non-zero currentSourceTimeMs", () => {
      const times = computeLookaheadSourceTimes({
        currentSourceTimeMs: 5000,
        resolvedRanges: null,
        segmentDurationMs: 2000,
        maxLookahead: 3,
      })
      expect(times).toEqual([5000, 7000, 9000])
    })
  })

  describe("with ranges", () => {
    it("walks linearly within a single span", () => {
      const spans: Span[] = [[1000, 10000]]
      const times = computeLookaheadSourceTimes({
        currentSourceTimeMs: 1000,
        resolvedRanges: spans,
        segmentDurationMs: 2000,
        maxLookahead: 3,
      })
      expect(times).toEqual([1000, 3000, 5000])
    })

    it("jumps to the next span start when current span is exhausted", () => {
      // Span 0: [1000, 3000] (2000ms), span 1: [8000, 14000]
      // probing from 1000 with 2000ms segments:
      //   1000 → in span 0
      //   3000 → span 0 ends at 3000, so next probe jumps to span 1 start: 8000
      //   10000 → within span 1
      const spans: Span[] = [
        [1000, 3000],
        [8000, 14000],
      ]
      const times = computeLookaheadSourceTimes({
        currentSourceTimeMs: 1000,
        resolvedRanges: spans,
        segmentDurationMs: 2000,
        maxLookahead: 3,
      })
      expect(times).toEqual([1000, 8000, 10000])
    })

    it("handles probe starting mid-span", () => {
      // Span 0: [1000, 5000], currentSourceTime = 3000
      // probes: 3000, then 3000+2000=5000 → span ends, jump to span 1: 8000
      const spans: Span[] = [
        [1000, 5000],
        [8000, 14000],
      ]
      const times = computeLookaheadSourceTimes({
        currentSourceTimeMs: 3000,
        resolvedRanges: spans,
        segmentDurationMs: 2000,
        maxLookahead: 3,
      })
      expect(times).toEqual([3000, 8000, 10000])
    })

    it("stops at maxLookahead", () => {
      const spans: Span[] = [[1000, 20000]]
      const times = computeLookaheadSourceTimes({
        currentSourceTimeMs: 1000,
        resolvedRanges: spans,
        segmentDurationMs: 2000,
        maxLookahead: 2,
      })
      expect(times).toHaveLength(2)
    })

    it("stops when all spans are exhausted before maxLookahead", () => {
      // Only one 2000ms span, requesting 5 lookahead segments but only 1 available
      const spans: Span[] = [[1000, 3000]]
      const times = computeLookaheadSourceTimes({
        currentSourceTimeMs: 1000,
        resolvedRanges: spans,
        segmentDurationMs: 2000,
        maxLookahead: 5,
      })
      expect(times).toEqual([1000])
    })

    it("handles repeated spans (loops back)", () => {
      // Span 0: [1000, 3000] repeated twice → element plays source 1000-3000 twice
      const spans: Span[] = [
        [1000, 3000],
        [1000, 3000],
      ]
      const times = computeLookaheadSourceTimes({
        currentSourceTimeMs: 1000,
        resolvedRanges: spans,
        segmentDurationMs: 2000,
        maxLookahead: 3,
      })
      // Span 0: [1000, 3000] → probe at 1000 (within span 0, 2000ms)
      // Next probe: 1000+2000=3000 = span 0 end → jump to span 1 start: 1000
      // Span 1: [1000, 3000] → probe at 1000
      // Next probe: 1000+2000=3000 = span 1 end → no more spans
      expect(times).toEqual([1000, 1000])
    })
  })
})
