import { describe, test, expect } from "vitest";
import {
  validateElementTree,
  validateTimegroupRootLevel,
  validateParentChildConsistency,
  validateAllInvariants,
} from "./invariants.js";
import type { MotionDesignerState, ElementNode } from "./types.js";

function createTimegroup(id: string, parentId: string | null = null): ElementNode {
  return {
    id,
    type: "timegroup",
    parentId,
    childIds: [],
    animations: [],
    props: {},
  };
}

function createTextElement(id: string, parentId: string | null): ElementNode {
  return {
    id,
    type: "text",
    parentId,
    childIds: [],
    animations: [],
    props: { content: "Test" },
  };
}

describe("validateElementTree", () => {
  test("validates empty state", () => {
    const state: MotionDesignerState = {
      composition: { elements: {}, rootTimegroupIds: [] },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateElementTree(state);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("validates valid tree", () => {
    const tg1 = createTimegroup("tg1");
    const text1 = createTextElement("text1", "tg1");
    tg1.childIds = ["text1"];

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1, text1 },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateElementTree(state);
    expect(result.isValid).toBe(true);
  });

  test("detects root element not in rootTimegroupIds", () => {
    const tg1 = createTimegroup("tg1");

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1 },
        rootTimegroupIds: [],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateElementTree(state);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("validates non-timegroup root element", () => {
    const text1 = createTextElement("text1", null);

    const state: MotionDesignerState = {
      composition: {
        elements: { text1 },
        rootTimegroupIds: ["text1"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateElementTree(state);
    expect(result.isValid).toBe(true);
  });

  test("detects missing parent", () => {
    const text1 = createTextElement("text1", "nonexistent");

    const state: MotionDesignerState = {
      composition: {
        elements: { text1 },
        rootTimegroupIds: [],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateElementTree(state);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("does not exist"))).toBe(true);
  });
});

describe("validateTimegroupRootLevel", () => {
  test("validates timegroups at root level", () => {
    const tg1 = createTimegroup("tg1");
    const tg2 = createTimegroup("tg2");

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1, tg2 },
        rootTimegroupIds: ["tg1", "tg2"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateTimegroupRootLevel(state);
    expect(result.isValid).toBe(true);
  });

  test("detects nested timegroup", () => {
    const tg1 = createTimegroup("tg1");
    const tg2 = createTimegroup("tg2", "tg1");
    tg1.childIds = ["tg2"];

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1, tg2 },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateTimegroupRootLevel(state);
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("must be at root level")),
    ).toBe(true);
  });
});

describe("validateParentChildConsistency", () => {
  test("validates consistent parent-child relationships", () => {
    const tg1 = createTimegroup("tg1");
    const text1 = createTextElement("text1", "tg1");
    tg1.childIds = ["text1"];

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1, text1 },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateParentChildConsistency(state);
    expect(result.isValid).toBe(true);
  });

  test("detects child not in parent's childIds", () => {
    const tg1 = createTimegroup("tg1");
    const text1 = createTextElement("text1", "tg1");
    tg1.childIds = [];

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1, text1 },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateParentChildConsistency(state);
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("parent's childIds doesn't include")),
    ).toBe(true);
  });

  test("detects childId pointing to non-existent element", () => {
    const tg1 = createTimegroup("tg1");
    tg1.childIds = ["nonexistent"];

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1 },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateParentChildConsistency(state);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("does not exist"))).toBe(true);
  });

  test("detects mismatched parentId", () => {
    const tg1 = createTimegroup("tg1");
    const tg2 = createTimegroup("tg2");
    const text1 = createTextElement("text1", "tg1");
    tg1.childIds = ["text1"];
    tg2.childIds = ["text1"];

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1, tg2, text1 },
        rootTimegroupIds: ["tg1", "tg2"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateParentChildConsistency(state);
    expect(result.isValid).toBe(false);
  });
});

describe("validateAllInvariants", () => {
  test("validates all invariants for valid state", () => {
    const tg1 = createTimegroup("tg1");
    const text1 = createTextElement("text1", "tg1");
    tg1.childIds = ["text1"];

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1, text1 },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateAllInvariants(state);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("collects all errors for invalid state", () => {
    const tg1 = createTimegroup("tg1");
    const tg2 = createTimegroup("tg2", "tg1");
    tg1.childIds = ["tg2"];

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1, tg2 },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    const result = validateAllInvariants(state);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("throws in strict mode", () => {
    const tg1 = createTimegroup("tg1");
    const tg2 = createTimegroup("tg2", "tg1");
    tg1.childIds = ["tg2"];

    const state: MotionDesignerState = {
      composition: {
        elements: { tg1, tg2 },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: null,
        selectedAnimationId: null,
        currentTime: 0,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    expect(() => {
      validateAllInvariants(state, { strict: true });
    }).toThrow();
  });
});

