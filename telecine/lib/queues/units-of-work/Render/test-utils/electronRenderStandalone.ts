import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";

import {
  bundleTestTemplate,
  bundleTestTemplateWithScripts,
} from "./html-bundler";
import type { TestAgent } from "TEST/util/test";
import { z } from "zod";
import type { ElectronRPC } from "../ElectronRPCClient";
import { buildFragmentIds } from "../fragments/buildFragmentIds";
import { GetRenderInfoResult } from "../ElectronRPCServer";
import { createAssetsMetadataBundle } from "../shared/assetMetadata";
import { executeSpan } from "@/tracing";

const ElectronRenderOptions = z.object({
  timeout: z.number().default(60000),
  cleanup: z.boolean().default(true),
  renderSliceMs: z.number().default(2000),
});

export type ElectronRenderOptions = z.infer<typeof ElectronRenderOptions>;

export type ElectronRenderOptionsInput = z.input<typeof ElectronRenderOptions>;

export interface ElectronRenderOutput {
  finalVideoBuffer: Buffer;
  segmentBytes: Uint8Array[];
  videoPath: string;
  renderInfo: { width: number; height: number; durationMs: number };
  templateHash: string;
  testFilePath?: string;
  testTitle?: string;
}

export async function getRenderInfoWithElectronRPC({
  html,
  testAgent,
  electronRpc,
  testTitle,
}: {
  html: string;
  testAgent: TestAgent;
  electronRpc: ElectronRPC;
  testTitle?: string;
}): Promise<GetRenderInfoResult> {
  const bundleInfo = await bundleTestTemplate(html, testTitle);

  const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
    location: `file://${bundleInfo.indexPath}`,
    orgId: testAgent.org.id,
  });

  return renderInfo;
}

export interface StillRenderOutput {
  imageBuffer: Uint8Array;
  imagePath: string;
  renderInfo: GetRenderInfoResult;
  templateHash: string;
}

/**
 * Render HTML to still image using Electron RPC
 */
export async function renderStillWithElectronRPC({
  html,
  testAgent,
  electronRpc,
  outputFormat = "webp",
  testTitle,
}: {
  html: string;
  testAgent: TestAgent;
  electronRpc: ElectronRPC;
  outputFormat?: "webp" | "jpeg" | "png";
  testTitle?: string;
}): Promise<StillRenderOutput> {
  const bundleInfo = await bundleTestTemplate(html, testTitle);

  const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
    location: `file://${bundleInfo.indexPath}`,
    orgId: testAgent.org.id,
  });

  const assetsMetadata = await createAssetsMetadataBundle(
    renderInfo.assets,
    testAgent.org.id,
  );

  const renderId = `test-still-${Date.now()}`;

  const imageBuffer = await electronRpc.rpc.call("renderStill", {
    width: renderInfo.width,
    height: renderInfo.height,
    location: `file://${bundleInfo.indexPath}`,
    orgId: testAgent.org.id,
    renderId,
    durationMs: renderInfo.durationMs,
    fps: 30,
    outputConfig: { container: outputFormat },
    assetsBundle: assetsMetadata,
  });

  const testRenderDir = path.dirname(bundleInfo.bundleDir);
  const outputDir = path.join(testRenderDir, "artifacts");
  const imagePath = path.join(outputDir, `still.${outputFormat}`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(imagePath, imageBuffer);

  return {
    imageBuffer,
    imagePath,
    renderInfo,
    templateHash: bundleInfo.templateHash,
  };
}

/**
 * Standalone Electron render function using persistent ElectronRPC
 */
