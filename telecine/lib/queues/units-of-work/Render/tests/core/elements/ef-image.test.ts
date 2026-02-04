// Integration tests - use smoke tests for fast feedback
import { describe, test, expect } from "vitest";
import { render } from "../../utils/render";
import { validateMP4 } from "../../utils/video-validator";

describe("ef-image Element", { timeout: 30000 }, () => {
  describe("Static image display", () => {
    test("renders static image with data URL", async () => {
      // 1x1 red pixel as data URL
      const redPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <ef-image src="${redPixel}" class="w-full h-full object-cover" />
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);

      const validation = validateMP4(result.videoBuffer);
      expect(validation.isValid).toBe(true);
    });

    test("renders image with specific dimensions", async () => {
      const bluePixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-image src="${bluePixel}" class="w-[800px] h-[600px] object-contain" />
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Image with transforms", () => {
    test("renders scaled image", async () => {
      const greenPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-image 
            src="${greenPixel}" 
            class="w-64 h-64 object-cover"
            style="transform: scale(2);"
          />
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders rotated image", async () => {
      const yellowPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full flex items-center justify-center bg-black">
            <ef-image 
              src="${yellowPixel}" 
              class="w-64 h-64 object-cover"
              style="transform: rotate(45deg);"
            />
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders translated image", async () => {
      const cyanPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP88J/hPwAJqwJ/dlUOvgAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-image 
            src="${cyanPixel}" 
            class="w-64 h-64 object-cover absolute top-0 left-0"
            style="transform: translate(200px, 150px);"
          />
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with multiple transforms", async () => {
      const magentaPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5/hPgAGhAJ/zdNJRwAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full flex items-center justify-center bg-gray-900">
            <ef-image 
              src="${magentaPixel}" 
              class="w-64 h-64 object-cover"
              style="transform: scale(1.5) rotate(30deg) translate(50px, 50px);"
            />
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Multiple images", () => {
    test("renders multiple images simultaneously", async () => {
      const redPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
      const bluePixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";
      const greenPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="2s">
          <div class="w-full h-full grid grid-cols-3 gap-4 p-4 bg-black">
            <ef-image src="${redPixel}" class="w-full h-full object-cover" />
            <ef-image src="${bluePixel}" class="w-full h-full object-cover" />
            <ef-image src="${greenPixel}" class="w-full h-full object-cover" />
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
      expect(result.durationMs).toBeCloseTo(2000, 100);
    });

    test("renders overlapping images with z-index", async () => {
      const redPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
      const bluePixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full relative bg-black">
            <ef-image 
              src="${redPixel}" 
              class="absolute top-1/4 left-1/4 w-1/2 h-1/2 object-cover"
              style="z-index: 1;"
            />
            <ef-image 
              src="${bluePixel}" 
              class="absolute top-1/3 left-1/3 w-1/2 h-1/2 object-cover"
              style="z-index: 2;"
            />
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Image object-fit modes", () => {
    test("renders with object-cover", async () => {
      const whitePixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-image src="${whitePixel}" class="w-full h-full object-cover" />
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with object-contain", async () => {
      const whitePixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-800 flex items-center justify-center">
            <ef-image src="${whitePixel}" class="w-full h-full object-contain" />
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with object-fill", async () => {
      const whitePixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-image src="${whitePixel}" class="w-full h-full object-fill" />
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("Image with filters and effects", () => {
    test("renders with CSS filters", async () => {
      const grayPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+fAQAB9gH+cV/EQAAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <ef-image 
            src="${grayPixel}" 
            class="w-full h-full object-cover"
            style="filter: blur(10px) brightness(1.5) contrast(1.2);"
          />
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with opacity", async () => {
      const redPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-white">
            <ef-image 
              src="${redPixel}" 
              class="w-full h-full object-cover"
              style="opacity: 0.5;"
            />
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });

    test("renders with border radius", async () => {
      const purplePixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5/hPwAGhAJ/zdNJRwAAAABJRU5ErkJggg==";

      const result = await render(`
        <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
          <div class="w-full h-full bg-gray-900 flex items-center justify-center p-16">
            <ef-image 
              src="${purplePixel}" 
              class="w-96 h-96 object-cover rounded-full"
            />
          </div>
        </ef-timegroup>
      `);

      expect(result.videoBuffer.length).toBeGreaterThan(1000);
    });
  });
});
