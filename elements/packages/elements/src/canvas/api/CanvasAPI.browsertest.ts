import { html, render } from "lit";
import { beforeEach, describe } from "vitest";
import { test as baseTest } from "../../../test/useMSW.js";
import "../EFCanvas.js";
import { CanvasAPI } from "./CanvasAPI.js";

const test = baseTest.extend<{
  canvas: HTMLElement;
  api: CanvasAPI;
}>({
  canvas: async (_: unknown, use) => {
    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    render(
      html`
        <ef-canvas style="width: 100%; height: 100%;">
          <div data-element-id="element-1" style="position: absolute; left: 100px; top: 100px; width: 50px; height: 50px; background: red;"></div>
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
  api: async ({ canvas }, use) => {
    await use(new CanvasAPI(canvas as any));
  },
});

beforeEach(() => {
  localStorage.clear();
});

describe("CanvasAPI", () => {
  test("registers element", async ({ api, expect }) => {
    const element = document.createElement("div");
    element.style.width = "100px";
    element.style.height = "100px";
    const id = api.registerElement(element, "test-element");
    expect(id).toBe("test-element");
    const data = api.getElement("test-element");
    expect(data).toBeTruthy();
    expect(data!.id).toBe("test-element");
  });

  test("gets element data", async ({ api, expect }) => {
    const data = api.getElement("element-1");
    expect(data).toBeTruthy();
    expect(data!.id).toBe("element-1");
  });

  test("gets all elements", async ({ api, expect }) => {
    const elements = api.getAllElements();
    expect(elements.length).toBeGreaterThan(0);
    expect(elements.some((e) => e.id === "element-1")).toBe(true);
  });

  test("updates element position", async ({ api, canvas, expect }) => {
    api.updateElement("element-1", { x: 200, y: 300 });
    await (canvas as any).updateComplete;
    const data = api.getElement("element-1");
    expect(data!.x).toBe(200);
    expect(data!.y).toBe(300);
  });

  test("selects element", async ({ api, canvas, expect }) => {
    api.select("element-1");
    await (canvas as any).updateComplete;
    const selectedIds = api.getSelectedIds();
    expect(selectedIds).toContain("element-1");
  });

  test("selects multiple elements", async ({ api, canvas, expect }) => {
    const element2 = document.createElement("div");
    element2.setAttribute("data-element-id", "element-2");
    canvas.appendChild(element2);
    await (canvas as any).updateComplete;

    api.selectMultiple(["element-1", "element-2"]);
    await (canvas as any).updateComplete;
    const selectedIds = api.getSelectedIds();
    expect(selectedIds.length).toBe(2);
    expect(selectedIds).toContain("element-1");
    expect(selectedIds).toContain("element-2");
  });

  test("deselects element", async ({ api, canvas, expect }) => {
    api.select("element-1");
    await (canvas as any).updateComplete;
    api.deselect("element-1");
    await (canvas as any).updateComplete;
    const selectedIds = api.getSelectedIds();
    expect(selectedIds.length).toBe(0);
  });

  test("creates group", async ({ api, canvas, expect }) => {
    const element2 = document.createElement("div");
    element2.setAttribute("data-element-id", "element-2");
    canvas.appendChild(element2);
    await (canvas as any).updateComplete;

    const groupId = api.group(["element-1", "element-2"]);
    expect(groupId).toBeTruthy();
  });

  test("exports canvas data", async ({ api, expect }) => {
    const data = api.export();
    expect(data.elements).toBeTruthy();
    expect(Array.isArray(data.elements)).toBe(true);
    expect(data.groups).toBeTruthy();
    expect(Array.isArray(data.groups)).toBe(true);
  });

  test("converts screen to canvas coordinates", async ({ api, expect }) => {
    const result = api.screenToCanvas(150, 250);
    expect(result).toHaveProperty("x");
    expect(result).toHaveProperty("y");
  });

  test("converts canvas to screen coordinates", async ({ api, expect }) => {
    const result = api.canvasToScreen(50, 50);
    expect(result).toHaveProperty("x");
    expect(result).toHaveProperty("y");
  });
});