export async function renderWithElectronRPC({
  html,
  testAgent,
  electronRpc,
  renderOptions = {},
  testFilePath,
  testTitle,
}: {
  html: string;
  testAgent: TestAgent;
  electronRpc: ElectronRPC;
  renderOptions?: ElectronRenderOptionsInput;
  testFilePath?: string;
  testTitle?: string;
}): Promise<ElectronRenderOutput> {
  return executeSpan("renderWithElectronRPC", async (span) => {
    const totalStart = performance.now();
    span.setAttributes({
      html,
      testAgent: testAgent.org.id,
      testTitle,
    });
    span.setAttributes(renderOptions);

    const bundleStart = performance.now();
    const bundleInfo = await bundleTestTemplate(html, testFilePath, testTitle);
    const bundleTimeMs = performance.now() - bundleStart;

    const parsedOptions = ElectronRenderOptions.parse(renderOptions);

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

    const testRenderDir = path.dirname(bundleInfo.bundleDir);
    const outputDir = path.join(testRenderDir, "artifacts");
    await mkdir(outputDir, { recursive: true });

    const segmentBuffers: Uint8Array[] = [];
    const segmentPaths: string[] = [];
    const segmentTimings: { fragmentId: number | "init"; timeMs: number; sizeBytes: number }[] = [];

    const renderStart = performance.now();
    for (const fragmentId of fragmentIds) {
      const segmentStart = performance.now();
      const buffer = await electronRpc.rpc.call("renderFragment", {
        width: renderInfo.width,
        height: renderInfo.height,
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        renderId: `test-${bundleInfo.templateHash}`,
        segmentDurationMs: parsedOptions.renderSliceMs,
        segmentIndex: fragmentId,
        durationMs: renderInfo.durationMs,
        fps: 30,
        fileType: "fragment",
        assetsBundle,
      });
      const segmentTimeMs = performance.now() - segmentStart;

      segmentTimings.push({
        fragmentId,
        timeMs: Math.round(segmentTimeMs),
        sizeBytes: buffer.length,
      });

      console.log("🔧 [RENDERWITHELECTRONRPC] Rendered fragment", {
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
      renderMode: "server",
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

export async function renderWithElectronRPCAndScripts({
  html,
  scriptFiles,
  testAgent,
  electronRpc,
  renderOptions = {},
  testTitle,
}: {
  html: string;
  scriptFiles: Record<string, string>;
  testAgent: TestAgent;
  electronRpc: ElectronRPC;
  renderOptions?: ElectronRenderOptionsInput;
  testTitle?: string;
}): Promise<ElectronRenderOutput> {
  return executeSpan("renderWithElectronRPCAndScripts", async (span) => {
    const totalStart = performance.now();
    span.setAttributes({
      html,
      testAgent: testAgent.org.id,
      testTitle,
    });
    span.setAttributes(renderOptions);

    const bundleStart = performance.now();
    const bundleInfo = await bundleTestTemplateWithScripts(
      html,
      scriptFiles,
      testTitle,
    );
    const bundleTimeMs = performance.now() - bundleStart;

    const parsedOptions = ElectronRenderOptions.parse(renderOptions);

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

    const testRenderDir = path.dirname(bundleInfo.bundleDir);
    const outputDir = path.join(testRenderDir, "artifacts");
    await mkdir(outputDir, { recursive: true });

    const segmentBuffers: Uint8Array[] = [];
    const segmentPaths: string[] = [];
    const segmentTimings: { fragmentId: number | "init"; timeMs: number; sizeBytes: number }[] = [];

    const renderStart = performance.now();
    for (const fragmentId of fragmentIds) {
      const segmentStart = performance.now();
      const buffer = await electronRpc.rpc.call("renderFragment", {
        width: renderInfo.width,
        height: renderInfo.height,
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        renderId: `test-${bundleInfo.templateHash}`,
        segmentDurationMs: parsedOptions.renderSliceMs,
        segmentIndex: fragmentId,
        durationMs: renderInfo.durationMs,
        fps: 30,
        fileType: "fragment",
        assetsBundle,
      });
      const segmentTimeMs = performance.now() - segmentStart;

      segmentTimings.push({
        fragmentId,
        timeMs: Math.round(segmentTimeMs),
        sizeBytes: buffer.length,
      });

      console.log("🔧 [RENDERWITHELECTRONRPCANDSCRIPTS] Rendered fragment", {
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
      renderMode: "server",
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
      testTitle,
    };
  });
}
