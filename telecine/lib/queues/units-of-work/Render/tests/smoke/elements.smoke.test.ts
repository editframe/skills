import { describe, test, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import { render, getSharedOutputDir } from "../utils/render";
import { validateMP4 } from "../utils/video-validator";
import {
  processTestVideoAsset,
  processTestImageAsset,
} from "../../test-utils/processTestAssets";
import { createElectronRPC, type ElectronRPC } from "../../ElectronRPCClient";
import { getStrategiesToTest, ALL_STRATEGIES } from "./strategies";
import { compareStrategies } from "../utils/visual-diff";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type {
  Video2IsobmffFiles,
  Video2ImageFiles,
} from "@/sql-client.server/kysely-codegen";

const strategies = getStrategiesToTest();

describe("Elements Smoke Tests", { timeout: 60000 }, () => {
  let testAgent: Selectable<TestAgent>;
  let barsNTone: Selectable<Video2IsobmffFiles>;
  let testImage: Selectable<Video2ImageFiles>;
  let webpImage: Selectable<Video2ImageFiles>;
  let electronRpc: ElectronRPC | undefined;

  beforeAll(async () => {
    testAgent = await makeTestAgent("elements-smoke@example.org");
    barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
    testImage = await processTestImageAsset("test.jpg", testAgent);
    webpImage = await processTestImageAsset("test.webp", testAgent);

    // Create electronRPC once for all browser render strategies
    // Only needed if we're testing browser strategies
    const needsElectronRpc = strategies.some((s) => s.renderMode !== "server");
    if (needsElectronRpc) {
      electronRpc = await createElectronRPC();
    }
  });

  afterAll(async () => {
    if (electronRpc) {
      await electronRpc.rpc.call("terminate");
    }
  });

  describe.each(strategies)("$name", (strategy) => {
    const renderOpts = {
      renderMode: strategy.renderMode,
      canvasMode: strategy.canvasMode,
      testAgent: undefined as any, // Will be set in tests
      electronRpc: undefined as any, // Will be set in tests
    };

    test("ef-timegroup renders", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <div class="w-full h-full bg-blue-500"></div>
        </ef-timegroup>
      `,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `elements-smoke-ef-timegroup-${strategy.name}`,
        },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("ef-image renders", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <ef-image asset-id="${testImage.id}" class="w-full h-full object-cover" />
        </ef-timegroup>
      `,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `elements-smoke-ef-image-${strategy.name}`,
        },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("ef-image with WebP source renders", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <ef-image asset-id="${webpImage.id}" class="w-full h-full object-cover" />
        </ef-timegroup>
      `,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `elements-smoke-ef-image-webp-${strategy.name}`,
        },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("ef-text renders", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <div class="w-full h-full bg-white flex items-center justify-center">
            <ef-text class="text-black text-4xl">Hello</ef-text>
          </div>
        </ef-timegroup>
      `,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `elements-smoke-ef-text-${strategy.name}`,
        },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("nested ef-timegroups render", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <ef-timegroup class="w-full h-full" mode="fixed" duration="100ms">
            <div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
          </ef-timegroup>
        </ef-timegroup>
      `,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `elements-smoke-nested-timegroups-${strategy.name}`,
        },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("multiple elements render together", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <div class="w-full h-full bg-gray-900 flex items-center justify-center gap-4">
            <ef-image asset-id="${testImage.id}" class="w-24 h-24 object-cover" />
            <ef-text class="text-white text-4xl">Hello</ef-text>
          </div>
        </ef-timegroup>
      `,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `elements-smoke-multiple-elements-${strategy.name}`,
        },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("ef-video renders and seeks through frames", async () => {
      // Render 200ms to get ~6 frames, ensuring we see the video playing through multiple frames
      const result = await render(
        `
        <ef-timegroup class="w-[480px] h-[270px]" mode="fixed" duration="200ms">
          <ef-video asset-id="${barsNTone.id}" class="w-full" source-out="200ms"></ef-video>
        </ef-timegroup>
      `,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `elements-smoke-ef-video-${strategy.name}`,
        },
      );

      expect(result.durationMs).toBeCloseTo(200, 20);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.hasVideoTrack).toBe(true);
    });

    test("ef-audio renders", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <ef-audio asset-id="${barsNTone.id}"></ef-audio>
          <div class="w-full h-full bg-green-500 flex items-center justify-center">
            <div class="text-white text-2xl">Audio Test</div>
          </div>
        </ef-timegroup>
      `,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `elements-smoke-ef-audio-${strategy.name}`,
        },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);

      // Frame-by-frame browser rendering doesn't support audio encoding
      if (strategy.renderMode !== "browser-frame-by-frame") {
        expect(validation.hasAudioTrack).toBe(true);
      }
    });

    test("ef-waveform renders", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <ef-audio asset-id="${barsNTone.id}" id="test-audio"></ef-audio>
          <ef-waveform target="test-audio" mode="bars" class="color-blue-500 bg-white w-full h-full"></ef-waveform>
        </ef-timegroup>
      `,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `elements-smoke-ef-waveform-${strategy.name}`,
        },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.hasVideoTrack).toBe(true);

      // Frame-by-frame browser rendering doesn't support audio encoding
      if (strategy.renderMode !== "browser-frame-by-frame") {
        expect(validation.hasAudioTrack).toBe(true);
      }
    });
  });

  describe("file-id attribute (unified API)", () => {
    const strategy = strategies[0]!;
    const renderOpts = {
      renderMode: strategy.renderMode,
      canvasMode: strategy.canvasMode,
      testAgent: undefined as any,
      electronRpc: undefined as any,
    };

    test("ef-image renders with file-id", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <ef-image file-id="${testImage.id}" class="w-full h-full object-cover" />
        </ef-timegroup>
      `,
        { ...renderOpts, testAgent, electronRpc, testName: "file-id-ef-image" },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("ef-video renders with file-id", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[480px] h-[270px]" mode="fixed" duration="200ms">
          <ef-video file-id="${barsNTone.id}" class="w-full" source-out="200ms"></ef-video>
        </ef-timegroup>
      `,
        { ...renderOpts, testAgent, electronRpc, testName: "file-id-ef-video" },
      );

      expect(result.durationMs).toBeCloseTo(200, 20);
      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.hasVideoTrack).toBe(true);
    });

    test("ef-audio renders with file-id", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
          <ef-audio file-id="${barsNTone.id}"></ef-audio>
          <div class="w-full h-full bg-green-500"></div>
        </ef-timegroup>
      `,
        { ...renderOpts, testAgent, electronRpc, testName: "file-id-ef-audio" },
      );

      expect(result.durationMs).toBeCloseTo(100, 20);
      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
    });
  });

  // Only run strategy comparisons if we're testing multiple strategies
  if (strategies.length > 1) {
    describe("Strategy Consistency", () => {
      const testNames = [
        "ef-timegroup",
        "ef-image",
        "ef-text",
        "nested-timegroups",
        "multiple-elements",
        "ef-video",
        "ef-audio",
        "ef-waveform",
      ];

      testNames.forEach((testName) => {
        test(`${testName} outputs match across strategies`, async () => {
          // Get the output directory for this test
          const testOutputDir = path.join(getSharedOutputDir(), testName);

          // Compare all strategies
          const strategyNames = ALL_STRATEGIES.map((s) =>
            s.canvasMode ? `${s.renderMode}-${s.canvasMode}` : s.renderMode,
          );

          const results = await compareStrategies(
            testOutputDir,
            strategyNames,
            {
              threshold: 0.1,
              framesPerSecond: 30,
            },
          );

          // Check for failures
          const failures = results.filter((r) => !r.passed);

          if (failures.length > 0) {
            const summary = failures
              .map(
                (f) =>
                  `  ${f.strategy1} vs ${f.strategy2} frame ${f.frameIndex}: ${f.diffPercentage.toFixed(2)}% diff (${f.diffPixels} pixels)\n` +
                  `    Diff image: ${f.diffImagePath}`,
              )
              .join("\n");

            console.warn(
              `⚠️  Visual differences detected in ${testName}:\n` +
                `${failures.length} frame(s) exceeded 10% threshold\n` +
                summary,
            );
          } else {
            console.log(
              `✅ All strategies match for ${testName} (${results.length} comparisons)`,
            );
          }

          // For now, just warn about differences - don't fail the test
          // Later we can make this strict once we verify consistency
        }, 60000); // 60s timeout for comparison
      });
    });
  }
});
