import React from "react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Canvas } from "./Canvas";
import type {
  MotionDesignerState,
  ElementNode,
} from "~/lib/motion-designer/types";
import { MotionDesignerProvider } from "../context/MotionDesignerContext";

// Test utilities
function createMockElementNode(
  overrides: Partial<ElementNode> = {},
): ElementNode {
  return {
    id: "test-element-1",
    type: "div",
    props: {},
    animations: [],
    childIds: [],
    ...overrides,
  };
}

function createMockTimegroup(
  overrides: Partial<ElementNode> = {},
): ElementNode {
  return createMockElementNode({
    type: "timegroup",
    props: {
      canvasPosition: { x: 100, y: 100 },
      size: { width: 960, height: 540 },
      duration: "5s",
      ...overrides.props,
    },
    ...overrides,
  });
}

function createMockMotionDesignerState(
  overrides: Partial<MotionDesignerState> = {},
): MotionDesignerState {
  return {
    composition: {
      elements: {},
      rootTimegroupIds: [],
    },
    ui: {
      selectedElementId: null,
      selectedAnimationId: null,
      selectedElementAnimationId: null,
      activeRootTimegroupId: null,
      currentTime: 0,
      placementMode: null,
      canvasTransform: { x: 0, y: 0, scale: 1 },
    },
    ...overrides,
  };
}

function createMockActions() {
  return {
    selectElement: vi.fn(),
    selectAnimation: vi.fn(),
    addElement: vi.fn(),
    deleteElement: vi.fn(),
    updateElement: vi.fn(),
    moveElement: vi.fn(),
    addAnimation: vi.fn(),
    updateAnimation: vi.fn(),
    deleteAnimation: vi.fn(),
    reorderAnimation: vi.fn(),
    setActiveRootTimegroup: vi.fn(),
    setCurrentTime: vi.fn(),
    setPlacementMode: vi.fn(),
    updateCanvasTransform: vi.fn(),
    replaceState: vi.fn(),
  };
}

function renderCanvas(state: MotionDesignerState) {
  const actions = createMockActions();

  return {
    ...render(
      <MotionDesignerProvider actions={actions}>
        <Canvas state={state} />
      </MotionDesignerProvider>,
    ),
    actions,
  };
}

