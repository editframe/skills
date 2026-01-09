/**
 * Performance Benchmark: Template Bundle Reuse
 *
 * Tests the overhead of bundling templates multiple times vs reusing bundles.
 * This benchmark helps quantify the savings from sharing template bundles.
 */

import { describe, expect } from "vitest";
import { test as fixtureTest } from "../fixtures";
import { bundleTestTemplate } from "../../test-utils/html-bundler";

describe("Performance: Bundle Reuse", () => {
  // Simple test HTML that doesn't need assets
  const testHtml = /* HTML */ `
    <ef-timegroup class="w-[200px] h-[200px]" mode="fixed" duration="500ms">
      <div class="w-full h-full bg-gradient-to-r from-red-500 to-blue-500"></div>
    </ef-timegroup>
  `;

  fixtureTest(
    "bundling same template 5 times (simulates current approach)",
    { timeout: 60000 },
    async () => {
      const start = performance.now();

      // Simulate current approach: bundle 5 times (1 server + 4 browser modes)
      const bundles = [];
      for (let i = 0; i < 5; i++) {
        const bundle = await bundleTestTemplate(
          testHtml,
          import.meta.url,
          `perf-bundle-${i}`,
        );
        bundles.push(bundle);
      }

      const duration = performance.now() - start;
      console.log(`\n5 separate bundles: ${duration.toFixed(0)}ms (${(duration / 5).toFixed(0)}ms avg)`);

      // All bundles should produce valid output
      for (const bundle of bundles) {
        expect(bundle.indexPath).toContain("index.html");
      }
    },
  );

  fixtureTest(
    "bundling template once and reusing (optimized approach)",
    { timeout: 60000 },
    async () => {
      const start = performance.now();

      // Optimized: bundle once
      const bundle = await bundleTestTemplate(
        testHtml,
        import.meta.url,
        "perf-bundle-shared",
      );

      const duration = performance.now() - start;
      console.log(`\n1 shared bundle: ${duration.toFixed(0)}ms`);
      console.log(`Potential savings: ~${((duration * 4)).toFixed(0)}ms per test suite`);

      expect(bundle.indexPath).toContain("index.html");
    },
  );

  fixtureTest(
    "getRenderInfo with shared context vs creating new each time",
    { timeout: 60000 },
    async ({ electronRPC, testAgent }) => {
      const bundle = await bundleTestTemplate(
        testHtml,
        import.meta.url,
        "perf-context-test",
      );

      // Approach 1: Create new context each time (current)
      const start1 = performance.now();
      for (let i = 0; i < 3; i++) {
        await electronRPC.rpc.call("getRenderInfo", {
          location: `file://${bundle.indexPath}`,
          orgId: testAgent.org.id,
        });
      }
      const duration1 = performance.now() - start1;
      console.log(`\n3 getRenderInfo (new context each): ${duration1.toFixed(0)}ms`);

      // Approach 2: Create context once, reuse (optimized)
      const start2 = performance.now();
      const { contextId } = await electronRPC.rpc.call("createContext", {
        location: `file://${bundle.indexPath}`,
        orgId: testAgent.org.id,
      });

      for (let i = 0; i < 3; i++) {
        await electronRPC.rpc.call("getRenderInfo", {
          location: `file://${bundle.indexPath}`,
          orgId: testAgent.org.id,
          contextId,
        });
      }

      await electronRPC.rpc.call("disposeContext", contextId);
      const duration2 = performance.now() - start2;
      console.log(`3 getRenderInfo (shared context): ${duration2.toFixed(0)}ms`);
      console.log(`Speedup: ${(duration1 / duration2).toFixed(1)}x`);

      expect(duration2).toBeLessThan(duration1);
    },
  );
});




