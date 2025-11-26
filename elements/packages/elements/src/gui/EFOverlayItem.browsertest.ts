import { describe, expect, test, beforeEach, afterEach } from "vitest";
import "./EFOverlayLayer.js";
import "./EFOverlayItem.js";
import type { EFOverlayLayer } from "./EFOverlayLayer.js";
import type { EFOverlayItem } from "./EFOverlayItem.js";

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

describe("EFOverlayItem", () => {
  test("overlay item tracks target element position", async () => {
    // Create target element
    const target = document.createElement("div");
    target.style.position = "absolute";
    target.style.left = "100px";
    target.style.top = "150px";
    target.style.width = "200px";
    target.style.height = "100px";
    document.body.appendChild(target);
    testElements.push(target);

    // Create overlay layer
    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
    overlayLayer.style.position = "absolute";
    overlayLayer.style.left = "0px";
    overlayLayer.style.top = "0px";
    overlayLayer.style.width = "1000px";
    overlayLayer.style.height = "1000px";
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Create overlay item
    const overlayItem = document.createElement(
      "ef-overlay-item",
    ) as EFOverlayItem;
    overlayItem.target = target;
    overlayLayer.appendChild(overlayItem);
    testElements.push(overlayItem);

    // Wait for RAF to update position
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify overlay item position matches target (accounting for overlay layer offset)
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

  test("overlay item updates position when target moves", async () => {
    const target = document.createElement("div");
    target.style.position = "absolute";
    target.style.left = "100px";
    target.style.top = "150px";
    target.style.width = "200px";
    target.style.height = "100px";
    document.body.appendChild(target);
    testElements.push(target);

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
    overlayLayer.style.position = "absolute";
    overlayLayer.style.left = "0px";
    overlayLayer.style.top = "0px";
    overlayLayer.style.width = "1000px";
    overlayLayer.style.height = "1000px";
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const overlayItem = document.createElement(
      "ef-overlay-item",
    ) as EFOverlayItem;
    overlayItem.target = target;
    overlayLayer.appendChild(overlayItem);
    testElements.push(overlayItem);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const initialLeft = parseFloat(overlayItem.style.left);
    const initialTop = parseFloat(overlayItem.style.top);

    // Move target
    target.style.left = "300px";
    target.style.top = "400px";

    // Wait for RAF to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify overlay updated
    expect(parseFloat(overlayItem.style.left)).not.toBeCloseTo(initialLeft, 1);
    expect(parseFloat(overlayItem.style.top)).not.toBeCloseTo(initialTop, 1);
  });

  test("overlay item transforms position to overlay coordinate space", async () => {
    const target = document.createElement("div");
    target.style.position = "absolute";
    target.style.left = "200px";
    target.style.top = "300px";
    target.style.width = "100px";
    target.style.height = "50px";
    document.body.appendChild(target);
    testElements.push(target);

    // Overlay layer with offset
    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 50, y: 75, scale: 1 };
    overlayLayer.style.position = "absolute";
    overlayLayer.style.left = "100px";
    overlayLayer.style.top = "200px";
    overlayLayer.style.width = "1000px";
    overlayLayer.style.height = "1000px";
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const overlayItem = document.createElement(
      "ef-overlay-item",
    ) as EFOverlayItem;
    overlayItem.target = target;
    overlayLayer.appendChild(overlayItem);
    testElements.push(overlayItem);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify position accounts for overlay layer offset
    const targetRect = target.getBoundingClientRect();
    const overlayLayerRect = overlayLayer.getBoundingClientRect();
    const expectedX = targetRect.left - overlayLayerRect.left;
    const expectedY = targetRect.top - overlayLayerRect.top;

    expect(parseFloat(overlayItem.style.left)).toBeCloseTo(expectedX, 1);
    expect(parseFloat(overlayItem.style.top)).toBeCloseTo(expectedY, 1);
  });

  test("overlay item dispatches position-changed events", async () => {
    const target = document.createElement("div");
    target.style.position = "absolute";
    target.style.left = "100px";
    target.style.top = "150px";
    target.style.width = "200px";
    target.style.height = "100px";
    document.body.appendChild(target);
    testElements.push(target);

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
    overlayLayer.style.position = "absolute";
    overlayLayer.style.left = "0px";
    overlayLayer.style.top = "0px";
    overlayLayer.style.width = "1000px";
    overlayLayer.style.height = "1000px";
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const overlayItem = document.createElement(
      "ef-overlay-item",
    ) as EFOverlayItem;
    overlayItem.target = target;
    overlayLayer.appendChild(overlayItem);
    testElements.push(overlayItem);

    const positionChangedHandler = new Promise<CustomEvent>((resolve) => {
      overlayItem.addEventListener("position-changed", (e) => {
        resolve(e as CustomEvent);
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Move target to trigger position change
    target.style.left = "300px";

    const event = await Promise.race([
      positionChangedHandler,
      new Promise<CustomEvent>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 500),
      ),
    ]);

    expect(event.detail).toHaveProperty("x");
    expect(event.detail).toHaveProperty("y");
    expect(event.detail).toHaveProperty("width");
    expect(event.detail).toHaveProperty("height");
    expect(event.detail).toHaveProperty("rotation");
  });

  test("overlay item applies rotation from target element", async () => {
    const target = document.createElement("div");
    target.style.position = "absolute";
    target.style.left = "100px";
    target.style.top = "150px";
    target.style.width = "200px";
    target.style.height = "100px";
    target.style.transform = "rotate(45deg)";
    document.body.appendChild(target);
    testElements.push(target);

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
    overlayLayer.style.position = "absolute";
    overlayLayer.style.left = "0px";
    overlayLayer.style.top = "0px";
    overlayLayer.style.width = "1000px";
    overlayLayer.style.height = "1000px";
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const overlayItem = document.createElement(
      "ef-overlay-item",
    ) as EFOverlayItem;
    overlayItem.target = target;
    overlayLayer.appendChild(overlayItem);
    testElements.push(overlayItem);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify rotation is applied
    expect(overlayItem.style.transform).toContain("rotate(45deg)");
  });

  test("overlay item handles target element removal", async () => {
    const target = document.createElement("div");
    target.style.position = "absolute";
    target.style.left = "100px";
    target.style.top = "150px";
    target.style.width = "200px";
    target.style.height = "100px";
    document.body.appendChild(target);
    testElements.push(target);

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
    overlayLayer.style.position = "absolute";
    overlayLayer.style.left = "0px";
    overlayLayer.style.top = "0px";
    overlayLayer.style.width = "1000px";
    overlayLayer.style.height = "1000px";
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const overlayItem = document.createElement(
      "ef-overlay-item",
    ) as EFOverlayItem;
    overlayItem.target = target;
    overlayLayer.appendChild(overlayItem);
    testElements.push(overlayItem);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Remove target element
    target.remove();

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify overlay item handles removal gracefully (hides itself)
    expect(overlayItem.style.display).toBe("none");
  });

  test("overlay item works with selector string", async () => {
    const target = document.createElement("div");
    target.id = "test-target";
    target.style.position = "absolute";
    target.style.left = "100px";
    target.style.top = "150px";
    target.style.width = "200px";
    target.style.height = "100px";
    document.body.appendChild(target);
    testElements.push(target);

    const overlayLayer = document.createElement(
      "ef-overlay-layer",
    ) as EFOverlayLayer;
    overlayLayer.panZoomTransform = { x: 0, y: 0, scale: 1 };
    overlayLayer.style.position = "absolute";
    overlayLayer.style.left = "0px";
    overlayLayer.style.top = "0px";
    overlayLayer.style.width = "1000px";
    overlayLayer.style.height = "1000px";
    document.body.appendChild(overlayLayer);
    testElements.push(overlayLayer);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const overlayItem = document.createElement(
      "ef-overlay-item",
    ) as EFOverlayItem;
    overlayItem.target = "#test-target";
    overlayLayer.appendChild(overlayItem);
    testElements.push(overlayItem);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify overlay item found and tracked target
    expect(overlayItem.style.display).not.toBe("none");
    expect(parseFloat(overlayItem.style.width)).toBeCloseTo(200, 1);
  });
});
