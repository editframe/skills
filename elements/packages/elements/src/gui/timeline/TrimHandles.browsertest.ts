import { afterEach, describe, expect, test } from "vitest";
import "../../elements/EFVideo.js";
import "./TrimHandles.js";
import type { EFTrimHandles, TrimChangeDetail } from "./TrimHandles.js";
import type { EFVideo } from "../../elements/EFVideo.js";

let idCounter = 0;
const nextId = () => `test-${idCounter++}`;

describe("EFTrimHandles", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    idCounter = 0;
  });

  test("should dispatch trim-change event with type 'start' when dragging start handle", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "400px";
    container.style.height = "100px";
    document.body.appendChild(container);

    const trimHandles = document.createElement("ef-trim-handles") as EFTrimHandles;
    trimHandles.elementId = nextId();
    trimHandles.pixelsPerMs = 0.1;
    trimHandles.trimStartMs = 0;
    trimHandles.trimEndMs = 0;
    trimHandles.intrinsicDurationMs = 10000;
    container.appendChild(trimHandles);

    await trimHandles.updateComplete;

    let trimChangeDetail: TrimChangeDetail | null = null;
    trimHandles.addEventListener("trim-change", ((e: CustomEvent<TrimChangeDetail>) => {
      trimChangeDetail = e.detail;
    }) as EventListener);

    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;
    expect(startHandle).toBeTruthy();

    const rect = container.getBoundingClientRect();
    const pointerDownEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 10,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    startHandle.dispatchEvent(pointerDownEvent);
    await trimHandles.updateComplete;

    const pointerMoveEvent = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 50,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    startHandle.dispatchEvent(pointerMoveEvent);
    await trimHandles.updateComplete;

    expect(trimChangeDetail).toBeTruthy();
    expect(trimChangeDetail?.type).toBe("start");
    expect(trimChangeDetail?.elementId).toBe(trimHandles.elementId);
    expect(trimChangeDetail?.newValueMs).toBeGreaterThanOrEqual(0);
  }, 1000);

  test("should dispatch trim-change event with type 'end' when dragging end handle", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "400px";
    container.style.height = "100px";
    document.body.appendChild(container);

    const trimHandles = document.createElement("ef-trim-handles") as EFTrimHandles;
    trimHandles.elementId = nextId();
    trimHandles.pixelsPerMs = 0.1;
    trimHandles.trimStartMs = 0;
    trimHandles.trimEndMs = 0;
    trimHandles.intrinsicDurationMs = 10000;
    container.appendChild(trimHandles);

    await trimHandles.updateComplete;

    let trimChangeDetail: TrimChangeDetail | null = null;
    trimHandles.addEventListener("trim-change", ((e: CustomEvent<TrimChangeDetail>) => {
      trimChangeDetail = e.detail;
    }) as EventListener);

    const endHandle = trimHandles.shadowRoot?.querySelector(".handle-end") as HTMLElement;
    expect(endHandle).toBeTruthy();

    const rect = container.getBoundingClientRect();
    const rightEdge = rect.left + rect.width;
    const pointerDownEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: rightEdge - 10,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    endHandle.dispatchEvent(pointerDownEvent);
    await trimHandles.updateComplete;

    const pointerMoveEvent = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: rightEdge - 50,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    endHandle.dispatchEvent(pointerMoveEvent);
    await trimHandles.updateComplete;

    expect(trimChangeDetail).toBeTruthy();
    expect(trimChangeDetail?.type).toBe("end");
    expect(trimChangeDetail?.elementId).toBe(trimHandles.elementId);
    expect(trimChangeDetail?.newValueMs).toBeGreaterThanOrEqual(0);
  }, 1000);

  test("should constrain trimStartMs to not exceed duration minus trimEndMs", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "400px";
    container.style.height = "100px";
    document.body.appendChild(container);

    const trimHandles = document.createElement("ef-trim-handles") as EFTrimHandles;
    trimHandles.elementId = nextId();
    trimHandles.pixelsPerMs = 0.1;
    trimHandles.trimStartMs = 0;
    trimHandles.trimEndMs = 2000;
    trimHandles.intrinsicDurationMs = 10000;
    container.appendChild(trimHandles);

    await trimHandles.updateComplete;

    const trimChanges: TrimChangeDetail[] = [];
    trimHandles.addEventListener("trim-change", ((e: CustomEvent<TrimChangeDetail>) => {
      trimChanges.push(e.detail);
    }) as EventListener);

    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;
    const rect = container.getBoundingClientRect();

    const pointerDownEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 10,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    startHandle.dispatchEvent(pointerDownEvent);
    await trimHandles.updateComplete;

    const pointerMoveEvent = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 90000,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    startHandle.dispatchEvent(pointerMoveEvent);
    await trimHandles.updateComplete;

    expect(trimChanges.length).toBeGreaterThan(0);
    const lastChange = trimChanges[trimChanges.length - 1];
    expect(lastChange.newValueMs).toBeLessThanOrEqual(trimHandles.intrinsicDurationMs - trimHandles.trimEndMs);
  }, 1000);

  test("should constrain trimEndMs to not exceed duration minus trimStartMs", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "400px";
    container.style.height = "100px";
    document.body.appendChild(container);

    const trimHandles = document.createElement("ef-trim-handles") as EFTrimHandles;
    trimHandles.elementId = nextId();
    trimHandles.pixelsPerMs = 0.1;
    trimHandles.trimStartMs = 2000;
    trimHandles.trimEndMs = 0;
    trimHandles.intrinsicDurationMs = 10000;
    container.appendChild(trimHandles);

    await trimHandles.updateComplete;

    const trimChanges: TrimChangeDetail[] = [];
    trimHandles.addEventListener("trim-change", ((e: CustomEvent<TrimChangeDetail>) => {
      trimChanges.push(e.detail);
    }) as EventListener);

    const endHandle = trimHandles.shadowRoot?.querySelector(".handle-end") as HTMLElement;
    const rect = container.getBoundingClientRect();
    const rightEdge = rect.left + rect.width;

    const pointerDownEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: rightEdge - 10,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    endHandle.dispatchEvent(pointerDownEvent);
    await trimHandles.updateComplete;

    const pointerMoveEvent = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: rightEdge + 90000,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    endHandle.dispatchEvent(pointerMoveEvent);
    await trimHandles.updateComplete;

    expect(trimChanges.length).toBeGreaterThan(0);
    const lastChange = trimChanges[trimChanges.length - 1];
    expect(lastChange.newValueMs).toBeLessThanOrEqual(trimHandles.intrinsicDurationMs - trimHandles.trimStartMs);
  }, 1000);

  test("should dispatch trim-change-end event when drag ends", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "400px";
    container.style.height = "100px";
    document.body.appendChild(container);

    const trimHandles = document.createElement("ef-trim-handles") as EFTrimHandles;
    trimHandles.elementId = nextId();
    trimHandles.pixelsPerMs = 0.1;
    trimHandles.trimStartMs = 0;
    trimHandles.trimEndMs = 0;
    trimHandles.intrinsicDurationMs = 10000;
    container.appendChild(trimHandles);

    await trimHandles.updateComplete;

    let trimChangeEndDetail: { elementId: string; type: "start" | "end" } | null = null;
    trimHandles.addEventListener("trim-change-end", ((e: CustomEvent) => {
      trimChangeEndDetail = e.detail;
    }) as EventListener);

    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;
    const rect = container.getBoundingClientRect();

    const pointerDownEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 10,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    startHandle.dispatchEvent(pointerDownEvent);
    await trimHandles.updateComplete;

    const pointerUpEvent = new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
    });

    startHandle.dispatchEvent(pointerUpEvent);
    await trimHandles.updateComplete;

    expect(trimChangeEndDetail).toBeTruthy();
    expect(trimChangeEndDetail?.elementId).toBe(trimHandles.elementId);
    expect(trimChangeEndDetail?.type).toBe("start");
  }, 1000);

  test("should prevent trimStartMs from going below 0", async () => {
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "400px";
    container.style.height = "100px";
    document.body.appendChild(container);

    const trimHandles = document.createElement("ef-trim-handles") as EFTrimHandles;
    trimHandles.elementId = nextId();
    trimHandles.pixelsPerMs = 0.1;
    trimHandles.trimStartMs = 1000;
    trimHandles.trimEndMs = 0;
    trimHandles.intrinsicDurationMs = 10000;
    container.appendChild(trimHandles);

    await trimHandles.updateComplete;

    const trimChanges: TrimChangeDetail[] = [];
    trimHandles.addEventListener("trim-change", ((e: CustomEvent<TrimChangeDetail>) => {
      trimChanges.push(e.detail);
    }) as EventListener);

    const startHandle = trimHandles.shadowRoot?.querySelector(".handle-start") as HTMLElement;
    const rect = container.getBoundingClientRect();

    const pointerDownEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 10,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    startHandle.dispatchEvent(pointerDownEvent);
    await trimHandles.updateComplete;

    const pointerMoveEvent = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left - 20000,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    startHandle.dispatchEvent(pointerMoveEvent);
    await trimHandles.updateComplete;

    expect(trimChanges.length).toBeGreaterThan(0);
    const lastChange = trimChanges[trimChanges.length - 1];
    expect(lastChange.newValueMs).toBeGreaterThanOrEqual(0);
  }, 1000);
});

