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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId1;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup1.updateComplete;
      await timegroup2.updateComplete;
      await timeline.updateComplete;

      expect(timeline.durationMs).toBe(5000);

      timeline.target = timegroupId2;
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
      await timeline.updateComplete;

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
      await timeline.updateComplete;

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
      await timeline.updateComplete;
      expect(timeline.targetTemporal).toBe(timegroup1);
      expect(timeline.durationMs).toBe(5000);

      (canvas as any).selectionContext.select("element-2");
      await timeline.updateComplete;
      expect(timeline.targetTemporal).toBe(timegroup2);
      expect(timeline.durationMs).toBe(15000);
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
      timeline.pixelsPerMs = 0.1; // 100px per second
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      // New unified row architecture
      const timelineRow =
        timeline.shadowRoot?.querySelector("ef-timeline-row");
      expect(timelineRow).toBeTruthy();

      // Track component is inside the row's shadow DOM
      const timegroupTrack =
        timelineRow?.shadowRoot?.querySelector("ef-timegroup-track");
      expect(timegroupTrack).toBeTruthy();
    });

    test("renders unified rows with labels", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = timegroupId;
      timeline.showHierarchy = true;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timegroup.updateComplete;
      await timeline.updateComplete;

      // New unified row architecture - rows container
      const tracksRows =
        timeline.shadowRoot?.querySelector(".tracks-rows");
      expect(tracksRows).toBeTruthy();

      // Label is inside the row's shadow DOM
      const timelineRow =
        timeline.shadowRoot?.querySelector("ef-timeline-row");
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
      timeline.target = timegroupId;
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
    test("syncs playhead position with currentTimeMs", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = timegroupId;
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

    test("playhead position updates when pixelsPerMs changes", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
      timeline.target = timegroupId;
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
    test("fps derives from target timegroup", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      timegroup.fps = 24;
      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = timegroupId;
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
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");

      const video = document.createElement("ef-video");
      video.id = "child-video";
      timegroup.appendChild(video);

      document.body.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = timegroupId;
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
});
