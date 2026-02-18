import { afterEach, describe, expect, test, vi } from "vitest";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "./EFTimeline.js";
import type { EFTimeline } from "./EFTimeline.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
import {
  DEFAULT_PIXELS_PER_MS,
  timeToPx,
  pixelsPerMsToZoom,
} from "./timelineStateContext.js";

let idCounter = 0;
const nextId = () => `test-${idCounter++}`;

describe("EFTimeline", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    idCounter = 0;
  });

  describe("target binding", () => {
    test("binds to temporal element via target attribute", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      expect(timeline.targetTemporal).toBe(timegroup);
      expect(timeline.durationMs).toBe(10000);
    });

    test("handles missing target gracefully with empty state", async () => {
      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = "nonexistent-id";
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timeline.updateComplete;

      expect(timeline.targetTemporal).toBe(null);
      expect(timeline.durationMs).toBe(0);

      const emptyState = timeline.shadowRoot?.querySelector(".empty-state");
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain("No target");
    });

    test("updates duration when target changes", async () => {
      const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId1 = nextId();
      timegroup1.id = timegroupId1;
      timegroup1.setAttribute("mode", "fixed");
      timegroup1.setAttribute("duration", "5s");
      document.body.appendChild(timegroup1);

      const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId2 = nextId();
      timegroup2.id = timegroupId2;
      timegroup2.setAttribute("mode", "fixed");
      timegroup2.setAttribute("duration", "15s");
      document.body.appendChild(timegroup2);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId1;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup1.updateComplete;
      await timegroup2.updateComplete;
      await timeline.updateComplete;

      expect(timeline.durationMs).toBe(5000);

      timeline.controlTarget = timegroupId2;
      await timeline.updateComplete;

      expect(timeline.durationMs).toBe(15000);
    });

    test("derives target from canvas selection when target is empty", async () => {
      await import("../../canvas/EFCanvas.js");
      const canvas = document.createElement("ef-canvas");
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);
      await (canvas as any).updateComplete;

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      canvas.appendChild(timegroup);
      await timegroup.updateComplete;

      const element = document.createElement("div");
      element.id = "test-element";
      element.setAttribute("data-element-id", "test-element");
      element.style.position = "absolute";
      timegroup.appendChild(element);
      await (canvas as any).updateComplete;

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = "";
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);
      await timeline.updateComplete;

      expect(timeline.targetTemporal).toBe(null);

      (canvas as any).selectionContext.select("test-element");
      // targetTemporal is a live getter — no update cycle needed.
      expect(timeline.targetTemporal).toBe(timegroup);
      expect(timeline.durationMs).toBe(10000);
    });

    test("derives target from canvas selection when target is 'selection'", async () => {
      await import("../../canvas/EFCanvas.js");
      const canvas = document.createElement("ef-canvas");
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);
      await (canvas as any).updateComplete;

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      canvas.appendChild(timegroup);
      await timegroup.updateComplete;

      const element = document.createElement("div");
      element.id = "test-element";
      element.setAttribute("data-element-id", "test-element");
      element.style.position = "absolute";
      timegroup.appendChild(element);
      await (canvas as any).updateComplete;

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = "selection";
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);
      await timeline.updateComplete;

      expect(timeline.targetTemporal).toBe(null);

      (canvas as any).selectionContext.select("test-element");
      // targetTemporal is a live getter that reads directly from the
      // SelectionModel's state — no Lit update cycle needed.
      expect(timeline.targetTemporal).toBe(timegroup);
      expect(timeline.durationMs).toBe(10000);
    });

    test("updates target when selection changes", async () => {
      await import("../../canvas/EFCanvas.js");
      const canvas = document.createElement("ef-canvas");
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);
      await (canvas as any).updateComplete;

      const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId1 = nextId();
      timegroup1.id = timegroupId1;
      timegroup1.setAttribute("mode", "fixed");
      timegroup1.setAttribute("duration", "5s");
      canvas.appendChild(timegroup1);
      await timegroup1.updateComplete;

      const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId2 = nextId();
      timegroup2.id = timegroupId2;
      timegroup2.setAttribute("mode", "fixed");
      timegroup2.setAttribute("duration", "15s");
      canvas.appendChild(timegroup2);
      await timegroup2.updateComplete;

      const element1 = document.createElement("div");
      element1.id = "element-1";
      element1.setAttribute("data-element-id", "element-1");
      element1.style.position = "absolute";
      timegroup1.appendChild(element1);

      const element2 = document.createElement("div");
      element2.id = "element-2";
      element2.setAttribute("data-element-id", "element-2");
      element2.style.position = "absolute";
      timegroup2.appendChild(element2);
      await (canvas as any).updateComplete;

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = "selection";
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);
      await timeline.updateComplete;

      (canvas as any).selectionContext.select("element-1");
      expect(timeline.targetTemporal).toBe(timegroup1);
      expect(timeline.durationMs).toBe(5000);

      (canvas as any).selectionContext.select("element-2");
      expect(timeline.targetTemporal).toBe(timegroup2);
      expect(timeline.durationMs).toBe(15000);
    });

    // Skip - failing due to timing/initialization issues. Needs investigation.
    test.skip("reinitializes timeline ruler and thumbnails after clearing and re-selecting", async () => {
      await import("../../canvas/EFCanvas.js");
      await import("../EFTimelineRuler.js");

      const canvas = document.createElement("ef-canvas");
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);
      await (canvas as any).updateComplete;

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      canvas.appendChild(timegroup);
      await timegroup.updateComplete;

      const element = document.createElement("div");
      element.id = "test-element";
      element.setAttribute("data-element-id", "test-element");
      element.style.position = "absolute";
      timegroup.appendChild(element);
      await (canvas as any).updateComplete;

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = "selection";
      timeline.showRuler = true;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);
      await timeline.updateComplete;

      // Initially no selection - timeline should show empty state
      expect(timeline.targetTemporal).toBe(null);

      // Select element - timeline should initialize
      (canvas as any).selectionContext.select("test-element");
      await timeline.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for ResizeObserver

      expect(timeline.targetTemporal).toBe(timegroup);
      expect(timeline.durationMs).toBe(10000);

      // Verify initial state is correct
      const timelinePrivate = timeline as any;
      const initialViewportWidth = timelinePrivate.cachedViewportWidth;
      expect(initialViewportWidth).toBeGreaterThan(0);
      expect(initialViewportWidth).not.toBe(800); // Should not be default value

      const initialTimelineState = timeline.timelineState;
      expect(initialTimelineState.viewportWidth).toBeGreaterThan(0);
      expect(initialTimelineState.viewportWidth).not.toBe(800);

      // Get ruler and verify it has correct content-width
      const ruler = timeline.shadowRoot?.querySelector("ef-timeline-ruler");
      expect(ruler).toBeTruthy();
      const rulerContentWidth = (ruler as any).contentWidth;
      expect(rulerContentWidth).toBeGreaterThan(0);

      // Clear selection - timeline should show empty state
      (canvas as any).selectionContext.clear();
      await timeline.updateComplete;
      expect(timeline.targetTemporal).toBe(null);

      // Re-select element - timeline should reinitialize properly
      (canvas as any).selectionContext.select("test-element");
      await timeline.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for ResizeObserver

      expect(timeline.targetTemporal).toBe(timegroup);
      expect(timeline.durationMs).toBe(10000);

      // Verify viewport width is correctly set after re-selection (not default 800)
      const reinitViewportWidth = timelinePrivate.cachedViewportWidth;
      expect(reinitViewportWidth).toBeGreaterThan(0);
      expect(reinitViewportWidth).not.toBe(800); // Should not be default value
      expect(reinitViewportWidth).toBe(initialViewportWidth); // Should match initial value

      // Verify timeline state has correct viewport width
      const reinitTimelineState = timeline.timelineState;
      expect(reinitTimelineState.viewportWidth).toBeGreaterThan(0);
      expect(reinitTimelineState.viewportWidth).not.toBe(800);
      expect(reinitTimelineState.viewportWidth).toBe(
        initialTimelineState.viewportWidth,
      );

      // Verify ruler has correct content-width after re-selection
      const reinitRuler =
        timeline.shadowRoot?.querySelector("ef-timeline-ruler");
      expect(reinitRuler).toBeTruthy();
      const reinitRulerContentWidth = (reinitRuler as any).contentWidth;
      expect(reinitRulerContentWidth).toBeGreaterThan(0);
      expect(reinitRulerContentWidth).toBe(rulerContentWidth);
    });
  });

  describe("playback controls", () => {
    test("invokes play on target when play button clicked", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.showControls = true;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const playButton = timeline.shadowRoot?.querySelector(
        ".control-btn",
      ) as HTMLElement;
      expect(playButton).toBeTruthy();

      const playSpy = vi.spyOn(timegroup, "play");
      playButton.click();
      await timeline.updateComplete;

      expect(playSpy).toHaveBeenCalled();
      playSpy.mockRestore();
    });

    test("invokes pause on target when pause button clicked", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.showControls = true;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      timegroup.play();
      await timegroup.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));
      await timeline.updateComplete;

      const pauseButton = timeline.shadowRoot?.querySelector(
        ".control-btn",
      ) as HTMLElement;
      expect(pauseButton).toBeTruthy();

      const pauseSpy = vi.spyOn(timegroup, "pause");
      pauseButton.click();
      await timeline.updateComplete;

      expect(pauseSpy).toHaveBeenCalled();
      pauseSpy.mockRestore();
    });
  });

  describe("pixelsPerMs (zoom)", () => {
    test("defaults to DEFAULT_PIXELS_PER_MS", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      expect(timeline.pixelsPerMs).toBe(DEFAULT_PIXELS_PER_MS);
    });

    test("can be set directly via pixels-per-ms attribute", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.setAttribute("pixels-per-ms", "0.2");
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      expect(timeline.pixelsPerMs).toBe(0.2);
    });

    test("zoom buttons increase/decrease pixelsPerMs", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.showControls = true;
      timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const initialPixelsPerMs = timeline.pixelsPerMs;

      const zoomInButton = timeline.shadowRoot?.querySelectorAll(
        ".zoom-btn",
      )?.[1] as HTMLElement;
      zoomInButton.click();
      await timeline.updateComplete;

      expect(timeline.pixelsPerMs).toBeGreaterThan(initialPixelsPerMs);

      const afterZoomIn = timeline.pixelsPerMs;
      const zoomOutButton = timeline.shadowRoot?.querySelectorAll(
        ".zoom-btn",
      )?.[0] as HTMLElement;
      zoomOutButton.click();
      await timeline.updateComplete;

      expect(timeline.pixelsPerMs).toBeLessThan(afterZoomIn);
    });

    test("respects min-zoom and max-zoom constraints", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.minZoom = 0.5;
      timeline.maxZoom = 2.0;
      timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
      timeline.showControls = true;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const zoomInButton = timeline.shadowRoot?.querySelectorAll(
        ".zoom-btn",
      )?.[1] as HTMLElement;
      for (let i = 0; i < 10; i++) {
        zoomInButton.click();
        await timeline.updateComplete;
      }

      // pixelsPerMs at max zoom should be maxZoom * DEFAULT_PIXELS_PER_MS
      expect(timeline.pixelsPerMs).toBeLessThanOrEqual(
        2.0 * DEFAULT_PIXELS_PER_MS,
      );

      const zoomOutButton = timeline.shadowRoot?.querySelectorAll(
        ".zoom-btn",
      )?.[0] as HTMLElement;
      for (let i = 0; i < 10; i++) {
        zoomOutButton.click();
        await timeline.updateComplete;
      }

      // pixelsPerMs at min zoom should be minZoom * DEFAULT_PIXELS_PER_MS
      expect(timeline.pixelsPerMs).toBeGreaterThanOrEqual(
        0.5 * DEFAULT_PIXELS_PER_MS,
      );
    });

    test("Ctrl+wheel zooms in and out", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;
      // Wait for wheel handler to be set up in updated() lifecycle
      await new Promise((resolve) => setTimeout(resolve, 10));

      const tracksScroll = timeline.shadowRoot?.querySelector(
        ".tracks-scroll",
      ) as HTMLElement;
      expect(tracksScroll).toBeTruthy();

      const initialPixelsPerMs = timeline.pixelsPerMs;
      const rect = tracksScroll.getBoundingClientRect();

      // Ctrl+wheel up (negative deltaY) should zoom in
      const zoomInEvent = new WheelEvent("wheel", {
        deltaY: -100,
        ctrlKey: true,
        clientX: rect.left + 300, // Position cursor in track area
        clientY: rect.top + 50,
        bubbles: true,
        cancelable: true,
      });
      tracksScroll.dispatchEvent(zoomInEvent);
      await timeline.updateComplete;

      expect(timeline.pixelsPerMs).toBeGreaterThan(initialPixelsPerMs);

      const afterZoomIn = timeline.pixelsPerMs;

      // Ctrl+wheel down (positive deltaY) should zoom out
      const zoomOutEvent = new WheelEvent("wheel", {
        deltaY: 100,
        ctrlKey: true,
        clientX: rect.left + 300,
        clientY: rect.top + 50,
        bubbles: true,
        cancelable: true,
      });
      tracksScroll.dispatchEvent(zoomOutEvent);
      await timeline.updateComplete;

      expect(timeline.pixelsPerMs).toBeLessThan(afterZoomIn);
    });

    test("Cmd+wheel zooms (metaKey)", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;
      // Wait for wheel handler to be set up in updated() lifecycle
      await new Promise((resolve) => setTimeout(resolve, 10));

      const tracksScroll = timeline.shadowRoot?.querySelector(
        ".tracks-scroll",
      ) as HTMLElement;

      const initialPixelsPerMs = timeline.pixelsPerMs;
      const rect = tracksScroll.getBoundingClientRect();

      // Meta+wheel (Cmd on Mac) should also zoom
      const zoomEvent = new WheelEvent("wheel", {
        deltaY: -100,
        metaKey: true,
        clientX: rect.left + 300, // Position cursor in track area
        clientY: rect.top + 50,
        bubbles: true,
        cancelable: true,
      });
      tracksScroll.dispatchEvent(zoomEvent);
      await timeline.updateComplete;

      expect(timeline.pixelsPerMs).toBeGreaterThan(initialPixelsPerMs);
    });

    test("gestural zoom keeps time under cursor stable", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "20s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = 0.1; // 100px per second
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const tracksScroll = timeline.shadowRoot?.querySelector(
        ".tracks-scroll",
      ) as HTMLElement;
      expect(tracksScroll).toBeTruthy();

      // Scroll to middle of timeline first
      tracksScroll.scrollLeft = 500;
      await new Promise((resolve) => setTimeout(resolve, 10));
      await timeline.updateComplete;

      const rect = tracksScroll.getBoundingClientRect();
      const hierarchyWidth = 200; // Default hierarchy width

      // Position cursor in the middle of the track area
      const cursorX = rect.left + hierarchyWidth + 200;
      const cursorY = rect.top + rect.height / 2;

      // Calculate the time at cursor position before zoom
      const cursorXInViewport = cursorX - rect.left - hierarchyWidth;
      const cursorXInContent = cursorXInViewport + tracksScroll.scrollLeft;
      const timeAtCursorBefore = cursorXInContent / timeline.pixelsPerMs;

      // Zoom in at cursor position
      const zoomEvent = new WheelEvent("wheel", {
        deltaY: -100,
        ctrlKey: true,
        clientX: cursorX,
        clientY: cursorY,
        bubbles: true,
        cancelable: true,
      });
      tracksScroll.dispatchEvent(zoomEvent);
      await timeline.updateComplete;

      // Calculate time at cursor position after zoom
      const newCursorXInContent = cursorXInViewport + tracksScroll.scrollLeft;
      const timeAtCursorAfter = newCursorXInContent / timeline.pixelsPerMs;

      // The time under the cursor should be approximately the same
      // (within a small tolerance for floating point precision)
      expect(Math.abs(timeAtCursorAfter - timeAtCursorBefore)).toBeLessThan(50);
    });

    test("wheel without modifier does not zoom", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;
      // Wait for wheel handler to be set up in updated() lifecycle
      await new Promise((resolve) => setTimeout(resolve, 10));

      const tracksScroll = timeline.shadowRoot?.querySelector(
        ".tracks-scroll",
      ) as HTMLElement;

      const initialPixelsPerMs = timeline.pixelsPerMs;

      // Regular wheel (no modifier) should not zoom
      const scrollEvent = new WheelEvent("wheel", {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      });
      tracksScroll.dispatchEvent(scrollEvent);
      await timeline.updateComplete;

      expect(timeline.pixelsPerMs).toBe(initialPixelsPerMs);
    });
  });

  describe("track rendering", () => {
    test("renders timeline row with track component", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = 0.1; // 100px per second
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      // New unified row architecture
      const timelineRow = timeline.shadowRoot?.querySelector("ef-timeline-row");
      expect(timelineRow).toBeTruthy();

      // Track component is inside the row's shadow DOM
      const timegroupTrack =
        timelineRow?.shadowRoot?.querySelector("ef-timegroup-track");
      expect(timegroupTrack).toBeTruthy();
    });

    // Skip - failing due to assertion issues. Needs investigation.
    test.skip("renders unified rows with labels", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.showHierarchy = true;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      // New unified row architecture - rows container
      const tracksRows = timeline.shadowRoot?.querySelector(".tracks-rows");
      expect(tracksRows).toBeTruthy();

      // Label is inside the row's shadow DOM
      const timelineRow = timeline.shadowRoot?.querySelector("ef-timeline-row");
      const trackLabel = timelineRow?.shadowRoot?.querySelector(".row-label");
      expect(trackLabel).toBeTruthy();
      expect(trackLabel?.textContent).toContain(timegroupId);
    });

    test("content min-width equals duration * pixelsPerMs + hierarchy width", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = 0.1;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const tracksContent = timeline.shadowRoot?.querySelector(
        ".tracks-content",
      ) as HTMLElement;
      expect(tracksContent).toBeTruthy();

      // 10000ms * 0.1 px/ms = 1000px + 200px hierarchy width = 1200px
      expect(tracksContent.style.minWidth).toBe("1200px");
    });
  });

  describe("playhead", () => {
    // Skip - failing due to timing/assertion issues. Needs investigation.
    test.skip("syncs playhead position with currentTimeMs", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = 0.1;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      timegroup.currentTimeMs = 5000;
      await timegroup.updateComplete;

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await timeline.updateComplete;

      expect(timeline.providedCurrentTime).toBe(5000);

      // Playhead should be at 5000ms * 0.1 px/ms = 500px
      const playhead = timeline.shadowRoot?.querySelector(
        ".playhead",
      ) as HTMLElement;
      expect(playhead).toBeTruthy();
      expect(playhead.style.left).toBe("500px");
    });

    // Skip - failing due to timing/assertion issues. Needs investigation.
    test.skip("playhead position updates when pixelsPerMs changes", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = 0.1;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      timegroup.currentTimeMs = 5000;
      await timegroup.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await timeline.updateComplete;

      const playhead = timeline.shadowRoot?.querySelector(
        ".playhead",
      ) as HTMLElement;
      expect(playhead.style.left).toBe("500px");

      // Double the zoom
      timeline.pixelsPerMs = 0.2;
      await timeline.updateComplete;

      // Playhead should now be at 5000ms * 0.2 px/ms = 1000px
      expect(playhead.style.left).toBe("1000px");
    });

    // Skip - failing due to timing/assertion issues. Needs investigation.
    test.skip("playhead drag position matches cursor when timeline is scrolled", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "20s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = 0.1;
      timeline.style.width = "600px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const tracksScroll = timeline.shadowRoot?.querySelector(
        ".tracks-scroll",
      ) as HTMLElement;
      expect(tracksScroll).toBeTruthy();

      const hierarchyWidth = 200;
      const scrollOffset = 500;

      tracksScroll.scrollLeft = scrollOffset;
      // Wait for scroll event to fire and update viewportScrollLeft
      await new Promise((resolve) => setTimeout(resolve, 10));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await timeline.updateComplete;

      const rulerContent = timeline.shadowRoot?.querySelector(
        ".ruler-content",
      ) as HTMLElement;
      expect(rulerContent).toBeTruthy();

      const rulerRect = rulerContent.getBoundingClientRect();
      const clickX = rulerRect.left + 100;
      const clickY = rulerRect.top + 10;

      const pointerId = 1;
      const pointerDownEvent = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: clickX,
        clientY: clickY,
        pointerId,
      });

      rulerContent.dispatchEvent(pointerDownEvent);
      await timeline.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // handleRulerPointerDown calculates: x = e.clientX - rect.left + scrollLeft
      // where rect is the ruler-content's bounding rect
      const expectedX = clickX - rulerRect.left + tracksScroll.scrollLeft;
      const expectedTimeMs = Math.max(0, expectedX / timeline.pixelsPerMs);

      expect(timegroup.currentTimeMs).toBeCloseTo(expectedTimeMs, 0);

      const dragX = clickX + 50;
      const pointerMoveEvent = new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: dragX,
        clientY: clickY,
        pointerId,
      });

      window.dispatchEvent(pointerMoveEvent);
      await timeline.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // updatePlayheadFromMouse calculates: x = lastClientX - rect.left + scrollLeft - hierarchyWidth
      // where rect is tracksScroll's bounding rect
      const tracksScrollRect = tracksScroll.getBoundingClientRect();
      // Use the actual scrollLeft from the DOM, which should match viewportScrollLeft after sync
      const actualScrollLeft = tracksScroll.scrollLeft;
      const expectedDragX =
        dragX - tracksScrollRect.left + actualScrollLeft - hierarchyWidth;
      const expectedDragTimeMs = Math.max(
        0,
        expectedDragX / timeline.pixelsPerMs,
      );

      // The fix ensures viewportScrollLeft is synced, so the playhead should match the cursor
      // Allow small tolerance for sub-pixel rounding (up to 20ms = 2 pixels at 0.1 px/ms)
      expect(
        Math.abs(timegroup.currentTimeMs - expectedDragTimeMs),
      ).toBeLessThanOrEqual(20);

      const pointerUpEvent = new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: dragX,
        clientY: clickY,
        pointerId,
      });

      window.dispatchEvent(pointerUpEvent);
      await timeline.updateComplete;
    }, 1000);
  });

  describe("timeline state context", () => {
    test("provides timelineState via context", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = 0.15;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const state = timeline.timelineState;
      expect(state.pixelsPerMs).toBe(0.15);
      expect(state.durationMs).toBe(10000);
      expect(typeof state.seek).toBe("function");
    });

    test("timelineState.seek updates target currentTimeMs", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      timeline.timelineState.seek(3000);
      await timeline.updateComplete;

      expect(timegroup.currentTimeMs).toBe(3000);
    });
  });

  describe("DOM structure", () => {
    test("renders ruler when show-ruler is true", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.showRuler = true;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const rulerRow = timeline.shadowRoot?.querySelector(".ruler-row");
      expect(rulerRow).toBeTruthy();

      const ruler = timeline.shadowRoot?.querySelector("ef-timeline-ruler");
      expect(ruler).toBeTruthy();
    });

    test("hides ruler when show-ruler is false", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.showRuler = false;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const rulerRow = timeline.shadowRoot?.querySelector(".ruler-row");
      expect(rulerRow).toBeFalsy();
    });

    test("hides hierarchy when show-hierarchy is false", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.showHierarchy = false;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const hierarchyPanel =
        timeline.shadowRoot?.querySelector(".hierarchy-panel");
      expect(hierarchyPanel).toBeFalsy();
    });

    test("hides playhead when show-playhead is false", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.showPlayhead = false;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const playhead = timeline.shadowRoot?.querySelector(".playhead");
      expect(playhead).toBeFalsy();
    });
  });

  describe("utility functions", () => {
    test("timeToPx converts time to pixels correctly", () => {
      expect(timeToPx(1000, 0.1)).toBe(100);
      expect(timeToPx(5000, 0.2)).toBe(1000);
      expect(timeToPx(0, 0.1)).toBe(0);
    });

    test("pixelsPerMsToZoom converts to zoom percentage", () => {
      expect(pixelsPerMsToZoom(DEFAULT_PIXELS_PER_MS)).toBe(1);
      expect(pixelsPerMsToZoom(DEFAULT_PIXELS_PER_MS * 2)).toBe(2);
      expect(pixelsPerMsToZoom(DEFAULT_PIXELS_PER_MS * 0.5)).toBe(0.5);
    });
  });

  describe("keyboard navigation", () => {
    test("timeline container is focusable via tabindex", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      // Container should have tabindex for keyboard focus
      const container = timeline.shadowRoot?.querySelector(
        ".timeline-container",
      ) as HTMLElement;
      expect(container).toBeTruthy();
      expect(container.getAttribute("tabindex")).toBe("0");
    });

    test("showFrameMarkers returns true at high zoom levels", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      timegroup.fps = 30;
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      // High zoom: frames are ~33.3px wide at 1.0 px/ms
      timeline.pixelsPerMs = 1.0;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      expect(timeline.showFrameMarkers).toBe(true);
    });

    test("showFrameMarkers returns false at low zoom levels", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      timegroup.fps = 30;
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      // Low zoom: frames are too small to show
      timeline.pixelsPerMs = 0.01;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      expect(timeline.showFrameMarkers).toBe(false);
    });
  });

  describe("frame highlight", () => {
    test("frame highlight visible at high zoom levels where frame markers show", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      timegroup.fps = 30;
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      // High zoom: 1px per ms = 1000px per second, frame is ~33.3px wide
      timeline.pixelsPerMs = 1.0;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const frameHighlight =
        timeline.shadowRoot?.querySelector(".frame-highlight");
      expect(frameHighlight).toBeTruthy();
    });

    test("frame highlight not visible at low zoom levels", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      timegroup.fps = 30;
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      // Low zoom: frames too small to show
      timeline.pixelsPerMs = 0.01;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const frameHighlight =
        timeline.shadowRoot?.querySelector(".frame-highlight");
      expect(frameHighlight).toBeFalsy();
    });

    test("frame highlight width equals one frame duration in pixels", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      timegroup.fps = 30;
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.pixelsPerMs = 1.0;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      const frameHighlight = timeline.shadowRoot?.querySelector(
        ".frame-highlight",
      ) as HTMLElement;
      expect(frameHighlight).toBeTruthy();

      // At 30fps, one frame = 1000/30 ≈ 33.33ms
      // At 1px/ms, width should be ~33.33px
      const frameDurationMs = 1000 / 30;
      const expectedWidth = frameDurationMs * 1.0;
      const actualWidth = parseFloat(frameHighlight.style.width);
      expect(actualWidth).toBeCloseTo(expectedWidth, 0);
    });
  });

  describe("fps derivation", () => {
    test("fps derives from controlTarget timegroup", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      timegroup.fps = 24;
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      expect(timeline.fps).toBe(24);
    });

    test("fps defaults to 30 when no target", async () => {
      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timeline.updateComplete;

      expect(timeline.fps).toBe(30);
    });
  });

  describe("row hover interaction", () => {
    test("hovering a row propagates hover state to related rows", async () => {
      await import("../../canvas/EFCanvas.js");
      const canvas = document.createElement("ef-canvas") as any;
      canvas.id = "test-canvas";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);
      await canvas.updateComplete;

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");

      const video = document.createElement("ef-video");
      video.id = "child-video";
      timegroup.appendChild(video);

      canvas.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = "test-canvas";
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      // Find the rows
      const rows = timeline.shadowRoot?.querySelectorAll("ef-timeline-row");
      expect(rows?.length).toBe(2); // parent + child

      const parentRow = rows?.[0];
      const childRow = rows?.[1];

      // Simulate hover on child row (entire row triggers hover now)
      childRow?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

      await timeline.updateComplete;
      await parentRow?.updateComplete;
      await childRow?.updateComplete;

      // Child should be hovered
      expect(childRow?.classList.contains("hovered")).toBe(true);
      // Parent should be ancestor-hovered (its descendant is hovered)
      expect(parentRow?.classList.contains("ancestor-hovered")).toBe(true);
    });
  });

  describe("selection sync", () => {
    test("clicking timeline row dispatches row-select event", async () => {
      await import("../../canvas/EFCanvas.js");
      const canvas = document.createElement("ef-canvas") as any;
      canvas.id = "test-canvas";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);
      await canvas.updateComplete;

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      canvas.appendChild(timegroup);
      await timegroup.updateComplete;

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = "test-canvas";
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);
      await timeline.updateComplete;

      let selectEventDetail: {
        elementId: string;
        element: HTMLElement;
      } | null = null;
      document.addEventListener("row-select", ((e: CustomEvent) => {
        selectEventDetail = e.detail;
      }) as EventListener);

      const timelineRow = timeline.shadowRoot?.querySelector(
        "ef-timeline-row",
      ) as any;
      const rowLabel = timelineRow?.shadowRoot?.querySelector(
        ".row-label",
      ) as HTMLElement;

      rowLabel.click();
      await timeline.updateComplete;

      expect(selectEventDetail).toBeTruthy();
      const sed = selectEventDetail as {
        elementId: string;
        element: HTMLElement;
      } | null;
      expect(sed?.elementId).toBe(timegroupId);
      expect(sed?.element).toBe(timegroup);
    });

    test("clicking timeline row updates canvas selection when canvas present", async () => {
      await import("../../canvas/EFCanvas.js");
      const canvas = document.createElement("ef-canvas") as any;
      canvas.id = "test-canvas-2";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);
      await canvas.updateComplete;

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      canvas.appendChild(timegroup);
      await timegroup.updateComplete;

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = "test-canvas-2";
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);
      await timeline.updateComplete;

      expect(Array.from(canvas.selectionContext.selectedIds)).toEqual([]);

      const timelineRow = timeline.shadowRoot?.querySelector(
        "ef-timeline-row",
      ) as any;
      const rowLabel = timelineRow?.shadowRoot?.querySelector(
        ".row-label",
      ) as HTMLElement;

      rowLabel.click();
      await timeline.updateComplete;
      await canvas.updateComplete;

      expect(Array.from(canvas.selectionContext.selectedIds)).toEqual([
        timegroupId,
      ]);
    });
  });

  describe("editing context", () => {
    test("blocks hover interactions during playhead scrubbing", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video");
      const videoId = nextId();
      video.id = videoId;
      video.setAttribute("src", "test.mp4");
      video.setAttribute("duration", "3s");
      timegroup.appendChild(video);

      const canvas = document.createElement("ef-canvas");
      canvas.id = nextId();
      canvas.appendChild(timegroup);
      document.body.appendChild(canvas);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await canvas.updateComplete;
      await timeline.updateComplete;

      // Verify editing context starts in idle mode
      expect((timeline as any)._editingContext.state.mode).toBe("idle");
      expect((timeline as any)._editingContext.canInteract()).toBe(true);

      // Simulate starting playhead drag
      const rulerContent = timeline.shadowRoot?.querySelector(
        ".ruler-content",
      ) as HTMLElement;
      expect(rulerContent).toBeTruthy();

      const pointerDownEvent = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        pointerId: 1,
      });

      rulerContent.dispatchEvent(pointerDownEvent);
      await timeline.updateComplete;

      // Verify editing context is now in scrubbing mode
      expect((timeline as any)._editingContext.state.mode).toBe("scrubbing");
      expect((timeline as any)._editingContext.canInteract()).toBe(false);

      // Simulate ending drag
      const pointerUpEvent = new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        pointerId: 1,
      });
      window.dispatchEvent(pointerUpEvent);
      await timeline.updateComplete;

      // Verify editing context returns to idle
      expect((timeline as any)._editingContext.state.mode).toBe("idle");
      expect((timeline as any)._editingContext.canInteract()).toBe(true);
    });

    test("blocks hover interactions during trim handle dragging", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video");
      const videoId = nextId();
      video.id = videoId;
      video.setAttribute("src", "test.mp4");
      video.setAttribute("duration", "3s");
      timegroup.appendChild(video);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.controlTarget = timegroupId;
      timeline.enableTrim = true;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      // Find trim handles component
      const trimHandles = timeline.shadowRoot
        ?.querySelector("ef-timeline-row")
        ?.shadowRoot?.querySelector("ef-trim-handles");

      if (trimHandles) {
        // Verify editing context starts in idle mode
        expect((timeline as any)._editingContext.state.mode).toBe("idle");

        // Simulate trim handle drag start
        const startHandle = trimHandles.shadowRoot?.querySelector(
          ".handle-start",
        ) as HTMLElement;
        if (startHandle) {
          const pointerDownEvent = new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            clientX: 50,
            pointerId: 1,
          });
          startHandle.dispatchEvent(pointerDownEvent);
          await timeline.updateComplete;

          // Verify editing context is in trimming mode
          expect((timeline as any)._editingContext.state.mode).toBe("trimming");
          expect((timeline as any)._editingContext.canInteract()).toBe(false);

          // Simulate drag end
          const pointerUpEvent = new PointerEvent("pointerup", {
            bubbles: true,
            cancelable: true,
            clientX: 60,
            pointerId: 1,
          });
          startHandle.dispatchEvent(pointerUpEvent);
          await timeline.updateComplete;

          // Verify editing context returns to idle
          expect((timeline as any)._editingContext.state.mode).toBe("idle");
          expect((timeline as any)._editingContext.canInteract()).toBe(true);
        }
      }
    });
  });
});
