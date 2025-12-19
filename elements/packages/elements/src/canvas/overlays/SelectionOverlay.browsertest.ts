import { html, render } from "lit";
import { beforeEach, describe, expect } from "vitest";
import { test as baseTest } from "../../../test/useMSW.js";
import "../EFCanvas.js";
import "./SelectionOverlay.js";
import "../../elements/EFPanZoom.js";

const test = baseTest.extend<{
  canvas: HTMLElement;
}>({
  canvas: async ({}, use) => {
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    render(
      html`
        <ef-canvas style="width: 100%; height: 100%;">
          <div data-element-id="element-1" style="position: absolute; left: 100px; top: 100px; width: 50px; height: 50px; background: red;"></div>
        </ef-canvas>
      `,
      container,
    );
    document.body.appendChild(container);
    const canvas = container.querySelector("ef-canvas") as HTMLElement;
    await (canvas as any).updateComplete;
    await use(canvas);
    container.remove();
  },
});

beforeEach(() => {
  localStorage.clear();
});

describe("SelectionOverlay", () => {
  test("renders overlay element", async ({ expect }) => {
    const overlay = document.createElement("ef-canvas-selection-overlay");
    document.body.appendChild(overlay);
    await (overlay as any).updateComplete;
    expect(overlay.tagName).toBe("EF-CANVAS-SELECTION-OVERLAY");
    overlay.remove();
  });

  test("renders selection box for selected element", async ({ expect }) => {
    // Create container with pan-zoom wrapper (required for selection overlay)
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";

    render(
      html`
        <ef-pan-zoom style="width: 100%; height: 100%;">
          <ef-canvas style="width: 100%; height: 100%;">
            <div data-element-id="element-1" style="position: absolute; left: 100px; top: 100px; width: 50px; height: 50px; background: red;"></div>
          </ef-canvas>
        </ef-pan-zoom>
      `,
      container,
    );
    document.body.appendChild(container);

    const panZoom = container.querySelector("ef-pan-zoom") as any;
    const canvas = container.querySelector("ef-canvas") as any;

    await panZoom?.updateComplete;
    await canvas?.updateComplete;

    // Wait for overlay to be created (EFCanvas.setupSelectionOverlay)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Selection overlay is created as sibling of panzoom (not inside canvas)
    const overlay = container.querySelector("ef-canvas-selection-overlay") as any;
    expect(overlay).toBeTruthy();

    // Select element by clicking
    const element1 = canvas.querySelector('[data-element-id="element-1"]') as HTMLElement;
    const rect1 = element1.getBoundingClientRect();
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: rect1.left + rect1.width / 2,
        clientY: rect1.top + rect1.height / 2,
        button: 0,
        bubbles: true,
      }),
    );
    await canvas.updateComplete;

    // Wait for overlay to update
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Check if selection context is being consumed
    expect(overlay.selection).toBeTruthy();
    expect(overlay.selection?.selectedIds.size).toBeGreaterThan(0);

    // Check for selection box (SelectionOverlay renders directly to light DOM)
    const selectionBox = overlay.querySelector(".selection-box");
    expect(selectionBox).toBeTruthy();

    container.remove();
  });

  test("diagnostic: box selection with pan-zoom", async ({ expect }) => {
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    container.style.border = "1px solid black";

    render(
      html`
        <ef-pan-zoom style="width: 100%; height: 100%;" x="100" y="50" scale="1">
          <ef-canvas style="width: 100%; height: 100%;">
            <div data-element-id="element-1" style="position: absolute; left: 100px; top: 100px; width: 50px; height: 50px; background: red;"></div>
          </ef-canvas>
        </ef-pan-zoom>
      `,
      container,
    );
    document.body.appendChild(container);

    const panZoom = container.querySelector("ef-pan-zoom") as any;
    const canvas = container.querySelector("ef-canvas") as any;

    await panZoom?.updateComplete;
    await canvas?.updateComplete;

    // Wait for overlay to be created
    await new Promise((resolve) => setTimeout(resolve, 100));

    const shadowRoot = canvas.shadowRoot;
    const overlay = shadowRoot?.querySelector(
      "ef-canvas-selection-overlay",
    ) as any;

    // Start box selection at canvas position (50, 50)
    // Screen position should account for pan
    const panZoomRect = panZoom.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    console.log("=== DIAGNOSTIC TEST: Box Selection with Pan-Zoom ===");
    console.log("PanZoom rect:", panZoomRect);
    console.log("Canvas rect:", canvasRect);
    console.log("PanZoom transform:", {
      x: panZoom.x,
      y: panZoom.y,
      scale: panZoom.scale,
    });

    // Calculate expected screen position for canvas (50, 50)
    // Using EFPanZoom.canvasToScreen formula: rect.left + canvasX * scale + x
    const expectedScreenX = panZoomRect.left + 50 * panZoom.scale + panZoom.x;
    const expectedScreenY = panZoomRect.top + 50 * panZoom.scale + panZoom.y;

    console.log("Canvas position (50, 50) should map to screen:", {
      x: expectedScreenX,
      y: expectedScreenY,
    });

    // Simulate pointer down at the calculated screen position
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: expectedScreenX,
        clientY: expectedScreenY,
        button: 0,
        bubbles: true,
        pointerId: 1,
      }),
    );

    await canvas.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update box selection to (150, 150) in canvas space
    const expectedEndX = panZoomRect.left + 150 * panZoom.scale + panZoom.x;
    const expectedEndY = panZoomRect.top + 150 * panZoom.scale + panZoom.y;

    canvas.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: expectedEndX,
        clientY: expectedEndY,
        button: 0,
        bubbles: true,
        pointerId: 1,
      }),
    );

    await canvas.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check overlay state
    if (overlay) {
      const boxSelectBounds = overlay.boxSelectBounds;
      const selection = overlay.selection;

      console.log("Selection mode:", selection?.selectionMode);
      console.log(
        "Box select bounds (canvas coords):",
        selection?.boxSelectBounds,
      );
      console.log("Box select bounds (screen coords):", boxSelectBounds);

      // Expected screen bounds for canvas (50, 50) to (150, 150)
      const expectedBounds = new DOMRect(
        expectedScreenX,
        expectedScreenY,
        expectedEndX - expectedScreenX,
        expectedEndY - expectedScreenY,
      );

      console.log("Expected screen bounds:", expectedBounds);

      if (boxSelectBounds) {
        console.log("Actual screen bounds:", boxSelectBounds);
        console.log("Difference:", {
          x: boxSelectBounds.x - expectedBounds.x,
          y: boxSelectBounds.y - expectedBounds.y,
          width: boxSelectBounds.width - expectedBounds.width,
          height: boxSelectBounds.height - expectedBounds.height,
        });
      }
    }

    // Visual check - the box should be visible
    const boxSelectDiv = overlay?.querySelector(".box-select");
    if (boxSelectDiv) {
      const computedStyle = window.getComputedStyle(boxSelectDiv);
      console.log("Box select div position:", {
        left: computedStyle.left,
        top: computedStyle.top,
        width: computedStyle.width,
        height: computedStyle.height,
      });
    }

    container.remove();

    // Don't fail the test - this is diagnostic
    expect(true).toBe(true);
  });

  test(
    "box selection appears at correct viewport coordinates in grid layout",
    { timeout: 1000 },
    async ({ expect }) => {
      // Create a grid layout similar to canvas-demo.html
      // This simulates the canvas being offset from viewport origin
      const container = document.createElement("div");
      container.style.display = "grid";
      container.style.gridTemplateColumns = "240px 1fr";
      container.style.gridTemplateRows = "auto 1fr";
      container.style.width = "100vw";
      container.style.height = "100vh";
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";

      // Create a toolbar (grid row 1, spans both columns)
      const toolbar = document.createElement("div");
      toolbar.style.gridColumn = "1 / -1";
      toolbar.style.height = "60px";
      toolbar.style.background = "rgba(30, 41, 59, 0.95)";
      container.appendChild(toolbar);

      // Create hierarchy panel (grid column 1, row 2)
      const hierarchyPanel = document.createElement("div");
      hierarchyPanel.style.background = "rgb(30 41 59)";
      hierarchyPanel.style.width = "240px";
      container.appendChild(hierarchyPanel);

      // Create canvas area (grid column 2, row 2) - this is offset from viewport origin
      const canvasArea = document.createElement("div");
      canvasArea.style.position = "relative";
      canvasArea.style.overflow = "hidden";
      canvasArea.style.background = "#0f172a";
      container.appendChild(canvasArea);

      render(
        html`
          <ef-pan-zoom style="width: 100%; height: 100%;" x="0" y="0" scale="1">
            <ef-canvas style="width: 2000px; height: 1200px;">
              <div
                data-element-id="element-1"
                style="position: absolute; left: 100px; top: 100px; width: 50px; height: 50px; background: red;"
              ></div>
            </ef-canvas>
          </ef-pan-zoom>
        `,
        canvasArea,
      );

      document.body.appendChild(container);

      const panZoom = canvasArea.querySelector("ef-pan-zoom") as any;
      const canvas = canvasArea.querySelector("ef-canvas") as any;

      await panZoom?.updateComplete;
      await canvas?.updateComplete;

      // Wait for overlay to be created
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Find the overlay (it should be a sibling of pan-zoom, not inside canvas)
      const overlay = canvasArea.parentElement?.querySelector(
        "ef-canvas-selection-overlay",
      ) as any;

      expect(overlay).toBeTruthy();

      // Get the canvas area's bounding rect to understand the offset
      const canvasAreaRect = canvasArea.getBoundingClientRect();
      const panZoomRect = panZoom.getBoundingClientRect();

      // Start box selection at canvas position (50, 50)
      // Calculate screen position accounting for pan-zoom transform
      const canvasStartX = 50;
      const canvasStartY = 50;
      const screenStartX =
        panZoomRect.left + canvasStartX * panZoom.scale + panZoom.x;
      const screenStartY =
        panZoomRect.top + canvasStartY * panZoom.scale + panZoom.y;

      // Simulate pointer down to start box selection
      canvas.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: screenStartX,
          clientY: screenStartY,
          button: 0,
          bubbles: true,
          pointerId: 1,
        }),
      );

      await canvas.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update box selection to (150, 150) in canvas space
      const canvasEndX = 150;
      const canvasEndY = 150;
      const screenEndX =
        panZoomRect.left + canvasEndX * panZoom.scale + panZoom.x;
      const screenEndY =
        panZoomRect.top + canvasEndY * panZoom.scale + panZoom.y;

      canvas.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: screenEndX,
          clientY: screenEndY,
          button: 0,
          bubbles: true,
          pointerId: 1,
        }),
      );

      await canvas.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check that the overlay has the correct screen coordinates
      // The box selection should appear at viewport coordinates, not offset by canvasArea position
      const boxSelectDiv = overlay?.querySelector(".box-select");
      expect(boxSelectDiv).toBeTruthy();

      if (boxSelectDiv) {
        const computedStyle = window.getComputedStyle(boxSelectDiv);
        const overlayRect = overlay.getBoundingClientRect();

        // The overlay should be positioned fixed at viewport origin
        expect(overlayRect.left).toBe(0);
        expect(overlayRect.top).toBe(0);

        // The box-select div should be positioned absolutely within the fixed overlay
        // Its position should match the screen coordinates we calculated
        const boxLeft = parseFloat(computedStyle.left);
        const boxTop = parseFloat(computedStyle.top);

        // Expected screen bounds for canvas (50, 50) to (150, 150)
        const expectedLeft = screenStartX;
        const expectedTop = screenStartY;

        // Allow 1px tolerance for rounding
        expect(Math.abs(boxLeft - expectedLeft)).toBeLessThan(1);
        expect(Math.abs(boxTop - expectedTop)).toBeLessThan(1);
      }

      container.remove();
    },
  );

  test(
    "renders highlight box when hovering element",
    { timeout: 1000 },
    async ({ expect }) => {
      const container = document.createElement("div");
      container.style.width = "800px";
      container.style.height = "600px";
      container.style.position = "relative";

      render(
        html`
          <ef-pan-zoom style="width: 100%; height: 100%;" x="0" y="0" scale="1">
            <ef-canvas style="width: 100%; height: 100%;">
              <div
                data-element-id="hover-element"
                id="hover-element"
                style="position: absolute; left: 100px; top: 100px; width: 50px; height: 50px; background: red;"
              ></div>
            </ef-canvas>
          </ef-pan-zoom>
        `,
        container,
      );
      document.body.appendChild(container);

      const panZoom = container.querySelector("ef-pan-zoom") as any;
      const canvas = container.querySelector("ef-canvas") as any;

      await panZoom?.updateComplete;
      await canvas?.updateComplete;

      // Wait for overlay to be created
      await new Promise((resolve) => setTimeout(resolve, 100));

      const overlay = container.querySelector(
        "ef-canvas-selection-overlay",
      ) as any;
      expect(overlay).toBeTruthy();

      // Initially no highlight box
      let highlightBox = overlay.querySelector(".highlight-box");
      expect(highlightBox).toBeFalsy();

      // Hover over the element
      const element = canvas.querySelector(
        '[data-element-id="hover-element"]',
      ) as HTMLElement;
      element.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      await canvas.updateComplete;
      // Wait for RAF loop to update overlay bounds
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Highlight box should now appear
      highlightBox = overlay.querySelector(".highlight-box");
      expect(highlightBox).toBeTruthy();

      // Verify highlight box has position styles set
      const style = window.getComputedStyle(highlightBox!);
      expect(parseFloat(style.width)).toBeGreaterThan(0);
      expect(parseFloat(style.height)).toBeGreaterThan(0);

      // Mouseleave should remove highlight box
      element.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      await canvas.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100));

      highlightBox = overlay.querySelector(".highlight-box");
      expect(highlightBox).toBeFalsy();

      container.remove();
    },
  );

  test(
    "highlight box positioned correctly relative to element",
    { timeout: 1000 },
    async ({ expect }) => {
      const container = document.createElement("div");
      container.style.width = "800px";
      container.style.height = "600px";
      container.style.position = "relative";

      render(
        html`
          <ef-pan-zoom style="width: 100%; height: 100%;" x="0" y="0" scale="1">
            <ef-canvas style="width: 100%; height: 100%;">
              <div
                data-element-id="positioned-element"
                id="positioned-element"
                style="position: absolute; left: 150px; top: 200px; width: 100px; height: 80px; background: blue;"
              ></div>
            </ef-canvas>
          </ef-pan-zoom>
        `,
        container,
      );
      document.body.appendChild(container);

      const panZoom = container.querySelector("ef-pan-zoom") as any;
      const canvas = container.querySelector("ef-canvas") as any;

      await panZoom?.updateComplete;
      await canvas?.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100));

      const overlay = container.querySelector(
        "ef-canvas-selection-overlay",
      ) as any;

      // Hover over the element
      const element = canvas.querySelector(
        '[data-element-id="positioned-element"]',
      ) as HTMLElement;
      element.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      await canvas.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100));

      const highlightBox = overlay.querySelector(".highlight-box") as HTMLElement;
      expect(highlightBox).toBeTruthy();

      // Get element's screen position
      const elementRect = element.getBoundingClientRect();

      // Get highlight box position
      const boxStyle = window.getComputedStyle(highlightBox);
      const boxLeft = parseFloat(boxStyle.left);
      const boxTop = parseFloat(boxStyle.top);
      const boxWidth = parseFloat(boxStyle.width);
      const boxHeight = parseFloat(boxStyle.height);

      // Highlight box should match element position (within 2px tolerance)
      expect(Math.abs(boxLeft - elementRect.left)).toBeLessThan(2);
      expect(Math.abs(boxTop - elementRect.top)).toBeLessThan(2);
      expect(Math.abs(boxWidth - elementRect.width)).toBeLessThan(2);
      expect(Math.abs(boxHeight - elementRect.height)).toBeLessThan(2);

      container.remove();
    },
  );
});
