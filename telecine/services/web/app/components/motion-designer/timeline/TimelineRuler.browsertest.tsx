import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { TimelineRuler } from "@editframe/react";

const testElements: HTMLElement[] = [];

afterEach(() => {
  testElements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  testElements.length = 0;
});

describe("TimelineRuler", () => {
  test("renders time markers at correct positions", async () => {
    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = "1000px";
    scrollContainer.style.height = "32px";
    scrollContainer.style.overflow = "auto";
    scrollContainer.style.position = "relative";
    document.body.appendChild(scrollContainer);
    testElements.push(scrollContainer);

    const { container } = render(
      <TimelineRuler
        durationMs={5000}
        zoomScale={1.0}
        containerWidth={1000}
        fps={30}
        scrollContainerRef={{ current: scrollContainer }}
      />,
      { container: scrollContainer },
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const rulerElement = container.querySelector("ef-timeline-ruler");
    expect(rulerElement).toBeTruthy();

    const markers = rulerElement?.shadowRoot?.querySelectorAll(".marker");
    expect(markers?.length).toBeGreaterThan(0);

    const firstMarker = markers?.[0] as HTMLElement;
    expect(firstMarker).toBeTruthy();
    const leftValue = firstMarker.style.left;
    expect(leftValue).toMatch(/^\d+px$/);
  });

  test("time markers show correct time labels", async () => {
    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = "1000px";
    scrollContainer.style.height = "32px";
    scrollContainer.style.overflow = "auto";
    scrollContainer.style.position = "relative";
    document.body.appendChild(scrollContainer);
    testElements.push(scrollContainer);

    const { container } = render(
      <TimelineRuler
        durationMs={5000}
        zoomScale={1.0}
        containerWidth={1000}
        fps={30}
        scrollContainerRef={{ current: scrollContainer }}
      />,
      { container: scrollContainer },
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const rulerElement = container.querySelector("ef-timeline-ruler");
    const timeLabels = Array.from(
      rulerElement?.shadowRoot?.querySelectorAll(".label") || [],
    ).map((el) => el.textContent);

    expect(timeLabels.length).toBeGreaterThan(0);
    expect(timeLabels[0]).toMatch(/^\d+(\.\d+)?s$/);
  });

  test("renders canvas for frame markers when zoomed in", async () => {
    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = "1000px";
    scrollContainer.style.height = "32px";
    scrollContainer.style.overflow = "auto";
    scrollContainer.style.position = "relative";
    document.body.appendChild(scrollContainer);
    testElements.push(scrollContainer);

    const { container } = render(
      <TimelineRuler
        durationMs={5000}
        zoomScale={10.0}
        containerWidth={1000}
        fps={30}
        scrollContainerRef={{ current: scrollContainer }}
      />,
      { container: scrollContainer },
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const rulerElement = container.querySelector("ef-timeline-ruler");
    const canvas = rulerElement?.shadowRoot?.querySelector("canvas");
    expect(canvas).toBeTruthy();
  });

  test("does not render canvas for frame markers when not zoomed enough", async () => {
    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = "1000px";
    scrollContainer.style.height = "32px";
    scrollContainer.style.overflow = "auto";
    scrollContainer.style.position = "relative";
    document.body.appendChild(scrollContainer);
    testElements.push(scrollContainer);

    const { container } = render(
      <TimelineRuler
        durationMs={5000}
        zoomScale={1.0}
        containerWidth={1000}
        fps={30}
        scrollContainerRef={{ current: scrollContainer }}
      />,
      { container: scrollContainer },
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const rulerElement = container.querySelector("ef-timeline-ruler");
    const canvas = rulerElement?.shadowRoot?.querySelector("canvas");
    expect(canvas).toBeFalsy();
  });

  test("returns empty when duration is zero or negative", async () => {
    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = "1000px";
    scrollContainer.style.height = "32px";
    scrollContainer.style.overflow = "auto";
    scrollContainer.style.position = "relative";
    document.body.appendChild(scrollContainer);
    testElements.push(scrollContainer);

    const { container: container1 } = render(
      <TimelineRuler
        durationMs={0}
        zoomScale={1.0}
        containerWidth={1000}
        fps={30}
        scrollContainerRef={{ current: scrollContainer }}
      />,
      { container: scrollContainer },
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const rulerElement1 = container1.querySelector("ef-timeline-ruler");
    const markers1 = rulerElement1?.shadowRoot?.querySelectorAll(".marker");
    expect(markers1?.length).toBe(0);

    const { container: container2 } = render(
      <TimelineRuler
        durationMs={-100}
        zoomScale={1.0}
        containerWidth={1000}
        fps={30}
        scrollContainerRef={{ current: scrollContainer }}
      />,
      { container: scrollContainer },
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const rulerElement2 = container2.querySelector("ef-timeline-ruler");
    const markers2 = rulerElement2?.shadowRoot?.querySelectorAll(".marker");
    expect(markers2?.length).toBe(0);
  });

  test("time markers are positioned correctly with zoom", async () => {
    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = "1000px";
    scrollContainer.style.height = "32px";
    scrollContainer.style.overflow = "auto";
    scrollContainer.style.position = "relative";
    document.body.appendChild(scrollContainer);
    testElements.push(scrollContainer);

    const { container } = render(
      <TimelineRuler
        durationMs={5000}
        zoomScale={2.0}
        containerWidth={1000}
        fps={30}
        scrollContainerRef={{ current: scrollContainer }}
      />,
      { container: scrollContainer },
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const rulerElement = container.querySelector("ef-timeline-ruler");
    const markers = Array.from(
      rulerElement?.shadowRoot?.querySelectorAll(".marker") || [],
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
    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = "1000px";
    scrollContainer.style.height = "32px";
    scrollContainer.style.overflow = "auto";
    scrollContainer.style.position = "relative";
    document.body.appendChild(scrollContainer);
    testElements.push(scrollContainer);

    const { container } = render(
      <TimelineRuler
        durationMs={5000}
        zoomScale={1.0}
        containerWidth={1000}
        fps={30}
        scrollContainerRef={{ current: scrollContainer }}
      />,
      { container: scrollContainer },
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const rulerElement = container.querySelector("ef-timeline-ruler");
    const tickMarks = rulerElement?.shadowRoot?.querySelectorAll(".tick");
    expect(tickMarks?.length).toBeGreaterThan(0);

    const firstTick = tickMarks?.[0] as HTMLElement;
    expect(firstTick).toBeTruthy();
    expect(firstTick.classList.contains("tick")).toBe(true);
  });
});

