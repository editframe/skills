import { describe, test, expect } from "vitest";
import { evaluateDropTarget, type ElementRef } from "./dropTargetEvaluation";
import type {
  MotionDesignerState,
  ElementNode,
} from "~/lib/motion-designer/types";
import { registerCoreBehaviors } from "~/lib/motion-designer/coreBehaviors";
import { behaviorRegistry } from "~/lib/motion-designer/behaviors";
import type { DropZone } from "./dropZone";

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

function createElementRef(
  element: ElementNode,
  rect: DOMRect,
  depth: number,
): ElementRef {
  return {
    elementId: element.id,
    element,
    rect,
    depth,
  };
}

describe("evaluateDropTarget", () => {
  beforeEach(() => {
    behaviorRegistry.clear();
    registerCoreBehaviors();
  });

  test("returns null when no dragged element", () => {
    const state = createState([], []);
    const elementRefs: ElementRef[] = [];
    const result = evaluateDropTarget(
      { x: 100, y: 100 },
      elementRefs,
      "nonexistent",
      state,
      () => "none",
      () => {},
    );
    expect(result).toBeNull();
  });

  test("returns null when cursor is not over any element", () => {
    const div1 = createElement("div1", "div");
    const state = createState([div1], ["tg1"]);
    const tg1 = createElement("tg1", "timegroup");

    const rect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 132,
      width: 200,
      height: 32,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    const elementRefs = [createElementRef(div1, rect, 0)];

    const result = evaluateDropTarget(
      { x: 300, y: 300 },
      elementRefs,
      "div2",
      state,
      () => "inside",
      () => {},
    );
    expect(result).toBeNull();
  });

  test("returns drop target for element cursor is over", () => {
    const div1 = createElement("div1", "div");
    const div2 = createElement("div2", "div");
    const state = createState([div1, div2], ["tg1"]);
    const tg1 = createElement("tg1", "timegroup");

    const rect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 132,
      width: 200,
      height: 32,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    const elementRefs = [createElementRef(div1, rect, 0)];

    const result = evaluateDropTarget(
      { x: 100, y: 115 },
      elementRefs,
      "div2",
      state,
      () => "inside",
      () => {},
    );

    expect(result).toEqual({
      elementId: "div1",
      position: "inside",
    });
  });

  test("selects deepest element when cursor is over multiple elements", () => {
    const tg1 = createElement("tg1", "timegroup", ["parent"]);
    const parent = createElement("parent", "div", ["child"]);
    const child = createElement("child", "div");
    const div2 = createElement("div2", "div");
    const state = createState([tg1, parent, child, div2], ["tg1"]);

    const parentRect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 164,
      width: 200,
      height: 64,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    const childRect: DOMRect = {
      top: 132,
      left: 16,
      right: 184,
      bottom: 164,
      width: 168,
      height: 32,
      x: 16,
      y: 132,
      toJSON: () => ({}),
    };

    const elementRefs = [
      createElementRef(parent, parentRect, 0),
      createElementRef(child, childRect, 1),
    ];

    const result = evaluateDropTarget(
      { x: 100, y: 148 },
      elementRefs,
      "div2",
      state,
      () => "inside",
      () => {},
    );

    expect(result).toEqual({
      elementId: "child",
      position: "inside",
    });
  });

  test("returns null when drop is not allowed by nesting rules", () => {
    const tg1 = createElement("tg1", "timegroup");
    const tg2 = createElement("tg2", "timegroup");
    const state = createState([tg1, tg2], ["tg1", "tg2"]);

    const rect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 132,
      width: 200,
      height: 32,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    const elementRefs = [createElementRef(tg1, rect, 0)];

    const result = evaluateDropTarget(
      { x: 100, y: 115 },
      elementRefs,
      "tg2",
      state,
      () => "inside",
      () => {},
    );

    expect(result).toBeNull();
  });

  test("converts zone to position correctly", () => {
    const tg1 = createElement("tg1", "timegroup", ["div1"]);
    const div1 = createElement("div1", "div");
    const div2 = createElement("div2", "div");
    const div3 = createElement("div3", "div");
    const state = createState([tg1, div1, div2, div3], ["tg1"]);

    const rect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 132,
      width: 200,
      height: 32,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    const elementRefs = [createElementRef(div1, rect, 0)];

    const beforeResult = evaluateDropTarget(
      { x: 100, y: 105 },
      elementRefs,
      "div2",
      state,
      () => "before" as DropZone,
      () => {},
    );
    expect(beforeResult).not.toBeNull();
    expect(beforeResult?.position).toBe("before");

    const afterResult = evaluateDropTarget(
      { x: 100, y: 127 },
      elementRefs,
      "div3",
      state,
      () => "after" as DropZone,
      () => {},
    );
    expect(afterResult).not.toBeNull();
    expect(afterResult?.position).toBe("after");

    const insideResult = evaluateDropTarget(
      { x: 100, y: 115 },
      elementRefs,
      "div2",
      state,
      () => "inside" as DropZone,
      () => {},
    );
    expect(insideResult).not.toBeNull();
    expect(insideResult?.position).toBe("inside");
  });

  test("excludes dragged element from candidates", () => {
    const div1 = createElement("div1", "div");
    const div2 = createElement("div2", "div");
    const state = createState([div1, div2], ["tg1"]);
    const tg1 = createElement("tg1", "timegroup");

    const rect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 132,
      width: 200,
      height: 32,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    const elementRefs = [
      createElementRef(div1, rect, 0),
      createElementRef(div2, rect, 0),
    ];

    const result = evaluateDropTarget(
      { x: 100, y: 115 },
      elementRefs,
      "div1",
      state,
      () => "inside",
      () => {},
    );

    expect(result?.elementId).not.toBe("div1");
  });

  test("calls resetElementZone when cursor leaves element", () => {
    const div1 = createElement("div1", "div");
    const div2 = createElement("div2", "div");
    const state = createState([div1, div2], ["tg1"]);
    const tg1 = createElement("tg1", "timegroup");

    const rect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 132,
      width: 200,
      height: 32,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    const elementRefs = [createElementRef(div1, rect, 0)];
    const resetCalls: string[] = [];

    evaluateDropTarget(
      { x: 300, y: 300 },
      elementRefs,
      "div2",
      state,
      () => "inside",
      (elementId) => {
        resetCalls.push(elementId);
      },
    );

    expect(resetCalls).toContain("div1");
  });
});
