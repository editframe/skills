import { describe, test, expect } from "vitest";
import { render } from "../utils/render";
import { validateMP4 } from "../utils/video-validator";

describe("Core Smoke Tests", { timeout: 30000 }, () => {
  test("produces valid MP4 structure", async () => {
    const result = await render(`
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-blue-500 flex items-center justify-center">
          <span class="text-white text-4xl font-bold">Test</span>
        </div>
      </ef-timegroup>
    `);

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.videoBuffer.length).toBeGreaterThan(1000);
    expect(result.width).toBe(640);
    expect(result.height).toBe(360);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("renders with custom dimensions", async () => {
    const result = await render(`
      <ef-timegroup class="w-[1280px] h-[720px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-red-500"></div>
      </ef-timegroup>
    `);

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });

  test("renders with custom fps", async () => {
    const result = await render(
      `
      <ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="100ms">
        <div class="w-full h-full bg-green-500"></div>
      </ef-timegroup>
    `,
      { fps: 60 },
    );

    expect(result.durationMs).toBeCloseTo(100, 20);
    expect(result.fps).toBe(60);

    const validation = validateMP4(result.videoBuffer);
    expect(validation.isValid).toBe(true);
  });
});
