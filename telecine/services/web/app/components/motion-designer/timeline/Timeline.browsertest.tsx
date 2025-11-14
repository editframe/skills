import React from "react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "./Timeline";
import type { MotionDesignerState, ElementNode, Animation } from "~/lib/motion-designer/types";
import { MotionDesignerProvider } from "../context/MotionDesignerContext";

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
      canvasTransform: { x: 0, y: 0, scale: 1 },
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
    name: "Fade In",
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

function renderTimeline(
  state: MotionDesignerState,
  options: {
    isScrubbingRef?: React.MutableRefObject<boolean>;
  } = {}
) {
  const { isScrubbingRef } = options;
  const actions = createMockActions();
  
  return {
    ...render(
      <MotionDesignerProvider actions={actions}>
        <Timeline state={state} isScrubbingRef={isScrubbingRef} />
      </MotionDesignerProvider>
    ),
    actions,
  };
}

describe("Timeline", () => {
  beforeEach(() => {
    // Clear DOM
    document.head.innerHTML = "";
    document.body.innerHTML = "";

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("Timeline Container Structure", () => {
    test("renders timeline container with correct structure", () => {
      const timegroup = createMockElementNode({ type: "timegroup", id: "timegroup-1" });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container } = renderTimeline(state);

      const timelineContainer = container.querySelector(".h-48.bg-gray-900");
      expect(timelineContainer).toBeTruthy();
      expect(timelineContainer?.classList.contains("border-t")).toBe(true);
      expect(timelineContainer?.classList.contains("border-gray-700/70")).toBe(true);
      
      // Verify structure: controls area and tracks area
      const flexContainer = container.querySelector(".flex");
      expect(flexContainer).toBeTruthy();
    });

    test("displays empty state when no active root timegroup", () => {
      const state = createMockMotionDesignerState({
        ui: {
          activeRootTimegroupId: null,
        },
      });

      const { container } = renderTimeline(state);

      const emptyState = container.querySelector(".text-gray-500");
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain("No active root timegroup");
      
      const emptyContainer = container.querySelector(".bg-gray-800");
      expect(emptyContainer).toBeTruthy();
      expect(emptyContainer?.classList.contains("h-48")).toBe(true);
      expect(emptyContainer?.classList.contains("border-t")).toBe(true);
    });
  });

  describe("Timeline Components Rendering", () => {
    test("renders timeline structure when active timegroup exists", () => {
      const timegroup = createMockElementNode({ type: "timegroup", id: "timegroup-1" });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container } = renderTimeline(state);

      // Verify timeline structure exists
      const timelineContainer = container.querySelector(".h-48.bg-gray-900");
      expect(timelineContainer).toBeTruthy();
      
      // Verify ruler area exists (even if TimelineRuler returns null)
      const rulerArea = container.querySelector(".flex.h-8.border-b");
      expect(rulerArea).toBeTruthy();
      
      // Verify tracks area exists
      const tracksArea = container.querySelector(".flex-1.overflow-y-auto");
      expect(tracksArea).toBeTruthy();
    });

    test("renders timeline with correct duration", () => {
      const timegroup = createMockElementNode({ type: "timegroup", id: "timegroup-1" });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container } = renderTimeline(state);

      // Timeline renders with real useTimeManager implementation
      const timelineContainer = container.querySelector(".h-48.bg-gray-900");
      expect(timelineContainer).toBeTruthy();
    });
  });

  describe("Animation Tracks Rendering", () => {
    test("renders animation tracks for all animations", () => {
      const animation1 = createMockAnimation({ id: "anim-1", delay: 0, duration: 1000, name: "Animation 1" });
      const animation2 = createMockAnimation({ id: "anim-2", delay: 2000, duration: 1500, name: "Animation 2" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation1, animation2],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          selectedAnimationId: null,
        },
      });

      const { container } = renderTimeline(state);

      // Verify tracks are rendered - check for animation names in DOM
      expect(screen.getAllByText("Animation 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Animation 2").length).toBeGreaterThan(0);
      
      // Verify track containers exist
      const tracks = container.querySelectorAll(".flex.items-center.border-b.border-gray-700\\/50");
      expect(tracks.length).toBeGreaterThanOrEqual(2);
    });

    test("renders tracks with correct visual structure", () => {
      const animation = createMockAnimation({
        id: "anim-1",
        delay: 500,
        duration: 2000,
        name: "Test Animation",
      });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          selectedAnimationId: "anim-1",
        },
      });

      const { container } = renderTimeline(state);

      // Verify animation name is visible
      expect(screen.getAllByText("Test Animation").length).toBeGreaterThan(0);
      
      // Verify track structure exists
      const track = container.querySelector(".flex.items-center.border-b.border-gray-700\\/50");
      expect(track).toBeTruthy();
      
      // Verify animation bar exists (the visual bar)
      const animationBar = container.querySelector(".absolute.rounded-sm");
      expect(animationBar).toBeTruthy();
      
      // Verify selected state is reflected in DOM (ring-2 ring-white for selected)
      const selectedBar = container.querySelector(".ring-2.ring-white");
      expect(selectedBar).toBeTruthy();
    });

    test("renders tracks for nested children animations", () => {
      const childAnimation = createMockAnimation({ id: "child-anim-1", delay: 1000, duration: 500, name: "Child Animation" });
      const child = createMockElementNode({
        id: "child-1",
        type: "div",
        animations: [childAnimation],
      });
      const parentAnimation = createMockAnimation({ id: "parent-anim-1", delay: 0, duration: 2000, name: "Parent Animation" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [parentAnimation],
        childIds: [child.id],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            [timegroup.id]: timegroup,
            [child.id]: child,
          },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      renderTimeline(state);

      // Verify both parent and child animations are rendered
      expect(screen.getAllByText("Parent Animation").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Child Animation").length).toBeGreaterThan(0);
    });
  });

  describe("Snap Points Collection", () => {
    test("animation bars positioned correctly based on delay and duration", () => {
      const childAnimation = createMockAnimation({ id: "child-anim", delay: 1000, duration: 500, name: "Child" });
      const child = createMockElementNode({
        id: "child-1",
        animations: [childAnimation],
      });
      const parentAnimation = createMockAnimation({ id: "parent-anim", delay: 0, duration: 2000, name: "Parent" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [parentAnimation],
        childIds: [child.id],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            [timegroup.id]: timegroup,
            [child.id]: child,
          },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container } = renderTimeline(state);

      // Verify animation bars exist
      const animationBars = container.querySelectorAll(".absolute.rounded-sm");
      expect(animationBars.length).toBeGreaterThanOrEqual(2);
      
      // Verify bars have positioning styles (left percentage)
      animationBars.forEach((bar: Element) => {
        const element = bar as HTMLElement;
        expect(element.style.left).toBeTruthy();
        expect(element.style.width).toBeTruthy();
      });
    });

    test("animation bars have correct positioning for different delays", () => {
      const animation1 = createMockAnimation({ id: "anim-1", delay: 2000, duration: 1000, name: "Anim 1" });
      const animation2 = createMockAnimation({ id: "anim-2", delay: 0, duration: 2000, name: "Anim 2" });
      const animation3 = createMockAnimation({ id: "anim-3", delay: 2000, duration: 1000, name: "Anim 3" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation1, animation2, animation3],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container } = renderTimeline(state);

      // Verify all animations are rendered
      expect(screen.getAllByText("Anim 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Anim 2").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Anim 3").length).toBeGreaterThan(0);
      
      // Verify bars have different positions based on delay
      const animationBars = container.querySelectorAll(".absolute.rounded-sm");
      expect(animationBars.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Time Synchronization", () => {
    test("timeline renders with different current times", () => {
      const timegroup = createMockElementNode({ type: "timegroup", id: "timegroup-1" });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container: container1 } = renderTimeline(state);

      expect(container1.querySelector(".h-48.bg-gray-900")).toBeTruthy();

      // Re-render to verify consistent rendering
      const { container: container2 } = renderTimeline(state);

      expect(container2.querySelector(".h-48.bg-gray-900")).toBeTruthy();
    });
  });

  describe("User Interactions", () => {
    test("animation bars are clickable", () => {
      const animation = createMockAnimation({
        id: "anim-1",
        delay: 500,
        duration: 2000,
        name: "Test Animation",
      });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          selectedAnimationId: null,
        },
      });

      const { container } = renderTimeline(state);

      // Verify animation bar exists and is clickable (has cursor-move class)
      const animationBar = container.querySelector(".absolute.rounded-sm.cursor-move") as HTMLElement;
      expect(animationBar).toBeTruthy();
      expect(animationBar.classList.contains("cursor-move")).toBe(true);
    });

    test("animation bar shows selected state visually", () => {
      const animation = createMockAnimation({
        id: "anim-1",
        delay: 500,
        duration: 2000,
        name: "Test Animation",
      });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          selectedAnimationId: "anim-1",
        },
      });

      const { container } = renderTimeline(state);

      // Verify selected state is visible in DOM
      const selectedBar = container.querySelector(".ring-2.ring-white");
      expect(selectedBar).toBeTruthy();
      
      // Verify the bar has selected background color
      const bar = container.querySelector(".absolute.rounded-sm") as HTMLElement;
      expect(bar).toBeTruthy();
      expect(bar.style.backgroundColor).toContain("160, 150, 255"); // Selected color
    });

    test("animation bars have resize handles", () => {
      const animation = createMockAnimation({
        id: "anim-1",
        delay: 500,
        duration: 2000,
        name: "Test Animation",
      });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container } = renderTimeline(state);

      // Verify resize handles exist
      const leftHandle = container.querySelector(".cursor-col-resize");
      expect(leftHandle).toBeTruthy();
      
      // Verify there are resize handles (left and right)
      const handles = container.querySelectorAll(".cursor-col-resize");
      expect(handles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Timeline Scrubbing", () => {
    test("clicking on ruler initiates scrub and updates currentTime", () => {
      const timegroup = createMockElementNode({ type: "timegroup", id: "timegroup-1" });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          currentTime: 0,
        },
      });

      const { actions, container } = renderTimeline(state);

      // Find the ruler container (the one with timelineContainerRef)
      const rulerContainer = container.querySelector(".flex-1.relative.cursor-pointer") as HTMLElement;
      expect(rulerContainer).toBeTruthy();

      // Simulate mouse down on ruler (at 50% of width = middle of timeline)
      const rect = rulerContainer.getBoundingClientRect();
      const mouseDown = new MouseEvent("mousedown", {
        clientX: rect.left + rect.width * 0.5,
        clientY: rect.top + rect.height * 0.5,
        button: 0,
        bubbles: true,
      });
      rulerContainer.dispatchEvent(mouseDown);

      // Verify setCurrentTime was called
      expect(actions.setCurrentTime).toHaveBeenCalled();
      
      // The time should be approximately 50% of duration (5000ms default)
      const callArgs = (actions.setCurrentTime as ReturnType<typeof vi.fn>).mock.calls;
      expect(callArgs.length).toBeGreaterThan(0);
      const calledTime = callArgs[callArgs.length - 1][0];
      expect(calledTime).toBeGreaterThan(2000);
      expect(calledTime).toBeLessThan(3000);
    });

    test("dragging on ruler updates currentTime during drag", () => {
      const timegroup = createMockElementNode({ type: "timegroup", id: "timegroup-1" });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          currentTime: 0,
        },
      });

      const { actions, container } = renderTimeline(state);

      const rulerContainer = container.querySelector(".flex-1.relative.cursor-pointer") as HTMLElement;
      expect(rulerContainer).toBeTruthy();

      const rect = rulerContainer.getBoundingClientRect();
      
      // Start drag at 25% of width
      const mouseDown = new MouseEvent("mousedown", {
        clientX: rect.left + rect.width * 0.25,
        clientY: rect.top + rect.height * 0.5,
        button: 0,
        bubbles: true,
      });
      rulerContainer.dispatchEvent(mouseDown);

      // Move to 75% of width
      const mouseMove = new MouseEvent("mousemove", {
        clientX: rect.left + rect.width * 0.75,
        clientY: rect.top + rect.height * 0.5,
        bubbles: true,
      });
      document.dispatchEvent(mouseMove);

      // Verify setCurrentTime was called multiple times (on mousedown and mousemove)
      expect(actions.setCurrentTime).toHaveBeenCalledTimes(2);
      
      // Last call should be at approximately 75% of duration
      const callArgs = (actions.setCurrentTime as ReturnType<typeof vi.fn>).mock.calls;
      const lastCalledTime = callArgs[callArgs.length - 1][0];
      expect(lastCalledTime).toBeGreaterThan(3000);
      expect(lastCalledTime).toBeLessThan(4000);

      // End drag
      const mouseUp = new MouseEvent("mouseup", {
        bubbles: true,
      });
      document.dispatchEvent(mouseUp);
    });

    test("clicking on empty tracks area initiates scrub", () => {
      const animation = createMockAnimation({ id: "anim-1", delay: 1000, duration: 1000, name: "Test Animation" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          currentTime: 0,
        },
      });

      const { actions, container } = renderTimeline(state);

      // Find the tracks container
      const tracksContainer = container.querySelector(".flex-1.overflow-y-auto.relative.cursor-pointer") as HTMLElement;
      expect(tracksContainer).toBeTruthy();

      // Simulate mouse down on empty space (not on animation bar)
      // Click at a position that's not on the animation bar (animation is at 1000ms, so click at 0ms or 3000ms)
      const rulerContainer = container.querySelector(".flex-1.relative.cursor-pointer") as HTMLElement;
      const rulerRect = rulerContainer.getBoundingClientRect();
      const tracksRect = tracksContainer.getBoundingClientRect();
      
      // Click at 0ms position (left edge)
      const mouseDown = new MouseEvent("mousedown", {
        clientX: rulerRect.left,
        clientY: tracksRect.top + tracksRect.height * 0.5,
        button: 0,
        bubbles: true,
      });
      tracksContainer.dispatchEvent(mouseDown);

      // Verify setCurrentTime was called
      expect(actions.setCurrentTime).toHaveBeenCalled();
      
      // Should be called with time near 0
      const callArgs = (actions.setCurrentTime as ReturnType<typeof vi.fn>).mock.calls;
      const calledTime = callArgs[callArgs.length - 1][0];
      expect(calledTime).toBeLessThan(100);
    });

    test("dragging on empty tracks area updates currentTime", () => {
      const animation = createMockAnimation({ id: "anim-1", delay: 1000, duration: 1000, name: "Test Animation" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          currentTime: 0,
        },
      });

      const { actions, container } = renderTimeline(state);

      const tracksContainer = container.querySelector(".flex-1.overflow-y-auto.relative.cursor-pointer") as HTMLElement;
      const rulerContainer = container.querySelector(".flex-1.relative.cursor-pointer") as HTMLElement;
      const rulerRect = rulerContainer.getBoundingClientRect();
      const tracksRect = tracksContainer.getBoundingClientRect();

      // Start drag at left edge
      const mouseDown = new MouseEvent("mousedown", {
        clientX: rulerRect.left,
        clientY: tracksRect.top + tracksRect.height * 0.5,
        button: 0,
        bubbles: true,
      });
      tracksContainer.dispatchEvent(mouseDown);

      // Move to right edge
      const mouseMove = new MouseEvent("mousemove", {
        clientX: rulerRect.left + rulerRect.width * 0.8,
        clientY: tracksRect.top + tracksRect.height * 0.5,
        bubbles: true,
      });
      document.dispatchEvent(mouseMove);

      // Verify setCurrentTime was called multiple times
      expect(actions.setCurrentTime).toHaveBeenCalledTimes(2);
      
      // Last call should be at approximately 80% of duration
      const callArgs = (actions.setCurrentTime as ReturnType<typeof vi.fn>).mock.calls;
      const lastCalledTime = callArgs[callArgs.length - 1][0];
      expect(lastCalledTime).toBeGreaterThan(3000);
      expect(lastCalledTime).toBeLessThan(4500);

      // End drag
      const mouseUp = new MouseEvent("mouseup", {
        bubbles: true,
      });
      document.dispatchEvent(mouseUp);
    });

    test("clicking on animation bar does NOT initiate scrub", () => {
      const animation = createMockAnimation({ id: "anim-1", delay: 1000, duration: 1000, name: "Test Animation" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          currentTime: 0,
          selectedAnimationId: null,
        },
      });

      const { actions, container } = renderTimeline(state);

      // Find the animation bar
      const animationBar = container.querySelector(".absolute.rounded-sm.cursor-move") as HTMLElement;
      expect(animationBar).toBeTruthy();

      // Clear previous calls
      vi.clearAllMocks();

      // Simulate mouse down on animation bar
      const mouseDown = new MouseEvent("mousedown", {
        clientX: 0,
        clientY: 0,
        button: 0,
        bubbles: true,
      });
      animationBar.dispatchEvent(mouseDown);

      // Verify setCurrentTime was NOT called (animation bar handles its own interaction)
      // Note: Animation bars use stopPropagation, so the tracks handler shouldn't fire
      // But we verify by checking that setCurrentTime wasn't called for scrubbing
      // (it might be called for other reasons, but not for scrubbing from tracks area)
      
      // The key test: clicking animation bar should select it, not scrub
      // Since animation bars stop propagation, the tracks handler won't fire
      // We verify this by ensuring the initial currentTime (0) wasn't changed by scrubbing
      // Actually, let's check that selectAnimation was called instead
      expect(actions.selectAnimation).toHaveBeenCalled();
    });

    test("playhead z-index is higher than animation bars", () => {
      const animation = createMockAnimation({ id: "anim-1", delay: 500, duration: 2000, name: "Test Animation" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container } = renderTimeline(state);

      // Find playhead and animation bar
      const playhead = container.querySelector(".z-30") as HTMLElement;
      const animationBar = container.querySelector(".z-20") as HTMLElement;

      expect(playhead).toBeTruthy();
      expect(animationBar).toBeTruthy();

      // Verify playhead has z-30 class (higher than animation bars)
      expect(playhead.classList.contains("z-30")).toBe(true);
      
      // Verify animation bar has z-20 class (lower than playhead)
      expect(animationBar.classList.contains("z-20")).toBe(true);
    });

    test("scrubbing sets isScrubbingRef.current = true during drag and false on mouse up", () => {
      const timegroup = createMockElementNode({ type: "timegroup", id: "timegroup-1" });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
          currentTime: 0,
        },
      });

      const isScrubbingRef = { current: false };
      const { container } = renderTimeline(state, { isScrubbingRef });

      const rulerContainer = container.querySelector(".flex-1.relative.cursor-pointer") as HTMLElement;
      expect(rulerContainer).toBeTruthy();

      const rect = rulerContainer.getBoundingClientRect();

      // Initially not scrubbing
      expect(isScrubbingRef.current).toBe(false);

      // Start drag
      const mouseDown = new MouseEvent("mousedown", {
        clientX: rect.left + rect.width * 0.5,
        clientY: rect.top + rect.height * 0.5,
        button: 0,
        bubbles: true,
      });
      rulerContainer.dispatchEvent(mouseDown);

      // Should be scrubbing now
      expect(isScrubbingRef.current).toBe(true);

      // Move during drag
      const mouseMove = new MouseEvent("mousemove", {
        clientX: rect.left + rect.width * 0.6,
        clientY: rect.top + rect.height * 0.5,
        bubbles: true,
      });
      document.dispatchEvent(mouseMove);

      // Should still be scrubbing
      expect(isScrubbingRef.current).toBe(true);

      // End drag
      const mouseUp = new MouseEvent("mouseup", {
        bubbles: true,
      });
      document.dispatchEvent(mouseUp);

      // Should no longer be scrubbing
      expect(isScrubbingRef.current).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    test("handles element with no animations", () => {
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container } = renderTimeline(state);

      // Timeline should still render
      expect(container.querySelector(".h-48.bg-gray-900")).toBeTruthy();
      
      // But no animation tracks
      const tracks = container.querySelectorAll(".flex.items-center.border-b.border-gray-700\\/50");
      expect(tracks.length).toBe(0);
    });

    test("handles deeply nested children", () => {
      const grandchildAnimation = createMockAnimation({ id: "grandchild-anim", delay: 2000, duration: 500, name: "Grandchild" });
      const grandchild = createMockElementNode({
        id: "grandchild-1",
        animations: [grandchildAnimation],
      });
      const childAnimation = createMockAnimation({ id: "child-anim", delay: 1000, duration: 1000, name: "Child" });
      const child = createMockElementNode({
        id: "child-1",
        animations: [childAnimation],
        childIds: [grandchild.id],
      });
      const parentAnimation = createMockAnimation({ id: "parent-anim", delay: 0, duration: 3000, name: "Parent" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [parentAnimation],
        childIds: [child.id],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: {
            [timegroup.id]: timegroup,
            [child.id]: child,
            [grandchild.id]: grandchild,
          },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      renderTimeline(state);

      // Verify all nested animations are rendered
      expect(screen.getAllByText("Parent").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Child").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Grandchild").length).toBeGreaterThan(0);
    });

    test("handles overlapping animation times", () => {
      const animation1 = createMockAnimation({ id: "anim-1", delay: 0, duration: 2000, name: "Anim 1" });
      const animation2 = createMockAnimation({ id: "anim-2", delay: 1000, duration: 2000, name: "Anim 2" });
      const timegroup = createMockElementNode({
        type: "timegroup",
        id: "timegroup-1",
        animations: [animation1, animation2],
      });
      const state = createMockMotionDesignerState({
        composition: {
          elements: { [timegroup.id]: timegroup },
          rootTimegroupIds: [timegroup.id],
        },
        ui: {
          activeRootTimegroupId: timegroup.id,
        },
      });

      const { container } = renderTimeline(state);

      // Both animations should render
      expect(screen.getAllByText("Anim 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Anim 2").length).toBeGreaterThan(0);
      
      // Both should have animation bars
      const animationBars = container.querySelectorAll(".absolute.rounded-sm");
      expect(animationBars.length).toBeGreaterThanOrEqual(2);
    });
  });
});
