import { html, render } from "lit";
import { afterEach, describe, expect, test } from "vitest";
import type { EFDial } from "./EFDial";
import "./EFDial";

describe("EFDial", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("should render with default value", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(html`<ef-dial></ef-dial>`, container);
    const el = container.querySelector<EFDial>("ef-dial")!;
    await el.updateComplete;

    const centerText = el.shadowRoot!.querySelector(".center-text") as HTMLDivElement;
    expect(centerText.textContent).to.equal("0°");
  });

  test("should render with provided value", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(html`<ef-dial .value=${45}></ef-dial>`, container);
    const el = container.querySelector<EFDial>("ef-dial")!;
    await el.updateComplete;

    const centerText = el.shadowRoot!.querySelector(".center-text") as HTMLDivElement;
    expect(centerText.textContent).to.equal("45°");
  });

  test("should update value on drag and emit 'change' event", async () => {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "200px";
    document.body.appendChild(container);
    render(html`<ef-dial></ef-dial>`, container);
    const el = container.querySelector<EFDial>("ef-dial")!;
    await el.updateComplete;

    let changedValue: number | undefined;
    el.addEventListener("change", (e) => {
      changedValue = (e as CustomEvent).detail.value;
    });

    const dial = el.shadowRoot!.querySelector(".dial-container") as HTMLDivElement;
    const pointerId = 1;
    const downEvent = new PointerEvent("pointerdown", {
      clientX: 100,
      clientY: 20,
      bubbles: true,
      composed: true,
      pointerId,
    });
    dial.dispatchEvent(downEvent);

    const moveEvent = new PointerEvent("pointermove", {
      clientX: 180,
      clientY: 100,
      bubbles: true,
      composed: true,
      pointerId,
    });
    dial.dispatchEvent(moveEvent);
    await el.updateComplete;

    expect(el.value).to.be.closeTo(90, 0.1); // Expect a value around 90 degrees
    expect(changedValue).to.be.closeTo(el.value, 0.1);

    // Test normalization to 0-360
    el.value = -10; // Set a negative value
    expect(el.value).to.be.closeTo(350, 0.1); // Should normalize to 350

    el.value = 370; // Set a value > 360
    expect(el.value).to.be.closeTo(10, 0.1); // Should normalize to 10
  });
});
