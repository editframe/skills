/**
 * Browser-based rendering implementations for fidelity testing.
 *
 * This module provides two rendering modes that use the browser-side rendering
 * system from @editframe/elements to produce video output:
 *
 * 1. browser-full-video: Uses renderTimegroupToVideo() to create the entire MP4
 *    in the browser using mediabunny, then extracts the result.
 *
 * 2. browser-frame-by-frame: Uses captureTimegroupAtTime() to capture individual
 *    frames in the browser, passes them to the main process via IPC, and encodes
 *    them using the existing SegmentEncoder (FFmpeg pipeline).
 */

import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";

import { bundleTestTemplate, type TestBundleInfo, getTestRenderDir } from "./html-bundler";
import type { TestAgent } from "TEST/util/test";
import type { ElectronRPC } from "../ElectronRPCClient";
import type { ElectronRenderOptionsInput, RenderOutput } from "./index";

export type CanvasMode = "native" | "foreignObject";
import { createAssetsMetadataBundle } from "../shared/assetMetadata";
import { buildFragmentIds } from "../fragments/buildFragmentIds";
import { executeSpan } from "@/tracing";
import { z } from "zod";

const ElectronRenderOptions = z.object({
  timeout: z.number().default(60000),
  cleanup: z.boolean().default(true),
  renderSliceMs: z.number().default(2000),
});

interface BrowserRenderParams {
  html: string;
  testAgent: TestAgent;
  electronRpc: ElectronRPC;
  renderOptions?: ElectronRenderOptionsInput;
  canvasMode: CanvasMode;
  testFilePath: string;
  testTitle: string;
  bundleInfo?: TestBundleInfo;
}

/**
 * Render using browser's renderTimegroupToVideo function.
 * The entire MP4 is created in the browser using mediabunny encoder.
 */
export async function renderWithBrowserFullVideo({
  html,
  testAgent,
  electronRpc,
  renderOptions = {},
  canvasMode,
  testFilePath,
  testTitle,
  bundleInfo: existingBundleInfo,
}: BrowserRenderParams): Promise<RenderOutput> {
  return executeSpan("renderWithBrowserFullVideo", async (span) => {
    const totalStart = performance.now();
    span.setAttributes({
      html,
      testAgent: testAgent.org.id,
      testTitle,
      canvasMode,
    });

    const bundleStart = performance.now();
    const bundleInfo = existingBundleInfo ?? await bundleTestTemplate(html, testFilePath, testTitle);
    const bundleTimeMs = existingBundleInfo ? 0 : performance.now() - bundleStart;
    const parsedOptions = ElectronRenderOptions.parse(renderOptions);

    // Get render info first
    const renderInfoStart = performance.now();
    const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
      location: `file://${bundleInfo.indexPath}`,
      orgId: testAgent.org.id,
    });
    const renderInfoTimeMs = performance.now() - renderInfoStart;

    const assetsBundle = await createAssetsMetadataBundle(
      renderInfo.assets,
      testAgent.org.id,
    );

    // Call the browser-based full video render
    const renderStart = performance.now();
    const videoBuffer = await electronRpc.rpc.call("renderBrowserFullVideo", {
      width: renderInfo.width,
      height: renderInfo.height,
      location: `file://${bundleInfo.indexPath}`,
      orgId: testAgent.org.id,
      durationMs: renderInfo.durationMs,
      fps: renderInfo.fps,
      canvasMode,
      assetsBundle,
    });
    const renderTimeMs = performance.now() - renderStart;

    // Write output - use testTitle-specific directory when bundle is shared
    const testRenderDir = existingBundleInfo
      ? getTestRenderDir(testFilePath, testTitle, bundleInfo.templateHash)
      : path.dirname(bundleInfo.bundleDir);
    const outputDir = path.join(testRenderDir, "artifacts");
    await mkdir(outputDir, { recursive: true });

    const finalVideoPath = path.join(outputDir, "output.mp4");
    await writeFile(finalVideoPath, videoBuffer);

    const totalTimeMs = performance.now() - totalStart;

    const metadata = {
      renderInfo: {
        width: renderInfo.width,
        height: renderInfo.height,
        durationMs: renderInfo.durationMs,
      },
      renderMode: "browser-full-video",
      canvasMode,
      timing: {
        totalMs: Math.round(totalTimeMs),
        bundleMs: Math.round(bundleTimeMs),
        renderInfoMs: Math.round(renderInfoTimeMs),
        renderMs: Math.round(renderTimeMs),
      },
      outputSizeBytes: videoBuffer.length,
      timestamp: new Date().toISOString(),
    };
    await writeFile(
      path.join(outputDir, "metadata.json"),
      JSON.stringify(metadata, null, 2),
    );

    return {
      finalVideoBuffer: Buffer.from(videoBuffer),
      segmentBytes: [videoBuffer],
      videoPath: finalVideoPath,
      renderInfo: {
        width: renderInfo.width,
        height: renderInfo.height,
        durationMs: renderInfo.durationMs,
      },
      templateHash: bundleInfo.templateHash,
      testFilePath,
      testTitle,
    };
  });
}

