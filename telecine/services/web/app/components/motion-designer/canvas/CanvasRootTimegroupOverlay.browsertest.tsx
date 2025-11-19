import React from "react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CanvasRootTimegroupOverlay } from "./CanvasRootTimegroupOverlay";
import type { MotionDesignerState, ElementNode } from "~/lib/motion-designer/types";
import { MotionDesignerProvider } from "../context/MotionDesignerContext";

function createMockElementNode(overrides: Partial<ElementNode> = {}): ElementNode {
  return {
    id: "test-element-1",
    type: "div",
    props: {},
    animations: [],
    childIds: [],
    ...overrides,
  };
}

function createMockTimegroup(overrides: Partial<ElementNode> = {}): ElementNode {
  return createMockElementNode({
    type: "timegroup",
    props: {
      canvasPosition: { x: 100, y: 100 },
      size: { width: 960, height: 540 },
      ...overrides.props,
    },
    ...overrides,
  });
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

function createTimegroupElement(id: string, duration: string = "5s") {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-timegroup-id", id);
  
  const timegroupElement = document.createElement("ef-timegroup");
  timegroupElement.id = id;
  timegroupElement.setAttribute("duration", duration);
  timegroupElement.setAttribute("mode", "fixed");
  
  // Provide durationMs getter that reads from attribute (works with real elements too)
  const originalDurationMs = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(timegroupElement),
    "durationMs"
  );
  
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
  
  // Set dimensions for the element
  Object.defineProperty(timegroupElement, "offsetWidth", {
    get: () => 960,
    configurable: true,
  });
  
  Object.defineProperty(timegroupElement, "offsetHeight", {
    get: () => 540,
    configurable: true,
  });
  
  wrapper.appendChild(timegroupElement);
  document.body.appendChild(wrapper);
  
  return { wrapper, timegroupElement };
}

function renderOverlay(
  element: ElementNode,
  state: MotionDesignerState,
  canvasScale: number = 1,
) {
  const actions = createMockActions();
  
  return {
    ...render(
      <MotionDesignerProvider actions={actions}>
        <CanvasRootTimegroupOverlay
          element={element}
          state={state}
          canvasScale={canvasScale}
        />
      </MotionDesignerProvider>
    ),
    actions,
  };
}

