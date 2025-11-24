import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "./EFTimelineRuler.js";
import { EFTimelineRuler } from "./EFTimelineRuler.js";

const testElements: HTMLElement[] = [];

afterEach(() => {
  testElements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  testElements.length = 0;
});

describe("EFTimelineRuler", () => {
  test("renders time markers at correct positions", async () => {
    const container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "32px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const ruler = document.createElement("ef-timeline-ruler");
    ruler.setAttribute("duration-ms", "5000");
    ruler.setAttribute("zoom-scale", "1.0");
    ruler.setAttribute("container-width", "1000");
    ruler.setAttribute("fps", "30");
    container.appendChild(ruler);
    testElements.push(ruler);

    await ruler.updateComplete;

    const markers = ruler.shadowRoot?.querySelectorAll(".marker");
    expect(markers?.length).toBeGreaterThan(0);

    const firstMarker = markers?.[0] as HTMLElement;
    expect(firstMarker).toBeTruthy();
    const leftValue = firstMarker.style.left;
    expect(leftValue).toMatch(/^\d+px$/);
  });

  test("time markers show correct time labels", async () => {
    const container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "32px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const ruler = document.createElement("ef-timeline-ruler");
    ruler.setAttribute("duration-ms", "5000");
    ruler.setAttribute("zoom-scale", "1.0");
    ruler.setAttribute("container-width", "1000");
    ruler.setAttribute("fps", "30");
    container.appendChild(ruler);
    testElements.push(ruler);

    await ruler.updateComplete;

    const labels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    ).map((el) => el.textContent);

    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0]).toMatch(/^\d+(\.\d+)?s$/);
  });

  test("renders canvas for frame markers when zoomed in", async () => {
    const container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "32px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const ruler = document.createElement("ef-timeline-ruler");
    ruler.setAttribute("duration-ms", "5000");
    ruler.setAttribute("zoom-scale", "10.0");
    ruler.setAttribute("container-width", "1000");
    ruler.setAttribute("fps", "30");
    container.appendChild(ruler);
    testElements.push(ruler);

    await ruler.updateComplete;

    const canvas = ruler.shadowRoot?.querySelector("canvas");
    expect(canvas).toBeTruthy();
  });

  test("does not render canvas for frame markers when not zoomed enough", async () => {
    const container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "32px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const ruler = document.createElement("ef-timeline-ruler");
    ruler.setAttribute("duration-ms", "5000");
    ruler.setAttribute("zoom-scale", "1.0");
    ruler.setAttribute("container-width", "1000");
    ruler.setAttribute("fps", "30");
    container.appendChild(ruler);
    testElements.push(ruler);

    await ruler.updateComplete;

    const canvas = ruler.shadowRoot?.querySelector("canvas");
    expect(canvas).toBeFalsy();
  });

  test("returns empty when duration is zero or negative", async () => {
    const container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "32px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const ruler1 = document.createElement("ef-timeline-ruler");
    ruler1.setAttribute("duration-ms", "0");
    ruler1.setAttribute("zoom-scale", "1.0");
    ruler1.setAttribute("container-width", "1000");
    ruler1.setAttribute("fps", "30");
    container.appendChild(ruler1);
    testElements.push(ruler1);

    await ruler1.updateComplete;

    const markers1 = ruler1.shadowRoot?.querySelectorAll(".marker");
    expect(markers1?.length).toBe(0);

    const ruler2 = document.createElement("ef-timeline-ruler");
    ruler2.setAttribute("duration-ms", "-100");
    ruler2.setAttribute("zoom-scale", "1.0");
    ruler2.setAttribute("container-width", "1000");
    ruler2.setAttribute("fps", "30");
    container.appendChild(ruler2);
    testElements.push(ruler2);

    await ruler2.updateComplete;

    const markers2 = ruler2.shadowRoot?.querySelectorAll(".marker");
    expect(markers2?.length).toBe(0);
  });

  test("time markers are positioned correctly with zoom", async () => {
    const container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "32px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const ruler = document.createElement("ef-timeline-ruler");
    ruler.setAttribute("duration-ms", "5000");
    ruler.setAttribute("zoom-scale", "2.0");
    ruler.setAttribute("container-width", "1000");
    ruler.setAttribute("fps", "30");
    container.appendChild(ruler);
    testElements.push(ruler);

    await ruler.updateComplete;

    const markers = Array.from(
      ruler.shadowRoot?.querySelectorAll(".marker") || [],
    )
      .map((m) => ({
        element: m as HTMLElement,
        left: parseFloat((m as HTMLElement).style.left),
      }))
      .filter((m) => !isNaN(m.left))
      .sort((a, b) => a.left - b.left);

    expect(markers.length).toBeGreaterThan(1);

    if (markers.length > 1) {
      expect(markers[1].left).toBeGreaterThan(markers[0].left);
    }
  });

  test("tick marks are rendered for each time marker", async () => {
    const container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "32px";
    container.style.position = "relative";
    document.body.appendChild(container);
    testElements.push(container);

    const ruler = document.createElement("ef-timeline-ruler");
    ruler.setAttribute("duration-ms", "5000");
    ruler.setAttribute("zoom-scale", "1.0");
    ruler.setAttribute("container-width", "1000");
    ruler.setAttribute("fps", "30");
    container.appendChild(ruler);
    testElements.push(ruler);

    await ruler.updateComplete;

    const tickMarks = ruler.shadowRoot?.querySelectorAll(".tick");
    expect(tickMarks?.length).toBeGreaterThan(0);

    const firstTick = tickMarks?.[0] as HTMLElement;
    expect(firstTick).toBeTruthy();
    expect(firstTick.classList.contains("tick")).toBe(true);
  });
});

