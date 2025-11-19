import React from "react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTimeManager } from "./useTimeManager";
import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { MotionDesignerProvider } from "../context/MotionDesignerContext";

function createTimegroupElement(id: string, duration: string = "5s") {
  const timegroupElement = document.createElement("ef-timegroup");
  timegroupElement.id = id;
  timegroupElement.setAttribute("duration", duration);
  timegroupElement.setAttribute("mode", "fixed");
  (timegroupElement as any).currentTimeMs = 0;
  (timegroupElement as any).playbackController = {
    playing: false,
    pause: vi.fn(),
  };
  (timegroupElement as any).seek = vi.fn();
  
  // Provide durationMs getter that reads from attribute (works with real elements too)
  // This ensures the test works whether the custom element is fully defined or not
  const originalDurationMs = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(timegroupElement),
    "durationMs"
  );
  
  // Only override if the element doesn't already have a working durationMs getter
  if (!originalDurationMs || typeof originalDurationMs.get !== "function") {
    Object.defineProperty(timegroupElement, "durationMs", {
      get: function() {
        const dur = this.getAttribute("duration") || "5s";
        if (dur.endsWith("ms")) {
          return parseFloat(dur.slice(0, -2)) || 5000;
        }
        if (dur.endsWith("s")) {
          return (parseFloat(dur.slice(0, -1)) || 5) * 1000;
        }
        return parseFloat(dur) || 5000;
      },
      configurable: true,
    });
  }
  
  document.body.appendChild(timegroupElement);
  return timegroupElement;
}

function createMockMotionDesignerState(overrides: Partial<MotionDesignerState> = {}): MotionDesignerState {
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

function renderUseTimeManager(
  activeTimegroupId: string | null,
  state?: MotionDesignerState,
) {
  const actions = createMockActions();
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MotionDesignerProvider actions={actions}>
      {children}
    </MotionDesignerProvider>
  );

  const hookResult = renderHook(
    (props: { activeTimegroupId: string | null; state?: MotionDesignerState }) => 
      useTimeManager(props.activeTimegroupId, props.state),
    { 
      wrapper,
      initialProps: { activeTimegroupId, state },
    }
  );

  return {
    ...hookResult,
    actions,
  };
}

describe("useTimeManager", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  describe("duration from DOM element", () => {
    test("reads duration from DOM element, not React state", async () => {
      const timegroupElement = createTimegroupElement("test-tg", "7.5s");
      
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            "test-tg": {
              id: "test-tg",
              type: "timegroup",
              props: {
                duration: "5s", // This should be ignored - DOM is source of truth
              },
              animations: [],
              childIds: [],
            },
          },
          rootTimegroupIds: ["test-tg"],
        },
      });

      const { result } = renderUseTimeManager("test-tg", state);

      await waitFor(() => {
        // Duration should come from DOM element (7.5s = 7500ms), not state props (5s = 5000ms)
        expect(result.current.duration).toBe(7500);
      });
    });

    test("updates duration reactively when DOM element duration changes", async () => {
      const timegroupElement = createTimegroupElement("test-tg", "5s");
      
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            "test-tg": {
              id: "test-tg",
              type: "timegroup",
              props: {},
              animations: [],
              childIds: [],
            },
          },
          rootTimegroupIds: ["test-tg"],
        },
      });

      const { result } = renderUseTimeManager("test-tg", state);

      await waitFor(() => {
        expect(result.current.duration).toBe(5000);
      });

      // Change duration on DOM element by updating attribute
      timegroupElement.setAttribute("duration", "10s");

      await waitFor(() => {
        // Duration should update reactively (10s = 10000ms)
        expect(result.current.duration).toBe(10000);
      }, { timeout: 2000 });
    });

    test("returns default duration when no active timegroup", () => {
      const { result } = renderUseTimeManager(null, undefined);
      
      expect(result.current.duration).toBe(5000);
    });

    test("initializes duration from TimeManager on mount", async () => {
      const timegroupElement = createTimegroupElement("test-tg", "8s");
      
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            "test-tg": {
              id: "test-tg",
              type: "timegroup",
              props: {},
              animations: [],
              childIds: [],
            },
          },
          rootTimegroupIds: ["test-tg"],
        },
      });

      const { result } = renderUseTimeManager("test-tg", state);

      await waitFor(() => {
        expect(result.current.duration).toBe(8000);
      });
    });
  });

  describe("duration subscription", () => {
    test("subscribes to duration changes from TimeManager", async () => {
      const timegroupElement = createTimegroupElement("test-tg", "5s");
      
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            "test-tg": {
              id: "test-tg",
              type: "timegroup",
              props: {},
              animations: [],
              childIds: [],
            },
          },
          rootTimegroupIds: ["test-tg"],
        },
      });

      const { result } = renderUseTimeManager("test-tg", state);

      await waitFor(() => {
        expect(result.current.duration).toBe(5000);
      });

      // Change duration by updating attribute
      timegroupElement.setAttribute("duration", "12s");

      await waitFor(() => {
        expect(result.current.duration).toBe(12000);
      }, { timeout: 2000 });
    });

    test("unsubscribes on unmount", async () => {
      const timegroupElement = createTimegroupElement("test-tg", "5s");
      
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            "test-tg": {
              id: "test-tg",
              type: "timegroup",
              props: {},
              animations: [],
              childIds: [],
            },
          },
          rootTimegroupIds: ["test-tg"],
        },
      });

      const { result, unmount } = renderUseTimeManager("test-tg", state);

      await waitFor(() => {
        expect(result.current.duration).toBe(5000);
      });

      unmount();

      // Change duration after unmount
      timegroupElement.setAttribute("duration", "15s");

      // Wait a bit to ensure no updates happen
      await new Promise(resolve => setTimeout(resolve, 100));

      // Duration should still be 5000 (no update after unmount)
      expect(result.current.duration).toBe(5000);
    });
  });

  describe("active timegroup changes", () => {
    test("updates duration when active timegroup changes", async () => {
      const timegroup1 = createTimegroupElement("tg-1", "5s");
      const timegroup2 = createTimegroupElement("tg-2", "8s");
      
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            "tg-1": {
              id: "tg-1",
              type: "timegroup",
              props: {},
              animations: [],
              childIds: [],
            },
            "tg-2": {
              id: "tg-2",
              type: "timegroup",
              props: {},
              animations: [],
              childIds: [],
            },
          },
          rootTimegroupIds: ["tg-1", "tg-2"],
        },
      });

      const { result, rerender } = renderUseTimeManager("tg-1", state);

      await waitFor(() => {
        expect(result.current.duration).toBe(5000);
      });

      // Change active timegroup by rerendering with new activeTimegroupId
      rerender({ activeTimegroupId: "tg-2", state });

      await waitFor(() => {
        expect(result.current.duration).toBe(8000);
      }, { timeout: 2000 });
    });
  });
});

