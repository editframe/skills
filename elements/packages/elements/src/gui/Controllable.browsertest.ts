import { afterEach, describe, expect, test, vi } from "vitest";
import "./EFControls.js";
import "./EFPreview.js";
import "./EFScrubber.js";
import "./EFTimeDisplay.js";
import "./EFToggleLoop.js";
import "./EFTogglePlay.js";
import "../elements/EFVideo.js";
import "../elements/EFTimegroup.js";
import "../elements/EFAudio.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFVideo } from "../elements/EFVideo.js";
import type { EFAudio } from "../elements/EFAudio.js";
import type { EFTogglePlay } from "./EFTogglePlay.js";
import type { EFToggleLoop } from "./EFToggleLoop.js";
import type { EFControls } from "./EFControls.js";
import type { EFTimeDisplay } from "./EFTimeDisplay.js";
import type { EFScrubber } from "./EFScrubber.js";

function createTestContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.style.display = "block";
  return container;
}

describe("Controllable Interface", () => {
  let container: HTMLElement;

  afterEach(() => {
    container?.remove();
  });

  describe("Individual controls targeting temporal elements directly", () => {
    test("ef-toggle-play resolves target to ef-video element", { timeout: 2000 }, async () => {
      container = createTestContainer();
      container.innerHTML = `
          <ef-video id="my-video" src="bars-n-tone.mp4"></ef-video>
          <ef-toggle-play target="my-video">
            <button slot="play">Play</button>
            <button slot="pause">Pause</button>
          </ef-toggle-play>
        `;

      const video = container.querySelector<EFVideo>("#my-video")!;
      const togglePlay = container.querySelector<EFTogglePlay>("ef-toggle-play")!;

      // Wait for video to have playbackController (root temporal element)
      await vi.waitUntil(() => video.playbackController !== undefined, {
        timeout: 1000,
      });

      // Wait for control to resolve target
      await vi.waitUntil(() => togglePlay.effectiveContext !== null, {
        timeout: 1000,
      });

      expect(togglePlay.effectiveContext).toBe(video);
    });

    test(
      "ef-toggle-loop resolves target to ef-timegroup and toggles loop state",
      { timeout: 2000 },
      async () => {
        container = createTestContainer();
        container.innerHTML = `
          <ef-timegroup id="my-timegroup" duration="5s"></ef-timegroup>
          <ef-toggle-loop target="my-timegroup">
            <button>Toggle Loop</button>
          </ef-toggle-loop>
        `;

        const timegroup = container.querySelector<EFTimegroup>("#my-timegroup")!;
        const toggleLoop = container.querySelector<EFToggleLoop>("ef-toggle-loop")!;

        // Wait for timegroup to have playbackController
        await vi.waitUntil(() => timegroup.playbackController !== undefined, {
          timeout: 1000,
        });

        // Initial state: loop should be false
        expect(timegroup.loop).toBe(false);

        // Click toggle - observable behavior: timegroup loop state should change
        const button = toggleLoop.querySelector("button")!;
        button.click();

        // Wait for loop state to propagate to temporal element
        await vi.waitUntil(() => timegroup.playbackController!.loop === true, {
          timeout: 1000,
        });

        expect(timegroup.loop).toBe(true);
      },
    );

    test("ef-scrubber resolves target to ef-video element", { timeout: 2000 }, async () => {
      container = createTestContainer();
      container.innerHTML = `
          <ef-video id="my-video" src="bars-n-tone.mp4"></ef-video>
          <ef-scrubber target="my-video"></ef-scrubber>
        `;

      const video = container.querySelector<EFVideo>("#my-video")!;
      const scrubber = container.querySelector<EFScrubber>("ef-scrubber")!;

      // Wait for video to have playbackController
      await vi.waitUntil(() => video.playbackController !== undefined, {
        timeout: 1000,
      });

      // Wait for scrubber to resolve target
      await vi.waitUntil(() => (scrubber as any).effectiveContext !== null, {
        timeout: 1000,
      });

      expect((scrubber as any).effectiveContext).toBe(video);
    });

    test("ef-time-display resolves target to ef-timegroup element", { timeout: 2000 }, async () => {
      container = createTestContainer();
      container.innerHTML = `
          <ef-timegroup id="my-timegroup" duration="10s"></ef-timegroup>
          <ef-time-display target="my-timegroup"></ef-time-display>
        `;

      const timegroup = container.querySelector<EFTimegroup>("#my-timegroup")!;
      const timeDisplay = container.querySelector<EFTimeDisplay>("ef-time-display")!;

      // Wait for timegroup to have playbackController
      await vi.waitUntil(() => timegroup.playbackController !== undefined, {
        timeout: 1000,
      });

      // Wait for time display to resolve target
      await vi.waitUntil(() => (timeDisplay as any).effectiveContext !== null, {
        timeout: 1000,
      });

      expect((timeDisplay as any).effectiveContext).toBe(timegroup);
    });
  });

  describe("Nested temporal elements (invariant: should NOT be controllable)", () => {
    test(
      "nested ef-video inside ef-timegroup has no playbackController",
      { timeout: 2000 },
      async () => {
        container = createTestContainer();
        container.innerHTML = `
          <ef-timegroup id="parent" duration="5s">
            <ef-video id="nested-video" src="bars-n-tone.mp4"></ef-video>
          </ef-timegroup>
        `;

        const parentTimegroup = container.querySelector<EFTimegroup>("#parent")!;
        const nestedVideo = container.querySelector<EFVideo>("#nested-video")!;

        // Wait for parent to have playbackController (it's a root)
        await vi.waitUntil(() => parentTimegroup.playbackController !== undefined, {
          timeout: 1000,
        });

        await nestedVideo.updateComplete;

        // Invariant: nested video should NOT have its own playbackController
        expect(nestedVideo.playbackController).toBeUndefined();
        // Parent should be the one with playback control
        expect(parentTimegroup.playbackController).toBeDefined();
      },
    );

    test("control warns when targeting non-root temporal element", { timeout: 2000 }, async () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args) => {
        warnings.push(args.join(" "));
      };

      try {
        container = createTestContainer();
        container.innerHTML = `
            <ef-timegroup duration="5s">
              <ef-video id="nested-video" src="bars-n-tone.mp4"></ef-video>
            </ef-timegroup>
            <ef-toggle-play target="nested-video">
              <button slot="play">Play</button>
            </ef-toggle-play>
          `;

        const nestedVideo = container.querySelector<EFVideo>("#nested-video")!;
        const togglePlay = container.querySelector<EFTogglePlay>("ef-toggle-play")!;

        await nestedVideo.updateComplete;
        await togglePlay.updateComplete;

        // Wait for control to attempt target resolution
        await vi.waitUntil(() => warnings.some((w) => w.includes("non-root temporal element")), {
          timeout: 1000,
        });

        // Invariant: nested video has no playbackController
        expect(nestedVideo.playbackController).toBeUndefined();
        // Warning should have been issued
        expect(warnings.some((w) => w.includes("non-root temporal element"))).toBe(true);
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe("Bidirectional state sync: temporal → control", () => {
    test(
      "playing state changes on temporal propagate to toggle-play control",
      { timeout: 2000 },
      async () => {
        container = createTestContainer();
        container.innerHTML = `
          <ef-timegroup id="tg" duration="5s"></ef-timegroup>
          <ef-toggle-play target="tg">
            <button slot="play">Play</button>
            <button slot="pause">Pause</button>
          </ef-toggle-play>
        `;

        const timegroup = container.querySelector<EFTimegroup>("#tg")!;
        const togglePlay = container.querySelector<EFTogglePlay>("ef-toggle-play")!;

        // Wait for timegroup playbackController
        await vi.waitUntil(() => timegroup.playbackController !== undefined, {
          timeout: 1000,
        });

        // Wait for control to resolve target
        await vi.waitUntil(() => togglePlay.effectiveContext !== null, {
          timeout: 1000,
        });

        // Initial state: not playing
        expect(togglePlay.playing).toBe(false);

        // Change state directly on temporal element
        timegroup.playbackController!.setPlaying(true);

        await vi.waitUntil(() => togglePlay.playing === true, {
          timeout: 1000,
        });

        expect(togglePlay.playing).toBe(true);

        // Stop playback
        timegroup.playbackController!.setPlaying(false);

        await vi.waitUntil(() => togglePlay.playing === false, {
          timeout: 1000,
        });

        expect(togglePlay.playing).toBe(false);
      },
    );

    test.fails(
      "loop state changes on temporal propagate to toggle-loop control (EFToggleLoop lacks loop property)",
      { timeout: 2000 },
      async () => {
        container = createTestContainer();
        container.innerHTML = `
          <ef-timegroup id="tg" duration="5s"></ef-timegroup>
          <ef-toggle-loop target="tg">
            <button>Loop</button>
          </ef-toggle-loop>
        `;

        const timegroup = container.querySelector<EFTimegroup>("#tg")!;
        const toggleLoop = container.querySelector<EFToggleLoop>("ef-toggle-loop")!;

        // Wait for timegroup playbackController
        await vi.waitUntil(() => timegroup.playbackController !== undefined, {
          timeout: 1000,
        });

        // Wait for control to resolve target
        await vi.waitUntil(() => (toggleLoop as any).effectiveContext !== null, {
          timeout: 1000,
        });

        // Change loop state directly on temporal
        timegroup.playbackController!.setLoop(true);

        await vi.waitUntil(() => (toggleLoop as any).loop === true, {
          timeout: 1000,
        });

        expect((toggleLoop as any).loop).toBe(true);
      },
    );
  });

  describe("Bidirectional state sync: control → temporal", () => {
    test(
      "clicking toggle-play starts playback on targeted temporal element",
      { timeout: 2000 },
      async () => {
        container = createTestContainer();
        container.innerHTML = `
          <ef-timegroup id="tg" duration="5s"></ef-timegroup>
          <ef-toggle-play target="tg">
            <button slot="play">Play</button>
            <button slot="pause">Pause</button>
          </ef-toggle-play>
        `;

        const timegroup = container.querySelector<EFTimegroup>("#tg")!;
        const togglePlay = container.querySelector<EFTogglePlay>("ef-toggle-play")!;

        // Wait for timegroup playbackController
        await vi.waitUntil(() => timegroup.playbackController !== undefined, {
          timeout: 1000,
        });

        // Wait for control to resolve target
        await vi.waitUntil(() => togglePlay.effectiveContext !== null, {
          timeout: 1000,
        });

        // Initial state: not playing
        expect(timegroup.playbackController!.playing).toBe(false);

        // Click the control
        togglePlay.click();

        // Observable behavior: temporal's playback should start
        await vi.waitUntil(() => timegroup.playbackController!.playing === true, {
          timeout: 1000,
        });

        expect(timegroup.playbackController!.playing).toBe(true);

        // Click again to pause
        togglePlay.click();

        await vi.waitUntil(() => timegroup.playbackController!.playing === false, {
          timeout: 1000,
        });

        expect(timegroup.playbackController!.playing).toBe(false);
      },
    );

    test(
      "clicking toggle-loop changes loop state on targeted temporal element",
      { timeout: 2000 },
      async () => {
        container = createTestContainer();
        container.innerHTML = `
          <ef-timegroup id="tg" duration="5s"></ef-timegroup>
          <ef-toggle-loop target="tg">
            <button>Loop</button>
          </ef-toggle-loop>
        `;

        const timegroup = container.querySelector<EFTimegroup>("#tg")!;
        const toggleLoop = container.querySelector<EFToggleLoop>("ef-toggle-loop")!;

        // Wait for timegroup playbackController
        await vi.waitUntil(() => timegroup.playbackController !== undefined, {
          timeout: 1000,
        });

        // Wait for control to resolve target
        await vi.waitUntil(() => (toggleLoop as any).effectiveContext !== null, {
          timeout: 1000,
        });

        // Initial state: loop off
        expect(timegroup.playbackController!.loop).toBe(false);

        // Click the loop button
        const button = toggleLoop.querySelector("button")!;
        button.click();

        // Observable behavior: temporal's loop state should change
        await vi.waitUntil(() => timegroup.playbackController!.loop === true, {
          timeout: 1000,
        });

        expect(timegroup.playbackController!.loop).toBe(true);
      },
    );
  });

  describe("EFControls targeting temporal elements directly", () => {
    test("EFControls can target ef-timegroup directly", { timeout: 2000 }, async () => {
      container = createTestContainer();
      container.innerHTML = `
          <ef-timegroup id="tg" duration="5s"></ef-timegroup>
          <ef-controls target="tg">
            <ef-toggle-play>
              <button slot="play">Play</button>
              <button slot="pause">Pause</button>
            </ef-toggle-play>
          </ef-controls>
        `;

      const timegroup = container.querySelector<EFTimegroup>("#tg")!;
      const controls = container.querySelector<EFControls>("ef-controls")!;
      const togglePlay = container.querySelector<EFTogglePlay>("ef-toggle-play")!;

      // Wait for timegroup playbackController
      await vi.waitUntil(() => timegroup.playbackController !== undefined, {
        timeout: 1000,
      });

      // Wait for controls to resolve target
      await vi.waitUntil(() => controls.targetElement !== null, {
        timeout: 1000,
      });

      expect(controls.targetElement).toBe(timegroup);

      // Wait for toggle to receive context
      await vi.waitUntil(() => togglePlay.efContext !== null, {
        timeout: 1000,
      });
    });

    test(
      "EFControls syncs playing state bidirectionally with targeted ef-timegroup",
      { timeout: 2000 },
      async () => {
        container = createTestContainer();
        container.innerHTML = `
          <ef-timegroup id="tg" duration="5s"></ef-timegroup>
          <ef-controls target="tg">
            <ef-toggle-play>
              <button slot="play">Play</button>
              <button slot="pause">Pause</button>
            </ef-toggle-play>
          </ef-controls>
        `;

        const timegroup = container.querySelector<EFTimegroup>("#tg")!;
        const controls = container.querySelector<EFControls>("ef-controls")!;
        const togglePlay = container.querySelector<EFTogglePlay>("ef-toggle-play")!;

        // Wait for setup
        await vi.waitUntil(() => timegroup.playbackController !== undefined, {
          timeout: 1000,
        });
        await vi.waitUntil(() => controls.targetElement !== null, {
          timeout: 1000,
        });

        // Test: control → temporal
        togglePlay.click();

        await vi.waitUntil(() => timegroup.playbackController!.playing === true, {
          timeout: 1000,
        });

        expect(timegroup.playbackController!.playing).toBe(true);

        // Test: temporal → control (stop playback directly)
        timegroup.playbackController!.setPlaying(false);

        await vi.waitUntil(() => togglePlay.playing === false, {
          timeout: 1000,
        });

        expect(togglePlay.playing).toBe(false);
      },
    );

    test.fails(
      "EFControls syncs currentTimeMs with targeted ef-timegroup (async seek notification)",
      { timeout: 2000 },
      async () => {
        container = createTestContainer();
        container.innerHTML = `
          <ef-timegroup id="tg" duration="10s"></ef-timegroup>
          <ef-controls target="tg">
            <ef-time-display></ef-time-display>
          </ef-controls>
        `;

        const timegroup = container.querySelector<EFTimegroup>("#tg")!;
        const controls = container.querySelector<EFControls>("ef-controls")!;
        const timeDisplay = container.querySelector<EFTimeDisplay>("ef-time-display")!;

        // Wait for setup
        await vi.waitUntil(() => timegroup.playbackController !== undefined, {
          timeout: 1000,
        });
        await vi.waitUntil(() => controls.targetElement !== null, {
          timeout: 1000,
        });

        // Set time on timegroup
        timegroup.currentTimeMs = 5000;

        await vi.waitUntil(() => timeDisplay.shadowRoot?.textContent?.includes("0:05"), {
          timeout: 1000,
        });

        expect(timeDisplay.shadowRoot?.textContent).toContain("0:05");
      },
    );

    test(
      "EFControls can target ef-video directly (without ef-preview wrapper)",
      { timeout: 2000 },
      async () => {
        container = createTestContainer();
        container.innerHTML = `
          <ef-video id="my-video" src="bars-n-tone.mp4"></ef-video>
          <ef-controls target="my-video">
            <ef-toggle-play>
              <button slot="play">Play</button>
              <button slot="pause">Pause</button>
            </ef-toggle-play>
          </ef-controls>
        `;

        const video = container.querySelector<EFVideo>("#my-video")!;
        const controls = container.querySelector<EFControls>("ef-controls")!;
        const togglePlay = container.querySelector<EFTogglePlay>("ef-toggle-play")!;

        // Wait for video playbackController
        await vi.waitUntil(() => video.playbackController !== undefined, {
          timeout: 1000,
        });

        // Wait for controls to resolve target
        await vi.waitUntil(() => controls.targetElement !== null, {
          timeout: 1000,
        });

        expect(controls.targetElement).toBe(video);

        // Test bidirectional sync
        togglePlay.click();

        await vi.waitUntil(() => video.playbackController!.playing === true, {
          timeout: 1000,
        });

        expect(video.playbackController!.playing).toBe(true);

        // Stop and verify sync back
        video.playbackController!.setPlaying(false);

        await vi.waitUntil(() => togglePlay.playing === false, {
          timeout: 1000,
        });
      },
    );

    test("EFControls can target ef-audio directly", { timeout: 2000 }, async () => {
      container = createTestContainer();
      container.innerHTML = `
          <ef-audio id="my-audio" src="bars-n-tone.mp4"></ef-audio>
          <ef-controls target="my-audio">
            <ef-toggle-play>
              <button slot="play">Play</button>
              <button slot="pause">Pause</button>
            </ef-toggle-play>
          </ef-controls>
        `;

      const audio = container.querySelector<EFAudio>("#my-audio")!;
      const controls = container.querySelector<EFControls>("ef-controls")!;

      // Wait for audio playbackController
      await vi.waitUntil(() => audio.playbackController !== undefined, {
        timeout: 1000,
      });

      // Wait for controls to resolve target
      await vi.waitUntil(() => controls.targetElement !== null, {
        timeout: 1000,
      });

      expect(controls.targetElement).toBe(audio);
    });
  });

  describe("Controls work with ef-preview wrapper (existing behavior)", () => {
    test("ef-toggle-play works when targeting ef-preview", { timeout: 3000 }, async () => {
      container = createTestContainer();

      // Create elements programmatically to ensure proper custom element upgrade order
      const preview = document.createElement("ef-preview") as any;
      preview.id = "my-preview";
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.duration = "5s";
      preview.appendChild(timegroup);
      container.appendChild(preview);

      const togglePlay = document.createElement("ef-toggle-play") as EFTogglePlay;
      togglePlay.target = "my-preview";
      togglePlay.innerHTML = `
          <button slot="play">Play</button>
          <button slot="pause">Pause</button>
        `;
      container.appendChild(togglePlay);

      // Wait for timegroup to initialize (it needs playbackController as root)
      await timegroup.updateComplete;
      await vi.waitUntil(() => timegroup.playbackController !== undefined, {
        timeout: 1000,
      });

      // Wait for preview to find the timegroup as targetTemporal
      await preview.updateComplete;
      await vi.waitUntil(() => preview.targetTemporal !== null, {
        timeout: 1000,
      });

      // Wait for control to resolve target
      await vi.waitUntil(() => togglePlay.effectiveContext !== null, {
        timeout: 1000,
      });

      expect(togglePlay.effectiveContext).toBe(preview);

      // Test click works
      togglePlay.click();

      await vi.waitUntil(() => preview.playing === true, {
        timeout: 1000,
      });

      expect(preview.playing).toBe(true);

      // Cleanup
      preview.pause();
    });

    test("EFControls works when targeting ef-preview", { timeout: 3000 }, async () => {
      container = createTestContainer();

      // Create elements programmatically to ensure proper custom element upgrade order
      const preview = document.createElement("ef-preview") as any;
      preview.id = "my-preview";
      const timegroup = document.createElement("ef-timegroup") as EFTimegroup;
      timegroup.duration = "5s";
      preview.appendChild(timegroup);
      container.appendChild(preview);

      const controls = document.createElement("ef-controls") as EFControls;
      controls.target = "my-preview";
      const togglePlay = document.createElement("ef-toggle-play") as EFTogglePlay;
      togglePlay.innerHTML = `
          <button slot="play">Play</button>
          <button slot="pause">Pause</button>
        `;
      controls.appendChild(togglePlay);
      container.appendChild(controls);

      // Wait for timegroup to initialize (it needs playbackController as root)
      await timegroup.updateComplete;
      await vi.waitUntil(() => timegroup.playbackController !== undefined, {
        timeout: 1000,
      });

      // Wait for preview to find the timegroup as targetTemporal
      await preview.updateComplete;
      await vi.waitUntil(() => preview.targetTemporal !== null, {
        timeout: 1000,
      });

      // Wait for controls to resolve target
      await vi.waitUntil(() => controls.targetElement !== null, {
        timeout: 1000,
      });

      expect(controls.targetElement).toBe(preview);

      // Test click works through controls
      togglePlay.click();

      await vi.waitUntil(() => preview.playing === true, {
        timeout: 1000,
      });

      expect(preview.playing).toBe(true);

      // Cleanup
      preview.pause();
    });
  });
});
