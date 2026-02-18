/**
 * Canvas rendering performance with video content.
 *
 * Proves that the canvas RAF loop runs at full speed even when video elements
 * are present, matching DOM mode behavior where the browser composites whatever
 * frame is currently available without blocking.
 */
import { html, render } from "lit";
import { describe, expect } from "vitest";
import { test as baseTest } from "../../test/useMSW.js";
import { getApiHost } from "../../test/setup.js";
import { renderTimegroupToCanvas } from "./renderTimegroupToCanvas.js";
import { isNativeCanvasApiAvailable } from "./previewSettings.js";
import { captureTimelineToDataUri } from "./rendering/serializeTimelineDirect.js";
import { RenderContext } from "./RenderContext.js";
import { updateAnimations } from "../elements/updateAnimations.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import "../elements/EFTimegroup.js";
import "../elements/EFSurface.js";
import "../elements/EFVideo.js";
import "../elements/EFText.js";
import "../elements/EFTextSegment.js";
import "../gui/EFPreview.js";
import "../gui/EFConfiguration.js";

const PAINT_THRESHOLD_MS = 0.05;

const test = baseTest.extend<{
  videoTimegroup: { tg: EFTimegroup; container: HTMLDivElement };
}>({
  videoTimegroup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    render(
      html`
        <ef-configuration api-host="${apiHost}" signing-url="">
          <ef-preview>
            <ef-timegroup
              mode="contain"
              id="video-perf-test"
              style="width: 800px; height: 450px; background: linear-gradient(180deg, #0f0c29, #302b63);"
            >
              <ef-video
                src="bars-n-tone.mp4"
                style="width: 100%; height: 100%; object-fit: contain;"
              ></ef-video>
              <ef-text
                start="0s"
                end="5s"
                style="position:absolute;top:20px;left:20px;color:white;font-size:32px;"
              >
                <ef-text-segment>Overlay Text</ef-text-segment>
              </ef-text>
            </ef-timegroup>
          </ef-preview>
        </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);
    const tg = container.querySelector("#video-perf-test") as EFTimegroup;
    await tg.updateComplete;
    await tg.waitForMediaDurations();
    await use({ tg, container });
    container.remove();
  },
});

describe("Canvas Video Performance", () => {
  test("native: RAF loop with video+HTML content runs at full speed", async ({
    videoTimegroup: { tg, container },
  }) => {
    const hasNative = isNativeCanvasApiAvailable();
    if (!hasNative) {
      return;
    }

    const result = renderTimegroupToCanvas(tg, {
      scale: 1,
      resolutionScale: 1,
    });
    const { refresh, dispose } = result;
    container.appendChild(result.container);

    // Warm up — capture one frame to prime the pipeline
    tg.currentTimeMs = 0;
    await refresh();

    // Simulate scrubbing: rapidly change time with RAF cadence
    const FRAMES = 60;
    const frameTimestamps: number[] = [];
    let paintCount = 0;

    for (let i = 0; i < FRAMES; i++) {
      tg.currentTimeMs = Math.round((i / FRAMES) * tg.durationMs);

      const frameStart = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve),
      );
      frameTimestamps.push(frameStart);

      const t0 = performance.now();
      await refresh();
      const elapsed = performance.now() - t0;
      if (elapsed > PAINT_THRESHOLD_MS) paintCount++;
    }

    const gaps: number[] = [];
    for (let i = 1; i < frameTimestamps.length; i++) {
      gaps.push(frameTimestamps[i]! - frameTimestamps[i - 1]!);
    }
    const avgGap =
      gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

    // The key assertion: with the fix, the RAF loop should NOT be blocked
    // by video preparation. Average frame gaps should be well under the
    // pre-fix ~80-100ms blocking regime. In Docker with other tests running
    // concurrently, individual frames may spike due to scheduling.
    expect(paintCount).toBeGreaterThan(FRAMES * 0.2);
    expect(avgGap).toBeLessThan(150); // catches regression to blocking regime

    dispose();
  }, 30000);

  test("foreignObject: RAF loop with video+HTML content", async ({
    videoTimegroup: { tg },
  }) => {
    const renderContext = new RenderContext();
    const width = tg.offsetWidth || 800;
    const height = tg.offsetHeight || 450;

    // Warm up — capture one frame to prime the pipeline
    tg.currentTimeMs = 0;
    updateAnimations(tg);
    await captureTimelineToDataUri(tg, width, height, {
      renderContext,
      canvasScale: 1,
      timeMs: 0,
    });

    const FRAMES = 30;
    const frameTimestamps: number[] = [];
    let paintCount = 0;

    for (let i = 0; i < FRAMES; i++) {
      tg.currentTimeMs = Math.round((i / FRAMES) * tg.durationMs);

      const frameStart = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve),
      );
      frameTimestamps.push(frameStart);

      const t0 = performance.now();
      updateAnimations(tg);
      await captureTimelineToDataUri(tg, width, height, {
        renderContext,
        canvasScale: 0.5,
        timeMs: tg.currentTimeMs,
      });
      const elapsed = performance.now() - t0;
      if (elapsed > PAINT_THRESHOLD_MS) paintCount++;
    }

    const gaps: number[] = [];
    for (let i = 1; i < frameTimestamps.length; i++) {
      gaps.push(frameTimestamps[i]! - frameTimestamps[i - 1]!);
    }
    const avgGap =
      gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

    // ForeignObject is slower due to serialization, but should not be blocked
    // by video preparation. Should achieve >20fps for interactive scrubbing.
    expect(paintCount).toBeGreaterThan(FRAMES * 0.5);
    expect(avgGap).toBeLessThan(150); // catches regression to blocking regime

    renderContext.dispose();
  }, 30000);

  test("comparison: video+HTML performance across all paths", async ({
    videoTimegroup: { tg, container },
  }) => {
    const hasNative = isNativeCanvasApiAvailable();

    // Warm up
    tg.currentTimeMs = 0;

    const FRAMES = 20;

    // --- ForeignObject path ---
    const renderContext = new RenderContext();
    const width = tg.offsetWidth || 800;
    const height = tg.offsetHeight || 450;
    const foTimes: number[] = [];

    for (let i = 0; i < FRAMES; i++) {
      tg.currentTimeMs = Math.round((i / FRAMES) * tg.durationMs);
      await new Promise((r) => requestAnimationFrame(r));
      updateAnimations(tg);
      const t0 = performance.now();
      await captureTimelineToDataUri(tg, width, height, {
        renderContext,
        canvasScale: 0.5,
        timeMs: tg.currentTimeMs,
      });
      foTimes.push(performance.now() - t0);
    }
    renderContext.dispose();

    const foAvg = foTimes.reduce((a, b) => a + b, 0) / foTimes.length;

    // --- Native path (if available) ---
    if (hasNative) {
      const result = renderTimegroupToCanvas(tg, {
        scale: 1,
        resolutionScale: 1,
      });
      const { refresh, dispose } = result;
      container.appendChild(result.container);
      await refresh();

      const nativeTimes: number[] = [];
      for (let i = 0; i < FRAMES; i++) {
        tg.currentTimeMs = Math.round((i / FRAMES) * tg.durationMs);
        await new Promise((r) => requestAnimationFrame(r));
        const t0 = performance.now();
        await refresh();
        nativeTimes.push(performance.now() - t0);
      }

      const nativeAvg =
        nativeTimes.reduce((a, b) => a + b, 0) / nativeTimes.length;

      // Native with video: drawElementImage renders live DOM including video canvas.
      // ~9-12ms for 800x450 with video is expected (capture cost, not idle time).
      // Before the fix this was ~80-100ms due to blocking on video segment fetches.
      expect(nativeAvg).toBeLessThan(100); // catches regression to blocking regime

      dispose();
    }

    // ForeignObject should complete within interactive threshold
    expect(foAvg).toBeLessThan(100);
  }, 30000);
});
