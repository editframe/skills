/**
 * Fast test: Single Frame Capture
 *
 * Minimal test that captures ONE frame from a simple HTML element
 * using both native and foreignObject canvas modes.
 *
 * Expected time: ~5-10s
 */

import { describe, expect } from "vitest";
import { test as fixtureTest } from "../fixtures";
import { bundleTestTemplate, getTestRenderDir } from "../../test-utils/html-bundler";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

describe("Single Frame Capture", () => {
  // Simple HTML with just a colored div - no external assets
  const coloredDivHtml = /* HTML */ `
    <ef-timegroup class="w-[100px] h-[100px]" mode="fixed" duration="100ms">
      <div class="w-full h-full bg-blue-500"></div>
    </ef-timegroup>
  `;

  const writeArtifact = (
    buffer: Uint8Array,
    filename: string,
    templateHash: string,
    testTitle: string,
  ) => {
    const testRenderDir = getTestRenderDir(import.meta.url, testTitle, templateHash);
    const artifactsDir = path.join(testRenderDir, "artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    const outputFile = path.join(artifactsDir, filename);
    writeFileSync(outputFile, buffer);
    return outputFile;
  };

  fixtureTest(
    "captures single frame with foreignObject mode",
    { timeout: 20000 },
    async ({ electronRPC, testAgent }) => {
      const testTitle = "captures single frame with foreignObject mode";
      const bundleInfo = await bundleTestTemplate(
        coloredDivHtml,
        import.meta.url,
        "single-frame-foreignobject",
      );

      // Get render info first
      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      expect(renderInfo.width).toBe(100);
      expect(renderInfo.height).toBe(100);

      // Render a single frame using browser-frame-by-frame (which uses captureTimegroupAtTime)
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

      expect(videoBuffer).toBeDefined();
      expect(videoBuffer.length).toBeGreaterThan(0);
      writeArtifact(videoBuffer, "fbf-foreignObject.mp4", bundleInfo.templateHash, testTitle);
    },
  );

  fixtureTest(
    "captures single frame with native mode",
    { timeout: 20000 },
    async ({ electronRPC, testAgent }) => {
      const testTitle = "captures single frame with native mode";
      const bundleInfo = await bundleTestTemplate(
        coloredDivHtml,
        import.meta.url,
        "single-frame-native",
      );

      // Get render info first
      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      // Render a single frame using native canvas mode
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
          canvasMode: "native",
          assetsBundle: [],
        },
      );

      expect(videoBuffer).toBeDefined();
      expect(videoBuffer.length).toBeGreaterThan(0);
      writeArtifact(videoBuffer, "fbf-native.mp4", bundleInfo.templateHash, testTitle);
    },
  );

  fixtureTest(
    "full video mode produces output with foreignObject",
    { timeout: 20000 },
    async ({ electronRPC, testAgent }) => {
      const testTitle = "full video mode produces output with foreignObject";
      const bundleInfo = await bundleTestTemplate(
        coloredDivHtml,
        import.meta.url,
        "full-video-foreignobject",
      );

      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

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

      expect(videoBuffer).toBeDefined();
      expect(videoBuffer.length).toBeGreaterThan(0);
      writeArtifact(videoBuffer, "full-video-foreignObject.mp4", bundleInfo.templateHash, testTitle);
    },
  );

  fixtureTest(
    "full video mode produces output with native",
    { timeout: 20000 },
    async ({ electronRPC, testAgent }) => {
      const testTitle = "full video mode produces output with native";
      const bundleInfo = await bundleTestTemplate(
        coloredDivHtml,
        import.meta.url,
        "full-video-native",
      );

      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      const videoBuffer = await electronRPC.rpc.call("renderBrowserFullVideo", {
        width: renderInfo.width,
        height: renderInfo.height,
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        durationMs: renderInfo.durationMs,
        fps: 30,
        canvasMode: "native",
        assetsBundle: [],
      });

      expect(videoBuffer).toBeDefined();
      expect(videoBuffer.length).toBeGreaterThan(0);
      writeArtifact(videoBuffer, "full-video-native.mp4", bundleInfo.templateHash, testTitle);
    },
  );
});

