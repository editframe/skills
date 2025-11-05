import { makeTestAgent } from "TEST/util/test";
import { describe, test } from "vitest";
import { createElectronRPC } from "./ElectronRPCClient";
import { bundleTestTemplate } from "./test-utils/html-bundler";
import { createAssetsMetadataBundle } from "./shared/assetMetadata";
import { testSpan } from "TEST/util/testSpan";
import { processTestVideoAsset } from "./test-utils";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

describe("Render", () => {
  test("renders a simple video with fragments", testSpan(async ({ expect }) => {
    const testAgent = await makeTestAgent("render-test@example.org");
    const barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
    const template = /* HTML */`
      <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="4s">
        <ef-video asset-id="${barsNTone.id}" class="w-full"></ef-video>
      </ef-timegroup>
    `;
    const [electronRPC, bundleInfo] = await Promise.all([
      createElectronRPC(),
      bundleTestTemplate(template, 'video-bars-n-tone'),
    ]);


    try {
      const ctx = await electronRPC.rpc.call('createContext', {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      const renderInfo = await electronRPC.rpc.call('getRenderInfo', {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        contextId: ctx.contextId,
      });

      const assetsBundle = await createAssetsMetadataBundle(
        renderInfo.assets,
        testAgent.org.id
      );

      const segmentDurationMs = 4000;
      const numSegments = Math.ceil(renderInfo.durationMs / segmentDurationMs);

      const initFragment = await electronRPC.rpc.call('renderFragment', {
        width: renderInfo.width,
        height: renderInfo.height,
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        renderId: `test-${bundleInfo.templateHash}`,
        segmentDurationMs,
        segmentIndex: "init",
        durationMs: renderInfo.durationMs,
        fps: 30,
        fileType: "fragment",
        assetsBundle,
        contextId: ctx.contextId,
      });

      expect(initFragment.byteLength).toBeGreaterThan(0);

      const dataFragments: Uint8Array[] = [];
      for (let i = 0; i < numSegments; i++) {
        const fragment = await electronRPC.rpc.call('renderFragment', {
          width: renderInfo.width,
          height: renderInfo.height,
          location: `file://${bundleInfo.indexPath}`,
          orgId: testAgent.org.id,
          renderId: `test-${bundleInfo.templateHash}`,
          segmentDurationMs,
          segmentIndex: i,
          durationMs: renderInfo.durationMs,
          fps: 30,
          fileType: "fragment",
          assetsBundle,
          contextId: ctx.contextId,
        });

        expect(fragment.byteLength).toBeGreaterThan(0);
        dataFragments.push(fragment);
      }

      const finalVideoBuffer = Buffer.concat([initFragment, ...dataFragments].map(f => Buffer.from(f)));
      expect(finalVideoBuffer.length).toBeGreaterThan(0);

      const testRenderDir = path.dirname(bundleInfo.bundleDir);
      const outputDir = path.join(testRenderDir, "artifacts");
      await mkdir(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, 'render-output.mp4');
      await writeFile(outputPath, finalVideoBuffer);

      await electronRPC.rpc.call('disposeContext', ctx.contextId);
    } finally {
      await electronRPC.rpc.call('terminate');
    }
  }), 20000);

  test("renders a simple still", testSpan(async ({ expect }) => {
    const [electronRPC, testAgent] = await Promise.all([
      createElectronRPC(),
      makeTestAgent("render-test@example.org"),
    ]);

    const barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);

    const template = /* HTML */`
      <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
        <ef-video asset-id="${barsNTone.id}" class="w-full" sourceOut="1s"></ef-video>
      </ef-timegroup>
    `;

    const bundleInfo = await bundleTestTemplate(template, 'still-bars-n-tone');

    try {
      // Create a single context for both operations
      const ctx = await electronRPC.rpc.call('createContext', {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
      });

      const renderInfo = await electronRPC.rpc.call('getRenderInfo', {
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        contextId: ctx.contextId,
      });

      const assetsMetadata = await createAssetsMetadataBundle(
        renderInfo.assets,
        testAgent.org.id
      );

      const renderId = `test-still-${Date.now()}`;

      const imageBuffer = await electronRPC.rpc.call('renderStill', {
        width: renderInfo.width,
        height: renderInfo.height,
        location: `file://${bundleInfo.indexPath}`,
        orgId: testAgent.org.id,
        renderId,
        durationMs: renderInfo.durationMs,
        fps: 30,
        outputConfig: { container: 'webp' },
        assetsBundle: assetsMetadata,
        contextId: ctx.contextId,
      });

      // Clean up context
      await electronRPC.rpc.call('disposeContext', ctx.contextId);

      const testRenderDir = path.dirname(bundleInfo.bundleDir);
      const outputDir = path.join(testRenderDir, "artifacts");
      const imagePath = path.join(outputDir, `still.webp`);
      await mkdir(outputDir, { recursive: true });
      await writeFile(imagePath, imageBuffer);

      expect(imageBuffer).toBeDefined();
      expect(imagePath).toBeDefined();
      expect(renderInfo).toBeDefined();
      expect(bundleInfo.templateHash).toBeDefined();
    } finally {
      await electronRPC.rpc.call('terminate');
    }
  }), 10000);
});