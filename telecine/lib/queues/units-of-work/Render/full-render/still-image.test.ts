import { describe } from "vitest";

import {
  performStillImageRegressionTest,
  renderStillWithElectronRPC,
} from "../test-utils";
import { test } from "./fixtures";

describe("Still Image Rendering", () => {
  test("renders simple HTML to webp still", async ({
    testAgent,
    electronRPC,
    expect,
  }) => {
    const html = /* HTML */ `
      <ef-timegroup mode="fixed" duration="5s" class="aspect-[1/1] w-[500px] h-[500px] text-pink-400 bg-black flex items-center justify-center">
        <h1 class="text-5xl">Hello World</h1>
      </ef-timegroup>
    `;

    const { imageBuffer, imagePath, renderInfo, templateHash } =
      await renderStillWithElectronRPC({
        html,
        testAgent,
        electronRpc: electronRPC,
        outputFormat: "webp",
        testTitle: "still-simple-html",
      });

    expect(imageBuffer).toBeDefined();
    expect(imageBuffer.byteLength).toBeGreaterThan(0);
    expect(renderInfo.width).toBe(500);
    expect(renderInfo.height).toBe(500);
    expect(renderInfo.durationMs).toBe(5000);

    await performStillImageRegressionTest(imagePath, templateHash);
  }, 30000);

  test("renders video-only asset to webp still", async ({
    videoOnlyStillOutput,
    expect,
  }) => {
    const { imageBuffer, imagePath, renderInfo, templateHash } =
      videoOnlyStillOutput;

    expect(imageBuffer).toBeDefined();
    expect(imageBuffer.byteLength).toBeGreaterThan(0);
    expect(renderInfo.width).toBe(480);
    expect(renderInfo.height).toBe(270);

    await performStillImageRegressionTest(imagePath, templateHash);
  });

  test("renders video with audio tracks to webp still", async ({
    barsNTone,
    testAgent,
    electronRPC,
    expect,
  }) => {
    const html = /* HTML */ `
      <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
        <ef-video asset-id="${barsNTone.id}" class="w-full" sourceOut="1s"></ef-video>
      </ef-timegroup>
    `;

    const { imageBuffer, imagePath, renderInfo, templateHash } =
      await renderStillWithElectronRPC({
        html,
        testAgent,
        electronRpc: electronRPC,
        outputFormat: "webp",
        testTitle: "still-video-with-audio-tracks",
      });

    expect(imageBuffer).toBeDefined();
    expect(imageBuffer.byteLength).toBeGreaterThan(0);
    expect(renderInfo.width).toBe(480);
    expect(renderInfo.height).toBe(270);

    await performStillImageRegressionTest(imagePath, templateHash);
  });
});
