import { html, render } from "lit";
import { beforeEach, describe } from "vitest";

import { test as baseTest } from "../../test/useMSW.js";

import "./EFVideo.js";
import "./EFTimegroup.js";
import "../gui/EFPreview.js";
import "../gui/EFWorkbench.js";
import "./EFSurface.js";

import type { EFSurface } from "./EFSurface.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import type { EFVideo } from "./EFVideo.js";

beforeEach(() => {
  localStorage.clear();
});

const surfaceTest = baseTest.extend<{
  timegroup: EFTimegroup;
  video: EFVideo;
  surface: EFSurface;
}>({
  timegroup: async ({}, use) => {
    const container = document.createElement("div");
    render(
      html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview>
            <ef-timegroup id="tg" mode="sequence" class="relative h-[360px] w-[640px] overflow-hidden bg-black">
              <ef-video id="vid" src="bars-n-tone.mp4" style="width: 100%; height: 100%;"></ef-video>
              <ef-surface id="surf" target="vid" style="position: absolute; inset: 0;"></ef-surface>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);
    const tg = container.querySelector("#tg") as EFTimegroup;
    await tg.updateComplete;
    await use(tg);
    container.remove();
  },
  video: async ({ timegroup }, use) => {
    const video = timegroup.querySelector("#vid") as EFVideo;
    await video.updateComplete;
    await use(video);
  },
  surface: async ({ timegroup }, use) => {
    const surface = timegroup.querySelector("#surf") as unknown as EFSurface;
    await surface.updateComplete;
    await use(surface);
  },
});

describe("EFSurface", () => {
  surfaceTest("defines and renders a canvas", async ({ expect }) => {
    const el = document.createElement("ef-surface");
    document.body.appendChild(el);
    await (el as any).updateComplete;
    const canvas = el.shadowRoot?.querySelector("canvas");
    expect(canvas).toBeTruthy();
    expect((canvas as HTMLCanvasElement).tagName).toBe("CANVAS");
    el.remove();
  });

  surfaceTest(
    "mirrors video canvas after a seek via EFTimegroup",
    async ({ timegroup, video, surface, expect }) => {
      // Ensure media engine initialized
      await video.mediaEngineTask.run();

      // Seek to a known time through timegroup (triggers frame tasks)
      timegroup.currentTimeMs = 3000;
      await timegroup.seekTask.taskComplete;

      // After scheduling, surface should have mirrored pixel dimensions
      const videoCanvas = (video as any).canvasElement as
        | HTMLCanvasElement
        | undefined;
      const surfaceCanvas =
        (surface.shadowRoot?.querySelector("canvas") as HTMLCanvasElement) ??
        undefined;

      expect(videoCanvas).toBeTruthy();
      expect(surfaceCanvas).toBeTruthy();
      expect(videoCanvas!.width).toBeGreaterThan(0);
      expect(videoCanvas!.height).toBeGreaterThan(0);

      // Surface copies pixel dimensions
      expect(surfaceCanvas!.width).toBe(videoCanvas!.width);
      expect(surfaceCanvas!.height).toBe(videoCanvas!.height);
    },
  );

  surfaceTest(
    "supports multiple surfaces mirroring the same source",
    async ({ expect }) => {
      const container = document.createElement("div");
      render(
        html`
        <ef-configuration api-host="http://localhost:63315" signing-url="">
          <ef-preview>
            <ef-timegroup mode="sequence" class="relative h-[360px] w-[640px] overflow-hidden bg-black">
              <ef-video id="v" src="bars-n-tone.mp4" style="width: 100%; height: 100%;"></ef-video>
              <ef-surface id="s1" target="v" style="position: absolute; inset: 0;"></ef-surface>
              <ef-surface id="s2" target="v" style="position: absolute; inset: 0;"></ef-surface>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
        container,
      );
      document.body.appendChild(container);
      const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
      const video = container.querySelector("ef-video") as EFVideo;
      const s1 = container.querySelector("#s1") as unknown as EFSurface;
      const s2 = container.querySelector("#s2") as unknown as EFSurface;
      await timegroup.updateComplete;
      await video.mediaEngineTask.run();

      timegroup.currentTimeMs = 1000;
      await timegroup.seekTask.taskComplete;

      const vCanvas = (video as any).canvasElement as HTMLCanvasElement;
      const c1 = s1.shadowRoot!.querySelector("canvas") as HTMLCanvasElement;
      const c2 = s2.shadowRoot!.querySelector("canvas") as HTMLCanvasElement;

      expect(vCanvas.width).toBeGreaterThan(0);
      expect(c1.width).toBe(vCanvas.width);
      expect(c2.width).toBe(vCanvas.width);
      expect(c1.height).toBe(vCanvas.height);
      expect(c2.height).toBe(vCanvas.height);

      container.remove();
    },
  );

  surfaceTest(
    "handles missing video gracefully (no throw)",
    async ({ expect }) => {
      const el = document.createElement("ef-surface") as any;
      document.body.appendChild(el);
      await el.updateComplete;
      await expect(el.frameTask.run()).resolves.toBeUndefined();
      el.remove();
    },
  );
});
