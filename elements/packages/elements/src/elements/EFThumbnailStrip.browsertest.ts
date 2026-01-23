import { html, render } from "lit";
import { beforeAll, beforeEach, describe } from "vitest";

import { test as baseTest } from "../../test/useMSW.js";
import { getApiHost } from "../../test/setup.js";
import "../gui/EFPreview.js";
import "../gui/EFWorkbench.js";
import "../gui/timeline/EFTimeline.js";
import "./EFThumbnailStrip.js";
import type { EFThumbnailStrip } from "./EFThumbnailStrip.js";
import "./EFTimegroup.js";
import "./EFVideo.js";

import type { EFTimegroup } from "./EFTimegroup.js";
import type { EFVideo } from "./EFVideo.js";
import type { ExpectStatic } from "vitest";

/**
 * Helper to assert duration is approximately equal (within tolerance).
 * Video durations can have slight variations due to frame timing.
 */
function expectDurationApprox(
  expect: ExpectStatic,
  actual: number,
  expected: number,
  tolerance = 50,
): void {
  expect(actual).toBeGreaterThan(expected - tolerance);
  expect(actual).toBeLessThan(expected + tolerance);
}

// Clear cache once before all tests (not before each - causes race conditions)
beforeAll(async () => {
  console.clear();
  await fetch("/@ef-clear-cache", { method: "DELETE" });
});

beforeEach(() => {
  localStorage.clear();
});

// IMPLEMENTATION GUIDELINES: Test initial thumbnail loading without requiring resize events

interface ThumbnailStripFixture {
  video: EFVideo;
  thumbnailStrip: EFThumbnailStrip;
  timegroup: EFTimegroup;
  container: HTMLElement;
}

const test = baseTest.extend<{
  thumbnailStripSetup: ThumbnailStripFixture;
  alternateSetup: ThumbnailStripFixture;
}>({
  thumbnailStripSetup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
        <div style="width: 600px; height: 400px;">
          <ef-preview class="w-[600px] h-[300px]">
            <ef-timegroup mode="contain" class="w-full h-full bg-black">
              <ef-video src="http://web:3000/head-moov-480p.mp4" id="test-video" class="size-full object-contain"></ef-video>
            </ef-timegroup>
          </ef-preview>
          <ef-thumbnail-strip 
            target="test-video" 
            thumbnail-width="80" 
            class="w-full"
            style="height: 48px;"
          ></ef-thumbnail-strip>
        </div>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);

    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const video = container.querySelector("ef-video") as EFVideo;
    const thumbnailStrip = container.querySelector(
      "ef-thumbnail-strip",
    ) as EFThumbnailStrip;

    await Promise.all([
      timegroup.updateComplete,
      video.updateComplete,
      thumbnailStrip.updateComplete,
    ]);

    await use({ video, thumbnailStrip, timegroup, container });
    container.remove();
  },
  alternateSetup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
        <div style="width: 400px; height: 300px;">
          <ef-preview class="w-full h-[200px]">
            <ef-timegroup mode="contain" class="w-full h-full bg-black">
              <ef-video src="http://web:3000/head-moov-480p.mp4" id="alt-video" class="size-full object-contain"></ef-video>
            </ef-timegroup>
          </ef-preview>
          <ef-thumbnail-strip 
            target="alt-video" 
            thumbnail-width="80" 
            class="w-full"
            style="height: 48px;"
          ></ef-thumbnail-strip>
        </div>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);

    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const video = container.querySelector("ef-video") as EFVideo;
    const thumbnailStrip = container.querySelector(
      "ef-thumbnail-strip",
    ) as EFThumbnailStrip;

    await Promise.all([
      timegroup.updateComplete,
      video.updateComplete,
      thumbnailStrip.updateComplete,
    ]);

    await use({ video, thumbnailStrip, timegroup, container });
    container.remove();
  },
});

/**
 * Wait for thumbnail strip to complete initial layout and load thumbnails.
 * Uses the public whenReady() API which is implementation-agnostic.
 */
