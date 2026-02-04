// Integration tests - use smoke tests for fast feedback
import { describe, test, expect } from "vitest";
import { render } from "../../utils/render";
import { validateMP4 } from "../../utils/video-validator";

describe("ef-text Element", { timeout: 30000 }, () => {
  describe("Simple text rendering", () => {
    test("renders basic text", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-white flex items-center justify-center">
            <ef-text class="text-black text-4xl">Hello World</ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders multiline text", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-900 flex items-center justify-center">
            <ef-text class="text-white text-3xl text-center">
              Line One<br/>
              Line Two<br/>
              Line Three
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders long text content", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-blue-500 flex items-center justify-center p-16">
            <ef-text class="text-white text-2xl text-center">
              This is a longer text sample to test wrapping and layout behavior in the rendering system.
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Custom fonts", () => {
    test("renders with Google Fonts", async () => {
      const result = await render(`
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-black flex items-center justify-center">
            <ef-text class="text-white text-6xl font-['Inter'] font-bold">
              Inter Font
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);
    });

    test("renders with multiple font weights", async () => {
      const result = await render(`
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700;900&display=swap" rel="stylesheet">
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-white flex flex-col items-center justify-center gap-4">
            <ef-text class="text-black text-4xl font-['Roboto'] font-light">Light</ef-text>
            <ef-text class="text-black text-4xl font-['Roboto'] font-normal">Regular</ef-text>
            <ef-text class="text-black text-4xl font-['Roboto'] font-bold">Bold</ef-text>
            <ef-text class="text-black text-4xl font-['Roboto'] font-black">Black</ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with multiple font families", async () => {
      const result = await render(`
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Open+Sans&display=swap" rel="stylesheet">
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-8">
            <ef-text class="text-gray-900 text-7xl font-['Playfair_Display'] font-bold">
              Heading
            </ef-text>
            <ef-text class="text-gray-700 text-3xl font-['Open_Sans']">
              Body text in a different font
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Text with CSS styling", () => {
    test("renders with colors", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-black flex items-center justify-center gap-8">
            <ef-text class="text-red-500 text-5xl">Red</ef-text>
            <ef-text class="text-blue-500 text-5xl">Blue</ef-text>
            <ef-text class="text-green-500 text-5xl">Green</ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with text shadows", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
            <ef-text 
              class="text-white text-8xl font-bold"
              style="text-shadow: 4px 4px 8px rgba(0,0,0,0.5);"
            >
              SHADOW
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with text stroke", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-yellow-400 flex items-center justify-center">
            <ef-text 
              class="text-9xl font-bold"
              style="-webkit-text-stroke: 3px black; -webkit-text-fill-color: white;"
            >
              STROKE
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with gradient text", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-black flex items-center justify-center">
            <ef-text 
              class="text-9xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"
              style="background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;"
            >
              GRADIENT
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with letter spacing and line height", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-800 flex items-center justify-center p-16">
            <ef-text 
              class="text-white text-5xl text-center"
              style="letter-spacing: 0.5rem; line-height: 2;"
            >
              S P A C E D<br/>
              TEXT
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Text with transforms", () => {
    test("renders rotated text", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-white flex items-center justify-center">
            <ef-text 
              class="text-black text-6xl font-bold"
              style="transform: rotate(-15deg);"
            >
              ROTATED
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders scaled text", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-blue-500 flex items-center justify-center">
            <ef-text 
              class="text-white text-4xl font-bold"
              style="transform: scale(2);"
            >
              BIG
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders skewed text", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
            <ef-text 
              class="text-white text-7xl font-bold"
              style="transform: skewX(-10deg);"
            >
              SKEWED
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Text alignment and positioning", () => {
    test("renders left-aligned text", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-200 flex items-center justify-start p-16">
            <ef-text class="text-black text-4xl text-left">
              Left aligned<br/>text content
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders center-aligned text", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-200 flex items-center justify-center p-16">
            <ef-text class="text-black text-4xl text-center">
              Center aligned<br/>text content
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders right-aligned text", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-200 flex items-center justify-end p-16">
            <ef-text class="text-black text-4xl text-right">
              Right aligned<br/>text content
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders text with absolute positioning", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full relative bg-black">
            <ef-text class="absolute top-8 left-8 text-white text-3xl">Top Left</ef-text>
            <ef-text class="absolute top-8 right-8 text-white text-3xl">Top Right</ef-text>
            <ef-text class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-6xl font-bold">CENTER</ef-text>
            <ef-text class="absolute bottom-8 left-8 text-white text-3xl">Bottom Left</ef-text>
            <ef-text class="absolute bottom-8 right-8 text-white text-3xl">Bottom Right</ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Text with backgrounds and borders", () => {
    test("renders text with background color", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-white flex items-center justify-center">
            <ef-text class="text-white text-5xl font-bold bg-black px-8 py-4">
              BOXED TEXT
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders text with border", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-100 flex items-center justify-center">
            <ef-text class="text-black text-5xl font-bold border-4 border-black px-8 py-4">
              BORDERED
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders text with rounded background", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <ef-text class="text-white text-5xl font-bold bg-black bg-opacity-50 px-12 py-6 rounded-full">
              ROUNDED
            </ef-text>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });
});
