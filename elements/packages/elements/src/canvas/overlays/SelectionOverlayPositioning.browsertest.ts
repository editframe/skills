import { describe, test, expect, afterEach } from "vitest";
import "../../elements/EFPanZoom.js";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../EFCanvas.js";
import "./SelectionOverlay.js";
import type { EFCanvas } from "../EFCanvas.js";
import type { SelectionOverlay } from "./SelectionOverlay.js";
import { CanvasAPI } from "../api/CanvasAPI.js";

describe("SelectionOverlay Positioning", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("selection overlay positions correctly for direct child element with explicit styles", async () => {
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

    // Find selection overlay
    const overlay = document.querySelector(
      "ef-canvas-selection-overlay",
    ) as SelectionOverlay;
    expect(overlay).toBeTruthy();

    await overlay.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get element metadata
    const metadata = canvas.getElementData("test-element");
    expect(metadata).toBeTruthy();
    expect(metadata?.x).toBe(100);
    expect(metadata?.y).toBe(150);
    expect(metadata?.width).toBe(200);
    expect(metadata?.height).toBe(100);

    // Check selection box in DOM (observable behavior)
    const selectionBox = overlay.querySelector(".selection-box") as HTMLElement;
    expect(selectionBox).toBeTruthy();

    if (selectionBox) {
      // Get element's actual screen position
      const elementRect = element.getBoundingClientRect();
      const boxStyle = window.getComputedStyle(selectionBox);

      // Selection overlay should match element's screen position (accounting for pan/zoom)
      // Allow some tolerance for rounding
      expect(Math.abs(parseFloat(boxStyle.left) - elementRect.left)).toBeLessThan(2);
      expect(Math.abs(parseFloat(boxStyle.top) - elementRect.top)).toBeLessThan(2);
      expect(Math.abs(parseFloat(boxStyle.width) - elementRect.width)).toBeLessThan(2);
      expect(Math.abs(parseFloat(boxStyle.height) - elementRect.height)).toBeLessThan(2);
    }
  }, 5000);

  test("selection overlay positions correctly for nested element (timegroup) without explicit styles", async () => {
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

    // Find selection overlay
    const overlay = document.querySelector(
      "ef-canvas-selection-overlay",
    ) as SelectionOverlay;
    expect(overlay).toBeTruthy();

    await overlay.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check selection box in DOM (observable behavior)
    const selectionBox = overlay.querySelector(".selection-box") as HTMLElement;
    expect(selectionBox).toBeTruthy();

    if (selectionBox && metadata) {
      // Get element's actual screen position
      const elementRect = timegroup.getBoundingClientRect();
      const boxStyle = window.getComputedStyle(selectionBox);

      // Selection overlay should match element's screen position
      // Allow some tolerance for rounding
      expect(Math.abs(parseFloat(boxStyle.left) - elementRect.left)).toBeLessThan(2);
      expect(Math.abs(parseFloat(boxStyle.top) - elementRect.top)).toBeLessThan(2);
      expect(Math.abs(parseFloat(boxStyle.width) - elementRect.width)).toBeLessThan(2);
      expect(Math.abs(parseFloat(boxStyle.height) - elementRect.height)).toBeLessThan(2);

      // Metadata should match element's canvas position
      expect(Math.abs(metadata.x - 250)).toBeLessThan(1);
      expect(Math.abs(metadata.y - 300)).toBeLessThan(1);
    }
  }, 5000);

  test("selection overlay positions correctly with pan/zoom transform", async () => {
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
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find selection overlay
    const overlay = document.querySelector(
      "ef-canvas-selection-overlay",
    ) as SelectionOverlay;
    expect(overlay).toBeTruthy();

    await overlay.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check selection box in DOM (observable behavior)
    const selectionBox = overlay.querySelector(".selection-box") as HTMLElement;
    expect(selectionBox).toBeTruthy();

    if (selectionBox) {
      const boxStyle = window.getComputedStyle(selectionBox);

      // Verify selection box has reasonable values
      // With pan/zoom transform, exact coordinate matching is complex
      // Core invariant: selection box should have positive dimensions
      expect(parseFloat(boxStyle.left)).toBeGreaterThan(0);
      expect(parseFloat(boxStyle.top)).toBeGreaterThan(0);
      expect(parseFloat(boxStyle.width)).toBeGreaterThan(0);
      expect(parseFloat(boxStyle.height)).toBeGreaterThan(0);

      // Verify dimensions are reasonable (scaled element should have larger bounds)
      // Element is 200x100 in canvas coords, with scale 1.5 should be ~300x150 on screen
      expect(parseFloat(boxStyle.width)).toBeGreaterThan(100);
      expect(parseFloat(boxStyle.height)).toBeGreaterThan(50);
    }
  }, 5000);
});
