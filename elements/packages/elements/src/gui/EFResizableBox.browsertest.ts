import { html, render } from "lit";
import { afterEach, describe, expect, test } from "vitest";
import type { EFResizableBox } from "./EFResizableBox";
import "./EFResizableBox";

describe("EFResizableBox", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("should render with default bounds", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(html`<ef-resizable-box></ef-resizable-box>`, container);
    const el = container.querySelector<EFResizableBox>("ef-resizable-box")!;
    await el.updateComplete;

    const box = el.shadowRoot!.querySelector(".box") as HTMLDivElement;
    expect(box).to.exist; // oxlint-disable-line no-unused-expressions -- chai .exist is a getter assertion
    expect(box.style.left).to.equal("0px");
    expect(box.style.top).to.equal("0px");
    expect(box.style.width).to.equal("100px");
    expect(box.style.height).to.equal("100px");
  });

  test("should render with provided bounds", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const bounds = { x: 50, y: 50, width: 200, height: 150 };
    render(html`<ef-resizable-box .bounds=${bounds}></ef-resizable-box>`, container);
    const el = container.querySelector<EFResizableBox>("ef-resizable-box")!;
    await el.updateComplete;

    const box = el.shadowRoot!.querySelector(".box") as HTMLDivElement;
    expect(box.style.left).to.equal("50px");
    expect(box.style.top).to.equal("50px");
    expect(box.style.width).to.equal("200px");
    expect(box.style.height).to.equal("150px");
  });

  test("should be constrained by its parent", async () => {
    const container = document.createElement("div");
    container.style.width = "300px";
    container.style.height = "300px";
    container.style.position = "relative";
    document.body.appendChild(container);
    const bounds = { x: 250, y: 250, width: 100, height: 100 };
    render(html`<ef-resizable-box .bounds=${bounds}></ef-resizable-box>`, container);
    const el = container.querySelector<EFResizableBox>("ef-resizable-box")!;
    await el.updateComplete;

    const box = el.shadowRoot!.querySelector(".box") as HTMLDivElement;
    const downEvent = new PointerEvent("pointerdown", {
      clientX: 260,
      clientY: 260,
      bubbles: true,
      composed: true,
    });
    box.dispatchEvent(downEvent);

    const moveEvent = new PointerEvent("pointermove", {
      clientX: 350,
      clientY: 350,
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(moveEvent);
    await el.updateComplete;

    expect(el.bounds.x).to.be.lessThanOrEqual(200);
    expect(el.bounds.y).to.be.lessThanOrEqual(200);
  });
});
