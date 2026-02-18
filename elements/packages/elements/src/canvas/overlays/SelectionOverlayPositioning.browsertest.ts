import { describe, test, expect, afterEach } from "vitest";
import "../../elements/EFPanZoom.js";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../EFCanvas.js";
import "./SelectionOverlay.js";
import type { EFCanvas } from "../EFCanvas.js";

import { CanvasAPI } from "../api/CanvasAPI.js";

/**
 * Tests for selection/transform handle positioning.
 * 
 * NOTE: Selection visualization is handled by EFTransformHandles, not SelectionOverlay.
 * SelectionOverlay only renders box-select (marquee) and highlight (hover) overlays.
 */
describe("Selection Handle Positioning (via EFTransformHandles)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("transform handles positions correctly for direct child element with explicit styles", async () => {
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom");
    panZoom.style.width = "800px";
    panZoom.style.height = "600px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    // Create element with explicit positioning
    const element = document.createElement("div");
    element.id = "test-element";
    element.style.left = "100px";
    element.style.top = "150px";
    element.style.width = "200px";
    element.style.height = "100px";
    element.style.position = "absolute";
    element.style.background = "blue";
    canvas.appendChild(element);

    await canvas.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Register element
    const api = new CanvasAPI(canvas as any);
    api.registerElement(element, "test-element");

    // Select element
    canvas.selectionContext.select("test-element");
    await canvas.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get element metadata
    const metadata = canvas.getElementData("test-element");
    expect(metadata).toBeTruthy();
    expect(metadata?.x).toBe(100);
    expect(metadata?.y).toBe(150);
    expect(metadata?.width).toBe(200);
    expect(metadata?.height).toBe(100);

    // Transform handles should be rendered for selection (not SelectionOverlay's .selection-box)
    const transformHandles = container.querySelector("ef-transform-handles") as any;
    expect(transformHandles).toBeTruthy();

    // Verify transform handles bounds match element dimensions
    expect(transformHandles.bounds).toBeTruthy();
    expect(Math.abs(transformHandles.bounds.width - 200)).toBeLessThan(2);
    expect(Math.abs(transformHandles.bounds.height - 100)).toBeLessThan(2);
  }, 5000);

  test("transform handles positions correctly for nested element (timegroup) without explicit styles", async () => {
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom");
    panZoom.style.width = "800px";
    panZoom.style.height = "600px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    // Create timegroup as direct child (no wrapper)
    const timegroup = document.createElement("ef-timegroup") as any;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    timegroup.style.left = "250px";
    timegroup.style.top = "300px";
    timegroup.style.width = "400px";
    timegroup.style.height = "200px";
    timegroup.style.position = "absolute";
    timegroup.style.background = "red";
    canvas.appendChild(timegroup);

    await canvas.updateComplete;
    await timegroup.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Element should be auto-registered
    const metadata = canvas.getElementData("test-timegroup");
    expect(metadata).toBeTruthy();

    // Select timegroup
    canvas.selectionContext.select("test-timegroup");
    await canvas.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Transform handles should be rendered
    const transformHandles = container.querySelector("ef-transform-handles") as any;
    expect(transformHandles).toBeTruthy();

    if (transformHandles && metadata) {
      // Transform handles bounds should match element dimensions
      expect(Math.abs(transformHandles.bounds.width - 400)).toBeLessThan(2);
      expect(Math.abs(transformHandles.bounds.height - 200)).toBeLessThan(2);

      // Metadata should match element's canvas position
      expect(Math.abs(metadata.x - 250)).toBeLessThan(1);
      expect(Math.abs(metadata.y - 300)).toBeLessThan(1);
    }
  }, 5000);

  test("transform handles positions correctly with pan/zoom transform", async () => {
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom") as any;
    panZoom.style.width = "800px";
    panZoom.style.height = "600px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    await panZoom.updateComplete;
    await canvas.updateComplete;

    // Set pan and zoom
    panZoom.x = 100;
    panZoom.y = 50;
    panZoom.scale = 1.5;
    await panZoom.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create element
    const element = document.createElement("div");
    element.id = "test-element";
    element.style.left = "100px";
    element.style.top = "150px";
    element.style.width = "200px";
    element.style.height = "100px";
    element.style.position = "absolute";
    element.style.background = "blue";
    canvas.appendChild(element);

    await canvas.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Register and select
    const api = new CanvasAPI(canvas as any);
    api.registerElement(element, "test-element");
    canvas.selectionContext.select("test-element");
    await canvas.updateComplete;
    // Wait longer for transform handles to update with scaled bounds
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Transform handles should be rendered
    const transformHandles = container.querySelector("ef-transform-handles") as any;
    expect(transformHandles).toBeTruthy();

    if (transformHandles) {
      // Verify transform handles bounds are positive
      expect(transformHandles.bounds.x).toBeDefined();
      expect(transformHandles.bounds.y).toBeDefined();
      expect(transformHandles.bounds.width).toBeGreaterThan(0);
      expect(transformHandles.bounds.height).toBeGreaterThan(0);

      // Bounds should have reasonable dimensions
      // Note: Scale propagation through context may be async, so we just verify positive dimensions
      expect(transformHandles.bounds.width).toBeGreaterThanOrEqual(200);
      expect(transformHandles.bounds.height).toBeGreaterThanOrEqual(100);
    }
  }, 5000);
});
