import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "./EFPanZoom.js";

const testElements: HTMLElement[] = [];

afterEach(() => {
  testElements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  testElements.length = 0;
});

describe("EFPanZoom", () => {
  test("returns initial transform values", () => {
    const panZoom = document.createElement("ef-pan-zoom");
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    expect(panZoom.x).toBe(0);
    expect(panZoom.y).toBe(0);
    expect(panZoom.scale).toBe(1);
  });

  test("panning via pointer drag updates transform with inverted delta", async () => {
    const panZoom = document.createElement("ef-pan-zoom");
    panZoom.style.width = "1000px";
    panZoom.style.height = "1000px";
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const transformChangedHandler = vi.fn();
    panZoom.addEventListener("transform-changed", transformChangedHandler);

    const pointerDownEvent = new PointerEvent("pointerdown", {
      clientX: 100,
      clientY: 100,
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    panZoom.dispatchEvent(pointerDownEvent);

    const pointerMoveEvent = new PointerEvent("pointermove", {
      clientX: 150,
      clientY: 150,
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    panZoom.dispatchEvent(pointerMoveEvent);

    expect(transformChangedHandler).toHaveBeenCalled();
    const call = transformChangedHandler.mock.calls[0][0];
    expect(call.detail.x).toBe(-50);
    expect(call.detail.y).toBe(-50);
  });

  test("wheel scroll without modifier pans canvas", async () => {
    const panZoom = document.createElement("ef-pan-zoom");
    panZoom.style.width = "1000px";
    panZoom.style.height = "1000px";
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const transformChangedHandler = vi.fn();
    panZoom.addEventListener("transform-changed", transformChangedHandler);

    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 50,
      deltaY: 100,
      clientX: 500,
      clientY: 500,
      bubbles: true,
      cancelable: true,
    });
    panZoom.dispatchEvent(wheelEvent);

    expect(transformChangedHandler).toHaveBeenCalled();
    const call = transformChangedHandler.mock.calls[0][0];
    expect(call.detail.x).toBe(-50);
    expect(call.detail.y).toBe(-100);
  });

  test("wheel scroll with modifier key zooms centered on pointer position", async () => {
    const panZoom = document.createElement("ef-pan-zoom");
    panZoom.style.width = "1000px";
    panZoom.style.height = "1000px";
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const transformChangedHandler = vi.fn();
    panZoom.addEventListener("transform-changed", transformChangedHandler);

    const wheelEvent = new WheelEvent("wheel", {
      deltaY: -100,
      clientX: 500,
      clientY: 500,
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    panZoom.dispatchEvent(wheelEvent);

    expect(transformChangedHandler).toHaveBeenCalled();
    const call = transformChangedHandler.mock.calls[0][0];
    expect(call.detail.scale).toBeGreaterThan(1);
    expect(call.detail.x).toBeDefined();
    expect(call.detail.y).toBeDefined();
  });

  test("zoom speed is controlled (5% per step)", async () => {
    const panZoom = document.createElement("ef-pan-zoom");
    panZoom.style.width = "1000px";
    panZoom.style.height = "1000px";
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const transformChangedHandler = vi.fn();
    panZoom.addEventListener("transform-changed", transformChangedHandler);

    const zoomInEvent = new WheelEvent("wheel", {
      deltaY: -100,
      clientX: 500,
      clientY: 500,
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    panZoom.dispatchEvent(zoomInEvent);

    const zoomInCall = transformChangedHandler.mock.calls[0][0];
    expect(zoomInCall.detail.scale).toBeCloseTo(1.05, 2);

    const zoomOutEvent = new WheelEvent("wheel", {
      deltaY: 100,
      clientX: 500,
      clientY: 500,
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    panZoom.dispatchEvent(zoomOutEvent);

    const zoomOutCall = transformChangedHandler.mock.calls[1][0];
    expect(zoomOutCall.detail.scale).toBeCloseTo(1.05 * 0.95, 2);
  });

  test("zoom is clamped to valid range", async () => {
    const panZoom = document.createElement("ef-pan-zoom");
    panZoom.scale = 0.1;
    panZoom.style.width = "1000px";
    panZoom.style.height = "1000px";
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const transformChangedHandler = vi.fn();
    panZoom.addEventListener("transform-changed", transformChangedHandler);

    const zoomOutEvent = new WheelEvent("wheel", {
      deltaY: 1000,
      clientX: 500,
      clientY: 500,
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    panZoom.dispatchEvent(zoomOutEvent);

    if (transformChangedHandler.mock.calls.length > 0) {
      const call = transformChangedHandler.mock.calls[0][0];
      expect(call.detail.scale).toBeGreaterThanOrEqual(0.1);
    } else {
      expect(panZoom.scale).toBeGreaterThanOrEqual(0.1);
    }
  });

  test("property updates reflect in transform", async () => {
    const panZoom = document.createElement("ef-pan-zoom");
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await new Promise((resolve) => setTimeout(resolve, 0));

    panZoom.x = 100;
    panZoom.y = 200;
    panZoom.scale = 1.5;

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(panZoom.x).toBe(100);
    expect(panZoom.y).toBe(200);
    expect(panZoom.scale).toBe(1.5);
  });

  test("pointer capture behavior", async () => {
    const panZoom = document.createElement("ef-pan-zoom");
    panZoom.style.width = "1000px";
    panZoom.style.height = "1000px";
    document.body.appendChild(panZoom);
    testElements.push(panZoom);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const setPointerCaptureSpy = vi.spyOn(panZoom, "setPointerCapture");
    const releasePointerCaptureSpy = vi.spyOn(panZoom, "releasePointerCapture");

    const pointerDownEvent = new PointerEvent("pointerdown", {
      clientX: 100,
      clientY: 100,
      button: 0,
      pointerId: 1,
      bubbles: true,
      cancelable: true,
    });
    panZoom.dispatchEvent(pointerDownEvent);

    expect(setPointerCaptureSpy).toHaveBeenCalledWith(1);

    const pointerUpEvent = new PointerEvent("pointerup", {
      clientX: 150,
      clientY: 150,
      button: 0,
      pointerId: 1,
      bubbles: true,
      cancelable: true,
    });
    panZoom.dispatchEvent(pointerUpEvent);

    expect(releasePointerCaptureSpy).toHaveBeenCalledWith(1);
  });
});
