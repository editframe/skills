import { html, render } from "lit";
import { afterEach, describe, expect, test } from "vitest";
import type { EFTransformHandles } from "./EFTransformHandles";
import "./EFTransformHandles";

describe("EFTransformHandles", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("should render with default bounds", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "500px";
    container.style.height = "500px";
    document.body.appendChild(container);
    render(html`<ef-transform-handles></ef-transform-handles>`, container);
    const el = container.querySelector<EFTransformHandles>("ef-transform-handles")!;
    await el.updateComplete;

    const overlay = el.shadowRoot!.querySelector(".overlay") as HTMLDivElement;
    expect(overlay).to.exist;
    expect(overlay.style.left).to.equal("0px");
    expect(overlay.style.top).to.equal("0px");
    expect(overlay.style.width).to.equal("100px");
    expect(overlay.style.height).to.equal("100px");
  });

  test("should render with provided bounds", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "500px";
    container.style.height = "500px";
    document.body.appendChild(container);
    const bounds = { x: 50, y: 50, width: 200, height: 150 };
    render(
      html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
      container,
    );
    const el = container.querySelector<EFTransformHandles>("ef-transform-handles")!;
    await el.updateComplete;

    const overlay = el.shadowRoot!.querySelector(".overlay") as HTMLDivElement;
    expect(overlay.style.left).to.equal("50px");
    expect(overlay.style.top).to.equal("50px");
    expect(overlay.style.width).to.equal("200px");
    expect(overlay.style.height).to.equal("150px");
  });

  test("should render with rotation when enabled", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "500px";
    container.style.height = "500px";
    document.body.appendChild(container);
    const bounds = { x: 50, y: 50, width: 200, height: 150, rotation: 45 };
    render(
      html`<ef-transform-handles .bounds=${bounds} .enableRotation=${true}></ef-transform-handles>`,
      container,
    );
    const el = container.querySelector<EFTransformHandles>("ef-transform-handles")!;
    await el.updateComplete;

    const overlay = el.shadowRoot!.querySelector(".overlay") as HTMLDivElement;
    expect(overlay.style.transform).to.include("rotate(45deg)");
  });

  test("should dispatch bounds-change event when dragging", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "500px";
    container.style.height = "500px";
    document.body.appendChild(container);
    const bounds = { x: 50, y: 50, width: 200, height: 150 };
    render(
      html`<ef-transform-handles .bounds=${bounds}></ef-transform-handles>`,
      container,
    );
    const el = container.querySelector<EFTransformHandles>("ef-transform-handles")!;
    await el.updateComplete;

    let boundsChangeEvent: CustomEvent | null = null;
    el.addEventListener("bounds-change", (e) => {
      boundsChangeEvent = e as CustomEvent;
    });

    const dragArea = el.shadowRoot!.querySelector(".drag-area") as HTMLDivElement;
    const downEvent = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
      bubbles: true,
      composed: true,
    });
    dragArea.dispatchEvent(downEvent);

    const moveEvent = new MouseEvent("mousemove", {
      clientX: 150,
      clientY: 150,
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(moveEvent);
    await el.updateComplete;

    expect(boundsChangeEvent).to.exist;
    expect(boundsChangeEvent!.detail.bounds).to.exist;
  });

  test("should dispatch rotation-change event when rotating", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "500px";
    container.style.height = "500px";
    document.body.appendChild(container);
    
    const targetElement = document.createElement("div");
    targetElement.id = "test-target";
    targetElement.style.position = "absolute";
    targetElement.style.left = "100px";
    targetElement.style.top = "100px";
    targetElement.style.width = "200px";
    targetElement.style.height = "150px";
    container.appendChild(targetElement);
    
    const bounds = { x: 100, y: 100, width: 200, height: 150, rotation: 0 };
    render(
      html`<ef-transform-handles .bounds=${bounds} .target=${"#test-target"} .enableRotation=${true}></ef-transform-handles>`,
      container,
    );
    const el = container.querySelector<EFTransformHandles>("ef-transform-handles")!;
    await el.updateComplete;

    let rotationChangeEvent: CustomEvent | null = null;
    el.addEventListener("rotation-change", (e) => {
      rotationChangeEvent = e as CustomEvent;
    });

    const rotateHandle = el.shadowRoot!.querySelector(".rotate-handle") as HTMLDivElement;
    const downEvent = new MouseEvent("mousedown", {
      clientX: 200,
      clientY: 50,
      bubbles: true,
      composed: true,
    });
    rotateHandle.dispatchEvent(downEvent);

    const moveEvent = new MouseEvent("mousemove", {
      clientX: 300,
      clientY: 100,
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(moveEvent);
    await el.updateComplete;

    expect(rotationChangeEvent).to.exist;
    expect(rotationChangeEvent!.detail.rotation).to.exist;
  });

  test("should hide rotate handle by default", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "500px";
    container.style.height = "500px";
    document.body.appendChild(container);
    render(html`<ef-transform-handles></ef-transform-handles>`, container);
    const el = container.querySelector<EFTransformHandles>("ef-transform-handles")!;
    await el.updateComplete;

    const rotateHandle = el.shadowRoot!.querySelector(".rotate-handle");
    expect(rotateHandle).to.not.exist;
  });

  test("should show rotate handle when enableRotation is true", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "500px";
    container.style.height = "500px";
    document.body.appendChild(container);
    render(
      html`<ef-transform-handles .enableRotation=${true}></ef-transform-handles>`,
      container,
    );
    const el = container.querySelector<EFTransformHandles>("ef-transform-handles")!;
    await el.updateComplete;

    const rotateHandle = el.shadowRoot!.querySelector(".rotate-handle");
    expect(rotateHandle).to.exist;
  });

  test("should disable resize handles when enableResize is false", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "500px";
    container.style.height = "500px";
    document.body.appendChild(container);
    render(
      html`<ef-transform-handles .enableResize=${false}></ef-transform-handles>`,
      container,
    );
    const el = container.querySelector<EFTransformHandles>("ef-transform-handles")!;
    await el.updateComplete;

    const handles = el.shadowRoot!.querySelectorAll(".handle");
    expect(handles.length).to.equal(0);
  });

  test("should disable drag area when enableDrag is false", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "500px";
    container.style.height = "500px";
    document.body.appendChild(container);
    render(
      html`<ef-transform-handles .enableDrag=${false}></ef-transform-handles>`,
      container,
    );
    const el = container.querySelector<EFTransformHandles>("ef-transform-handles")!;
    await el.updateComplete;

    const dragArea = el.shadowRoot!.querySelector(".drag-area");
    expect(dragArea).to.not.exist;
  });
});

