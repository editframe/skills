/**
 * Tests for granular loading states in timeline tracks and preview output.
 * Run: ./scripts/browsertest packages/elements/src/LoadingStates.browsertest.ts
 */
import { html, render } from "lit";
import { beforeEach, describe } from "vitest";
import { test as baseTest } from "../test/useMSW.js";
import { assetMSWHandlers } from "../test/useAssetMSW.js";
import "./elements/EFVideo.js";
import "./elements/EFAudio.js";
import "./elements/EFTimegroup.js";
import "./gui/timeline/tracks/AudioTrack.js";
import "./gui/timeline/tracks/EFThumbnailStrip.js";
import "./gui/EFWorkbench.js";

const test = baseTest.extend({
  setupAssetHandlers: [
    async ({ worker }: any, use: any) => {
      worker.use(...assetMSWHandlers);
      await use(undefined);
    },
    { auto: true },
  ],
});

describe("AudioTrack loading shimmer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("renders shimmer-placeholder CSS class (not inline JS hex-alpha)", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    render(
      html`
        <ef-timegroup mode="contain" duration="10s">
          <ef-audio
            src="media/bars-n-tone2.mp4"
            duration="10s"
          ></ef-audio>
        </ef-timegroup>
      `,
      container,
    );
    document.body.appendChild(container);

    // Create track with element set directly
    const audio = container.querySelector("ef-audio") as HTMLElement;
    await (audio as any).updateComplete;

    const track = document.createElement("ef-audio-track");
    (track as any).element = audio;
    document.body.appendChild(track);
    await (track as any).updateComplete;

    const shadow = track.shadowRoot!;
    expect(shadow).toBeTruthy();

    // Should render .shimmer-placeholder class element, not inline hex-alpha
    const placeholder = shadow.querySelector(".shimmer-placeholder");
    expect(placeholder).toBeTruthy();

    // Verify no inline style contains raw hex-alpha pattern (e.g. "#10B98122")
    const styledEls = Array.from(shadow.querySelectorAll("[style]"));
    const hasHexAlphaInline = styledEls.some((el) =>
      /background.*#[0-9a-fA-F]{6}[0-9a-fA-F]{2}/.test(
        (el as HTMLElement).getAttribute("style") ?? "",
      ),
    );
    expect(hasHexAlphaInline).toBe(false);
  });

  test("shimmer-placeholder gains is-loading class when loading", async ({
    expect,
  }) => {
    const track = document.createElement("ef-audio-track");
    const audio = document.createElement("ef-audio");
    audio.setAttribute("duration", "10s");
    (track as any).element = audio;
    document.body.appendChild(track);
    await (track as any).updateComplete;

    const shadow = track.shadowRoot!;

    // Initially not loading — no is-loading class
    expect(shadow.querySelector(".shimmer-placeholder.is-loading")).toBeFalsy();

    // Set loading
    (track as any)._isLoading = true;
    (track as any).requestUpdate();
    await (track as any).updateComplete;

    expect(
      shadow.querySelector(".shimmer-placeholder.is-loading"),
    ).toBeTruthy();

    // Clear loading
    (track as any)._isLoading = false;
    (track as any).requestUpdate();
    await (track as any).updateComplete;

    expect(shadow.querySelector(".shimmer-placeholder.is-loading")).toBeFalsy();
  });
});

describe("EFThumbnailStrip loading shimmer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("shows .shimmer-overlay.active while thumbnails are loading", async ({
    expect,
  }) => {
    // Use a real ef-video as target so the strip renders the normal path
    const video = document.createElement("ef-video");
    document.body.appendChild(video);
    await (video as any).updateComplete;

    const strip = document.createElement("ef-thumbnail-strip");
    (strip as any).targetElement = video;
    document.body.appendChild(strip);
    await (strip as any).updateComplete;

    // Force loading state
    (strip as any)._isLoadingThumbnails = true;
    (strip as any).requestUpdate();
    await (strip as any).updateComplete;

    const shadow = strip.shadowRoot!;
    const shimmerOverlay = shadow.querySelector(".shimmer-overlay.active");
    expect(shimmerOverlay).toBeTruthy();
  });

  test("shimmer-overlay not active when not loading", async ({ expect }) => {
    const video = document.createElement("ef-video");
    document.body.appendChild(video);
    await (video as any).updateComplete;

    const strip = document.createElement("ef-thumbnail-strip");
    (strip as any).targetElement = video;
    document.body.appendChild(strip);
    await (strip as any).updateComplete;

    // Ensure not loading
    (strip as any)._isLoadingThumbnails = false;
    (strip as any).requestUpdate();
    await (strip as any).updateComplete;

    const shadow = strip.shadowRoot!;
    const shimmerOverlay = shadow.querySelector(".shimmer-overlay.active");
    expect(shimmerOverlay).toBeFalsy();
  });
});

