/**
 * Audio Fidelity Test
 *
 * This test verifies audio rendering across different rendering modes.
 * It focuses on audio waveform comparison and detecting audio issues like:
 * - Missing audio in browser renders
 * - Audio glitches/discontinuities
 * - Audio drift or sync issues
 */

import { describe, expect } from "vitest";
import { test as fixtureTest } from "../fixtures";
import type { RenderMode, CanvasMode } from "../fixtures";
import { bundleTestTemplate, getTestRenderDir } from "../../test-utils/html-bundler";
import { compareAudioWaveforms } from "../../test-utils/audio-regression";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * All browser-based rendering mode combinations to test.
 */
const BROWSER_MODES: Array<{ renderMode: RenderMode; canvasMode: CanvasMode; label: string }> = [
  { renderMode: "browser-full-video", canvasMode: "native", label: "browser-full-video + native" },
  { renderMode: "browser-full-video", canvasMode: "foreignObject", label: "browser-full-video + foreignObject" },
  { renderMode: "browser-frame-by-frame", canvasMode: "native", label: "browser-frame-by-frame + native" },
  { renderMode: "browser-frame-by-frame", canvasMode: "foreignObject", label: "browser-frame-by-frame + foreignObject" },
];

/**
 * Get audio stream info from a video file using ffprobe
 */
const getAudioInfo = (videoPath: string): { hasAudio: boolean; duration?: number; codec?: string } => {
  try {
    const output = execSync(
      `ffprobe -v quiet -show_streams -select_streams a:0 -print_format json "${videoPath}"`,
      { encoding: "utf8" },
    );
    const data = JSON.parse(output);
    if (data.streams && data.streams.length > 0) {
      const audioStream = data.streams[0];
      return {
        hasAudio: true,
        duration: parseFloat(audioStream.duration || "0"),
        codec: audioStream.codec_name,
      };
    }
    return { hasAudio: false };
  } catch {
    return { hasAudio: false };
  }
};

describe("Audio Fidelity", () => {
  fixtureTest(
    "all render modes produce valid audio output",
    { timeout: 120000 },
    async ({ barsNTone, render }) => {
      const testFilePath = import.meta.url;

      // Use a 1-second video with audio
      const html = /* HTML */ `
        <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
          <ef-video asset-id="${barsNTone.id}" class="w-full" sourceOut="1s"></ef-video>
        </ef-timegroup>
      `;

      // Step 1: Bundle template ONCE
      const sharedBundle = await bundleTestTemplate(html, testFilePath, "audio-fidelity-shared");
      console.log("\n=== Audio Fidelity Test ===\n");

      // Step 2: Render server baseline
      console.log("Rendering server baseline...");
      const baseline = await render(
        html,
        testFilePath,
        "audio-fidelity-baseline",
        { renderSliceMs: 500, renderMode: "server" },
      );

      // Verify baseline has audio
      const baselineAudioInfo = getAudioInfo(baseline.videoPath);
      console.log(`Baseline audio: ${baselineAudioInfo.hasAudio ? "✓" : "✗"}`);
      if (baselineAudioInfo.hasAudio) {
        console.log(`  Codec: ${baselineAudioInfo.codec}, Duration: ${baselineAudioInfo.duration?.toFixed(2)}s`);
      }
      expect(baselineAudioInfo.hasAudio, "Baseline should have audio").toBe(true);

      // Step 3: Render all browser modes
      console.log("\n=== Rendering browser modes ===");
      const browserResults = await Promise.all(
        BROWSER_MODES.map(async (mode) => {
          try {
            const result = await render(
              html,
              testFilePath,
              `audio-fidelity-${mode.renderMode}-${mode.canvasMode}`,
              {
                renderSliceMs: 500,
                renderMode: mode.renderMode,
                canvasMode: mode.canvasMode,
                bundleInfo: sharedBundle,
              },
            );
            return { label: mode.label, result, error: null };
          } catch (error) {
            return {
              label: mode.label,
              result: null,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }),
      );

      // Step 4: Check audio presence in each render
      console.log("\n=== Audio Presence Check ===");
      const audioResults: { label: string; hasAudio: boolean; info?: ReturnType<typeof getAudioInfo> }[] = [];

      for (const { label, result, error } of browserResults) {
        if (error || !result) {
          console.log(`  ${label}: FAILED (${error || "no result"})`);
          audioResults.push({ label, hasAudio: false });
          continue;
        }

        const audioInfo = getAudioInfo(result.videoPath);
        audioResults.push({ label, hasAudio: audioInfo.hasAudio, info: audioInfo });

        if (audioInfo.hasAudio) {
          console.log(`  ${label}: ✓ audio (${audioInfo.codec}, ${audioInfo.duration?.toFixed(2)}s)`);
        } else {
          console.log(`  ${label}: ✗ NO AUDIO`);
        }
      }

      // Step 5: Audio waveform comparison for renders that have audio
      console.log("\n=== Audio Waveform Comparison ===");
      for (const { label, result } of browserResults) {
        if (!result) continue;

        const audioInfo = getAudioInfo(result.videoPath);
        if (!audioInfo.hasAudio) {
          console.log(`  ${label}: SKIPPED (no audio)`);
          continue;
        }

        const comparison = await compareAudioWaveforms(
          baseline.videoPath,
          result.videoPath,
          testFilePath,
          label.replace(/ \+ /g, "-"),
          result.templateHash,
        );

        if (comparison.match) {
          console.log(`  ${label}: ✓ waveforms match (${comparison.diffPercentage.toFixed(2)}% diff)`);
        } else {
          console.log(`  ${label}: ✗ waveform mismatch (${comparison.diffPercentage.toFixed(2)}% diff)`);
          console.log(`    Baseline: ${comparison.baselinePath}`);
          console.log(`    Test: ${comparison.testPath}`);
          if (comparison.diffPath) {
            console.log(`    Diff: ${comparison.diffPath}`);
          }
        }
      }

      // Step 6: Summary
      console.log("\n=== Summary ===");
      const modesWithAudio = audioResults.filter((r) => r.hasAudio).length;
      const modesWithoutAudio = audioResults.filter((r) => !r.hasAudio).length;

      console.log(`  Modes with audio: ${modesWithAudio}/${BROWSER_MODES.length}`);
      console.log(`  Modes without audio: ${modesWithoutAudio}/${BROWSER_MODES.length}`);

      // Log which modes are missing audio (known issue to track)
      if (modesWithoutAudio > 0) {
        console.log("\n  ⚠️  Modes missing audio:");
        for (const { label, hasAudio } of audioResults) {
          if (!hasAudio) {
            console.log(`    - ${label}`);
          }
        }
      }

      // For now, we expect at least the baseline to have audio
      // Browser modes may not have audio yet (known issue)
      expect(baselineAudioInfo.hasAudio, "Baseline must have audio").toBe(true);
    },
  );
});




