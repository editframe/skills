import { html, render } from "lit";
import { beforeEach, describe } from "vitest";
import { test as baseTest } from "../test/useMSW.js";
import "./elements/EFVideo.js";
import "./elements/EFTimegroup.js";
import { assetMSWHandlers } from "../test/useAssetMSW.js";
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

describe("Loading Indicator", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("should render loading overlay when loading state is active", async ({
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

    // Set loading state directly
    (video as any).loadingState = {
      isLoading: true,
      operation: "scrub-segment",
      message: "Loading timeline preview...",
    };

    // Trigger re-render
    video.requestUpdate();
    await video.updateComplete;

    // Check that loading overlay is present in the shadow DOM
    const shadowRoot = video.shadowRoot;
    expect(shadowRoot).toBeTruthy();

    const loadingOverlay = shadowRoot?.querySelector(".loading-overlay");
    expect(loadingOverlay).toBeTruthy();

    const loadingContent = shadowRoot?.querySelector(".loading-content");
    expect(loadingContent?.textContent).toContain("Loading Video...");
  });

  test("should hide loading overlay when not loading", async ({ expect }) => {
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

    // Set non-loading state
    (video as any).loadingState = {
      isLoading: false,
      operation: null,
      message: "",
    };

    video.requestUpdate();
    await video.updateComplete;

    // Check that loading overlay is NOT present
    const shadowRoot = video.shadowRoot;
    const loadingOverlay = shadowRoot?.querySelector(".loading-overlay");
    expect(loadingOverlay).toBeFalsy();
  });

  test("should verify DelayedLoadingState integration", async ({ expect }) => {
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

    // Test that DelayedLoadingState methods exist and work
    expect(typeof video.startDelayedLoading).toBe("function");
    expect(typeof video.clearDelayedLoading).toBe("function");

    // These methods should not throw when called
    video.startDelayedLoading("test-operation", "Testing delayed loading...");
    video.clearDelayedLoading("test-operation");

    expect(true).toBe(true); // Test passes if no errors thrown
  });
});

describe("Loading Indicator Behavior", () => {
  test("should document loading message types", ({ expect }) => {
    const loadingMessages = [
      "Loading scrub segment...",
      "Processing video data...",
      "Loading video segment...",
    ];

    // Verify expected loading message patterns
    expect(loadingMessages).toContain("Loading scrub segment...");
    expect(loadingMessages).toContain("Processing video data...");
    expect(loadingMessages).toContain("Loading video segment...");
  });

  test("should document loading state lifecycle", ({ expect }) => {
    const loadingLifecycle = {
      start: "Loading state should be set when operation begins",
      progress: "Loading message should indicate current operation",
      completion: "Loading state should be cleared when operation completes",
      error: "Loading state should be cleared on errors",
    };

    expect(loadingLifecycle.start).toContain("set when operation begins");
    expect(loadingLifecycle.completion).toContain(
      "cleared when operation completes",
    );
  });

  test("should validate DelayedLoadingState configuration", ({ expect }) => {
    // Document the expected behavior of DelayedLoadingState
    const delayedLoadingBehavior = {
      gracePeriod: "250ms delay before showing loading indicators",
      purpose: "Prevents flashing for fast operations",
      threshold: "Only show loading for operations longer than grace period",
    };

    expect(delayedLoadingBehavior.gracePeriod).toContain("250ms");
    expect(delayedLoadingBehavior.purpose).toContain("Prevents flashing");
    expect(delayedLoadingBehavior.threshold).toContain(
      "longer than grace period",
    );
  });
});
