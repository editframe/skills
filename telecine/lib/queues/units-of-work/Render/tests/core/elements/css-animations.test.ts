import { describe, test, expect } from "vitest";
import { render } from "../../utils/render";
import { validateMP4 } from "../../utils/video-validator";

describe("CSS Animations with fill-mode", () => {
  describe("Fade animations", () => {
    test("fade-in with backwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-blue-500 flex items-center justify-center"
            style="animation: fade-in 1s backwards;"
          >
            <span class="text-white text-6xl font-bold">FADE IN</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("fade-out with forwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-red-500 flex items-center justify-center"
            style="animation: fade-out 1s 500ms forwards;"
          >
            <span class="text-white text-6xl font-bold">FADE OUT</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);
    });

    test("fade-in-out with both fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div 
            class="w-full h-full bg-purple-500 flex items-center justify-center"
            style="animation: fade-in 1s backwards, fade-out 1s 2s forwards;"
          >
            <span class="text-white text-6xl font-bold">FADE BOTH</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(3000, 100);
    });

    test("delayed fade-in requires backwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div 
            class="w-full h-full bg-green-500 flex items-center justify-center"
            style="animation: fade-in 1s 1s backwards;"
          >
            <span class="text-white text-6xl font-bold">DELAYED FADE</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(3000, 200);
    });
  });

  describe("Slide animations", () => {
    test("slide-in-left with backwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes slide-in-left {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center"
            style="animation: slide-in-left 800ms backwards;"
          >
            <span class="text-white text-6xl font-bold">SLIDE LEFT</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("slide-in-right with backwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes slide-in-right {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center"
            style="animation: slide-in-right 800ms backwards;"
          >
            <span class="text-white text-6xl font-bold">SLIDE RIGHT</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("slide-in-top with backwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes slide-in-top {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-gradient-to-b from-cyan-500 to-blue-500 flex items-center justify-center"
            style="animation: slide-in-top 800ms backwards;"
          >
            <span class="text-white text-6xl font-bold">SLIDE TOP</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("slide-out-right with forwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes slide-out-right {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-red-500 flex items-center justify-center"
            style="animation: slide-out-right 500ms 1s forwards;"
          >
            <span class="text-white text-6xl font-bold">SLIDE OUT</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Scale/Zoom animations", () => {
    test("zoom-in with backwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes zoom-in {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-black flex items-center justify-center"
            style="animation: zoom-in 600ms backwards;"
          >
            <span class="text-white text-9xl font-bold">ZOOM</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("zoom-out with forwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes zoom-out {
            from { transform: scale(1); opacity: 1; }
            to { transform: scale(3); opacity: 0; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"
            style="animation: zoom-out 1s 500ms forwards;"
          >
            <span class="text-white text-8xl font-bold">EXPLODE</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("scale-bounce with both fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes scale-bounce {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-yellow-400 flex items-center justify-center"
            style="animation: scale-bounce 800ms both;"
          >
            <span class="text-black text-8xl font-bold">BOUNCE</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Sequential/Staggered animations", () => {
    test("sequential fade-in elements with backwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="4s">
          <div class="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-8">
            <div class="text-white text-5xl" style="animation: fade-in 500ms 0ms backwards;">First</div>
            <div class="text-white text-5xl" style="animation: fade-in 500ms 500ms backwards;">Second</div>
            <div class="text-white text-5xl" style="animation: fade-in 500ms 1000ms backwards;">Third</div>
            <div class="text-white text-5xl" style="animation: fade-in 500ms 1500ms backwards;">Fourth</div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(4000, 200);
    });

    test("staggered slide-in elements", async () => {
      const result = await render(`
        <style>
          @keyframes slide-in-left {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div class="w-full h-full bg-blue-900 flex flex-col items-start justify-center gap-4 p-16">
            <div class="text-white text-4xl w-full bg-blue-700 p-4" style="animation: slide-in-left 400ms 0ms backwards;">Item 1</div>
            <div class="text-white text-4xl w-full bg-blue-700 p-4" style="animation: slide-in-left 400ms 200ms backwards;">Item 2</div>
            <div class="text-white text-4xl w-full bg-blue-700 p-4" style="animation: slide-in-left 400ms 400ms backwards;">Item 3</div>
            <div class="text-white text-4xl w-full bg-blue-700 p-4" style="animation: slide-in-left 400ms 600ms backwards;">Item 4</div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Rotation animations", () => {
    test("rotate-in with backwards fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes rotate-in {
            from { transform: rotate(-180deg) scale(0); opacity: 0; }
            to { transform: rotate(0deg) scale(1); opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div 
            class="w-full h-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center"
            style="animation: rotate-in 1s backwards;"
          >
            <span class="text-white text-8xl font-bold">SPIN</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("continuous rotation", async () => {
      const result = await render(`
        <style>
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div class="w-full h-full bg-purple-900 flex items-center justify-center">
            <div 
              class="w-96 h-96 bg-white rounded-lg flex items-center justify-center"
              style="animation: rotate 2s linear infinite;"
            >
              <span class="text-black text-4xl font-bold">ROTATE</span>
            </div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Combined animations", () => {
    test("combined entrance and exit animations", async () => {
      const result = await render(`
        <style>
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fade-out {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes slide-in-left {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="5s">
          <div 
            class="w-full h-full bg-gradient-to-r from-teal-500 to-blue-500 flex items-center justify-center"
            style="animation: fade-in 1s backwards, slide-in-left 800ms backwards, fade-out 1s 4s forwards;"
          >
            <span class="text-white text-7xl font-bold">COMBO</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(5000, 200);
    });

    test("layered animations with different timings", async () => {
      const result = await render(`
        <style>
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes zoom-in {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div class="w-full h-full bg-black flex items-center justify-center">
            <div style="animation: fade-in 1s backwards, zoom-in 800ms 200ms backwards;">
              <span class="text-white text-9xl font-bold">LAYERED</span>
            </div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Complex keyframe animations", () => {
    test("multi-stage animation with both fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes complex-sequence {
            0% { transform: scale(0) rotate(0deg); opacity: 0; }
            25% { transform: scale(1.2) rotate(90deg); opacity: 1; }
            50% { transform: scale(1) rotate(180deg); opacity: 1; }
            75% { transform: scale(1.2) rotate(270deg); opacity: 1; }
            100% { transform: scale(1) rotate(360deg); opacity: 1; }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div 
            class="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center"
            style="animation: complex-sequence 2s both;"
          >
            <span class="text-white text-8xl font-bold">COMPLEX</span>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("bounce animation with both fill-mode", async () => {
      const result = await render(`
        <style>
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateY(-20%); }
            20%, 40%, 60%, 80% { transform: translateY(0); }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div class="w-full h-full bg-green-500 flex items-center justify-center">
            <div 
              class="text-white text-9xl font-bold"
              style="animation: bounce 2s 500ms both;"
            >
              BOUNCE
            </div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Flicker prevention", () => {
    test("no flash with proper backwards fill-mode on delayed animation", async () => {
      const result = await render(`
        <style>
          @keyframes appear {
            from { opacity: 0; transform: scale(0); }
            to { opacity: 1; transform: scale(1); }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div class="w-full h-full bg-white flex items-center justify-center">
            <div 
              class="text-black text-8xl font-bold"
              style="animation: appear 1s 1.5s backwards;"
            >
              NO FLASH
            </div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      // Element should be invisible for first 1.5s, then appear
      // This test validates the animation runs without throwing errors
    });

    test("no reappearance with proper forwards fill-mode on exit", async () => {
      const result = await render(`
        <style>
          @keyframes disappear {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0; transform: scale(0); }
          }
        </style>
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="3s">
          <div class="w-full h-full bg-black flex items-center justify-center">
            <div 
              class="text-white text-8xl font-bold"
              style="animation: disappear 1s 1.5s forwards;"
            >
              STAYS GONE
            </div>
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      // Element should disappear and stay hidden
      // This test validates the animation runs without throwing errors
    });
  });
});
