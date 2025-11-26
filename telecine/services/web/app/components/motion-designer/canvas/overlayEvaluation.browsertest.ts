import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { evaluateOverlayPositionForElement } from "./overlayEvaluation";

describe("overlayEvaluation", () => {
  let mockElement: HTMLElement;
  let mockOverlayLayer: HTMLElement;

  beforeEach(() => {
    // Create mock content element
    mockElement = document.createElement("div");
    mockElement.setAttribute("data-element-id", "test-element");
    mockElement.style.position = "absolute";
    mockElement.style.left = "100px";
    mockElement.style.top = "200px";
    mockElement.style.width = "300px";
    mockElement.style.height = "400px";
    document.body.appendChild(mockElement);

    // Create mock overlay layer
    mockOverlayLayer = document.createElement("div");
    mockOverlayLayer.style.position = "absolute";
    mockOverlayLayer.style.left = "50px";
    mockOverlayLayer.style.top = "50px";
    document.body.appendChild(mockOverlayLayer);
  });

  afterEach(() => {
    mockElement.remove();
    mockOverlayLayer.remove();
  });

  describe("evaluateOverlayPositionForElement", () => {
    test("evaluates overlay position from DOM", () => {
      const overlayLayerRect = mockOverlayLayer.getBoundingClientRect();
      const position = evaluateOverlayPositionForElement(
        "test-element",
        overlayLayerRect,
        1,
      );

      expect(position).toBeTruthy();
      expect(position?.coordinateSpace).toBe("overlay");
      expect(position?.x).toBeGreaterThan(0);
      expect(position?.y).toBeGreaterThan(0);
    });

    test("returns null for non-existent element", () => {
      const overlayLayerRect = mockOverlayLayer.getBoundingClientRect();
      const position = evaluateOverlayPositionForElement(
        "non-existent",
        overlayLayerRect,
        1,
      );

      expect(position).toBeNull();
    });
  });
});
