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

import { describe, test, expect, beforeAll } from "vitest";
import path from "node:path";
import { 
  extractAudioMetadata, 
  analyzeAudioSpectrum, 
  testVideoPlayback, 
  testVideoSeek 
} from "../../test-utils";
import { extractAudioSamplesAtTime } from "../../test-utils/audio-regression";
import { render, getSharedOutputDir, type RenderStrategy } from "../utils/render";
import { processTestVideoAsset } from "../../test-utils/processTestAssets";
import { createElectronRPC, type ElectronRPC } from "../../ElectronRPCClient";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";

// Test all audio-capable strategies
// Note: browser-frame-by-frame excludes audio encoding, so we test server + browser-full-video
const AUDIO_STRATEGIES: RenderStrategy[] = [
  { name: "server", renderMode: "server" },
  { name: "browser-full-video-native", renderMode: "browser-full-video", canvasMode: "native" },
  { name: "browser-full-video-foreignObject", renderMode: "browser-full-video", canvasMode: "foreignObject" },
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

  describe.each(AUDIO_STRATEGIES)("$name", (strategy) => {
    const renderOpts = {
      renderMode: strategy.renderMode,
      canvasMode: strategy.canvasMode,
      testAgent: undefined as any,
      electronRpc: undefined as any,
    };

    test("audio track has no discontinuities at segment boundaries", async () => {
      // Render 2s video to cross multiple 500ms segment boundaries
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="2s">
          <ef-audio asset-id="${barsNTone.id}"></ef-audio>
          <div class="w-full h-full bg-green-500 flex items-center justify-center">
            <div class="text-white text-2xl">Audio Discontinuity Test</div>
          </div>
        </ef-timegroup>
      `,
        { ...renderOpts, testAgent, electronRpc, testName: `audio-discontinuity-${strategy.name}` },
      );

      // Zero-crossing timing analysis for 220Hz sine wave discontinuity detection
      const expectedZeroCrossingInterval = 109; // samples @ 48kHz for 220Hz
      const deviationThreshold = 20; // samples

      async function analyzeZeroCrossingTiming(
        videoPath: string,
        templateHash: string,
        startTime: number,
        duration: number,
        label: string,
      ) {
        console.log(`\n=== ${label} (${strategy.name}) ===`);
        console.log(`Analyzing ${startTime.toFixed(1)}s to ${(startTime + duration).toFixed(1)}s`);

        const samples = await extractAudioSamplesAtTime(
          videoPath,
          startTime,
          duration,
          templateHash,
        );

        // Find zero-crossings
        const zeroCrossings: number[] = [];
        for (let i = 1; i < samples.length; i++) {
          const current = samples[i];
          const previous = samples[i - 1];
          if (current !== undefined && previous !== undefined) {
            if (current >= 0 !== previous >= 0) {
              zeroCrossings.push(i);
            }
          }
        }

        // Calculate intervals between zero-crossings
        const intervals: number[] = [];
        for (let i = 1; i < zeroCrossings.length; i++) {
          const current = zeroCrossings[i];
          const previous = zeroCrossings[i - 1];
          if (current !== undefined && previous !== undefined) {
            intervals.push(current - previous);
          }
        }

        if (intervals.length === 0) {
          console.log(`❌ No zero-crossing intervals found`);
          return { hasDiscontinuity: true, mean: 0, stdDev: 0, anomalies: [] };
        }

        const mean =
          intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const stdDev = Math.sqrt(
          intervals.reduce(
            (sum, interval) => sum + Math.pow(interval - mean, 2),
            0,
          ) / intervals.length,
        );

        // Find anomalous intervals
        const anomalies = intervals
          .map((interval, i) => ({
            interval,
            deviation: Math.abs(interval - expectedZeroCrossingInterval),
            timeSec: startTime + (zeroCrossings[i] || 0) / 48000,
          }))
          .filter((anomaly) => anomaly.deviation > deviationThreshold);

        console.log(`Zero-crossings found: ${zeroCrossings.length}`);
        console.log(
          `Mean interval: ${mean.toFixed(2)} samples (expected: ${expectedZeroCrossingInterval})`,
        );
        console.log(`Standard deviation: ${stdDev.toFixed(2)} samples`);
        console.log(`Anomalous intervals: ${anomalies.length}`);

        if (anomalies.length > 0) {
          console.log(`🚨 Timing anomalies detected:`);
          anomalies.slice(0, 5).forEach((anomaly) => {
            console.log(
              `   At ${anomaly.timeSec.toFixed(3)}s: ${anomaly.interval} samples (deviation: ${anomaly.deviation.toFixed(1)})`,
            );
          });
          if (anomalies.length > 5) {
            console.log(`   ... and ${anomalies.length - 5} more`);
          }
        } else {
          console.log(`✅ No timing anomalies detected`);
        }

        return {
          hasDiscontinuity: anomalies.length > 0,
          mean,
          stdDev,
          anomalies,
        };
      }

      // Test segment boundary area around 1.0s where discontinuities can occur
      const boundaryAnalysis = await analyzeZeroCrossingTiming(
        result.videoPath,
        result.templateHash,
        0.8,
        0.4,
        "Segment Boundary Area (0.8s-1.2s)",
      );

      // Test clean section well away from boundaries
      const cleanAnalysis = await analyzeZeroCrossingTiming(
        result.videoPath,
        result.templateHash,
        0.2,
        0.3,
        "Clean Section (0.2s-0.5s)",
      );

      console.log(`\n=== Test Results (${strategy.name}) ===`);
      console.log(
        `Segment boundary has discontinuity: ${boundaryAnalysis.hasDiscontinuity ? "🚨 YES" : "✅ NO"}`,
      );
      console.log(
        `Clean section has discontinuity: ${cleanAnalysis.hasDiscontinuity ? "🚨 YES" : "✅ NO"}`,
      );

      // Assert no discontinuities in either section
      // NOTE: This test may fail until AAC segment splicing math is fixed
      expect(boundaryAnalysis.hasDiscontinuity).toBe(false);
      expect(cleanAnalysis.hasDiscontinuity).toBe(false);
    }, 60000);

    test("audio frequency spectrum is preserved", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="1s">
          <ef-audio asset-id="${barsNTone.id}"></ef-audio>
          <div class="w-full h-full bg-blue-500 flex items-center justify-center">
            <div class="text-white text-2xl">Spectrum Test</div>
          </div>
        </ef-timegroup>
      `,
        { ...renderOpts, testAgent, electronRpc, testName: `audio-spectrum-${strategy.name}` },
      );

      const audioAnalysis = await analyzeAudioSpectrum(result.videoPath);

      expect(audioAnalysis.hasToneSignal).toBe(true);
      expect(audioAnalysis.dominantFrequency).toBeGreaterThan(500); // Has substantial frequency content
      expect(audioAnalysis.signalLevel).toBeGreaterThan(-40); // Reasonable audio level (dB)
    }, 30000);

    test("audio metadata is correct", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="1s">
          <ef-audio asset-id="${barsNTone.id}"></ef-audio>
          <div class="w-full h-full bg-red-500"></div>
        </ef-timegroup>
      `,
        { ...renderOpts, testAgent, electronRpc, testName: `audio-metadata-${strategy.name}` },
      );

      const audioMetadata = await extractAudioMetadata(result.videoPath);

      expect(audioMetadata.hasAudio).toBe(true);
      expect(audioMetadata.sampleRate).toBe(48000); // Should be 48kHz
      expect(audioMetadata.channels).toBeGreaterThan(0);
      expect(audioMetadata.duration).toBeCloseTo(1.0, 0.2); // 1 second ±200ms
    }, 30000);

    test("video with audio is playable", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="1s">
          <ef-audio asset-id="${barsNTone.id}"></ef-audio>
          <div class="w-full h-full bg-yellow-500"></div>
        </ef-timegroup>
      `,
        { ...renderOpts, testAgent, electronRpc, testName: `audio-playback-${strategy.name}` },
      );

      const playbackTest = await testVideoPlayback(result.videoPath);
      expect(playbackTest.canPlay).toBe(true);
      expect(playbackTest.duration).toBeGreaterThan(0);
    }, 30000);
  });
});
