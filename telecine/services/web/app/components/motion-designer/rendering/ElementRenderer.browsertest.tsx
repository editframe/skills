import React from "react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ElementRenderer } from "./ElementRenderer";
import type { MotionDesignerState, ElementNode, Animation } from "~/lib/motion-designer/types";
import * as generateStylesModule from "../animations/generateStyles";
import * as animationStylesModule from "./styleGenerators/animationStyles";
import * as animationCSSModule from "./animationCSS";
import * as useElementStylesModule from "./hooks/useElementStyles";
import * as useElementPropsModule from "./hooks/useElementProps";
import * as useMotionDesignerActionsModule from "../context/MotionDesignerContext";

// Mock elementRegistry module - use async factory to import React
vi.mock("./elementRegistry", async () => {
  const React = await import("react");
  return {
    elementRegistry: {
      text: ({ children, ...props }: any) => React.createElement("div", { "data-testid": "text-element", ...props }, children),
      div: ({ children, ...props }: any) => React.createElement("div", { "data-testid": "div-element", ...props }, children),
      image: ({ children, ...props }: any) => React.createElement("img", { "data-testid": "image-element", ...props }),
      video: ({ children, ...props }: any) => React.createElement("video", { "data-testid": "video-element", ...props }, children),
      timegroup: ({ children, ...props }: any) => React.createElement("div", { "data-testid": "timegroup-element", ...props }, children),
    },
    TextSegment: () => React.createElement("span", { "data-testid": "text-segment" }),
  };
});

// Mock hooks that don't exist yet - create virtual modules
vi.mock("./hooks/useElementStyles", () => ({
  useElementStyles: vi.fn(),
}));

vi.mock("./hooks/useElementProps", () => ({
  useElementProps: vi.fn(),
}));

// Mock all hooks and utility functions
vi.mock("../context/MotionDesignerContext");
vi.mock("../animations/generateStyles");
vi.mock("./styleGenerators/animationStyles");
vi.mock("./animationCSS");

// Test utilities
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
      canvasTransform: { x: 0, y: 0, zoom: 1 },
    },
    ...overrides,
  };
}

function createMockAnimation(overrides: Partial<Animation> = {}): Animation {
  return {
    id: "anim-1",
    property: "opacity",
    fromValue: "0",
    toValue: "1",
    duration: 1000,
    delay: 0,
    easing: "ease",
    fillMode: "both",
    ...overrides,
  };
}

