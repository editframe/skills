import { describe, expect, test, beforeEach, afterEach } from "vitest";
import "../elements/EFPanZoom.js";
import "./EFOverlayLayer.js";
import type { EFPanZoom } from "../elements/EFPanZoom.js";
import type { EFOverlayLayer } from "./EFOverlayLayer.js";

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

describe("EFOverlayLayer", () => {
  test("overlay layer applies translate transform matching PanZoom", async () => {
    const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
    panZoom.x = 100;
    panZoom.y = 200;
    panZoom.scale = 1.5;
    panZoom.style.width = "1000px";
    panZoom.style.height = "1000px";
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 100, y: 200, scale: 1.5 };
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify overlay layer applies translate-only transform to host element (no scale)
    // Transform is applied directly to host so getBoundingClientRect includes it
    const transform = overlayLayer.style.transform;
    expect(transform).toContain("translate(100px, 200px)");
    expect(transform).not.toContain("scale"); // Overlay should not scale
  });

  test("overlay layer updates transform when PanZoom changes", async () => {
    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Update transform
    overlayLayer.panZoomTransform = { x: 150, y: 250, scale: 2 };

    // Wait for RAF loop to process the change (need longer wait now)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify transform updated on host element
    const transform = overlayLayer.style.transform;
    expect(transform).toContain("translate(150px, 250px)");
  });

  test("overlay layer provides coordinate space to children via getBoundingClientRect", async () => {
    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 50, y: 75, scale: 1 };
    overlayLayer.style.position = "absolute";
    overlayLayer.style.left = "0px";
    overlayLayer.style.top = "0px";
    overlayLayer.style.width = "800px";
    overlayLayer.style.height = "600px";
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify overlay layer's getBoundingClientRect includes the transform
    // This allows children to calculate their position relative to the overlay layer
    const rect = overlayLayer.getBoundingClientRect();
    expect(rect).toBeInstanceOf(DOMRect);
    // The translate transform should affect the bounding rect position
    expect(rect.left).toBeCloseTo(50, 0);
    expect(rect.top).toBeCloseTo(75, 0);
  });

  test("overlay layer transform updates when panZoomTransform prop changes", async () => {
    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
    overlayLayer.style.position = "absolute";
    overlayLayer.style.left = "0px";
    overlayLayer.style.top = "0px";
    overlayLayer.style.width = "800px";
    overlayLayer.style.height = "600px";
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const initialRect = overlayLayer.getBoundingClientRect();
    expect(initialRect.left).toBeCloseTo(0, 0);
    expect(initialRect.top).toBeCloseTo(0, 0);

    // Update panZoomTransform
    overlayLayer.panZoomTransform = { x: 100, y: 150, scale: 1.5 };

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify bounding rect updated to reflect new translate
    const updatedRect = overlayLayer.getBoundingClientRect();
    expect(updatedRect.left).toBeCloseTo(100, 0);
    expect(updatedRect.top).toBeCloseTo(150, 0);
  });
});
