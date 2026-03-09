import { describe, it, expect, beforeEach } from "vitest";
import "./EFPanZoom.js";
import type { EFPanZoom } from "./EFPanZoom.js";

describe("EFPanZoom coordinate conversion", () => {
  let panZoom: EFPanZoom;
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);

    panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
    panZoom.style.width = "100%";
    panZoom.style.height = "100%";
    container.appendChild(panZoom);

    await panZoom.updateComplete;
  });

  it("screenToCanvas converts screen coordinates to canvas space", { timeout: 1000 }, async () => {
    // No pan, no zoom - screen coords should equal canvas coords (minus container offset)
    const result = panZoom.screenToCanvas(100, 200);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("screenToCanvas accounts for pan offset", { timeout: 1000 }, async () => {
    panZoom.x = 50;
    panZoom.y = 30;
    await panZoom.updateComplete;

    // Screen point (100, 200) with pan (50, 30) -> canvas (50, 170)
    const result = panZoom.screenToCanvas(100, 200);
    expect(result).toEqual({ x: 50, y: 170 });
  });

  it("screenToCanvas accounts for scale", { timeout: 1000 }, async () => {
    panZoom.scale = 2;
    await panZoom.updateComplete;

    // Screen point (100, 200) at 2x scale -> canvas (50, 100)
    const result = panZoom.screenToCanvas(100, 200);
    expect(result).toEqual({ x: 50, y: 100 });
  });

  it("screenToCanvas accounts for both pan and scale", { timeout: 1000 }, async () => {
    panZoom.x = 50;
    panZoom.y = 30;
    panZoom.scale = 2;
    await panZoom.updateComplete;

    // Screen point (100, 200) with pan (50, 30) and 2x scale
    // First subtract container offset: (100, 200)
    // Then subtract pan: (50, 170)
    // Then divide by scale: (25, 85)
    const result = panZoom.screenToCanvas(100, 200);
    expect(result).toEqual({ x: 25, y: 85 });
  });

  it("canvasToScreen converts canvas coordinates to screen space", { timeout: 1000 }, async () => {
    // No pan, no zoom - canvas coords should equal screen coords (plus container offset)
    const result = panZoom.canvasToScreen(100, 200);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("canvasToScreen accounts for pan offset", { timeout: 1000 }, async () => {
    panZoom.x = 50;
    panZoom.y = 30;
    await panZoom.updateComplete;

    // Canvas point (100, 200) with pan (50, 30) -> screen (150, 230)
    const result = panZoom.canvasToScreen(100, 200);
    expect(result).toEqual({ x: 150, y: 230 });
  });

  it("canvasToScreen accounts for scale", { timeout: 1000 }, async () => {
    panZoom.scale = 2;
    await panZoom.updateComplete;

    // Canvas point (100, 200) at 2x scale -> screen (200, 400)
    const result = panZoom.canvasToScreen(100, 200);
    expect(result).toEqual({ x: 200, y: 400 });
  });

  it("canvasToScreen accounts for both pan and scale", { timeout: 1000 }, async () => {
    panZoom.x = 50;
    panZoom.y = 30;
    panZoom.scale = 2;
    await panZoom.updateComplete;

    // Canvas point (100, 200) with pan (50, 30) and 2x scale
    // First multiply by scale: (200, 400)
    // Then add pan: (250, 430)
    // Then add container offset: (250, 430)
    const result = panZoom.canvasToScreen(100, 200);
    expect(result).toEqual({ x: 250, y: 430 });
  });

  it("screenToCanvas and canvasToScreen are inverses", { timeout: 1000 }, async () => {
    panZoom.x = 75;
    panZoom.y = 50;
    panZoom.scale = 1.5;
    await panZoom.updateComplete;

    // Round trip: screen -> canvas -> screen
    const originalScreen = { x: 123, y: 456 };
    const canvas = panZoom.screenToCanvas(originalScreen.x, originalScreen.y);
    const backToScreen = panZoom.canvasToScreen(canvas.x, canvas.y);

    // Should get back to original screen coordinates (within floating point precision)
    expect(Math.abs(backToScreen.x - originalScreen.x)).toBeLessThan(0.01);
    expect(Math.abs(backToScreen.y - originalScreen.y)).toBeLessThan(0.01);
  });
});
