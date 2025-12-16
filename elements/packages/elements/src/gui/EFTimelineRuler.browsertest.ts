import { afterEach, describe, expect, test } from "vitest";
import "../elements/EFTimegroup.js";
import "./EFTimelineRuler.js";
import "./timeline/EFTimeline.js";
import { EFTimelineRuler } from "./EFTimelineRuler.js";
import type { EFTimeline } from "./timeline/EFTimeline.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { DEFAULT_PIXELS_PER_MS } from "./timeline/timelineStateContext.js";

const testElements: HTMLElement[] = [];

afterEach(() => {
  testElements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  testElements.length = 0;
});

function parseTransformX(element: HTMLElement): number {
  const transform = element.style.transform;
  const match = transform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
  return match ? parseFloat(match[1]) : NaN;
}

describe("EFTimelineRuler", () => {
  test("renders time labels at correct positions when timelineState provided", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    document.body.appendChild(timegroup);
    testElements.push(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = "test-timegroup";
    timeline.style.width = "1000px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);
    testElements.push(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const ruler = timeline.shadowRoot?.querySelector(
      "ef-timeline-ruler",
    ) as EFTimelineRuler;
    expect(ruler).toBeTruthy();
    await ruler.updateComplete;

    const labels = ruler.shadowRoot?.querySelectorAll(".label");
    expect(labels?.length).toBeGreaterThan(0);

    const firstLabel = labels?.[0] as HTMLElement;
    expect(firstLabel).toBeTruthy();
    const xPos = parseTransformX(firstLabel);
    expect(isNaN(xPos)).toBe(false);
  });

  test("time labels show correct time text", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    document.body.appendChild(timegroup);
    testElements.push(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = "test-timegroup";
    timeline.style.width = "1000px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);
    testElements.push(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const ruler = timeline.shadowRoot?.querySelector(
      "ef-timeline-ruler",
    ) as EFTimelineRuler;
    await ruler.updateComplete;

    const labels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    ).map((el) => el.textContent);

    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0]).toMatch(/^\d+(\.\d+)?s$/);
  });

  test("renders canvas for tick marks", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    document.body.appendChild(timegroup);
    testElements.push(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = "test-timegroup";
    timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
    timeline.style.width = "1000px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);
    testElements.push(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const ruler = timeline.shadowRoot?.querySelector(
      "ef-timeline-ruler",
    ) as EFTimelineRuler;
    await ruler.updateComplete;

    const canvas = ruler.shadowRoot?.querySelector("canvas");
    expect(canvas).toBeTruthy();
  });

  test("shows labels even when duration is zero (fills viewport)", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "0s");
    document.body.appendChild(timegroup);
    testElements.push(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = "test-timegroup";
    timeline.style.width = "1000px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);
    testElements.push(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const ruler = timeline.shadowRoot?.querySelector(
      "ef-timeline-ruler",
    ) as EFTimelineRuler;
    await ruler.updateComplete;

    // Ruler should show labels to fill the viewport regardless of content duration
    const labels = ruler.shadowRoot?.querySelectorAll(".label");
    expect(labels?.length).toBeGreaterThan(0);
  });

  test("time labels are positioned correctly with zoom", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    document.body.appendChild(timegroup);
    testElements.push(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = "test-timegroup";
    timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS * 2;
    timeline.style.width = "1000px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);
    testElements.push(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const ruler = timeline.shadowRoot?.querySelector(
      "ef-timeline-ruler",
    ) as EFTimelineRuler;
    await ruler.updateComplete;

    const labels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    )
      .map((m) => ({
        element: m as HTMLElement,
        x: parseTransformX(m as HTMLElement),
      }))
      .filter((m) => !isNaN(m.x))
      .sort((a, b) => a.x - b.x);

    expect(labels.length).toBeGreaterThan(1);

    if (labels.length > 1) {
      expect(labels[1].x).toBeGreaterThan(labels[0].x);
    }
  });

  test("ruler labels are within viewport when scrolling", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "20s");
    document.body.appendChild(timegroup);
    testElements.push(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = "test-timegroup";
    timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
    timeline.style.width = "800px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);
    testElements.push(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const tracksScroll = timeline.shadowRoot?.querySelector(
      ".tracks-scroll",
    ) as HTMLElement;
    expect(tracksScroll).toBeTruthy();

    const ruler = timeline.shadowRoot?.querySelector(
      "ef-timeline-ruler",
    ) as EFTimelineRuler;
    await ruler.updateComplete;

    const initialLabels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    );
    expect(initialLabels.length).toBeGreaterThan(0);

    const scrollPosition = 1000;
    tracksScroll.scrollLeft = scrollPosition;
    tracksScroll.dispatchEvent(new Event("scroll"));
    await timeline.updateComplete;
    await ruler.updateComplete;

    const scrolledLabels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    );
    const labelPositions = scrolledLabels
      .map((m) => {
        const viewportX = parseTransformX(m as HTMLElement);
        return { element: m, viewportX };
      })
      .filter((m) => !isNaN(m.viewportX));

    expect(labelPositions.length).toBeGreaterThan(0);

    const viewportWidth = tracksScroll.clientWidth;
    const someLabelsInViewport = labelPositions.some(
      (label) => label.viewportX >= 0 && label.viewportX <= viewportWidth,
    );
    expect(someLabelsInViewport).toBe(true);
  });

  test("ruler updates labels when scroll position changes", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "20s");
    document.body.appendChild(timegroup);
    testElements.push(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = "test-timegroup";
    timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
    timeline.style.width = "800px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);
    testElements.push(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const tracksScroll = timeline.shadowRoot?.querySelector(
      ".tracks-scroll",
    ) as HTMLElement;
    const ruler = timeline.shadowRoot?.querySelector(
      "ef-timeline-ruler",
    ) as EFTimelineRuler;
    await ruler.updateComplete;

    const pixelsPerMs = timeline.pixelsPerMs;

    tracksScroll.scrollLeft = 0;
    tracksScroll.dispatchEvent(new Event("scroll"));
    await timeline.updateComplete;
    await ruler.updateComplete;

    const initialLabels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    );
    const initialTimes = initialLabels
      .map((m) => {
        const viewportX = parseTransformX(m as HTMLElement);
        const absoluteX = viewportX + 0;
        return absoluteX / pixelsPerMs;
      })
      .filter((t) => !isNaN(t));

    const scrollPosition = 1500;
    tracksScroll.scrollLeft = scrollPosition;
    tracksScroll.dispatchEvent(new Event("scroll"));
    await timeline.updateComplete;
    await ruler.updateComplete;

    const scrolledLabels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    );
    const scrolledTimes = scrolledLabels
      .map((m) => {
        const viewportX = parseTransformX(m as HTMLElement);
        const absoluteX = viewportX + scrollPosition;
        return absoluteX / pixelsPerMs;
      })
      .filter((t) => !isNaN(t));

    expect(scrolledTimes.length).toBeGreaterThan(0);
    expect(initialTimes.length).toBeGreaterThan(0);
    const initialMinTime = Math.min(...initialTimes);
    const scrolledMinTime = Math.min(...scrolledTimes);
    expect(scrolledMinTime).toBeGreaterThan(initialMinTime);
  });

  test("virtual rendering shows labels for scrolled viewport position", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "20s");
    document.body.appendChild(timegroup);
    testElements.push(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = "test-timegroup";
    timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
    timeline.style.width = "800px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);
    testElements.push(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const tracksScroll = timeline.shadowRoot?.querySelector(
      ".tracks-scroll",
    ) as HTMLElement;
    const ruler = timeline.shadowRoot?.querySelector(
      "ef-timeline-ruler",
    ) as EFTimelineRuler;
    await ruler.updateComplete;

    const pixelsPerMs = timeline.pixelsPerMs;
    const scrollToSeconds10 = 10000 * pixelsPerMs;

    tracksScroll.scrollLeft = scrollToSeconds10;
    tracksScroll.dispatchEvent(new Event("scroll"));
    await timeline.updateComplete;
    await ruler.updateComplete;

    const labels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    );
    const labelTimes = labels
      .map((m) => {
        const viewportX = parseTransformX(m as HTMLElement);
        const absoluteX = viewportX + scrollToSeconds10;
        const timeMs = absoluteX / pixelsPerMs;
        return timeMs;
      })
      .filter((t) => !isNaN(t));

    expect(labelTimes.length).toBeGreaterThan(0);
    const minTime = Math.min(...labelTimes) / 1000;

    // Labels should start near the scroll position (around 10s)
    // and extend to fill the viewport (regardless of content duration)
    expect(minTime).toBeGreaterThanOrEqual(8);
  });

  test("ruler updates label spacing at different zoom levels", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);
    testElements.push(timegroup);

    const timeline = document.createElement("ef-timeline") as EFTimeline;
    timeline.target = "test-timegroup";
    timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS;
    timeline.style.width = "800px";
    timeline.style.height = "400px";
    document.body.appendChild(timeline);
    testElements.push(timeline);

    await timegroup.updateComplete;
    await timeline.updateComplete;

    const ruler = timeline.shadowRoot?.querySelector(
      "ef-timeline-ruler",
    ) as EFTimelineRuler;
    await ruler.updateComplete;

    const initialLabels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    );

    timeline.pixelsPerMs = DEFAULT_PIXELS_PER_MS * 3;
    await timeline.updateComplete;
    await ruler.updateComplete;

    const zoomedLabels = Array.from(
      ruler.shadowRoot?.querySelectorAll(".label") || [],
    );
    expect(zoomedLabels.length).toBeGreaterThan(0);

    const initialPositions = initialLabels
      .map((m) => parseTransformX(m as HTMLElement))
      .filter((p) => !isNaN(p))
      .sort((a, b) => a - b);
    const zoomedPositions = zoomedLabels
      .map((m) => parseTransformX(m as HTMLElement))
      .filter((p) => !isNaN(p))
      .sort((a, b) => a - b);

    if (initialPositions.length > 1 && zoomedPositions.length > 1) {
      const initialSpacing = initialPositions[1] - initialPositions[0];
      const zoomedSpacing = zoomedPositions[1] - zoomedPositions[0];
      expect(zoomedSpacing).toBeGreaterThanOrEqual(initialSpacing);
    }
  });
});
