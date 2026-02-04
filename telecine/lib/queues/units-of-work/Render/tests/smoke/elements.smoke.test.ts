import { describe, test, expect, beforeAll } from "vitest";
import { render } from "../utils/render";
import { validateMP4 } from "../utils/video-validator";
import { processTestVideoAsset } from "../../test-utils/processTestAssets";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";
import type { Video2IsobmffFiles } from "@/sql-client.server/kysely-codegen";

describe("Elements Smoke Tests", { timeout: 60000 }, () => {
  let testAgent: Selectable<TestAgent>;
  let barsNTone: Selectable<Video2IsobmffFiles>;

  beforeAll(async () => {
    testAgent = await makeTestAgent("elements-smoke@example.org");
    barsNTone = await processTestVideoAsset("bars-n-tone.mp4", testAgent);
  });
  test("ef-timegroup renders", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-blue-500"></div>
      </ef-timegroup>
    `,
      { testName: "elements-smoke-ef-timegroup" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("ef-image renders", async () => {
    // 2x2 checkerboard pattern (red, green, blue, yellow pixels)
    const checkerboard =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVQIW2P8z8DwHwMM/GfABuA4AABMMQP/l/6YgQAAAABJRU5ErkJggg==";

    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <ef-image src="${checkerboard}" class="w-full h-full" style="image-rendering: pixelated;" />
      </ef-timegroup>
    `,
      { testName: "elements-smoke-ef-image" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("ef-text renders", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-white flex items-center justify-center">
          <ef-text class="text-black text-4xl">Hello</ef-text>
        </div>
      </ef-timegroup>
    `,
      { testName: "elements-smoke-ef-text" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("nested ef-timegroups render", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <ef-timegroup class="w-full h-full" mode="fixed" duration="100ms">
          <div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
        </ef-timegroup>
      </ef-timegroup>
    `,
      { testName: "elements-smoke-nested-timegroups" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("multiple elements render together", async () => {
    // 2x2 checkerboard pattern
    const checkerboard =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVQIW2P8z8DwHwMM/GfABuA4AABMMQP/l/6YgQAAAABJRU5ErkJggg==";

    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-gray-900 flex items-center justify-center gap-4">
          <ef-image src="${checkerboard}" class="w-24 h-24" style="image-rendering: pixelated;" />
          <ef-text class="text-white text-4xl">Hello</ef-text>
        </div>
      </ef-timegroup>
    `,
      { testName: "elements-smoke-multiple-elements" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("ef-video renders and seeks through frames", async () => {
    // Render 200ms to get ~6 frames, ensuring we see the video playing through multiple frames
    const result = await render(
      `
      <ef-timegroup class="w-[480px] h-[270px]" mode="fixed" duration="200ms">
        <ef-video asset-id="${barsNTone.id}" class="w-full"></ef-video>
      </ef-timegroup>
    `,
      { testAgent, testName: "elements-smoke-ef-video" },
    );

    expect(result.durationMs).toBeCloseTo(200, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoPath);
    expect(validation.isValid).toBe(true);
    expect(validation.hasVideoTrack).toBe(true);
  });

  test("ef-audio renders", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <ef-audio asset-id="${barsNTone.id}"></ef-audio>
        <div class="w-full h-full bg-green-500 flex items-center justify-center">
          <div class="text-white text-2xl">Audio Test</div>
        </div>
      </ef-timegroup>
    `,
      { testAgent, testName: "elements-smoke-ef-audio" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoPath);
    expect(validation.isValid).toBe(true);
    expect(validation.hasAudioTrack).toBe(true);
  });

  test("ef-waveform renders", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <ef-audio asset-id="${barsNTone.id}" id="test-audio"></ef-audio>
        <ef-waveform target="test-audio" mode="bars" class="color-blue-500 bg-white w-full h-full"></ef-waveform>
      </ef-timegroup>
    `,
      { testAgent, testName: "elements-smoke-ef-waveform" },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoPath);
    expect(validation.isValid).toBe(true);
    expect(validation.hasVideoTrack).toBe(true);
    expect(validation.hasAudioTrack).toBe(true);
  });
});
