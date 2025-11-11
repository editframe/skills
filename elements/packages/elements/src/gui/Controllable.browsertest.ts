import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { afterEach, describe, expect, test } from "vitest";
import "./EFPreview.js";
import "./EFScrubber.js";
import "./EFTimeDisplay.js";
import "./EFToggleLoop.js";
import "./EFTogglePlay.js";
import "../elements/EFVideo.js";
import "../elements/EFTimegroup.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFVideo } from "../elements/EFVideo.js";
import type { EFTogglePlay } from "./EFTogglePlay.js";
import type { PlaybackController } from "./PlaybackController.js";

@customElement("test-controllable-wrapper")
// @ts-expect-error Used via custom element registration
// biome-ignore lint/correctness/noUnusedVariables: Used via custom element registration
class TestControllableWrapper extends LitElement {
  render() {
    return html`<slot></slot>`;
  }
}

function createTestContainer() {
  const container = document.createElement("test-controllable-wrapper");
  document.body.appendChild(container);
  return container;
}

describe("Controllable Interface", () => {
  let container: Element;

  afterEach(() => {
    container?.remove();
  });

  test(
    "ef-toggle-play can target ef-video directly and connect",
    { timeout: 1000 },
    async () => {
      container = createTestContainer();
      container.innerHTML = `
      <ef-video id="my-video" src="test_audio.mp4"></ef-video>
      <ef-toggle-play target="my-video">
        <button slot="play">Play</button>
        <button slot="pause">Pause</button>
      </ef-toggle-play>
    `;

      const video = container.querySelector("#my-video") as EFVideo;
      await video.updateComplete;
      expect(video).toBeTruthy();
      expect(video.playbackController).toBeTruthy();

      const togglePlay = container.querySelector(
        "ef-toggle-play",
      ) as EFTogglePlay;
      await togglePlay.updateComplete;

      // Wait for TargetController to connect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify the control has found the target
      const effectiveContext = (togglePlay as any).effectiveContext;
      expect(effectiveContext).toBeTruthy();
      expect(effectiveContext).toBe(video);
    },
  );

  test(
    "ef-toggle-loop can target ef-timegroup directly",
    { timeout: 1000 },
    async () => {
      container = createTestContainer();
      container.innerHTML = `
      <ef-timegroup id="my-timegroup" duration="5s">
        <ef-video src="test_audio.mp4"></ef-video>
      </ef-timegroup>
      <ef-toggle-loop target="my-timegroup">
        <button>Toggle Loop</button>
      </ef-toggle-loop>
    `;

      const timegroup = container.querySelector("#my-timegroup") as EFTimegroup;
      await timegroup.updateComplete;

      expect(timegroup.loop).toBe(false);

      const button = container.querySelector("button") as HTMLButtonElement;
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(timegroup.loop).toBe(true);
    },
  );

  test(
    "ef-scrubber can target ef-video directly and connect",
    { timeout: 1000 },
    async () => {
      container = createTestContainer();
      container.innerHTML = `
      <ef-video id="my-video" src="test_audio.mp4"></ef-video>
      <ef-scrubber target="my-video"></ef-scrubber>
    `;

      const video = container.querySelector("#my-video") as EFVideo;
      await video.updateComplete;
      expect(video.playbackController).toBeTruthy();

      const scrubber = container.querySelector("ef-scrubber") as any;
      await scrubber.updateComplete;

      // Wait for TargetController to connect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify the control has found the target
      expect(scrubber.effectiveContext).toBeTruthy();
      expect(scrubber.effectiveContext).toBe(video);
    },
  );

  test(
    "ef-time-display can target ef-timegroup directly and connect",
    { timeout: 1000 },
    async () => {
      container = createTestContainer();
      container.innerHTML = `
      <ef-timegroup id="my-timegroup" duration="10s">
        <ef-video src="test_audio.mp4"></ef-video>
      </ef-timegroup>
      <ef-time-display target="my-timegroup"></ef-time-display>
    `;

      const timegroup = container.querySelector("#my-timegroup") as EFTimegroup;
      await timegroup.updateComplete;

      const timeDisplay = container.querySelector("ef-time-display") as any;
      await timeDisplay.updateComplete;

      // Wait for TargetController to connect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify the control has found the target
      expect(timeDisplay.effectiveContext).toBeTruthy();
      expect(timeDisplay.effectiveContext).toBe(timegroup);
    },
  );

  test(
    "control warns when targeting non-root temporal without playbackController",
    { timeout: 1000 },
    async () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args) => {
        warnings.push(args.join(" "));
        originalWarn(...args);
      };

      container = createTestContainer();
      container.innerHTML = `
      <ef-timegroup>
        <ef-video id="nested-video" src="test_audio.mp4"></ef-video>
      </ef-timegroup>
      <ef-toggle-play target="nested-video">
        <button slot="play">Play</button>
      </ef-toggle-play>
    `;

      const video = container.querySelector("#nested-video") as EFVideo;
      await video.updateComplete;

      const togglePlay = container.querySelector(
        "ef-toggle-play",
      ) as EFTogglePlay;
      await togglePlay.updateComplete;

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(video.playbackController).toBeUndefined();
      expect(
        warnings.some((w) => w.includes("non-root temporal element")),
      ).toBe(true);

      console.warn = originalWarn;
    },
  );

  test(
    "controls work with temporal element inside ef-preview (existing behavior)",
    { timeout: 1000 },
    async () => {
      container = createTestContainer();
      container.innerHTML = `
      <ef-preview id="my-preview">
        <ef-video src="test_audio.mp4"></ef-video>
      </ef-preview>
      <ef-toggle-play target="my-preview">
        <button slot="play">Play</button>
        <button slot="pause">Pause</button>
      </ef-toggle-play>
    `;

      const preview = container.querySelector("#my-preview") as any;
      await preview.updateComplete;

      const togglePlay = container.querySelector("ef-toggle-play") as any;
      await togglePlay.updateComplete;

      // Wait for TargetController to connect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify the control has found the target
      expect(togglePlay.effectiveContext).toBeTruthy();
      expect(togglePlay.effectiveContext).toBe(preview);
    },
  );

  test(
    "state updates flow from temporal element to control",
    { timeout: 1000 },
    async () => {
      container = createTestContainer();
      container.innerHTML = `
      <ef-video id="state-test-video" src="test_audio.mp4"></ef-video>
      <ef-toggle-play target="state-test-video">
        <button slot="play">Play</button>
        <button slot="pause">Pause</button>
      </ef-toggle-play>
    `;

      const video = container.querySelector("#state-test-video") as EFVideo;
      await video.updateComplete;
      expect(video.playbackController).toBeTruthy();

      const togglePlay = container.querySelector(
        "ef-toggle-play",
      ) as EFTogglePlay;
      await togglePlay.updateComplete;

      // Wait for TargetController to connect
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Initially should not be playing
      expect((togglePlay as any).playing).toBe(false);

      // Start playback on the video directly
      video.playbackController?.setPlaying(true);

      // Wait for state to propagate
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Control should now reflect playing state
      expect((togglePlay as any).playing).toBe(true);
    },
  );
});
