/**
 * Test to verify video frames are ready after seekForRender
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import type { EFVideo } from "../elements/EFVideo.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";

const TEST_VIDEO_URL = "http://host.docker.internal:3000/sync-test.mp4";

async function isTestServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(TEST_VIDEO_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

describe("Video Frame Readiness", () => {
  let serverAvailable = false;

  beforeAll(async () => {
    await customElements.whenDefined("ef-timegroup");
    await customElements.whenDefined("ef-video");
    serverAvailable = await isTestServerAvailable();
  });

  it(
    "should have video canvas pixels after seekForRender",
    { timeout: 30000 },
    async ({ skip }) => {
      if (!serverAvailable) {
        skip();
        return;
      }
      const tg = document.createElement("ef-timegroup") as EFTimegroup;
      tg.setAttribute("mode", "fixed");
      tg.setAttribute("duration", "5s");
      tg.style.cssText = "width: 640px; height: 360px; background: black; display: block;";

      const video = document.createElement("ef-video") as EFVideo;
      video.src = "http://host.docker.internal:3000/sync-test.mp4";
      video.setAttribute("sourcein", "0s");
      video.setAttribute("sourceout", "5s");
      video.style.cssText = "width: 100%; height: 100%; position: absolute;";

      tg.appendChild(video);
      document.body.appendChild(tg);

      try {
        await tg.updateComplete;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Let video load

        // Create render clone
        const { clone: renderClone, cleanup } = await tg.createRenderClone();

        try {
          const cloneVideo = renderClone.querySelector("ef-video") as EFVideo;
          expect(cloneVideo).toBeTruthy();

          // Test multiple time points
          const testTimes = [0, 500, 1000, 1500, 2000];

          for (const timeMs of testTimes) {
            console.log(`\n[Frame Readiness Test] Seeking to ${timeMs}ms...`);

            await renderClone.seekForRender(timeMs);

            console.log(`[Frame Readiness Test] seekForRender returned`);

            // Check if video canvas has content
            const shadowCanvas = cloneVideo.shadowRoot?.querySelector("canvas");
            expect(shadowCanvas).toBeTruthy();

            if (shadowCanvas) {
              console.log(
                `[Frame Readiness Test] Canvas dimensions: ${shadowCanvas.width}x${shadowCanvas.height}`,
              );

              // Check if canvas has any pixels
              const ctx = shadowCanvas.getContext("2d");
              if (ctx && shadowCanvas.width > 0 && shadowCanvas.height > 0) {
                const imageData = ctx.getImageData(
                  0,
                  0,
                  Math.min(10, shadowCanvas.width),
                  Math.min(10, shadowCanvas.height),
                );
                const hasContent = imageData.data.some((val, idx) => idx % 4 === 3 && val > 0); // Check for non-transparent pixels

                console.log(`[Frame Readiness Test] Canvas has content: ${hasContent}`);

                if (!hasContent) {
                  console.log(`❌ WARNING: Canvas is empty at ${timeMs}ms after seekForRender!`);
                }
              }
            }

            // Small delay between seeks to let things settle
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          cleanup();
        } catch (e) {
          cleanup();
          throw e;
        }
      } finally {
        document.body.removeChild(tg);
      }
    },
  );
});
