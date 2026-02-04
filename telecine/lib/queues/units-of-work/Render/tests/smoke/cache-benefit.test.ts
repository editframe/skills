import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { render, getBundleCacheStats, clearBundleCache } from "../utils/render";
import { createElectronRPC, type ElectronRPC } from "../../ElectronRPCClient";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";

describe("Bundle Cache Benefit", { timeout: 60000 }, () => {
  let testAgent: Selectable<TestAgent>;
  let electronRpc: ElectronRPC;

  beforeAll(async () => {
    testAgent = await makeTestAgent("cache-benefit@example.org");
    electronRpc = await createElectronRPC();
    clearBundleCache(); // Start with empty cache
  });

  afterAll(async () => {
    if (electronRpc) {
      await electronRpc.rpc.call("terminate");
    }
    
    const stats = getBundleCacheStats();
    console.log("\n" + "=".repeat(80));
    console.log("BUNDLE CACHE STATISTICS");
    console.log("=".repeat(80));
    console.log(`  Cache Hits: ${stats.hits}`);
    console.log(`  Cache Misses: ${stats.misses}`);
    console.log(`  Hit Rate: ${stats.hitRate}`);
    console.log(`  Cache Size: ${stats.cacheSize} entries`);
    console.log("=".repeat(80) + "\n");
  });

  const simpleHTML = `
    <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
      <div class="w-full h-full bg-blue-500"></div>
    </ef-timegroup>
  `;

  test("render 1 - cache miss", async () => {
    const start = performance.now();
    const result = await render(simpleHTML, {
      testAgent,
      electronRpc,
      testName: "cache-test-1",
    });
    const elapsed = performance.now() - start;
    
    console.log(`\n[Test 1] Total time: ${elapsed.toFixed(0)}ms, Bundle time: ${result.timing.bundleHtml?.toFixed(0)}ms`);
    expect(result.durationMs).toBeCloseTo(100, 20);
  });

  test("render 2 - cache hit (same HTML)", async () => {
    const start = performance.now();
    const result = await render(simpleHTML, {
      testAgent,
      electronRpc,
      testName: "cache-test-2",
    });
    const elapsed = performance.now() - start;
    
    console.log(`[Test 2] Total time: ${elapsed.toFixed(0)}ms, Bundle time: ${result.timing.bundleHtml?.toFixed(0)}ms`);
    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.timing.bundleHtml).toBeLessThan(10); // Should be < 10ms (cache hit)
  });

  test("render 3 - cache hit (same HTML again)", async () => {
    const start = performance.now();
    const result = await render(simpleHTML, {
      testAgent,
      electronRpc,
      testName: "cache-test-3",
    });
    const elapsed = performance.now() - start;
    
    console.log(`[Test 3] Total time: ${elapsed.toFixed(0)}ms, Bundle time: ${result.timing.bundleHtml?.toFixed(0)}ms`);
    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.timing.bundleHtml).toBeLessThan(10); // Should be < 10ms (cache hit)
  });

  test("render 4 - different HTML, cache miss", async () => {
    const differentHTML = `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-red-500"></div>
      </ef-timegroup>
    `;
    
    const start = performance.now();
    const result = await render(differentHTML, {
      testAgent,
      electronRpc,
      testName: "cache-test-4",
    });
    const elapsed = performance.now() - start;
    
    console.log(`[Test 4] Total time: ${elapsed.toFixed(0)}ms, Bundle time: ${result.timing.bundleHtml?.toFixed(0)}ms`);
    expect(result.durationMs).toBeCloseTo(100, 20);
  });

  test("render 5 - back to original HTML, cache hit", async () => {
    const start = performance.now();
    const result = await render(simpleHTML, {
      testAgent,
      electronRpc,
      testName: "cache-test-5",
    });
    const elapsed = performance.now() - start;
    
    console.log(`[Test 5] Total time: ${elapsed.toFixed(0)}ms, Bundle time: ${result.timing.bundleHtml?.toFixed(0)}ms`);
    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.timing.bundleHtml).toBeLessThan(10); // Should be < 10ms (cache hit)
  });
});
