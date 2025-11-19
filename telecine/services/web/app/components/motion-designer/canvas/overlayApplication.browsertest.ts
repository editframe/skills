import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { applyOverlayPosition, batchOverlayUpdates } from "./overlayApplication";
import type { OverlayPosition } from "./overlayTypes";

describe("overlayApplication", () => {
  let mockOverlayElement: HTMLElement;

  beforeEach(() => {
    mockOverlayElement = document.createElement("div");
    mockOverlayElement.setAttribute("data-overlay-id", "test-element");
    document.body.appendChild(mockOverlayElement);
  });

  afterEach(() => {
    mockOverlayElement.remove();
  });

  describe("applyOverlayPosition", () => {
    test("applies position to overlay element", () => {
      const position: OverlayPosition = {
        x: 100,
        y: 200,
        width: 300,
        height: 400,
        rotation: 45,
        coordinateSpace: "overlay",
      };

      applyOverlayPosition(mockOverlayElement, position);

      expect(mockOverlayElement.style.left).toBe("100px");
      expect(mockOverlayElement.style.top).toBe("200px");
      expect(mockOverlayElement.style.width).toBe("300px");
      expect(mockOverlayElement.style.height).toBe("400px");
      expect(mockOverlayElement.style.transform).toBe("rotate(45deg)");
      // Browser may normalize "center" to "center center"
      expect(mockOverlayElement.style.transformOrigin).toMatch(/^center/);
    });

    test("applies zero rotation correctly", () => {
      const position: OverlayPosition = {
        x: 50,
        y: 75,
        width: 200,
        height: 150,
        rotation: 0,
        coordinateSpace: "overlay",
      };

      applyOverlayPosition(mockOverlayElement, position);

      expect(mockOverlayElement.style.transform).toBe("rotate(0deg)");
    });

    test("applies negative rotation correctly", () => {
      const position: OverlayPosition = {
        x: 50,
        y: 75,
        width: 200,
        height: 150,
        rotation: -45,
        coordinateSpace: "overlay",
      };

      applyOverlayPosition(mockOverlayElement, position);

      expect(mockOverlayElement.style.transform).toBe("rotate(-45deg)");
    });
  });

  describe("batchOverlayUpdates", () => {
    test("applies multiple overlay positions", () => {
      const overlay1 = document.createElement("div");
      overlay1.setAttribute("data-overlay-id", "element-1");
      document.body.appendChild(overlay1);

      const overlay2 = document.createElement("div");
      overlay2.setAttribute("data-overlay-id", "element-2");
      document.body.appendChild(overlay2);

      const updates = [
        {
          elementId: "element-1",
          position: {
            x: 10,
            y: 20,
            width: 100,
            height: 200,
            rotation: 0,
            coordinateSpace: "overlay" as const,
          },
        },
        {
          elementId: "element-2",
          position: {
            x: 30,
            y: 40,
            width: 150,
            height: 250,
            rotation: 90,
            coordinateSpace: "overlay" as const,
          },
        },
      ];

      batchOverlayUpdates(updates, applyOverlayPosition);

      expect(overlay1.style.left).toBe("10px");
      expect(overlay1.style.top).toBe("20px");
      expect(overlay1.style.width).toBe("100px");
      expect(overlay1.style.height).toBe("200px");
      expect(overlay1.style.transform).toBe("rotate(0deg)");

      expect(overlay2.style.left).toBe("30px");
      expect(overlay2.style.top).toBe("40px");
      expect(overlay2.style.width).toBe("150px");
      expect(overlay2.style.height).toBe("250px");
      expect(overlay2.style.transform).toBe("rotate(90deg)");

      overlay1.remove();
      overlay2.remove();
    });

    test("skips non-existent overlay elements", () => {
      const updates = [
        {
          elementId: "non-existent",
          position: {
            x: 10,
            y: 20,
            width: 100,
            height: 200,
            rotation: 0,
            coordinateSpace: "overlay" as const,
          },
        },
      ];

      // Should not throw
      batchOverlayUpdates(updates, applyOverlayPosition);
    });
  });
});

