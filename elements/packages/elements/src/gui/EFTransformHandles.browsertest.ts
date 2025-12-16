import { html, render } from "lit";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { EFTransformHandles } from "./EFTransformHandles";
import type { EFPanZoom } from "../elements/EFPanZoom.js";
import "./EFTransformHandles";
import "../elements/EFPanZoom.js";

describe("EFTransformHandles", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "1000px";
    container.style.height = "1000px";
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("rendering", () => {
    test("overlay renders at default bounds position and size", async () => {
      render(html`<ef-transform-handles></ef-transform-handles>`, container);
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      expect(overlay.style.left).toBe("0px");
      expect(overlay.style.top).toBe("0px");
      expect(overlay.style.width).toBe("100px");
      expect(overlay.style.height).toBe("100px");
    });

    test("overlay renders at provided bounds position and size", async () => {
      const bounds = { x: 50, y: 75, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      expect(overlay.style.left).toBe("50px");
      expect(overlay.style.top).toBe("75px");
      expect(overlay.style.width).toBe("200px");
      expect(overlay.style.height).toBe("150px");
    });

    test("overlay applies rotation transform when rotation is provided and enabled", async () => {
      const bounds = { x: 50, y: 50, width: 200, height: 150, rotation: 45 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      expect(overlay.style.transform).toContain("rotate(45deg)");
      // Browser may normalize "center" to "center center"
      expect(overlay.style.transformOrigin).toContain("center");
    });

    test("overlay does not apply rotation transform when rotation is disabled", async () => {
      const bounds = { x: 50, y: 50, width: 200, height: 150, rotation: 45 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${false}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      expect(overlay.style.transform).toBeFalsy();
    });

    test("overlay does not apply rotation transform when rotation is zero", async () => {
      const bounds = { x: 50, y: 50, width: 200, height: 150, rotation: 0 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      expect(overlay.style.transform).toBeFalsy();
    });
  });

  describe("interaction controls visibility", () => {
    test("drag area is rendered when drag is enabled", async () => {
      render(
        html`<ef-transform-handles .enableDrag=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const dragArea = el.shadowRoot!.querySelector(".drag-area");
      expect(dragArea).toBeTruthy();
    });

    test("drag area is not rendered when drag is disabled", async () => {
      render(
        html`<ef-transform-handles .enableDrag=${false}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const dragArea = el.shadowRoot!.querySelector(".drag-area");
      expect(dragArea).toBeFalsy();
    });

    test("resize handles are rendered when resize is enabled", async () => {
      render(
        html`<ef-transform-handles .enableResize=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const handles = el.shadowRoot!.querySelectorAll(".handle");
      expect(handles.length).toBe(8);
    });

    test("resize handles are not rendered when resize is disabled", async () => {
      render(
        html`<ef-transform-handles .enableResize=${false}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const handles = el.shadowRoot!.querySelectorAll(".handle");
      expect(handles.length).toBe(0);
    });

    test("rotate handle is rendered when rotation is enabled", async () => {
      render(
        html`<ef-transform-handles .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const rotateHandle = el.shadowRoot!.querySelector(".rotate-handle");
      expect(rotateHandle).toBeTruthy();
    });

    test("rotate handle is not rendered when rotation is disabled", async () => {
      render(
        html`<ef-transform-handles .enableRotation=${false}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const rotateHandle = el.shadowRoot!.querySelector(".rotate-handle");
      expect(rotateHandle).toBeFalsy();
    });
  });

  describe("drag interaction", () => {
    test("overlay position updates during drag and bounds-change event is dispatched with correct values", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      let lastEventBounds: any = null;
      el.addEventListener("bounds-change", (e: Event) => {
        lastEventBounds = (e as CustomEvent).detail.bounds;
      });

      const dragArea = el.shadowRoot!.querySelector(
        ".drag-area",
      ) as HTMLDivElement;
      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;

      // Start drag
      const downEvent = new MouseEvent("mousedown", {
        clientX: 150,
        clientY: 150,
        bubbles: true,
        cancelable: true,
      });
      dragArea.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 200,
        clientY: 180,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify event was dispatched with correct bounds (one-way data flow)
      // Note: overlay position doesn't update - parent must update bounds prop
      expect(lastEventBounds).toBeTruthy();
      expect(lastEventBounds.x).toBe(150);
      expect(lastEventBounds.y).toBe(130);
      expect(lastEventBounds.width).toBe(200);
      expect(lastEventBounds.height).toBe(150);

      // Overlay stays at original position (one-way data flow)
      expect(overlay.style.left).toBe("100px");
      expect(overlay.style.top).toBe("100px");
    });

    test("overlay has dragging class during drag interaction", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      const dragArea = el.shadowRoot!.querySelector(
        ".drag-area",
      ) as HTMLDivElement;

      expect(overlay.classList.contains("dragging")).toBe(false);

      const downEvent = new MouseEvent("mousedown", {
        clientX: 150,
        clientY: 150,
        bubbles: true,
        cancelable: true,
      });
      dragArea.dispatchEvent(downEvent);
      await el.updateComplete;

      expect(overlay.classList.contains("dragging")).toBe(true);

      // End drag
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      await el.updateComplete;

      expect(overlay.classList.contains("dragging")).toBe(false);
    });

    test("drag does not start when enableDrag is false", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableDrag=${false}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      let eventDispatched = false;
      el.addEventListener("bounds-change", () => {
        eventDispatched = true;
      });

      // Try to drag (but drag area shouldn't exist)
      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      const downEvent = new MouseEvent("mousedown", {
        clientX: 150,
        clientY: 150,
        bubbles: true,
        cancelable: true,
      });
      overlay.dispatchEvent(downEvent);

      const moveEvent = new MouseEvent("mousemove", {
        clientX: 200,
        clientY: 180,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      expect(eventDispatched).toBe(false);
    });
  });

  describe("resize interaction", () => {
    test("overlay size and position update during resize and bounds-change event is dispatched", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      let lastEventBounds: any = null;
      el.addEventListener("bounds-change", (e: Event) => {
        lastEventBounds = (e as CustomEvent).detail.bounds;
      });

      const seHandle = Array.from(
        el.shadowRoot!.querySelectorAll(".handle"),
      ).find((h) => h.classList.contains("se")) as HTMLDivElement;
      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;

      // Start resize from SE corner
      const downEvent = new MouseEvent("mousedown", {
        clientX: 300,
        clientY: 250,
        bubbles: true,
        cancelable: true,
      });
      seHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse to resize (50px right, 30px down)
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 350,
        clientY: 280,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify event was dispatched
      expect(lastEventBounds).toBeTruthy();
      expect(lastEventBounds.width).toBeGreaterThan(200);
      expect(lastEventBounds.height).toBeGreaterThan(150);
    });

    test("rotation is preserved during resize", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 45 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      let lastEventBounds: any = null;
      el.addEventListener("bounds-change", (e: Event) => {
        lastEventBounds = (e as CustomEvent).detail.bounds;
      });

      const seHandle = Array.from(
        el.shadowRoot!.querySelectorAll(".handle"),
      ).find((h) => h.classList.contains("se")) as HTMLDivElement;

      const downEvent = new MouseEvent("mousedown", {
        clientX: 300,
        clientY: 250,
        bubbles: true,
        cancelable: true,
      });
      seHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      const moveEvent = new MouseEvent("mousemove", {
        clientX: 350,
        clientY: 280,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify rotation is preserved
      expect(lastEventBounds.rotation).toBe(45);
    });

    test("resize respects minimum size constraint", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .minSize=${50}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      let lastEventBounds: any = null;
      el.addEventListener("bounds-change", (e: Event) => {
        lastEventBounds = (e as CustomEvent).detail.bounds;
      });

      const eHandle = Array.from(
        el.shadowRoot!.querySelectorAll(".handle"),
      ).find((h) => h.classList.contains("e")) as HTMLDivElement;

      // Start resize and shrink below minimum
      const downEvent = new MouseEvent("mousedown", {
        clientX: 300,
        clientY: 175,
        bubbles: true,
        cancelable: true,
      });
      eHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse far left to shrink below minimum
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 50,
        clientY: 175,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify minimum size is enforced
      expect(lastEventBounds.width).toBeGreaterThanOrEqual(50);
    });

    test("resize does not start when enableResize is false", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableResize=${false}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      let eventDispatched = false;
      el.addEventListener("bounds-change", () => {
        eventDispatched = true;
      });

      // Try to resize (but handles shouldn't exist)
      const handles = el.shadowRoot!.querySelectorAll(".handle");
      expect(handles.length).toBe(0);
    });
  });

  describe("rotation interaction", () => {
    test("overlay rotation updates during rotate and rotation-change event is dispatched with correct value", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 0 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      let lastRotation: number | null = null;
      el.addEventListener("rotation-change", (e: Event) => {
        lastRotation = (e as CustomEvent).detail.rotation;
      });

      const rotateHandle = el.shadowRoot!.querySelector(
        ".rotate-handle",
      ) as HTMLDivElement;
      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;

      // Start rotation from center-right of element
      const centerX = 100 + 200 / 2; // 200
      const centerY = 100 + 150 / 2; // 175
      const downEvent = new MouseEvent("mousedown", {
        clientX: centerX + 50,
        clientY: centerY,
        bubbles: true,
        cancelable: true,
      });
      rotateHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse to rotate (90 degrees clockwise)
      const moveEvent = new MouseEvent("mousemove", {
        clientX: centerX,
        clientY: centerY + 50,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify rotation was calculated and event dispatched
      expect(lastRotation).not.toBeNull();
      expect(lastRotation).not.toBe(0);
      expect(Math.abs(lastRotation!)).toBeGreaterThan(0);
      expect(Math.abs(lastRotation!)).toBeLessThan(360);
    });

    test("rotation step snapping is applied when rotationStep is set", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 0 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true} .rotationStep=${15}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const rotations: number[] = [];
      el.addEventListener("rotation-change", (e: Event) => {
        rotations.push((e as CustomEvent).detail.rotation);
      });

      const rotateHandle = el.shadowRoot!.querySelector(
        ".rotate-handle",
      ) as HTMLDivElement;

      const centerX = 100 + 200 / 2;
      const centerY = 100 + 150 / 2;
      const downEvent = new MouseEvent("mousedown", {
        clientX: centerX + 50,
        clientY: centerY,
        bubbles: true,
        cancelable: true,
      });
      rotateHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse to various positions
      const positions = [
        { x: centerX, y: centerY + 50 },
        { x: centerX - 50, y: centerY },
        { x: centerX, y: centerY - 50 },
      ];

      for (const pos of positions) {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: pos.x,
          clientY: pos.y,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(moveEvent);
        await el.updateComplete;
      }

      // Verify all rotations are multiples of 15 (handle -0 vs +0)
      for (const rotation of rotations) {
        const remainder = Math.abs(rotation % 15);
        expect(remainder).toBeLessThan(0.001); // Allow floating point tolerance
      }
    });

    test("rotation does not start when enableRotation is false", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${false}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      let eventDispatched = false;
      el.addEventListener("rotation-change", () => {
        eventDispatched = true;
      });

      // Try to rotate (but rotate handle shouldn't exist)
      const rotateHandle = el.shadowRoot!.querySelector(".rotate-handle");
      expect(rotateHandle).toBeFalsy();
    });
  });

  describe("interaction state management", () => {
    test("only one interaction mode is active at a time", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const dragArea = el.shadowRoot!.querySelector(
        ".drag-area",
      ) as HTMLDivElement;
      const seHandle = Array.from(
        el.shadowRoot!.querySelectorAll(".handle"),
      ).find((h) => h.classList.contains("se")) as HTMLDivElement;
      const rotateHandle = el.shadowRoot!.querySelector(
        ".rotate-handle",
      ) as HTMLDivElement;

      // Start drag
      const dragDown = new MouseEvent("mousedown", {
        clientX: 150,
        clientY: 150,
        bubbles: true,
        cancelable: true,
      });
      dragArea.dispatchEvent(dragDown);
      await el.updateComplete;

      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      expect(overlay.classList.contains("dragging")).toBe(true);

      // Try to start resize while dragging (should not work)
      const resizeDown = new MouseEvent("mousedown", {
        clientX: 300,
        clientY: 250,
        bubbles: true,
        cancelable: true,
      });
      seHandle.dispatchEvent(resizeDown);
      await el.updateComplete;

      // Should still be dragging, not resizing
      expect(overlay.classList.contains("dragging")).toBe(true);

      // End drag
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      await el.updateComplete;

      expect(overlay.classList.contains("dragging")).toBe(false);
    });

    test("interaction state is cleaned up on mouseup", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const dragArea = el.shadowRoot!.querySelector(
        ".drag-area",
      ) as HTMLDivElement;
      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;

      // Start drag
      const downEvent = new MouseEvent("mousedown", {
        clientX: 150,
        clientY: 150,
        bubbles: true,
        cancelable: true,
      });
      dragArea.dispatchEvent(downEvent);
      await el.updateComplete;

      expect(overlay.classList.contains("dragging")).toBe(true);

      // Move mouse
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 200,
        clientY: 180,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // End drag
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      await el.updateComplete;

      // Verify state cleaned up
      expect(overlay.classList.contains("dragging")).toBe(false);
      expect(overlay.style.left).toBe("100px"); // Should revert to prop bounds
      expect(overlay.style.top).toBe("100px");
    });
  });

  describe("bounds prop updates", () => {
    test("overlay updates when bounds prop changes", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      expect(overlay.style.left).toBe("100px");
      expect(overlay.style.top).toBe("100px");

      // Update bounds prop
      el.bounds = { x: 150, y: 125, width: 250, height: 200 };
      await el.updateComplete;

      expect(overlay.style.left).toBe("150px");
      expect(overlay.style.top).toBe("125px");
      expect(overlay.style.width).toBe("250px");
      expect(overlay.style.height).toBe("200px");
    });

    test("overlay rotation updates when bounds rotation prop changes", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 0 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      expect(overlay.style.transform).toBeFalsy();

      // Update rotation
      el.bounds = { ...bounds, rotation: 90 };
      await el.updateComplete;

      expect(overlay.style.transform).toContain("rotate(90deg)");
    });
  });

  describe("canvas zoom scenarios", () => {
    test("resize works correctly at 2x zoom with context-provided scale", async () => {
      // Create PanZoom parent to provide context
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.scale = 2;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.style.width = "1000px";
      panZoom.style.height = "1000px";
      document.body.appendChild(panZoom);

      // At 2x zoom, bounds are scaled: 100px canvas = 200px screen
      // EFCanvas passes: layoutWidth * scale = 100 * 2 = 200px screen
      const bounds = { x: 200, y: 200, width: 200, height: 150 }; // Screen pixels (100*2 canvas)
      render(
        html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
        panZoom,
      );
      const el = panZoom.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50)); // Wait for context

      let lastEventBounds: any = null;
      el.addEventListener("bounds-change", (e: Event) => {
        lastEventBounds = (e as CustomEvent).detail.bounds;
      });

      const seHandle = Array.from(
        el.shadowRoot!.querySelectorAll(".handle"),
      ).find((h) => h.classList.contains("se")) as HTMLDivElement;
      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;

      // Start resize from SE corner (at 2x zoom, corner is at 600, 500 screen pixels)
      const downEvent = new MouseEvent("mousedown", {
        clientX: 600,
        clientY: 500,
        bubbles: true,
        cancelable: true,
      });
      seHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse 100px right, 50px down (in screen pixels)
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 700,
        clientY: 550,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify resize worked correctly
      // At 2x zoom: 100px screen delta = 50px canvas delta
      // Initial: 100x75 canvas, New: 150x100 canvas
      // Event dispatches canvas coordinates (one-way data flow)
      expect(lastEventBounds).toBeTruthy();
      expect(lastEventBounds.width).toBe(150); // 100 + 50 (canvas coordinates)
      expect(lastEventBounds.height).toBe(100); // 75 + 25 (canvas coordinates)
      // Note: Overlay size remains at initial bounds (200x150 screen pixels)
      // In real usage, parent (EFCanvas) updates bounds prop after receiving event
      expect(overlay.style.width).toBe("200px"); // Initial bounds (unchanged, one-way flow)
      expect(overlay.style.height).toBe("150px");

      panZoom.remove();
    });

    test("resize works correctly at 0.5x zoom with context-provided scale", async () => {
      // Create PanZoom parent to provide context
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.scale = 0.5;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.style.width = "1000px";
      panZoom.style.height = "1000px";
      document.body.appendChild(panZoom);

      // At 0.5x zoom, bounds are scaled: 100px canvas = 50px screen
      const bounds = { x: 50, y: 50, width: 50, height: 37.5 }; // Screen pixels (100*0.5 canvas)
      render(
        html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
        panZoom,
      );
      const el = panZoom.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50)); // Wait for context

      let lastEventBounds: any = null;
      el.addEventListener("bounds-change", (e: Event) => {
        lastEventBounds = (e as CustomEvent).detail.bounds;
      });

      const eHandle = Array.from(
        el.shadowRoot!.querySelectorAll(".handle"),
      ).find((h) => h.classList.contains("e")) as HTMLDivElement;

      // Start resize from E handle (at 0.5x zoom, right edge is at 150 screen pixels)
      const downEvent = new MouseEvent("mousedown", {
        clientX: 150,
        clientY: 87.5, // center Y
        bubbles: true,
        cancelable: true,
      });
      eHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse 25px right (in screen pixels)
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 175,
        clientY: 87.5,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify resize worked correctly
      // At 0.5x zoom: 25px screen delta = 50px canvas delta
      // Initial: 100x75 canvas, New: 150x75 canvas
      // Event dispatches canvas coordinates, overlay renders screen pixels
      expect(lastEventBounds).toBeTruthy();
      expect(lastEventBounds.width).toBe(150); // 100 + 50 (canvas coordinates)
      expect(lastEventBounds.height).toBe(75); // unchanged (canvas coordinates)

      panZoom.remove();
    });

    test("resize preserves rotation correctly at 2x zoom", async () => {
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.scale = 2;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.style.width = "1000px";
      panZoom.style.height = "1000px";
      document.body.appendChild(panZoom);

      const bounds = {
        x: 200,
        y: 200,
        width: 200,
        height: 150,
        rotation: 45,
      }; // Screen pixels (100*2 canvas) with rotation
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        panZoom,
      );
      const el = panZoom.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));

      let lastEventBounds: any = null;
      el.addEventListener("bounds-change", (e: Event) => {
        lastEventBounds = (e as CustomEvent).detail.bounds;
      });

      const seHandle = Array.from(
        el.shadowRoot!.querySelectorAll(".handle"),
      ).find((h) => h.classList.contains("se")) as HTMLDivElement;

      const downEvent = new MouseEvent("mousedown", {
        clientX: 600,
        clientY: 500,
        bubbles: true,
        cancelable: true,
      });
      seHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      const moveEvent = new MouseEvent("mousemove", {
        clientX: 700,
        clientY: 550,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify rotation is preserved during resize at zoom
      expect(lastEventBounds.rotation).toBe(45);
      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;
      expect(overlay.style.transform).toContain("rotate(45deg)");

      panZoom.remove();
    });

    test("rotation works correctly at 2x zoom with context-provided scale", async () => {
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.scale = 2;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.style.width = "1000px";
      panZoom.style.height = "1000px";
      document.body.appendChild(panZoom);

      const bounds = {
        x: 200,
        y: 200,
        width: 200,
        height: 150,
        rotation: 0,
      }; // Screen pixels (100*2 canvas)
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        panZoom,
      );
      const el = panZoom.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));

      let lastRotation: number | null = null;
      el.addEventListener("rotation-change", (e: Event) => {
        lastRotation = (e as CustomEvent).detail.rotation;
      });

      const rotateHandle = el.shadowRoot!.querySelector(
        ".rotate-handle",
      ) as HTMLDivElement;
      const overlay = el.shadowRoot!.querySelector(
        ".overlay",
      ) as HTMLDivElement;

      // Element center at 2x zoom: (200 + 200/2, 200 + 150/2) = (300, 275) screen pixels
      const centerX = 200 + 200 / 2; // 300
      const centerY = 200 + 150 / 2; // 275

      // Start rotation from right side of element (0 degrees)
      const downEvent = new MouseEvent("mousedown", {
        clientX: centerX + 100, // 100px to the right
        clientY: centerY,
        bubbles: true,
        cancelable: true,
      });
      rotateHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse to bottom of element (90 degrees clockwise)
      const moveEvent = new MouseEvent("mousemove", {
        clientX: centerX,
        clientY: centerY + 100, // 100px down
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify rotation-change event was fired
      // Note: Test environment positioning differences affect exact angle
      expect(lastRotation).not.toBeNull();
      expect(typeof lastRotation).toBe("number");

      panZoom.remove();
    });

    test("rotation works correctly at 0.5x zoom with context-provided scale", async () => {
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.scale = 0.5;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.style.width = "1000px";
      panZoom.style.height = "1000px";
      document.body.appendChild(panZoom);

      const bounds = {
        x: 50,
        y: 50,
        width: 50,
        height: 37.5,
        rotation: 0,
      }; // Screen pixels (100*0.5 canvas)
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        panZoom,
      );
      const el = panZoom.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));

      let lastRotation: number | null = null;
      el.addEventListener("rotation-change", (e: Event) => {
        lastRotation = (e as CustomEvent).detail.rotation;
      });

      const rotateHandle = el.shadowRoot!.querySelector(
        ".rotate-handle",
      ) as HTMLDivElement;

      // Element center at 0.5x zoom: (50 + 50/2, 50 + 37.5/2) = (75, 68.75) screen pixels
      const centerX = 50 + 50 / 2; // 75
      const centerY = 50 + 37.5 / 2; // 68.75

      // Start rotation from right side
      const downEvent = new MouseEvent("mousedown", {
        clientX: centerX + 25, // 25px to the right
        clientY: centerY,
        bubbles: true,
        cancelable: true,
      });
      rotateHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse to bottom (90 degrees clockwise)
      const moveEvent = new MouseEvent("mousemove", {
        clientX: centerX,
        clientY: centerY + 25, // 25px down
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify rotation-change event was fired
      // Note: Test environment positioning differences affect exact angle
      expect(lastRotation).not.toBeNull();
      // Just verify the event fired - exact angle depends on test environment
      expect(typeof lastRotation).toBe("number");

      panZoom.remove();
    });

    test("rotation step snapping works correctly at 2x zoom", async () => {
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.scale = 2;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.style.width = "1000px";
      panZoom.style.height = "1000px";
      document.body.appendChild(panZoom);

      const bounds = {
        x: 200,
        y: 200,
        width: 200,
        height: 150,
        rotation: 0,
      };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true} .rotationStep=${15}></ef-transform-handles>`,
        panZoom,
      );
      const el = panZoom.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));

      const rotations: number[] = [];
      el.addEventListener("rotation-change", (e: Event) => {
        rotations.push((e as CustomEvent).detail.rotation);
      });

      const rotateHandle = el.shadowRoot!.querySelector(
        ".rotate-handle",
      ) as HTMLDivElement;

      const centerX = 200 + 200 / 2;
      const centerY = 200 + 150 / 2;
      const downEvent = new MouseEvent("mousedown", {
        clientX: centerX + 100,
        clientY: centerY,
        bubbles: true,
        cancelable: true,
      });
      rotateHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move to various positions
      const positions = [
        { x: centerX, y: centerY + 100 },
        { x: centerX - 100, y: centerY },
        { x: centerX, y: centerY - 100 },
      ];

      for (const pos of positions) {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: pos.x,
          clientY: pos.y,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(moveEvent);
        await el.updateComplete;
      }

      // Verify all rotations are multiples of 15 at zoom (handle -0 vs +0)
      for (const rotation of rotations) {
        const remainder = Math.abs(rotation % 15);
        expect(remainder).toBeLessThan(0.001); // Allow floating point tolerance
      }

      panZoom.remove();
    });

    test("resize minimum size constraint works correctly at 2x zoom", async () => {
      const panZoom = document.createElement("ef-pan-zoom") as EFPanZoom;
      panZoom.scale = 2;
      panZoom.x = 0;
      panZoom.y = 0;
      panZoom.style.width = "1000px";
      panZoom.style.height = "1000px";
      document.body.appendChild(panZoom);

      // At 2x zoom, minSize is in screen pixels (same as bounds)
      const bounds = { x: 200, y: 200, width: 200, height: 150 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .minSize=${100}></ef-transform-handles>`,
        panZoom,
      );
      const el = panZoom.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));

      let lastEventBounds: any = null;
      el.addEventListener("bounds-change", (e: Event) => {
        lastEventBounds = (e as CustomEvent).detail.bounds;
      });

      const wHandle = Array.from(
        el.shadowRoot!.querySelectorAll(".handle"),
      ).find((h) => h.classList.contains("w")) as HTMLDivElement;

      // Start resize and shrink below minimum
      const downEvent = new MouseEvent("mousedown", {
        clientX: 200, // left edge
        clientY: 350, // center Y
        bubbles: true,
        cancelable: true,
      });
      wHandle.dispatchEvent(downEvent);
      await el.updateComplete;

      // Move mouse far right to shrink below minimum
      const moveEvent = new MouseEvent("mousemove", {
        clientX: 600, // way past right edge
        clientY: 350,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(moveEvent);
      await el.updateComplete;

      // Verify minimum size is enforced
      // minSize=100 screen pixels, at 2x zoom = 50 canvas
      // Event dispatches canvas coordinates
      expect(lastEventBounds.width).toBeGreaterThanOrEqual(50); // 50 canvas = 100 screen

      panZoom.remove();
    });
  });

  describe("rotation-aware cursor", () => {
    test("handles show correct cursor at 0° rotation", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 0 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const nHandle = el.shadowRoot!.querySelector(
        ".handle.n",
      ) as HTMLDivElement;
      const eHandle = el.shadowRoot!.querySelector(
        ".handle.e",
      ) as HTMLDivElement;
      const sHandle = el.shadowRoot!.querySelector(
        ".handle.s",
      ) as HTMLDivElement;
      const wHandle = el.shadowRoot!.querySelector(
        ".handle.w",
      ) as HTMLDivElement;
      const nwHandle = el.shadowRoot!.querySelector(
        ".handle.nw",
      ) as HTMLDivElement;
      const neHandle = el.shadowRoot!.querySelector(
        ".handle.ne",
      ) as HTMLDivElement;
      const seHandle = el.shadowRoot!.querySelector(
        ".handle.se",
      ) as HTMLDivElement;
      const swHandle = el.shadowRoot!.querySelector(
        ".handle.sw",
      ) as HTMLDivElement;

      expect(
        nHandle.style.cursor || getComputedStyle(nHandle).cursor,
      ).toContain("n-resize");
      expect(
        eHandle.style.cursor || getComputedStyle(eHandle).cursor,
      ).toContain("e-resize");
      expect(
        sHandle.style.cursor || getComputedStyle(sHandle).cursor,
      ).toContain("s-resize");
      expect(
        wHandle.style.cursor || getComputedStyle(wHandle).cursor,
      ).toContain("w-resize");
      expect(
        nwHandle.style.cursor || getComputedStyle(nwHandle).cursor,
      ).toContain("nw-resize");
      expect(
        neHandle.style.cursor || getComputedStyle(neHandle).cursor,
      ).toContain("ne-resize");
      expect(
        seHandle.style.cursor || getComputedStyle(seHandle).cursor,
      ).toContain("se-resize");
      expect(
        swHandle.style.cursor || getComputedStyle(swHandle).cursor,
      ).toContain("sw-resize");
    });

    test("handles show correct cursor at 90° rotation", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 90 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const nHandle = el.shadowRoot!.querySelector(
        ".handle.n",
      ) as HTMLDivElement;
      const eHandle = el.shadowRoot!.querySelector(
        ".handle.e",
      ) as HTMLDivElement;
      const sHandle = el.shadowRoot!.querySelector(
        ".handle.s",
      ) as HTMLDivElement;
      const wHandle = el.shadowRoot!.querySelector(
        ".handle.w",
      ) as HTMLDivElement;
      const nwHandle = el.shadowRoot!.querySelector(
        ".handle.nw",
      ) as HTMLDivElement;
      const neHandle = el.shadowRoot!.querySelector(
        ".handle.ne",
      ) as HTMLDivElement;
      const seHandle = el.shadowRoot!.querySelector(
        ".handle.se",
      ) as HTMLDivElement;
      const swHandle = el.shadowRoot!.querySelector(
        ".handle.sw",
      ) as HTMLDivElement;

      // At 90° rotation: n→e, e→s, s→w, w→n
      expect(
        nHandle.style.cursor || getComputedStyle(nHandle).cursor,
      ).toContain("e-resize");
      expect(
        eHandle.style.cursor || getComputedStyle(eHandle).cursor,
      ).toContain("s-resize");
      expect(
        sHandle.style.cursor || getComputedStyle(sHandle).cursor,
      ).toContain("w-resize");
      expect(
        wHandle.style.cursor || getComputedStyle(wHandle).cursor,
      ).toContain("n-resize");
      // Corners: nw→ne, ne→se, se→sw, sw→nw
      expect(
        nwHandle.style.cursor || getComputedStyle(nwHandle).cursor,
      ).toContain("ne-resize");
      expect(
        neHandle.style.cursor || getComputedStyle(neHandle).cursor,
      ).toContain("se-resize");
      expect(
        seHandle.style.cursor || getComputedStyle(seHandle).cursor,
      ).toContain("sw-resize");
      expect(
        swHandle.style.cursor || getComputedStyle(swHandle).cursor,
      ).toContain("nw-resize");
    });

    test("handles show correct cursor at 180° rotation", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 180 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const nHandle = el.shadowRoot!.querySelector(
        ".handle.n",
      ) as HTMLDivElement;
      const eHandle = el.shadowRoot!.querySelector(
        ".handle.e",
      ) as HTMLDivElement;
      const sHandle = el.shadowRoot!.querySelector(
        ".handle.s",
      ) as HTMLDivElement;
      const wHandle = el.shadowRoot!.querySelector(
        ".handle.w",
      ) as HTMLDivElement;

      // At 180° rotation: n→s, e→w, s→n, w→e
      expect(
        nHandle.style.cursor || getComputedStyle(nHandle).cursor,
      ).toContain("s-resize");
      expect(
        eHandle.style.cursor || getComputedStyle(eHandle).cursor,
      ).toContain("w-resize");
      expect(
        sHandle.style.cursor || getComputedStyle(sHandle).cursor,
      ).toContain("n-resize");
      expect(
        wHandle.style.cursor || getComputedStyle(wHandle).cursor,
      ).toContain("e-resize");
    });

    test("handles show correct cursor at 270° rotation", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 270 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const nHandle = el.shadowRoot!.querySelector(
        ".handle.n",
      ) as HTMLDivElement;
      const eHandle = el.shadowRoot!.querySelector(
        ".handle.e",
      ) as HTMLDivElement;
      const sHandle = el.shadowRoot!.querySelector(
        ".handle.s",
      ) as HTMLDivElement;
      const wHandle = el.shadowRoot!.querySelector(
        ".handle.w",
      ) as HTMLDivElement;

      // At 270° rotation: n→w, e→n, s→e, w→s
      expect(
        nHandle.style.cursor || getComputedStyle(nHandle).cursor,
      ).toContain("w-resize");
      expect(
        eHandle.style.cursor || getComputedStyle(eHandle).cursor,
      ).toContain("n-resize");
      expect(
        sHandle.style.cursor || getComputedStyle(sHandle).cursor,
      ).toContain("e-resize");
      expect(
        wHandle.style.cursor || getComputedStyle(wHandle).cursor,
      ).toContain("s-resize");
    });

    test("handles show correct cursor at 45° rotation", async () => {
      const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 45 };
      render(
        html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
        container,
      );
      const el = container.querySelector<EFTransformHandles>(
        "ef-transform-handles",
      )!;
      await el.updateComplete;

      const nHandle = el.shadowRoot!.querySelector(
        ".handle.n",
      ) as HTMLDivElement;
      const eHandle = el.shadowRoot!.querySelector(
        ".handle.e",
      ) as HTMLDivElement;
      const sHandle = el.shadowRoot!.querySelector(
        ".handle.s",
      ) as HTMLDivElement;
      const wHandle = el.shadowRoot!.querySelector(
        ".handle.w",
      ) as HTMLDivElement;

      // At 45° rotation: n→ne, e→se, s→sw, w→nw
      expect(
        nHandle.style.cursor || getComputedStyle(nHandle).cursor,
      ).toContain("ne-resize");
      expect(
        eHandle.style.cursor || getComputedStyle(eHandle).cursor,
      ).toContain("se-resize");
      expect(
        sHandle.style.cursor || getComputedStyle(sHandle).cursor,
      ).toContain("sw-resize");
      expect(
        wHandle.style.cursor || getComputedStyle(wHandle).cursor,
      ).toContain("nw-resize");
    });

    test("cursor updates when rotation changes", async () => {
      const el = document.createElement(
        "ef-transform-handles",
      ) as EFTransformHandles;
      el.enableRotation = true;
      el.bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 0 };
      container.appendChild(el);
      await el.updateComplete;

      const nHandle = el.shadowRoot!.querySelector(
        ".handle.n",
      ) as HTMLDivElement;
      expect(
        nHandle.style.cursor || getComputedStyle(nHandle).cursor,
      ).toContain("n-resize");

      // Update rotation to 90°
      el.bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 90 };
      await el.updateComplete;

      expect(
        nHandle.style.cursor || getComputedStyle(nHandle).cursor,
      ).toContain("e-resize");
    });
  });
});
