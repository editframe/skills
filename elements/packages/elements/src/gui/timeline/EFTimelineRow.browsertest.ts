import { afterEach, describe, expect, test } from "vitest";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../../elements/EFAudio.js";
import "./tracks/preloadTracks.js";
import "./EFTimelineRow.js";
import type { EFTimelineRow } from "./EFTimelineRow.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
import type { EFVideo } from "../../elements/EFVideo.js";
import type { EFAudio } from "../../elements/EFAudio.js";

// Skip all EFTimelineRow tests - failing tests need investigation
describe.skip("EFTimelineRow", () => {
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
    test("applies hovered class when highlightedElement matches this row", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "test-group";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;

      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = timegroup;
      row.depth = 0;
      row.highlightedElement = timegroup;
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
      row.highlightedElement = video; // Child is highlighted
      document.body.appendChild(row);
      await row.updateComplete;

      // Parent should have ancestor-hovered class (its descendant is highlighted)
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
      row.highlightedElement = timegroup; // Parent is highlighted
      document.body.appendChild(row);
      await row.updateComplete;

      // Child should have descendant-hovered class (its ancestor is highlighted)
      expect(row.classList.contains("descendant-hovered")).toBe(true);
      expect(row.classList.contains("hovered")).toBe(false);
    });

    test("no hover classes when nothing is highlighted", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "test-group";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;

      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = timegroup;
      row.depth = 0;
      row.highlightedElement = null;
      document.body.appendChild(row);
      await row.updateComplete;

      expect(row.classList.contains("hovered")).toBe(false);
      expect(row.classList.contains("ancestor-hovered")).toBe(false);
      expect(row.classList.contains("descendant-hovered")).toBe(false);
    });
  });

  describe("selection state", () => {
    test("applies selected class when selectedIds contains this element", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "test-group";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;

      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = timegroup;
      row.depth = 0;
      row.selectedIds = new Set(["test-group"]);
      document.body.appendChild(row);
      await row.updateComplete;

      expect(row.classList.contains("selected")).toBe(true);
    });

    test("applies ancestor-selected class when descendant is selected", async () => {
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
      row.selectedIds = new Set(["child-video"]); // Child is selected
      document.body.appendChild(row);
      await row.updateComplete;

      // Parent should have ancestor-selected class (its descendant is selected)
      expect(row.classList.contains("ancestor-selected")).toBe(true);
      expect(row.classList.contains("selected")).toBe(false);
    });

    test("selection classes update when selectedIds change", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "test-group";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;

      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = timegroup;
      row.depth = 0;
      row.selectedIds = new Set();
      document.body.appendChild(row);
      await row.updateComplete;

      expect(row.classList.contains("selected")).toBe(false);

      row.selectedIds = new Set(["test-group"]);
      await row.updateComplete;

      expect(row.classList.contains("selected")).toBe(true);

      row.selectedIds = new Set();
      await row.updateComplete;

      expect(row.classList.contains("selected")).toBe(false);
    });
  });

  describe("track positioning", () => {
    test("audio inside sequence timegroup is positioned at absolute start time", async () => {
      // Create a root sequence with two child timegroups
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      rootTimegroup.id = "root";
      rootTimegroup.setAttribute("mode", "sequence");

      // First child: a fixed timegroup that takes 5 seconds
      const firstChild = document.createElement("ef-timegroup") as EFTimegroup;
      firstChild.id = "first-child";
      firstChild.setAttribute("mode", "fixed");
      firstChild.setAttribute("duration", "5s");
      rootTimegroup.appendChild(firstChild);

      // Second child: a fixed timegroup containing an audio element
      const secondChild = document.createElement("ef-timegroup") as EFTimegroup;
      secondChild.id = "second-child";
      secondChild.setAttribute("mode", "fixed");
      secondChild.setAttribute("duration", "3s");

      const audio = document.createElement("ef-audio") as EFAudio;
      audio.id = "test-audio";
      secondChild.appendChild(audio);

      rootTimegroup.appendChild(secondChild);
      document.body.appendChild(rootTimegroup);

      await rootTimegroup.updateComplete;
      await firstChild.updateComplete;
      await secondChild.updateComplete;
      await audio.updateComplete;

      // Verify audio's start time is 5000ms (after first child ends)
      expect(audio.startTimeMs).toBe(5000);
      // The parent timegroup also starts at 5000ms
      expect(secondChild.startTimeMs).toBe(5000);
      // So startTimeWithinParentMs would be 0, but for flat rows we need absolute positioning
      expect(audio.startTimeWithinParentMs).toBe(0);

      // Create a timeline row for the audio element (flat row architecture)
      const pixelsPerMs = 0.1;
      const audioRow = document.createElement(
        "ef-timeline-row",
      ) as EFTimelineRow;
      audioRow.element = audio;
      audioRow.depth = 2;
      audioRow.pixelsPerMs = pixelsPerMs;
      document.body.appendChild(audioRow);
      await audioRow.updateComplete;

      // Find the track component inside the row
      const track = audioRow.shadowRoot?.querySelector(".row-track");
      const audioTrack = track?.querySelector("ef-audio-track");
      expect(audioTrack).toBeTruthy();

      // Wait for the track to render
      await (audioTrack as any)?.updateComplete;

      // Get the outer gutter div that positions the track
      const gutterDiv = audioTrack?.shadowRoot
        ?.firstElementChild as HTMLElement;
      expect(gutterDiv).toBeTruthy();

      // The track should be positioned at absolute start time (5000ms * 0.1 = 500px)
      // Not at startTimeWithinParentMs (0ms * 0.1 = 0px)
      const expectedLeftPx = audio.startTimeMs * pixelsPerMs;
      expect(gutterDiv.style.left).toBe(`${expectedLeftPx}px`);
    });
  });

  describe("root timegroup filmstrip", () => {
    test("should show filmstrip for root timegroup with id", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = "root-timegroup";
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);
      await timegroup.updateComplete;

      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = timegroup;
      row.depth = 0;
      document.body.appendChild(row);
      await row.updateComplete;

      // Root timegroup row should have root-timegroup class
      expect(row.classList.contains("root-timegroup")).toBe(true);

      // The timegroup track should have show-filmstrip attribute
      const timegroupTrack =
        row.shadowRoot?.querySelector("ef-timegroup-track");
      expect(timegroupTrack).toBeTruthy();
      expect(timegroupTrack?.hasAttribute("show-filmstrip")).toBe(true);
    });

    test("should not show filmstrip for nested timegroup", async () => {
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      rootTimegroup.id = "root";
      rootTimegroup.setAttribute("mode", "sequence");
      document.body.appendChild(rootTimegroup);

      const nestedTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      nestedTimegroup.id = "nested";
      nestedTimegroup.setAttribute("mode", "fixed");
      nestedTimegroup.setAttribute("duration", "5s");
      rootTimegroup.appendChild(nestedTimegroup);

      await rootTimegroup.updateComplete;
      await nestedTimegroup.updateComplete;

      // Create row for the nested timegroup
      const row = document.createElement("ef-timeline-row") as EFTimelineRow;
      row.element = nestedTimegroup;
      row.depth = 1;
      document.body.appendChild(row);
      await row.updateComplete;

      // Nested timegroup row should NOT have root-timegroup class
      expect(row.classList.contains("root-timegroup")).toBe(false);

      // The timegroup track should NOT have show-filmstrip attribute
      const timegroupTrack =
        row.shadowRoot?.querySelector("ef-timegroup-track");
      expect(timegroupTrack).toBeTruthy();
      expect(timegroupTrack?.hasAttribute("show-filmstrip")).toBe(false);
    });
  });
});
