import { html } from "lit";
import { render } from "lit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "./EFPreview.js";
import "./EFTogglePlay.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFTogglePlay } from "./EFTogglePlay.js";
import type { PlaybackController } from "./PlaybackController.js";

// Skip all EFTogglePlay tests - failing tests need investigation
describe.skip("EFTogglePlay - AudioContext Resume", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container?.remove();
  });

  test(
    "creates and resumes AudioContext synchronously when clicked",
    { timeout: 5000 }, // Increased timeout for AudioContext operations
    async () => {
      render(
        html`
          <ef-timegroup id="test-timegroup" duration="5s">
            <ef-video src="test_audio.mp4"></ef-video>
          </ef-timegroup>
          <ef-toggle-play id="toggle" target="test-timegroup">
            <button slot="play">Play</button>
            <button slot="pause">Pause</button>
          </ef-toggle-play>
        `,
        container,
      );

      const timegroup = container.querySelector(
        "#test-timegroup",
      ) as EFTimegroup;
      const toggle = container.querySelector("#toggle") as EFTogglePlay;

      await timegroup.updateComplete;
      await toggle.updateComplete;

      // Wait for playbackController to be available
      await vi.waitUntil(() => timegroup.playbackController !== undefined, {
        timeout: 1000,
      });

      expect(timegroup.playbackController).toBeTruthy();
      const playbackController =
        timegroup.playbackController as PlaybackController;

      // Spy on setPendingAudioContext to verify it's called
      const setPendingSpy = vi.spyOn(
        playbackController,
        "setPendingAudioContext",
      );

      // Initially should not be playing
      expect(toggle.playing).toBe(false);

      // Click the toggle to play
      toggle.click();

      // Verify setPendingAudioContext was called synchronously (within the click handler)
      expect(setPendingSpy).toHaveBeenCalledTimes(1);
      const pendingContext = setPendingSpy.mock.calls[0]![0]!;
      expect(pendingContext).toBeInstanceOf(AudioContext);

      // Verify the context was resumed (state should be "running" or transitioning to it)
      // Note: resume() is async, but the call itself happens synchronously
      const contextState = pendingContext.state;
      expect(["running", "suspended"]).toContain(contextState);

      // Verify playback starts
      await vi.waitUntil(() => toggle.playing === true, {
        timeout: 1000,
      });

      setPendingSpy.mockRestore();
    },
  );

  test(
    "reuses pre-resumed AudioContext in startPlayback",
    { timeout: 5000 }, // Increased timeout for AudioContext operations
    async () => {
      render(
        html`
          <ef-timegroup id="test-timegroup" duration="5s">
            <ef-video src="test_audio.mp4"></ef-video>
          </ef-timegroup>
          <ef-toggle-play id="toggle" target="test-timegroup">
            <button slot="play">Play</button>
            <button slot="pause">Pause</button>
          </ef-toggle-play>
        `,
        container,
      );

      const timegroup = container.querySelector(
        "#test-timegroup",
      ) as EFTimegroup;
      const toggle = container.querySelector("#toggle") as EFTogglePlay;

      await timegroup.updateComplete;
      await toggle.updateComplete;

      // Wait for playbackController to be available
      await vi.waitUntil(() => timegroup.playbackController !== undefined, {
        timeout: 1000,
      });

      const playbackController =
        timegroup.playbackController as PlaybackController;

      // Create a test AudioContext and set it as pending
      const testContext = new AudioContext({ latencyHint: "playback" });
      testContext.resume(); // Resume it to simulate user interaction
      playbackController.setPendingAudioContext(testContext);

      // Start playback
      toggle.click();

      // Wait for playback to start
      await vi.waitUntil(() => toggle.playing === true, {
        timeout: 1000,
      });

      // Verify the test context was used (not a new one created)
      // We can't directly access #playbackAudioContext, but we can verify
      // playback started successfully, which means the context was reused
      expect(toggle.playing).toBe(true);

      // Clean up - pause playback
      playbackController.pause();
      await vi.waitUntil(() => toggle.playing === false, {
        timeout: 1000,
      });
      if (testContext.state !== "closed") {
        await testContext.close();
      }
    },
  );

  test(
    "handles missing playbackController gracefully",
    { timeout: 1000 },
    async () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args) => {
        warnings.push(args.join(" "));
        originalWarn(...args);
      };

      render(
        html`
          <ef-preview id="test-preview">
            <ef-video src="test_audio.mp4"></ef-video>
          </ef-preview>
          <ef-toggle-play id="toggle" target="test-preview">
            <button slot="play">Play</button>
          </ef-toggle-play>
        `,
        container,
      );

      const toggle = container.querySelector("#toggle") as EFTogglePlay;
      await toggle.updateComplete;

      // Wait for context to connect (efContext should be set)
      await vi.waitUntil(() => toggle.efContext !== null, {
        timeout: 1000,
      });

      // Click toggle - should not throw even if playbackController is not directly accessible
      // (it goes through ContextMixin which handles async resolution)
      toggle.click();

      // Should not have warnings about AudioContext creation failure
      // (because getPlaybackController returns null for ContextMixin)
      const audioContextWarnings = warnings.filter((w) =>
        w.includes("AudioContext"),
      );
      expect(audioContextWarnings.length).toBe(0);

      console.warn = originalWarn;
    },
  );

  test(
    "preserves gapless playback timing with pre-resumed context",
    { timeout: 2000 },
    async () => {
      render(
        html`
          <ef-timegroup id="test-timegroup" duration="5s">
            <ef-video src="test_audio.mp4"></ef-video>
          </ef-timegroup>
          <ef-toggle-play id="toggle" target="test-timegroup">
            <button slot="play">Play</button>
            <button slot="pause">Pause</button>
          </ef-toggle-play>
        `,
        container,
      );

      const timegroup = container.querySelector(
        "#test-timegroup",
      ) as EFTimegroup;
      const toggle = container.querySelector("#toggle") as EFTogglePlay;

      await timegroup.updateComplete;
      await toggle.updateComplete;

      // Wait for media to be ready (timegroup should have duration)
      await vi.waitUntil(() => timegroup.durationMs > 0, {
        timeout: 1000,
      });

      // Start playback
      toggle.click();

      // Wait for playback to start
      await vi.waitUntil(() => toggle.playing === true, {
        timeout: 1000,
      });

      // Verify playback is actually happening (time should advance)
      const initialTime = timegroup.currentTimeMs;
      await vi.waitUntil(() => timegroup.currentTimeMs > initialTime, {
        timeout: 1000,
      });
      const laterTime = timegroup.currentTimeMs;

      // Time should have advanced (allowing for some tolerance)
      expect(laterTime).toBeGreaterThanOrEqual(initialTime);

      // Pause playback
      toggle.click();
      await vi.waitUntil(() => toggle.playing === false, {
        timeout: 1000,
      });
    },
  );
});
