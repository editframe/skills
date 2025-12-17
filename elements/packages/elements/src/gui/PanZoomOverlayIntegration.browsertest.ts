import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import "../elements/EFPanZoom.js";
import "./EFOverlayLayer.js";
import "./EFOverlayItem.js";
import type { EFPanZoom } from "../elements/EFPanZoom.js";
import type { EFOverlayLayer } from "./EFOverlayLayer.js";
import type { EFOverlayItem, OverlayItemPosition } from "./EFOverlayItem.js";

/**
 * Integration tests for PanZoom + OverlayLayer + OverlayItem working together.
 *
 * The system architecture:
 * - EFPanZoom: Applies translate(x,y) scale(s) to content inside it
 * - EFOverlayLayer: Applies translate(x,y) ONLY (no scale) to itself, matching PanZoom translation
 * - EFOverlayItem: Tracks a target element's screen position and positions itself relative to OverlayLayer
 *
 * Key invariant: OverlayItem should visually overlay the target element at all zoom levels and pan positions.
 */

const testElements: HTMLElement[] = [];

beforeEach(() => {
  testElements.length = 0;
});

afterEach(() => {
  testElements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  testElements.length = 0;
});

/**
 * Helper to wait for RAF updates
 */
function waitForRaf(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to create a positioned target element
 */
function createTarget(options: {
  left: number;
  top: number;
  width: number;
  height: number;
  id?: string;
}): HTMLDivElement {
  const target = document.createElement("div");
  target.style.position = "absolute";
  target.style.left = `${options.left}px`;
  target.style.top = `${options.top}px`;
  target.style.width = `${options.width}px`;
  target.style.height = `${options.height}px`;
  target.style.backgroundColor = "red";
  if (options.id) {
    target.setAttribute("data-element-id", options.id);
  }
  return target;
}

// TODO: Update tests for new implementation
describe.skip("PanZoom + OverlayLayer + OverlayItem Integration", () => {
  describe("Basic Integration - Sibling Architecture", () => {
    /**
     * This tests the sibling architecture used in motion-designer:
     * - PanZoom and OverlayLayer are siblings
     * - OverlayLayer receives transform via prop (not context)
     * - OverlayItem tracks element inside PanZoom
     */
    test("overlay item tracks target element when PanZoom and OverlayLayer are siblings", async () => {
      // Create container
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      // Create PanZoom
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      // Create target element inside PanZoom
      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      // Create sibling OverlayLayer with transform from prop
      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      // Create OverlayItem tracking the target
      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // Verify overlay item position matches target
      const targetRect = target.getBoundingClientRect();
      const overlayLayerRect = overlayLayer.getBoundingClientRect();

      const expectedX = targetRect.left - overlayLayerRect.left;
      const expectedY = targetRect.top - overlayLayerRect.top;

      expect(parseFloat(overlayItem.style.left)).toBeCloseTo(expectedX, 1);
      expect(parseFloat(overlayItem.style.top)).toBeCloseTo(expectedY, 1);
      expect(parseFloat(overlayItem.style.width)).toBeCloseTo(
        targetRect.width,
        1,
      );
      expect(parseFloat(overlayItem.style.height)).toBeCloseTo(
        targetRect.height,
        1,
      );
    });

    test("overlay item stays aligned when PanZoom pans (siblings)", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // Now pan the view
      panZoom.x = 50;
      panZoom.y = 75;
      overlayLayer.panZoomTransform = { x: 50, y: 75, scale: 1 };

      await waitForRaf();

      // The overlay item should still visually overlay the target
      // Both target and overlay layer have moved by the same amount
      const targetRect = target.getBoundingClientRect();
      const overlayLayerRect = overlayLayer.getBoundingClientRect();

      const expectedX = targetRect.left - overlayLayerRect.left;
      const expectedY = targetRect.top - overlayLayerRect.top;

      expect(parseFloat(overlayItem.style.left)).toBeCloseTo(expectedX, 1);
      expect(parseFloat(overlayItem.style.top)).toBeCloseTo(expectedY, 1);
    });

    test("overlay item stays aligned when PanZoom zooms (siblings)", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // Now zoom to 2x
      panZoom.scale = 2;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 2 };

      await waitForRaf();

      // Target is now scaled by 2x, so its screen size is 400x300
      // Overlay item should match this screen size
      const targetRect = target.getBoundingClientRect();
      const overlayLayerRect = overlayLayer.getBoundingClientRect();

      // At 2x zoom, the target's screen dimensions should be doubled
      expect(targetRect.width).toBeCloseTo(400, 1); // 200 * 2
      expect(targetRect.height).toBeCloseTo(300, 1); // 150 * 2

      // Overlay item should match the target's screen dimensions
      expect(parseFloat(overlayItem.style.width)).toBeCloseTo(
        targetRect.width,
        1,
      );
      expect(parseFloat(overlayItem.style.height)).toBeCloseTo(
        targetRect.height,
        1,
      );

      // Position should still be correct relative to overlay layer
      const expectedX = targetRect.left - overlayLayerRect.left;
      const expectedY = targetRect.top - overlayLayerRect.top;
      expect(parseFloat(overlayItem.style.left)).toBeCloseTo(expectedX, 1);
      expect(parseFloat(overlayItem.style.top)).toBeCloseTo(expectedY, 1);
    });

    test("overlay item stays aligned during combined pan and zoom (siblings)", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 100;
      panZoom.y = 50;
      panZoom.scale = 1.5;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 100, y: 50, scale: 1.5 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // Verify alignment
      const targetRect = target.getBoundingClientRect();
      const overlayLayerRect = overlayLayer.getBoundingClientRect();

      const expectedX = targetRect.left - overlayLayerRect.left;
      const expectedY = targetRect.top - overlayLayerRect.top;

      expect(parseFloat(overlayItem.style.left)).toBeCloseTo(expectedX, 1);
      expect(parseFloat(overlayItem.style.top)).toBeCloseTo(expectedY, 1);
      expect(parseFloat(overlayItem.style.width)).toBeCloseTo(
        targetRect.width,
        1,
      );
      expect(parseFloat(overlayItem.style.height)).toBeCloseTo(
        targetRect.height,
        1,
      );
    });
  });

  describe("Context-based Architecture", () => {
    /**
     * Tests when OverlayLayer is a child of PanZoom (consumes context)
     */
    test("overlay layer consumes transform from PanZoom context when nested", async () => {
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 100;
      panZoom.y = 200;
      panZoom.scale = 1.5;
      panZoom.style.position = "relative";
      panZoom.style.width = "800px";
      panZoom.style.height = "600px";
      document.body.appendChild(panZoom);
      testElements.push(panZoom);

      await waitForRaf();

      // Create overlay layer as child of PanZoom (will consume context)
      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      panZoom.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      await waitForRaf();

      // Verify overlay layer received transform from context and applied it
      const transform = overlayLayer.style.transform;
      expect(transform).toContain("translate(100px, 200px)");
    });
  });

  describe("Position Changed Events", () => {
    test("overlay item dispatches position-changed event with correct coordinates", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 50;
      panZoom.y = 75;
      panZoom.scale = 1.5;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 50, y: 75, scale: 1.5 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      const positionChangedHandler = vi.fn();
      overlayItem.addEventListener("position-changed", positionChangedHandler);

      await waitForRaf();

      expect(positionChangedHandler).toHaveBeenCalled();
      const event = positionChangedHandler.mock
        .calls[0][0] as CustomEvent<OverlayItemPosition>;

      // The position should be relative to the overlay layer
      const targetRect = target.getBoundingClientRect();
      const overlayLayerRect = overlayLayer.getBoundingClientRect();

      expect(event.detail.x).toBeCloseTo(
        targetRect.left - overlayLayerRect.left,
        1,
      );
      expect(event.detail.y).toBeCloseTo(
        targetRect.top - overlayLayerRect.top,
        1,
      );
      expect(event.detail.width).toBeCloseTo(targetRect.width, 1);
      expect(event.detail.height).toBeCloseTo(targetRect.height, 1);
    });

    test("position-changed event fires when zoom changes size", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      const positionChangedHandler = vi.fn();
      overlayItem.addEventListener("position-changed", positionChangedHandler);

      // Zoom changes the target's screen size, which should trigger position-changed
      // because width/height change
      panZoom.scale = 2;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 2 };

      await waitForRaf();

      // Should have received position change event (size changed due to zoom)
      expect(positionChangedHandler).toHaveBeenCalled();
      const event = positionChangedHandler.mock
        .calls[0][0] as CustomEvent<OverlayItemPosition>;
      expect(event.detail.width).toBeCloseTo(400, 1); // 200 * 2
      expect(event.detail.height).toBeCloseTo(300, 1); // 150 * 2
    });
  });

  describe("Rotation Handling", () => {
    test("overlay item tracks rotation from target element", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      target.style.transform = "rotate(45deg)";
      target.style.transformOrigin = "center";
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      const positionChangedHandler = vi.fn();
      overlayItem.addEventListener("position-changed", positionChangedHandler);

      await waitForRaf();

      // Verify rotation is captured
      expect(positionChangedHandler).toHaveBeenCalled();
      const event = positionChangedHandler.mock
        .calls[0][0] as CustomEvent<OverlayItemPosition>;
      expect(event.detail.rotation).toBeCloseTo(45, 1);

      // Overlay item should apply the rotation
      expect(overlayItem.style.transform).toContain("rotate(45deg)");
    });

    test("rotation persists through zoom changes", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      target.style.transform = "rotate(30deg)";
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // Initial rotation
      expect(overlayItem.style.transform).toContain("rotate(30deg)");

      // Zoom to 2x
      panZoom.scale = 2;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 2 };

      await waitForRaf();

      // Rotation should still be 30deg
      expect(overlayItem.style.transform).toContain("rotate(30deg)");
    });
  });

  describe("Multiple Overlay Items", () => {
    test("multiple overlay items each track their own target", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target1 = createTarget({
        left: 50,
        top: 50,
        width: 100,
        height: 100,
        id: "target-1",
      });
      panZoom.appendChild(target1);
      testElements.push(target1);

      const target2 = createTarget({
        left: 200,
        top: 150,
        width: 150,
        height: 75,
        id: "target-2",
      });
      panZoom.appendChild(target2);
      testElements.push(target2);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem1 = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem1.elementId = "target-1";
      overlayLayer.appendChild(overlayItem1);
      testElements.push(overlayItem1);

      const overlayItem2 = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem2.elementId = "target-2";
      overlayLayer.appendChild(overlayItem2);
      testElements.push(overlayItem2);

      await waitForRaf();

      const target1Rect = target1.getBoundingClientRect();
      const target2Rect = target2.getBoundingClientRect();
      const overlayLayerRect = overlayLayer.getBoundingClientRect();

      // Verify each overlay tracks its own target
      expect(parseFloat(overlayItem1.style.width)).toBeCloseTo(
        target1Rect.width,
        1,
      );
      expect(parseFloat(overlayItem1.style.height)).toBeCloseTo(
        target1Rect.height,
        1,
      );

      expect(parseFloat(overlayItem2.style.width)).toBeCloseTo(
        target2Rect.width,
        1,
      );
      expect(parseFloat(overlayItem2.style.height)).toBeCloseTo(
        target2Rect.height,
        1,
      );

      // Different positions
      const item1X = parseFloat(overlayItem1.style.left);
      const item2X = parseFloat(overlayItem2.style.left);
      expect(item1X).not.toBeCloseTo(item2X, 0);
    });
  });

  describe("Dynamic Target Changes", () => {
    test("overlay item handles target being moved", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      const initialLeft = parseFloat(overlayItem.style.left);
      const initialTop = parseFloat(overlayItem.style.top);

      // Move the target
      target.style.left = "300px";
      target.style.top = "250px";

      await waitForRaf();

      // Overlay should have moved
      expect(parseFloat(overlayItem.style.left)).not.toBeCloseTo(
        initialLeft,
        0,
      );
      expect(parseFloat(overlayItem.style.top)).not.toBeCloseTo(initialTop, 0);
    });

    test("overlay item handles target being resized", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // Resize the target
      target.style.width = "400px";
      target.style.height = "300px";

      await waitForRaf();

      // Overlay should have resized
      expect(parseFloat(overlayItem.style.width)).toBeCloseTo(400, 1);
      expect(parseFloat(overlayItem.style.height)).toBeCloseTo(300, 1);
    });
  });

  describe("Nested Elements - Motion Designer Scenario", () => {
    /**
     * This test reproduces the exact scenario in motion-designer:
     * - A "timegroup" container at a specific canvas position
     * - Child elements inside the timegroup
     * - Overlays should track the child elements correctly
     */
    test("overlay tracks child element inside positioned timegroup container", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "1200px";
      container.style.height = "800px";
      document.body.appendChild(container);
      testElements.push(container);

      // Create PanZoom with some transform
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 50;
      panZoom.y = 30;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      // Create a "timegroup" wrapper at a specific canvas position
      // This mimics CanvasRootTimegroup's wrapper div
      const timegroupWrapper = document.createElement("div");
      timegroupWrapper.setAttribute("data-timegroup-id", "timegroup-1");
      timegroupWrapper.style.position = "absolute";
      timegroupWrapper.style.left = "200px"; // Canvas position
      timegroupWrapper.style.top = "100px";
      timegroupWrapper.style.width = "400px";
      timegroupWrapper.style.height = "300px";
      timegroupWrapper.style.border = "1px solid blue";
      panZoom.appendChild(timegroupWrapper);
      testElements.push(timegroupWrapper);

      // Create a child element inside the timegroup (like a red rectangle)
      const childElement = document.createElement("div");
      childElement.setAttribute("data-element-id", "child-rect-1");
      childElement.style.position = "absolute";
      childElement.style.left = "50px"; // Position within timegroup
      childElement.style.top = "50px";
      childElement.style.width = "100px";
      childElement.style.height = "80px";
      childElement.style.backgroundColor = "red";
      timegroupWrapper.appendChild(childElement);
      testElements.push(childElement);

      // Create sibling OverlayLayer
      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 50, y: 30, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      // Create OverlayItem tracking the child element
      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "child-rect-1";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // Verify overlay tracks child element correctly
      const childRect = childElement.getBoundingClientRect();
      const overlayLayerRect = overlayLayer.getBoundingClientRect();

      // Debug: log positions
      console.log("Child element rect:", childRect);
      console.log("Overlay layer rect:", overlayLayerRect);
      console.log("Overlay item styles:", {
        left: overlayItem.style.left,
        top: overlayItem.style.top,
        width: overlayItem.style.width,
        height: overlayItem.style.height,
      });

      const expectedX = childRect.left - overlayLayerRect.left;
      const expectedY = childRect.top - overlayLayerRect.top;

      // The overlay should be positioned at the child element's position relative to overlay layer
      expect(parseFloat(overlayItem.style.left)).toBeCloseTo(expectedX, 1);
      expect(parseFloat(overlayItem.style.top)).toBeCloseTo(expectedY, 1);
      expect(parseFloat(overlayItem.style.width)).toBeCloseTo(
        childRect.width,
        1,
      );
      expect(parseFloat(overlayItem.style.height)).toBeCloseTo(
        childRect.height,
        1,
      );

      // The overlay should NOT be at the child's absolute screen position
      // This would happen if overlayLayerRect was incorrectly (0,0)
      expect(parseFloat(overlayItem.style.left)).not.toBeCloseTo(
        childRect.left,
        1,
      );
    });

    test("overlay tracks child element with pan and zoom combined", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "1200px";
      container.style.height = "800px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 100;
      panZoom.y = 50;
      panZoom.scale = 1.5;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const timegroupWrapper = document.createElement("div");
      timegroupWrapper.setAttribute("data-timegroup-id", "timegroup-2");
      timegroupWrapper.style.position = "absolute";
      timegroupWrapper.style.left = "200px";
      timegroupWrapper.style.top = "100px";
      timegroupWrapper.style.width = "400px";
      timegroupWrapper.style.height = "300px";
      panZoom.appendChild(timegroupWrapper);
      testElements.push(timegroupWrapper);

      const childElement = document.createElement("div");
      childElement.setAttribute("data-element-id", "child-rect-2");
      childElement.style.position = "absolute";
      childElement.style.left = "50px";
      childElement.style.top = "50px";
      childElement.style.width = "100px";
      childElement.style.height = "80px";
      timegroupWrapper.appendChild(childElement);
      testElements.push(childElement);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 100, y: 50, scale: 1.5 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "child-rect-2";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      const childRect = childElement.getBoundingClientRect();
      const overlayLayerRect = overlayLayer.getBoundingClientRect();

      // At 1.5x scale, the child's screen dimensions should be 150x120
      expect(childRect.width).toBeCloseTo(150, 1);
      expect(childRect.height).toBeCloseTo(120, 1);

      // Overlay should match
      expect(parseFloat(overlayItem.style.width)).toBeCloseTo(
        childRect.width,
        1,
      );
      expect(parseFloat(overlayItem.style.height)).toBeCloseTo(
        childRect.height,
        1,
      );

      // Position should be correct relative to overlay layer
      const expectedX = childRect.left - overlayLayerRect.left;
      const expectedY = childRect.top - overlayLayerRect.top;
      expect(parseFloat(overlayItem.style.left)).toBeCloseTo(expectedX, 1);
      expect(parseFloat(overlayItem.style.top)).toBeCloseTo(expectedY, 1);
    });

    test("overlay layer transform is applied before overlay item reads position", async () => {
      // This test verifies there's no timing issue with transform application
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 200;
      panZoom.y = 150;
      panZoom.scale = 1;
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "timing-test",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      // Create overlay layer - important: set transform BEFORE adding overlay item
      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 200, y: 150, scale: 1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      // Wait for overlay layer's transform to be applied
      await waitForRaf();

      // Verify overlay layer has correct transform
      expect(overlayLayer.style.transform).toBe("translate(200px, 150px)");

      // Verify overlay layer's bounding rect includes the transform
      const overlayLayerRect = overlayLayer.getBoundingClientRect();
      expect(overlayLayerRect.left).toBeCloseTo(200, 0);
      expect(overlayLayerRect.top).toBeCloseTo(150, 0);

      // NOW add overlay item
      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "timing-test";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // Overlay should be correctly positioned
      const targetRect = target.getBoundingClientRect();
      const expectedX = targetRect.left - overlayLayerRect.left;
      const expectedY = targetRect.top - overlayLayerRect.top;

      expect(parseFloat(overlayItem.style.left)).toBeCloseTo(expectedX, 1);
      expect(parseFloat(overlayItem.style.top)).toBeCloseTo(expectedY, 1);
    });
  });

  describe("Edge Cases", () => {
    test("overlay item handles zero scale gracefully", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 0.1; // Minimum scale (PanZoom clamps to 0.1)
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 0.1 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // Should still position correctly at minimum scale
      const targetRect = target.getBoundingClientRect();
      expect(parseFloat(overlayItem.style.width)).toBeCloseTo(
        targetRect.width,
        1,
      );
      expect(parseFloat(overlayItem.style.height)).toBeCloseTo(
        targetRect.height,
        1,
      );
    });

    test("overlay item handles maximum scale", async () => {
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = "800px";
      container.style.height = "600px";
      document.body.appendChild(container);
      testElements.push(container);

      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.scale = 5; // Maximum scale
      panZoom.style.position = "absolute";
      panZoom.style.inset = "0";
      container.appendChild(panZoom);
      testElements.push(panZoom);

      const target = createTarget({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        id: "test-target",
      });
      panZoom.appendChild(target);
      testElements.push(target);

      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 5 };
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      container.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      const overlayItem = document.createElement(
        "ef-overlay-item",
      ) as EFOverlayItem;
      overlayItem.elementId = "test-target";
      overlayLayer.appendChild(overlayItem);
      testElements.push(overlayItem);

      await waitForRaf();

      // At 5x scale, target screen size should be 1000x750
      const targetRect = target.getBoundingClientRect();
      expect(targetRect.width).toBeCloseTo(1000, 1);
      expect(targetRect.height).toBeCloseTo(750, 1);

      // Overlay should match
      expect(parseFloat(overlayItem.style.width)).toBeCloseTo(
        targetRect.width,
        1,
      );
      expect(parseFloat(overlayItem.style.height)).toBeCloseTo(
        targetRect.height,
        1,
      );
    });

    test("overlay layer handles missing transform gracefully", async () => {
      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      // Don't set panZoomTransform
      overlayLayer.style.position = "absolute";
      overlayLayer.style.left = "0px";
      overlayLayer.style.top = "0px";
      overlayLayer.style.width = "800px";
      overlayLayer.style.height = "600px";
      document.body.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      await waitForRaf();

      // Should default to translate(0, 0)
      const transform = overlayLayer.style.transform;
      expect(transform).toContain("translate(0px, 0px)");
    });
  });
});