describe("CanvasRootTimegroupOverlay", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  describe("duration display", () => {
    test("reads duration from DOM element, not React state", async () => {
      const element = createMockTimegroup({
        id: "test-tg",
        props: {
          duration: "3s", // This should be ignored - DOM is source of truth
          canvasPosition: { x: 100, y: 100 },
          size: { width: 960, height: 540 },
        },
      });

      // Create the DOM element with duration attribute (DOM is source of truth)
      const { timegroupElement } = createTimegroupElement("test-tg", "7.5s");

      const state = createMockMotionDesignerState({
        composition: {
          elements: { [element.id]: element },
          rootTimegroupIds: [element.id],
        },
        ui: {
          activeRootTimegroupId: element.id,
        },
      });

      renderOverlay(element, state);

      await waitFor(() => {
        const durationText = screen.getByText(/Timegroup ·/);
        // Should show 7.5s (from DOM element's durationMs getter), not 3.0s (from props)
        expect(durationText.textContent).toContain("7.5s");
      }, { timeout: 2000 });
    });

    test("formats duration correctly for seconds", async () => {
      const element = createMockTimegroup({ 
        id: "test-tg",
        props: {
          duration: "5s",
          canvasPosition: { x: 100, y: 100 },
          size: { width: 960, height: 540 },
        },
      });

      createTimegroupElement("test-tg", "5s");

      const state = createMockMotionDesignerState({
        composition: {
          elements: { [element.id]: element },
          rootTimegroupIds: [element.id],
        },
        ui: {
          activeRootTimegroupId: element.id,
        },
      });

      renderOverlay(element, state);

      await waitFor(() => {
        const durationText = screen.getByText(/Timegroup ·/);
        expect(durationText.textContent).toContain("5.0s");
      }, { timeout: 2000 });
    });

    test("formats duration correctly for milliseconds", async () => {
      const element = createMockTimegroup({ 
        id: "test-tg",
        props: {
          duration: "500ms",
          canvasPosition: { x: 100, y: 100 },
          size: { width: 960, height: 540 },
        },
      });

      createTimegroupElement("test-tg", "500ms");

      const state = createMockMotionDesignerState({
        composition: {
          elements: { [element.id]: element },
          rootTimegroupIds: [element.id],
        },
        ui: {
          activeRootTimegroupId: element.id,
        },
      });

      renderOverlay(element, state);

      await waitFor(() => {
        const durationText = screen.getByText(/Timegroup ·/);
        expect(durationText.textContent).toContain("500ms");
      }, { timeout: 2000 });
    });

    test("formats duration with decimal for seconds", async () => {
      const element = createMockTimegroup({ 
        id: "test-tg",
        props: {
          duration: "1.5s",
          canvasPosition: { x: 100, y: 100 },
          size: { width: 960, height: 540 },
        },
      });

      createTimegroupElement("test-tg", "1.5s");

      const state = createMockMotionDesignerState({
        composition: {
          elements: { [element.id]: element },
          rootTimegroupIds: [element.id],
        },
        ui: {
          activeRootTimegroupId: element.id,
        },
      });

      renderOverlay(element, state);

      await waitFor(() => {
        const durationText = screen.getByText(/Timegroup ·/);
        expect(durationText.textContent).toContain("1.5s");
      }, { timeout: 2000 });
    });
  });

  describe("duration updates reactively", () => {
    test("updates duration display when DOM element duration changes", async () => {
      const element = createMockTimegroup({ 
        id: "test-tg",
        props: {
          duration: "5s",
          canvasPosition: { x: 100, y: 100 },
          size: { width: 960, height: 540 },
        },
      });

      const { timegroupElement } = createTimegroupElement("test-tg", "5s");

      const state = createMockMotionDesignerState({
        composition: {
          elements: { [element.id]: element },
          rootTimegroupIds: [element.id],
        },
        ui: {
          activeRootTimegroupId: element.id,
        },
      });

      renderOverlay(element, state);

      await waitFor(() => {
        const durationText = screen.getByText(/Timegroup ·/);
        expect(durationText.textContent).toContain("5.0s");
      }, { timeout: 2000 });

      // Change duration on DOM element by updating attribute
      timegroupElement.setAttribute("duration", "10s");

      await waitFor(() => {
        const durationText = screen.getByText(/Timegroup ·/);
        expect(durationText.textContent).toContain("10.0s");
      }, { timeout: 2000 });
    });

    test("reads duration from DOM element in RAF loop", async () => {
      const element = createMockTimegroup({ 
        id: "test-tg",
        props: {
          duration: "5s",
          canvasPosition: { x: 100, y: 100 },
          size: { width: 960, height: 540 },
        },
      });

      createTimegroupElement("test-tg", "5s");

      const state = createMockMotionDesignerState({
        composition: {
          elements: { [element.id]: element },
          rootTimegroupIds: [element.id],
        },
        ui: {
          activeRootTimegroupId: element.id,
        },
      });

      renderOverlay(element, state);

      // Wait for initial render and a few RAF cycles
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the component is reading from the DOM element by checking the displayed duration
      const durationText = screen.getByText(/Timegroup ·/);
      expect(durationText.textContent).toContain("5.0s");
    });
  });

  describe("duration not displayed when inactive", () => {
    test("does not show duration overlay when timegroup is not active", () => {
      const element = createMockTimegroup({ 
        id: "test-tg",
        props: {
          duration: "5s",
          canvasPosition: { x: 100, y: 100 },
          size: { width: 960, height: 540 },
        },
      });

      createTimegroupElement("test-tg", "5s");

      const state = createMockMotionDesignerState({
        composition: {
          elements: { [element.id]: element },
          rootTimegroupIds: [element.id],
        },
        ui: {
          activeRootTimegroupId: null, // Not active
        },
      });

      renderOverlay(element, state);

      const durationText = screen.queryByText(/Timegroup ·/);
      expect(durationText).not.toBeInTheDocument();
    });
  });
});

