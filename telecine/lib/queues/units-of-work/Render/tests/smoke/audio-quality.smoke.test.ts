/**
 * Audio Quality Smoke Tests
 *
 * Tests audio rendering quality across all strategies, including:
 * - Audio discontinuity detection at segment boundaries (AAC splicing)
 * - Frequency spectrum analysis
 * - Playback and seeking validation
 *
 * Note: Frame-by-frame browser rendering doesn't support audio encoding.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  extractAudioMetadata,
  analyzeAudioSpectrum,
  testVideoPlayback,
} from "../../test-utils";
import { analyzeZeroCrossingTiming } from "../../test-utils/audio-regression";
import { render, type RenderMode, type CanvasMode } from "../utils/render";
import { processTestVideoAsset } from "../../test-utils/processTestAssets";
import { createElectronRPC, type ElectronRPC } from "../../ElectronRPCClient";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";

const AUDIO_TEST_CONSTANTS = {
  SAMPLE_RATE: 48000,
  SINE_WAVE_220HZ_ZERO_CROSSING_INTERVAL: 109,
  ZERO_CROSSING_DEVIATION_THRESHOLD: 20,
  DURATION_TOLERANCE_MS: 0.2,
  MIN_FREQUENCY_HZ: 500,
  MIN_SIGNAL_LEVEL_DB: -40,
} as const;

type RenderStrategy = {
  name: string;
  renderMode: RenderMode;
  canvasMode?: CanvasMode;
};

// Test all audio-capable strategies
// Note: browser-frame-by-frame excludes audio encoding, so we test server + browser-full-video
const AUDIO_STRATEGIES: RenderStrategy[] = [
  { name: "server", renderMode: "server" },
  {
    name: "browser-full-video-native",
    renderMode: "browser-full-video",
    canvasMode: "native",
  },
  {
    name: "browser-full-video-foreignObject",
    renderMode: "browser-full-video",
    canvasMode: "foreignObject",
  },
];

describe("Audio Quality Smoke Tests", () => {
  let testAgent: Selectable<TestAgent>;
  let electronRpc: ElectronRPC;
  let barsNTone: Selectable<Video2IsobmffFiles>;

  beforeAll(async () => {
    testAgent = await makeTestAgent("audio-quality-smoke@example.org");
    electronRpc = await createElectronRPC();

    // Process bars-n-tone.mp4 (contains 220Hz sine wave for zero-crossing analysis)
    barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
  }, 60000);

  afterAll(async () => {
    if (electronRpc) await electronRpc.rpc.call("terminate");
  });

  describe.each(AUDIO_STRATEGIES)("$name", (strategy) => {
    const renderOpts = {
      renderMode: strategy.renderMode,
      canvasMode: strategy.canvasMode,
      testAgent: undefined as any, // Will be set in tests
      electronRpc: undefined as any, // Will be set in tests
    };

    test("audio track has no discontinuities at segment boundaries", async () => {
      // Render 2s video to cross multiple 500ms segment boundaries
      const result = await render(
        `<ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="2s">
  <ef-audio asset-id="${barsNTone.id}"></ef-audio>
  <div class="w-full h-full bg-green-500 flex items-center justify-center">
    <div class="text-white text-2xl">Audio Discontinuity Test</div>
  </div>
</ef-timegroup>`,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `audio-discontinuity-${strategy.name}`,
        },
      );

      // Test segment boundary area around 1.0s where discontinuities can occur
      const boundaryAnalysis = await analyzeZeroCrossingTiming(
        result.videoPath,
        result.templateHash,
        0.8,
        0.4,
        {
          expectedInterval:
            AUDIO_TEST_CONSTANTS.SINE_WAVE_220HZ_ZERO_CROSSING_INTERVAL,
          deviationThreshold:
            AUDIO_TEST_CONSTANTS.ZERO_CROSSING_DEVIATION_THRESHOLD,
          label: `Segment Boundary Area (0.8s-1.2s) (${strategy.name})`,
        },
      );

      // Test clean section well away from boundaries
      const cleanAnalysis = await analyzeZeroCrossingTiming(
        result.videoPath,
        result.templateHash,
        0.2,
        0.3,
        {
          expectedInterval:
            AUDIO_TEST_CONSTANTS.SINE_WAVE_220HZ_ZERO_CROSSING_INTERVAL,
          deviationThreshold:
            AUDIO_TEST_CONSTANTS.ZERO_CROSSING_DEVIATION_THRESHOLD,
          label: `Clean Section (0.2s-0.5s) (${strategy.name})`,
        },
      );

      // Assert no discontinuities in either section
      // NOTE: This test may fail until AAC segment splicing math is fixed
      expect(boundaryAnalysis.hasDiscontinuity).toBe(false);
      expect(cleanAnalysis.hasDiscontinuity).toBe(false);
    }, 60000);

    test("audio frequency spectrum is preserved", async () => {
      const result = await render(
        `<ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="1s">
  <ef-audio asset-id="${barsNTone.id}"></ef-audio>
  <div class="w-full h-full bg-blue-500 flex items-center justify-center">
    <div class="text-white text-2xl">Spectrum Test</div>
  </div>
</ef-timegroup>`,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `audio-spectrum-${strategy.name}`,
        },
      );

      const audioAnalysis = await analyzeAudioSpectrum(result.videoPath);

      expect(audioAnalysis.hasToneSignal).toBe(true);
      expect(audioAnalysis.dominantFrequency).toBeGreaterThan(
        AUDIO_TEST_CONSTANTS.MIN_FREQUENCY_HZ,
      );
      expect(audioAnalysis.signalLevel).toBeGreaterThan(
        AUDIO_TEST_CONSTANTS.MIN_SIGNAL_LEVEL_DB,
      );
    }, 30000);

    test("audio metadata is correct", async () => {
      const result = await render(
        `<ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="1s">
  <ef-audio asset-id="${barsNTone.id}"></ef-audio>
  <div class="w-full h-full bg-red-500"></div>
</ef-timegroup>`,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `audio-metadata-${strategy.name}`,
        },
      );

      const audioMetadata = await extractAudioMetadata(result.videoPath);

      expect(audioMetadata.hasAudio).toBe(true);
      expect(audioMetadata.sampleRate).toBe(AUDIO_TEST_CONSTANTS.SAMPLE_RATE);
      expect(audioMetadata.channels).toBeGreaterThan(0);
      expect(audioMetadata.duration).toBeCloseTo(
        1.0,
        AUDIO_TEST_CONSTANTS.DURATION_TOLERANCE_MS,
      );
    }, 30000);

    test("video with audio is playable", async () => {
      const result = await render(
        `<ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="1s">
  <ef-audio asset-id="${barsNTone.id}"></ef-audio>
  <div class="w-full h-full bg-yellow-500"></div>
</ef-timegroup>`,
        {
          ...renderOpts,
          testAgent,
          electronRpc,
          testName: `audio-playback-${strategy.name}`,
        },
      );

      const playbackTest = await testVideoPlayback(result.videoPath);
      expect(playbackTest.canPlay).toBe(true);
      expect(playbackTest.duration).toBeGreaterThan(0);
    }, 30000);
  });
});
