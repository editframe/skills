import path from "node:path";
import { mkdir } from "node:fs/promises";
import { mkdirSync, writeFileSync } from "node:fs";
import { v4 } from "uuid";

import type { TestAgent } from "TEST/util/test";
import { SegmentEncoder } from "@/render/SegmentEncoder.server";
import { createVideoRenderOptionsForSegment } from "@/render/createRenderOptionsForSegment";
import { buildFragmentIds } from "../fragments/buildFragmentIds";
import { ElectronEngineManager } from "../shared/ElectronEngineManager";
import { StillEncoder } from "@/render/StillEncoder";
import { OutputConfiguration } from "@editframe/api";
import { bundleTestTemplate } from "./html-bundler";

export interface RenderOutput {
  finalVideoBuffer: Buffer;
  segmentBytes: Uint8Array[];
  videoPath: string;
  renderInfo: { width: number; height: number; durationMs: number };
  templateHash: string;
}

export interface TestBundleInfo {
  bundleDir: string;
  indexPath: string;
  templateHash: string;
}

export const renderToStillToBuffer = async (indexPath: string, testAgent: TestAgent): Promise<{ buffers: Buffer[], renderInfo: any }> => {
  return PlaywrightEngineManager.withEngine(async (playwrightEngine) => {
    await using infoContext = await playwrightEngine.createContext({
      width: 200, // this width/height is arbitrary, we use it to extract the real width/height of the video
      height: 200,
      location: `file://${indexPath}`,
      orgId: testAgent.org.id,
    });

    const renderInfo = await infoContext.getRenderInfo();

    await using context = await playwrightEngine.createContext({
      width: renderInfo.width,
      height: renderInfo.height,
      location: `file://${indexPath}`,
      orgId: testAgent.org.id,
    });

    const renderOptions = createVideoRenderOptionsForSegment({
      segmentDurationMs: 1000,
      segmentIndex: 0,
      width: renderInfo.width,
      height: renderInfo.height,
      durationMs: 1000,
      fps: 30,
      strategy: "v1",
    });

    const stillEncoder = new StillEncoder({
      renderId: v4(),
      outputConfig: OutputConfiguration.parse({
        container: "jpeg",
      }),
      engine: context,
      renderOptions,
      abortSignal: new AbortController().signal,
    });

    const image = await stillEncoder.encode();
    return { buffers: [image], renderInfo };
  });
};

export const renderToStill = async (html: string, testAgent: TestAgent, testTitle?: string) => {
  const { indexPath, bundleDir, templateHash } = await bundleTestTemplate(html, testTitle);
  const { buffers } = await renderToStillToBuffer(indexPath, testAgent);

  const testRenderDir = path.dirname(bundleDir);
  const outputDir = path.join(testRenderDir, "artifacts");
  await mkdir(outputDir, { recursive: true });
  await writeBuffersToFile(buffers, outputDir, "still.jpeg");
}

/**
 * Render HTML to video segment buffers
 */
export const renderToBuffers = async (indexPath: string, testAgent: TestAgent): Promise<{ buffers: Buffer[], renderInfo: any }> => {
  return ElectronEngineManager.withEngine(async (playwrightEngine) => {
    await using infoContext = await playwrightEngine.createContext({
      width: 200, // this width/height is arbitrary, we use it to extract the real width/height of the video
      height: 200,
      location: `file://${indexPath}`,
      orgId: testAgent.org.id,
    });
    const renderInfo = await infoContext.getRenderInfo();


    const SEGMENT_COUNT = 3;

    const fragmentIds = buildFragmentIds({
      duration_ms: renderInfo.durationMs,
      work_slice_ms: renderInfo.durationMs / SEGMENT_COUNT,
    });

    const renderId = v4();
    const buffers: Buffer[] = [];
    for (const fragmentId of fragmentIds) {
      await using context = await playwrightEngine.createContext({
        width: renderInfo.width,
        height: renderInfo.height,
        location: `file://${indexPath}`,
        orgId: testAgent.org.id,
      });
      const renderOptions = createVideoRenderOptionsForSegment({
        segmentIndex: fragmentId,
        width: renderInfo.width,
        height: renderInfo.height,
        durationMs: renderInfo.durationMs,
        segmentDurationMs: renderInfo.durationMs / SEGMENT_COUNT,
        fps: renderInfo.fps,
        strategy: "v1",
      });

      const segmentEncoder = new SegmentEncoder({
        renderId,
        renderOptions,
        engine: context,
        abortSignal: new AbortController().signal,
      });

      const buffer = await segmentEncoder.generateFragmentBuffer();
      buffers.push(buffer);
    }

    return { buffers, renderInfo };
  });
};

/**
 * Complete render process from HTML to output files
 */
export const renderToBuffersWithMetadata = async (html: string, testAgent: TestAgent, testTitle?: string): Promise<RenderOutput> => {
  const { indexPath, bundleDir, templateHash } = await bundleTestTemplate(html, testTitle);
  const { buffers, renderInfo } = await renderToBuffers(indexPath, testAgent);

  // Assemble final video buffer
  const finalVideoBuffer = Buffer.concat(buffers);

  const testRenderDir = path.dirname(bundleDir);
  const outputDir = path.join(testRenderDir, "artifacts");
  const videoPath = path.join(outputDir, "regression-test-output.mp4");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(videoPath, finalVideoBuffer);

  return {
    segmentBytes: buffers,
    finalVideoBuffer,
    videoPath,
    renderInfo,
    templateHash,
  };
};
