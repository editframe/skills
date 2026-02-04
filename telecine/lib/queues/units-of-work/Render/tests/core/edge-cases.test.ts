import { describe, test, expect } from "vitest";
import { render } from "../utils/render";
import { validateMP4 } from "../utils/video-validator";

describe("Edge Cases", () => {
  describe("Very short durations", () => {
    test("renders 20ms duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="20ms">
          <div class="w-full h-full bg-red-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeCloseTo(20, 20);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders 11ms duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="11ms">
          <div class="w-full h-full bg-blue-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      // Very short duration might be rounded to minimum frame duration
      expect(result.durationMs).toBeGreaterThan(0);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders 50ms duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="50ms">
          <div class="w-full h-full bg-green-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeCloseTo(50, 30);
    });

    test("renders 100ms duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="100ms">
          <div class="w-full h-full bg-yellow-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeCloseTo(100, 30);

      const validation = validateMP4(result.videoPath);
      expect(validation.isValid).toBe(true);
    });
  });

  describe("Audio frame boundary durations", () => {
    test("renders borderline audio frame duration (501ms)", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="501ms">
          <div class="w-full h-full bg-purple-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeCloseTo(501, 50);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders exactly 500ms (common audio frame boundary)", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="500ms">
          <div class="w-full h-full bg-orange-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeCloseTo(500, 50);
    });
  });

  describe("Long durations", () => {
    test("renders 30s duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="30s">
          <div class="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(30000, 500);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    }, 60000); // Extended timeout for long render

    test("renders 60s duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="60s">
          <div class="w-full h-full bg-gradient-to-br from-pink-500 to-orange-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(60000, 1000);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    }, 120000); // Extended timeout for long render
  });

  describe("Empty or minimal content", () => {
    test("renders empty timegroup", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders solid color only", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-black"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders single pixel", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-1 h-1 bg-white"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });
  });

  describe("Extreme dimensions", () => {
    test("renders very small dimensions (100x100)", async () => {
      const result = await render(`
        <ef-timegroup class="w-[100px] h-[100px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-red-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders large dimensions (3840x2160 4K)", async () => {
      const result = await render(`
        <ef-timegroup class="w-[3840px] h-[2160px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-blue-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.width).toBe(3840);
      expect(result.height).toBe(2160);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    }, 30000); // Extended timeout for 4K render
  });

  describe("Complex nested structures", () => {
    test("handles deeply nested timegroups", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-timegroup class="w-full h-full" mode="fixed" duration="2s">
            <ef-timegroup class="w-full h-full" mode="fixed" duration="2s">
              <ef-timegroup class="w-full h-full" mode="fixed" duration="2s">
                <ef-timegroup class="w-full h-full" mode="fixed" duration="2s">
                  <div class="w-full h-full bg-purple-500"></div>
                </ef-timegroup>
              </ef-timegroup>
            </ef-timegroup>
          </ef-timegroup>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("handles many child elements", async () => {
      const children = Array.from({ length: 100 }, (_, i) => 
        `<div class="text-white text-sm">Item ${i}</div>`
      ).join('');

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-black flex flex-wrap p-4 gap-2">
            ${children}
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });
  });

  describe("Special characters and Unicode", () => {
    test("renders emoji content", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-white flex items-center justify-center">
            <span class="text-9xl">🎬 🎥 📹 🎞️</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders international characters", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-4">
            <div class="text-black text-4xl">Hello 世界</div>
            <div class="text-black text-4xl">Привет мир</div>
            <div class="text-black text-4xl">مرحبا بالعالم</div>
            <div class="text-black text-4xl">こんにちは世界</div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders special HTML entities", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-black flex items-center justify-center">
            <span class="text-white text-5xl">&lt; &gt; &amp; &quot; &#39; © ® ™</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });
  });

  describe("Fractional and decimal durations", () => {
    test("renders 1.5s duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1.5s">
          <div class="w-full h-full bg-teal-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeCloseTo(1500, 100);
    });

    test("renders 0.333s duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="0.333s">
          <div class="w-full h-full bg-indigo-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThan(0);
    });

    test("renders 2.7s duration", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2.7s">
          <div class="w-full h-full bg-pink-500"></div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeCloseTo(2700, 100);
    });
  });
});
