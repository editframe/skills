import { afterEach, describe, expect, test } from "vitest";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../../elements/EFAudio.js";
import "./EFTimelineRow.js";
import type { EFTimelineRow } from "./EFTimelineRow.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
import type { EFVideo } from "../../elements/EFVideo.js";

describe("EFTimelineRow", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("renders label and track sections", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-group";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);
    await timegroup.updateComplete;

    const row = document.createElement("ef-timeline-row") as EFTimelineRow;
    row.element = timegroup;
    row.depth = 0;
    document.body.appendChild(row);
    await row.updateComplete;

    const label = row.shadowRoot?.querySelector(".row-label");
    const track = row.shadowRoot?.querySelector(".row-track");

    expect(label).toBeTruthy();
    expect(track).toBeTruthy();
  });

  test("displays element id or type as label", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "my-composition";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);
    await timegroup.updateComplete;

    const row = document.createElement("ef-timeline-row") as EFTimelineRow;
    row.element = timegroup;
    row.depth = 0;
    document.body.appendChild(row);
    await row.updateComplete;

    const label = row.shadowRoot?.querySelector(".row-label");
    expect(label?.textContent?.trim()).toBe("my-composition");
  });

  test("applies indentation based on depth", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-group";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);
    await timegroup.updateComplete;

    const row = document.createElement("ef-timeline-row") as EFTimelineRow;
    row.element = timegroup;
    row.depth = 2;
    document.body.appendChild(row);
    await row.updateComplete;

    const label = row.shadowRoot?.querySelector(".row-label") as HTMLElement;
    // Depth 2 should have 32px padding (2 * 16px)
    expect(label?.style.paddingLeft).toBe("32px");
  });

  test("label has sticky positioning", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-group";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);
    await timegroup.updateComplete;

    const row = document.createElement("ef-timeline-row") as EFTimelineRow;
    row.element = timegroup;
    row.depth = 0;
    document.body.appendChild(row);
    await row.updateComplete;

    const label = row.shadowRoot?.querySelector(".row-label") as HTMLElement;
    const computedStyle = window.getComputedStyle(label);
    expect(computedStyle.position).toBe("sticky");
    expect(computedStyle.left).toBe("0px");
  });

  test("renders track content via slot or child component", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = "test-group";
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);
    await timegroup.updateComplete;

    const row = document.createElement("ef-timeline-row") as EFTimelineRow;
    row.element = timegroup;
    row.depth = 0;
    row.pixelsPerMs = 0.1;
    document.body.appendChild(row);
    await row.updateComplete;

    const track = row.shadowRoot?.querySelector(".row-track");
    expect(track).toBeTruthy();
    // Track should contain the appropriate track component
    const trackComponent = track?.querySelector(
      "ef-timegroup-track, ef-video-track, ef-audio-track, ef-image-track",
    );
    expect(trackComponent).toBeTruthy();
  });

  describe("interaction state", () => {
    test("applies hovered class when hoveredElement matches this row", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "test-group";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;

      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = timegroup;
      row.depth = 0;
      row.hoveredElement = timegroup;
      document.body.appendChild(row);
      await row.updateComplete;

      expect(row.classList.contains("hovered")).toBe(true);
    });

    test("applies ancestor-hovered class when a descendant is hovered", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "parent-group";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");

      const video = document.createElement("ef-video") as EFVideo;
      video.id = "child-video";
      timegroup.appendChild(video);

      document.body.appendChild(timegroup);
      await timegroup.updateComplete;

      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = timegroup;
      row.depth = 0;
      row.hoveredElement = video; // Child is hovered
      document.body.appendChild(row);
      await row.updateComplete;

      // Parent should have ancestor-hovered class (its descendant is hovered)
      expect(row.classList.contains("ancestor-hovered")).toBe(true);
      expect(row.classList.contains("hovered")).toBe(false);
    });

    test("applies descendant-hovered class when an ancestor is hovered", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "parent-group";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");

      const video = document.createElement("ef-video") as EFVideo;
      video.id = "child-video";
      timegroup.appendChild(video);

      document.body.appendChild(timegroup);
      await timegroup.updateComplete;

      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = video;
      row.depth = 1;
      row.hoveredElement = timegroup; // Parent is hovered
      document.body.appendChild(row);
      await row.updateComplete;

      // Child should have descendant-hovered class (its ancestor is hovered)
      expect(row.classList.contains("descendant-hovered")).toBe(true);
      expect(row.classList.contains("hovered")).toBe(false);
    });

    test("no hover classes when nothing is hovered", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "test-group";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;

      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = timegroup;
      row.depth = 0;
      row.hoveredElement = null;
      document.body.appendChild(row);
      await row.updateComplete;

      expect(row.classList.contains("hovered")).toBe(false);
      expect(row.classList.contains("ancestor-hovered")).toBe(false);
      expect(row.classList.contains("descendant-hovered")).toBe(false);
    });
  });
});

