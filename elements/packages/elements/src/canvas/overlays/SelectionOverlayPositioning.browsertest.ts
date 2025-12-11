import { describe, test, expect, afterEach } from "vitest";
import "../../elements/EFPanZoom.js";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../EFCanvas.js";
import "./SelectionOverlay.js";
import type { EFCanvas } from "../EFCanvas.js";
import type { SelectionOverlay } from "./SelectionOverlay.js";

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
    const api = (canvas as any).getAPI();
    api.registerElement(element, "test-element");

    // Select element
    canvas.selectionContext.select("test-element");
    await canvas.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find selection overlay
    const overlay = document.querySelector("ef-canvas-selection-overlay") as SelectionOverlay;
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

    // Check selection bounds
    const selectionBounds = overlay.selectionBounds;
    expect(selectionBounds).toBeTruthy();

    if (selectionBounds) {
      // Get element's actual screen position
      const elementRect = element.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      // Selection overlay should match element's screen position (accounting for pan/zoom)
      // Allow some tolerance for rounding
      expect(Math.abs(selectionBounds.x - elementRect.left)).toBeLessThan(2);
      expect(Math.abs(selectionBounds.y - elementRect.top)).toBeLessThan(2);
      expect(Math.abs(selectionBounds.width - elementRect.width)).toBeLessThan(2);
      expect(Math.abs(selectionBounds.height - elementRect.height)).toBeLessThan(2);
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
    const overlay = document.querySelector("ef-canvas-selection-overlay") as SelectionOverlay;
    expect(overlay).toBeTruthy();

    await overlay.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check selection bounds match element position
    const selectionBounds = overlay.selectionBounds;
    expect(selectionBounds).toBeTruthy();

    if (selectionBounds && metadata) {
      // Get element's actual screen position
      const elementRect = timegroup.getBoundingClientRect();

      // Selection overlay should match element's screen position
      // Allow some tolerance for rounding
      expect(Math.abs(selectionBounds.x - elementRect.left)).toBeLessThan(2);
      expect(Math.abs(selectionBounds.y - elementRect.top)).toBeLessThan(2);
      expect(Math.abs(selectionBounds.width - elementRect.width)).toBeLessThan(2);
      expect(Math.abs(selectionBounds.height - elementRect.height)).toBeLessThan(2);

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
    panZoom.panX = 100;
    panZoom.panY = 50;
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
    const api = (canvas as any).getAPI();
    api.registerElement(element, "test-element");
    canvas.selectionContext.select("test-element");
    await canvas.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find selection overlay
    const overlay = document.querySelector("ef-canvas-selection-overlay") as SelectionOverlay;
    expect(overlay).toBeTruthy();

    await overlay.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check selection bounds match element position (accounting for pan/zoom)
    const selectionBounds = overlay.selectionBounds;
    expect(selectionBounds).toBeTruth();

    if (selectionBounds) {
      const elementRect = element.getBoundingClientRect();
      
      // Selection overlay should match element's screen position
      expect(Math.abs(selectionBounds.x - elementRect.left)).toBeLessThan(2);
      expect(Math.abs(selectionBounds.y - elementRect.top)).toBeLessThan(2);
      expect(Math.abs(selectionBounds.width - elementRect.width)).toBeLessThan(2);
      expect(Math.abs(selectionBounds.height - elementRect.height)).toBeLessThan(2);
    }
  }, 5000);
});


