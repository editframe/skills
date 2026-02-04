import { describe, test, expect } from "vitest";
import { render } from "../../utils/render";
import { validateMP4, testPlayback } from "../../utils/video-validator";

describe("ef-timegroup Element", { timeout: 30000 }, () => {
  describe("mode='fixed' with duration", () => {
    test("renders with explicit duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-blue-500 flex items-center justify-center">
            <span class="text-white text-4xl">Fixed Duration Test</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.durationMs).toBeCloseTo(2000, 100);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
      expect(validation.hasVideoTrack).toBe(true);
    });

    test("renders with millisecond duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1280px] h-[720px]" mode="fixed" duration="500ms">
          <div class="w-full h-full bg-green-500"></div>
        </ef-timegroup>
      `);

      expect(result.durationMs).toBeCloseTo(500, 50);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
    });

    test("renders with fractional second duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[640px] h-[480px]" mode="fixed" duration="1.5s">
          <div class="w-full h-full bg-red-500"></div>
        </ef-timegroup>
      `);

      expect(result.durationMs).toBeCloseTo(1500, 100);
    });
  });

  describe("mode='contain' (fit to content)", () => {
    test("fits to fixed duration content", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="contain">
          <ef-timegroup class="w-full h-full" mode="fixed" duration="1.5s">
            <div class="w-full h-full bg-purple-500"></div>
          </ef-timegroup>
        </ef-timegroup>
      `);

      // Should match the child's duration
      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(1500, 100);
    });
  });

  describe("Nested timegroups", () => {
    test("renders nested timegroups", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <ef-timegroup class="w-full h-1/2" mode="fixed" duration="3s">
            <div class="w-full h-full bg-blue-500"></div>
          </ef-timegroup>
          <ef-timegroup class="w-full h-1/2" mode="fixed" duration="3s">
            <div class="w-full h-full bg-red-500"></div>
          </ef-timegroup>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(3000, 200);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    test("renders deeply nested timegroups", async () => {
      const result = await render(`
        <ef-timegroup class="w-[800px] h-[600px]" mode="fixed" duration="2s">
          <ef-timegroup class="w-full h-full" mode="fixed" duration="2s">
            <ef-timegroup class="w-full h-full" mode="fixed" duration="2s">
              <div class="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
            </ef-timegroup>
          </ef-timegroup>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);
    });
  });

  describe("Width and height validation", () => {
    test("respects explicit width and height", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1280px] h-[720px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-yellow-500"></div>
        </ef-timegroup>
      `);

      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
    });

    test("handles square dimensions", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1080px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-pink-500"></div>
        </ef-timegroup>
      `);

      expect(result.width).toBe(1080);
      expect(result.height).toBe(1080);
    });

    test("handles portrait dimensions", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1080px] h-[1920px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-indigo-500"></div>
        </ef-timegroup>
      `);

      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });
  });

  describe("Playback validation", () => {
    test("produces playable video", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-teal-500 flex items-center justify-center">
            <span class="text-white text-6xl font-bold">Playback Test</span>
          </div>
        </ef-timegroup>
      `);

      const playback = testPlayback(result.videoPath);
      expect(playback.canPlay).toBe(true);
      expect(playback.duration).toBeCloseTo(2.0, 0.2);
    });
  });

  describe("Complex styling", () => {
    test("renders with flexbox layout", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full flex flex-col justify-between bg-gray-900 p-8">
            <div class="text-white text-5xl">Header</div>
            <div class="text-white text-9xl font-bold text-center">MAIN</div>
            <div class="text-white text-3xl text-right">Footer</div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);
    });

    test("renders with grid layout", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full grid grid-cols-2 grid-rows-2 gap-4 p-4 bg-black">
            <div class="bg-red-500"></div>
            <div class="bg-blue-500"></div>
            <div class="bg-green-500"></div>
            <div class="bg-yellow-500"></div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with absolute positioning", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full relative bg-black">
            <div class="absolute top-0 left-0 w-64 h-64 bg-red-500"></div>
            <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500"></div>
            <div class="absolute bottom-0 left-0 w-64 h-64 bg-green-500"></div>
            <div class="absolute bottom-0 right-0 w-64 h-64 bg-yellow-500"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full"></div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });
});