/**
 * Render using browser's captureTimegroupAtTime for each frame,
 * then encode with existing SegmentEncoder (FFmpeg pipeline).
 */
export async function renderWithBrowserFrameByFrame({
  html,
  testAgent,
  electronRpc,
  renderOptions = {},
  canvasMode,
  testFilePath,
  testTitle,
  bundleInfo: existingBundleInfo,
}: BrowserRenderParams): Promise<RenderOutput> {
  return executeSpan("renderWithBrowserFrameByFrame", async (span) => {
    const totalStart = performance.now();
    span.setAttributes({
      html,
      testAgent: testAgent.org.id,
      testTitle,
      canvasMode,
    });

    const bundleStart = performance.now();
    const bundleInfo = existingBundleInfo ?? await bundleTestTemplate(html, testFilePath, testTitle);
    const bundleTimeMs = existingBundleInfo ? 0 : performance.now() - bundleStart;
    const parsedOptions = ElectronRenderOptions.parse(renderOptions);

    // Get render info first
    const renderInfoStart = performance.now();
    const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
      location: `file://${bundleInfo.indexPath}`,
      orgId: testAgent.org.id,
    });
    const renderInfoTimeMs = performance.now() - renderInfoStart;

    const assetsBundle = await createAssetsMetadataBundle(
      renderInfo.assets,
      testAgent.org.id,
    );

    const fragmentIds = buildFragmentIds({
      duration_ms: renderInfo.durationMs,
      work_slice_ms: parsedOptions.renderSliceMs,
    });

    // Use testTitle-specific directory when bundle is shared
    const testRenderDir = existingBundleInfo
      ? getTestRenderDir(testFilePath, testTitle, bundleInfo.templateHash)
      : path.dirname(bundleInfo.bundleDir);
    const outputDir = path.join(testRenderDir, "artifacts");
    await mkdir(outputDir, { recursive: true });

    const segmentBuffers: Uint8Array[] = [];
    const segmentPaths: string[] = [];
    const segmentTimings: { fragmentId: number | "init"; timeMs: number; sizeBytes: number }[] = [];

    const renderStart = performance.now();
    for (const fragmentId of fragmentIds) {
      // Call the browser-based frame-by-frame render for this segment
      const segmentStart = performance.now();
      const buffer = await electronRpc.rpc.call("renderBrowserFrameByFrame", {
        width: renderInfo.width,
        height: renderInfo.height,
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        renderId: `test-${bundleInfo.templateHash}-${canvasMode}`,
        segmentDurationMs: parsedOptions.renderSliceMs,
        segmentIndex: fragmentId,
        durationMs: renderInfo.durationMs,
        fps: renderInfo.fps,
        fileType: "fragment",
        canvasMode,
        assetsBundle,
      });
      const segmentTimeMs = performance.now() - segmentStart;

      segmentTimings.push({
        fragmentId,
        timeMs: Math.round(segmentTimeMs),
        sizeBytes: buffer.length,
      });

      console.log("🔧 [RENDER_BROWSER_FRAME_BY_FRAME] Rendered fragment", {
        fragmentId,
        bufferLength: buffer.length,
      });

      segmentBuffers.push(buffer);

      // Write segment to disk
      const segmentPath = path.join(outputDir, `segment_${fragmentId}.mp4`);
      await writeFile(segmentPath, buffer);
      segmentPaths.push(segmentPath);
    }
    const renderTimeMs = performance.now() - renderStart;

    const finalVideoPath = path.join(outputDir, "output.mp4");
    if (segmentBuffers.length === 0) {
      throw new Error("No segments rendered");
    }

    // Concatenate all segments into final video buffer
    const finalVideoBuffer = Buffer.concat(segmentBuffers);
    await writeFile(finalVideoPath, finalVideoBuffer);

    const totalTimeMs = performance.now() - totalStart;

    const metadata = {
      renderInfo: {
        width: renderInfo.width,
        height: renderInfo.height,
        durationMs: renderInfo.durationMs,
      },
      segmentPaths,
      fragmentCount: fragmentIds.length,
      renderMode: "browser-frame-by-frame",
      canvasMode,
      timing: {
        totalMs: Math.round(totalTimeMs),
        bundleMs: Math.round(bundleTimeMs),
        renderInfoMs: Math.round(renderInfoTimeMs),
        renderMs: Math.round(renderTimeMs),
        segments: segmentTimings,
        avgSegmentMs: Math.round(renderTimeMs / fragmentIds.length),
      },
      outputSizeBytes: finalVideoBuffer.length,
      timestamp: new Date().toISOString(),
    };
    await writeFile(
      path.join(outputDir, "metadata.json"),
      JSON.stringify(metadata, null, 2),
    );

    return {
      finalVideoBuffer,
      segmentBytes: segmentBuffers,
      videoPath: finalVideoPath,
      renderInfo: {
        width: renderInfo.width,
        height: renderInfo.height,
        durationMs: renderInfo.durationMs,
      },
      templateHash: bundleInfo.templateHash,
      testFilePath,
      testTitle,
    };
  });
}

