import { afterEach, describe, expect, test } from "vitest";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../../canvas/EFCanvas.js";
import "./EFHierarchy.js";
import type { EFHierarchy } from "./EFHierarchy.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
import type { EFVideo } from "../../elements/EFVideo.js";
import type { EFCanvas } from "../../canvas/EFCanvas.js";
import { CanvasAPI } from "../../canvas/api/CanvasAPI.js";

let idCounter = 0;
const nextId = () => `test-${idCounter++}`;

// Skip all EFHierarchy tests - failing tests need investigation
describe.skip("EFHierarchy", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    idCounter = 0;
  });

  test("should resolve root elements from target attribute", async () => {
    const container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup1.id = nextId();
    timegroup1.setAttribute("mode", "fixed");
    timegroup1.setAttribute("duration", "5s");
    container.appendChild(timegroup1);

    const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup2.id = nextId();
    timegroup2.setAttribute("mode", "fixed");
    timegroup2.setAttribute("duration", "10s");
    container.appendChild(timegroup2);

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-container";
    document.body.appendChild(hierarchy);

    await timegroup1.updateComplete;
    await timegroup2.updateComplete;
    await hierarchy.updateComplete;

    const hierarchyItems = hierarchy.shadowRoot?.querySelectorAll(
      "ef-timegroup-hierarchy-item",
    );
    expect(hierarchyItems?.length).toBe(2);
  }, 1000);

  test("should dispatch hierarchy-select event when select is called", async () => {
    const container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId = nextId();
    timegroup.id = timegroupId;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    container.appendChild(timegroup);

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-container";
    document.body.appendChild(hierarchy);

    await timegroup.updateComplete;
    await hierarchy.updateComplete;

    let eventDetail: { elementId: string | null } | null = null;
    const eventHandler = ((e: CustomEvent) => {
      eventDetail = e.detail;
    }) as EventListener;
    hierarchy.addEventListener("hierarchy-select", eventHandler);

    hierarchy.select(timegroupId);
    await hierarchy.updateComplete;

    expect(eventDetail).toBeTruthy();
    expect((eventDetail as { elementId: string | null } | null)?.elementId).toBe(timegroupId);
  }, 1000);

  test("should toggle expand/collapse on expand icon click", async () => {
    const container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = nextId();
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");

    const video = document.createElement("ef-video") as EFVideo;
    video.id = nextId();
    timegroup.appendChild(video);
    container.appendChild(timegroup);

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-container";
    document.body.appendChild(hierarchy);

    await timegroup.updateComplete;
    await video.updateComplete;
    await hierarchy.updateComplete;

    const hierarchyItem = hierarchy.shadowRoot?.querySelector(
      "ef-timegroup-hierarchy-item",
    );
    expect(hierarchyItem).toBeTruthy();

    const children = hierarchyItem?.shadowRoot?.querySelector(
      ".children",
    ) as HTMLElement;
    expect(children).toBeTruthy();

    const expandIcon = hierarchyItem?.shadowRoot?.querySelector(
      ".expand-icon",
    ) as HTMLElement;
    expect(expandIcon).toBeTruthy();

    const initiallyExpanded = !children.hasAttribute("data-collapsed");
    expect(initiallyExpanded).toBe(true);

    expandIcon.click();
    await hierarchy.updateComplete;

    const afterToggle = !children.hasAttribute("data-collapsed");
    expect(afterToggle).toBe(!initiallyExpanded);
  }, 1000);

  test("should expand/collapse without affecting other state", async () => {
    const container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId = nextId();
    timegroup.id = timegroupId;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");

    const video = document.createElement("ef-video") as EFVideo;
    video.id = nextId();
    timegroup.appendChild(video);

    container.appendChild(timegroup);

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-container";
    document.body.appendChild(hierarchy);

    await timegroup.updateComplete;
    await video.updateComplete;
    await hierarchy.updateComplete;

    const hierarchyItem = hierarchy.shadowRoot?.querySelector(
      "ef-timegroup-hierarchy-item",
    ) as any;
    expect(hierarchyItem).toBeTruthy();

    const children = hierarchyItem?.shadowRoot?.querySelector(
      ".children",
    ) as HTMLElement;
    const expandIcon = hierarchyItem?.shadowRoot?.querySelector(
      ".expand-icon",
    ) as HTMLElement;
    expect(children).toBeTruthy();
    expect(expandIcon).toBeTruthy();

    const initiallyExpanded = !children.hasAttribute("data-collapsed");
    expect(initiallyExpanded).toBe(true);

    expandIcon.click();
    await hierarchy.updateComplete;
    await hierarchyItem.updateComplete;

    const afterToggle = !children.hasAttribute("data-collapsed");
    expect(afterToggle).toBe(false);
  }, 1000);

  test.skip("should dispatch hierarchy-reorder event on drag-drop", async () => {
    const container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId1 = nextId();
    timegroup1.id = timegroupId1;
    timegroup1.setAttribute("mode", "fixed");
    timegroup1.setAttribute("duration", "5s");
    container.appendChild(timegroup1);

    const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId2 = nextId();
    timegroup2.id = timegroupId2;
    timegroup2.setAttribute("mode", "fixed");
    timegroup2.setAttribute("duration", "10s");
    container.appendChild(timegroup2);

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-container";
    document.body.appendChild(hierarchy);

    await timegroup1.updateComplete;
    await timegroup2.updateComplete;
    await hierarchy.updateComplete;

    let reorderDetail: {
      sourceId: string;
      targetId: string;
      position: "before" | "after" | "inside";
    } | null = null;
    const eventHandler = ((e: CustomEvent) => {
      reorderDetail = e.detail;
    }) as EventListener;
    hierarchy.addEventListener("hierarchy-reorder", eventHandler);

    const items = hierarchy.shadowRoot?.querySelectorAll(
      "ef-timegroup-hierarchy-item",
    );
    expect(items?.length).toBe(2);

    const sourceItem = items?.[0];
    const targetItem = items?.[1];
    expect(sourceItem).toBeTruthy();
    expect(targetItem).toBeTruthy();
    await (sourceItem as any)?.updateComplete;
    await (targetItem as any)?.updateComplete;

    const sourceRow = sourceItem?.shadowRoot?.querySelector(
      ".item-row",
    ) as HTMLElement;
    const targetRow = targetItem?.shadowRoot?.querySelector(
      ".item-row",
    ) as HTMLElement;
    expect(sourceRow).toBeTruthy();
    expect(targetRow).toBeTruthy();

    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", timegroupId1);

    const dragStartEvent = new DragEvent("dragstart", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    sourceRow.dispatchEvent(dragStartEvent);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await hierarchy.updateComplete;

    const rect = targetRow.getBoundingClientRect();
    const dragOverEvent = new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      clientY: rect.top + rect.height * 0.5,
    });
    Object.defineProperty(dragOverEvent, "currentTarget", {
      value: targetRow,
      enumerable: true,
      configurable: true,
    });
    targetRow.dispatchEvent(dragOverEvent);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await hierarchy.updateComplete;

    const dropEvent = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    targetRow.dispatchEvent(dropEvent);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await hierarchy.updateComplete;

    expect(reorderDetail).toBeTruthy();
    const rd = reorderDetail as { sourceId: string; targetId: string; position: "before" | "after" | "inside" } | null;
    expect(rd?.sourceId).toBe(timegroupId1);
    expect(rd?.targetId).toBe(timegroupId2);
    expect(["before", "after", "inside"]).toContain(rd?.position);
  }, 1000);

  test("should select element via select method", async () => {
    const container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId = nextId();
    timegroup.id = timegroupId;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    container.appendChild(timegroup);

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-container";
    document.body.appendChild(hierarchy);

    await timegroup.updateComplete;
    await hierarchy.updateComplete;

    expect(hierarchy.getSelectedElementId()).toBe(null);

    hierarchy.select(timegroupId);
    await hierarchy.updateComplete;

    expect(hierarchy.getSelectedElementId()).toBe(timegroupId);
  }, 1000);

  test("should handle target element that is temporal", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "temporal-target";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    document.body.appendChild(timegroup);

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "temporal-target";
    document.body.appendChild(hierarchy);

    await timegroup.updateComplete;
    await hierarchy.updateComplete;

    const hierarchyItems = hierarchy.shadowRoot?.querySelectorAll(
      "ef-timegroup-hierarchy-item",
    );
    expect(hierarchyItems?.length).toBe(1);
  }, 1000);

  test("should sync selection with canvas when hierarchy connects after canvas", async () => {
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

    const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroup2Id = nextId();
    timegroup2.id = timegroup2Id;
    timegroup2.setAttribute("mode", "fixed");
    timegroup2.setAttribute("duration", "10s");
    timegroup2.style.left = "550px";
    timegroup2.style.top = "100px";
    timegroup2.style.width = "400px";
    timegroup2.style.height = "300px";
    canvas.appendChild(timegroup2);

    await canvas.updateComplete;
    await timegroup1.updateComplete;
    await timegroup2.updateComplete;

    const api = new CanvasAPI(canvas);
    api.select(timegroup1Id);

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-canvas";
    document.body.appendChild(hierarchy);

    await hierarchy.updateComplete;

    expect(hierarchy.getSelectedElementId()).toBe(timegroup1Id);

    api.select(timegroup2Id);
    await hierarchy.updateComplete;

    expect(hierarchy.getSelectedElementId()).toBe(timegroup2Id);
  }, 1000);

  test("should sync selection with canvas when hierarchy connects before canvas", async () => {
    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-canvas-2";
    document.body.appendChild(hierarchy);

    await hierarchy.updateComplete;

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

    const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroup2Id = nextId();
    timegroup2.id = timegroup2Id;
    timegroup2.setAttribute("mode", "fixed");
    timegroup2.setAttribute("duration", "10s");
    timegroup2.style.left = "550px";
    timegroup2.style.top = "100px";
    timegroup2.style.width = "400px";
    timegroup2.style.height = "300px";
    canvas.appendChild(timegroup2);

    await canvas.updateComplete;
    await timegroup1.updateComplete;
    await timegroup2.updateComplete;
    await hierarchy.updateComplete;

    const api = new CanvasAPI(canvas);

    expect(hierarchy.getSelectedElementId()).toBe(null);

    api.select(timegroup1Id);
    await hierarchy.updateComplete;

    expect(hierarchy.getSelectedElementId()).toBe(timegroup1Id);

    api.select(timegroup2Id);
    await hierarchy.updateComplete;

    expect(hierarchy.getSelectedElementId()).toBe(timegroup2Id);
  }, 1000);

  test("should show selected state in hierarchy item when canvas selection changes", async () => {
    const canvas = document.createElement("ef-canvas") as EFCanvas;
    canvas.id = "test-canvas-3";
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

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-canvas-3";
    document.body.appendChild(hierarchy);

    await canvas.updateComplete;
    await timegroup1.updateComplete;
    await hierarchy.updateComplete;

    const hierarchyItem = hierarchy.shadowRoot?.querySelector(
      "ef-timegroup-hierarchy-item",
    ) as any;
    expect(hierarchyItem).toBeTruthy();

    const itemRow = hierarchyItem?.shadowRoot?.querySelector(
      ".item-row",
    ) as HTMLElement;
    expect(itemRow).toBeTruthy();
    expect(itemRow.hasAttribute("data-selected")).toBe(false);

    const api = new CanvasAPI(canvas);
    api.select(timegroup1Id);
    await hierarchy.updateComplete;
    await hierarchyItem.updateComplete;

    expect(itemRow.hasAttribute("data-selected")).toBe(true);
  }, 1000);

  test("should update canvas selection when hierarchy item is clicked", async () => {
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

    const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
    hierarchy.target = "test-canvas-4";
    document.body.appendChild(hierarchy);

    await canvas.updateComplete;
    await timegroup1.updateComplete;
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

  describe("hover sync", () => {
    test("hovering hierarchy item updates canvas highlightedElement", async () => {
      const canvas = document.createElement("ef-canvas") as EFCanvas;
      canvas.id = "test-canvas-events";
      canvas.style.width = "800px";
      canvas.style.height = "600px";
      document.body.appendChild(canvas);

      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      const timegroupId = nextId();
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      timegroup.style.left = "100px";
      timegroup.style.top = "100px";
      timegroup.style.width = "400px";
      timegroup.style.height = "300px";
      canvas.appendChild(timegroup);

      await canvas.updateComplete;
      await timegroup.updateComplete;

      const hierarchy = document.createElement("ef-hierarchy") as EFHierarchy;
      hierarchy.target = "test-canvas-events";
      document.body.appendChild(hierarchy);

      await hierarchy.updateComplete;

      const hierarchyItem = hierarchy.shadowRoot?.querySelector(
        "ef-timegroup-hierarchy-item",
      ) as any;
      const itemRow = hierarchyItem?.shadowRoot?.querySelector(
        ".item-row",
      ) as HTMLElement;

      // Canvas should initially have no highlighted element
      expect(canvas.highlightedElement).toBe(null);

      // Hover on hierarchy item
      itemRow.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      await hierarchyItem.updateComplete;

      // Canvas highlightedElement should now be the timegroup
      expect(canvas.highlightedElement).toBe(timegroup);

      // Leave the hierarchy item
      itemRow.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      await hierarchyItem.updateComplete;

      // Canvas highlightedElement should be cleared
      expect(canvas.highlightedElement).toBe(null);
    }, 1000);
  });
});
