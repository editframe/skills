import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { render, getBundleCacheStats } from "../utils/render";
import { processTestVideoAsset, processTestImageAsset } from "../../test-utils/processTestAssets";
import { createElectronRPC, type ElectronRPC } from "../../ElectronRPCClient";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles, Video2ImageFiles } from "@/sql-client.server/kysely-codegen";
import type { RenderResult } from "../utils/render";

describe("Timing Analysis", { timeout: 120000 }, () => {
  let testAgent: Selectable<TestAgent>;
  let barsNTone: Selectable<Video2IsobmffFiles>;
  let testImage: Selectable<Video2ImageFiles>;
  let electronRpc: ElectronRPC;
  const timingResults: RenderResult[] = [];

  beforeAll(async () => {
    const setupStart = performance.now();
    
    testAgent = await makeTestAgent("timing-analysis@example.org");
    console.log(`\n[TIMING] testAgent creation: ${(performance.now() - setupStart).toFixed(2)}ms`);
    
    const assetStart = performance.now();
    barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
    testImage = await processTestImageAsset("test.jpg", testAgent);
    console.log(`[TIMING] Asset processing: ${(performance.now() - assetStart).toFixed(2)}ms`);
    
    const rpcStart = performance.now();
    electronRpc = await createElectronRPC();
    console.log(`[TIMING] ElectronRPC creation: ${(performance.now() - rpcStart).toFixed(2)}ms`);
    console.log(`[TIMING] Total beforeAll: ${(performance.now() - setupStart).toFixed(2)}ms\n`);
  });

  afterAll(async () => {
    if (electronRpc) {
      await electronRpc.rpc.call("terminate");
    }
    
    // Print bundle cache statistics
    const cacheStats = getBundleCacheStats();
    console.log("\n" + "=".repeat(80));
    console.log("BUNDLE CACHE STATISTICS");
    console.log("=".repeat(80));
    console.log(`  Cache Hits: ${cacheStats.hits}`);
    console.log(`  Cache Misses: ${cacheStats.misses}`);
    console.log(`  Hit Rate: ${cacheStats.hitRate}`);
    console.log(`  Cache Size: ${cacheStats.cacheSize} entries`);
    
    // Print detailed timing report
    console.log("\n" + "=".repeat(80));
    console.log("TIMING ANALYSIS REPORT");
    console.log("=".repeat(80));
    
    for (const result of timingResults) {
      console.log(`\nTest: ${result.renderMode}`);
      console.log(`  Template Hash: ${result.templateHash}`);
      console.log(`  Video Duration: ${result.durationMs}ms`);
      console.log(`  FPS: ${result.fps}`);
      console.log(`  Frame Count: ${Math.ceil((result.durationMs / 1000) * result.fps)}`);
      console.log(`  Total Time: ${result.renderTimeMs.toFixed(2)}ms`);
      
      if (result.timing.electronRpcCreate) {
        console.log(`  └─ Electron RPC Create: ${result.timing.electronRpcCreate.toFixed(2)}ms`);
      }
      if (result.timing.bundleHtml) {
        console.log(`  └─ Bundle HTML: ${result.timing.bundleHtml.toFixed(2)}ms`);
      }
      if (result.timing.getRenderInfo) {
        console.log(`  └─ Get Render Info: ${result.timing.getRenderInfo.toFixed(2)}ms`);
      }
      if (result.timing.createAssetsBundle) {
        console.log(`  └─ Create Assets Bundle: ${result.timing.createAssetsBundle.toFixed(2)}ms`);
      }
      if (result.timing.renderFragment) {
        console.log(`  └─ Render Fragment: ${result.timing.renderFragment.toFixed(2)}ms`);
        const frameCount = Math.ceil((result.durationMs / 1000) * result.fps);
        const msPerFrame = result.timing.renderFragment / frameCount;
        console.log(`     └─ Per Frame: ${msPerFrame.toFixed(2)}ms`);
      }
      if (result.timing.writeFile) {
        console.log(`  └─ Write File: ${result.timing.writeFile.toFixed(2)}ms`);
      }
      if (result.timing.electronRpcTerminate) {
        console.log(`  └─ Electron RPC Terminate: ${result.timing.electronRpcTerminate.toFixed(2)}ms`);
      }
      
      // Calculate percentage breakdown
      console.log("\n  Percentage Breakdown:");
      if (result.timing.bundleHtml) {
        const pct = (result.timing.bundleHtml / result.renderTimeMs * 100).toFixed(1);
        console.log(`    Bundle HTML: ${pct}%`);
      }
      if (result.timing.getRenderInfo) {
        const pct = (result.timing.getRenderInfo / result.renderTimeMs * 100).toFixed(1);
        console.log(`    Get Render Info: ${pct}%`);
      }
      if (result.timing.createAssetsBundle) {
        const pct = (result.timing.createAssetsBundle / result.renderTimeMs * 100).toFixed(1);
        console.log(`    Create Assets Bundle: ${pct}%`);
      }
      if (result.timing.renderFragment) {
        const pct = (result.timing.renderFragment / result.renderTimeMs * 100).toFixed(1);
        console.log(`    Render Fragment: ${pct}%`);
      }
      if (result.timing.writeFile) {
        const pct = (result.timing.writeFile / result.renderTimeMs * 100).toFixed(1);
        console.log(`    Write File: ${pct}%`);
      }
    }
    
    console.log("\n" + "=".repeat(80));
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
    
    timingResults.push(result);
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
    
    timingResults.push(result);
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
    
    timingResults.push(result);
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
    
    timingResults.push(result);
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
    
    timingResults.push(result);
    expect(result.durationMs).toBeCloseTo(100, 20);
    
    // Bundle HTML time should be near zero (cache hit)
    console.log(`\n[CACHE HIT TEST] Bundle time: ${result.timing.bundleHtml?.toFixed(2)}ms`);
    expect(result.timing.bundleHtml).toBeLessThan(10); // Should be < 10ms for cache hit
  });
});