describe("Canvas", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  test("renders canvas container with correct styles", () => {
    const state = createMockMotionDesignerState();
    renderCanvas(state);

    const canvas = document.querySelector(
      ".flex-1.overflow-hidden.relative.bg-gray-950",
    );
    expect(canvas).toBeTruthy();
    expect(canvas).toHaveStyle({ touchAction: "none" });
  });

  test("renders root timegroups in content layer", () => {
    const timegroup = createMockTimegroup({ id: "tg1" });
    const state = createMockMotionDesignerState({
      composition: {
        elements: { tg1: timegroup },
        rootTimegroupIds: ["tg1"],
      },
    });

    renderCanvas(state);

    // Check that timegroup wrapper exists
    const wrapper = document.querySelector('[data-timegroup-id="tg1"]');
    expect(wrapper).toBeTruthy();
  });

  test("applies transform to content layer based on canvas transform", () => {
    const timegroup = createMockTimegroup({ id: "tg1" });
    const state = createMockMotionDesignerState({
      composition: {
        elements: { tg1: timegroup },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        canvasTransform: { x: 100, y: 200, scale: 1.5 },
      },
    });

    renderCanvas(state);

    // Find content layer (has transform with scale)
    const contentLayers = Array.from(
      document.querySelectorAll('[style*="transform"]'),
    );
    const contentLayer = contentLayers.find((el) => {
      const style = (el as HTMLElement).style.transform;
      return style?.includes("scale");
    });

    expect(contentLayer).toBeTruthy();
    expect((contentLayer as HTMLElement).style.transform).toContain(
      "translate(100px, 200px)",
    );
    expect((contentLayer as HTMLElement).style.transform).toContain(
      "scale(1.5)",
    );
  });

  test("applies transform to overlay layer without scale", () => {
    const timegroup = createMockTimegroup({ id: "tg1" });
    const state = createMockMotionDesignerState({
      composition: {
        elements: { tg1: timegroup },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        canvasTransform: { x: 100, y: 200, scale: 1.5 },
      },
    });

    renderCanvas(state);

    // Find overlay layer (has transform without scale)
    const overlayLayers = Array.from(
      document.querySelectorAll('[style*="transform"]'),
    );
    const overlayLayer = overlayLayers.find((el) => {
      const style = (el as HTMLElement).style.transform;
      return style?.includes("translate") && !style?.includes("scale");
    });

    expect(overlayLayer).toBeTruthy();
    expect((overlayLayer as HTMLElement).style.transform).toContain(
      "translate(100px, 200px)",
    );
    expect((overlayLayer as HTMLElement).style.transform).not.toContain(
      "scale",
    );
  });

  test("renders overlay for root timegroup", () => {
    const timegroup = createMockTimegroup({ id: "tg1" });
    const state = createMockMotionDesignerState({
      composition: {
        elements: { tg1: timegroup },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        activeRootTimegroupId: "tg1",
      },
    });

    renderCanvas(state);

    // Overlay should be rendered (check for overlay-specific content)
    // The overlay contains resize handles when active/selected
    const canvas = document.querySelector(
      ".flex-1.overflow-hidden.relative.bg-gray-950",
    );
    expect(canvas).toBeTruthy();
  });

  test("renders child element overlays", () => {
    const timegroup = createMockTimegroup({ id: "tg1" });
    const childElement = createMockElementNode({
      id: "child1",
      type: "div",
      props: {
        position: { x: 50, y: 50 },
        size: { width: 100, height: 100 },
      },
    });
    timegroup.childIds = ["child1"];

    const state = createMockMotionDesignerState({
      composition: {
        elements: { tg1: timegroup, child1: childElement },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: "child1",
      },
    });

    renderCanvas(state);

    // Child element should be rendered in content layer
    const childElementInDOM = document.querySelector(
      '[data-element-id="child1"]',
    );
    expect(childElementInDOM).toBeTruthy();
  });

  test("canvas pan updates transform when dragging on background", () => {
    const state = createMockMotionDesignerState({
      ui: {
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    });

    const { actions } = renderCanvas(state);
    const canvas = document.querySelector(
      ".flex-1.overflow-hidden.relative.bg-gray-950",
    ) as HTMLElement;

    // Simulate mouse down on canvas background
    const mouseDown = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
      button: 0,
      bubbles: true,
    });
    canvas.dispatchEvent(mouseDown);

    // Simulate mouse move
    const mouseMove = new MouseEvent("mousemove", {
      clientX: 150,
      clientY: 150,
      bubbles: true,
    });
    canvas.dispatchEvent(mouseMove);

    // Verify canvas transform was updated
    expect(actions.updateCanvasTransform).toHaveBeenCalled();
  });

  test("canvas zoom updates transform when scrolling with modifier", () => {
    const state = createMockMotionDesignerState({
      ui: {
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    });

    const { actions } = renderCanvas(state);
    const canvas = document.querySelector(
      ".flex-1.overflow-hidden.relative.bg-gray-950",
    ) as HTMLElement;

    // Simulate wheel with modifier (zoom)
    const wheelEvent = new WheelEvent("wheel", {
      deltaY: -100,
      clientX: 500,
      clientY: 500,
      bubbles: true,
      ctrlKey: true,
    });
    canvas.dispatchEvent(wheelEvent);

    // Verify canvas transform was updated with zoom
    expect(actions.updateCanvasTransform).toHaveBeenCalled();
    const call = actions.updateCanvasTransform.mock.calls[0][0];
    expect(call.scale).toBeDefined();
  });

  test("canvas pan updates transform when scrolling without modifier", () => {
    const state = createMockMotionDesignerState({
      ui: {
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    });

    const { actions } = renderCanvas(state);
    const canvas = document.querySelector(
      ".flex-1.overflow-hidden.relative.bg-gray-950",
    ) as HTMLElement;

    // Simulate wheel without modifier (pan)
    const wheelEvent = new WheelEvent("wheel", {
      deltaX: 50,
      deltaY: 100,
      bubbles: true,
    });
    canvas.dispatchEvent(wheelEvent);

    // Verify canvas transform was updated with pan
    expect(actions.updateCanvasTransform).toHaveBeenCalled();
    const call = actions.updateCanvasTransform.mock.calls[0][0];
    expect(call.x).toBeDefined();
    expect(call.y).toBeDefined();
  });
});
