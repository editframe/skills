import { describe, it, expect } from "vitest";
import { computeFitScale } from "./EFFitScale.js";
import type { ScaleInput } from "./EFFitScale.js";

describe("computeFitScale", () => {
  describe("invalid inputs", () => {
    it("returns null for zero container width", () => {
      expect(
        computeFitScale({
          containerWidth: 0,
          containerHeight: 500,
          contentWidth: 1920,
          contentHeight: 1080,
        }),
      ).toBe(null);
    });

    it("returns null for zero container height", () => {
      expect(
        computeFitScale({
          containerWidth: 500,
          containerHeight: 0,
          contentWidth: 1920,
          contentHeight: 1080,
        }),
      ).toBe(null);
    });

    it("returns null for zero content width", () => {
      expect(
        computeFitScale({
          containerWidth: 500,
          containerHeight: 500,
          contentWidth: 0,
          contentHeight: 1080,
        }),
      ).toBe(null);
    });

    it("returns null for zero content height", () => {
      expect(
        computeFitScale({
          containerWidth: 500,
          containerHeight: 500,
          contentWidth: 1920,
          contentHeight: 0,
        }),
      ).toBe(null);
    });

    it("returns null for negative container width", () => {
      expect(
        computeFitScale({
          containerWidth: -100,
          containerHeight: 500,
          contentWidth: 1920,
          contentHeight: 1080,
        }),
      ).toBe(null);
    });

    it("returns null for negative content height", () => {
      expect(
        computeFitScale({
          containerWidth: 500,
          containerHeight: 500,
          contentWidth: 1920,
          contentHeight: -1080,
        }),
      ).toBe(null);
    });

    it("returns null when all dimensions are zero", () => {
      expect(
        computeFitScale({
          containerWidth: 0,
          containerHeight: 0,
          contentWidth: 0,
          contentHeight: 0,
        }),
      ).toBe(null);
    });
  });

  describe("letterboxing (wide content in tall container)", () => {
    it("constrains by width when content is wider relative to container", () => {
      // 16:9 content (1920x1080) in 300x800 tall container
      const result = computeFitScale({
        containerWidth: 300,
        containerHeight: 800,
        contentWidth: 1920,
        contentHeight: 1080,
      });

      expect(result).not.toBe(null);
      // Content ratio (1.78) > container ratio (0.375), so constrain by width
      // scale = 300 / 1920 = 0.15625
      expect(result!.scale).toBeCloseTo(300 / 1920, 10);
      // Scaled height = 1080 * 0.15625 = 168.75
      // translateY = (800 - 168.75) / 2 = 315.625
      expect(result!.translateY).toBeCloseTo((800 - 1080 * result!.scale) / 2);
      // translateX should be 0 (width exactly matches)
      expect(result!.translateX).toBeCloseTo(0);
    });
  });

  describe("pillarboxing (tall content in wide container)", () => {
    it("constrains by height when content is taller relative to container", () => {
      // 9:16 content (1080x1920) in 1000x300 wide container
      const result = computeFitScale({
        containerWidth: 1000,
        containerHeight: 300,
        contentWidth: 1080,
        contentHeight: 1920,
      });

      expect(result).not.toBe(null);
      // Content ratio (0.5625) < container ratio (3.33), so constrain by height
      // scale = 300 / 1920 = 0.15625
      expect(result!.scale).toBeCloseTo(300 / 1920, 10);
      // Scaled width = 1080 * 0.15625 = 168.75
      // translateX = (1000 - 168.75) / 2 = 415.625
      expect(result!.translateX).toBeCloseTo((1000 - 1080 * result!.scale) / 2);
      // translateY should be 0 (height exactly matches)
      expect(result!.translateY).toBeCloseTo(0);
    });

    it("pillarboxes 16:9 content in very wide container", () => {
      // 16:9 content in extremely wide container
      const result = computeFitScale({
        containerWidth: 2000,
        containerHeight: 300,
        contentWidth: 1920,
        contentHeight: 1080,
      });

      expect(result).not.toBe(null);
      // Container ratio (6.67) > content ratio (1.78), so constrain by height
      // scale = 300 / 1080 = 0.2778
      expect(result!.scale).toBeCloseTo(300 / 1080, 10);
      // Scaled width = 1920 * scale = 533.33
      const scaledWidth = 1920 * result!.scale;
      expect(result!.translateX).toBeCloseTo((2000 - scaledWidth) / 2);
      expect(result!.translateY).toBeCloseTo(0);
    });
  });

  describe("exact fit", () => {
    it("returns scale=1 when content exactly matches container", () => {
      const result = computeFitScale({
        containerWidth: 1920,
        containerHeight: 1080,
        contentWidth: 1920,
        contentHeight: 1080,
      });

      expect(result).not.toBe(null);
      expect(result!.scale).toBe(1);
      expect(result!.translateX).toBe(0);
      expect(result!.translateY).toBe(0);
    });

    it("returns scale=1 for matching square dimensions", () => {
      const result = computeFitScale({
        containerWidth: 500,
        containerHeight: 500,
        contentWidth: 500,
        contentHeight: 500,
      });

      expect(result).not.toBe(null);
      expect(result!.scale).toBe(1);
      expect(result!.translateX).toBe(0);
      expect(result!.translateY).toBe(0);
    });
  });

  describe("scaling up (small content, large container)", () => {
    it("scales up content to fill container", () => {
      // 100x100 content in 500x500 container
      const result = computeFitScale({
        containerWidth: 500,
        containerHeight: 500,
        contentWidth: 100,
        contentHeight: 100,
      });

      expect(result).not.toBe(null);
      expect(result!.scale).toBe(5);
      expect(result!.translateX).toBe(0);
      expect(result!.translateY).toBe(0);
    });

    it("scales up small 16:9 content into large square container", () => {
      // 192x108 content in 1000x1000 container
      const result = computeFitScale({
        containerWidth: 1000,
        containerHeight: 1000,
        contentWidth: 192,
        contentHeight: 108,
      });

      expect(result).not.toBe(null);
      // Container ratio (1.0) < content ratio (1.78), constrain by width
      // scale = 1000 / 192 = 5.2083
      expect(result!.scale).toBeCloseTo(1000 / 192, 10);
      // Scaled height = 108 * 5.2083 = 562.5
      // translateY = (1000 - 562.5) / 2 = 218.75
      const scaledHeight = 108 * result!.scale;
      expect(result!.translateY).toBeCloseTo((1000 - scaledHeight) / 2);
      expect(result!.translateX).toBeCloseTo(0);
    });
  });

  describe("aspect ratio combinations", () => {
    it("1:1 content in 16:9 container", () => {
      const result = computeFitScale({
        containerWidth: 1920,
        containerHeight: 1080,
        contentWidth: 500,
        contentHeight: 500,
      });

      expect(result).not.toBe(null);
      // Container ratio (1.78) > content ratio (1.0), constrain by height
      // scale = 1080 / 500 = 2.16
      expect(result!.scale).toBeCloseTo(1080 / 500, 10);
      // Scaled width = 500 * 2.16 = 1080
      // translateX = (1920 - 1080) / 2 = 420
      const scaledWidth = 500 * result!.scale;
      expect(result!.translateX).toBeCloseTo((1920 - scaledWidth) / 2);
      expect(result!.translateY).toBeCloseTo(0);
    });

    it("16:9 content in 1:1 container", () => {
      const result = computeFitScale({
        containerWidth: 500,
        containerHeight: 500,
        contentWidth: 1920,
        contentHeight: 1080,
      });

      expect(result).not.toBe(null);
      // Container ratio (1.0) < content ratio (1.78), constrain by width
      // scale = 500 / 1920 = 0.2604
      expect(result!.scale).toBeCloseTo(500 / 1920, 10);
      expect(result!.translateX).toBeCloseTo(0);
      // Scaled height = 1080 * 0.2604 = 281.25
      // translateY = (500 - 281.25) / 2 = 109.375
      const scaledHeight = 1080 * result!.scale;
      expect(result!.translateY).toBeCloseTo((500 - scaledHeight) / 2);
    });

    it("4:3 content in 16:9 container", () => {
      const result = computeFitScale({
        containerWidth: 1920,
        containerHeight: 1080,
        contentWidth: 1024,
        contentHeight: 768,
      });

      expect(result).not.toBe(null);
      // Container ratio (1.78) > content ratio (1.33), constrain by height
      expect(result!.scale).toBeCloseTo(1080 / 768, 10);
      expect(result!.translateY).toBeCloseTo(0);
      // There should be pillarbox padding
      expect(result!.translateX).toBeGreaterThan(0);
    });

    it("16:9 content in 4:3 container", () => {
      const result = computeFitScale({
        containerWidth: 1024,
        containerHeight: 768,
        contentWidth: 1920,
        contentHeight: 1080,
      });

      expect(result).not.toBe(null);
      // Container ratio (1.33) < content ratio (1.78), constrain by width
      expect(result!.scale).toBeCloseTo(1024 / 1920, 10);
      expect(result!.translateX).toBeCloseTo(0);
      // There should be letterbox padding
      expect(result!.translateY).toBeGreaterThan(0);
    });

    it("ultra-wide 21:9 content in 16:9 container", () => {
      const result = computeFitScale({
        containerWidth: 1920,
        containerHeight: 1080,
        contentWidth: 2560,
        contentHeight: 1080,
      });

      expect(result).not.toBe(null);
      // Container ratio (1.78) < content ratio (2.37), constrain by width
      expect(result!.scale).toBeCloseTo(1920 / 2560, 10);
      expect(result!.translateX).toBeCloseTo(0);
      // Letterbox
      expect(result!.translateY).toBeGreaterThan(0);
    });
  });

  describe("centering correctness", () => {
    it("centers horizontally when pillarboxed", () => {
      const result = computeFitScale({
        containerWidth: 1000,
        containerHeight: 500,
        contentWidth: 500,
        contentHeight: 500,
      });

      expect(result).not.toBe(null);
      // Scale by height: 500/500 = 1
      expect(result!.scale).toBe(1);
      // TranslateX should center: (1000 - 500) / 2 = 250
      expect(result!.translateX).toBe(250);
      expect(result!.translateY).toBe(0);
    });

    it("centers vertically when letterboxed", () => {
      const result = computeFitScale({
        containerWidth: 500,
        containerHeight: 1000,
        contentWidth: 500,
        contentHeight: 500,
      });

      expect(result).not.toBe(null);
      // Scale by width: 500/500 = 1
      expect(result!.scale).toBe(1);
      expect(result!.translateX).toBe(0);
      // TranslateY should center: (1000 - 500) / 2 = 250
      expect(result!.translateY).toBe(250);
    });

    it("produces symmetric centering for symmetric inputs", () => {
      // 16:9 content in square container
      const result = computeFitScale({
        containerWidth: 1000,
        containerHeight: 1000,
        contentWidth: 1920,
        contentHeight: 1080,
      });

      expect(result).not.toBe(null);
      // Should be centered horizontally (translateX = 0, constrained by width)
      expect(result!.translateX).toBeCloseTo(0);
      // Vertical centering should be positive
      expect(result!.translateY).toBeGreaterThan(0);

      // Verify centering: the gap should be equal on both sides
      const scaledHeight = 1080 * result!.scale;
      const topGap = result!.translateY;
      const bottomGap = 1000 - scaledHeight - result!.translateY;
      expect(topGap).toBeCloseTo(bottomGap, 10);
    });
  });

  describe("determinism", () => {
    it("produces identical results for identical inputs", () => {
      const input: ScaleInput = {
        containerWidth: 1920,
        containerHeight: 1080,
        contentWidth: 960,
        contentHeight: 540,
      };

      const result1 = computeFitScale(input);
      const result2 = computeFitScale(input);

      expect(result1).toEqual(result2);
    });

    it("produces identical results for input copies", () => {
      const result1 = computeFitScale({
        containerWidth: 1920,
        containerHeight: 1080,
        contentWidth: 960,
        contentHeight: 540,
      });

      const result2 = computeFitScale({
        containerWidth: 1920,
        containerHeight: 1080,
        contentWidth: 960,
        contentHeight: 540,
      });

      expect(result1).toEqual(result2);
    });
  });

  describe("boundary values", () => {
    it("handles very small dimensions (1x1)", () => {
      const result = computeFitScale({
        containerWidth: 1,
        containerHeight: 1,
        contentWidth: 1,
        contentHeight: 1,
      });

      expect(result).not.toBe(null);
      expect(result!.scale).toBe(1);
      expect(result!.translateX).toBe(0);
      expect(result!.translateY).toBe(0);
    });

    it("handles very large dimensions", () => {
      const result = computeFitScale({
        containerWidth: 10000,
        containerHeight: 10000,
        contentWidth: 10000,
        contentHeight: 10000,
      });

      expect(result).not.toBe(null);
      expect(result!.scale).toBe(1);
    });

    it("handles fractional dimensions", () => {
      const result = computeFitScale({
        containerWidth: 333.33,
        containerHeight: 444.44,
        contentWidth: 100.5,
        contentHeight: 200.7,
      });

      expect(result).not.toBe(null);
      expect(result!.scale).toBeGreaterThan(0);
      // Verify scaled content fits within container
      const scaledWidth = 100.5 * result!.scale;
      const scaledHeight = 200.7 * result!.scale;
      expect(scaledWidth).toBeLessThanOrEqual(333.33 + 0.001);
      expect(scaledHeight).toBeLessThanOrEqual(444.44 + 0.001);
    });

    it("handles extreme aspect ratio (very wide)", () => {
      const result = computeFitScale({
        containerWidth: 500,
        containerHeight: 500,
        contentWidth: 10000,
        contentHeight: 1,
      });

      expect(result).not.toBe(null);
      // Constrained by width: 500/10000 = 0.05
      expect(result!.scale).toBeCloseTo(500 / 10000, 10);
    });

    it("handles extreme aspect ratio (very tall)", () => {
      const result = computeFitScale({
        containerWidth: 500,
        containerHeight: 500,
        contentWidth: 1,
        contentHeight: 10000,
      });

      expect(result).not.toBe(null);
      // Constrained by height: 500/10000 = 0.05
      expect(result!.scale).toBeCloseTo(500 / 10000, 10);
    });
  });

  describe("invariant: scaled content always fits within container", () => {
    const testCases: ScaleInput[] = [
      {
        containerWidth: 1920,
        containerHeight: 1080,
        contentWidth: 3840,
        contentHeight: 2160,
      },
      {
        containerWidth: 300,
        containerHeight: 800,
        contentWidth: 1920,
        contentHeight: 1080,
      },
      {
        containerWidth: 1000,
        containerHeight: 300,
        contentWidth: 1080,
        contentHeight: 1920,
      },
      {
        containerWidth: 500,
        containerHeight: 500,
        contentWidth: 1920,
        contentHeight: 1080,
      },
      {
        containerWidth: 100,
        containerHeight: 100,
        contentWidth: 1,
        contentHeight: 1,
      },
      {
        containerWidth: 1,
        containerHeight: 1000,
        contentWidth: 1000,
        contentHeight: 1,
      },
      {
        containerWidth: 1000,
        containerHeight: 1,
        contentWidth: 1,
        contentHeight: 1000,
      },
      {
        containerWidth: 333,
        containerHeight: 777,
        contentWidth: 123,
        contentHeight: 456,
      },
    ];

    for (const input of testCases) {
      it(`${input.contentWidth}x${input.contentHeight} in ${input.containerWidth}x${input.containerHeight}`, () => {
        const result = computeFitScale(input);
        expect(result).not.toBe(null);

        const scaledWidth = input.contentWidth * result!.scale;
        const scaledHeight = input.contentHeight * result!.scale;

        // Scaled content should fit within container (with floating point tolerance)
        expect(scaledWidth).toBeLessThanOrEqual(input.containerWidth + 0.001);
        expect(scaledHeight).toBeLessThanOrEqual(input.containerHeight + 0.001);

        // At least one dimension should match container (content fills one axis)
        const widthFills = Math.abs(scaledWidth - input.containerWidth) < 0.001;
        const heightFills = Math.abs(scaledHeight - input.containerHeight) < 0.001;
        expect(widthFills || heightFills).toBe(true);

        // Translation should keep content within container bounds
        expect(result!.translateX).toBeGreaterThanOrEqual(-0.001);
        expect(result!.translateY).toBeGreaterThanOrEqual(-0.001);
        expect(result!.translateX + scaledWidth).toBeLessThanOrEqual(input.containerWidth + 0.001);
        expect(result!.translateY + scaledHeight).toBeLessThanOrEqual(
          input.containerHeight + 0.001,
        );
      });
    }
  });
});
