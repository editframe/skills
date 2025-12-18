import { html, render } from "lit";
import { beforeEach, describe } from "vitest";
import { test as baseTest } from "../../test/useMSW.js";
import "./EFCanvas.js";
import "./overlays/SelectionOverlay.js";

const test = baseTest.extend<{
  canvas: HTMLElement;
}>({
  canvas: async ({}, use) => {
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    render(
      html`
        <ef-canvas style="width: 100%; height: 100%;">
          <div data-element-id="element-1" style="position: absolute; left: 100px; top: 100px; width: 50px; height: 50px; background: red;"></div>
          <div data-element-id="element-2" style="position: absolute; left: 200px; top: 200px; width: 50px; height: 50px; background: blue;"></div>
        </ef-canvas>
      `,
      container,
    );
    document.body.appendChild(container);
    const canvas = container.querySelector("ef-canvas") as HTMLElement;
    await (canvas as any).updateComplete;
    await use(canvas);
    container.remove();
  },
});

beforeEach(() => {
  localStorage.clear();
});

describe("EFCanvas", () => {
  test("renders canvas element", async ({ expect }) => {
    const el = document.createElement("ef-canvas");
    document.body.appendChild(el);
    await (el as any).updateComplete;
    expect(el.tagName).toBe("EF-CANVAS");
    el.remove();
  });

  test("registers elements with data-element-id", async ({
    canvas,
    expect,
  }) => {
    const canvasEl = canvas as any;
    const element1 = canvas.querySelector(
      '[data-element-id="element-1"]',
    ) as HTMLElement;
    const element2 = canvas.querySelector(
      '[data-element-id="element-2"]',
    ) as HTMLElement;

    expect(element1).toBeTruthy();
    expect(element2).toBeTruthy();

    const data1 = canvasEl.getElementData("element-1");
    const data2 = canvasEl.getElementData("element-2");

    expect(data1).toBeTruthy();
    expect(data2).toBeTruthy();
    expect(data1!.id).toBe("element-1");
    expect(data2!.id).toBe("element-2");
  });

  test("selects element on click", async ({ canvas, expect }) => {
    const canvasEl = canvas as any;
    const element1 = canvas.querySelector(
      '[data-element-id="element-1"]',
    ) as HTMLElement;

    const rect = element1.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2;
    const clickY = rect.top + rect.height / 2;

    const clickEvent = new PointerEvent("pointerdown", {
      clientX: clickX,
      clientY: clickY,
      button: 0,
      bubbles: true,
    });

    canvas.dispatchEvent(clickEvent);
    await canvasEl.updateComplete;

    const selectedIds = Array.from(
      canvasEl.selectionController.getModel().selectedIds,
    );
    expect(selectedIds).toContain("element-1");
  });

  test("clears selection on empty space click", async ({ canvas, expect }) => {
    const canvasEl = canvas as any;
    const element1 = canvas.querySelector(
      '[data-element-id="element-1"]',
    ) as HTMLElement;

    // Select element first
    const rect1 = element1.getBoundingClientRect();
    const clickX1 = rect1.left + rect1.width / 2;
    const clickY1 = rect1.top + rect1.height / 2;
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: clickX1,
        clientY: clickY1,
        button: 0,
        bubbles: true,
        pointerId: 1,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: clickX1,
        clientY: clickY1,
        button: 0,
        bubbles: true,
        pointerId: 1,
      }),
    );
    await canvasEl.updateComplete;

    // Click empty space (box select with no movement clears selection)
    const emptyX = 10;
    const emptyY = 10;
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: emptyX,
        clientY: emptyY,
        button: 0,
        bubbles: true,
        pointerId: 2,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: emptyX,
        clientY: emptyY,
        button: 0,
        bubbles: true,
        pointerId: 2,
      }),
    );
    await canvasEl.updateComplete;

    const selectedIds = Array.from(
      canvasEl.selectionController.getModel().selectedIds,
    );
    expect(selectedIds.length).toBe(0);
  });

  test("supports multi-select with modifier key", async ({
    canvas,
    expect,
  }) => {
    const canvasEl = canvas as any;
    const element1 = canvas.querySelector(
      '[data-element-id="element-1"]',
    ) as HTMLElement;
    const element2 = canvas.querySelector(
      '[data-element-id="element-2"]',
    ) as HTMLElement;

    // Click first element
    const rect1 = element1.getBoundingClientRect();
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: rect1.left + rect1.width / 2,
        clientY: rect1.top + rect1.height / 2,
        button: 0,
        bubbles: true,
      }),
    );
    await canvasEl.updateComplete;

    // Click second element with shift key
    const rect2 = element2.getBoundingClientRect();
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: rect2.left + rect2.width / 2,
        clientY: rect2.top + rect2.height / 2,
        button: 0,
        shiftKey: true,
        bubbles: true,
      }),
    );
    await canvasEl.updateComplete;

    const selectedIds = Array.from(
      canvasEl.selectionController.getModel().selectedIds,
    );
    expect(selectedIds.length).toBe(2);
    expect(selectedIds).toContain("element-1");
    expect(selectedIds).toContain("element-2");
  });

  test("registers new elements automatically", async ({ canvas, expect }) => {
    const canvasEl = canvas as any;
    const newElement = document.createElement("div");
    newElement.setAttribute("data-element-id", "element-3");
    newElement.style.position = "absolute";
    newElement.style.left = "300px";
    newElement.style.top = "300px";
    newElement.style.width = "50px";
    newElement.style.height = "50px";
    newElement.style.background = "green";

    canvas.appendChild(newElement);
    await canvasEl.updateComplete;

    const data = canvasEl.getElementData("element-3");
    expect(data).toBeTruthy();
    expect(data!.id).toBe("element-3");
  });

  describe("selection state attributes", () => {
    test("adds data-selected attribute to selected element", async ({
      canvas,
      expect,
    }) => {
      const canvasEl = canvas as any;
      const element1 = canvas.querySelector(
        '[data-element-id="element-1"]',
      ) as HTMLElement;

      canvasEl.selectionContext.select("element-1");
      await canvasEl.updateComplete;

      expect(element1.getAttribute("data-selected")).toBe("true");
      expect(element1.hasAttribute("data-selected")).toBe(true);
    });

    test("removes data-selected attribute when element is deselected", async ({
      canvas,
      expect,
    }) => {
      const canvasEl = canvas as any;
      const element1 = canvas.querySelector(
        '[data-element-id="element-1"]',
      ) as HTMLElement;

      canvasEl.selectionContext.select("element-1");
      await canvasEl.updateComplete;
      expect(element1.getAttribute("data-selected")).toBe("true");

      canvasEl.selectionContext.clear();
      await canvasEl.updateComplete;
      expect(element1.hasAttribute("data-selected")).toBe(false);
    });

    test("updates data-selected attributes for multiple selections", async ({
      canvas,
      expect,
    }) => {
      const canvasEl = canvas as any;
      const element1 = canvas.querySelector(
        '[data-element-id="element-1"]',
      ) as HTMLElement;
      const element2 = canvas.querySelector(
        '[data-element-id="element-2"]',
      ) as HTMLElement;

      canvasEl.selectionContext.selectMultiple(["element-1", "element-2"]);
      await canvasEl.updateComplete;

      expect(element1.getAttribute("data-selected")).toBe("true");
      expect(element2.getAttribute("data-selected")).toBe("true");
    });

    test("removes data-selected when element is unregistered", async ({
      canvas,
      expect,
    }) => {
      const canvasEl = canvas as any;
      const element1 = canvas.querySelector(
        '[data-element-id="element-1"]',
      ) as HTMLElement;

      canvasEl.selectionContext.select("element-1");
      await canvasEl.updateComplete;
      expect(element1.getAttribute("data-selected")).toBe("true");

      canvasEl.unregisterElement("element-1");
      await canvasEl.updateComplete;
      expect(element1.hasAttribute("data-selected")).toBe(false);
    });
  });

  describe("active root temporal", () => {
    test("returns null when no element is selected", async ({ canvas, expect }) => {
      const canvasEl = canvas as any;
      expect(canvasEl.activeRootTemporal).toBe(null);
    });

    test("returns root temporal for selected element", async ({
      canvas,
      expect,
    }) => {
      const canvasEl = canvas as any;
      await import("../../elements/EFTimegroup.js");
      const timegroup = document.createElement("ef-timegroup");
      const timegroupId = "test-timegroup";
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      canvas.appendChild(timegroup);
      await timegroup.updateComplete;
      await canvasEl.updateComplete;

      const element1 = canvas.querySelector(
        '[data-element-id="element-1"]',
      ) as HTMLElement;
      timegroup.appendChild(element1);

      canvasEl.selectionContext.select("element-1");
      await canvasEl.updateComplete;

      expect(canvasEl.activeRootTemporal).toBe(timegroup);
    });

    test("dispatches activeroottemporalchange event when selection changes", async ({
      canvas,
      expect,
    }) => {
      const canvasEl = canvas as any;
      await import("../../elements/EFTimegroup.js");
      const timegroup = document.createElement("ef-timegroup");
      const timegroupId = "test-timegroup";
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      canvas.appendChild(timegroup);
      await timegroup.updateComplete;
      await canvasEl.updateComplete;

      const element1 = canvas.querySelector(
        '[data-element-id="element-1"]',
      ) as HTMLElement;
      timegroup.appendChild(element1);

      let eventFired = false;
      let eventDetail: any = null;
      canvasEl.addEventListener("activeroottemporalchange", (e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      });

      canvasEl.selectionContext.select("element-1");
      await canvasEl.updateComplete;

      expect(eventFired).toBe(true);
      expect(eventDetail.activeRootTemporal).toBe(timegroup);
    });

    test("dispatches activeroottemporalchange event when selection clears", async ({
      canvas,
      expect,
    }) => {
      const canvasEl = canvas as any;
      await import("../../elements/EFTimegroup.js");
      const timegroup = document.createElement("ef-timegroup");
      const timegroupId = "test-timegroup";
      timegroup.id = timegroupId;
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "5s");
      canvas.appendChild(timegroup);
      await timegroup.updateComplete;
      await canvasEl.updateComplete;

      const element1 = canvas.querySelector(
        '[data-element-id="element-1"]',
      ) as HTMLElement;
      timegroup.appendChild(element1);

      canvasEl.selectionContext.select("element-1");
      await canvasEl.updateComplete;
      expect(canvasEl.activeRootTemporal).toBe(timegroup);

      let eventFired = false;
      let eventDetail: any = null;
      canvasEl.addEventListener("activeroottemporalchange", (e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      });

      canvasEl.selectionContext.clear();
      await canvasEl.updateComplete;

      expect(eventFired).toBe(true);
      expect(eventDetail.activeRootTemporal).toBe(null);
      expect(canvasEl.activeRootTemporal).toBe(null);
    });
  });
});
