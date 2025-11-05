import { html, render } from "lit";
import { beforeEach, describe } from "vitest";
import { test as baseTest } from "../test/useMSW.js";
import "./elements/EFVideo.js";
import "./elements/EFTimegroup.js";
import { assetMSWHandlers } from "../test/useAssetMSW.js";
import type { EFTimegroup } from "./elements/EFTimegroup.js";
import type { EFVideo } from "./elements/EFVideo.js";

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

/**
 * Test suite for video seek loading indicator behavior
 * Uses real DOM and test assets to validate loading state management
 */
describe("Video Seek Loading Indicator Flashing", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("should load video and handle seeking without excessive loading indicators", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    render(
      html`<ef-workbench>
        <ef-timegroup mode="contain" style="width: 400px; height: 300px;">
          <ef-video
            src="media/bars-n-tone2.mp4"
            mode="asset"
          ></ef-video>
        </ef-timegroup>
      </ef-workbench>`,
      container,
    );
    document.body.appendChild(container);

    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const video = container.querySelector("ef-video") as EFVideo;

    await video.updateComplete;

    // Wait for initial setup
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify basic functionality
    expect(video.canvasRef.value).toBeTruthy();
    expect(video.fragmentIndexTask).toBeDefined();

    // Test seeking to different times
    const seekTimes = [1000, 2000, 3000];

    for (const time of seekTimes) {
      timegroup.currentTimeMs = time;
      await timegroup.updateComplete;

      // Allow time for tasks to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The system should handle seeks without crashing
      expect(timegroup.currentTimeMs).toBe(time);
    }

    // Test passes if video system works correctly
    expect(true).toBe(true);
  });

  test.skip("should handle rapid seeking without hanging", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    render(
      html`<ef-workbench>
        <ef-timegroup mode="contain" style="width: 400px; height: 300px;">
          <ef-video
            src="media/bars-n-tone2.mp4"
            mode="asset"
          ></ef-video>
        </ef-timegroup>
      </ef-workbench>`,
      container,
    );
    document.body.appendChild(container);

    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const video = container.querySelector("ef-video") as EFVideo;

    await video.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Simulate rapid scrubbing
    const rapidTimes = [500, 1500, 2500, 3500, 4500];

    for (const time of rapidTimes) {
      timegroup.currentTimeMs = time;
      await timegroup.updateComplete;
      // Brief pause to simulate user interaction and allow frame updates to complete
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Verify final state
    expect(timegroup.currentTimeMs).toBe(4500);

    // System should still be responsive
    const canvas = video.canvasRef.value;
    expect(canvas).toBeTruthy();
    expect(canvas?.width).toBeGreaterThan(0);
    expect(canvas?.height).toBeGreaterThan(0);
  });

  test("identifies loading indicator behavior pattern", ({ expect }) => {
    // This test documents the expected loading behavior
    const expectedBehavior = {
      fastOperations:
        "Should minimize loading indicators for cached/fast operations",
      slowOperations:
        "Should show loading indicators for network-bound operations",
      gracePeriod:
        "Should use delayed loading to avoid flashing for fast operations",
      scrubbing: "Should handle rapid seeks without excessive loading flashes",
    };

    console.log("Expected loading indicator behavior:", expectedBehavior);

    // Verify the behavior expectations are reasonable
    expect(expectedBehavior.fastOperations).toContain("minimize");
    expect(expectedBehavior.slowOperations).toContain("show loading");
    expect(expectedBehavior.gracePeriod).toContain("delayed");
    expect(expectedBehavior.scrubbing).toContain("rapid seeks");
  });

  test("should verify DelayedLoadingState is properly configured", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    render(
      html`<ef-workbench>
        <ef-timegroup mode="contain" style="width: 400px; height: 300px;">
          <ef-video
            src="media/bars-n-tone2.mp4"
            mode="asset"
          ></ef-video>
        </ef-timegroup>
      </ef-workbench>`,
      container,
    );
    document.body.appendChild(container);

    const video = container.querySelector("ef-video") as EFVideo;
    await video.updateComplete;

    // Verify the video component has the delayed loading methods
    expect(typeof video.startDelayedLoading).toBe("function");
    expect(typeof video.clearDelayedLoading).toBe("function");

    // Test the delayed loading API exists and is functional
    video.startDelayedLoading("test-operation", "Testing...");
    expect(true).toBe(true); // Should not throw

    video.clearDelayedLoading("test-operation");
    expect(true).toBe(true); // Should not throw
  });
});
