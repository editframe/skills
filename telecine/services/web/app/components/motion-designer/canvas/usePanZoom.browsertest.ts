import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePanZoom } from "./usePanZoom";
import type { MotionDesignerState } from "~/lib/motion-designer/types";

// Test utilities
function createMockState(
  overrides: Partial<MotionDesignerState["ui"]["canvasTransform"]> = {},
): MotionDesignerState["ui"]["canvasTransform"] {
  return {
    x: 0,
    y: 0,
    scale: 1,
    ...overrides,
  };
}

function createMockOnUpdate() {
  return vi.fn((updates: Partial<{ x: number; y: number; scale: number }>) => {
    // Mock implementation
  });
}

describe("usePanZoom", () => {
  let container: HTMLDivElement;
  let onUpdate: ReturnType<typeof createMockOnUpdate>;

  beforeEach(() => {
    // Create a container element
    container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "1000px";
    document.body.appendChild(container);

    onUpdate = createMockOnUpdate();
  });

  test("returns current transform from state", () => {
    const initialTransform = createMockState({ x: 100, y: 200, scale: 1.5 });

    const { result } = renderHook(() => usePanZoom(initialTransform, onUpdate));

    expect(result.current.transform).toEqual({
      x: 100,
      y: 200,
      scale: 1.5,
    });
  });

  test("panning updates transform with inverted delta", () => {
    const initialTransform = createMockState({ x: 0, y: 0, scale: 1 });

    const { result } = renderHook(() => usePanZoom(initialTransform, onUpdate));

    // Set container ref
    act(() => {
      if (result.current.containerRef.current === null) {
        (result.current.containerRef as any).current = container;
      }
    });

    // Simulate mouse down
    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
      button: 0,
      bubbles: true,
    });
    act(() => {
      result.current.handlers.onMouseDown(mouseDownEvent as any);
    });

    // Simulate mouse move (dragging right and down)
    const mouseMoveEvent = new MouseEvent("mousemove", {
      clientX: 150,
      clientY: 150,
      bubbles: true,
    });
    act(() => {
      result.current.handlers.onMouseMove(mouseMoveEvent as any);
    });

    // Verify update was called with inverted delta
    expect(onUpdate).toHaveBeenCalledWith({
      x: -50, // Inverted: dragging right moves canvas left
      y: -50, // Inverted: dragging down moves canvas up
    });
  });

  test("wheel scroll without modifier pans canvas", () => {
    const initialTransform = createMockState({ x: 0, y: 0, scale: 1 });

    const { result } = renderHook(() => usePanZoom(initialTransform, onUpdate));

    act(() => {
      if (result.current.containerRef.current === null) {
        (result.current.containerRef as any).current = container;
      }
    });

    // Simulate wheel scroll (pan mode - no modifier)
    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 50,
      deltaY: 100,
      clientX: 500,
      clientY: 500,
      bubbles: true,
    });

    act(() => {
      result.current.handlers.onWheel(wheelEvent);
    });

    // Verify pan update with inverted delta
    expect(onUpdate).toHaveBeenCalledWith({
      x: -50, // Inverted deltaX
      y: -100, // Inverted deltaY
    });
  });

  test("wheel scroll with modifier key zooms centered on mouse position", () => {
    const initialTransform = createMockState({ x: 0, y: 0, scale: 1 });

    const { result } = renderHook(() => usePanZoom(initialTransform, onUpdate));

    act(() => {
      if (result.current.containerRef.current === null) {
        (result.current.containerRef as any).current = container;
      }
    });

    // Get container bounds
    const rect = container.getBoundingClientRect();
    const mouseX = 500;
    const mouseY = 500;

    // Simulate wheel scroll with Cmd/Ctrl (zoom mode)
    const wheelEvent = new WheelEvent("wheel", {
      deltaY: -100, // Scroll up = zoom in
      clientX: mouseX,
      clientY: mouseY,
      bubbles: true,
      ctrlKey: true, // Modifier key
    } as any);

    act(() => {
      result.current.handlers.onWheel(wheelEvent);
    });

    // Verify zoom update
    expect(onUpdate).toHaveBeenCalled();
    const call = onUpdate.mock.calls[0][0];
    expect(call.scale).toBeGreaterThan(1); // Zoomed in
    expect(call.x).toBeDefined();
    expect(call.y).toBeDefined();
  });

  test("zoom speed is controlled (5% per step)", () => {
    const initialTransform = createMockState({ x: 0, y: 0, scale: 1 });

    const { result } = renderHook(() => usePanZoom(initialTransform, onUpdate));

    act(() => {
      if (result.current.containerRef.current === null) {
        (result.current.containerRef as any).current = container;
      }
    });

    // Zoom in
    const zoomInEvent = new WheelEvent("wheel", {
      deltaY: -100,
      clientX: 500,
      clientY: 500,
      bubbles: true,
      ctrlKey: true,
    } as any);

    act(() => {
      result.current.handlers.onWheel(zoomInEvent);
    });

    const zoomInCall = onUpdate.mock.calls[0][0];
    expect(zoomInCall.scale).toBeCloseTo(1.05, 2); // 5% increase

    // Zoom out
    const zoomOutEvent = new WheelEvent("wheel", {
      deltaY: 100,
      clientX: 500,
      clientY: 500,
      bubbles: true,
      ctrlKey: true,
    } as any);

    act(() => {
      result.current.handlers.onWheel(zoomOutEvent);
    });

    const zoomOutCall = onUpdate.mock.calls[1][0];
    expect(zoomOutCall.scale).toBeCloseTo(0.95, 2); // 5% decrease
  });

  test("zoom is clamped to valid range", () => {
    const initialTransform = createMockState({ x: 0, y: 0, scale: 0.1 });

    const { result } = renderHook(() => usePanZoom(initialTransform, onUpdate));

    act(() => {
      if (result.current.containerRef.current === null) {
        (result.current.containerRef as any).current = container;
      }
    });

    // Try to zoom out beyond minimum
    const zoomOutEvent = new WheelEvent("wheel", {
      deltaY: 1000,
      clientX: 500,
      clientY: 500,
      bubbles: true,
      ctrlKey: true,
    } as any);

    act(() => {
      result.current.handlers.onWheel(zoomOutEvent);
    });

    const call = onUpdate.mock.calls[0][0];
    expect(call.scale).toBeGreaterThanOrEqual(0.1); // Minimum scale
  });

  test("transform updates reflect in returned value", () => {
    let currentTransform = createMockState({ x: 0, y: 0, scale: 1 });

    const onUpdateWithState = vi.fn(
      (updates: Partial<{ x: number; y: number; scale: number }>) => {
        currentTransform = { ...currentTransform, ...updates };
      },
    );

    const { result, rerender } = renderHook(() =>
      usePanZoom(currentTransform, onUpdateWithState),
    );

    // Initial state
    expect(result.current.transform.scale).toBe(1);

    // Update transform externally (simulating state update)
    currentTransform = { ...currentTransform, scale: 2 };
    rerender();

    // Verify returned transform reflects update
    expect(result.current.transform.scale).toBe(2);
  });
});
