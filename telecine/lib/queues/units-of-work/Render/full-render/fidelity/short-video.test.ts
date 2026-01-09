/**
 * Fast test: Short Video Render
 *
 * Renders a 0.5s video (15 frames at 30fps) with both browser render modes
 * and both canvas modes. Verifies output is valid MP4.
 *
 * Expected time: ~15-30s
 */

import { describe, expect } from "vitest";
import { test as fixtureTest } from "../fixtures";
import { bundleTestTemplate, getTestRenderDir } from "../../test-utils/html-bundler";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

describe("Short Video Render", () => {
  // Simple animated HTML - gradient that changes
  const animatedHtml = /* HTML */ `
    <ef-timegroup class="w-[200px] h-[200px]" mode="fixed" duration="500ms">
      <div class="w-full h-full bg-gradient-to-r from-red-500 to-blue-500"></div>
    </ef-timegroup>
  `;

  const verifyMp4 = (
    buffer: Uint8Array,
    testName: string,
    templateHash: string,
    testTitle: string,
  ) => {
    if (buffer.length === 0) {
      throw new Error(`${testName}: Buffer is empty!`);
    }

    // Write to test renders artifacts directory
    const testRenderDir = getTestRenderDir(import.meta.url, testTitle, templateHash);
    const artifactsDir = path.join(testRenderDir, "artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    const outputFile = path.join(artifactsDir, `${testName}.mp4`);
    writeFileSync(outputFile, buffer);

    try {
      // Use ffprobe to verify it's a valid MP4
      const probeOutput = execSync(
        `ffprobe -v error -show_format -show_streams -print_format json "${outputFile}"`,
        { encoding: "utf8" },
      );
      const probe = JSON.parse(probeOutput);

      expect(probe.format.format_name).toContain("mp4");
      expect(probe.streams.length).toBeGreaterThan(0);

      const videoStream = probe.streams.find(
        (s: { codec_type: string }) => s.codec_type === "video",
      );
      expect(videoStream).toBeDefined();
      expect(videoStream.width).toBe(200);
      expect(videoStream.height).toBe(200);

      return probe;
    } catch (error) {
      console.error(`ffprobe failed for ${testName}:`, error);
      throw error;
    }
  };

  fixtureTest(
    "browser-full-video + foreignObject produces valid MP4",
    { timeout: 30000 },
    async ({ electronRPC, testAgent }) => {
      const testTitle = "browser-full-video + foreignObject produces valid MP4";
      const bundleInfo = await bundleTestTemplate(
        animatedHtml,
        import.meta.url,
        "short-full-video-fo",
      );

      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      expect(renderInfo.durationMs).toBe(500);

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

      expect(videoBuffer.length).toBeGreaterThan(1000); // Should be at least 1KB
      verifyMp4(videoBuffer, "full-video-foreignObject", bundleInfo.templateHash, testTitle);
    },
  );

  fixtureTest(
    "browser-full-video + native produces valid MP4",
    { timeout: 30000 },
    async ({ electronRPC, testAgent }) => {
      const testTitle = "browser-full-video + native produces valid MP4";
      const bundleInfo = await bundleTestTemplate(
        animatedHtml,
        import.meta.url,
        "short-full-video-native",
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

      expect(videoBuffer.length).toBeGreaterThan(1000);
      verifyMp4(videoBuffer, "full-video-native", bundleInfo.templateHash, testTitle);
    },
  );

  fixtureTest(
    "browser-frame-by-frame + foreignObject produces valid MP4",
    { timeout: 30000 },
    async ({ electronRPC, testAgent }) => {
      const testTitle = "browser-frame-by-frame + foreignObject produces valid MP4";
      const bundleInfo = await bundleTestTemplate(
        animatedHtml,
        import.meta.url,
        "short-fbf-fo",
      );

      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

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

      expect(videoBuffer.length).toBeGreaterThan(1000);
      verifyMp4(videoBuffer, "fbf-foreignObject", bundleInfo.templateHash, testTitle);
    },
  );

  fixtureTest(
    "browser-frame-by-frame + native produces valid MP4",
    { timeout: 30000 },
    async ({ electronRPC, testAgent }) => {
      const testTitle = "browser-frame-by-frame + native produces valid MP4";
      const bundleInfo = await bundleTestTemplate(
        animatedHtml,
        import.meta.url,
        "short-fbf-native",
      );

      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

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

      expect(videoBuffer.length).toBeGreaterThan(1000);
      verifyMp4(videoBuffer, "fbf-native", bundleInfo.templateHash, testTitle);
    },
  );

  fixtureTest(
    "all four modes produce similar-sized outputs",
    { timeout: 60000 },
    async ({ electronRPC, testAgent }) => {
      const testTitle = "all four modes produce similar-sized outputs";
      const bundleInfo = await bundleTestTemplate(
        animatedHtml,
        import.meta.url,
        "short-size-comparison",
      );

      const renderInfo = await electronRPC.rpc.call("getRenderInfo", {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      const modes = [
        {
          name: "full-video-foreignObject",
          rpc: "renderBrowserFullVideo",
          canvasMode: "foreignObject",
        },
        {
          name: "full-video-native",
          rpc: "renderBrowserFullVideo",
          canvasMode: "native",
        },
        {
          name: "fbf-foreignObject",
          rpc: "renderBrowserFrameByFrame",
          canvasMode: "foreignObject",
        },
        {
          name: "fbf-native",
          rpc: "renderBrowserFrameByFrame",
          canvasMode: "native",
        },
      ] as const;

      const sizes: Record<string, number> = {};

      for (const mode of modes) {
        let videoBuffer: Uint8Array;

        if (mode.rpc === "renderBrowserFullVideo") {
          videoBuffer = await electronRPC.rpc.call("renderBrowserFullVideo", {
            width: renderInfo.width,
            height: renderInfo.height,
            location: `file://${bundleInfo.indexPath}`,
            orgId: testAgent.org.id,
            durationMs: renderInfo.durationMs,
            fps: 30,
            canvasMode: mode.canvasMode,
            assetsBundle: [],
          });
        } else {
          videoBuffer = await electronRPC.rpc.call(
            "renderBrowserFrameByFrame",
            {
              width: renderInfo.width,
              height: renderInfo.height,
              location: `file://${bundleInfo.indexPath}`,
              orgId: testAgent.org.id,
              renderId: `test-${bundleInfo.templateHash}-${mode.name}`,
              segmentDurationMs: renderInfo.durationMs,
              segmentIndex: 0,
              durationMs: renderInfo.durationMs,
              fps: 30,
              fileType: "standalone",
              canvasMode: mode.canvasMode,
              assetsBundle: [],
            },
          );
        }

        sizes[mode.name] = videoBuffer.length;
        
        // Write each mode's output to artifacts
        verifyMp4(videoBuffer, mode.name, bundleInfo.templateHash, testTitle);
      }

      console.log("Video sizes:", sizes);

      // All modes should produce output within reasonable range of each other
      const sizeValues = Object.values(sizes);
      const minSize = Math.min(...sizeValues);
      const maxSize = Math.max(...sizeValues);

      // Max should not be more than 10x min (allows for different encoders)
      expect(maxSize / minSize).toBeLessThan(10);
    },
  );
});

