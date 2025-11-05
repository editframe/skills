import { describe } from "vitest";

import { test } from "./fixtures";

describe("Render to end of source media", async () => {
  test("renders to end of source media", async ({ expect, barsNTone, render }) => {
    const renderPromise = render(/* HTML */`
    <ef-timegroup class="w-[480px] h-[270px]" mode="contain">
      <ef-video asset-id="${barsNTone.id}" class="w-full" sourceIn="9.8s"></ef-video>
    </ef-timegroup>
  `, {}, 'render-to-end-of-source-media');

    await expect(renderPromise).resolves.not.toThrow();
  }, 30000); // Extended timeout for first test that initializes fixtures
});

describe("Short Duration Edge Case Regression", () => {
  test("renders very short duration without concat directive errors", async ({ render, expect }) => {
    // Minimal reproduction: Very short duration that creates invalid concat directive ranges
    // Using 11ms duration to trigger inpoint > outpoint edge case 
    const html = /* html */`
      <ef-timegroup mode="fixed" duration="0.011s" class="w-[480px] h-[270px] bg-[rgb(100, 100, 100)]">
        <div class="w-full h-full bg-red-500"></div>
      </ef-timegroup>
    `;

    // This should not throw due to invalid concat directive
    // Before fix: Error opening input file - Invalid data found when processing input
    await expect(render(html, { renderSliceMs: 500 }, 'short-duration-11ms')).resolves.not.toThrow();
  }, 30_000);

  test("renders borderline audio frame duration without errors", async ({ render, expect }) => {
    // Test exactly at the audio frame boundary (~21.33ms)
    const html = /* html */`
      <ef-timegroup mode="fixed" duration="0.501s" class="w-[480px] h-[270px] bg-[rgb(100, 100, 100)]">
        <div class="w-full h-full bg-blue-500"></div>  
      </ef-timegroup>
    `;

    await expect(render(html, { renderSliceMs: 500 }, 'borderline-audio-frame-501ms')).resolves.not.toThrow();
  });

  test("renders slightly below audio frame duration without errors", async ({ render, expect }) => {
    // Test just below one audio frame duration
    const html = /* html */`
      <ef-timegroup mode="fixed" duration="0.02s" class="w-[480px] h-[270px] bg-[rgb(100, 100, 100)]">
        <div class="w-full h-full bg-green-500"></div>
      </ef-timegroup>
    `;

    await expect(render(html, { renderSliceMs: 500 }, 'below-audio-frame-20ms')).resolves.not.toThrow();
  });
});

