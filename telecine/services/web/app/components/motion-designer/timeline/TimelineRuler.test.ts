import { describe, test, expect } from "vitest";
import { calculateOptimalInterval } from "./TimelineRuler";

const MIN_SPACING_PX = 100;

describe("calculateOptimalInterval", () => {
  describe("basic calculations", () => {
    test("calculates interval for wide container with short duration", () => {
      const width = 1000;
      const durationMs = 5000; // 5 seconds
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // With 1000px width and 100px min spacing, we can fit 10 markers
      // Duration is 5000ms, so interval should be 5000 / 10 = 500ms
      expect(interval).toBe(500);
    });

    test("calculates interval for wide container with long duration", () => {
      const width = 1000;
      const durationMs = 60000; // 60 seconds
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // With 1000px width and 100px min spacing, we can fit 10 markers
      // Duration is 60000ms, so interval should be 60000 / 10 = 6000ms
      expect(interval).toBe(6000);
    });

    test("calculates interval for narrow container", () => {
      const width = 300;
      const durationMs = 10000; // 10 seconds
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // With 300px width and 100px min spacing, we can fit 3 markers
      // Duration is 10000ms, so interval should be 10000 / 3 = 3333.33...ms
      expect(interval).toBeCloseTo(3333.33, 1);
    });

    test("calculates interval for very wide container", () => {
      const width = 2000;
      const durationMs = 10000; // 10 seconds
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // With 2000px width and 100px min spacing, we can fit 20 markers
      // Duration is 10000ms, so interval should be 10000 / 20 = 500ms
      expect(interval).toBe(500);
    });
  });

  describe("edge cases", () => {
    test("handles zero width", () => {
      const interval = calculateOptimalInterval(0, 10000, MIN_SPACING_PX);
      expect(interval).toBe(1000); // fallback
    });

    test("handles zero duration", () => {
      const interval = calculateOptimalInterval(1000, 0, MIN_SPACING_PX);
      expect(interval).toBe(1000); // fallback
    });

    test("handles negative width", () => {
      const interval = calculateOptimalInterval(-100, 10000, MIN_SPACING_PX);
      expect(interval).toBe(1000); // fallback
    });

    test("handles negative duration", () => {
      const interval = calculateOptimalInterval(1000, -1000, MIN_SPACING_PX);
      expect(interval).toBe(1000); // fallback
    });

    test("handles very small container width", () => {
      const width = 50; // Less than min spacing
      const durationMs = 10000;
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // maxMarkers would be 0, so should return durationMs (show only start and end)
      expect(interval).toBe(durationMs);
    });

    test("handles very long duration", () => {
      const width = 1000;
      const durationMs = 3600000; // 1 hour = 3,600,000ms
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // With 1000px width and 100px min spacing, we can fit 10 markers
      // Duration is 3600000ms, so interval should be 3600000 / 10 = 360000ms (6 minutes)
      expect(interval).toBe(360000);
    });

    test("handles very short duration", () => {
      const width = 1000;
      const durationMs = 100; // 0.1 seconds
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // With 1000px width and 100px min spacing, we can fit 10 markers
      // Duration is 100ms, so interval should be 100 / 10 = 10ms
      expect(interval).toBe(10);
    });

    test("handles container exactly at min spacing", () => {
      const width = 100; // Exactly min spacing
      const durationMs = 10000;
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // maxMarkers would be 1, so interval should be 10000ms (show only start and end)
      expect(interval).toBe(10000);
    });

    test("handles container slightly larger than min spacing", () => {
      const width = 150; // Slightly more than min spacing
      const durationMs = 10000;
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // maxMarkers would be 1, so interval should be 10000ms
      expect(interval).toBe(10000);
    });

    test("handles container that fits exactly 2 markers", () => {
      const width = 200; // Exactly 2 * min spacing
      const durationMs = 10000;
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // maxMarkers would be 2, so interval should be 10000 / 2 = 5000ms
      expect(interval).toBe(5000);
    });
  });

  describe("visual clarity prioritization", () => {
    test("uses calculated interval even if not a round number", () => {
      const width = 750;
      const durationMs = 10000;
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // With 750px width and 100px min spacing, we can fit 7 markers
      // Duration is 10000ms, so interval should be 10000 / 7 = 1428.57...ms
      // Should use exact value, not rounded
      expect(interval).toBeCloseTo(1428.57, 1);
    });

    test("prioritizes spacing over round numbers for odd durations", () => {
      const width = 1000;
      const durationMs = 12345; // Not a round number
      const interval = calculateOptimalInterval(width, durationMs, MIN_SPACING_PX);
      
      // With 1000px width and 100px min spacing, we can fit 10 markers
      // Duration is 12345ms, so interval should be 12345 / 10 = 1234.5ms
      // Should use exact value
      expect(interval).toBe(1234.5);
    });
  });
});

