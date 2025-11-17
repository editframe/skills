import React from "react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { TransformHandles } from "./TransformHandles";
import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import { MotionDesignerProvider } from "../context/MotionDesignerContext";
import * as storeModule from "~/lib/motion-designer/store";

vi.mock("~/lib/motion-designer/store", () => ({
  useMotionDesigner: vi.fn(),
}));

vi.mock("../context/MotionDesignerContext", () => ({
  MotionDesignerProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMotionDesignerActions: () => ({
    selectElement: vi.fn(),
    updateElement: vi.fn(),
  }),
}));

function createElement(overrides: Partial<ElementNode> = {}): ElementNode {
  return {
    id: "test-element",
    type: "div",
    props: {},
    animations: [],
    childIds: [],
    ...overrides,
  };
}

function createState(overrides: Partial<MotionDesignerState> = {}): MotionDesignerState {
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
      ...overrides.ui,
    },
    ...overrides,
  };
}

describe("TransformHandles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useMotionDesigner to return state and actions
    vi.mocked(storeModule.useMotionDesigner).mockReturnValue([
      createState(),
      {
        selectElement: vi.fn(),
        updateElement: vi.fn(),
        deleteElement: vi.fn(),
        addElement: vi.fn(),
        moveElement: vi.fn(),
        addAnimation: vi.fn(),
        updateAnimation: vi.fn(),
        deleteAnimation: vi.fn(),
        reorderAnimation: vi.fn(),
        setCurrentTime: vi.fn(),
        setPlacementMode: vi.fn(),
        updateCanvasTransform: vi.fn(),
        replaceState: vi.fn(),
      },
      { isHydrated: true },
    ]);

    // Create a mock DOM element for the content element
    const mockElement = document.createElement("div");
    mockElement.setAttribute("data-element-id", "test-element");
    mockElement.style.transform = "rotate(0deg)";
    document.body.appendChild(mockElement);
  });

  test("overlay rotation uses design property when no rotate animations", () => {
    const element = createElement({ props: { rotation: 45 } });
    const state = createState();

    const { container } = render(
      <MotionDesignerProvider actions={{} as any}>
        <TransformHandles
          element={element}
          state={state}
          isSelected={true}
          canvasScale={1}
          canvasTranslateX={0}
          canvasTranslateY={0}
        />
      </MotionDesignerProvider>
    );

    const overlay = container.querySelector('[style*="transform"]') as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.style.transform).toContain("rotate(45deg)");
  });

  test("overlay rotation matches DOM computed rotation when rotate animations active", async () => {
    const element = createElement({
      props: { rotation: 45 },
      animations: [
        {
          id: "anim-1",
          property: "rotate",
          fromValue: "0deg",
          toValue: "90deg",
          duration: 1000,
          delay: 0,
          easing: "ease",
          fillMode: "both",
          name: "Rotate",
        },
      ],
    });
    const state = createState();

    // Set computed transform on the DOM element
    const contentElement = document.querySelector('[data-element-id="test-element"]') as HTMLElement;
    contentElement.style.transform = "rotate(60deg)";

    const { container } = render(
      <MotionDesignerProvider actions={{} as any}>
        <TransformHandles
          element={element}
          state={state}
          isSelected={true}
          canvasScale={1}
          canvasTranslateX={0}
          canvasTranslateY={0}
        />
      </MotionDesignerProvider>
    );

    // Wait for RAF to update computed rotation
    await waitFor(() => {
      const overlay = container.querySelector('[style*="transform"]') as HTMLElement;
      expect(overlay).toBeTruthy();
      // Overlay should read computed rotation (60deg) not design property (45deg)
      expect(overlay.style.transform).toContain("rotate(60deg)");
    }, { timeout: 100 });
  });

  test("overlay rotation falls back to design property when computed rotation is 0", async () => {
    const element = createElement({
      props: { rotation: 45 },
      animations: [
        {
          id: "anim-1",
          property: "rotate",
          fromValue: "0deg",
          toValue: "90deg",
          duration: 1000,
          delay: 0,
          easing: "ease",
          fillMode: "both",
          name: "Rotate",
        },
      ],
    });
    const state = createState();

    // Set computed transform to 0 (or no rotation)
    const contentElement = document.querySelector('[data-element-id="test-element"]') as HTMLElement;
    contentElement.style.transform = "none";

    const { container } = render(
      <MotionDesignerProvider actions={{} as any}>
        <TransformHandles
          element={element}
          state={state}
          isSelected={true}
          canvasScale={1}
          canvasTranslateX={0}
          canvasTranslateY={0}
        />
      </MotionDesignerProvider>
    );

    // Should fall back to design property
    await waitFor(() => {
      const overlay = container.querySelector('[style*="transform"]') as HTMLElement;
      expect(overlay).toBeTruthy();
      // When computed is 0/none, should use design property
      expect(overlay.style.transform).toContain("rotate(45deg)");
    }, { timeout: 100 });
  });

  test("does not render when element is not selected", () => {
    const element = createElement();
    const state = createState();

    const { container } = render(
      <MotionDesignerProvider actions={{} as any}>
        <TransformHandles
          element={element}
          state={state}
          isSelected={false}
          canvasScale={1}
          canvasTranslateX={0}
          canvasTranslateY={0}
        />
      </MotionDesignerProvider>
    );

    const overlay = container.querySelector('[style*="transform"]');
    expect(overlay).toBeFalsy();
  });
});

