import { describe, it, expect } from "vitest"
import { buildSpanSchedule, type SpanScheduleEntry } from "./renderTemporalAudio.js"
import type { Span } from "./RangeSet.js"

// ---------------------------------------------------------------------------
// buildSpanSchedule
// ---------------------------------------------------------------------------
// Tests the pure scheduling function that maps resolved ranges + element
// timing info + query range → a list of audio fetch+placement instructions.
//
// Element model:
//   startTimeMs  — element's position in the root timeline
//   resolvedRanges — ordered spans in source media time
//   crossfadeMs  — crossfade window (50ms default)
//
// The query range [fromMs, toMs] is in root timeline time.
// ctxStartMs in results is relative to the audioContext (i.e. fromMs = 0).
// ---------------------------------------------------------------------------

describe("buildSpanSchedule", () => {
  describe("single span", () => {
    it("schedules one entry for a single-span element fully within query", () => {
      // Element at t=0, spans=[[1000,3000]], query [0, 2000ms]
      // localTimeMs 0–2000 → source 1000–3000
      const spans: Span[] = [[1000, 3000]]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 2000,
        spans,
        crossfadeMs: 0,
        fromMs: 0,
        toMs: 2000,
      })
      expect(schedule).toHaveLength(1)
      const entry = schedule[0]!
      expect(entry.sourceFromMs).toBe(1000)
      expect(entry.sourceToMs).toBe(3000)
      expect(entry.ctxStartMs).toBe(0)
    })

    it("clips source range when query starts after element start", () => {
      // Element at t=0 for 2000ms (source 1000-3000), query [500, 2000]
      // local 500-2000 → source 1500-3000
      const spans: Span[] = [[1000, 3000]]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 2000,
        spans,
        crossfadeMs: 0,
        fromMs: 500,
        toMs: 2000,
      })
      expect(schedule).toHaveLength(1)
      const entry = schedule[0]!
      expect(entry.sourceFromMs).toBe(1500)
      expect(entry.sourceToMs).toBe(3000)
      expect(entry.ctxStartMs).toBe(0)
    })

    it("clips source range when query ends before element end", () => {
      // Element at t=0 for 2000ms (source 1000-3000), query [0, 1000]
      // local 0-1000 → source 1000-2000
      const spans: Span[] = [[1000, 3000]]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 2000,
        spans,
        crossfadeMs: 0,
        fromMs: 0,
        toMs: 1000,
      })
      expect(schedule).toHaveLength(1)
      const entry = schedule[0]!
      expect(entry.sourceFromMs).toBe(1000)
      expect(entry.sourceToMs).toBe(2000)
    })

    it("respects element start offset in ctxStartMs", () => {
      // Element starts at t=500 in timeline, query [0, 2500]
      // ctxStartMs = 500 - 0 = 500
      const spans: Span[] = [[1000, 3000]]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 500,
        elementEndTimeMs: 2500,
        spans,
        crossfadeMs: 0,
        fromMs: 0,
        toMs: 2500,
      })
      expect(schedule).toHaveLength(1)
      expect(schedule[0]!.ctxStartMs).toBe(500)
    })

    it("returns empty when element does not overlap query", () => {
      const spans: Span[] = [[1000, 3000]]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 5000,
        elementEndTimeMs: 7000,
        spans,
        crossfadeMs: 0,
        fromMs: 0,
        toMs: 2000,
      })
      expect(schedule).toHaveLength(0)
    })
  })

  describe("multi-span", () => {
    it("schedules one entry per span", () => {
      // 2 spans: [1s-3s, 5s-8s] → element duration = 5000ms
      const spans: Span[] = [
        [1000, 3000],
        [5000, 8000],
      ]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 5000,
        spans,
        crossfadeMs: 0,
        fromMs: 0,
        toMs: 5000,
      })
      expect(schedule).toHaveLength(2)
      // Span 0: source 1000-3000, ctx at 0
      expect(schedule[0]!.sourceFromMs).toBe(1000)
      expect(schedule[0]!.sourceToMs).toBe(3000)
      expect(schedule[0]!.ctxStartMs).toBe(0)
      // Span 1: source 5000-8000, ctx at 2000 (after span 0's 2000ms)
      expect(schedule[1]!.sourceFromMs).toBe(5000)
      expect(schedule[1]!.sourceToMs).toBe(8000)
      expect(schedule[1]!.ctxStartMs).toBe(2000)
    })

    it("handles repeated spans (same source position)", () => {
      const spans: Span[] = [
        [1000, 3000],
        [1000, 3000],
      ]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 4000,
        spans,
        crossfadeMs: 0,
        fromMs: 0,
        toMs: 4000,
      })
      expect(schedule).toHaveLength(2)
      expect(schedule[0]!.sourceFromMs).toBe(1000)
      expect(schedule[0]!.ctxStartMs).toBe(0)
      expect(schedule[1]!.sourceFromMs).toBe(1000)
      expect(schedule[1]!.ctxStartMs).toBe(2000) // second repeat at 2000ms in ctx
    })

    it("skips spans that don't overlap the query range", () => {
      // Element at t=0 for 5000ms, query only covers first 2000ms (span 0 only)
      const spans: Span[] = [
        [1000, 3000],
        [5000, 8000],
      ]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 5000,
        spans,
        crossfadeMs: 0,
        fromMs: 0,
        toMs: 2000,
      })
      expect(schedule).toHaveLength(1)
      expect(schedule[0]!.sourceFromMs).toBe(1000)
    })
  })

  describe("crossfade", () => {
    it("applies fade-out to non-last span and fade-in to non-first span", () => {
      const spans: Span[] = [
        [1000, 3000],
        [5000, 8000],
      ]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 5000,
        spans,
        crossfadeMs: 50,
        fromMs: 0,
        toMs: 5000,
      })
      // Span 0 (not last): fade-in=0 (first), fade-out=25ms (half of 50ms)
      expect(schedule[0]!.fadeInMs).toBe(0)
      expect(schedule[0]!.fadeOutMs).toBe(25)
      // Span 1 (not first): fade-in=25ms, fade-out=0ms (last)
      expect(schedule[1]!.fadeInMs).toBe(25)
      expect(schedule[1]!.fadeOutMs).toBe(0)
    })

    it("no fade on first or last when only one span", () => {
      const spans: Span[] = [[1000, 3000]]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 2000,
        spans,
        crossfadeMs: 50,
        fromMs: 0,
        toMs: 2000,
      })
      expect(schedule[0]!.fadeInMs).toBe(0)
      expect(schedule[0]!.fadeOutMs).toBe(0)
    })

    it("clamps fade to span duration when span is shorter than crossfade", () => {
      // Span duration = 20ms, crossfade = 50ms → clamp to 20ms → per-side = 10ms
      const spans: Span[] = [
        [1000, 1020], // 20ms span
        [5000, 8000],
      ]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 3020,
        spans,
        crossfadeMs: 50,
        fromMs: 0,
        toMs: 3020,
      })
      // Clamped: fadeMs = min(50, 20) = 20, per-side = 10ms
      expect(schedule[0]!.fadeOutMs).toBe(10)
      expect(schedule[1]!.fadeInMs).toBe(10)
    })

    it("crossfade=0 produces no fades", () => {
      const spans: Span[] = [
        [1000, 3000],
        [5000, 8000],
      ]
      const schedule = buildSpanSchedule({
        elementStartTimeMs: 0,
        elementEndTimeMs: 5000,
        spans,
        crossfadeMs: 0,
        fromMs: 0,
        toMs: 5000,
      })
      for (const entry of schedule) {
        expect(entry.fadeInMs).toBe(0)
        expect(entry.fadeOutMs).toBe(0)
      }
    })
  })
})
