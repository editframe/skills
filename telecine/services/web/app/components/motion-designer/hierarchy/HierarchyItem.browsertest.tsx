import { describe, test, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { HierarchyItem } from "./HierarchyItem";
import type { MotionDesignerState, ElementNode } from "~/lib/motion-designer/types";
import { DragProvider } from "./DragContext";
import { MotionDesignerProvider } from "../context/MotionDesignerContext";
import type { DropTarget } from "./dropTargetResolver";

function createElement(
  id: string,
  type: string,
  childIds: string[] = [],
): ElementNode {
  return {
    id,
    type,
    childIds,
    animations: [],
    props: {},
  };
}

function createState(
  elements: ElementNode[],
  rootTimegroupIds: string[],
): MotionDesignerState {
  const elementsMap: Record<string, ElementNode> = {};
  for (const element of elements) {
    elementsMap[element.id] = element;
  }
  return {
    composition: {
      elements: elementsMap,
      rootTimegroupIds,
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
  };
}

const mockRegisterElementRef = () => {};
const mockUnregisterElementRef = () => {};

const mockActions = {
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

describe("HierarchyItem drop indicators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("drop indicator appears above element when dropPosition is 'before'", () => {
    const div1 = createElement("div1", "div");
    const state = createState([div1], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "div1", position: "before" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const indicators = container.querySelectorAll('[class*="bg-blue-500"]');
    expect(indicators.length).toBeGreaterThan(0);
  });

  test("drop indicator appears below element when dropPosition is 'after'", () => {
    const div1 = createElement("div1", "div");
    const state = createState([div1], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "div1", position: "after" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const indicators = container.querySelectorAll('[class*="bg-blue-500"]');
    expect(indicators.length).toBeGreaterThan(0);
  });

  test("element highlights when dropPosition is 'inside'", () => {
    const div1 = createElement("div1", "div");
    const state = createState([div1], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "div1", position: "inside" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const element = container.querySelector('[style*="padding-left"]');
    expect(element).toBeTruthy();
    const classes = element?.className || "";
    expect(classes).toContain("bg-blue-500/30");
    expect(classes).toContain("border-l-4");
  });

  test("no drop indicators appear when dropTarget is null", () => {
    const div1 = createElement("div1", "div");
    const state = createState([div1], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const element = container.querySelector('[style*="padding-left"]');
    const classes = element?.className || "";
    expect(classes).not.toContain("bg-blue-500/30");
    expect(classes).not.toContain("border-l-4");
  });

  test("drop indicators only appear for matching elementId", () => {
    const div1 = createElement("div1", "div");
    const div2 = createElement("div2", "div");
    const state = createState([div1, div2], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "div2", position: "inside" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const element = container.querySelector('[style*="padding-left"]');
    const classes = element?.className || "";
    expect(classes).not.toContain("bg-blue-500/30");
  });

  test("drop indicators appear for nested elements", () => {
    const parent = createElement("parent", "div", ["child"]);
    const child = createElement("child", "div");
    const state = createState([parent, child], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "child", position: "inside" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={parent}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const childElement = container.querySelector('[style*="padding-left: 24px"]');
    expect(childElement).toBeTruthy();
    const classes = childElement?.className || "";
    expect(classes).toContain("bg-blue-500/30");
  });
});

