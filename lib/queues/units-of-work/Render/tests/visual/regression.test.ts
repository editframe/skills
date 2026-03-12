// Integration tests - use smoke tests for fast feedback
import { describe, test } from "vitest";
import { render } from "../utils/render";
import { compareToBaseline } from "../utils/visual-diff";

describe("Visual Regression", { timeout: 60000 }, () => {
  describe("Element rendering", () => {
    test("simple text matches baseline", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-black flex items-center justify-center">
            <span class="text-white text-6xl font-bold">Hello World</span>
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "simple-text", {
        threshold: 0.01,
        updateBaseline: process.env.UPDATE_BASELINES === "true",
      });
    });

    test("gradient background matches baseline", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span class="text-white text-8xl font-bold">GRADIENT</span>
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "gradient-background", {
        threshold: 0.05, // Higher tolerance for gradients
      });
    });

    test("multiple elements matches baseline", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-white grid grid-cols-2 grid-rows-2 gap-4 p-4">
            <div class="bg-red-500 flex items-center justify-center">
              <span class="text-white text-4xl">RED</span>
            </div>
            <div class="bg-blue-500 flex items-center justify-center">
              <span class="text-white text-4xl">BLUE</span>
            </div>
            <div class="bg-green-500 flex items-center justify-center">
              <span class="text-white text-4xl">GREEN</span>
            </div>
            <div class="bg-yellow-500 flex items-center justify-center">
              <span class="text-black text-4xl">YELLOW</span>
            </div>
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "multiple-elements");
    });
  });

  describe("CSS Animations", () => {
    test("fade-in animation matches baseline", async () => {
      const result = await render(`
        <style>
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div 
            class="w-full h-full bg-blue-500 flex items-center justify-center"
            style="animation: fade-in 2s backwards;"
          >
            <span class="text-white text-8xl font-bold">FADE IN</span>
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "fade-in-animation", {
        framesPerSecond: 2, // Check 2 frames per second for animation
      });
    });

    test("slide animation matches baseline", async () => {
      const result = await render(`
        <style>
          @keyframes slide-in-left {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div 
            class="w-full h-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center"
            style="animation: slide-in-left 1.5s backwards;"
          >
            <span class="text-white text-8xl font-bold">SLIDE</span>
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "slide-animation", {
        framesPerSecond: 2,
      });
    });
  });

  describe("Complex layouts", () => {
    test("flexbox layout matches baseline", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full flex flex-col justify-between bg-gray-900 p-8">
            <div class="text-white text-5xl">Header</div>
            <div class="text-white text-9xl font-bold text-center">MAIN</div>
            <div class="text-white text-3xl text-right">Footer</div>
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "flexbox-layout");
    });

    test("grid layout matches baseline", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full grid grid-cols-3 grid-rows-3 gap-4 p-4 bg-black">
            ${Array.from(
              { length: 9 },
              (_, i) =>
                `<div class="bg-blue-${((i % 3) + 1) * 300} flex items-center justify-center">
                <span class="text-white text-3xl">${i + 1}</span>
              </div>`,
            ).join("")}
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "grid-layout");
    });

    test("absolute positioning matches baseline", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full relative bg-black">
            <div class="absolute top-0 left-0 w-64 h-64 bg-red-500"></div>
            <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500"></div>
            <div class="absolute bottom-0 left-0 w-64 h-64 bg-green-500"></div>
            <div class="absolute bottom-0 right-0 w-64 h-64 bg-yellow-500"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full"></div>
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "absolute-positioning");
    });
  });

  describe("Typography", () => {
    test("custom fonts match baseline", async () => {
      const result = await render(`
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-white flex items-center justify-center">
            <span class="text-black text-7xl font-['Inter'] font-bold">Inter Font</span>
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "custom-fonts");
    });

    test("text effects match baseline", async () => {
      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
            <span 
              class="text-white text-9xl font-bold"
              style="text-shadow: 4px 4px 8px rgba(0,0,0,0.5);"
            >
              SHADOW
            </span>
          </div>
        </ef-timegroup>
      `);

      await compareToBaseline(result.videoPath, "text-effects");
    });
  });
});
