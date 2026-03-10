import { describe, expect, test } from "vitest";
import { screenToCanvas, canvasToScreen } from "./coordinateTransform.js";
import type { PanZoomTransform } from "../elements/EFPanZoom.js";

describe("coordinateTransform", () => {
  const canvasRect = new DOMRect(100, 200, 800, 600);

  describe("screenToCanvas", () => {
    test("converts without transform", () => {
      const result = screenToCanvas(150, 250, canvasRect);
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });

    test("converts with PanZoom transform", () => {
      const transform: PanZoomTransform = { x: 10, y: 20, scale: 2 };
      const result = screenToCanvas(150, 250, canvasRect, transform);
      // canvasRect already includes pan transform, so we only divide by scale
      // (150 - 100) / 2 = 25
      // (250 - 200) / 2 = 25
      expect(result.x).toBe(25);
      expect(result.y).toBe(25);
    });
  });

  describe("canvasToScreen", () => {
    test("converts without transform", () => {
      const result = canvasToScreen(50, 50, canvasRect);
      expect(result.x).toBe(150);
      expect(result.y).toBe(250);
    });

    test("converts with PanZoom transform", () => {
      const transform: PanZoomTransform = { x: 10, y: 20, scale: 2 };
      const result = canvasToScreen(50, 50, canvasRect, transform);
      // canvasRect already includes pan transform, so we only multiply by scale
      // 100 + 50 * 2 = 200
      // 200 + 50 * 2 = 300
      expect(result.x).toBe(200);
      expect(result.y).toBe(300);
    });
  });

  test("round-trip conversion without transform", () => {
    const screenX = 150;
    const screenY = 250;
    const canvas = screenToCanvas(screenX, screenY, canvasRect);
    const backToScreen = canvasToScreen(canvas.x, canvas.y, canvasRect);
    expect(backToScreen.x).toBeCloseTo(screenX, 1);
    expect(backToScreen.y).toBeCloseTo(screenY, 1);
  });

  test("round-trip conversion with transform", () => {
    const transform: PanZoomTransform = { x: 10, y: 20, scale: 2 };
    const screenX = 150;
    const screenY = 250;
    const canvas = screenToCanvas(screenX, screenY, canvasRect, transform);
    const backToScreen = canvasToScreen(canvas.x, canvas.y, canvasRect, transform);
    expect(backToScreen.x).toBeCloseTo(screenX, 1);
    expect(backToScreen.y).toBeCloseTo(screenY, 1);
  });
});