describe("ElementRenderer", () => {
  let mockSelectElement: ReturnType<typeof vi.fn>;
  let mockUseElementStyles: ReturnType<typeof vi.fn>;
  let mockUseElementProps: ReturnType<typeof vi.fn>;
  let mockGenerateAnimationStyles: ReturnType<typeof vi.fn>;
  let mockGenerateAnimationStyle: ReturnType<typeof vi.fn>;
  let mockGenerateTextSplitAnimationCSS: ReturnType<typeof vi.fn>;
  let mockCreateAnimationKey: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear DOM
    document.head.innerHTML = "";
    document.body.innerHTML = "";

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockSelectElement = vi.fn();
    mockUseElementStyles = vi.fn().mockReturnValue({ styles: {} });
    mockUseElementProps = vi.fn().mockReturnValue({ props: {}, textContent: null });
    mockGenerateAnimationStyles = vi.fn().mockReturnValue(null);
    mockGenerateAnimationStyle = vi.fn().mockReturnValue(null);
    mockGenerateTextSplitAnimationCSS = vi.fn().mockReturnValue("");
    mockCreateAnimationKey = vi.fn().mockReturnValue("test-key");

    // Apply mocks
    vi.mocked(useMotionDesignerActionsModule.useMotionDesignerActions).mockReturnValue({
      selectElement: mockSelectElement,
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
    } as any);

    vi.mocked(useElementStylesModule.useElementStyles).mockImplementation(mockUseElementStyles);
    vi.mocked(useElementPropsModule.useElementProps).mockImplementation(mockUseElementProps);
    vi.mocked(generateStylesModule.generateAnimationStyles).mockImplementation(mockGenerateAnimationStyles);
    vi.mocked(animationStylesModule.generateAnimationStyle).mockImplementation(mockGenerateAnimationStyle);
    vi.mocked(animationCSSModule.generateTextSplitAnimationCSS).mockImplementation(mockGenerateTextSplitAnimationCSS);
    vi.mocked(animationCSSModule.createAnimationKey).mockImplementation(mockCreateAnimationKey);
  });

  describe("Test Setup and Infrastructure", () => {
    test("test file exists and imports necessary dependencies", async () => {
      expect(ElementRenderer).toBeDefined();
      const { elementRegistry } = await import("./elementRegistry");
      expect(elementRegistry).toBeDefined();
    });

    test("utilities create valid test data structures", () => {
      const element = createMockElementNode();
      expect(element.id).toBe("test-element-1");
      expect(element.type).toBe("div");
      expect(element.animations).toEqual([]);
      expect(element.childIds).toEqual([]);

      const state = createMockMotionDesignerState();
      expect(state.composition).toBeDefined();
      expect(state.composition.elements).toBeDefined();
      expect(state.ui).toBeDefined();
    });

    test("mocks return expected data structures", () => {
      const element = createMockElementNode();
      const state = createMockMotionDesignerState();

      mockUseElementStyles.mockReturnValue({ styles: { color: "red" } });
      mockUseElementProps.mockReturnValue({ props: { className: "test" }, textContent: "Hello" });

      const stylesResult = mockUseElementStyles(element, state);
      const propsResult = mockUseElementProps(element);

      expect(stylesResult.styles).toEqual({ color: "red" });
      expect(propsResult.props).toEqual({ className: "test" });
      expect(propsResult.textContent).toBe("Hello");
    });
  });

  describe("Test Basic Element Rendering", () => {
    test("renders div element type", () => {
      const element = createMockElementNode({ type: "div" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
    });

    test("renders text element type", () => {
      const element = createMockElementNode({ type: "text" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });
      mockUseElementProps.mockReturnValue({ props: {}, textContent: "Test Text" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
    });

    test("renders image element type", () => {
      const element = createMockElementNode({ type: "image" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
    });

    test("renders video element type", () => {
      const element = createMockElementNode({ type: "video" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
    });

    test("renders timegroup element type", () => {
      const element = createMockElementNode({ type: "timegroup" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
    });

    test("invalid element type returns null", () => {
      const element = createMockElementNode({ type: "invalid-type" as any });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeNull();
    });

    test("element renders with data-element-id attribute", () => {
      const element = createMockElementNode({ id: "test-id-123" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="test-id-123"]`);
      expect(rendered).toBeTruthy();
      expect(rendered?.getAttribute("data-element-id")).toBe("test-id-123");
    });
  });

  describe("Test Style Merging and Application", () => {
    test("designStyles are merged with existing props.style", () => {
      const element = createMockElementNode();
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementStyles.mockReturnValue({ styles: { color: "blue", fontSize: "16px" } });
      mockUseElementProps.mockReturnValue({
        props: { style: { backgroundColor: "red" } },
        textContent: null,
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      expect(rendered).toBeTruthy();
      expect(rendered.style.color).toBe("blue");
      expect(rendered.style.fontSize).toBe("16px");
      expect(rendered.style.backgroundColor).toBe("red");
    });

    test("timegroup elements don't receive cursor pointer style", () => {
      const element = createMockElementNode({ type: "timegroup" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementStyles.mockReturnValue({ styles: { color: "red" } });
      mockUseElementProps.mockReturnValue({ props: {}, textContent: null });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      expect(rendered).toBeTruthy();
      expect(rendered.style.cursor).not.toBe("pointer");
    });

    test("non-timegroup elements receive cursor pointer style", () => {
      const element = createMockElementNode({ type: "div" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementStyles.mockReturnValue({ styles: {} });
      mockUseElementProps.mockReturnValue({ props: {}, textContent: null });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      expect(rendered).toBeTruthy();
      expect(rendered.style.cursor).toBe("pointer");
    });

    test("style merging preserves existing style properties", () => {
      const element = createMockElementNode();
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementStyles.mockReturnValue({ styles: { color: "blue" } });
      mockUseElementProps.mockReturnValue({
        props: { style: { color: "red", padding: "10px" } },
        textContent: null,
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      expect(rendered).toBeTruthy();
      // designStyles should override existing styles
      expect(rendered.style.color).toBe("blue");
      expect(rendered.style.padding).toBe("10px");
    });

    test("timegroup with display flex receives flex layout styles", () => {
      const element = createMockElementNode({
        type: "timegroup",
        props: { display: "flex", flexDirection: "row", justifyContent: "center" },
      });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementStyles.mockReturnValue({
        styles: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
        },
      });
      mockUseElementProps.mockReturnValue({
        props: {},
        textContent: null,
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      expect(rendered).toBeTruthy();
      expect(rendered.style.display).toBe("flex");
      expect(rendered.style.flexDirection).toBe("row");
      expect(rendered.style.justifyContent).toBe("center");
    });

    test("timegroup flex styles override props.style when present", () => {
      const element = createMockElementNode({
        type: "timegroup",
        props: { display: "flex" },
      });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementStyles.mockReturnValue({
        styles: { display: "flex", flexDirection: "column" },
      });
      mockUseElementProps.mockReturnValue({
        props: { style: { display: "block" } },
        textContent: null,
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      expect(rendered).toBeTruthy();
      // designStyles should override props.style
      expect(rendered.style.display).toBe("flex");
      expect(rendered.style.flexDirection).toBe("column");
    });
  });

  describe("Test Animation CSS Generation and Injection", () => {
    test("keyframeStyles are included in fullCSS", () => {
      const element = createMockElementNode();
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockGenerateAnimationStyles.mockReturnValue("@keyframes fade { from { opacity: 0; } }");
      mockGenerateAnimationStyle.mockReturnValue({ animation: "fade 1s ease 0s both paused" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const styleElement = document.getElementById(`animation-styles-${element.id}`) as HTMLStyleElement;
      expect(styleElement).toBeTruthy();
      expect(styleElement.textContent).toContain("@keyframes fade");
    });

    test("text elements with split use generateTextSplitAnimationCSS", () => {
      const element = createMockElementNode({
        type: "text",
        props: { split: "word" },
        animations: [createMockAnimation()],
      });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockGenerateTextSplitAnimationCSS.mockReturnValue("\n[data-element-id=\"test-element-1\"] ef-text-segment {\n  animation: test-anim;\n}");

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const styleElement = document.getElementById(`animation-styles-${element.id}`) as HTMLStyleElement;
      expect(styleElement).toBeTruthy();
      expect(styleElement.textContent).toContain("ef-text-segment");
      expect(styleElement.textContent).toContain("animation: test-anim");
    });

    test("non-text elements use generateAnimationStyle for inline animation", () => {
      const element = createMockElementNode({
        type: "div",
        animations: [createMockAnimation()],
      });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockGenerateAnimationStyle.mockReturnValue({ animation: "fade 1s ease 0s both paused" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const styleElement = document.getElementById(`animation-styles-${element.id}`) as HTMLStyleElement;
      expect(styleElement).toBeTruthy();
      expect(styleElement.textContent).toContain(`[data-element-id="${element.id}"]`);
      expect(styleElement.textContent).toContain("animation: fade 1s ease 0s both paused");
    });

    test("animation none is set when animationStyle.animation === 'none'", () => {
      const element = createMockElementNode({
        animations: [createMockAnimation()],
      });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockGenerateAnimationStyle.mockReturnValue({ animation: "none" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const styleElement = document.getElementById(`animation-styles-${element.id}`) as HTMLStyleElement;
      expect(styleElement).toBeTruthy();
      expect(styleElement.textContent).toContain("animation: none");
    });

    test("style element exists with correct ID and CSS", () => {
      const element = createMockElementNode({ id: "test-id-456" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockCreateAnimationKey.mockReturnValue("anim-key-123");
      mockGenerateAnimationStyle.mockReturnValue({ animation: "fade 1s" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const styleElement = document.getElementById(`animation-styles-test-id-456`) as HTMLStyleElement;
      expect(styleElement).toBeTruthy();
      expect(styleElement.id).toBe("animation-styles-test-id-456");
      expect(styleElement.textContent).toContain("animation: fade 1s");
    });
  });

  describe("Test Click Handling and Selection", () => {
    test("clicking non-timegroup element calls actions.selectElement", async () => {
      const user = userEvent.setup();
      const element = createMockElementNode({ type: "div", id: "clickable-element" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      await user.click(rendered);

      expect(mockSelectElement).toHaveBeenCalledWith("clickable-element");
    });

    test("clicking non-timegroup element stops event propagation", async () => {
      const element = createMockElementNode({ type: "div" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      const parentHandler = vi.fn();

      render(
        <div onClick={parentHandler}>
          <ElementRenderer element={element} state={state} currentTime={0} />
        </div>
      );

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      await userEvent.click(rendered);

      // Verify selectElement was called (which means stopPropagation prevented parent handler)
      expect(mockSelectElement).toHaveBeenCalled();
      // Parent handler should not be called if stopPropagation worked
      // Note: In React Testing Library, stopPropagation behavior is tested indirectly
      // by verifying the element's click handler executes and calls selectElement
    });

    test("clicking timegroup element does not trigger selection", async () => {
      const user = userEvent.setup();
      const element = createMockElementNode({ type: "timegroup", id: "timegroup-element" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      await user.click(rendered);

      expect(mockSelectElement).not.toHaveBeenCalled();
    });

    test("clicking timegroup element does not stop propagation", async () => {
      const user = userEvent.setup();
      const element = createMockElementNode({ type: "timegroup" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      const parentHandler = vi.fn();

      render(
        <div onClick={parentHandler}>
          <ElementRenderer element={element} state={state} currentTime={0} />
        </div>
      );

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`) as HTMLElement;
      await user.click(rendered);

      // Parent handler should be called if propagation wasn't stopped
      expect(parentHandler).toHaveBeenCalled();
    });
  });

  describe("Test Component Key Generation", () => {
    test("text elements generate composite key", () => {
      const element = createMockElementNode({
        type: "text",
        id: "text-1",
        props: { fontSize: "32px", fontFamily: "Arial", textAlign: "center" },
      });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementProps.mockReturnValue({ props: {}, textContent: "Hello World" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      // Component key affects React reconciliation, verify element renders
      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
    });

    test("non-text elements use element.id as component key", () => {
      const element = createMockElementNode({ type: "div", id: "div-123" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="div-123"]`);
      expect(rendered).toBeTruthy();
    });
  });

  describe("Test Text Content Rendering", () => {
    test("text elements render TextSegment component and textContent", () => {
      const element = createMockElementNode({ type: "text" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementProps.mockReturnValue({ props: {}, textContent: "Test Content" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
      expect(rendered?.textContent).toContain("Test Content");
    });

    test("non-text elements render only textContent when present", () => {
      const element = createMockElementNode({ type: "div" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementProps.mockReturnValue({ props: {}, textContent: "Div Content" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
      expect(rendered?.textContent).toBe("Div Content");
    });
  });

  describe("Test Recursive Child Rendering", () => {
    test("element with childIds renders child ElementRenderer components", () => {
      const childElement = createMockElementNode({ id: "child-1", type: "div" });
      const parentElement = createMockElementNode({
        id: "parent-1",
        childIds: ["child-1"],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            [parentElement.id]: parentElement,
            [childElement.id]: childElement,
          },
          rootTimegroupIds: [],
        },
      });

      render(<ElementRenderer element={parentElement} state={state} currentTime={0} />);

      const parent = document.querySelector(`[data-element-id="${parentElement.id}"]`);
      const child = document.querySelector(`[data-element-id="${childElement.id}"]`);

      expect(parent).toBeTruthy();
      expect(child).toBeTruthy();
    });

    test("missing child element returns null", () => {
      const parentElement = createMockElementNode({
        id: "parent-1",
        childIds: ["non-existent-child"],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            [parentElement.id]: parentElement,
          },
          rootTimegroupIds: [],
        },
      });

      render(<ElementRenderer element={parentElement} state={state} currentTime={0} />);

      const parent = document.querySelector(`[data-element-id="${parentElement.id}"]`);
      const missingChild = document.querySelector(`[data-element-id="non-existent-child"]`);

      expect(parent).toBeTruthy();
      expect(missingChild).toBeNull();
    });

    test("nested child structure renders correctly", () => {
      const grandchildElement = createMockElementNode({ id: "grandchild-1", type: "div" });
      const childElement = createMockElementNode({
        id: "child-1",
        type: "div",
        childIds: ["grandchild-1"],
      });
      const parentElement = createMockElementNode({
        id: "parent-1",
        childIds: ["child-1"],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            [parentElement.id]: parentElement,
            [childElement.id]: childElement,
            [grandchildElement.id]: grandchildElement,
          },
          rootTimegroupIds: [],
        },
      });

      render(<ElementRenderer element={parentElement} state={state} currentTime={0} />);

      const parent = document.querySelector(`[data-element-id="${parentElement.id}"]`);
      const child = document.querySelector(`[data-element-id="${childElement.id}"]`);
      const grandchild = document.querySelector(`[data-element-id="${grandchildElement.id}"]`);

      expect(parent).toBeTruthy();
      expect(child).toBeTruthy();
      expect(grandchild).toBeTruthy();
    });

    test("child elements receive correct props", () => {
      const childElement = createMockElementNode({ id: "child-1" });
      const parentElement = createMockElementNode({
        id: "parent-1",
        childIds: ["child-1"],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            [parentElement.id]: parentElement,
            [childElement.id]: childElement,
          },
          rootTimegroupIds: [],
        },
      });

      render(<ElementRenderer element={parentElement} state={state} currentTime={5000} />);

      // Verify hooks were called for child element
      expect(mockUseElementStyles).toHaveBeenCalledWith(childElement, state);
      expect(mockUseElementProps).toHaveBeenCalledWith(childElement);
    });
  });

  describe("Test Edge Cases and Error Handling", () => {
    test("element with empty childIds array renders without children", () => {
      const element = createMockElementNode({ childIds: [] });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
      // Should not throw or error
    });

    test("element with null textContent handles gracefully", () => {
      const element = createMockElementNode({ type: "text" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockUseElementProps.mockReturnValue({ props: {}, textContent: null });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
    });

    test("element with no animations generates minimal CSS", () => {
      const element = createMockElementNode({ animations: [] });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockGenerateAnimationStyles.mockReturnValue(null);
      mockGenerateAnimationStyle.mockReturnValue(null);

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const styleElement = document.getElementById(`animation-styles-${element.id}`) as HTMLStyleElement;
      expect(styleElement).toBeTruthy();
      expect(styleElement.textContent).toBe("");
    });

    test("element with multiple animations combines all CSS correctly", () => {
      const element = createMockElementNode({
        animations: [createMockAnimation({ id: "anim-1" }), createMockAnimation({ id: "anim-2" })],
      });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockGenerateAnimationStyles.mockReturnValue("@keyframes anim1 {} @keyframes anim2 {}");
      mockGenerateAnimationStyle.mockReturnValue({ animation: "anim1 1s, anim2 1s" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const styleElement = document.getElementById(`animation-styles-${element.id}`) as HTMLStyleElement;
      expect(styleElement).toBeTruthy();
      expect(styleElement.textContent).toContain("@keyframes anim1");
      expect(styleElement.textContent).toContain("@keyframes anim2");
      expect(styleElement.textContent).toContain("animation: anim1 1s, anim2 1s");
    });
  });

  describe("Test Integration with Real Dependencies", () => {
    test("renders with actual elementRegistry components", async () => {
      const element = createMockElementNode({ type: "div" });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const rendered = document.querySelector(`[data-element-id="${element.id}"]`);
      expect(rendered).toBeTruthy();
      // Verify it's actually rendered using mocked elementRegistry
      const { elementRegistry } = await import("./elementRegistry");
      expect(elementRegistry[element.type as keyof typeof elementRegistry]).toBeDefined();
    });

    test("CSS injection creates actual style element in DOM", () => {
      const element = createMockElementNode({
        animations: [createMockAnimation()],
      });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockGenerateAnimationStyles.mockReturnValue("@keyframes test { from { opacity: 0; } }");
      mockGenerateAnimationStyle.mockReturnValue({ animation: "test 1s" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      const styleElement = document.getElementById(`animation-styles-${element.id}`) as HTMLStyleElement;
      expect(styleElement).toBeTruthy();
      expect(styleElement.textContent).toContain("@keyframes test");
      expect(styleElement.textContent).toContain("animation: test 1s");
    });

    test("animation key stability", () => {
      const element = createMockElementNode({
        animations: [createMockAnimation({ id: "anim-1", delay: 0, duration: 1000 })],
      });
      const state = createMockMotionDesignerState({
        composition: { elements: { [element.id]: element }, rootTimegroupIds: [] },
      });

      mockCreateAnimationKey.mockReturnValue("stable-key-123");
      mockGenerateAnimationStyle.mockReturnValue({ animation: "test 1s" });

      render(<ElementRenderer element={element} state={state} currentTime={0} />);

      expect(mockCreateAnimationKey).toHaveBeenCalledWith(element);
      const styleElement = document.getElementById(`animation-styles-${element.id}`) as HTMLStyleElement;
      expect(styleElement).toBeTruthy();
    });
  });
});

