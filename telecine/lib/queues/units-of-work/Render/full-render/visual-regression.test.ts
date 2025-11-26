import { describe } from "vitest";

import {
  performVisualRegressionTest,
  extractFrameCountFromBuffer,
  extractFrameAtTime,
  analyzeBarsPattern,
  testVideoPlayback,
  validateMP4Structure,
} from "../test-utils";
import { test } from "./fixtures";

describe("Visual Content Regression", () => {
  test("maintains visual consistency with expected frame count", ({
    expect,
    renderOutput,
  }) => {
    const { finalVideoBuffer, renderInfo } = renderOutput;

    // Frame count validation using inline FFprobe calls
    const expectedFrameCount = Math.ceil((renderInfo.durationMs / 1000) * 30); // 30fps
    const actualFrameCount = extractFrameCountFromBuffer(finalVideoBuffer);

    // Allow for reasonable variance since we have segmented video with padding
    expect(actualFrameCount).toBeGreaterThan(0);
    if (actualFrameCount > 0) {
      // Allow for larger tolerance since segmented video can have padding frames
      // 60 frames for ~2 seconds is reasonable (2.0 seconds at 30fps)
      // Use range check instead of toBeCloseTo for integer frame counts
      const tolerance = 6; // ±6 frames tolerance
      expect(actualFrameCount).toBeGreaterThanOrEqual(
        expectedFrameCount - tolerance,
      );
      expect(actualFrameCount).toBeLessThanOrEqual(
        expectedFrameCount + tolerance,
      );
    }
    expect(renderInfo.durationMs).toBeCloseTo(2000, 100); // ~2 seconds
  }, 30000); // Extended timeout for first test that initializes renderOutput fixture

  test("passes pixel perfect visual regression test against baseline", async ({
    renderOutput,
  }) => {
    const { videoPath, templateHash, testTitle } = renderOutput;

    // Perform visual regression test using simplified single function
    // Function will throw on failure, pass on success
    await performVisualRegressionTest(videoPath, templateHash, testTitle);
  });

  test("renders bars pattern in video frames", async ({
    renderOutput,
    expect,
  }) => {
    const { videoPath, templateHash } = renderOutput;

    // Extract specific frames and validate bars pattern
    const midFrameData = await extractFrameAtTime(videoPath, 0.5, templateHash); // Middle frame
    const frameAnalysis = analyzeBarsPattern(midFrameData);

    expect(frameAnalysis.hasBarsPattern).toBe(true);
    expect(frameAnalysis.colorRegions).toBeGreaterThanOrEqual(5); // Multiple color regions
    expect(frameAnalysis.brightness).toBeGreaterThan(0.3); // Not black frame
  });

  test("maintains expected video dimensions", ({ renderOutput, expect }) => {
    const { renderInfo } = renderOutput;

    expect(renderInfo.width).toBe(480); // From template class="w-[480px]"
    expect(renderInfo.height).toBe(270); // From template class="h-[270px]"
    expect(renderInfo.width / renderInfo.height).toBeCloseTo(16 / 9, 0.1); // Aspect ratio
  });

  test("renders video-only asset without audio track", async ({
    videoOnlyRenderOutput,
    expect,
  }) => {
    const { videoPath, finalVideoBuffer, renderInfo } = videoOnlyRenderOutput;

    expect(finalVideoBuffer.length).toBeGreaterThan(0);
    expect(renderInfo.width).toBe(480);
    expect(renderInfo.height).toBe(270);

    const playbackTest = await testVideoPlayback(videoPath);
    expect(playbackTest.canPlay).toBe(true);
    expect(playbackTest.duration).toBeCloseTo(
      renderInfo.durationMs / 1000,
      0.2,
    );

    const structureValidation = await validateMP4Structure(videoPath);
    expect(structureValidation.isValid).toBe(true);
    // Our outputs always have an audio track, even if it's empty
    expect(structureValidation.hasVideoTrack).toBe(true);
    expect(structureValidation.hasAudioTrack).toBe(true);
  });
});

describe("Complex SVG Filter and Remote Video Rendering", () => {
  test("renders remote video with SVG filter and custom fonts", async ({
    complexFilterRenderOutput,
    expect,
  }) => {
    const { finalVideoBuffer, renderInfo, videoPath } =
      complexFilterRenderOutput;

    expect(finalVideoBuffer.length).toBeGreaterThan(0);
    expect(renderInfo.width).toBe(1080);
    expect(renderInfo.height).toBe(1920);
    expect(renderInfo.durationMs).toBeCloseTo(5000, 100);

    const playbackTest = await testVideoPlayback(videoPath);
    expect(playbackTest.canPlay).toBe(true);
    expect(playbackTest.duration).toBeCloseTo(5.0, 0.2);

    const structureValidation = await validateMP4Structure(videoPath);
    expect(structureValidation.isValid).toBe(true);
    expect(structureValidation.hasVideoTrack).toBe(true);
    expect(structureValidation.hasAudioTrack).toBe(true);
  }, 30000);

  test("passes visual regression test for SVG filtered text", async ({
    complexFilterRenderOutput,
  }) => {
    const { videoPath, templateHash, testTitle } = complexFilterRenderOutput;

    await performVisualRegressionTest(videoPath, templateHash, testTitle);
  }, 10000);

  test("maintains expected portrait dimensions", ({
    complexFilterRenderOutput,
    expect,
  }) => {
    const { renderInfo } = complexFilterRenderOutput;

    expect(renderInfo.width).toBe(1080);
    expect(renderInfo.height).toBe(1920);
    expect(renderInfo.height / renderInfo.width).toBeCloseTo(16 / 9, 0.1);
  });
});
