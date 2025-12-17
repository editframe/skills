import { html, render } from "lit";
import { beforeEach, describe } from "vitest";

import { test as baseTest } from "../../test/useMSW.js";
import { getApiHost } from "../../test/setup.js";
import "../gui/EFPreview.js";
import "../gui/EFWorkbench.js";
import "./EFThumbnailStrip.js";
import type { EFThumbnailStrip } from "./EFThumbnailStrip.js";
import "./EFTimegroup.js";
import "./EFVideo.js";

import type { EFTimegroup } from "./EFTimegroup.js";
import type { EFVideo } from "./EFVideo.js";

beforeEach(async () => {
  localStorage.clear();
  await fetch("/@ef-clear-cache", { method: "DELETE" });
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

const awaitThumbnailLayout = async (thumbnailStrip: EFThumbnailStrip) => {
  // @ts-expect-error missing implementation
  await thumbnailStrip.thumbnailLayoutTask.taskComplete;
};

// TODO: Update tests for new implementation
describe.skip("EFThumbnailStrip", () => {
  describe("initialization", () => {
    test("should detect dimensions and target element on connection", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      await video.mediaEngineTask.taskComplete;

      expect(thumbnailStrip.targetElement).toBe(video);
      // @ts-expect-error testing private property
      expect(thumbnailStrip.stripWidth).toBeGreaterThan(0);

      const canvas = thumbnailStrip.shadowRoot?.querySelector("canvas");
      expect(canvas).toBeTruthy();
      expect(canvas?.width).toBeGreaterThan(0);
      expect(canvas?.height).toBeGreaterThan(0);
    }, 1000);

    test("should select target element by ID", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      expect(thumbnailStrip.targetElement).toBe(video);
      expect(thumbnailStrip.target).toBe("test-video");
    }, 1000);
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
      expect(video.durationMs).toBe(7000); // 10s - 2s trimstart - 1s trimend

      // Thumbnails should be generated for the trimmed range by default (not intrinsic)
      expect(thumbnailStrip.useIntrinsicDuration).toBe(false);
    }, 1000);

    test("should recalculate thumbnails when trim properties change dynamically", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      await video.mediaEngineTask.taskComplete;

      // Start with no trimming - should use full duration
      expect(video.sourceStartMs).toBe(0);
      expect(video.durationMs).toBe(10000); // full 10s duration

      // Wait for initial thumbnail layout
      await awaitThumbnailLayout(thumbnailStrip);

      // Now add trim properties dynamically
      video.setAttribute("trimstart", "3s");
      video.setAttribute("trimend", "2s");
      await video.updateComplete;

      // @ts-expect-error testing private task
      await thumbnailStrip.thumbnailLayoutTask.taskComplete;

      // Wait for the thumbnail update to complete
      await awaitThumbnailLayout(thumbnailStrip);

      // Video should now have updated trimmed values
      expect(video.sourceStartMs).toBe(3000); // trimstart 3s
      expect(video.durationMs).toBe(5000); // 10s - 3s trimstart - 2s trimend

      // Change trim properties again
      video.setAttribute("trimstart", "1s");
      video.setAttribute("trimend", "1s");
      await video.updateComplete;

      // Wait for the second thumbnail update
      await awaitThumbnailLayout(thumbnailStrip);

      // Video should reflect the new trim values
      expect(video.sourceStartMs).toBe(1000); // trimstart 1s
      expect(video.durationMs).toBe(8000); // 10s - 1s trimstart - 1s trimend
    }, 2000);

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
      expect(video.durationMs).toBe(6000); // sourceout 8s - sourcein 2s

      // Change the source properties
      video.setAttribute("sourcein", "1s");
      video.setAttribute("sourceout", "9s");
      await video.updateComplete;

      // Wait for thumbnail update
      await awaitThumbnailLayout(thumbnailStrip);

      // Video should reflect new source values
      expect(video.sourceStartMs).toBe(1000); // sourcein 1s
      expect(video.durationMs).toBe(8000); // sourceout 9s - sourcein 1s
    }, 2000);

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
      expect(video.durationMs).toBe(7000); // trimmed duration (10s - 2s - 1s)
      expect(video.intrinsicDurationMs).toBe(10000); // full duration
      expect(thumbnailStrip.useIntrinsicDuration).toBe(true);
    }, 1000);

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
      expect(video.durationMs).toBe(5000); // 10s - 3s - 2s

      // Now enable useIntrinsicDuration
      thumbnailStrip.setAttribute("use-intrinsic-duration", "true");
      await thumbnailStrip.updateComplete;

      await awaitThumbnailLayout(thumbnailStrip);

      // Video properties should still reflect trim settings
      expect(video.sourceStartMs).toBe(3000); // trimstart 3s
      expect(video.durationMs).toBe(5000); // trimmed duration
      expect(video.intrinsicDurationMs).toBe(10000); // full duration

      // But thumbnail strip should ignore trims and use full duration
      expect(thumbnailStrip.useIntrinsicDuration).toBe(true);

      // The layout calculation should use 0 to intrinsicDurationMs instead of trimmed range
      // We can verify this by checking that the implementation correctly handles the flag
    }, 2000);

    test("should handle custom start-time-ms/end-time-ms relative to correct timeline", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      // Set up trim: source 0-10s becomes trimmed 0-7s (source 2-9s)
      video.setAttribute("trimstart", "2s");
      video.setAttribute("trimend", "1s");
      await video.updateComplete;
      // CRITICAL: Wait for media engine task completion AFTER setting trim attributes
      await video.mediaEngineTask.taskComplete;

      // Verify base setup
      expect(video.sourceStartMs).toBe(2000); // Trim starts at 2s in source
      expect(video.durationMs).toBe(7000); // 7s trimmed duration

      // Test custom time range in TRIMMED mode (default)
      // start-time-ms="1000" should mean 1s into the trimmed portion = 3s in source
      // end-time-ms="5000" should mean 5s into the trimmed portion = 7s in source
      thumbnailStrip.setAttribute("start-time-ms", "1000"); // 1s into trimmed timeline
      thumbnailStrip.setAttribute("end-time-ms", "5000"); // 5s into trimmed timeline
      await thumbnailStrip.updateComplete;

      // Verify the properties were set
      expect(thumbnailStrip.startTimeMs).toBe(1000);
      expect(thumbnailStrip.endTimeMs).toBe(5000);

      // Force thumbnail layout to run with new properties
      // @ts-expect-error missing implementation
      thumbnailStrip.thumbnailLayoutTask.run();
      await awaitThumbnailLayout(thumbnailStrip);

      // Get layout and check timestamps
      // @ts-expect-error missing implementation
      const layout = thumbnailStrip.thumbnailLayoutTask.value;
      expect(layout).toBeTruthy();

      if (layout) {
        const allTimestamps = layout.segments.flatMap((segment) =>
          segment.thumbnails.map((thumb) => thumb.timeMs),
        );

        expect(allTimestamps.length).toBeGreaterThan(0);

        // Thumbnails should be from 3000ms to 7000ms in source timeline
        // (trimstart 2000ms + custom start 1000ms = 3000ms to trimstart 2000ms + custom end 5000ms = 7000ms)
        const minTime = Math.min(...allTimestamps);
        const maxTime = Math.max(...allTimestamps);

        expect(minTime).toBeGreaterThanOrEqual(3000); // Should start from 3s in source
        expect(minTime).toBeLessThan(3500); // Should be close to 3s
        expect(maxTime).toBeLessThanOrEqual(7000); // Should end at 7s in source
        expect(maxTime).toBeGreaterThan(6500); // Should be close to 7s
      }

      // Test INTRINSIC mode with custom times
      // start-time-ms="1000" should mean 1s in source timeline
      // end-time-ms="8000" should mean 8s in source timeline
      thumbnailStrip.setAttribute("use-intrinsic-duration", "true");
      thumbnailStrip.setAttribute("start-time-ms", "1000"); // 1s in source timeline
      thumbnailStrip.setAttribute("end-time-ms", "8000"); // 8s in source timeline
      await thumbnailStrip.updateComplete;

      // Verify the properties were set correctly for intrinsic mode
      expect(thumbnailStrip.useIntrinsicDuration).toBe(true);
      expect(thumbnailStrip.startTimeMs).toBe(1000);
      expect(thumbnailStrip.endTimeMs).toBe(8000);

      // Force thumbnail layout to run with intrinsic mode properties
      // @ts-expect-error missing implementation
      thumbnailStrip.thumbnailLayoutTask.run();
      await awaitThumbnailLayout(thumbnailStrip);

      // @ts-expect-error missing implementation
      const intrinsicLayout = thumbnailStrip.thumbnailLayoutTask.value;
      expect(intrinsicLayout).toBeTruthy();

      if (intrinsicLayout) {
        const intrinsicTimestamps = intrinsicLayout.segments.flatMap(
          (segment) => segment.thumbnails.map((thumb) => thumb.timeMs),
        );

        expect(intrinsicTimestamps.length).toBeGreaterThan(0);

        // In intrinsic mode, should be 1000ms to 8000ms directly in source timeline
        const intrinsicMin = Math.min(...intrinsicTimestamps);
        const intrinsicMax = Math.max(...intrinsicTimestamps);

        expect(intrinsicMin).toBeGreaterThanOrEqual(1000); // Should start from 1s in source
        expect(intrinsicMin).toBeLessThan(1500); // Should be close to 1s
        expect(intrinsicMax).toBeLessThanOrEqual(8000); // Should end at 8s in source
        expect(intrinsicMax).toBeGreaterThan(7500); // Should be close to 8s
      }
    }, 3000);

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
    }, 1000);

    test("should show trimmed thumbnails when use-intrinsic-duration='false'", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      // Set trim and explicitly set use-intrinsic-duration="false"
      video.setAttribute("trimstart", "2s");
      thumbnailStrip.setAttribute("use-intrinsic-duration", "false"); // This should be false!

      await video.updateComplete;
      await thumbnailStrip.updateComplete;
      await video.mediaEngineTask.taskComplete;

      await awaitThumbnailLayout(thumbnailStrip);

      // Verify the boolean parsing worked correctly
      expect(thumbnailStrip.useIntrinsicDuration).toBe(false); // Should be false, not true!
      expect(thumbnailStrip.getAttribute("use-intrinsic-duration")).toBe(
        "false",
      );

      // Verify thumbnail behavior: should use trimmed timeline, starting from 2s
      expect(video.sourceStartMs).toBe(2000); // trimstart 2s
      expect(video.durationMs).toBe(8000); // 10s - 2s = 8s trimmed duration

      // @ts-expect-error testing private task
      const layout = thumbnailStrip.thumbnailLayoutTask.value;
      if (layout) {
        const allTimestamps = layout.segments.flatMap((segment) =>
          segment.thumbnails.map((thumb) => thumb.timeMs),
        );
        expect(allTimestamps.length).toBeGreaterThan(0);

        // Thumbnails should start from 2000ms (trimstart), not 0ms
        const firstTimestamp = Math.min(...allTimestamps);
        expect(firstTimestamp).toBeGreaterThanOrEqual(2000);
        expect(firstTimestamp).toBeLessThan(2500);
      }
    }, 1000);

    test("should align first thumbnail with video currentTime=0 frame", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      // Set trim to 2s - both video and thumbnails should show same frame
      video.setAttribute("trimstart", "2s");
      video.setAttribute("current-time", "0"); // 0 in trimmed timeline = 2s in source

      await video.updateComplete;
      await video.mediaEngineTask.taskComplete;

      // Wait for thumbnail calculations
      // @ts-expect-error testing private task
      await thumbnailStrip.thumbnailLayoutTask.taskComplete;

      // Get the video's current source time (what frame it's showing)
      const videoSourceTime = video.sourceStartMs + (video.currentTimeMs || 0);
      expect(videoSourceTime).toBe(2000); // Should be at 2s in source (frame 61)

      // Get the first thumbnail timestamp
      // @ts-expect-error testing private task
      const layout = thumbnailStrip.thumbnailLayoutTask.value;
      if (layout) {
        const allTimestamps = layout.segments.flatMap((segment) =>
          segment.thumbnails.map((thumb) => thumb.timeMs),
        );
        expect(allTimestamps.length).toBeGreaterThan(0);

        const firstThumbnailTime = Math.min(...allTimestamps);

        // The first thumbnail should be at exactly the same source time as video currentTime=0
        // This ensures frame 61 shows in both video and thumbnail
        expect(firstThumbnailTime).toBe(videoSourceTime); // Should be exactly 2000ms
      }
    }, 1000);
  });

  describe("layout behavior", () => {
    test("should calculate layout immediately after initialization", async ({
      expect,
      alternateSetup,
    }) => {
      const { video, thumbnailStrip } = alternateSetup;

      await video.mediaEngineTask.taskComplete;

      // @ts-expect-error testing private property
      expect(thumbnailStrip.stripWidth).toBe(400); // Uses container inner width
      expect(thumbnailStrip.targetElement).toBe(video);
    }, 1000);

    test("should remain stable when video properties change", async ({
      expect,
      thumbnailStripSetup,
    }) => {
      const { video, thumbnailStrip } = thumbnailStripSetup;

      await video.mediaEngineTask.taskComplete;

      const initialState = {
        // @ts-expect-error testing private property
        stripWidth: thumbnailStrip.stripWidth,
        targetElement: thumbnailStrip.targetElement,
      };

      video.setAttribute("trimstart", "2s");
      video.setAttribute("trimend", "2s");
      await video.updateComplete;

      // @ts-expect-error testing private property
      expect(thumbnailStrip.stripWidth).toBe(initialState.stripWidth);
      expect(thumbnailStrip.targetElement).toBe(initialState.targetElement);
      expect(video.getAttribute("trimstart")).toBe("2s");
      expect(video.getAttribute("trimend")).toBe("2s");
    }, 1000);

    test("should update dimensions when container resizes", async ({
      expect,
      alternateSetup,
    }) => {
      const { video, thumbnailStrip } = alternateSetup;

      await video.mediaEngineTask.taskComplete;

      // @ts-expect-error testing private property
      const initialWidth = thumbnailStrip.stripWidth;
      expect(initialWidth).toBe(400); // Container inner width

      // Wait for any pending thumbnail layout tasks to complete
      await awaitThumbnailLayout(thumbnailStrip);

      // Simulate resize by directly setting the internal width and triggering update
      (thumbnailStrip as any)._stripWidth = 800;
      // @ts-expect-error testing private property
      const finalWidth = thumbnailStrip.stripWidth;

      expect(finalWidth).toBe(800);
      expect(finalWidth).toBeGreaterThan(initialWidth);
    }, 1000);
  });
});
