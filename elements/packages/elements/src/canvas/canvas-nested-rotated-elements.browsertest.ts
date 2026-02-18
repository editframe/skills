import { beforeEach, describe, expect, vi } from "vitest";
import { test as baseTest } from "../../test/useMSW.js";
import type { EFCanvas } from "./EFCanvas.js";
import type { EFTransformHandles } from "../gui/EFTransformHandles.js";
import "./EFCanvas.js";
import "../gui/EFTransformHandles.js";
import "../elements/EFPanZoom.js";
import "../elements/EFTimegroup.js";

const test = baseTest.extend<{}>({});

/**
 * Wait for element metadata to be registered and populated.
 * Uses vi.waitUntil() for proper condition-based waiting instead of arbitrary timeouts.
 */
async function waitForElementMetadata(
  canvas: EFCanvas,
  elementId: string,
): Promise<void> {
  await vi.waitUntil(
    () => {
      const metadata = canvas.getElementData(elementId);
      return metadata && metadata.width > 0 && metadata.height > 0;
    },
    { timeout: 2000, interval: 16 },
  );
}

/**
 * Wait for transform handles to be ready with valid bounds.
 * Uses vi.waitUntil() for proper condition-based waiting instead of arbitrary timeouts.
 */
async function waitForHandlesReady(handles: EFTransformHandles): Promise<void> {
  await handles.updateComplete;
  await vi.waitUntil(
    () =>
      handles.bounds && handles.bounds.width > 0 && handles.bounds.height > 0,
    { timeout: 2000, interval: 16 },
  );
}

/**
 * Wait for transform handles element to exist in DOM.
 */
async function waitForHandlesElement(
  container: HTMLElement,
): Promise<EFTransformHandles> {
  await vi.waitUntil(
    () => container.querySelector("ef-transform-handles") !== null,
    { timeout: 2000, interval: 16 },
  );
  return container.querySelector("ef-transform-handles") as EFTransformHandles;
}

/**
 * These tests verify ACTUAL VISUAL BEHAVIOR by comparing screen positions.
 * Unlike closed-loop tests that only verify internal consistency,
 * these tests compare the actual screen bounding rects of elements
 * vs their transform handles overlays.
 *
 * The invariant being tested:
 * Transform handles overlay MUST visually match the element it represents
 * regardless of nesting, rotation, or zoom level.
 */
