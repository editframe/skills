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
      // (150 - 100 - 10) / 2 = 20
      // (250 - 200 - 20) / 2 = 15
      expect(result.x).toBe(20);
      expect(result.y).toBe(15);
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
      // 100 + 50 * 2 + 10 = 210
      // 200 + 50 * 2 + 20 = 320
      expect(result.x).toBe(210);
      expect(result.y).toBe(320);
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

