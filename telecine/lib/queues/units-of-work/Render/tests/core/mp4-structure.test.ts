import { describe, test, expect } from "vitest";
import { render } from "../utils/render";
import {
  validateMP4,
  validateFragmentedMP4,
  validateDurationMetadata,
} from "../utils/video-validator";

describe("MP4 Structure Validation", () => {
  describe("Basic MP4 structure", () => {
    test("produces valid MP4 with required boxes", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-blue-500 flex items-center justify-center">
            <span class="text-white text-6xl font-bold">MP4 Test</span>
          </div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoBuffer);

      expect(validation.isValid).toBe(true);
      expect(validation.hasVideoTrack).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Basic structure checks
      expect(validation.width).toBe(1920);
      expect(validation.height).toBe(1080);
      expect(validation.duration).toBeCloseTo(2.0, 0.2);
      expect(validation.codec).toBe("h264");
    });

    test("produces valid MP4 from buffer validation", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-red-500"></div>
        </ef-timegroup>
      `);

      // Test buffer validation
      const bufferValidation = validateMP4(result.videoBuffer);
      expect(bufferValidation.isValid).toBe(true);

      // Test path validation
      const pathValidation = validateMP4(result.videoPath);
      expect(pathValidation.isValid).toBe(true);
      expect(pathValidation.hasVideoTrack).toBe(true);
    });
  });

  describe("Fragmented MP4 structure", () => {
    test("produces fragmented MP4 with mvex box", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-green-500"></div>
        </ef-timegroup>
      `);

      const fragValidation = validateFragmentedMP4(result.videoPath);

      expect(fragValidation.isFragmented).toBe(true);
      expect(fragValidation.hasInitSegment).toBe(true);
      expect(fragValidation.sequenceCount).toBeGreaterThan(0);
      expect(fragValidation.errors).toHaveLength(0);
    });

    test("produces correct number of fragments", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-purple-500"></div>
        </ef-timegroup>
      `);

      const fragValidation = validateFragmentedMP4(result.videoPath);

      // Should have at least one fragment
      expect(fragValidation.sequenceCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Duration metadata consistency", () => {
    test("maintains consistent duration metadata", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-yellow-500"></div>
        </ef-timegroup>
      `);

      const durationValidation = validateDurationMetadata(result.videoPath);

      expect(durationValidation.isConsistent).toBe(true);
      expect(durationValidation.movieDuration).toBeCloseTo(2.0, 0.1);
      expect(durationValidation.ffprobeDuration).toBeCloseTo(2.0, 0.1);
      expect(durationValidation.difference).toBeLessThan(0.1);
      expect(durationValidation.errors).toHaveLength(0);
    });

    test("duration metadata matches render info", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div class="w-full h-full bg-orange-500"></div>
        </ef-timegroup>
      `);

      const durationValidation = validateDurationMetadata(result.videoPath);
      const expectedDuration = result.durationMs / 1000;

      expect(durationValidation.movieDuration).toBeCloseTo(
        expectedDuration,
        0.1,
      );
      expect(durationValidation.ffprobeDuration).toBeCloseTo(
        expectedDuration,
        0.1,
      );
    });
  });

  describe("Video codec and properties", () => {
    test("uses H.264 codec", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-pink-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);

      expect(validation.codec).toBe("h264");
    });

    test("produces correct framerate", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-cyan-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);

      expect(validation.fps).toBeCloseTo(30, 1); // Default 30fps
    });

    test("maintains exact dimensions", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1280px] h-[720px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-teal-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);

      expect(validation.width).toBe(1280);
      expect(validation.height).toBe(720);
    });
  });

  describe("Multiple durations", () => {
    test("handles short duration (500ms)", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="500ms">
          <div class="w-full h-full bg-blue-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.duration).toBeCloseTo(0.5, 0.1);

      const fragValidation = validateFragmentedMP4(result.videoPath);
      expect(fragValidation.isFragmented).toBe(true);
    });

    test("handles medium duration (5s)", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="5s">
          <div class="w-full h-full bg-green-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.duration).toBeCloseTo(5.0, 0.2);

      const durationValidation = validateDurationMetadata(result.videoPath);
      expect(durationValidation.isConsistent).toBe(true);
    });

    test("handles longer duration (10s)", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="10s">
          <div class="w-full h-full bg-red-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.duration).toBeCloseTo(10.0, 0.3);
    });
  });

  describe("Various resolutions", () => {
    test("handles HD 720p", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1280px] h-[720px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-blue-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.width).toBe(1280);
      expect(validation.height).toBe(720);
    });

    test("handles Full HD 1080p", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-green-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.width).toBe(1920);
      expect(validation.height).toBe(1080);
    });

    test("handles square format", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1080px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-purple-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.width).toBe(1080);
      expect(validation.height).toBe(1080);
    });

    test("handles portrait format", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1080px] h-[1920px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-orange-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.width).toBe(1080);
      expect(validation.height).toBe(1920);
    });

    test("handles custom resolution", async () => {
      const result = await render(`
        <ef-timegroup class="w-[800px] h-[600px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-pink-500"></div>
        </ef-timegroup>
      `);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.width).toBe(800);
      expect(validation.height).toBe(600);
    });
  });
});
