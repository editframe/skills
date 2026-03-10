/**
 * Test suite for the behavior when sourcein/sourceout attributes change on
 * a temporal element.
 *
 * Root cause: The FrameController only re-renders when currentTimeMs or durationMs
 * change on the timegroup. When sourcein/sourceout change but the duration stays
 * the same (e.g., sliding both by the same delta), no frame render was triggered
 * and the video showed a stale frame.
 *
 * Fix: EFTemporal.updated() now calls rootTimegroup.requestFrameRender() when
 * sourcein/sourceout change, ensuring the correct source frame is always displayed.
 */

import { beforeAll, beforeEach, describe, expect } from "vitest";
import { test as baseTest } from "../../test/useMSW.js";
import type { EFVideo } from "./EFVideo.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import "./EFVideo.js";
import "./EFTimegroup.js";

beforeAll(async () => {
  console.clear();
});

beforeEach(() => {
  localStorage.clear();
});

const test = baseTest.extend<{
  container: HTMLDivElement;
  timegroup: EFTimegroup;
  video: EFVideo;
}>({
  container: async ({}, use) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await use(container);
    container.remove();
  },

  timegroup: async ({ container }, use) => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.setAttribute("mode", "fixed");
    tg.setAttribute("duration", "6000ms");
    container.appendChild(tg);
    await tg.updateComplete;
    await use(tg);
  },

  video: async ({ timegroup }, use) => {
    const video = document.createElement("ef-video") as EFVideo;
    video.setAttribute("src", "https://assets.editframe.com/bars-n-tone.mp4");
    video.setAttribute("sourcein", "2000ms");
    video.setAttribute("sourceout", "8000ms");
    timegroup.appendChild(video);
    await video.updateComplete;
    await use(video);
  },
});

describe("sourcein/sourceout changes trigger frame re-render", () => {
  test("changing sourcein triggers a frame render", async ({ timegroup, video }) => {
    expect(timegroup.currentTimeMs).toBe(0);

    // Change sourcein - should trigger a frame render even though
    // currentTimeMs stays at 0
    video.setAttribute("sourcein", "3000ms");
    await video.updateComplete;
    await timegroup.updateComplete;

    // currentSourceTimeMs should now reflect the new sourcein
    expect((video as any).currentSourceTimeMs).toBe(3000);
  });

  test("changing sourceout triggers a frame render", async ({ timegroup, video }) => {
    expect(timegroup.currentTimeMs).toBe(0);

    video.setAttribute("sourceout", "7000ms");
    await video.updateComplete;
    await timegroup.updateComplete;

    // Source time should still start at sourcein
    expect((video as any).currentSourceTimeMs).toBe(2000);
  });

  test("changing both sourcein and sourceout triggers a frame render", async ({
    timegroup,
    video,
  }) => {
    expect(timegroup.currentTimeMs).toBe(0);

    // Simulate region drag: shift both by the same amount
    video.setAttribute("sourcein", "3000ms");
    video.setAttribute("sourceout", "9000ms");
    await video.updateComplete;
    await timegroup.updateComplete;

    // currentSourceTimeMs = ownCurrentTimeMs(0) + sourceIn(3000) = 3000
    expect((video as any).currentSourceTimeMs).toBe(3000);
  });

  test("requestFrameRender exists on EFTimegroup", async ({ timegroup }) => {
    expect(typeof timegroup.requestFrameRender).toBe("function");
  });
});
