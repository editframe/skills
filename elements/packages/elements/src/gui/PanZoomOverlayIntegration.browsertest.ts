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
 * Wait until an overlay item has a non-zero width style set (RAF loop has run at least once).
 */
async function waitForOverlayUpdate(item: Element): Promise<void> {
  await vi.waitUntil(
    () => parseFloat((item as HTMLElement).style.width) > 0,
    { timeout: 5000, interval: 16 },
  );
}

/**
 * Wait until a predicate is satisfied (e.g. overlay reached expected position after a change).
 */
async function waitFor(predicate: () => boolean): Promise<void> {
  await vi.waitUntil(predicate, { timeout: 5000, interval: 16 });
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

describe("PanZoom + OverlayLayer + OverlayItem Integration", () => {
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

      await waitForOverlayUpdate(overlayItem);

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

      await waitForOverlayUpdate(overlayItem);

      // Now pan the view
      panZoom.x = 50;
      panZoom.y = 75;
      overlayLayer.panZoomTransform = { x: 50, y: 75, scale: 1 };

      await panZoom.updateComplete;
      await waitFor(() => overlayLayer.style.transform === "translate(50px, 75px)");

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

      await waitForOverlayUpdate(overlayItem);

      // Now zoom to 2x
      panZoom.scale = 2;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 2 };

      await waitFor(() => parseFloat((overlayItem as HTMLElement).style.width) > 300);

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

      await waitForOverlayUpdate(overlayItem);

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
     * Tests when OverlayLayer is a child of PanZoom (consumes context).
     * When overlay is a CHILD of panzoom, it delegates transform to parent
     * and sets transform: none (parent's content-wrapper handles it).
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

      await panZoom.updateComplete;

      // Create overlay layer as child of PanZoom (will consume context)
      const overlayLayer = document.createElement(
        "ef-overlay-layer",
      ) as EFOverlayLayer;
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      panZoom.appendChild(overlayLayer);
      testElements.push(overlayLayer);

      await waitFor(() => overlayLayer.style.transform === "none");

      // When overlay is CHILD of panzoom, it delegates transform to parent
      // and sets its own transform to 'none'
      expect(overlayLayer.style.transform).toBe("none");

      // The parent's content-wrapper handles the actual visual transform
      const contentWrapper = panZoom.shadowRoot?.querySelector(
        ".content-wrapper",
      ) as HTMLElement;
      expect(contentWrapper).toBeTruthy();
      if (contentWrapper) {
        const wrapperTransform = contentWrapper.style.transform;
        expect(wrapperTransform).toContain("translate");
        expect(wrapperTransform).toContain("scale");
      }
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

      await waitFor(() => positionChangedHandler.mock.calls.length > 0);

      expect(positionChangedHandler).toHaveBeenCalled();
      const event = positionChangedHandler.mock
        .calls[0]![0] as CustomEvent<OverlayItemPosition>;

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

      // Wait for Lit elements to finish initial render and RAF loop to establish position
      await panZoom.updateComplete;
      await overlayLayer.updateComplete;
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );

      // Set up event listener before triggering the change
      const positionChangedPromise = new Promise<
        CustomEvent<OverlayItemPosition>
      >((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("position-changed event not fired within 5s")),
          5000,
        );
        overlayItem.addEventListener(
          "position-changed",
          (e) => {
            clearTimeout(timeout);
            resolve(e as CustomEvent<OverlayItemPosition>);
          },
          { once: true },
        );
      });

      // Zoom changes the target's screen size, which should trigger position-changed
      panZoom.scale = 2;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 2 };
      await panZoom.updateComplete;

      const event = await positionChangedPromise;
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

      await waitFor(() => positionChangedHandler.mock.calls.length > 0);

      // Verify rotation is captured
      expect(positionChangedHandler).toHaveBeenCalled();
      const event = positionChangedHandler.mock
        .calls[0]![0] as CustomEvent<OverlayItemPosition>;
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

      await waitFor(() => (overlayItem as HTMLElement).style.transform.includes("rotate(30deg)"));

      // Initial rotation
      expect(overlayItem.style.transform).toContain("rotate(30deg)");

      // Zoom to 2x
      panZoom.scale = 2;
      overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 2 };

      await waitFor(() => parseFloat((overlayItem as HTMLElement).style.width) > 300);

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

      await waitForOverlayUpdate(overlayItem1);
      await waitForOverlayUpdate(overlayItem2);

      const target1Rect = target1.getBoundingClientRect();
      const target2Rect = target2.getBoundingClientRect();

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

      await waitForOverlayUpdate(overlayItem);

      const initialLeft = parseFloat((overlayItem as HTMLElement).style.left);
      const initialTop = parseFloat((overlayItem as HTMLElement).style.top);

      // Move the target
      target.style.left = "300px";
      target.style.top = "250px";

      await waitFor(() => parseFloat((overlayItem as HTMLElement).style.left) !== initialLeft);

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

      await waitForOverlayUpdate(overlayItem);

      // Resize the target
      target.style.width = "400px";
      target.style.height = "300px";

      await waitFor(() => parseFloat((overlayItem as HTMLElement).style.width) > 350);

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

      await waitForOverlayUpdate(overlayItem);

      // Verify overlay tracks child element correctly
      const childRect = childElement.getBoundingClientRect();
      const overlayLayerRect = overlayLayer.getBoundingClientRect();

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

      await waitForOverlayUpdate(overlayItem);

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
      await waitFor(() => overlayLayer.style.transform === "translate(200px, 150px)");

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

      await waitForOverlayUpdate(overlayItem);

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

      await waitForOverlayUpdate(overlayItem);

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

      await waitForOverlayUpdate(overlayItem);

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

      await waitFor(() => overlayLayer.style.transform.includes("translate(0px, 0px)"));

      // Should default to translate(0, 0)
      const transform = overlayLayer.style.transform;
      expect(transform).toContain("translate(0px, 0px)");
    });
  });
});
