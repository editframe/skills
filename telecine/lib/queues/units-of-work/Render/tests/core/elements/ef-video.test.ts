// Integration tests - use smoke tests for fast feedback
import { describe, test, expect, beforeAll } from "vitest";
import { render } from "../../utils/render";
import { validateMP4 } from "../../utils/video-validator";
import { processTestVideoAsset } from "../../../test-utils/processTestAssets";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";

describe("ef-video Element", { timeout: 30000 }, () => {
  let testAgent: Selectable<TestAgent>;
  let barsNTone: Selectable<Video2IsobmffFiles>;

  beforeAll(async () => {
    testAgent = await makeTestAgent("ef-video-test@example.org");
    barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
  });

  describe("Basic video playback", () => {
    test("renders video element", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-video asset-id="${barsNTone.id}" class="w-full h-full object-cover"></ef-video>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.hasVideoTrack).toBe(true);
    });

    test("renders video with specific dimensions", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1280px] h-[720px]" mode="fixed" duration="1s">
          <ef-video asset-id="${barsNTone.id}" class="w-full h-full object-cover" />
        </ef-timegroup>
      `, { testAgent });

      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Video with sourceIn/sourceOut", () => {
    test("renders video with sourceIn", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-video 
            asset-id="${barsNTone.id}" 
            source-in="1s"
            class="w-full h-full object-cover" 
          />
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(1000, 100);
    });

    test("renders video with sourceOut", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-video 
            asset-id="${barsNTone.id}" 
            source-out="1s"
            class="w-full h-full object-cover" 
          />
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(1000, 100);
    });

    test("renders video with both sourceIn and sourceOut", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-video 
            asset-id="${barsNTone.id}" 
            source-in="0.5s"
            source-out="1.5s"
            class="w-full h-full object-cover" 
          />
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(1000, 100);
    });
  });

  describe("Video with transforms", () => {
    test("renders scaled video", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full flex items-center justify-center bg-black">
            <ef-video 
              asset-id="${barsNTone.id}" 
              class="w-1/2 h-1/2 object-cover"
              style="transform: scale(1.5);"
            />
          </div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders rotated video", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full flex items-center justify-center bg-gray-900">
            <ef-video 
              asset-id="${barsNTone.id}" 
              class="w-1/2 h-1/2 object-cover"
              style="transform: rotate(15deg);"
            />
          </div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Video object-fit modes", () => {
    test("renders with object-cover", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-video 
            asset-id="${barsNTone.id}" 
            class="w-full h-full object-cover"
          />
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with object-contain", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-black flex items-center justify-center">
            <ef-video 
              asset-id="${barsNTone.id}" 
              class="w-full h-full object-contain"
            />
          </div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Multiple videos", () => {
    test("renders multiple videos simultaneously", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full grid grid-cols-2 gap-4 p-4 bg-black">
            <ef-video 
              asset-id="${barsNTone.id}" 
              class="w-full h-full object-cover"
            />
            <ef-video 
              asset-id="${barsNTone.id}" 
              source-in="1s"
              class="w-full h-full object-cover"
            />
          </div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);
    });
  });

  describe("Video with effects", () => {
    test("renders video with opacity", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-white">
            <ef-video 
              asset-id="${barsNTone.id}" 
              class="w-full h-full object-cover"
              style="opacity: 0.7;"
            />
          </div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders video with CSS filters", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-video 
            asset-id="${barsNTone.id}" 
            class="w-full h-full object-cover"
            style="filter: brightness(1.2) contrast(1.1);"
          />
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });
});
