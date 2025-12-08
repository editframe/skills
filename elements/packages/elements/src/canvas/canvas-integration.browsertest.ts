import { afterEach, describe, expect, test } from "vitest";
import { html, render } from "lit";
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

let idCounter = 0;
const nextId = () => `test-${idCounter++}`;

describe("Canvas-Hierarchy-Timeline Integration", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    idCounter = 0;
  });

  test("should update timeline target when clicking timegroup in hierarchy", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    document.body.appendChild(container);

    const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId1 = nextId();
    timegroup1.id = timegroupId1;
    timegroup1.setAttribute("mode", "fixed");
    timegroup1.setAttribute("duration", "5s");

    const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId2 = nextId();
    timegroup2.id = timegroupId2;
    timegroup2.setAttribute("mode", "fixed");
    timegroup2.setAttribute("duration", "10s");

    render(
      html`
        <ef-pan-zoom>
          <ef-canvas id="canvas" style="width: 800px; height: 600px;">
            ${timegroup1}
            ${timegroup2}
          </ef-canvas>
        </ef-pan-zoom>
        <ef-hierarchy id="hierarchy" target="canvas"></ef-hierarchy>
        <ef-timeline id="timeline" target=${timegroupId1} style="width: 800px; height: 200px;"></ef-timeline>
      `,
      container,
    );

    const canvas = container.querySelector("#canvas") as EFCanvas;
    const hierarchy = container.querySelector("#hierarchy") as EFHierarchy;
    const timeline = container.querySelector("#timeline") as EFTimeline;

    await canvas.updateComplete;
    await timegroup1.updateComplete;
    await timegroup2.updateComplete;
    await hierarchy.updateComplete;
    await timeline.updateComplete;

    expect(timeline.target).toBe(timegroupId1);
    expect(timeline.durationMs).toBe(5000);

    const hierarchyItems = hierarchy.shadowRoot?.querySelectorAll("ef-timegroup-hierarchy-item");
    expect(hierarchyItems?.length).toBe(2);

    const secondItem = hierarchyItems?.[1];
    const itemRow = secondItem?.shadowRoot?.querySelector(".item-row") as HTMLElement;
    expect(itemRow).toBeTruthy();

    itemRow.click();
    await hierarchy.updateComplete;
    await timeline.updateComplete;

    expect(timeline.target).toBe(timegroupId2);
    expect(timeline.durationMs).toBe(10000);
  }, 1000);

  test("should fire activeTimegroupChange event with correct previous/current IDs", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    document.body.appendChild(container);

    const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId1 = nextId();
    timegroup1.id = timegroupId1;
    timegroup1.setAttribute("mode", "fixed");
    timegroup1.setAttribute("duration", "5s");

    const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId2 = nextId();
    timegroup2.id = timegroupId2;
    timegroup2.setAttribute("mode", "fixed");
    timegroup2.setAttribute("duration", "10s");

    render(
      html`
        <ef-pan-zoom>
          <ef-canvas id="canvas" style="width: 800px; height: 600px;">
            ${timegroup1}
            ${timegroup2}
          </ef-canvas>
        </ef-pan-zoom>
        <ef-hierarchy id="hierarchy" target="canvas"></ef-hierarchy>
        <ef-timeline id="timeline" style="width: 800px; height: 200px;"></ef-timeline>
      `,
      container,
    );

    const canvas = container.querySelector("#canvas") as EFCanvas;
    const hierarchy = container.querySelector("#hierarchy") as EFHierarchy;
    const timeline = container.querySelector("#timeline") as EFTimeline;

    await canvas.updateComplete;
    await timegroup1.updateComplete;
    await timegroup2.updateComplete;
    await hierarchy.updateComplete;
    await timeline.updateComplete;

    let activeTimegroupChangeDetail: { timegroupId: string | null; previousTimegroupId: string | null } | null = null;
    canvas.addEventListener("activeTimegroupChange", ((e: CustomEvent) => {
      activeTimegroupChangeDetail = e.detail;
    }) as EventListener);

    const hierarchyItems = hierarchy.shadowRoot?.querySelectorAll("ef-timegroup-hierarchy-item");
    const firstItem = hierarchyItems?.[0];
    const firstItemRow = firstItem?.shadowRoot?.querySelector(".item-row") as HTMLElement;

    firstItemRow.click();
    await hierarchy.updateComplete;

    expect(activeTimegroupChangeDetail).toBeTruthy();
    expect(activeTimegroupChangeDetail?.timegroupId).toBe(timegroupId1);
    expect(activeTimegroupChangeDetail?.previousTimegroupId).toBe(null);

    const secondItem = hierarchyItems?.[1];
    const secondItemRow = secondItem?.shadowRoot?.querySelector(".item-row") as HTMLElement;

    secondItemRow.click();
    await hierarchy.updateComplete;

    expect(activeTimegroupChangeDetail?.timegroupId).toBe(timegroupId2);
    expect(activeTimegroupChangeDetail?.previousTimegroupId).toBe(timegroupId1);
  }, 1000);

  test("should reflect correct duration when timeline target changes", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    document.body.appendChild(container);

    const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId1 = nextId();
    timegroup1.id = timegroupId1;
    timegroup1.setAttribute("mode", "fixed");
    timegroup1.setAttribute("duration", "3s");

    const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId2 = nextId();
    timegroup2.id = timegroupId2;
    timegroup2.setAttribute("mode", "fixed");
    timegroup2.setAttribute("duration", "7s");

    render(
      html`
        <ef-pan-zoom>
          <ef-canvas id="canvas" style="width: 800px; height: 600px;">
            ${timegroup1}
            ${timegroup2}
          </ef-canvas>
        </ef-pan-zoom>
        <ef-hierarchy id="hierarchy" target="canvas"></ef-hierarchy>
        <ef-timeline id="timeline" target=${timegroupId1} style="width: 800px; height: 200px;"></ef-timeline>
      `,
      container,
    );

    const timeline = container.querySelector("#timeline") as EFTimeline;

    await timegroup1.updateComplete;
    await timegroup2.updateComplete;
    await timeline.updateComplete;

    expect(timeline.durationMs).toBe(3000);

    timeline.target = timegroupId2;
    await timeline.updateComplete;

    expect(timeline.durationMs).toBe(7000);
  }, 1000);

  test("should update underlying element when trim changes on filmstrip", async () => {
    const container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    document.body.appendChild(container);

    const video = document.createElement("ef-video") as any;
    video.id = nextId();
    video.src = "../bars-n-tone2.mp4";

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    const timegroupId = nextId();
    timegroup.id = timegroupId;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    timegroup.appendChild(video);

    render(
      html`
        <ef-pan-zoom>
          <ef-canvas id="canvas" style="width: 800px; height: 600px;">
            ${timegroup}
          </ef-canvas>
        </ef-pan-zoom>
        <ef-timeline id="timeline" target=${timegroupId} enable-trim style="width: 800px; height: 200px;"></ef-timeline>
      `,
      container,
    );

    const timeline = container.querySelector("#timeline") as EFTimeline;

    await timegroup.updateComplete;
    await video.updateComplete;
    await timeline.updateComplete;

    const filmstrip = timeline.shadowRoot?.querySelector("ef-filmstrip");
    expect(filmstrip).toBeTruthy();

    await (filmstrip as any)?.updateComplete;

    const videoFilmstrip = filmstrip?.shadowRoot?.querySelector("ef-video-filmstrip");
    expect(videoFilmstrip).toBeTruthy();

    await (videoFilmstrip as any)?.updateComplete;

    const trimHandles = videoFilmstrip?.shadowRoot?.querySelector("ef-trim-handles");
    expect(trimHandles).toBeTruthy();

    const initialTrimStart = video.trimStartMs ?? 0;
    expect(initialTrimStart).toBe(0);

    let trimChangeDetail: any = null;
    trimHandles?.addEventListener("trim-change", ((e: CustomEvent) => {
      trimChangeDetail = e.detail;
    }) as EventListener);

    const startHandle = trimHandles?.shadowRoot?.querySelector(".handle-start") as HTMLElement;
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
    await timeline.updateComplete;

    const pointerMoveEvent = new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 50,
      clientY: rect.top + 50,
      pointerId: 1,
    });

    startHandle.dispatchEvent(pointerMoveEvent);
    await timeline.updateComplete;

    expect(trimChangeDetail).toBeTruthy();
    expect(trimChangeDetail?.type).toBe("start");
  }, 1000);
});



