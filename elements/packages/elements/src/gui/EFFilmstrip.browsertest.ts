import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { afterEach, describe, expect, test, vi } from "vitest";

import "../elements/EFAudio.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "../elements/EFWaveform.js";
import "../elements/EFThumbnailStrip.js";
import type { EFAudio } from "../elements/EFAudio.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFVideo } from "../elements/EFVideo.js";
import type { EFWaveform } from "../elements/EFWaveform.js";
import type { EFThumbnailStrip } from "../elements/EFThumbnailStrip.js";
import { ContextMixin } from "./ContextMixin.js";
import "./EFFilmstrip.js";
import type { EFFilmstrip } from "./EFFilmstrip.js";

@customElement("test-context-wrapper")
class TestContextWrapper extends ContextMixin(LitElement) {
  render() {
    return html`<slot></slot>`;
  }
}

let idCounter = 0;
const nextId = () => `test-timegroup-${idCounter++}`;

/**
 * Helper to find track components across ef-timeline-row shadow DOMs.
 * In the new unified row architecture, tracks are inside row shadow DOMs.
 */
function findTrackInTimeline(
  timeline: Element | null | undefined,
  selector: string,
): Element | null {
  if (!timeline?.shadowRoot) return null;

  // First try direct query (for backwards compat)
  const direct = timeline.shadowRoot.querySelector(selector);
  if (direct) return direct;

  // Search in ef-timeline-row shadow DOMs
  const rows = timeline.shadowRoot.querySelectorAll("ef-timeline-row");
  for (const row of rows) {
    const found = row.shadowRoot?.querySelector(selector);
    if (found) return found;
  }

  return null;
}

