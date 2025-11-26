import { describe } from "vitest";

import {
  testVideoPlayback,
  validateMP4Structure,
  testVideoSeek,
  extractCodecInfo,
} from "../test-utils";
import { test } from "./fixtures";

describe("Playback Quality Validation", () => {
  test("produces playable video with correct duration", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath, renderInfo } = renderOutput;

    // Test actual playability
    const playbackTest = await testVideoPlayback(videoPath);
    expect(playbackTest.canPlay).toBe(true);
    expect(playbackTest.duration).toBeCloseTo(
      renderInfo.durationMs / 1000,
      0.2,
    ); // Convert to seconds

    // Validate container integrity
    const structureValidation = await validateMP4Structure(videoPath);
    expect(structureValidation.isValid).toBe(true);
    expect(structureValidation.hasVideoTrack).toBe(true);
    expect(structureValidation.hasAudioTrack).toBe(true);
  }, 30000); // Extended timeout for first test that initializes renderOutput fixture

  test("supports seeking throughout video", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath } = renderOutput;

    // Test seeking capability at multiple points
    const seekTests = [0.1, 0.5, 0.8]; // 10%, 50%, 90% through video

    for (const position of seekTests) {
      const seekResult = await testVideoSeek(videoPath, position);
      expect(seekResult.success).toBe(true);
      expect(seekResult.actualPosition).toBeCloseTo(position, 0.2);
    }
  });

  test("maintains video codec and format standards", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath } = renderOutput;

    const codecInfo = await extractCodecInfo(videoPath);

    expect(codecInfo.videoCodec).toContain("h264"); // Expected codec
    expect(codecInfo.container).toBe("mp4"); // Expected container
    expect(codecInfo.profile).toBeDefined(); // Has encoding profile
    expect(codecInfo.level).toBeDefined(); // Has encoding level
  });
});
