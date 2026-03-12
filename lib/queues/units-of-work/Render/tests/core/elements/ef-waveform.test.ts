// Integration tests - use smoke tests for fast feedback
import { describe, test, expect, beforeAll } from "vitest";
import { render } from "../../utils/render";
import { validateMP4 } from "../../utils/video-validator";
import { processTestVideoAsset } from "../../../test-utils/processTestAssets";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";

describe("ef-waveform Element", { timeout: 30000 }, () => {
  let testAgent: Selectable<TestAgent>;
  let cardJoker: Selectable<Video2IsobmffFiles>;

  beforeAll(async () => {
    testAgent = await makeTestAgent("ef-waveform-test@example.org");
    cardJoker = await processTestVideoAsset("card-joker.mp3", testAgent);
  });

  describe("Basic waveform visualization", () => {
    test("renders waveform for audio element", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-audio id="my-audio" asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-black flex items-center justify-center">
            <ef-waveform 
              target="my-audio" 
              class="w-3/4 h-1/3"
              style="--waveform-color: #3b82f6;"
            />
          </div>
        </ef-timegroup>
      `,
        { testAgent },
      );

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
    });

    test("renders waveform with specific dimensions", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[1280px] h-[720px]" mode="fixed" duration="1.5s">
          <ef-audio id="audio-track" asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-gray-900 flex items-center justify-center p-8">
            <ef-waveform 
              target="audio-track" 
              class="w-full h-48"
              style="--waveform-color: #10b981;"
            />
          </div>
        </ef-timegroup>
      `,
        { testAgent },
      );

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Waveform styling", () => {
    test("renders waveform with custom color", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-audio id="music" asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-purple-900 flex items-center justify-center p-16">
            <ef-waveform 
              target="music" 
              class="w-full h-64"
              style="--waveform-color: #ec4899;"
            />
          </div>
        </ef-timegroup>
      `,
        { testAgent },
      );

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders waveform with background", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-audio id="sound" asset-id="${cardJoker.id}" />
          <div class="w-full h-full flex items-center justify-center p-8">
            <div class="w-full bg-white bg-opacity-10 rounded-lg p-8">
              <ef-waveform 
                target="sound" 
                class="w-full h-32"
                style="--waveform-color: white;"
              />
            </div>
          </div>
        </ef-timegroup>
      `,
        { testAgent },
      );

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Waveform with sourceIn/sourceOut", () => {
    test("renders waveform for trimmed audio", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-audio id="trimmed-audio" asset-id="${cardJoker.id}" source-out="1s" />
          <div class="w-full h-full bg-indigo-900 flex items-center justify-center p-16">
            <ef-waveform 
              target="trimmed-audio" 
              class="w-full h-48"
              style="--waveform-color: #fbbf24;"
            />
          </div>
        </ef-timegroup>
      `,
        { testAgent },
      );

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(1000, 100);
    });
  });

  describe("Waveform positioning", () => {
    test("renders waveform at top of frame", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1.5s">
          <ef-audio id="top-audio" asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-gradient-to-b from-blue-900 to-purple-900 flex flex-col">
            <div class="p-8">
              <ef-waveform 
                target="top-audio" 
                class="w-full h-24"
                style="--waveform-color: white;"
              />
            </div>
            <div class="flex-1 flex items-center justify-center">
              <span class="text-white text-6xl font-bold">Now Playing</span>
            </div>
          </div>
        </ef-timegroup>
      `,
        { testAgent },
      );

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders waveform at bottom of frame", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1.5s">
          <ef-audio id="bottom-audio" asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-gray-900 flex flex-col">
            <div class="flex-1 flex items-center justify-center">
              <span class="text-white text-6xl font-bold">Audio Visualizer</span>
            </div>
            <div class="p-8">
              <ef-waveform 
                target="bottom-audio" 
                class="w-full h-32"
                style="--waveform-color: #06b6d4;"
              />
            </div>
          </div>
        </ef-timegroup>
      `,
        { testAgent },
      );

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Multiple waveforms", () => {
    test("renders multiple waveforms for same audio", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-audio id="multi-viz" asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-black flex flex-col justify-center gap-8 p-16">
            <ef-waveform 
              target="multi-viz" 
              class="w-full h-24"
              style="--waveform-color: #ef4444;"
            />
            <ef-waveform 
              target="multi-viz" 
              class="w-full h-24"
              style="--waveform-color: #3b82f6;"
            />
            <ef-waveform 
              target="multi-viz" 
              class="w-full h-24"
              style="--waveform-color: #10b981;"
            />
          </div>
        </ef-timegroup>
      `,
        { testAgent },
      );

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Waveform with text overlay", () => {
    test("renders waveform with title and text", async () => {
      const result = await render(
        `
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-audio id="titled-audio" asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-gradient-to-br from-pink-900 to-orange-900 flex flex-col items-center justify-center gap-8 p-16">
            <span class="text-white text-7xl font-bold">Card Joker</span>
            <div class="w-3/4">
              <ef-waveform 
                target="titled-audio" 
                class="w-full h-40"
                style="--waveform-color: white;"
              />
            </div>
            <span class="text-white text-3xl opacity-75">Audio Visualization</span>
          </div>
        </ef-timegroup>
      `,
        { testAgent },
      );

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);
    });
  });
});
