import { describe, test, expect } from "vitest";
import { render } from "../utils/render";
import { validateMP4 } from "../utils/video-validator";

describe("Elements Smoke Tests", { timeout: 30000 }, () => {
  test("ef-timegroup renders", async () => {
    const result = await render(`
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-blue-500"></div>
      </ef-timegroup>
    `);

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("ef-image renders", async () => {
    const redPixel =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    const result = await render(`
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <ef-image src="${redPixel}" class="w-full h-full object-cover" />
      </ef-timegroup>
    `);

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("ef-text renders", async () => {
    const result = await render(`
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-white flex items-center justify-center">
          <ef-text class="text-black text-4xl">Hello</ef-text>
        </div>
      </ef-timegroup>
    `);

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("nested ef-timegroups render", async () => {
    const result = await render(`
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <ef-timegroup class="w-full h-full" mode="fixed" duration="100ms">
          <div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
        </ef-timegroup>
      </ef-timegroup>
    `);

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("multiple elements render together", async () => {
    const redPixel =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

    const result = await render(`
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-gray-900 flex items-center justify-center gap-4">
          <ef-image src="${redPixel}" class="w-24 h-24 object-cover" />
          <ef-text class="text-white text-4xl">Hello</ef-text>
        </div>
      </ef-timegroup>
    `);

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });
});
