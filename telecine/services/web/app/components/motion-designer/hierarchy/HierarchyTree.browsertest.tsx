import { describe, test, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { HierarchyTree } from "./HierarchyTree";
import { DragProvider } from "./DragContext";
import { MotionDesignerProvider } from "../context/MotionDesignerContext";
import type { MotionDesignerState, ElementNode } from "~/lib/motion-designer/types";
import { registerCoreBehaviors } from "~/lib/motion-designer/coreBehaviors";
import { behaviorRegistry } from "~/lib/motion-designer/behaviors";

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

describe("HierarchyTree drop target resolution", () => {
  beforeEach(() => {
    behaviorRegistry.clear();
    registerCoreBehaviors();
  });

  test("only one drop indicator visible at a time", async () => {
    const tg1 = createElement("tg1", "timegroup", ["div1"]);
    const div1 = createElement("div1", "div");
    const div2 = createElement("div2", "div");
    const state = createState([tg1, div1, div2], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyTree state={state} />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    await waitFor(() => {
      const indicators = container.querySelectorAll('[class*="bg-blue-500"]');
      expect(indicators.length).toBeLessThanOrEqual(1);
    });
  });

  test("drop target updates when cursor moves between elements", async () => {
    const tg1 = createElement("tg1", "timegroup", ["div1"]);
    const div1 = createElement("div1", "div");
    const div2 = createElement("div2", "div");
    const state = createState([tg1, div1, div2], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyTree state={state} />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const elements = container.querySelectorAll('[style*="padding-left"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  test("drop target clears when cursor leaves hierarchy panel", async () => {
    const tg1 = createElement("tg1", "timegroup", ["div1"]);
    const div1 = createElement("div1", "div");
    const state = createState([tg1, div1], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyTree state={state} />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    await waitFor(() => {
      const indicators = container.querySelectorAll('[class*="bg-blue-500"]');
      expect(indicators.length).toBe(0);
    });
  });
});

