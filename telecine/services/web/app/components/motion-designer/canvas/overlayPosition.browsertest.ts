import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  readElementComputedPosition,
  transformToOverlayCoordinates,
  evaluateOverlayPosition,
} from "./overlayPosition";

describe("overlayPosition", () => {
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
    mockElement.style.transform = "rotate(45deg)";
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

  describe("readElementComputedPosition", () => {
    test("reads element position from DOM", () => {
      const position = readElementComputedPosition("test-element");

      expect(position).toBeTruthy();
      expect(position?.screenX).toBeGreaterThan(0);
      expect(position?.screenY).toBeGreaterThan(0);
      // getBoundingClientRect includes transforms, so width/height may differ from CSS
      expect(position?.screenWidth).toBeGreaterThan(0);
      expect(position?.screenHeight).toBeGreaterThan(0);
    });

    test("reads rotation from computed transform", () => {
      const position = readElementComputedPosition("test-element");

      expect(position?.rotation).toBe(45);
    });

    test("returns null for non-existent element", () => {
      const position = readElementComputedPosition("non-existent");

      expect(position).toBeNull();
    });

    test("handles root timegroup with data-timegroup-id", () => {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-timegroup-id", "timegroup-1");
      wrapper.style.position = "absolute";
      wrapper.style.left = "500px";
      wrapper.style.top = "600px";
      wrapper.style.width = "800px";
      wrapper.style.height = "600px";
      document.body.appendChild(wrapper);

      const position = readElementComputedPosition("timegroup-1");

      expect(position).toBeTruthy();
      expect(position?.screenX).toBeGreaterThan(0);
      expect(position?.screenY).toBeGreaterThan(0);

      wrapper.remove();
    });
  });

  describe("transformToOverlayCoordinates", () => {
    test("transforms screen coordinates to overlay layer coordinates", () => {
      const computed = {
        screenX: 150,
        screenY: 250,
        screenWidth: 300,
        screenHeight: 400,
        rotation: 45,
      };

      const overlayLayerRect = mockOverlayLayer.getBoundingClientRect();
      const result = transformToOverlayCoordinates(
        computed,
        overlayLayerRect,
        1,
      );

      expect(result.x).toBe(computed.screenX - overlayLayerRect.left);
      expect(result.y).toBe(computed.screenY - overlayLayerRect.top);
      expect(result.width).toBe(300);
      expect(result.height).toBe(400);
      expect(result.rotation).toBe(45);
      expect(result.coordinateSpace).toBe("overlay");
    });

    test("preserves dimensions in screen space", () => {
      const computed = {
        screenX: 100,
        screenY: 200,
        screenWidth: 300,
        screenHeight: 400,
        rotation: 0,
      };

      const overlayLayerRect = mockOverlayLayer.getBoundingClientRect();
      const result = transformToOverlayCoordinates(
        computed,
        overlayLayerRect,
        2,
      );

      // Width/height stay in screen space (overlay doesn't scale)
      expect(result.width).toBe(300);
      expect(result.height).toBe(400);
    });
  });

  describe("evaluateOverlayPosition", () => {
    test("evaluates complete overlay position from element", () => {
      const overlayLayerRect = mockOverlayLayer.getBoundingClientRect();
      const position = evaluateOverlayPosition(
        "test-element",
        overlayLayerRect,
        1,
      );

      expect(position).toBeTruthy();
      // Overlay coordinates are relative to overlay layer, can be negative
      expect(typeof position?.x).toBe("number");
      expect(typeof position?.y).toBe("number");
      expect(position?.width).toBeGreaterThan(0);
      expect(position?.height).toBeGreaterThan(0);
      expect(position?.rotation).toBe(45);
      expect(position?.coordinateSpace).toBe("overlay");
    });

    test("returns null for non-existent element", () => {
      const overlayLayerRect = mockOverlayLayer.getBoundingClientRect();
      const position = evaluateOverlayPosition(
        "non-existent",
        overlayLayerRect,
        1,
      );

      expect(position).toBeNull();
    });
  });
});
