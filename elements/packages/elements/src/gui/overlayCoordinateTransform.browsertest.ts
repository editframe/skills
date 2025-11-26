import { describe, expect, test } from "vitest";
import {
  screenToOverlay,
  overlayToScreen,
  elementScreenToOverlay,
} from "./overlayCoordinateTransform.js";

describe("overlayCoordinateTransform", () => {
  test("screenToOverlay transforms coordinates correctly", () => {
    const overlayLayerRect = new DOMRect(100, 200, 800, 600);

    const result = screenToOverlay(150, 250, overlayLayerRect);

    expect(result.x).toBe(50); // 150 - 100
    expect(result.y).toBe(50); // 250 - 200
  });

  test("overlayToScreen transforms coordinates correctly", () => {
    const overlayLayerRect = new DOMRect(100, 200, 800, 600);

    const result = overlayToScreen(50, 50, overlayLayerRect);

    expect(result.x).toBe(150); // 50 + 100
    expect(result.y).toBe(250); // 50 + 200
  });

  test("round-trip transformation preserves original coordinates", () => {
    const overlayLayerRect = new DOMRect(100, 200, 800, 600);
    const originalX = 150;
    const originalY = 250;

    const overlayCoords = screenToOverlay(
      originalX,
      originalY,
      overlayLayerRect,
    );
    const screenCoords = overlayToScreen(
      overlayCoords.x,
      overlayCoords.y,
      overlayLayerRect,
    );

    expect(screenCoords.x).toBeCloseTo(originalX, 0.01);
    expect(screenCoords.y).toBeCloseTo(originalY, 0.01);
  });

  test("elementScreenToOverlay transforms element rect correctly", () => {
    const elementRect = new DOMRect(150, 250, 100, 50);
    const overlayLayerRect = new DOMRect(100, 200, 800, 600);
    const rotation = 45;

    const result = elementScreenToOverlay(
      elementRect,
      overlayLayerRect,
      rotation,
    );

    expect(result.x).toBe(50); // 150 - 100
    expect(result.y).toBe(50); // 250 - 200
    expect(result.width).toBe(100); // Width stays the same
    expect(result.height).toBe(50); // Height stays the same
    expect(result.rotation).toBe(45); // Rotation passes through unchanged
  });

  test("rotation is preserved in coordinate transformation", () => {
    const elementRect = new DOMRect(150, 250, 100, 50);
    const overlayLayerRect = new DOMRect(100, 200, 800, 600);
    const rotation = 90;

    const result = elementScreenToOverlay(
      elementRect,
      overlayLayerRect,
      rotation,
    );

    expect(result.rotation).toBe(90);
  });

  test("handles zero overlay layer offset", () => {
    const overlayLayerRect = new DOMRect(0, 0, 800, 600);

    const result = screenToOverlay(150, 250, overlayLayerRect);

    expect(result.x).toBe(150);
    expect(result.y).toBe(250);
  });

  test("handles negative overlay layer position", () => {
    const overlayLayerRect = new DOMRect(-50, -100, 800, 600);

    const result = screenToOverlay(150, 250, overlayLayerRect);

    expect(result.x).toBe(200); // 150 - (-50)
    expect(result.y).toBe(350); // 250 - (-100)
  });
});
