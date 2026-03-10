// Integration tests - use smoke tests for fast feedback
import { describe, test, expect } from "vitest";
import { render } from "../utils/render";

describe("Render Speed Benchmarks", { timeout: 30000 }, () => {
  describe("Simple content", () => {
    test("solid color renders quickly", async () => {
      const start = performance.now();

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-blue-500"></div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(`Solid color (2s): ${elapsed.toFixed(0)}ms`);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      // Performance assertion - adjust based on baseline
      // expect(elapsed).toBeLessThan(10000); // 10 seconds
    });

    test("simple text renders quickly", async () => {
      const start = performance.now();

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-black flex items-center justify-center">
            <span class="text-white text-6xl font-bold">Hello World</span>
          </div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(`Simple text (2s): ${elapsed.toFixed(0)}ms`);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
    });
  });

  describe("Complex content", () => {
    test("gradient and effects render time", async () => {
      const start = performance.now();

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <span 
              class="text-white text-9xl font-bold"
              style="filter: blur(2px) drop-shadow(0 0 10px rgba(255,255,255,0.5));"
            >
              EFFECTS
            </span>
          </div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(`Gradient + effects (2s): ${elapsed.toFixed(0)}ms`);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
    });

    test("animation render time", async () => {
      const start = performance.now();

      const result = await render(`
        <style>
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-blue-500 flex items-center justify-center"
            style="animation: fade-in 2s backwards;"
          >
            <span class="text-white text-8xl font-bold">ANIMATED</span>
          </div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(`CSS animation (2s): ${elapsed.toFixed(0)}ms`);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
    });
  });

  describe("Duration scaling", () => {
    test("1s video baseline", async () => {
      const start = performance.now();

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-green-500"></div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(
        `1s video: ${elapsed.toFixed(0)}ms (${(elapsed / 1000).toFixed(1)}ms per second of output)`,
      );

      expect(result.videoBuffer.length).toBeGreaterThan(0);
    });

    test("5s video scaling", async () => {
      const start = performance.now();

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="5s">
          <div class="w-full h-full bg-purple-500"></div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(
        `5s video: ${elapsed.toFixed(0)}ms (${(elapsed / 5000).toFixed(1)}ms per second of output)`,
      );

      expect(result.videoBuffer.length).toBeGreaterThan(0);
    }, 30000);

    test("10s video scaling", async () => {
      const start = performance.now();

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="10s">
          <div class="w-full h-full bg-orange-500"></div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(
        `10s video: ${elapsed.toFixed(0)}ms (${(elapsed / 10000).toFixed(1)}ms per second of output)`,
      );

      expect(result.videoBuffer.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe("Resolution impact", () => {
    test("HD 720p render time", async () => {
      const start = performance.now();

      const result = await render(`
        <ef-timegroup class="w-[1280px] h-[720px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-blue-500"></div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(`720p (2s): ${elapsed.toFixed(0)}ms`);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
    });

    test("Full HD 1080p render time", async () => {
      const start = performance.now();

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-green-500"></div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(`1080p (2s): ${elapsed.toFixed(0)}ms`);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
    });

    test("4K 2160p render time", async () => {
      const start = performance.now();

      const result = await render(`
        <ef-timegroup class="w-[3840px] h-[2160px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-purple-500"></div>
        </ef-timegroup>
      `);

      const elapsed = performance.now() - start;

      console.log(`4K (2s): ${elapsed.toFixed(0)}ms`);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
    }, 60000);
  });
});
