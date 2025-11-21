import { describe, test, expect, beforeEach } from "vitest";
import { behaviorRegistry } from "./behaviors.js";
import { registerCoreBehaviors } from "./coreBehaviors.js";
import type { MotionDesignerState, ElementNode } from "./types.js";

function createElement(id: string, type: string, childIds: string[] = []): ElementNode {
  return {
    id,
    type,
    childIds,
    animations: [],
    props: {},
  };
}

function createState(elements: ElementNode[], rootTimegroupIds: string[]): MotionDesignerState {
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

describe("NestingRulesBehavior", () => {
  beforeEach(() => {
    behaviorRegistry.clear();
    registerCoreBehaviors();
  });

  test("div can be nested inside div", () => {
    const div1 = createElement("div1", "div");
    const div2 = createElement("div2", "div");
    const state = createState([div1, div2], ["tg1"]);
    const tg1 = createElement("tg1", "timegroup", []);

    expect(behaviorRegistry.canMove("div2", "div1", undefined, state)).toBe(true);
  });

  test("div can be nested inside timegroup", () => {
    const div1 = createElement("div1", "div");
    const tg1 = createElement("tg1", "timegroup", []);
    const state = createState([div1, tg1], ["tg1"]);

    expect(behaviorRegistry.canMove("div1", "tg1", undefined, state)).toBe(true);
  });

  test("timegroup cannot be nested inside div", () => {
    const div1 = createElement("div1", "div");
    const tg1 = createElement("tg1", "timegroup", []);
    const state = createState([div1, tg1], ["tg1"]);

    expect(behaviorRegistry.canMove("tg1", "div1", undefined, state)).toBe(false);
  });

  test("timegroup cannot be nested inside timegroup", () => {
    const tg1 = createElement("tg1", "timegroup", []);
    const tg2 = createElement("tg2", "timegroup", []);
    const state = createState([tg1, tg2], ["tg1", "tg2"]);

    expect(behaviorRegistry.canMove("tg2", "tg1", undefined, state)).toBe(false);
  });

  test("text element can be nested inside div", () => {
    const div1 = createElement("div1", "div");
    const text1 = createElement("text1", "text");
    const state = createState([div1, text1], ["tg1"]);
    const tg1 = createElement("tg1", "timegroup", []);

    expect(behaviorRegistry.canMove("text1", "div1", undefined, state)).toBe(true);
  });

  test("text element can be nested inside timegroup", () => {
    const text1 = createElement("text1", "text");
    const tg1 = createElement("tg1", "timegroup", []);
    const state = createState([text1, tg1], ["tg1"]);

    expect(behaviorRegistry.canMove("text1", "tg1", undefined, state)).toBe(true);
  });

  test("all element types except timegroup can nest inside div", () => {
    const div1 = createElement("div1", "div");
    const text1 = createElement("text1", "text");
    const image1 = createElement("image1", "image");
    const video1 = createElement("video1", "video");
    const audio1 = createElement("audio1", "audio");
    const div2 = createElement("div2", "div");
    const state = createState([div1, text1, image1, video1, audio1, div2], ["tg1"]);
    const tg1 = createElement("tg1", "timegroup", []);

    expect(behaviorRegistry.canMove("text1", "div1", undefined, state)).toBe(true);
    expect(behaviorRegistry.canMove("image1", "div1", undefined, state)).toBe(true);
    expect(behaviorRegistry.canMove("video1", "div1", undefined, state)).toBe(true);
    expect(behaviorRegistry.canMove("audio1", "div1", undefined, state)).toBe(true);
    expect(behaviorRegistry.canMove("div2", "div1", undefined, state)).toBe(true);
  });

  test("timegroup can only be at root level", () => {
    const tg1 = createElement("tg1", "timegroup", []);
    const tg2 = createElement("tg2", "timegroup", []);
    const div1 = createElement("div1", "div");
    const state = createState([tg1, tg2, div1], ["tg1", "tg2"]);

    expect(behaviorRegistry.canMove("tg1", null, 0, state)).toBe(true);
    expect(behaviorRegistry.canMove("tg2", null, 1, state)).toBe(true);
    expect(behaviorRegistry.canMove("tg1", "div1", undefined, state)).toBe(false);
    expect(behaviorRegistry.canMove("tg1", "tg2", undefined, state)).toBe(false);
  });
});



