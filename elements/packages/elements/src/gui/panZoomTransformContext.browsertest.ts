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
  test("overlay layer as child of panzoom delegates transform to parent", async () => {
    // When overlay is a CHILD of panzoom, it receives context and sets transform: none
    // because the parent's content-wrapper already handles the transform
    const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
    panZoom.x = 0;
    panZoom.y = 0;
    panZoom.scale = 1;
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await panZoom.updateComplete;

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    panZoom.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    // Wait for RAF loop to run
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Observable behavior: overlay delegates transform to parent (sets none)
    const transform = overlayLayer.style.transform;
    expect(transform).toBe("none");
  });

  test("overlay layer receives updated transform from panzoom context", async () => {
    const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
    panZoom.style.width = "1000px";
    panZoom.style.height = "1000px";
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await panZoom.updateComplete;

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    panZoom.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    // Wait for initial RAF
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Update panzoom transform
    panZoom.x = 100;
    panZoom.y = 200;
    panZoom.scale = 1.5;

    // Wait for context update and RAF loop
    await panZoom.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Observable behavior: overlay still delegates to parent (transform: none)
    // The parent's content-wrapper handles the actual visual transform
    expect(overlayLayer.style.transform).toBe("none");

    // Verify panzoom itself has the transform applied
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

  test("standalone overlay layer applies transform from prop", async () => {
    // When overlay is NOT a child of panzoom, it applies transform directly from prop
    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 50, y: 75, scale: 1.2 };
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    // Wait for RAF loop to apply transform
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Observable behavior: standalone overlay applies translate directly
    const transform = overlayLayer.style.transform;
    expect(transform).toContain("translate(50px, 75px)");
  });

  test("overlay layer as sibling of panzoom applies transform directly", async () => {
    // When overlay is a SIBLING of panzoom (not child), it reads transform
    // from sibling and applies it directly
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
    testElements.push(container);

    const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
    panZoom.x = 30;
    panZoom.y = 40;
    panZoom.scale = 1;
    container.appendChild(panZoom);

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    container.appendChild(overlayLayer);

    await panZoom.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Observable behavior: sibling overlay applies translate to match panzoom
    const transform = overlayLayer.style.transform;
    expect(transform).toContain("translate(30px, 40px)");
  });
});