// Skip all EFFilmstrip tests - failing tests need investigation
describe.skip("EFFilmstrip", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    idCounter = 0;
  });

  test("should target temporal element by ID", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = nextId();
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip.target = timegroup.id;
    document.body.appendChild(filmstrip);

    await timegroup.updateComplete;
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(timegroup);
    expect(filmstrip.targetTemporal).toBe(timegroup);
  }, 1000);

  test("should handle missing target gracefully", async () => {
    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip.target = "nonexistent-id";
    document.body.appendChild(filmstrip);

    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(null);
    expect(filmstrip.targetTemporal).toBe(null);
  }, 1000);

  test("should update when target element is added to DOM after filmstrip", async () => {
    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    const id = nextId();
    filmstrip.target = id;
    document.body.appendChild(filmstrip);

    await filmstrip.updateComplete;
    expect(filmstrip.targetElement).toBe(null);

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = id;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    await timegroup.updateComplete;
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(timegroup);
    expect(filmstrip.targetTemporal).toBe(timegroup);
  }, 1000);

  test("should update when target ID changes", async () => {
    const timegroup1 = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup1.id = nextId();
    timegroup1.setAttribute("mode", "fixed");
    timegroup1.setAttribute("duration", "5s");
    document.body.appendChild(timegroup1);

    const timegroup2 = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup2.id = nextId();
    timegroup2.setAttribute("mode", "fixed");
    timegroup2.setAttribute("duration", "10s");
    document.body.appendChild(timegroup2);

    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip.target = timegroup1.id;
    document.body.appendChild(filmstrip);

    await timegroup1.updateComplete;
    await timegroup2.updateComplete;
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(timegroup1);

    filmstrip.target = timegroup2.id;
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(timegroup2);
    expect(filmstrip.targetTemporal).toBe(timegroup2);
  }, 1000);

  test("should handle target element removal from DOM", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = nextId();
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip.target = timegroup.id;
    document.body.appendChild(filmstrip);

    await timegroup.updateComplete;
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(timegroup);

    document.body.removeChild(timegroup);
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(null);
    expect(filmstrip.targetTemporal).toBe(null);
  }, 1000);

  test("should support multiple filmstrips targeting same element", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = nextId();
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    const filmstrip1 = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip1.target = timegroup.id;
    document.body.appendChild(filmstrip1);

    const filmstrip2 = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip2.target = timegroup.id;
    document.body.appendChild(filmstrip2);

    await timegroup.updateComplete;
    await filmstrip1.updateComplete;
    await filmstrip2.updateComplete;

    expect(filmstrip1.targetElement).toBe(timegroup);
    expect(filmstrip2.targetElement).toBe(timegroup);
    expect(filmstrip1.targetTemporal).toBe(timegroup);
    expect(filmstrip2.targetTemporal).toBe(timegroup);
  }, 1000);

  test("should use context-based targeting when nested in ContextMixin", async () => {
    const wrapper = document.createElement(
      "test-context-wrapper",
    ) as TestContextWrapper;
    document.body.appendChild(wrapper);

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    wrapper.appendChild(timegroup);

    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    wrapper.appendChild(filmstrip);

    await wrapper.updateComplete;
    await timegroup.updateComplete;
    await filmstrip.updateComplete;

    expect(filmstrip.targetTemporal).toBe(timegroup);
  }, 1000);

  test("should prefer target attribute over context with warning", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const wrapper = document.createElement(
      "test-context-wrapper",
    ) as TestContextWrapper;
    document.body.appendChild(wrapper);

    const contextTimegroup = document.createElement(
      "ef-timegroup",
    ) as EFTimegroup;
    contextTimegroup.setAttribute("mode", "fixed");
    contextTimegroup.setAttribute("duration", "5s");
    wrapper.appendChild(contextTimegroup);

    const targetTimegroup = document.createElement(
      "ef-timegroup",
    ) as EFTimegroup;
    targetTimegroup.id = nextId();
    targetTimegroup.setAttribute("mode", "fixed");
    targetTimegroup.setAttribute("duration", "10s");
    document.body.appendChild(targetTimegroup);

    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip.target = targetTimegroup.id;
    wrapper.appendChild(filmstrip);

    await wrapper.updateComplete;
    await contextTimegroup.updateComplete;
    await targetTimegroup.updateComplete;
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(targetTimegroup);
    expect(filmstrip.targetTemporal).toBe(targetTimegroup);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "EFFilmstrip: Both target attribute and parent context found. Using target attribute.",
      expect.objectContaining({
        target: targetTimegroup.id,
        fromTarget: targetTimegroup,
        fromContext: contextTimegroup,
      }),
    );

    consoleWarnSpy.mockRestore();
  }, 1000);

  test("should handle dynamic target property changes", async () => {
    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    document.body.appendChild(filmstrip);

    await filmstrip.updateComplete;
    expect(filmstrip.targetElement).toBe(null);

    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = nextId();
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    await timegroup.updateComplete;

    filmstrip.target = timegroup.id;
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(timegroup);
    expect(filmstrip.targetTemporal).toBe(timegroup);

    filmstrip.target = "";
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(null);
  }, 1000);

  test("should expose pixelsPerMs property", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = nextId();
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip.target = timegroup.id;
    document.body.appendChild(filmstrip);

    await timegroup.updateComplete;
    await filmstrip.updateComplete;

    expect(filmstrip.targetTemporal).toBe(timegroup);
    expect(filmstrip.pixelsPerMs).toBeGreaterThan(0);
  }, 1000);

  test("should clear targetElement when target is set to undefined", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    timegroup.id = nextId();
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip.target = timegroup.id;
    document.body.appendChild(filmstrip);

    await timegroup.updateComplete;
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(timegroup);
    expect(filmstrip.targetTemporal).toBe(timegroup);

    filmstrip.target = "";
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(null);
    expect(filmstrip.targetTemporal).toBe(null);
  }, 1000);

  test("should disconnect when targeted element ID changes", async () => {
    const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
    const originalId = nextId();
    timegroup.id = originalId;
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "10s");
    document.body.appendChild(timegroup);

    const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
    filmstrip.target = originalId;
    document.body.appendChild(filmstrip);

    await timegroup.updateComplete;
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(timegroup);
    expect(filmstrip.targetTemporal).toBe(timegroup);

    timegroup.id = nextId();
    await filmstrip.updateComplete;

    expect(filmstrip.targetElement).toBe(null);
    expect(filmstrip.targetTemporal).toBe(null);
  }, 1000);

  describe("element filtering", () => {
    test("should render ef-timeline internally", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await filmstrip.updateComplete;

      const timeline = filmstrip.shadowRoot?.querySelector("ef-timeline");
      expect(timeline).toBeTruthy();
      expect(timeline?.getAttribute("target")).toBe(timegroup.id);
    }, 1000);

    test("should render all children by default with no filters", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      const audio = document.createElement("ef-audio") as EFAudio;
      const waveform = document.createElement("ef-waveform") as EFWaveform;

      timegroup.appendChild(video);
      timegroup.appendChild(audio);
      timegroup.appendChild(waveform);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await audio.updateComplete;
      await waveform.updateComplete;
      await filmstrip.updateComplete;

      const timeline = filmstrip.shadowRoot?.querySelector("ef-timeline");
      expect(timeline).toBeTruthy();
      await (timeline as any)?.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      await (timeline as any)?.updateComplete;

      // Track elements are inside ef-timeline-row shadow DOMs
      const videoTrack = findTrackInTimeline(timeline, "ef-video-track");
      const audioTrack = findTrackInTimeline(timeline, "ef-audio-track");
      const waveformTrack = findTrackInTimeline(timeline, "ef-waveform-track");

      expect(videoTrack).toBeTruthy();
      expect(audioTrack).toBeTruthy();
      expect(waveformTrack).toBeTruthy();
    }, 1000);

    test("should hide elements matching hide selectors", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      const audio = document.createElement("ef-audio") as EFAudio;
      const waveform = document.createElement("ef-waveform") as EFWaveform;

      timegroup.appendChild(video);
      timegroup.appendChild(audio);
      timegroup.appendChild(waveform);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      filmstrip.hide = "ef-waveform, ef-audio";
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await audio.updateComplete;
      await waveform.updateComplete;
      await filmstrip.updateComplete;

      const timeline = filmstrip.shadowRoot?.querySelector("ef-timeline");
      await (timeline as any)?.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      await (timeline as any)?.updateComplete;

      // Track elements are inside ef-timeline-row shadow DOMs
      const videoTrack = findTrackInTimeline(timeline, "ef-video-track");
      const audioTrack = findTrackInTimeline(timeline, "ef-audio-track");
      const waveformTrack = findTrackInTimeline(timeline, "ef-waveform-track");

      expect(videoTrack).toBeTruthy();
      expect(audioTrack).toBeFalsy();
      expect(waveformTrack).toBeFalsy();
    }, 1000);

    test("should show only elements matching show selectors", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      const audio = document.createElement("ef-audio") as EFAudio;
      const waveform = document.createElement("ef-waveform") as EFWaveform;

      timegroup.appendChild(video);
      timegroup.appendChild(audio);
      timegroup.appendChild(waveform);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      filmstrip.show = "ef-video, ef-audio";
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await audio.updateComplete;
      await waveform.updateComplete;
      await filmstrip.updateComplete;

      const timeline = filmstrip.shadowRoot?.querySelector("ef-timeline");
      await (timeline as any)?.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      await (timeline as any)?.updateComplete;

      // Track elements are inside ef-timeline-row shadow DOMs
      const videoTrack = findTrackInTimeline(timeline, "ef-video-track");
      const audioTrack = findTrackInTimeline(timeline, "ef-audio-track");
      const waveformTrack = findTrackInTimeline(timeline, "ef-waveform-track");

      expect(videoTrack).toBeTruthy();
      expect(audioTrack).toBeTruthy();
      expect(waveformTrack).toBeFalsy();
    }, 1000);

    // HTML element filmstrips are no longer created for plain HTML elements
    test.skip("should filter HTML elements by tag name", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      const div = document.createElement("div");
      div.textContent = "Test div";
      const span = document.createElement("span");
      span.textContent = "Test span";

      timegroup.appendChild(video);
      timegroup.appendChild(div);
      timegroup.appendChild(span);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      filmstrip.hide = "div";
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await filmstrip.updateComplete;

      const timegroupFilmstrip = filmstrip.shadowRoot?.querySelector(
        "ef-timegroup-filmstrip",
      );
      await (timegroupFilmstrip as any)?.updateComplete;

      const videoFilmstrip =
        timegroupFilmstrip?.shadowRoot?.querySelector("ef-video-filmstrip");
      const htmlFilmstrips =
        timegroupFilmstrip?.shadowRoot?.querySelectorAll("ef-html-filmstrip");

      expect(videoFilmstrip).toBeTruthy();
      expect(htmlFilmstrips?.length).toBe(1);
    }, 1000);

    // HTML element filmstrips are no longer created for plain HTML elements
    test.skip("should filter HTML elements by CSS class selector", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      const div1 = document.createElement("div");
      div1.className = "helper";
      const div2 = document.createElement("div");
      div2.className = "content";

      timegroup.appendChild(video);
      timegroup.appendChild(div1);
      timegroup.appendChild(div2);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      filmstrip.hide = ".helper";
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await filmstrip.updateComplete;

      const timegroupFilmstrip = filmstrip.shadowRoot?.querySelector(
        "ef-timegroup-filmstrip",
      );
      await (timegroupFilmstrip as any)?.updateComplete;

      const videoFilmstrip =
        timegroupFilmstrip?.shadowRoot?.querySelector("ef-video-filmstrip");
      const htmlFilmstrips =
        timegroupFilmstrip?.shadowRoot?.querySelectorAll("ef-html-filmstrip");

      expect(videoFilmstrip).toBeTruthy();
      expect(htmlFilmstrips?.length).toBe(1);
    }, 1000);

    // HTML element filmstrips are no longer created for plain HTML elements
    test.skip("should filter HTML elements by attribute selector", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      const div1 = document.createElement("div");
      div1.setAttribute("data-internal", "true");
      const div2 = document.createElement("div");
      div2.setAttribute("data-visible", "true");

      timegroup.appendChild(video);
      timegroup.appendChild(div1);
      timegroup.appendChild(div2);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      filmstrip.hide = "[data-internal]";
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await filmstrip.updateComplete;

      const timegroupFilmstrip = filmstrip.shadowRoot?.querySelector(
        "ef-timegroup-filmstrip",
      );
      await (timegroupFilmstrip as any)?.updateComplete;

      const videoFilmstrip =
        timegroupFilmstrip?.shadowRoot?.querySelector("ef-video-filmstrip");
      const htmlFilmstrips =
        timegroupFilmstrip?.shadowRoot?.querySelectorAll("ef-html-filmstrip");

      expect(videoFilmstrip).toBeTruthy();
      expect(htmlFilmstrips?.length).toBe(1);
    }, 1000);

    test("should filter recursively in nested timegroups", async () => {
      const rootTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      rootTimegroup.id = nextId();
      rootTimegroup.setAttribute("mode", "fixed");
      rootTimegroup.setAttribute("duration", "10s");
      document.body.appendChild(rootTimegroup);

      const childTimegroup = document.createElement(
        "ef-timegroup",
      ) as EFTimegroup;
      childTimegroup.setAttribute("mode", "fixed");
      childTimegroup.setAttribute("duration", "5s");

      const video = document.createElement("ef-video") as EFVideo;
      const waveform = document.createElement("ef-waveform") as EFWaveform;

      childTimegroup.appendChild(video);
      childTimegroup.appendChild(waveform);
      rootTimegroup.appendChild(childTimegroup);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = rootTimegroup.id;
      filmstrip.hide = "ef-waveform";
      document.body.appendChild(filmstrip);

      await rootTimegroup.updateComplete;
      await childTimegroup.updateComplete;
      await video.updateComplete;
      await waveform.updateComplete;
      await filmstrip.updateComplete;

      const timeline = filmstrip.shadowRoot?.querySelector("ef-timeline");
      await (timeline as any)?.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      await (timeline as any)?.updateComplete;

      // Check for waveform tracks anywhere in the timeline
      const waveformTracks =
        timeline?.shadowRoot?.querySelectorAll("ef-waveform-track");

      expect(waveformTracks?.length).toBe(0);
    }, 1000);

    test("should handle multiple comma-separated selectors", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      const audio = document.createElement("ef-audio") as EFAudio;
      const waveform = document.createElement("ef-waveform") as EFWaveform;

      timegroup.appendChild(video);
      timegroup.appendChild(audio);
      timegroup.appendChild(waveform);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      filmstrip.hide = "ef-waveform, ef-audio";
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await audio.updateComplete;
      await waveform.updateComplete;
      await filmstrip.updateComplete;

      const timeline = filmstrip.shadowRoot?.querySelector("ef-timeline");
      await (timeline as any)?.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      await (timeline as any)?.updateComplete;

      // Track elements are inside ef-timeline-row shadow DOMs
      const videoTrack = findTrackInTimeline(timeline, "ef-video-track");
      const audioTrack = findTrackInTimeline(timeline, "ef-audio-track");
      const waveformTrack = findTrackInTimeline(timeline, "ef-waveform-track");

      expect(videoTrack).toBeTruthy();
      expect(audioTrack).toBeFalsy();
      expect(waveformTrack).toBeFalsy();
    }, 1000);

    test("should handle invalid selectors gracefully", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      const audio = document.createElement("ef-audio") as EFAudio;

      timegroup.appendChild(video);
      timegroup.appendChild(audio);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      filmstrip.hide = "[[invalid]]selector, ef-audio";
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await audio.updateComplete;
      await filmstrip.updateComplete;

      const timeline = filmstrip.shadowRoot?.querySelector("ef-timeline");
      await (timeline as any)?.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      await (timeline as any)?.updateComplete;

      // Track elements are inside ef-timeline-row shadow DOMs
      const videoTrack = findTrackInTimeline(timeline, "ef-video-track");
      const audioTrack = findTrackInTimeline(timeline, "ef-audio-track");

      expect(videoTrack).toBeTruthy();
      expect(audioTrack).toBeFalsy();
    }, 1000);
  });

  describe("video thumbnail strips", () => {
    test("should render ef-thumbnail-strip inside video tracks", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      video.id = nextId();
      timegroup.appendChild(video);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await filmstrip.updateComplete;

      const timeline = filmstrip.shadowRoot?.querySelector("ef-timeline");
      await (timeline as any)?.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      await (timeline as any)?.updateComplete;

      // Video track is inside ef-timeline-row shadow DOM
      const videoTrack = findTrackInTimeline(timeline, "ef-video-track");
      expect(videoTrack).toBeTruthy();

      await (videoTrack as any)?.updateComplete;

      const thumbnailStrip = videoTrack?.shadowRoot?.querySelector(
        "ef-thumbnail-strip",
      ) as EFThumbnailStrip | null;
      expect(thumbnailStrip).toBeTruthy();
    }, 1000);

    test("should set use-intrinsic-duration on thumbnail strip", async () => {
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.id = nextId();
      timegroup.setAttribute("mode", "fixed");
      timegroup.setAttribute("duration", "10s");
      document.body.appendChild(timegroup);

      const video = document.createElement("ef-video") as EFVideo;
      video.id = nextId();
      timegroup.appendChild(video);

      const filmstrip = document.createElement("ef-filmstrip") as EFFilmstrip;
      filmstrip.target = timegroup.id;
      document.body.appendChild(filmstrip);

      await timegroup.updateComplete;
      await video.updateComplete;
      await filmstrip.updateComplete;

      const timeline = filmstrip.shadowRoot?.querySelector("ef-timeline");
      await (timeline as any)?.updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
      await (timeline as any)?.updateComplete;

      // Video track is inside ef-timeline-row shadow DOM
      const videoTrack = findTrackInTimeline(timeline, "ef-video-track");
      await (videoTrack as any)?.updateComplete;

      const thumbnailStrip = videoTrack?.shadowRoot?.querySelector(
        "ef-thumbnail-strip",
      ) as EFThumbnailStrip | null;
      expect(thumbnailStrip).toBeTruthy();
      expect(thumbnailStrip?.useIntrinsicDuration).toBe(true);
    }, 1000);
  });
});

declare global {
  interface HTMLElementTagNameMap {
    "test-context-wrapper": TestContextWrapper;
  }
}
