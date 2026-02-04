// Integration tests - use smoke tests for fast feedback
import { describe, test, expect, beforeAll } from "vitest";
import { render } from "../../utils/render";
import { validateMP4 } from "../../utils/video-validator";
import { processTestVideoAsset } from "../../../test-utils/processTestAssets";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";

describe("ef-audio Element", { timeout: 30000 }, () => {
  let testAgent: Selectable<TestAgent>;
  let cardJoker: Selectable<Video2IsobmffFiles>;
  let barsNTone: Selectable<Video2IsobmffFiles>;

  beforeAll(async () => {
    testAgent = await makeTestAgent("ef-audio-test@example.org");
    cardJoker = await processTestVideoAsset("card-joker.mp3", testAgent);
    barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
  });

  describe("Basic audio playback", () => {
    test("renders audio-only composition", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-audio asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-blue-500 flex items-center justify-center">
            <span class="text-white text-6xl font-bold">Audio Test</span>
          </div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.hasVideoTrack).toBe(true);
      expect(validation.hasAudioTrack).toBe(true);
    });

    test("renders composition with visual content and audio", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1280px] h-[720px]" mode="fixed" duration="1.5s">
          <ef-audio asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <span class="text-white text-5xl font-bold">Music Playing</span>
          </div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(1500, 100);
    });
  });

  describe("Audio with sourceIn/sourceOut", () => {
    test("renders audio with sourceIn", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-audio asset-id="${cardJoker.id}" source-in="0.5s" />
          <div class="w-full h-full bg-green-500"></div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(1000, 100);

      const validation = validateMP4(result.videoPath);
      expect(validation.hasAudioTrack).toBe(true);
    });

    test("renders audio with sourceOut", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-audio asset-id="${cardJoker.id}" source-out="1s" />
          <div class="w-full h-full bg-yellow-500"></div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(1000, 100);
    });

    test("renders audio with both sourceIn and sourceOut", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-audio asset-id="${cardJoker.id}" source-in="0.5s" source-out="1.5s" />
          <div class="w-full h-full bg-red-500"></div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(1000, 100);
    });
  });

  describe("Multiple audio tracks", () => {
    test("renders composition with multiple audio tracks", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-audio asset-id="${cardJoker.id}" />
          <ef-audio asset-id="${cardJoker.id}" source-in="0.5s" />
          <div class="w-full h-full bg-purple-500 flex items-center justify-center">
            <span class="text-white text-6xl font-bold">Layered Audio</span>
          </div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);
    });
  });

  describe("Audio from video source", () => {
    test("renders audio track from video file", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-audio asset-id="${barsNTone.id}" />
          <div class="w-full h-full bg-orange-500 flex items-center justify-center">
            <span class="text-white text-6xl font-bold">Video Audio</span>
          </div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);

      const validation = validateMP4(result.videoPath);
      expect(validation.hasAudioTrack).toBe(true);
    });
  });

  describe("Audio-only output", () => {
    test("renders pure audio composition", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-audio asset-id="${cardJoker.id}" />
          <div class="w-full h-full bg-black"></div>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.hasAudioTrack).toBe(true);
    });
  });

  describe("Audio timing", () => {
    test("renders audio at specific start time within composition", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <ef-timegroup class="w-full h-full" mode="fixed" duration="3s" style="animation-delay: 1s;">
            <ef-audio asset-id="${cardJoker.id}" />
            <div class="w-full h-full bg-teal-500"></div>
          </ef-timegroup>
        </ef-timegroup>
      `, { testAgent });

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(3000, 150);
    });
  });
});
