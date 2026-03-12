import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { render } from "../utils/render";
import {
  processTestVideoAsset,
  processTestImageAsset,
} from "../../test-utils/processTestAssets";
import { createElectronRPC, type ElectronRPC } from "../../ElectronRPCClient";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type {
  Video2IsobmffFiles,
  Video2ImageFiles,
} from "@/sql-client.server/kysely-codegen";

describe("Timing Analysis", { timeout: 120000 }, () => {
  let testAgent: Selectable<TestAgent>;
  let barsNTone: Selectable<Video2IsobmffFiles>;
  let testImage: Selectable<Video2ImageFiles>;
  let electronRpc: ElectronRPC;

  beforeAll(async () => {
    testAgent = await makeTestAgent("timing-analysis@example.org");
    barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
    testImage = await processTestImageAsset("test.jpg", testAgent);
    electronRpc = await createElectronRPC();
  });

  afterAll(async () => {
    if (electronRpc) {
      await electronRpc.rpc.call("terminate");
    }
  });

  test("ef-timegroup - simple render", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-blue-500"></div>
      </ef-timegroup>
    `,
      { testAgent, electronRpc, testName: "timing-simple-timegroup" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
  });

  test("ef-video - with asset", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[480px] h-[270px]" mode="fixed" duration="200ms">
        <ef-video asset-id="${barsNTone.id}" class="w-full" source-out="200ms"></ef-video>
      </ef-timegroup>
    `,
      { testAgent, electronRpc, testName: "timing-video-asset" },
    );

    expect(result.durationMs).toBeCloseTo(200, 20);
  });

  test("ef-image - with asset", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <ef-image asset-id="${testImage.id}" class="w-full h-full object-cover" />
      </ef-timegroup>
    `,
      { testAgent, electronRpc, testName: "timing-image-asset" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
  });

  test("multiple elements - complex composition", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-gray-900 flex items-center justify-center gap-4">
          <ef-image asset-id="${testImage.id}" class="w-24 h-24 object-cover" />
          <ef-text class="text-white text-4xl">Hello</ef-text>
        </div>
      </ef-timegroup>
    `,
      { testAgent, electronRpc, testName: "timing-complex" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
  });

  test("cache hit - simple render (duplicate)", async () => {
    // This test uses the exact same HTML as the first test
    // Should hit the bundle cache and be much faster
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-blue-500"></div>
      </ef-timegroup>
    `,
      { testAgent, electronRpc, testName: "timing-simple-timegroup-cached" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.timing.bundleHtml).toBeLessThan(10);
  });
});
