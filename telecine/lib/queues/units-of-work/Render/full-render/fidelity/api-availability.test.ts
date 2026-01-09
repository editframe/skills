/**
 * Fast test: Browser Render RPC Handlers
 *
 * Verifies that the browser render RPC handlers are registered
 * and can be called without crashing.
 *
 * Expected time: ~3-5s
 */

import { describe, test, expect } from "vitest";
import { test as fixtureTest } from "../fixtures";
import { bundleTestTemplate } from "../../test-utils/html-bundler";

describe("Browser Render RPC Handlers", () => {
  // Simple HTML with no external assets - just a colored div
  const simpleHtml = /* HTML */ `
    <ef-timegroup class="w-[100px] h-[100px]" mode="fixed" duration="100ms">
      <div class="w-full h-full bg-red-500"></div>
    </ef-timegroup>
  `;

  fixtureTest(
    "getRenderInfo works with simple HTML",
    { timeout: 15000 },
    async ({ electronRPC, testAgent }) => {
      const bundleInfo = await bundleTestTemplate(
        simpleHtml,
        import.meta.url,
        "get-render-info-test",
      );

      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      expect(renderInfo.width).toBe(100);
      expect(renderInfo.height).toBe(100);
      expect(renderInfo.durationMs).toBe(100);
      expect(renderInfo.fps).toBeGreaterThan(0);
    },
  );

  fixtureTest(
    "renderBrowserFullVideo handler responds",
    { timeout: 30000 },
    async ({ electronRPC, testAgent }) => {
      const bundleInfo = await bundleTestTemplate(
        simpleHtml,
        import.meta.url,
        "browser-full-video-handler-test",
      );

      // Get render info first
      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      // Call the browser full video render with minimal parameters
      const videoBuffer = await electronRPC.rpc.call("renderBrowserFullVideo", {
        width: renderInfo.width,
        height: renderInfo.height,
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        durationMs: renderInfo.durationMs,
        fps: 30,
        canvasMode: "foreignObject",
        assetsBundle: [],
      });

      // Verify we got a non-empty buffer back
      expect(videoBuffer).toBeDefined();
      expect(videoBuffer.length).toBeGreaterThan(0);
    },
  );

  fixtureTest(
    "renderBrowserFrameByFrame handler responds",
    { timeout: 30000 },
    async ({ electronRPC, testAgent }) => {
      const bundleInfo = await bundleTestTemplate(
        simpleHtml,
        import.meta.url,
        "browser-frame-by-frame-handler-test",
      );

      // Get render info first
      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      // Call the browser frame-by-frame render with minimal parameters
      const videoBuffer = await electronRPC.rpc.call(
        "renderBrowserFrameByFrame",
        {
          width: renderInfo.width,
          height: renderInfo.height,
          location: `file://${bundleInfo.indexPath}`,
          orgId: testAgent.org.id,
          renderId: `test-${bundleInfo.templateHash}`,
          segmentDurationMs: renderInfo.durationMs,
          segmentIndex: 0,
          durationMs: renderInfo.durationMs,
          fps: 30,
          fileType: "standalone",
          canvasMode: "foreignObject",
          assetsBundle: [],
        },
      );

      // Verify we got a non-empty buffer back
      expect(videoBuffer).toBeDefined();
      expect(videoBuffer.length).toBeGreaterThan(0);
    },
  );
});
