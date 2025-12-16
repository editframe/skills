import { afterEach, describe, expect, test, vi } from "vitest";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../../canvas/EFCanvas.js";
import "../../gui/hierarchy/EFHierarchy.js";
import "../../gui/timeline/EFTimeline.js";
import type { EFCanvas } from "../../canvas/EFCanvas.js";
import type { EFHierarchy } from "../../gui/hierarchy/EFHierarchy.js";
import type { EFTimeline } from "../../gui/timeline/EFTimeline.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
import type { EFVideo } from "../../elements/EFVideo.js";
import { findRootTemporal } from "../../elements/findRootTemporal.js";

let idCounter = 0;
const nextId = () => `test-${idCounter++}`;

// TODO: Update these tests for new timeline implementation
describe.skip("Canvas Timeline Synchronization", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    idCounter = 0;
  });

  describe("findRootTemporal", () => {
    test("returns outermost timegroup when element is nested in timegroups", async () => {
      const outerTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      outerTimegroup.id = nextId();
      outerTimegroup.setAttribute("mode", "fixed");
      outerTimegroup.setAttribute("duration", "10s");
      document.body.appendChild(outerTimegroup);

      const innerTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      innerTimegroup.id = nextId();
      innerTimegroup.setAttribute("mode", "fixed");
      innerTimegroup.setAttribute("duration", "5s");
      outerTimegroup.appendChild(innerTimegroup);

      const video = document.createElement("ef-video") as EFVideo;
      video.id = nextId();
      innerTimegroup.appendChild(video);

      await outerTimegroup.updateComplete;
      await innerTimegroup.updateComplete;
      await video.updateComplete;

      const root = findRootTemporal(video);
      expect(root).toBe(outerTimegroup);
    }, 1000);

    test("returns the temporal itself when it has no temporal ancestors", async () => {
      const video = document.createElement("ef-video") as EFVideo;
      video.id = nextId();
      document.body.appendChild(video);

      await video.updateComplete;

      const root = findRootTemporal(video);
      expect(root).toBe(video);
    }, 1000);

    test("returns null for non-temporal elements without temporal ancestors", () => {
      const div = document.createElement("div");
      div.id = nextId();
      document.body.appendChild(div);

      const root = findRootTemporal(div);
      expect(root).toBeNull();
    }, 1000);

    test("finds root temporal through div wrapper", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas";
      document.body.appendChild(canvas);

      const wrapper = document.createElement("div");
      wrapper.id = nextId();
      canvas.appendChild(wrapper);

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      wrapper.appendChild(timegroup);

      await canvas.updateComplete;
      await timegroup.updateComplete;

      const root = findRootTemporal(wrapper);
      expect(root).toBe(timegroup);
    }, 1000);
  });

  describe("Timeline derives target from selection", () => {
    test("selecting timegroup makes targetTemporal return the timegroup", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas";
      document.body.appendChild(canvas);

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      canvas.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await canvas.updateComplete;
      await timegroup.updateComplete;
      await timeline.updateComplete;

      expect(timeline.targetTemporal).toBeNull();

      canvas.selectionContext.select(timegroupId);
      await canvas.updateComplete;
      await timeline.updateComplete;

      expect(timeline.targetTemporal).toBe(timegroup);
    }, 1000);

    test("play button calls play() on the derived target", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas";
      document.body.appendChild(canvas);

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      canvas.appendChild(timegroup);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.showControls = true;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await canvas.updateComplete;
      await timegroup.updateComplete;
      await timeline.updateComplete;

      canvas.selectionContext.select(timegroupId);
      await canvas.updateComplete;
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
    }, 1000);

    test("changing selection changes what targetTemporal returns", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas";
      document.body.appendChild(canvas);

      const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId1 = nextId();
      timegroup1.id = timegroupId1;
      timegroup1.setAttribute("mode", "fixed");
      timegroup1.setAttribute("duration", "5s");
      canvas.appendChild(timegroup1);

      const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId2 = nextId();
      timegroup2.id = timegroupId2;
      timegroup2.setAttribute("mode", "fixed");
      timegroup2.setAttribute("duration", "10s");
      canvas.appendChild(timegroup2);

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await canvas.updateComplete;
      await timegroup1.updateComplete;
      await timegroup2.updateComplete;
      await timeline.updateComplete;

      canvas.selectionContext.select(timegroupId1);
      await canvas.updateComplete;
      await timeline.updateComplete;
      expect(timeline.targetTemporal).toBe(timegroup1);

      canvas.selectionContext.select(timegroupId2);
      await canvas.updateComplete;
      await timeline.updateComplete;
      expect(timeline.targetTemporal).toBe(timegroup2);
    }, 1000);
  });

  describe("Hierarchy highlights derived root temporal", () => {
    test("when timegroup is selected, it shows isSelected = true", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas";
      document.body.appendChild(canvas);

      const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
      hierarchy.target = "test-canvas";
      document.body.appendChild(hierarchy);

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      canvas.appendChild(timegroup);

      await canvas.updateComplete;
      await timegroup.updateComplete;
      await hierarchy.updateComplete;

      const hierarchyItem = hierarchy.shadowRoot?.querySelector(
        "ef-timegroup-hierarchy-item",
      );
      expect(hierarchyItem).toBeTruthy();

      const itemRow = hierarchyItem?.shadowRoot?.querySelector(".item-row");
      expect(itemRow).toBeTruthy();
      expect(itemRow?.hasAttribute("data-selected")).toBe(false);

      canvas.selectionContext.select(timegroupId);
      await canvas.updateComplete;
      await hierarchy.updateComplete;

      expect(itemRow?.hasAttribute("data-selected")).toBe(true);
    }, 1000);

    test("deselecting clears the highlight", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas";
      document.body.appendChild(canvas);

      const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
      hierarchy.target = "test-canvas";
      document.body.appendChild(hierarchy);

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      canvas.appendChild(timegroup);

      await canvas.updateComplete;
      await timegroup.updateComplete;
      await hierarchy.updateComplete;

      const hierarchyItem = hierarchy.shadowRoot?.querySelector(
        "ef-timegroup-hierarchy-item",
      );
      const itemRow = hierarchyItem?.shadowRoot?.querySelector(".item-row");

      canvas.selectionContext.select(timegroupId);
      await canvas.updateComplete;
      await hierarchy.updateComplete;
      expect(itemRow?.hasAttribute("data-selected")).toBe(true);

      canvas.selectionContext.clear();
      await canvas.updateComplete;
      await hierarchy.updateComplete;
      expect(itemRow?.hasAttribute("data-selected")).toBe(false);
    }, 1000);
  });
});
