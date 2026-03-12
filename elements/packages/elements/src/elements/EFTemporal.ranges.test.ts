import { describe, it, expect } from "vitest"
import {
  resolveRangesFromAttributes,
  type RangeAttributeInputs,
} from "./EFTemporal.js"

// ---------------------------------------------------------------------------
// resolveRangesFromAttributes
// ---------------------------------------------------------------------------
// Tests the precedence rules and parsing logic for the three ways to set
// ranges on EFTemporal: include-ranges, exclude-ranges, and legacy attrs.
// ---------------------------------------------------------------------------

describe("resolveRangesFromAttributes", () => {
  describe("include-ranges", () => {
    it("returns parsed spans for a valid include-ranges string", () => {
      const { spans, warnings } = resolveRangesFromAttributes({
        includeRangesAttr: "1s-3s, 5s-8s",
        excludeRangesAttr: undefined,
        intrinsicDurationMs: 10000,
      })
      expect(spans).toEqual([
        [1000, 3000],
        [5000, 8000],
      ])
      expect(warnings).toHaveLength(0)
    })

    it("preserves duplicate spans", () => {
      const { spans } = resolveRangesFromAttributes({
        includeRangesAttr: "1s-3s, 1s-3s",
        excludeRangesAttr: undefined,
        intrinsicDurationMs: 10000,
      })
      expect(spans).toEqual([
        [1000, 3000],
        [1000, 3000],
      ])
    })

    it("returns null when include-ranges is absent", () => {
      const { spans } = resolveRangesFromAttributes({
        includeRangesAttr: undefined,
        excludeRangesAttr: undefined,
        intrinsicDurationMs: 10000,
      })
      expect(spans).toBeNull()
    })
  })

  describe("exclude-ranges", () => {
    it("returns complement spans for a valid exclude-ranges string", () => {
      const { spans, warnings } = resolveRangesFromAttributes({
        includeRangesAttr: undefined,
        excludeRangesAttr: "3s-7s",
        intrinsicDurationMs: 10000,
      })
      expect(spans).toEqual([
        [0, 3000],
        [7000, 10000],
      ])
      expect(warnings).toHaveLength(0)
    })

    it("returns null when intrinsicDurationMs is not yet known", () => {
      // Can't compute complement without knowing source length
      const { spans } = resolveRangesFromAttributes({
        includeRangesAttr: undefined,
        excludeRangesAttr: "3s-7s",
        intrinsicDurationMs: undefined,
      })
      expect(spans).toBeNull()
    })
  })

  describe("precedence: include-ranges wins over exclude-ranges", () => {
    it("uses include-ranges and warns when both are present", () => {
      const { spans, warnings } = resolveRangesFromAttributes({
        includeRangesAttr: "1s-3s",
        excludeRangesAttr: "5s-7s",
        intrinsicDurationMs: 10000,
      })
      expect(spans).toEqual([[1000, 3000]])
      expect(warnings.some((w) => w.includes("include-ranges"))).toBe(true)
    })
  })

  describe("crossfade default", () => {
    it("default crossfade is 50ms when not specified", () => {
      const { crossfadeMs } = resolveRangesFromAttributes({
        includeRangesAttr: "1s-3s",
        excludeRangesAttr: undefined,
        intrinsicDurationMs: 10000,
      })
      expect(crossfadeMs).toBe(50)
    })

    it("uses provided crossfade value", () => {
      const { crossfadeMs } = resolveRangesFromAttributes({
        includeRangesAttr: "1s-3s",
        excludeRangesAttr: undefined,
        intrinsicDurationMs: 10000,
        crossfadeMs: 100,
      })
      expect(crossfadeMs).toBe(100)
    })

    it("crossfade of 0 disables fade", () => {
      const { crossfadeMs } = resolveRangesFromAttributes({
        includeRangesAttr: "1s-3s",
        excludeRangesAttr: undefined,
        intrinsicDurationMs: 10000,
        crossfadeMs: 0,
      })
      expect(crossfadeMs).toBe(0)
    })
  })
})
