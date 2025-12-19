import { afterEach, describe, expect, test } from "vitest";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "../elements/EFPanZoom.js";
import "../canvas/EFCanvas.js";
import "../gui/hierarchy/EFHierarchy.js";
import "../gui/timeline/EFTimeline.js";
import type { EFCanvas } from "../canvas/EFCanvas.js";
import type { EFHierarchy } from "../gui/hierarchy/EFHierarchy.js";
import type { EFTimeline } from "../gui/timeline/EFTimeline.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { CanvasAPI } from "../canvas/api/CanvasAPI.js";

let idCounter = 0;
const nextId = () => `test-${idCounter++}`;

describe("Canvas-Hierarchy-Timeline Sync", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    idCounter = 0;
  });

  describe("selection agreement", () => {
    test("selecting in canvas shows selected in hierarchy", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);

      const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroup1Id = nextId();
      timegroup1.id = timegroup1Id;
      timegroup1.setAttribute("mode", "fixed");
      timegroup1.setAttribute("duration", "5s");
      timegroup1.style.left = "100px";
      timegroup1.style.top = "100px";
      timegroup1.style.width = "400px";
      timegroup1.style.height = "300px";
      canvas.appendChild(timegroup1);

      await canvas.updateComplete;
      await timegroup1.updateComplete;

      const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
      hierarchy.target = "test-canvas";
      document.body.appendChild(hierarchy);

      await hierarchy.updateComplete;

      const api = new CanvasAPI(canvas);
      api.select(timegroup1Id);
      await canvas.updateComplete;
      await hierarchy.updateComplete;

      const hierarchyItem = hierarchy.shadowRoot?.querySelector(
        "ef-timegroup-hierarchy-item",
      ) as any;
      await hierarchyItem?.updateComplete;
      const itemRow = hierarchyItem?.shadowRoot?.querySelector(
        ".item-row",
      ) as HTMLElement;

      expect(itemRow.hasAttribute("data-selected")).toBe(true);
      expect(api.getSelectedIds()).toEqual([timegroup1Id]);
    }, 1000);

    test("selecting in hierarchy shows selected in canvas", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas-2";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);

      const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroup1Id = nextId();
      timegroup1.id = timegroup1Id;
      timegroup1.setAttribute("mode", "fixed");
      timegroup1.setAttribute("duration", "5s");
      timegroup1.style.left = "100px";
      timegroup1.style.top = "100px";
      timegroup1.style.width = "400px";
      timegroup1.style.height = "300px";
      canvas.appendChild(timegroup1);

      await canvas.updateComplete;
      await timegroup1.updateComplete;

      const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
      hierarchy.target = "test-canvas-2";
      document.body.appendChild(hierarchy);

      await hierarchy.updateComplete;

      const api = new CanvasAPI(canvas);
      expect(api.getSelectedIds()).toEqual([]);

      const hierarchyItem = hierarchy.shadowRoot?.querySelector(
        "ef-timegroup-hierarchy-item",
      ) as any;
      const itemRow = hierarchyItem?.shadowRoot?.querySelector(
        ".item-row",
      ) as HTMLElement;

      itemRow.click();
      await hierarchy.updateComplete;
      await canvas.updateComplete;

      expect(api.getSelectedIds()).toEqual([timegroup1Id]);
    }, 1000);

    test("clearing selection in canvas clears hierarchy", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas-4";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);

      const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroup1Id = nextId();
      timegroup1.id = timegroup1Id;
      timegroup1.setAttribute("mode", "fixed");
      timegroup1.setAttribute("duration", "5s");
      timegroup1.style.left = "100px";
      timegroup1.style.top = "100px";
      timegroup1.style.width = "400px";
      timegroup1.style.height = "300px";
      canvas.appendChild(timegroup1);

      await canvas.updateComplete;
      await timegroup1.updateComplete;

      const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
      hierarchy.target = "test-canvas-4";
      document.body.appendChild(hierarchy);

      await hierarchy.updateComplete;

      const api = new CanvasAPI(canvas);
      api.select(timegroup1Id);
      await canvas.updateComplete;
      await hierarchy.updateComplete;

      expect(api.getSelectedIds()).toEqual([timegroup1Id]);

      (canvas as any).selectionContext.clear();
      await canvas.updateComplete;
      await hierarchy.updateComplete;

      const hierarchyItem = hierarchy.shadowRoot?.querySelector(
        "ef-timegroup-hierarchy-item",
      ) as any;
      await hierarchyItem?.updateComplete;
      const itemRow = hierarchyItem?.shadowRoot?.querySelector(
        ".item-row",
      ) as HTMLElement;

      expect(api.getSelectedIds()).toEqual([]);
      expect(itemRow.hasAttribute("data-selected")).toBe(false);
    }, 1000);

    test("hierarchy dispatches hierarchy-select event on selection", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas-5";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);

      const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroup1Id = nextId();
      timegroup1.id = timegroup1Id;
      timegroup1.setAttribute("mode", "fixed");
      timegroup1.setAttribute("duration", "5s");
      timegroup1.style.left = "100px";
      timegroup1.style.top = "100px";
      timegroup1.style.width = "400px";
      timegroup1.style.height = "300px";
      canvas.appendChild(timegroup1);

      await canvas.updateComplete;
      await timegroup1.updateComplete;

      const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
      hierarchy.target = "test-canvas-5";
      document.body.appendChild(hierarchy);

      await hierarchy.updateComplete;

      let selectEventDetail: { elementId: string | null } | null = null;
      document.addEventListener(
        "hierarchy-select",
        ((e: CustomEvent) => {
          selectEventDetail = e.detail;
        }) as EventListener,
      );

      const hierarchyItem = hierarchy.shadowRoot?.querySelector(
        "ef-timegroup-hierarchy-item",
      ) as any;
      const itemRow = hierarchyItem?.shadowRoot?.querySelector(
        ".item-row",
      ) as HTMLElement;

      itemRow.click();
      await hierarchy.updateComplete;

      expect(selectEventDetail).toBeTruthy();
      expect(selectEventDetail?.elementId).toBe(timegroup1Id);
    }, 1000);
  });

  describe("highlight sync (canvas is source of truth)", () => {
    test("hovering element in canvas sets highlightedElement", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas-hover";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);

      const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroup1Id = nextId();
      timegroup1.id = timegroup1Id;
      timegroup1.setAttribute("mode", "fixed");
      timegroup1.setAttribute("duration", "5s");
      timegroup1.style.left = "100px";
      timegroup1.style.top = "100px";
      timegroup1.style.width = "400px";
      timegroup1.style.height = "300px";
      canvas.appendChild(timegroup1);

      await canvas.updateComplete;
      await timegroup1.updateComplete;

      expect(canvas.highlightedElement).toBe(null);

      timegroup1.dispatchEvent(
        new MouseEvent("mouseenter", { bubbles: true }),
      );
      await canvas.updateComplete;

      expect(canvas.highlightedElement).toBe(timegroup1);

      timegroup1.dispatchEvent(
        new MouseEvent("mouseleave", { bubbles: true }),
      );
      await canvas.updateComplete;

      expect(canvas.highlightedElement).toBe(null);
    }, 1000);

    test("hovering hierarchy item sets canvas highlightedElement", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas-hover-2";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);

      const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroup1Id = nextId();
      timegroup1.id = timegroup1Id;
      timegroup1.setAttribute("mode", "fixed");
      timegroup1.setAttribute("duration", "5s");
      timegroup1.style.left = "100px";
      timegroup1.style.top = "100px";
      timegroup1.style.width = "400px";
      timegroup1.style.height = "300px";
      canvas.appendChild(timegroup1);

      await canvas.updateComplete;
      await timegroup1.updateComplete;

      const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
      hierarchy.target = "test-canvas-hover-2";
      document.body.appendChild(hierarchy);

      await hierarchy.updateComplete;

      expect(canvas.highlightedElement).toBe(null);

      const hierarchyItem = hierarchy.shadowRoot?.querySelector(
        "ef-timegroup-hierarchy-item",
      ) as any;
      const itemRow = hierarchyItem?.shadowRoot?.querySelector(
        ".item-row",
      ) as HTMLElement;

      itemRow.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      await hierarchyItem.updateComplete;

      expect(canvas.highlightedElement).toBe(timegroup1);

      itemRow.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      await hierarchyItem.updateComplete;

      expect(canvas.highlightedElement).toBe(null);
    }, 1000);

    test("hovering timeline row sets canvas highlightedElement", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas-hover-3";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      canvas.appendChild(timegroup);

      await canvas.updateComplete;
      await timegroup.updateComplete;

      const timeline = document.createElement("ef-timeline") as EFTimeline;
      timeline.target = "test-canvas-hover-3";
      timeline.controlTarget = timegroupId;
      timeline.style.width = "800px";
      timeline.style.height = "400px";
      document.body.appendChild(timeline);

      await timeline.updateComplete;

      expect(canvas.highlightedElement).toBe(null);

      const timelineRow = timeline.shadowRoot?.querySelector(
        "ef-timeline-row",
      ) as any;

      timelineRow?.dispatchEvent(
        new MouseEvent("mouseenter", { bubbles: true }),
      );
      await timeline.updateComplete;

      expect(canvas.highlightedElement).toBe(timegroup);
    }, 1000);
  });
});
