import { describe, test, expect } from "vitest";
import { 
  calculateOptimalInterval,
  calculateFrameIntervalMs,
  calculatePixelsPerFrame,
  shouldShowFrameMarkers,
} from "./TimelineRuler";

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

describe("calculateFrameIntervalMs", () => {
  test("calculates frame interval for 30fps", () => {
    const interval = calculateFrameIntervalMs(30);
    expect(interval).toBeCloseTo(33.333, 2);
  });

  test("calculates frame interval for 60fps", () => {
    const interval = calculateFrameIntervalMs(60);
    expect(interval).toBeCloseTo(16.667, 2);
  });

  test("calculates frame interval for 24fps", () => {
    const interval = calculateFrameIntervalMs(24);
    expect(interval).toBeCloseTo(41.667, 2);
  });

  test("handles zero fps with fallback", () => {
    const interval = calculateFrameIntervalMs(0);
    expect(interval).toBeCloseTo(33.333, 2); // fallback to 30fps
  });

  test("handles negative fps with fallback", () => {
    const interval = calculateFrameIntervalMs(-10);
    expect(interval).toBeCloseTo(33.333, 2); // fallback to 30fps
  });
});

describe("calculatePixelsPerFrame", () => {
  test("calculates pixels per frame at 1x zoom for 30fps", () => {
    const frameIntervalMs = calculateFrameIntervalMs(30);
    const pixelsPerFrame = calculatePixelsPerFrame(frameIntervalMs, 1);
    // At 1x zoom: 100 pixels per second, 30fps = 33.333ms per frame
    // (33.333 / 1000) * 100 * 1 = 3.333 pixels per frame
    expect(pixelsPerFrame).toBeCloseTo(3.333, 2);
  });

  test("calculates pixels per frame at 10x zoom for 30fps", () => {
    const frameIntervalMs = calculateFrameIntervalMs(30);
    const pixelsPerFrame = calculatePixelsPerFrame(frameIntervalMs, 10);
    // At 10x zoom: 1000 pixels per second, 30fps = 33.333ms per frame
    // (33.333 / 1000) * 100 * 10 = 33.333 pixels per frame
    expect(pixelsPerFrame).toBeCloseTo(33.333, 2);
  });

  test("calculates pixels per frame at 1x zoom for 60fps", () => {
    const frameIntervalMs = calculateFrameIntervalMs(60);
    const pixelsPerFrame = calculatePixelsPerFrame(frameIntervalMs, 1);
    // At 1x zoom: 100 pixels per second, 60fps = 16.667ms per frame
    // (16.667 / 1000) * 100 * 1 = 1.667 pixels per frame
    expect(pixelsPerFrame).toBeCloseTo(1.667, 2);
  });
});

describe("shouldShowFrameMarkers", () => {
  test("shows frame markers when spacing >= 5px", () => {
    expect(shouldShowFrameMarkers(5)).toBe(true);
    expect(shouldShowFrameMarkers(5.1)).toBe(true);
    expect(shouldShowFrameMarkers(10)).toBe(true);
    expect(shouldShowFrameMarkers(100)).toBe(true);
  });

  test("hides frame markers when spacing < 5px", () => {
    expect(shouldShowFrameMarkers(4.9)).toBe(false);
    expect(shouldShowFrameMarkers(1)).toBe(false);
    expect(shouldShowFrameMarkers(0)).toBe(false);
  });

  test("uses custom minimum spacing", () => {
    expect(shouldShowFrameMarkers(10, 10)).toBe(true);
    expect(shouldShowFrameMarkers(9, 10)).toBe(false);
    expect(shouldShowFrameMarkers(10.1, 10)).toBe(true);
  });

  test("shows markers at exact minimum spacing threshold", () => {
    expect(shouldShowFrameMarkers(5, 5)).toBe(true);
    expect(shouldShowFrameMarkers(4.999, 5)).toBe(false);
  });
});

describe("TimelineRuler frame marker rendering conditions", () => {
  test("frame markers should be shown when zoomed in enough", () => {
    // At 10x zoom with 30fps: pixelsPerFrame = (33.333 / 1000) * 100 * 10 = 33.333px
    const frameIntervalMs = calculateFrameIntervalMs(30);
    const pixelsPerFrame = calculatePixelsPerFrame(frameIntervalMs, 10);
    expect(shouldShowFrameMarkers(pixelsPerFrame)).toBe(true);
  });

  test("frame markers should be hidden when not zoomed enough", () => {
    // At 1x zoom with 30fps: pixelsPerFrame = (33.333 / 1000) * 100 * 1 = 3.333px
    const frameIntervalMs = calculateFrameIntervalMs(30);
    const pixelsPerFrame = calculatePixelsPerFrame(frameIntervalMs, 1);
    expect(shouldShowFrameMarkers(pixelsPerFrame)).toBe(false);
  });

  test("frame markers visibility changes with FPS", () => {
    // Higher FPS = smaller frame interval = fewer pixels per frame
    const frameIntervalMs30 = calculateFrameIntervalMs(30);
    const pixelsPerFrame30 = calculatePixelsPerFrame(frameIntervalMs30, 5);
    
    const frameIntervalMs60 = calculateFrameIntervalMs(60);
    const pixelsPerFrame60 = calculatePixelsPerFrame(frameIntervalMs60, 5);
    
    // 60fps has smaller pixels per frame than 30fps at same zoom
    expect(pixelsPerFrame60).toBeLessThan(pixelsPerFrame30);
    
    // At 5x zoom, 30fps might show markers but 60fps might not
    // This depends on exact values, but we verify the relationship
    expect(pixelsPerFrame60).toBe(pixelsPerFrame30 / 2);
  });

  test("frame markers visibility changes with zoom scale", () => {
    const frameIntervalMs = calculateFrameIntervalMs(30);
    
    // At low zoom, markers hidden
    const pixelsPerFrame1x = calculatePixelsPerFrame(frameIntervalMs, 1);
    expect(shouldShowFrameMarkers(pixelsPerFrame1x)).toBe(false);
    
    // At high zoom, markers shown
    const pixelsPerFrame10x = calculatePixelsPerFrame(frameIntervalMs, 10);
    expect(shouldShowFrameMarkers(pixelsPerFrame10x)).toBe(true);
  });
});