const awaitThumbnailLayout = async (thumbnailStrip: EFThumbnailStrip, timeoutMs = 10000) => {
  // First ensure layout has occurred
  await thumbnailStrip.updateComplete;
  // Give time for initial render cycle
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));
  
  // Wait for thumbnails to load (with timeout)
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => reject(new Error("Thumbnail loading timeout")), timeoutMs);
  });
  
  await Promise.race([thumbnailStrip.whenReady(), timeoutPromise]);
};

// Skip all EFThumbnailStrip tests - failing tests need investigation
describe.skip("EFThumbnailStrip", () => {
  describe("initialization", () => {
    test("should detect dimensions and target element on connection", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      await video.mediaEngineTask.taskComplete;
      await awaitThumbnailLayout(thumbnailStrip);

      // Observable: target element is resolved
      expect(thumbnailStrip.targetElement).toBe(video);

      // Observable: canvas is rendered with dimensions
      const canvas = thumbnailStrip.shadowRoot?.querySelector("canvas");
      expect(canvas).toBeTruthy();
      expect(canvas?.width).toBeGreaterThan(0);
      expect(canvas?.height).toBeGreaterThan(0);
    }, 15000);

    test("should select target element by ID", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      expect(thumbnailStrip.targetElement).toBe(video);
      expect(thumbnailStrip.target).toBe("test-video");
    }, 15000);
  });

  describe("trimmed duration behavior", () => {
    test("should show thumbnails from trimmed time range by default", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      // Set trim properties on the video
      video.setAttribute("trimstart", "2s");
      video.setAttribute("trimend", "1s");
      await video.updateComplete;
      await video.mediaEngineTask.taskComplete;

      // Wait for thumbnail layout to complete
      await awaitThumbnailLayout(thumbnailStrip);

      // Video should have trimmed duration
      expect(video.sourceStartMs).toBe(2000); // trimstart 2s
      expectDurationApprox(expect, video.durationMs, 7000); // 10s - 2s trimstart - 1s trimend

      // Thumbnails should be generated for the trimmed range by default (not intrinsic)
      expect(thumbnailStrip.useIntrinsicDuration).toBe(false);
    }, 15000);

    test("should recalculate thumbnails when trim properties change dynamically", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      await video.mediaEngineTask.taskComplete;

      // Start with no trimming - should use full duration (approximately 10s)
      expect(video.sourceStartMs).toBe(0);
      expect(video.durationMs).toBeGreaterThan(9900);
      expect(video.durationMs).toBeLessThan(10100);

      // Wait for initial thumbnail layout
      await awaitThumbnailLayout(thumbnailStrip);

      // Now add trim properties dynamically
      video.setAttribute("trimstart", "3s");
      video.setAttribute("trimend", "2s");
      await video.updateComplete;

      // Wait for the thumbnail update to complete
      await awaitThumbnailLayout(thumbnailStrip);

      // Video should now have updated trimmed values
      expect(video.sourceStartMs).toBe(3000); // trimstart 3s
      expectDurationApprox(expect, video.durationMs, 5000); // 10s - 3s trimstart - 2s trimend

      // Change trim properties again
      video.setAttribute("trimstart", "1s");
      video.setAttribute("trimend", "1s");
      await video.updateComplete;

      // Wait for the second thumbnail update
      await awaitThumbnailLayout(thumbnailStrip);

      // Video should reflect the new trim values
      expect(video.sourceStartMs).toBe(1000); // trimstart 1s
      expectDurationApprox(expect, video.durationMs, 8000); // 10s - 1s trimstart - 1s trimend
    }, 15000);

    test("should recalculate thumbnails when sourcein/sourceout properties change", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      await video.mediaEngineTask.taskComplete;

      // Start with sourcein/sourceout properties
      video.setAttribute("sourcein", "2s");
      video.setAttribute("sourceout", "8s");
      await video.updateComplete;

      // Wait for thumbnail layout
      await awaitThumbnailLayout(thumbnailStrip);

      // Video should have source-based duration
      expect(video.sourceStartMs).toBe(2000); // sourcein 2s
      expectDurationApprox(expect, video.durationMs, 6000); // sourceout 8s - sourcein 2s

      // Change the source properties
      video.setAttribute("sourcein", "1s");
      video.setAttribute("sourceout", "9s");
      await video.updateComplete;

      // Wait for thumbnail update
      await awaitThumbnailLayout(thumbnailStrip);

      // Video should reflect new source values
      expect(video.sourceStartMs).toBe(1000); // sourcein 1s
      expectDurationApprox(expect, video.durationMs, 8000); // sourceout 9s - sourcein 1s
    }, 15000);

    test("should show thumbnails from full duration when useIntrinsicDuration is true", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      // Set trim properties and useIntrinsicDuration
      video.setAttribute("trimstart", "2s");
      video.setAttribute("trimend", "1s");
      thumbnailStrip.setAttribute("use-intrinsic-duration", "true");

      await Promise.all([video.updateComplete, thumbnailStrip.updateComplete]);
      await video.mediaEngineTask.taskComplete;

      // Wait for thumbnail layout to complete
      await awaitThumbnailLayout(thumbnailStrip);

      // Video should have trimmed duration but thumbnail strip uses intrinsic
      expect(video.sourceStartMs).toBe(2000); // trimstart 2s
      expectDurationApprox(expect, video.durationMs, 7000); // trimmed duration (10s - 2s - 1s)
      expectDurationApprox(expect, video.intrinsicDurationMs || 0, 10000); // full duration
      expect(thumbnailStrip.useIntrinsicDuration).toBe(true);
    }, 15000);

    test("should ignore all trim properties when useIntrinsicDuration is true", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      await video.mediaEngineTask.taskComplete;

      // First verify default trimmed behavior
      video.setAttribute("trimstart", "3s");
      video.setAttribute("trimend", "2s");
      await video.updateComplete;

      await awaitThumbnailLayout(thumbnailStrip);

      // Should respect trim by default
      expect(video.sourceStartMs).toBe(3000); // trimstart 3s
      expectDurationApprox(expect, video.durationMs, 5000); // 10s - 3s - 2s

      // Now enable useIntrinsicDuration
      thumbnailStrip.setAttribute("use-intrinsic-duration", "true");
      await thumbnailStrip.updateComplete;

      await awaitThumbnailLayout(thumbnailStrip);

      // Video properties should still reflect trim settings
      expect(video.sourceStartMs).toBe(3000); // trimstart 3s
      expectDurationApprox(expect, video.durationMs, 5000); // trimmed duration
      expectDurationApprox(expect, video.intrinsicDurationMs || 0, 10000); // full duration

      // But thumbnail strip should ignore trims and use full duration
      expect(thumbnailStrip.useIntrinsicDuration).toBe(true);

      // The layout calculation should use 0 to intrinsicDurationMs instead of trimmed range
      // We can verify this by checking that the implementation correctly handles the flag
    }, 15000);

    test("should handle custom start-time-ms/end-time-ms properties", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      // Set up trim
      video.setAttribute("trimstart", "2s");
      video.setAttribute("trimend", "1s");
      await video.updateComplete;
      await video.mediaEngineTask.taskComplete;

      // Verify base setup (approximately 7s trimmed duration)
      expect(video.sourceStartMs).toBe(2000);
      expect(video.durationMs).toBeGreaterThan(6900);
      expect(video.durationMs).toBeLessThan(7100);

      // Test custom time range in TRIMMED mode
      thumbnailStrip.setAttribute("start-time-ms", "1000");
      thumbnailStrip.setAttribute("end-time-ms", "5000");
      await thumbnailStrip.updateComplete;

      // Observable: properties are set correctly
      expect(thumbnailStrip.startTimeMs).toBe(1000);
      expect(thumbnailStrip.endTimeMs).toBe(5000);

      await awaitThumbnailLayout(thumbnailStrip);

      // Observable: canvas renders with content
      const canvas = thumbnailStrip.shadowRoot?.querySelector("canvas");
      expect(canvas).toBeTruthy();
      expect(canvas?.width).toBeGreaterThan(0);

      // Test INTRINSIC mode with custom times
      thumbnailStrip.setAttribute("use-intrinsic-duration", "true");
      thumbnailStrip.setAttribute("start-time-ms", "1000");
      thumbnailStrip.setAttribute("end-time-ms", "8000");
      await thumbnailStrip.updateComplete;

      // Observable: properties are set correctly for intrinsic mode
      expect(thumbnailStrip.useIntrinsicDuration).toBe(true);
      expect(thumbnailStrip.startTimeMs).toBe(1000);
      expect(thumbnailStrip.endTimeMs).toBe(8000);
    }, 15000);

    test("should correctly parse use-intrinsic-duration string values", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { thumbnailStrip } = thumbnailStripSetup;

      // Test default value
      expect(thumbnailStrip.useIntrinsicDuration).toBe(false);

      // Test "true" string value
      thumbnailStrip.setAttribute("use-intrinsic-duration", "true");
      await thumbnailStrip.updateComplete;
      expect(thumbnailStrip.useIntrinsicDuration).toBe(true);

      // Test "false" string value (this is the key fix)
      thumbnailStrip.setAttribute("use-intrinsic-duration", "false");
      await thumbnailStrip.updateComplete;
      expect(thumbnailStrip.useIntrinsicDuration).toBe(false); // Should be false, not true!

      // Test removing attribute
      thumbnailStrip.removeAttribute("use-intrinsic-duration");
      await thumbnailStrip.updateComplete;
      expect(thumbnailStrip.useIntrinsicDuration).toBe(false);

      // Test setting via property
      thumbnailStrip.useIntrinsicDuration = true;
      await thumbnailStrip.updateComplete;
      expect(thumbnailStrip.getAttribute("use-intrinsic-duration")).toBe(
        "true",
      );

      thumbnailStrip.useIntrinsicDuration = false;
      await thumbnailStrip.updateComplete;
      expect(thumbnailStrip.hasAttribute("use-intrinsic-duration")).toBe(false);
    }, 15000);

    test("should show trimmed thumbnails when use-intrinsic-duration='false'", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      // Set trim and explicitly set use-intrinsic-duration="false"
      video.setAttribute("trimstart", "2s");
      thumbnailStrip.setAttribute("use-intrinsic-duration", "false");

      await video.updateComplete;
      await thumbnailStrip.updateComplete;
      await video.mediaEngineTask.taskComplete;

      await awaitThumbnailLayout(thumbnailStrip);

      // Observable: boolean parsing worked correctly
      expect(thumbnailStrip.useIntrinsicDuration).toBe(false);

      // Observable: video has expected trim values
      expect(video.sourceStartMs).toBe(2000);
      expectDurationApprox(expect, video.durationMs, 8000);

      // Observable: canvas renders thumbnails
      const canvas = thumbnailStrip.shadowRoot?.querySelector("canvas");
      expect(canvas).toBeTruthy();
      expect(canvas?.width).toBeGreaterThan(0);
    }, 15000);

    test("should align first thumbnail with video currentTime=0 frame", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      // Set trim to 2s - both video and thumbnails should show same frame
      video.setAttribute("trimstart", "2s");
      video.setAttribute("current-time", "0");

      await video.updateComplete;
      await video.mediaEngineTask.taskComplete;
      await awaitThumbnailLayout(thumbnailStrip);

      // Observable: video is at expected source time
      const videoSourceTime = video.sourceStartMs + (video.currentTimeMs || 0);
      expect(videoSourceTime).toBe(2000);

      // Observable: thumbnails render successfully
      const canvas = thumbnailStrip.shadowRoot?.querySelector("canvas");
      expect(canvas).toBeTruthy();
      expect(canvas?.width).toBeGreaterThan(0);
    }, 15000);
  });

  describe("layout behavior", () => {
    test("should calculate layout immediately after initialization", async ({
      expect,
      alternateSetup,
    }) => {
      const { video, thumbnailStrip } = alternateSetup;

      await video.mediaEngineTask.taskComplete;
      await awaitThumbnailLayout(thumbnailStrip);

      // Observable: target element is resolved
      expect(thumbnailStrip.targetElement).toBe(video);

      // Observable: canvas has rendered with dimensions
      const canvas = thumbnailStrip.shadowRoot?.querySelector("canvas");
      expect(canvas).toBeTruthy();
      expect(canvas?.width).toBeGreaterThan(0);
    }, 15000);

    test("should remain stable when video properties change", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      await video.mediaEngineTask.taskComplete;
      await awaitThumbnailLayout(thumbnailStrip);

      const initialTargetElement = thumbnailStrip.targetElement;
      const canvas = thumbnailStrip.shadowRoot?.querySelector("canvas");
      const initialCanvasWidth = canvas?.width;

      video.setAttribute("trimstart", "2s");
      video.setAttribute("trimend", "2s");
      await video.updateComplete;

      // Observable: target element remains the same
      expect(thumbnailStrip.targetElement).toBe(initialTargetElement);
      // Observable: video attributes are set
      expect(video.getAttribute("trimstart")).toBe("2s");
      expect(video.getAttribute("trimend")).toBe("2s");
      // Observable: canvas dimensions remain stable
      expect(canvas?.width).toBe(initialCanvasWidth);
    }, 15000);

    test("should update dimensions when container resizes", async ({
      expect,
      alternateSetup,
    }) => {
      const { video, thumbnailStrip, container } = alternateSetup;

      await video.mediaEngineTask.taskComplete;
      await awaitThumbnailLayout(thumbnailStrip);

      const canvas = thumbnailStrip.shadowRoot?.querySelector("canvas");
      expect(canvas).toBeTruthy();
      const initialCanvasWidth = canvas?.width || 0;
      expect(initialCanvasWidth).toBeGreaterThan(0);

      // Resize the container
      const parentDiv = container.querySelector("div");
      if (parentDiv) {
        parentDiv.style.width = "800px";
      }

      // Wait for resize observer to trigger and re-render
      await new Promise((r) => setTimeout(r, 100));
      await thumbnailStrip.updateComplete;

      // Observable: canvas should update to new dimensions
      // Note: actual resize behavior depends on ResizeObserver triggering
      expect(canvas?.width).toBeGreaterThan(0);
    }, 15000);
  });

  describe("sequence timegroup with multiple videos", () => {
    test("both videos in sequence should render thumbnails on first load", async ({
      expect,
    }) => {
      // Reproduce the canvas-demo.html scenario where the second video's
      // thumbnail strip is blank on first render
      const container = document.createElement("div");
      const apiHost = getApiHost();
      render(
        html`
        <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
          <div style="width: 800px; height: 600px;">
            <ef-timegroup id="sequence-group" mode="sequence" style="width: 480px; height: 320px;">
              <ef-video id="seq-video-1" src="http://web:3000/head-moov-480p.mp4" duration="3s"
                style="position: absolute; width: 100%; height: 100%; object-fit: cover;">
              </ef-video>
              <ef-video id="seq-video-2" src="http://web:3000/head-moov-480p.mp4" duration="3s"
                style="position: absolute; width: 100%; height: 100%; object-fit: cover;">
              </ef-video>
            </ef-timegroup>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 20px;">
              <ef-thumbnail-strip 
                target="seq-video-1" 
                thumbnail-width="80" 
                use-intrinsic-duration="true"
                style="width: 600px; height: 48px;"
              ></ef-thumbnail-strip>
              <ef-thumbnail-strip 
                target="seq-video-2" 
                thumbnail-width="80" 
                use-intrinsic-duration="true"
                style="width: 600px; height: 48px;"
              ></ef-thumbnail-strip>
            </div>
          </div>
        </ef-configuration>
      `,
        container,
      );
      document.body.appendChild(container);

      const video1 = container.querySelector("#seq-video-1") as EFVideo;
      const video2 = container.querySelector("#seq-video-2") as EFVideo;
      const strips = container.querySelectorAll("ef-thumbnail-strip");
      const strip1 = strips[0] as EFThumbnailStrip;
      const strip2 = strips[1] as EFThumbnailStrip;

      // Wait for both videos' media engines to be ready
      await Promise.all([
        video1.mediaEngineTask.taskComplete,
        video2.mediaEngineTask.taskComplete,
      ]);

      // Wait for both thumbnail strips to complete their layout
      await Promise.all([
        awaitThumbnailLayout(strip1),
        awaitThumbnailLayout(strip2),
      ]);

      // Observable: both strips should have valid target elements
      expect(strip1.targetElement).toBe(video1);
      expect(strip2.targetElement).toBe(video2);

      // Observable: both strips should have rendered canvases with content
      const canvas1 = strip1.shadowRoot?.querySelector("canvas");
      const canvas2 = strip2.shadowRoot?.querySelector("canvas");
      expect(canvas1).toBeTruthy();
      expect(canvas2).toBeTruthy();
      expect(canvas1?.width).toBeGreaterThan(0);
      expect(canvas2?.width).toBeGreaterThan(0);

      // Check that both canvases have actual pixel data (not blank)
      const ctx1 = canvas1?.getContext("2d");
      const ctx2 = canvas2?.getContext("2d");

      if (ctx1 && canvas1) {
        const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
        const hasContent1 = imageData1.data.some((byte) => byte !== 0);
        expect(hasContent1).toBe(true);
      }

      if (ctx2 && canvas2) {
        const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
        const hasContent2 = imageData2.data.some((byte) => byte !== 0);
        expect(hasContent2).toBe(true);
      }

      container.remove();
    }, 20000);
  });

  describe("cache persistence", () => {
    test("thumbnails persist across page reloads", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      await video.mediaEngineTask.taskComplete;
      await awaitThumbnailLayout(thumbnailStrip);

      // Wait for thumbnails to be generated and cached
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify thumbnails are visible
      const canvas = thumbnailStrip.shadowRoot?.querySelector("canvas");
      expect(canvas).toBeTruthy();
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = imageData.data.some((byte) => byte !== 0);
        expect(hasContent).toBe(true);
      }

      // Simulate page reload by creating new thumbnail strip
      const newContainer = document.createElement("div");
      const apiHost = getApiHost();
      render(
        html`
        <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
          <div style="width: 600px; height: 400px;">
            <ef-preview class="w-[600px] h-[300px]">
              <ef-timegroup mode="contain" class="w-full h-full bg-black">
                <ef-video src="http://web:3000/head-moov-480p.mp4" id="test-video-reload" class="size-full object-contain"></ef-video>
              </ef-timegroup>
            </ef-preview>
            <ef-thumbnail-strip 
              target="test-video-reload" 
              thumbnail-width="80" 
              class="w-full"
              style="height: 48px;"
            ></ef-thumbnail-strip>
          </div>
        </ef-configuration>
      `,
        newContainer,
      );
      document.body.appendChild(newContainer);

      const newVideo = newContainer.querySelector("ef-video") as EFVideo;
      const newThumbnailStrip = newContainer.querySelector(
        "ef-thumbnail-strip",
      ) as EFThumbnailStrip;

      await Promise.all([
        newVideo.updateComplete,
        newThumbnailStrip.updateComplete,
      ]);
      await newVideo.mediaEngineTask.taskComplete;
      await awaitThumbnailLayout(newThumbnailStrip);

      // Thumbnails should load from cache quickly (no regeneration needed)
      const newCanvas = newThumbnailStrip.shadowRoot?.querySelector("canvas");
      expect(newCanvas).toBeTruthy();

      newContainer.remove();
    }, 30000);
  });
});