describe("EFVideo loading overlay CSS variables", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("loading bar track reflects --ef-color-loading-spinner-track", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    container.style.setProperty(
      "--ef-color-loading-spinner-track",
      "rgb(255, 0, 0)",
    );
    render(
      html`<ef-video
        src="media/bars-n-tone2.mp4"
        mode="asset"
        style="width:200px;height:150px;"
      ></ef-video>`,
      container,
    );
    document.body.appendChild(container);

    const video = container.querySelector("ef-video") as HTMLElement;
    await (video as any).updateComplete;

    (video as any).loadingState = {
      isLoading: true,
      operation: null,
      message: "",
    };
    (video as any).requestUpdate();
    await (video as any).updateComplete;

    const shadow = video.shadowRoot!;
    const overlay = shadow.querySelector(".loading-overlay") as HTMLElement;
    expect(overlay).toBeTruthy();

    const bg = getComputedStyle(overlay).backgroundColor;
    expect(bg).toBe("rgb(255, 0, 0)");
  });

  test("loading bar fill reflects --ef-color-loading-spinner-fill", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    container.style.setProperty(
      "--ef-color-loading-spinner-fill",
      "rgb(0, 255, 0)",
    );
    render(
      html`<ef-video
        src="media/bars-n-tone2.mp4"
        mode="asset"
        style="width:200px;height:150px;"
      ></ef-video>`,
      container,
    );
    document.body.appendChild(container);

    const video = container.querySelector("ef-video") as HTMLElement;
    await (video as any).updateComplete;

    (video as any).loadingState = {
      isLoading: true,
      operation: null,
      message: "",
    };
    (video as any).requestUpdate();
    await (video as any).updateComplete;

    const shadow = video.shadowRoot!;
    const bar = shadow.querySelector(".loading-bar") as HTMLElement;
    expect(bar).toBeTruthy();

    const bg = getComputedStyle(bar).backgroundColor;
    expect(bg).toBe("rgb(0, 255, 0)");
  });
});

describe("EFVideo prepareFrame triggers loading overlay", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("loading overlay appears after 100ms debounce during load", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    render(
      html`<ef-timegroup mode="contain" style="width:400px;height:300px;">
        <ef-video
          src="media/bars-n-tone2.mp4"
          mode="asset"
          style="width:400px;height:300px;"
        ></ef-video>
      </ef-timegroup>`,
      container,
    );
    document.body.appendChild(container);

    const video = container.querySelector("ef-video") as HTMLElement;
    await (video as any).updateComplete;

    // Start a loading operation
    (video as any).startDelayedLoading("test-load", "Loading frames...");

    // Before 250ms debounce: overlay should not yet be shown
    await (video as any).updateComplete;
    const shadowBefore = video.shadowRoot!;
    expect(shadowBefore.querySelector(".loading-overlay")).toBeFalsy();

    // After 250ms debounce elapses
    await new Promise((resolve) => setTimeout(resolve, 350));
    await (video as any).updateComplete;

    const shadowAfter = video.shadowRoot!;
    expect(shadowAfter.querySelector(".loading-overlay")).toBeTruthy();

    // Cleanup
    (video as any).clearDelayedLoading("test-load");
  });
});

describe("EFWorkbench preview loading overlay", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("shows .preview-loading-overlay when timegroup contentReadyState is loading", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    container.style.cssText = "width:600px;height:400px;";
    // ef-audio child is used to drive loading state via child aggregation:
    // EFTimegroup.contentReadyState is computed from children — we cannot set it directly.
    render(
      html`
        <ef-workbench style="width:600px;height:400px;">
          <ef-timegroup
            slot="canvas"
            mode="fixed"
            duration="10s"
            style="width:400px;height:300px;"
          >
            <ef-audio duration="10s"></ef-audio>
          </ef-timegroup>
        </ef-workbench>
      `,
      container,
    );
    document.body.appendChild(container);

    const workbench = container.querySelector("ef-workbench") as HTMLElement;
    await (workbench as any).updateComplete;

    const timegroup = container.querySelector("ef-timegroup") as HTMLElement;
    const audio = container.querySelector("ef-audio") as HTMLElement;
    await (audio as any).updateComplete;
    await (timegroup as any).updateComplete;

    // Drive loading state through the child — timegroup aggregates bottom-up
    (audio as any).setContentReadyState("loading");
    await (timegroup as any).updateComplete;

    // Allow workbench to respond to the readystatechange event
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await (workbench as any).updateComplete;

    const shadow = workbench.shadowRoot!;
    const loadingOverlay = shadow.querySelector(".preview-loading-overlay");
    expect(loadingOverlay).toBeTruthy();
  });

  test("hides .preview-loading-overlay when timegroup is ready", async ({
    expect,
  }) => {
    const container = document.createElement("div");
    render(
      html`
        <ef-workbench style="width:600px;height:400px;">
          <ef-timegroup
            slot="canvas"
            mode="contain"
            duration="10s"
            style="width:400px;height:300px;"
          >
            <ef-audio duration="10s"></ef-audio>
          </ef-timegroup>
        </ef-workbench>
      `,
      container,
    );
    document.body.appendChild(container);

    const workbench = container.querySelector("ef-workbench") as HTMLElement;
    await (workbench as any).updateComplete;

    const timegroup = container.querySelector("ef-timegroup") as HTMLElement;
    const audio = container.querySelector("ef-audio") as HTMLElement;
    await (audio as any).updateComplete;
    await (timegroup as any).updateComplete;

    // Transition through loading → ready via child aggregation
    (audio as any).setContentReadyState("loading");
    await (timegroup as any).updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await (workbench as any).updateComplete;

    (audio as any).setContentReadyState("ready");
    await (timegroup as any).updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await (workbench as any).updateComplete;

    const shadow = workbench.shadowRoot!;
    const loadingOverlay = shadow.querySelector(".preview-loading-overlay");
    expect(loadingOverlay).toBeFalsy();
  });
});
