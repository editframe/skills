/**
 * Unit tests for ScaleConfig.
 *
 * These tests verify the API contract and edge case handling.
 */

import { describe, it, expect } from "vitest";
import { ScaleConfig } from "./ScaleConfig.js";

describe("ScaleConfig", () => {
  describe("constructor and basic properties", () => {
    it("should compute output dimensions correctly", () => {
      const config = new ScaleConfig(1920, 1080, 0.5);

      expect(config.inputWidth).toBe(1920);
      expect(config.inputHeight).toBe(1080);
      expect(config.exportScale).toBe(0.5);
      expect(config.outputWidth).toBe(960);
      expect(config.outputHeight).toBe(540);
    });

    it("should set needsDOMScaling when scale < 1", () => {
      const config = new ScaleConfig(1920, 1080, 0.5);
      expect(config.needsDOMScaling).toBe(true);
    });

    it("should not set needsDOMScaling when scale = 1", () => {
      const config = new ScaleConfig(1920, 1080, 1.0);
      expect(config.needsDOMScaling).toBe(false);
    });

    it("should floor output dimensions", () => {
      const config = new ScaleConfig(1920, 1080, 0.33);

      // 1920 * 0.33 = 633.6 → 633
      // 1080 * 0.33 = 356.4 → 356
      expect(config.outputWidth).toBe(633);
      expect(config.outputHeight).toBe(356);
    });
  });

  describe("immutability", () => {
    it("should be frozen", () => {
      const config = new ScaleConfig(1920, 1080, 0.5);
      expect(Object.isFrozen(config)).toBe(true);
    });

    it("should throw when attempting to modify properties", () => {
      const config = new ScaleConfig(1920, 1080, 0.5);

      expect(() => {
        (config as any).exportScale = 1.0;
      }).toThrow();
    });
  });

  describe("determinism", () => {
    it("should produce identical results for identical inputs", () => {
      const config1 = new ScaleConfig(1920, 1080, 0.5);
      const config2 = new ScaleConfig(1920, 1080, 0.5);

      expect(config1.outputWidth).toBe(config2.outputWidth);
      expect(config1.outputHeight).toBe(config2.outputHeight);
      expect(config1.needsDOMScaling).toBe(config2.needsDOMScaling);

      const canvasParams = {
        naturalWidth: 1920,
        naturalHeight: 1080,
        displayWidth: 420,
        displayHeight: 236,
      };

      expect(config1.computeCanvasScale(canvasParams)).toBe(
        config2.computeCanvasScale(canvasParams),
      );
    });
  });

  describe("computeCanvasScale", () => {
    it("should compute optimal scale for small display canvas", () => {
      const config = new ScaleConfig(1920, 1080, 0.5);

      // 1920px canvas displayed at 420px
      const scale = config.computeCanvasScale({
        naturalWidth: 1920,
        naturalHeight: 1080,
        displayWidth: 420,
        displayHeight: 236,
      });

      // displayScale = 420/1920 = 0.21875
      // optimalScale = min(1.0, 0.21875 * 0.5 * 1.5) ≈ 0.164
      expect(scale).toBeCloseTo(0.164, 2);
    });

    it("should never exceed 1.0", () => {
      const config = new ScaleConfig(1920, 1080, 2.0);

      // Canvas displayed larger than natural size
      const scale = config.computeCanvasScale({
        naturalWidth: 500,
        naturalHeight: 500,
        displayWidth: 1000,
        displayHeight: 1000,
      });

      expect(scale).toBeLessThanOrEqual(1.0);
    });

    it("should cap at 1.0 even with quality multiplier", () => {
      const config = new ScaleConfig(1920, 1080, 1.0);

      // Canvas displayed at same size as natural
      const scale = config.computeCanvasScale({
        naturalWidth: 1000,
        naturalHeight: 1000,
        displayWidth: 1000,
        displayHeight: 1000,
      });

      // displayScale = 1.0, exportScale = 1.0, quality = 1.5
      // Without cap: 1.0 * 1.0 * 1.5 = 1.5
      // With cap: min(1.0, 1.5) = 1.0
      expect(scale).toBe(1.0);
    });

    it("should use minimum of X and Y display scales", () => {
      const config = new ScaleConfig(1920, 1080, 1.0);

      // Canvas with different X and Y scaling
      const scale = config.computeCanvasScale({
        naturalWidth: 1920,
        naturalHeight: 1080,
        displayWidth: 960, // 0.5x
        displayHeight: 540, // 0.5x (same)
      });

      // Both scales are 0.5, so min is 0.5
      // optimalScale = min(1.0, 0.5 * 1.0 * 1.5) = 0.75
      expect(scale).toBe(0.75);
    });

    it("should apply quality multiplier of 1.5x", () => {
      const config = new ScaleConfig(1920, 1080, 1.0);

      const scale = config.computeCanvasScale({
        naturalWidth: 1000,
        naturalHeight: 1000,
        displayWidth: 500,
        displayHeight: 500,
      });

      // displayScale = 0.5, exportScale = 1.0, quality = 1.5
      // optimalScale = min(1.0, 0.5 * 1.0 * 1.5) = 0.75
      expect(scale).toBe(0.75);
    });
  });

  describe("getDOMTransform", () => {
    it("should return transform string when scaling needed", () => {
      const config = new ScaleConfig(1920, 1080, 0.5);
      expect(config.getDOMTransform()).toBe("scale(0.5)");
    });

    it("should return null when no scaling needed", () => {
      const config = new ScaleConfig(1920, 1080, 1.0);
      expect(config.getDOMTransform()).toBe(null);
    });

    it("should handle small scales", () => {
      const config = new ScaleConfig(1920, 1080, 0.25);
      expect(config.getDOMTransform()).toBe("scale(0.25)");
    });
  });

  describe("getDOMWrapperDimensions", () => {
    it("should return output dimensions when no scaling", () => {
      const config = new ScaleConfig(1920, 1080, 1.0);
      const dims = config.getDOMWrapperDimensions();

      expect(dims.width).toBe(1920);
      expect(dims.height).toBe(1080);
    });

    it("should return larger dimensions when scaling", () => {
      const config = new ScaleConfig(1920, 1080, 0.5);
      const dims = config.getDOMWrapperDimensions();

      // Output is 960x540, but wrapper needs to be 1920x1080
      // to accommodate the scaled-down content
      expect(dims.width).toBe(1920);
      expect(dims.height).toBe(1080);
    });

    it("should handle 0.25 scale", () => {
      const config = new ScaleConfig(1920, 1080, 0.25);
      const dims = config.getDOMWrapperDimensions();

      // Output is 480x270, wrapper needs to be 1920x1080
      expect(dims.width).toBe(1920);
      expect(dims.height).toBe(1080);
    });
  });

  describe("fromOptions (backward compatibility)", () => {
    it("should create config from legacy options", () => {
      const config = ScaleConfig.fromOptions(1920, 1080, 0.5);

      expect(config.inputWidth).toBe(1920);
      expect(config.inputHeight).toBe(1080);
      expect(config.exportScale).toBe(0.5);
      expect(config.outputWidth).toBe(960);
      expect(config.outputHeight).toBe(540);
    });
  });

  describe("edge cases", () => {
    it("should handle very small scales", () => {
      const config = new ScaleConfig(1920, 1080, 0.1);

      expect(config.outputWidth).toBe(192);
      expect(config.outputHeight).toBe(108);
      expect(config.needsDOMScaling).toBe(true);
    });

    it("should handle scale > 1 (though not recommended)", () => {
      const config = new ScaleConfig(1920, 1080, 2.0);

      expect(config.outputWidth).toBe(3840);
      expect(config.outputHeight).toBe(2160);
      expect(config.needsDOMScaling).toBe(false); // Only scales when < 1
    });

    it("should handle non-standard dimensions", () => {
      const config = new ScaleConfig(1280, 720, 0.75);

      expect(config.outputWidth).toBe(960);
      expect(config.outputHeight).toBe(540);
    });

    it("should handle zero dimensions gracefully", () => {
      const config = new ScaleConfig(0, 0, 0.5);

      expect(config.outputWidth).toBe(0);
      expect(config.outputHeight).toBe(0);
    });
  });
});
