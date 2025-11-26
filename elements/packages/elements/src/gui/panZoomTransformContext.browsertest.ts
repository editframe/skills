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

describe("panZoomTransformContext", () => {
  test("context is provided by EFPanZoom with initial transform", async () => {
    const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
    panZoom.x = 0;
    panZoom.y = 0;
    panZoom.scale = 1;
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    // Wait for component to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Create overlay layer as child to consume context
    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    panZoom.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify overlay layer received transform from context
    // Transform is applied directly to host element
    const transform = overlayLayer.style.transform;
    expect(transform).toContain("translate(0px, 0px)");
  });

  test("context updates when PanZoom transform changes", async () => {
    const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
    panZoom.style.width = "1000px";
    panZoom.style.height = "1000px";
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    panZoom.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Update PanZoom transform - setting properties triggers context update
    panZoom.x = 100;
    panZoom.y = 200;
    panZoom.scale = 1.5;

    // The context update happens through panZoomTransform property
    // Force update by re-assigning
    panZoom.panZoomTransform = { x: 100, y: 200, scale: 1.5 };

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify overlay layer received updated transform on host element
    const transform = overlayLayer.style.transform;
    expect(transform).toContain("translate(100px, 200px)");
  });

  test("overlay layer works without context when transform provided as prop", async () => {
    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 50, y: 75, scale: 1.2 };
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify overlay layer uses prop transform on host element
    const transform = overlayLayer.style.transform;
    expect(transform).toContain("translate(50px, 75px)");
  });
});
