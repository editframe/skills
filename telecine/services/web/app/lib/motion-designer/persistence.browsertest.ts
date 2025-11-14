import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  saveState,
  loadState,
  exportState,
  importState,
} from "./persistence.js";
import type { MotionDesignerState } from "./types.js";

function createTestState(): MotionDesignerState {
  return {
    composition: {
      elements: {
        tg1: {
          id: "tg1",
          type: "timegroup",
          parentId: null,
          childIds: ["text1"],
          animations: [],
          props: { opacity: 0.5 },
        },
        text1: {
          id: "text1",
          type: "text",
          parentId: "tg1",
          childIds: [],
          animations: [
            {
              id: "anim1",
              name: "Fade in",
              property: "opacity",
              keyframes: [],
              duration: 1000,
              delay: 0,
              easing: "ease",
            },
          ],
          props: { content: "Hello" },
        },
      },
      rootTimegroupIds: ["tg1"],
    },
    ui: {
      selectedElementId: "text1",
      selectedAnimationId: "anim1",
      currentTime: 5000,
      placementMode: "text",
      canvasTransform: { x: 10, y: 20, scale: 1.5 },
      compositionName: "Test Composition",
    },
  };
}

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("saveState and loadState", () => {
    test("saves and loads state", () => {
      const state = createTestState();
      saveState(state);

      const loaded = loadState();

      expect(loaded).toEqual(state);
    });

    test("returns null when nothing is saved", () => {
      const loaded = loadState();
      expect(loaded).toBeNull();
    });

    test("overwrites previous state", () => {
      const state1 = createTestState();
      const state2: MotionDesignerState = {
        composition: {
          elements: {},
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

      saveState(state1);
      saveState(state2);

      const loaded = loadState();
      expect(loaded).toEqual(state2);
    });

    test("handles empty state", () => {
      const emptyState: MotionDesignerState = {
        composition: {
          elements: {},
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

      saveState(emptyState);
      const loaded = loadState();

      expect(loaded).toEqual(emptyState);
    });
  });

  describe("exportState and importState", () => {
    test("exports and imports state", () => {
      const state = createTestState();
      const json = exportState(state);

      expect(typeof json).toBe("string");
      expect(json.length).toBeGreaterThan(0);

      const imported = importState(json);

      expect(imported).toEqual(state);
    });

    test("exports formatted JSON", () => {
      const state = createTestState();
      const json = exportState(state);

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(state);
    });

    test("handles invalid JSON", () => {
      expect(() => {
        importState("invalid json");
      }).toThrow();
    });

    test("handles empty JSON", () => {
      expect(() => {
        importState("{}");
      }).not.toThrow();
    });

    test("roundtrip preserves all data", () => {
      const state = createTestState();
      const json = exportState(state);
      const imported = importState(json);

      expect(imported.composition.elements).toEqual(state.composition.elements);
      expect(imported.composition.rootTimegroupIds).toEqual(
        state.composition.rootTimegroupIds,
      );
      expect(imported.ui).toEqual(state.ui);
    });
  });

  describe("integration", () => {
    test("save -> load -> export -> import roundtrip", () => {
      const originalState = createTestState();

      saveState(originalState);
      const loadedState = loadState();
      expect(loadedState).toEqual(originalState);

      const exported = exportState(loadedState!);
      const imported = importState(exported);

      expect(imported).toEqual(originalState);
    });
  });
});

