import { afterEach, describe, expect, test, vi } from "vitest";
import "../../elements/EFTimegroup.js";
import "./EFTimeline.js";
import type { EFTimeline } from "./EFTimeline.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";

let idCounter = 0;
const nextId = () => `test-${idCounter++}`;

describe("EFTimeline", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    idCounter = 0;
  });

  test("should bind to temporal element via target attribute", async () => {
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
  }, 1000);

  test("should invoke play on target when play button clicked", async () => {
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

    const playButton = timeline.shadowRoot?.querySelector(".control-btn") as HTMLElement;
    expect(playButton).toBeTruthy();

    const playSpy = vi.spyOn(timegroup, "play");
    playButton.click();
    await timeline.updateComplete;

    expect(playSpy).toHaveBeenCalled();
    playSpy.mockRestore();
  }, 1000);

  test("should invoke pause on target when pause button clicked", async () => {
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

    const pauseButton = timeline.shadowRoot?.querySelector(".control-btn") as HTMLElement;
    expect(pauseButton).toBeTruthy();

    const pauseSpy = vi.spyOn(timegroup, "pause");
    pauseButton.click();
    await timeline.updateComplete;

    expect(pauseSpy).toHaveBeenCalled();
    pauseSpy.mockRestore();
  }, 1000);

  test("should update pixelsPerMs when zoom controls are used", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId = nextId();
    timegroup.id = timegroupId;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = timegroupId;
    timeline.showControls = true;
    timeline.zoomScale = 1.0;
    timeline.style.width = "800px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const initialPixelsPerMs = timeline.pixelsPerMs;
    expect(initialPixelsPerMs).toBeGreaterThan(0);

    const zoomInButton = timeline.shadowRoot?.querySelectorAll(".zoom-btn")?.[1] as HTMLElement;
    expect(zoomInButton).toBeTruthy();

    zoomInButton.click();
    await timeline.updateComplete;

    const afterZoomIn = timeline.pixelsPerMs;
    expect(afterZoomIn).toBeGreaterThan(initialPixelsPerMs);

    const zoomOutButton = timeline.shadowRoot?.querySelectorAll(".zoom-btn")?.[0] as HTMLElement;
    expect(zoomOutButton).toBeTruthy();

    zoomOutButton.click();
    await timeline.updateComplete;

    const afterZoomOut = timeline.pixelsPerMs;
    expect(afterZoomOut).toBeLessThan(afterZoomIn);
  }, 1000);

  test("should sync playhead position with currentTimeMs", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId = nextId();
    timegroup.id = timegroupId;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = timegroupId;
    timeline.zoomScale = 1.0;
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

    expect(timeline.currentTimeMs).toBe(5000);
    expect(timeline.providedCurrentTime).toBe(5000);
  }, 1000);

  test("should update duration when target changes", async () => {
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
  }, 1000);

  test("should handle missing target gracefully", async () => {
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
  }, 1000);

  test("should respect min-zoom and max-zoom constraints", async () => {
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
    timeline.zoomScale = 1.0;
    timeline.showControls = true;
    timeline.style.width = "800px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const zoomInButton = timeline.shadowRoot?.querySelectorAll(".zoom-btn")?.[1] as HTMLElement;
    for (let i = 0; i < 10; i++) {
      zoomInButton.click();
      await timeline.updateComplete;
    }

    expect(timeline.zoomScale).toBeLessThanOrEqual(2.0);

    const zoomOutButton = timeline.shadowRoot?.querySelectorAll(".zoom-btn")?.[0] as HTMLElement;
    for (let i = 0; i < 10; i++) {
      zoomOutButton.click();
      await timeline.updateComplete;
    }

    expect(timeline.zoomScale).toBeGreaterThanOrEqual(0.5);
  }, 1000);
});

