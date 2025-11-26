import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMotionDesigner } from "./store.js";
import type { MotionDesignerState } from "./types.js";
import { actionCreators } from "./actions.js";

describe("useMotionDesigner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("initializes with empty state", () => {
    const { result } = renderHook(() => useMotionDesigner());
    const [state] = result.current;

    expect(state.composition.elements).toEqual({});
    expect(state.composition.rootTimegroupIds).toEqual([]);
    expect(state.ui.selectedElementId).toBeNull();
    expect(state.ui.currentTime).toBe(0);
  });

  test("loads state from localStorage on mount", async () => {
    const savedState: MotionDesignerState = {
      composition: {
        elements: {
          tg1: {
            id: "tg1",
            type: "timegroup",
            parentId: null,
            childIds: [],
            animations: [],
            props: {},
          },
        },
        rootTimegroupIds: ["tg1"],
      },
      ui: {
        selectedElementId: "tg1",
        selectedAnimationId: null,
        currentTime: 1000,
        placementMode: null,
        canvasTransform: { x: 0, y: 0, scale: 1 },
      },
    };

    localStorage.setItem(
      "motion-designer-composition",
      JSON.stringify(savedState),
    );

    const { result } = renderHook(() => useMotionDesigner());

    await waitFor(() => {
      expect(result.current[2].isHydrated).toBe(true);
    });

    const [state] = result.current;
    expect(state.composition.rootTimegroupIds).toContain("tg1");
    expect(state.ui.selectedElementId).toBe("tg1");
  });

  test("auto-saves state changes", async () => {
    const { result } = renderHook(() => useMotionDesigner());
    const [, actions] = result.current;

    await waitFor(() => {
      expect(result.current[2].isHydrated).toBe(true);
    });

    actions.setCurrentTime(5000);

    await waitFor(
      () => {
        const saved = localStorage.getItem("motion-designer-composition");
        expect(saved).not.toBeNull();
        if (saved) {
          const parsed = JSON.parse(saved);
          expect(parsed.ui.currentTime).toBe(5000);
        }
      },
      { timeout: 1000 },
    );
  });

  test("actions update state", async () => {
    const { result } = renderHook(() => useMotionDesigner());
    const [, actions] = result.current;

    await waitFor(() => {
      expect(result.current[2].isHydrated).toBe(true);
    });

    actions.setCurrentTime(3000);
    actions.setPlacementMode("text");

    await waitFor(() => {
      const [state] = result.current;
      expect(state.ui.currentTime).toBe(3000);
      expect(state.ui.placementMode).toBe("text");
    });
  });

  test("does not save before hydration", async () => {
    const { result } = renderHook(() => useMotionDesigner());
    const [, actions] = result.current;

    actions.setCurrentTime(5000);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const saved = localStorage.getItem("motion-designer-composition");
    if (saved) {
      const parsed = JSON.parse(saved);
      expect(parsed.ui.currentTime).toBe(0);
    }
  });
});
