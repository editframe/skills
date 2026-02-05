/**
 * MP4 Structure Smoke Tests
 * 
 * Validates deep MP4 structure and timing consistency across strategies.
 * Tests segment assembly, timing metadata, and base media decode times.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { render } from "../utils/render";
import { type RenderStrategy } from "./strategies";
import { processTestVideoAsset } from "../../test-utils/processTestAssets";
import { createElectronRPC, type ElectronRPC } from "../../ElectronRPCClient";
import { extractMP4Metadata, verifyDurationConsistency } from "@/util/mp4-box-analysis";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";

const MP4_TEST_CONSTANTS = {
  DEFAULT_MOVIE_TIMESCALE: 1000,
  DEFAULT_VIDEO_TIMESCALE: 15360,
  DEFAULT_AUDIO_TIMESCALE: 48000,
  AV_SYNC_TOLERANCE_MS: 15,
  AAC_FRAME_SAMPLES: 1024,
  VIDEO_FPS: 30,
} as const;

// Test only server mode for MP4 structure validation
// Browser modes create non-fragmented MP4s without segments, so these tests only apply to server mode
const MP4_STRATEGIES: RenderStrategy[] = [
  { name: "server", renderMode: "server", description: "Electron offscreen rendering (default)" },
];

describe("MP4 Structure Smoke Tests", () => {
  let testAgent: Selectable<TestAgent>;
  let electronRpc: ElectronRPC;
  let barsNTone: Selectable<Video2IsobmffFiles>;

  beforeAll(async () => {
    testAgent = await makeTestAgent("mp4-structure-smoke@example.org");
    electronRpc = await createElectronRPC();
    
    // Process bars-n-tone.mp4 for audio track
    barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
  }, 60000);

  afterAll(async () => {
    if (electronRpc) await electronRpc.rpc.call("terminate");
  });

  describe.each(MP4_STRATEGIES)("$name", (strategy) => {
    const renderOpts = {
      renderMode: strategy.renderMode,
      canvasMode: strategy.canvasMode,
      testAgent: undefined as any, // Will be set in tests
      electronRpc: undefined as any, // Will be set in tests
    };

    test("base media decode times match cumulative sample durations", async () => {
      const result = await render(
        `<ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="2s">
  <ef-audio asset-id="${barsNTone.id}"></ef-audio>
  <div class="w-full h-full bg-green-500 flex items-center justify-center">
    <div class="text-white text-2xl">Decode Time Test</div>
  </div>
</ef-timegroup>`,
        { ...renderOpts, testAgent, electronRpc, testName: `mp4-decode-time-${strategy.name}` },
      );

      // Get mp4dump output for precise timing analysis
      let mp4Output: string;
      try {
        mp4Output = execSync(`mp4dump "${result.videoPath}"`, {
          encoding: "utf8",
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (error) {
        throw new Error(`mp4dump failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Parse timescales from mp4dump output
      const lines = mp4Output.split("\n");
      const timescales: number[] = [];

      for (const line of lines) {
        if (line.includes("timescale =")) {
          const parts = line.split("=");
          if (parts[1]) {
            const timescale = parseInt(parts[1].trim());
            timescales.push(timescale);
          }
        }
      }

      // Expected: [movie_timescale, video_track_timescale, audio_track_timescale]
      expect(timescales.length).toBeGreaterThanOrEqual(3);

      const movieTimescale = timescales[0] ?? MP4_TEST_CONSTANTS.DEFAULT_MOVIE_TIMESCALE;
      const videoTimescale = timescales[1] ?? MP4_TEST_CONSTANTS.DEFAULT_VIDEO_TIMESCALE;
      const audioTimescale = timescales[2] ?? MP4_TEST_CONSTANTS.DEFAULT_AUDIO_TIMESCALE;

      console.debug(`\n=== ${strategy.name} Timescales ===`);
      console.debug(`Movie: ${movieTimescale}, Video: ${videoTimescale}, Audio: ${audioTimescale}`);

      // Create track mapping
      const trackInfo = new Map<number, { timescale: number; handlerType: string }>();
      trackInfo.set(1, { timescale: videoTimescale, handlerType: "vide" });
      trackInfo.set(2, { timescale: audioTimescale, handlerType: "soun" });

      // Extract timing data for each track
      const trackSegments = new Map<
        number,
        Array<{ sequence: number; baseTime: number; sampleCount: number }>
      >();
      let currentSequence = 0;
      let currentTrackId: number | null = null;

      for (let i = 0; i < lines.length; i++) {
        const lineRaw = lines[i];
        if (!lineRaw) continue;
        const line = lineRaw.trim();

        // Look for sequence numbers
        if (line.includes("sequence number =")) {
          const parts = line.split("=");
          if (parts[1]) {
            currentSequence = parseInt(parts[1].trim());
            continue;
          }
        }

        // Look for track ID in tfhd boxes
        if (line.includes("track ID =")) {
          const parts = line.split("=");
          if (parts[1]) {
            currentTrackId = parseInt(parts[1].trim());
          }
        }

        // Look for base media decode time and sample count pairs
        if (line.includes("base media decode time =") && currentTrackId !== null) {
          const parts = line.split("=");
          if (parts[1]) {
            const baseTime = parseInt(parts[1].trim());

            // Look ahead for the sample count
            for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
              const searchLineRaw = lines[j];
              if (!searchLineRaw) continue;
              const searchLine = searchLineRaw.trim();
              if (searchLine.includes("sample count =")) {
                const sampleParts = searchLine.split("=");
                if (sampleParts[1]) {
                  const sampleCount = parseInt(sampleParts[1].trim());

                  if (!trackSegments.has(currentTrackId)) {
                    trackSegments.set(currentTrackId, []);
                  }

                  const segments = trackSegments.get(currentTrackId);
                  if (segments) {
                    segments.push({ sequence: currentSequence, baseTime, sampleCount });
                  }

                  break;
                }
              }
            }
          }
        }
      }

      // Validate timing for each track
      expect(trackSegments.size).toBeGreaterThan(0);
      expect(trackInfo.size).toBeGreaterThan(0);

      for (const [trackId, segments] of trackSegments) {
        const info = trackInfo.get(trackId);

        expect(info).toBeDefined();
        expect(segments.length).toBeGreaterThan(0);

        // Sort segments by sequence number
        segments.sort((a, b) => a.sequence - b.sequence);

        let expectedCumulativeTime = 0;

        console.debug(
          `\n🔍 Validating Track ${trackId} (${info!.handlerType}) with timescale ${info!.timescale}`,
        );

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          if (!segment) continue;

          if (info!.handlerType === "soun") {
            // Audio track: verify against actual AAC frame pattern
            expect(segment.baseTime).toBe(expectedCumulativeTime);

            // Calculate next expected time based on AAC pattern
            const sampleDuration = MP4_TEST_CONSTANTS.AAC_FRAME_SAMPLES;
            expectedCumulativeTime += segment.sampleCount * sampleDuration;
          } else if (info!.handlerType === "vide") {
            // Video track: should be synchronized with audio (same time in milliseconds)
            const audioSegments = trackSegments.get(2); // Audio is track 2
            if (audioSegments) {
              const correspondingAudioSegment = audioSegments.find(
                (s) => s.sequence === segment.sequence,
              );
              if (correspondingAudioSegment) {
                const audioTimeMs = (correspondingAudioSegment.baseTime / MP4_TEST_CONSTANTS.DEFAULT_AUDIO_TIMESCALE) * 1000;
                const videoTimeMs = (segment.baseTime / MP4_TEST_CONSTANTS.DEFAULT_VIDEO_TIMESCALE) * 1000;

                // Video and audio timing will have small differences due to frame alignment
                // Video: 33.33ms frames (30fps), Audio: 21.33ms frames (AAC), tolerance ~15ms
                expect(Math.abs(videoTimeMs - audioTimeMs)).toBeLessThanOrEqual(MP4_TEST_CONSTANTS.AV_SYNC_TOLERANCE_MS);
                console.debug(
                  `✅ Segment ${segment.sequence}: Video (${videoTimeMs.toFixed(2)}ms) synced with Audio (${audioTimeMs.toFixed(2)}ms)`,
                );
              }
            }

            // For expectedCumulativeTime calculation, use the synchronized time
            expectedCumulativeTime =
              segment.baseTime + segment.sampleCount * Math.round(info!.timescale / MP4_TEST_CONSTANTS.VIDEO_FPS);
          }

          const sampleDuration =
            info!.handlerType === "soun" ? MP4_TEST_CONSTANTS.AAC_FRAME_SAMPLES : Math.round(info!.timescale / MP4_TEST_CONSTANTS.VIDEO_FPS);
          console.debug(
            `✅ Segment ${segment.sequence}: ${segment.baseTime} decode time, ${segment.sampleCount} samples (${sampleDuration} units per sample)`,
          );
        }

        console.debug(
          `✅ Track ${trackId} (${info!.handlerType}): All ${segments.length} segments have correct base media decode times`,
        );
      }

      console.debug(
        `\n✅ All tracks validated: Base media decode times match cumulative sample durations`,
      );
    }, 45000);

    test("duration metadata is consistent across all sources", async () => {
      const result = await render(
        `<ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="2s">
  <ef-audio asset-id="${barsNTone.id}"></ef-audio>
  <div class="w-full h-full bg-purple-500 flex items-center justify-center">
    <div class="text-white text-2xl">Duration Test</div>
  </div>
</ef-timegroup>`,
        { ...renderOpts, testAgent, electronRpc, testName: `mp4-duration-${strategy.name}` },
      );

      const metadata = await extractMP4Metadata(result.videoPath);
      const consistency = verifyDurationConsistency(metadata, 0.1);

      if (!consistency.isConsistent) {
        console.error("Duration inconsistencies found:", consistency.issues);
      }

      expect(consistency.isConsistent).toBe(true);
      expect(consistency.issues).toHaveLength(0);
      expect(metadata.isFragmented).toBe(true);
    }, 45000);

    test("sequence numbers are sequential starting from 1", async () => {
      const result = await render(
        `<ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="2s">
  <ef-audio asset-id="${barsNTone.id}"></ef-audio>
  <div class="w-full h-full bg-red-500"></div>
</ef-timegroup>`,
        { ...renderOpts, testAgent, electronRpc, testName: `mp4-sequence-${strategy.name}` },
      );

      const metadata = await extractMP4Metadata(result.videoPath);

      // Verify sequence numbers are sequential and start from 1
      const sequenceNumbers = metadata.sequenceNumbers;
      expect(sequenceNumbers.length).toBeGreaterThan(0);

      // Check they're in order and no duplicates
      for (let i = 0; i < sequenceNumbers.length; i++) {
        expect(sequenceNumbers[i]).toBe(i + 1);
      }
    }, 45000);
  });
});