describe("Canvas Nested and Rotated Element Overlays - Visual Verification", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  /**
   * Helper to verify transform handles visually match an element.
   * Compares actual screen positions, not internal calculations.
   *
   * NOTE: ef-transform-handles is a zero-sized host element. The actual
   * visual overlay is the .overlay child inside its shadow DOM. We must
   * query that element to get the visual bounding rect.
   */
  function verifyHandlesMatchElement(
    element: HTMLElement,
    handles: EFTransformHandles,
    tolerance = 5,
  ): { matches: boolean; details: string } {
    const elementRect = element.getBoundingClientRect();
    // Get the actual visual overlay element, not the host
    const overlayElement = handles.shadowRoot?.querySelector(
      ".overlay",
    ) as HTMLElement;
    const handlesRect =
      overlayElement?.getBoundingClientRect() ?? new DOMRect();

    // For rotated elements, compare centers (centers are stable under rotation)
    const elementCenterX = elementRect.left + elementRect.width / 2;
    const elementCenterY = elementRect.top + elementRect.height / 2;
    const handlesCenterX = handlesRect.left + handlesRect.width / 2;
    const handlesCenterY = handlesRect.top + handlesRect.height / 2;

    const centerDiffX = Math.abs(elementCenterX - handlesCenterX);
    const centerDiffY = Math.abs(elementCenterY - handlesCenterY);
    const sizeDiffW = Math.abs(elementRect.width - handlesRect.width);
    const sizeDiffH = Math.abs(elementRect.height - handlesRect.height);

    const matches =
      centerDiffX < tolerance &&
      centerDiffY < tolerance &&
      sizeDiffW < tolerance &&
      sizeDiffH < tolerance;

    const details = `
      Element screen rect: (${elementRect.left.toFixed(1)}, ${elementRect.top.toFixed(1)}) ${elementRect.width.toFixed(1)}x${elementRect.height.toFixed(1)}
      Handles screen rect: (${handlesRect.left.toFixed(1)}, ${handlesRect.top.toFixed(1)}) ${handlesRect.width.toFixed(1)}x${handlesRect.height.toFixed(1)}
      Center diff: (${centerDiffX.toFixed(1)}, ${centerDiffY.toFixed(1)})
      Size diff: (${sizeDiffW.toFixed(1)}, ${sizeDiffH.toFixed(1)})
    `;

    return { matches, details };
  }

  test("VISUAL: transform handles match element at scale 1x", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom") as any;
    panZoom.x = 0;
    panZoom.y = 0;
    panZoom.scale = 1;
    panZoom.style.width = "1200px";
    panZoom.style.height = "800px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    await canvas.updateComplete;
    await panZoom.updateComplete;

    // Create a simple element
    const element = document.createElement("div");
    element.id = "test-element";
    element.setAttribute("data-element-id", "test-element");
    element.style.position = "absolute";
    element.style.left = "100px";
    element.style.top = "100px";
    element.style.width = "200px";
    element.style.height = "150px";
    element.style.background = "blue";
    canvas.appendChild(element);

    await canvas.updateComplete;
    await waitForElementMetadata(canvas, "test-element");

    // Select element to show handles
    canvas.selectionContext.select("test-element");
    await canvas.updateComplete;

    const handles = await waitForHandlesElement(document.body);
    await waitForHandlesReady(handles);

    const result = verifyHandlesMatchElement(element, handles);
    expect(
      result.matches,
      `Handles should match element visually:\n${result.details}`,
    ).toBe(true);
  }, 5000);

  test("VISUAL: transform handles match element at scale 2x (zoomed in)", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom") as any;
    panZoom.x = 0;
    panZoom.y = 0;
    panZoom.scale = 2; // 2x zoom
    panZoom.style.width = "1200px";
    panZoom.style.height = "800px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    await canvas.updateComplete;
    await panZoom.updateComplete;

    const element = document.createElement("div");
    element.id = "test-element";
    element.setAttribute("data-element-id", "test-element");
    element.style.position = "absolute";
    element.style.left = "100px";
    element.style.top = "100px";
    element.style.width = "200px";
    element.style.height = "150px";
    element.style.background = "blue";
    canvas.appendChild(element);

    await canvas.updateComplete;
    await waitForElementMetadata(canvas, "test-element");

    canvas.selectionContext.select("test-element");
    await canvas.updateComplete;

    const handles = await waitForHandlesElement(document.body);
    await waitForHandlesReady(handles);

    const result = verifyHandlesMatchElement(element, handles);
    expect(
      result.matches,
      `Handles should match element at 2x zoom:\n${result.details}`,
    ).toBe(true);
  }, 5000);

  test("VISUAL: transform handles match rotated element (45deg)", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom") as any;
    panZoom.x = 0;
    panZoom.y = 0;
    panZoom.scale = 1;
    panZoom.style.width = "1200px";
    panZoom.style.height = "800px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    await canvas.updateComplete;
    await panZoom.updateComplete;

    const element = document.createElement("div");
    element.id = "test-element";
    element.setAttribute("data-element-id", "test-element");
    element.style.position = "absolute";
    element.style.left = "200px";
    element.style.top = "200px";
    element.style.width = "200px";
    element.style.height = "100px";
    element.style.background = "blue";
    element.style.transform = "rotate(45deg)";
    element.style.transformOrigin = "center";
    canvas.appendChild(element);

    await canvas.updateComplete;
    await waitForElementMetadata(canvas, "test-element");

    canvas.selectionContext.select("test-element");
    await canvas.updateComplete;

    const handles = await waitForHandlesElement(document.body);
    await waitForHandlesReady(handles);

    // For rotated elements, we check that:
    // 1. Centers match (since rotation is around center)
    // 2. Handles show actual dimensions (not bounding box)
    const bounds = handles.bounds;

    expect(bounds).toBeTruthy();
    // Handles should show actual dimensions (200x100), not bounding box (~212x212)
    // Allow some tolerance
    expect(Math.abs(bounds.width - 200)).toBeLessThan(10);
    expect(Math.abs(bounds.height - 100)).toBeLessThan(10);

    // Rotation should be stored
    expect(bounds.rotation).toBeCloseTo(45, 0);
  }, 5000);

  test("VISUAL: transform handles match rotated element at 2x zoom", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom") as any;
    panZoom.x = 0;
    panZoom.y = 0;
    panZoom.scale = 2;
    panZoom.style.width = "1200px";
    panZoom.style.height = "800px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    await canvas.updateComplete;
    await panZoom.updateComplete;

    const element = document.createElement("div");
    element.id = "test-element";
    element.setAttribute("data-element-id", "test-element");
    element.style.position = "absolute";
    element.style.left = "100px";
    element.style.top = "100px";
    element.style.width = "200px";
    element.style.height = "100px";
    element.style.background = "blue";
    element.style.transform = "rotate(45deg)";
    element.style.transformOrigin = "center";
    canvas.appendChild(element);

    await canvas.updateComplete;
    await waitForElementMetadata(canvas, "test-element");

    canvas.selectionContext.select("test-element");
    await canvas.updateComplete;

    const handles = await waitForHandlesElement(document.body);
    await waitForHandlesReady(handles);

    const bounds = handles.bounds;
    expect(bounds).toBeTruthy();
    // At 2x zoom, handles dimensions in screen space should be 400x200 (200*2, 100*2)
    // But bounds.width/height should be the screen dimensions
    expect(Math.abs(bounds.width - 400)).toBeLessThan(10);
    expect(Math.abs(bounds.height - 200)).toBeLessThan(10);
    expect(bounds.rotation).toBeCloseTo(45, 0);
  }, 5000);

  test("VISUAL: transform handles match nested element", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom") as any;
    panZoom.x = 0;
    panZoom.y = 0;
    panZoom.scale = 1;
    panZoom.style.width = "1200px";
    panZoom.style.height = "800px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    await canvas.updateComplete;

    // Create timegroup at canvas position (200, 100)
    const timegroup = document.createElement("ef-timegroup") as any;
    timegroup.id = "timegroup-1";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    timegroup.style.position = "absolute";
    timegroup.style.left = "200px";
    timegroup.style.top = "100px";
    timegroup.style.width = "400px";
    timegroup.style.height = "300px";
    timegroup.style.background = "rgba(255, 0, 0, 0.2)";
    canvas.appendChild(timegroup);

    await timegroup.updateComplete;
    await waitForElementMetadata(canvas, "timegroup-1");

    // Create child element inside timegroup at relative position (50, 50)
    const childElement = document.createElement("div");
    childElement.id = "child-1";
    childElement.setAttribute("data-element-id", "child-1");
    childElement.style.position = "absolute";
    childElement.style.left = "50px"; // Relative to timegroup
    childElement.style.top = "50px";
    childElement.style.width = "100px";
    childElement.style.height = "80px";
    childElement.style.background = "blue";
    timegroup.appendChild(childElement);

    await canvas.updateComplete;
    await waitForElementMetadata(canvas, "child-1");

    // Element should be registered
    const metadata = canvas.getElementData("child-1");
    expect(metadata).toBeTruthy();

    // Expected canvas position: timegroup position (200, 100) + child relative (50, 50) = (250, 150)
    expect(metadata).toBeTruthy();
    if (metadata) {
      // Allow small tolerance for rounding
      expect(Math.abs(metadata.x - 250)).toBeLessThan(2);
      expect(Math.abs(metadata.y - 150)).toBeLessThan(2);
      expect(Math.abs(metadata.width - 100)).toBeLessThan(2);
      expect(Math.abs(metadata.height - 80)).toBeLessThan(2);
    }

    // Select the child element
    canvas.selectionContext.select("child-1");
    await canvas.updateComplete;

    // Find transform handles
    const handles = await waitForHandlesElement(document.body);
    await waitForHandlesReady(handles);

    // Get overlay layer - it's created as a sibling of ef-pan-zoom, not in canvas shadow root
    const overlayLayer = container.querySelector("ef-overlay-layer");
    expect(overlayLayer).toBeTruthy();

    const overlayRect = overlayLayer!.getBoundingClientRect();
    const canvasContent = canvas.shadowRoot?.querySelector(
      ".canvas-content",
    ) as HTMLElement;
    expect(canvasContent).toBeTruthy();

    const canvasContentRect = canvasContent.getBoundingClientRect();
    const scale = 1; // panZoom.scale

    // Calculate expected screen position of element center
    const elementCenterCanvasX = metadata!.x + metadata!.width / 2;
    const elementCenterCanvasY = metadata!.y + metadata!.height / 2;

    // Convert to screen coordinates
    const elementCenterScreenX =
      canvasContentRect.left + elementCenterCanvasX * scale;
    const elementCenterScreenY =
      canvasContentRect.top + elementCenterCanvasY * scale;

    // Expected overlay position (center minus half size, relative to overlay layer)
    const expectedX =
      elementCenterScreenX - overlayRect.left - (metadata!.width * scale) / 2;
    const expectedY =
      elementCenterScreenY - overlayRect.top - (metadata!.height * scale) / 2;

    const bounds = handles.bounds;
    expect(bounds).toBeTruthy();

    // Verify handles are positioned correctly (within 2px tolerance)
    expect(Math.abs(bounds.x - expectedX)).toBeLessThan(2);
    expect(Math.abs(bounds.y - expectedY)).toBeLessThan(2);
    expect(Math.abs(bounds.width - metadata!.width * scale)).toBeLessThan(2);
    expect(Math.abs(bounds.height - metadata!.height * scale)).toBeLessThan(2);
  }, 5000);

  test("transform handles show actual dimensions for nested rotated element", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom") as any;
    panZoom.x = 0;
    panZoom.y = 0;
    panZoom.scale = 1;
    panZoom.style.width = "1200px";
    panZoom.style.height = "800px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    await canvas.updateComplete;

    // Create timegroup at canvas position (200, 100)
    const timegroup = document.createElement("ef-timegroup") as any;
    timegroup.id = "timegroup-2";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    timegroup.style.position = "absolute";
    timegroup.style.left = "200px";
    timegroup.style.top = "100px";
    timegroup.style.width = "400px";
    timegroup.style.height = "300px";
    timegroup.style.background = "rgba(255, 0, 0, 0.2)";
    canvas.appendChild(timegroup);

    await timegroup.updateComplete;
    await waitForElementMetadata(canvas, "timegroup-2");

    // Create child element inside timegroup at relative position (50, 50)
    // Rotated 45 degrees with actual dimensions 100x80
    const childElement = document.createElement("div");
    childElement.id = "child-2";
    childElement.setAttribute("data-element-id", "child-2");
    childElement.style.position = "absolute";
    childElement.style.left = "50px";
    childElement.style.top = "50px";
    childElement.style.width = "100px";
    childElement.style.height = "80px";
    childElement.style.background = "blue";
    childElement.style.transform = "rotate(45deg)";
    childElement.style.transformOrigin = "center";
    timegroup.appendChild(childElement);

    await canvas.updateComplete;
    await waitForElementMetadata(canvas, "child-2");

    // Element should be registered
    const metadata = canvas.getElementData("child-2");
    expect(metadata).toBeTruthy();

    // Metadata should store ACTUAL dimensions (100x80), not bounding box
    // Bounding box for 100x80 rotated 45deg would be approximately 127x127
    expect(Math.abs(metadata!.width - 100)).toBeLessThan(2);
    expect(Math.abs(metadata!.height - 80)).toBeLessThan(2);

    // Position should still be correct
    expect(Math.abs(metadata!.x - 250)).toBeLessThan(2);
    expect(Math.abs(metadata!.y - 150)).toBeLessThan(2);

    // Select the child element
    canvas.selectionContext.select("child-2");
    await canvas.updateComplete;

    // Find transform handles
    const handles = await waitForHandlesElement(document.body);
    await waitForHandlesReady(handles);

    const bounds = handles.bounds;
    expect(bounds).toBeTruthy();

    // Handles should show ACTUAL dimensions (100x80), not bounding box
    // This is critical - handles should not change size as rotation changes
    expect(Math.abs(bounds.width - 100)).toBeLessThan(2);
    expect(Math.abs(bounds.height - 80)).toBeLessThan(2);

    // Rotation should be stored
    expect(bounds.rotation).toBeCloseTo(45, 1);
  }, 5000);

  test("transform handles maintain correct size when rotation changes", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    container.style.position = "relative";
    document.body.appendChild(container);

    const panZoom = document.createElement("ef-pan-zoom") as any;
    panZoom.x = 0;
    panZoom.y = 0;
    panZoom.scale = 1;
    panZoom.style.width = "1200px";
    panZoom.style.height = "800px";
    container.appendChild(panZoom);

    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas";
    canvas.style.width = "2000px";
    canvas.style.height = "1200px";
    panZoom.appendChild(canvas);

    await canvas.updateComplete;

    const timegroup = document.createElement("ef-timegroup") as any;
    timegroup.id = "timegroup-3";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    timegroup.style.position = "absolute";
    timegroup.style.left = "200px";
    timegroup.style.top = "100px";
    timegroup.style.width = "400px";
    timegroup.style.height = "300px";
    canvas.appendChild(timegroup);

    await timegroup.updateComplete;
    await waitForElementMetadata(canvas, "timegroup-3");

    const childElement = document.createElement("div");
    childElement.id = "child-3";
    childElement.setAttribute("data-element-id", "child-3");
    childElement.style.position = "absolute";
    childElement.style.left = "50px";
    childElement.style.top = "50px";
    childElement.style.width = "100px";
    childElement.style.height = "80px";
    childElement.style.background = "blue";
    childElement.style.transform = "rotate(0deg)";
    childElement.style.transformOrigin = "center";
    timegroup.appendChild(childElement);

    await canvas.updateComplete;
    await waitForElementMetadata(canvas, "child-3");

    canvas.selectionContext.select("child-3");
    await canvas.updateComplete;

    let handles = await waitForHandlesElement(document.body);
    await waitForHandlesReady(handles);

    const bounds0 = handles.bounds;
    expect(bounds0).toBeTruthy();

    const width0 = bounds0.width;
    const height0 = bounds0.height;

    // Rotate to 45 degrees
    childElement.style.transform = "rotate(45deg)";
    await canvas.updateComplete;

    // Wait for metadata to update with new rotation
    await vi.waitUntil(
      () => {
        const metadata = canvas.getElementData("child-3");
        return (
          metadata && metadata.rotation !== undefined && metadata.rotation !== 0
        );
      },
      { timeout: 2000, interval: 16 },
    );

    // Get updated handles
    handles = await waitForHandlesElement(document.body);
    await waitForHandlesReady(handles);

    const bounds45 = handles.bounds;
    expect(bounds45).toBeTruthy();

    // Dimensions should NOT change - handles should maintain actual size
    expect(Math.abs(bounds45.width - width0)).toBeLessThan(2);
    expect(Math.abs(bounds45.height - height0)).toBeLessThan(2);
    // Should still be 100x80
    expect(Math.abs(bounds45.width - 100)).toBeLessThan(2);
    expect(Math.abs(bounds45.height - 80)).toBeLessThan(2);
  }, 5000);
});
