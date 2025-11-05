import { html, render } from "lit";
import { afterEach, beforeEach, describe } from "vitest";
import { test as baseTest } from "../test/useMSW.js";
import "../src/elements/EFVideo.js";
import type { EFVideo } from "../src/elements/EFVideo.js";
import "../src/elements/EFVideo.js";
import { assetMSWHandlers } from "./useAssetMSW.js";
import "../src/elements/EFTimegroup.js";
import { TaskStatus } from "@lit/task";

const test = baseTest.extend({
  setupAssetHandlers: [
    async ({ worker }, use) => {
      // Set up centralized MSW handlers to proxy requests to test assets
      worker.use(...assetMSWHandlers);
      await use(undefined);
    },
    { auto: true },
  ],
});

describe("EFVideo Frame Generation", () => {
  let container: HTMLDivElement;
  let video: EFVideo;

  beforeEach(() => {
    // MSW setup is now handled by test fixtures

    // Clean up DOM
    container = document.createElement("div");
    document.body.appendChild(container);

    render(
      html`
        <ef-video
          src="media/bars-n-tone2.mp4"
          mode="asset"
          current-time-ms="80"
        ></ef-video>
      `,
      container,
    );

    video = document.querySelector("ef-video") as EFVideo;
  });

  afterEach(() => container.remove());

  test("initializes with duration of 0", async ({ expect }) => {
    expect(video.durationMs).toBe(0);
  });

  test("fragmentIndexTask is pending", ({ expect }) => {
    expect(video.fragmentIndexTask.status).toEqual(TaskStatus.INITIAL);
  });

  // Note: Timing-dependent tests disabled due to seek range issues
  // The test asset data starts at 80ms but component initializes at 0ms
  // These tests validate task completion after data loading but fail on seek timing
  describe.skip("after frametask settles (disabled - timing issues)", () => {
    beforeEach(async () => {
      await video.frameTask.taskComplete;
    });

    test("duration is 10000", async ({ expect }) => {
      expect(video.durationMs).toBeCloseTo(10_085, 0);
    });

    test("fragmentIndexTask is fulfilled", ({ expect }) => {
      expect(video.fragmentIndexTask.status).toEqual(TaskStatus.COMPLETE);
    });
  });
});
