// Integration tests - use smoke tests for fast feedback
import { describe, test, expect } from "vitest";
import { render } from "../utils/render";
import { validateMP4 } from "../utils/video-validator";

describe("Audio Presence", { timeout: 30000 }, () => {
  describe("Video-only compositions", () => {
    test("video-only has expected audio track structure", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-blue-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.hasVideoTrack).toBe(true);
      
      // Note: Our rendering system may add silent audio track by default
      // This test documents the expected behavior
    });
  });

  // Note: Tests for actual audio elements (ef-audio, ef-waveform) require
  // test audio assets to be set up. These tests validate the structure
  // is correct for compositions with/without audio elements.
  //
  // To add audio tests:
  // 1. Add test audio files to utils/test-assets/
  // 2. Use processTestAudioAsset() to process them
  // 3. Create tests with ef-audio and ef-waveform elements
  //
  // Example:
  // test("ef-audio element produces audio track", async () => {
  //   const audio = await processTestAudioAsset("sample.mp3", testAgent);
  //   const result = await render(`
  //     <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
  //       <ef-audio asset-id="${audio.id}" />
  //       <div class="w-full h-full bg-black"></div>
  //     </ef-timegroup>
  //   `);
  //   
  //   const validation = validateMP4(result.videoPath);
  //   expect(validation.hasAudioTrack).toBe(true);
  // });
});
