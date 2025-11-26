import { describe, test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HierarchyItem } from "./HierarchyItem";
import type {
  MotionDesignerState,
  ElementNode,
} from "~/lib/motion-designer/types";
import { DragProvider } from "./DragContext";
import { MotionDesignerProvider } from "../context/MotionDesignerContext";
import type { DropTarget } from "./dropTargetResolver";

function createElement(
  id: string,
  type: string,
  childIds: string[] = [],
  props: Record<string, any> = {},
  animations: any[] = [],
): ElementNode {
  return {
    id,
    type,
    childIds,
    animations,
    props,
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

const mockRegisterElementRef = () => {};
const mockUnregisterElementRef = () => {};

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

describe("HierarchyItem drop indicators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("drop indicator appears above element when dropPosition is 'before'", () => {
    const div1 = createElement("div1", "div");
    const state = createState([div1], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "div1", position: "before" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const indicators = container.querySelectorAll('[class*="bg-blue-500"]');
    expect(indicators.length).toBeGreaterThan(0);
  });

  test("drop indicator appears below element when dropPosition is 'after'", () => {
    const div1 = createElement("div1", "div");
    const state = createState([div1], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "div1", position: "after" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const indicators = container.querySelectorAll('[class*="bg-blue-500"]');
    expect(indicators.length).toBeGreaterThan(0);
  });

  test("element highlights when dropPosition is 'inside'", () => {
    const div1 = createElement("div1", "div");
    const state = createState([div1], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "div1", position: "inside" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const element = container.querySelector('[style*="padding-left"]');
    expect(element).toBeTruthy();
    const classes = element?.className || "";
    expect(classes).toContain("bg-blue-500/30");
    expect(classes).toContain("border-l-4");
  });

  test("no drop indicators appear when dropTarget is null", () => {
    const div1 = createElement("div1", "div");
    const state = createState([div1], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const element = container.querySelector('[style*="padding-left"]');
    const classes = element?.className || "";
    expect(classes).not.toContain("bg-blue-500/30");
    expect(classes).not.toContain("border-l-4");
  });

  test("drop indicators only appear for matching elementId", () => {
    const div1 = createElement("div1", "div");
    const div2 = createElement("div2", "div");
    const state = createState([div1, div2], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "div2", position: "inside" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={div1}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const element = container.querySelector('[style*="padding-left"]');
    const classes = element?.className || "";
    expect(classes).not.toContain("bg-blue-500/30");
  });

  test("drop indicators appear for nested elements", () => {
    const parent = createElement("parent", "div", ["child"]);
    const child = createElement("child", "div");
    const state = createState([parent, child], ["tg1"]);
    const dropTarget: DropTarget = { elementId: "child", position: "inside" };

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={parent}
            state={state}
            depth={0}
            dropTarget={dropTarget}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const childElement = container.querySelector(
      '[style*="padding-left: 24px"]',
    );
    expect(childElement).toBeTruthy();
    const classes = childElement?.className || "";
    expect(classes).toContain("bg-blue-500/30");
  });
});

describe("HierarchyItem display and renaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("text nodes display content", () => {
    const textElement = createElement("text1", "text", [], {
      content: "Hello World",
    });
    const state = createState([textElement], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={textElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    expect(screen.getByText("Hello World")).toBeTruthy();
  });

  test("text nodes display fallback when content is empty", () => {
    const textElement = createElement("text1", "text", [], { content: "" });
    const state = createState([textElement], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={textElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    expect(screen.getByText("text")).toBeTruthy();
  });

  test("non-text nodes display name when set", () => {
    const divElement = createElement("div1", "div", [], {
      name: "My Container",
    });
    const state = createState([divElement], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={divElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    expect(screen.getByText("My Container")).toBeTruthy();
  });

  test("non-text nodes display type when name is not set", () => {
    const divElement = createElement("div1", "div", [], {});
    const state = createState([divElement], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={divElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    expect(screen.getByText("div")).toBeTruthy();
  });

  test("root timegroups display 'Root Timegroup' when no name is set", () => {
    const timegroup = createElement("tg1", "timegroup", [], {});
    const state = createState([timegroup], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={timegroup}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    expect(screen.getByText("Root Timegroup")).toBeTruthy();
  });

  test("double-click enters rename mode", async () => {
    const user = userEvent.setup();
    const divElement = createElement("div1", "div", [], {
      name: "Original Name",
    });
    const state = createState([divElement], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={divElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const item = container.querySelector('[style*="padding-left"]');
    expect(item).toBeTruthy();

    await user.dblClick(item!);

    const input = container.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("Original Name");
  });

  test("text nodes cannot be renamed", async () => {
    const user = userEvent.setup();
    const textElement = createElement("text1", "text", [], {
      content: "Hello",
    });
    const state = createState([textElement], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={textElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const item = container.querySelector('[style*="padding-left"]');
    expect(item).toBeTruthy();

    await user.dblClick(item!);

    const input = container.querySelector('input[type="text"]');
    expect(input).toBeFalsy();
  });

  test("Enter key saves rename", async () => {
    const user = userEvent.setup();
    const divElement = createElement("div1", "div", [], { name: "Original" });
    const state = createState([divElement], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={divElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const item = container.querySelector('[style*="padding-left"]');
    await user.dblClick(item!);

    const input = container.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "New Name");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockActions.updateElement).toHaveBeenCalledWith("div1", {
        name: "New Name",
      });
    });
  });

  test("Escape key cancels rename", async () => {
    const user = userEvent.setup();
    const divElement = createElement("div1", "div", [], { name: "Original" });
    const state = createState([divElement], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={divElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const item = container.querySelector('[style*="padding-left"]');
    await user.dblClick(item!);

    const input = container.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Changed");
    await user.keyboard("{Escape}");

    await waitFor(() => {
      const inputAfter = container.querySelector('input[type="text"]');
      expect(inputAfter).toBeFalsy();
    });

    expect(mockActions.updateElement).not.toHaveBeenCalled();
  });

  test("animation indicator appears when animations exist", () => {
    const divElement = createElement("div1", "div", [], {}, [
      {
        id: "anim1",
        property: "opacity",
        fromValue: "0",
        toValue: "1",
        duration: 1000,
        delay: 0,
        easing: "linear",
        fillMode: "forwards",
        name: "Fade",
      },
    ]);
    const state = createState([divElement], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={divElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const animationIcon = container.querySelector(
      'svg[class*="text-yellow-400"]',
    );
    expect(animationIcon).toBeTruthy();
  });

  test("animation indicator does not appear when no animations", () => {
    const divElement = createElement("div1", "div", [], {});
    const state = createState([divElement], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={divElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const sparkleIcons = container.querySelectorAll(
      'svg[class*="text-yellow-400"]',
    );
    expect(sparkleIcons.length).toBe(0);
  });

  test("media elements display filename from URL as primary text", () => {
    const videoElement = createElement("video1", "video", [], {
      src: "https://example.com/video.mp4",
    });
    const state = createState([videoElement], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={videoElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const filename = screen.getByText("video.mp4");
    expect(filename).toBeTruthy();
    expect(filename.className).toContain("text-sm");
  });

  test("media elements display type when no URL", () => {
    const videoElement = createElement("video1", "video", [], {});
    const state = createState([videoElement], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={videoElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    expect(screen.getByText("video")).toBeTruthy();
  });

  test("targeted elements display target reference", () => {
    const targetElement = createElement("audio1", "audio", [], {
      name: "Background Music",
    });
    const waveformElement = createElement("waveform1", "waveform", [], {
      target: "audio1",
    });
    const state = createState([targetElement, waveformElement], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={waveformElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    expect(screen.getByText("→ Background Music")).toBeTruthy();
  });

  test("targeted elements display target ID when target has no name", () => {
    const targetElement = createElement("audio1", "audio", [], {});
    const waveformElement = createElement("waveform1", "waveform", [], {
      target: "audio1",
    });
    const state = createState([targetElement, waveformElement], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={waveformElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    expect(screen.getByText("→ audio1")).toBeTruthy();
  });

  test("targeted elements with text target display target content", () => {
    const targetElement = createElement("text1", "text", [], {
      content: "Hello",
    });
    const waveformElement = createElement("waveform1", "waveform", [], {
      target: "text1",
    });
    const state = createState([targetElement, waveformElement], ["tg1"]);

    render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={waveformElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    expect(screen.getByText("→ Hello")).toBeTruthy();
  });

  test("cross-highlight triggers on hover for targeted elements", () => {
    const targetElement = createElement("audio1", "audio", [], {});
    const waveformElement = createElement("waveform1", "waveform", [], {
      target: "audio1",
    });
    const state = createState([targetElement, waveformElement], ["tg1"]);
    const onHighlightChange = vi.fn();

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={waveformElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
            onHighlightChange={onHighlightChange}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const item = container.querySelector('[style*="padding-left"]');
    fireEvent.mouseEnter(item!);

    expect(onHighlightChange).toHaveBeenCalledWith("audio1");
  });

  test("cross-highlight clears on mouse leave", () => {
    const targetElement = createElement("audio1", "audio", [], {});
    const waveformElement = createElement("waveform1", "waveform", [], {
      target: "audio1",
    });
    const state = createState([targetElement, waveformElement], ["tg1"]);
    const onHighlightChange = vi.fn();

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={waveformElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
            onHighlightChange={onHighlightChange}
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const item = container.querySelector('[style*="padding-left"]');
    fireEvent.mouseEnter(item!);
    fireEvent.mouseLeave(item!);

    expect(onHighlightChange).toHaveBeenCalledWith(null);
  });

  test("highlighted element shows highlight styling", () => {
    const divElement = createElement("div1", "div", [], {});
    const state = createState([divElement], ["tg1"]);

    const { container } = render(
      <MotionDesignerProvider actions={mockActions}>
        <DragProvider>
          <HierarchyItem
            element={divElement}
            state={state}
            depth={0}
            dropTarget={null}
            registerElementRef={mockRegisterElementRef}
            unregisterElementRef={mockUnregisterElementRef}
            highlightedElementId="div1"
          />
        </DragProvider>
      </MotionDesignerProvider>,
    );

    const item = container.querySelector('[style*="padding-left"]');
    const classes = item?.className || "";
    expect(classes).toContain("bg-blue-500/20");
    expect(classes).toContain("border-l-2");
  });
});
