import { describe, test as baseTest } from "vitest";
import type { Selectable } from "kysely";

import {
  performVisualRegressionTest,
  extractFrameCountFromBuffer,
  extractFrameAtTime,
  analyzeBarsPattern,
  type RenderOutput,
  renderWithElectronRPCAndScripts,
  ElectronRenderOptionsInput,
} from "./test-utils";
import { makeTestAgent, type TestAgent } from "TEST/util/test";
import { createElectronRPC, type ElectronRPC } from "./ElectronRPCClient";

const test = baseTest.extend<{
  electronRPC: ElectronRPC;
  testAgent: Selectable<TestAgent>;
  animejsRenderOutput: RenderOutput;
}>({
  electronRPC: [
    async ({}, use) => {
      const electronRPC = await createElectronRPC();
      await use(electronRPC);
      await electronRPC.rpc.call("terminate");
    },
    { scope: "worker" },
  ],

  testAgent: [
    async ({}, use) => {
      const testAgent = await makeTestAgent("animejs-render-test@example.org");
      await use(testAgent);
    },
    { scope: "worker" },
  ],

  animejsRenderOutput: [
    async ({ electronRPC, testAgent }, use) => {
      const themeColor = "#4F46E5";
      const text1 = "Editframe ❤️ AnimeJS";
      const text3 = "HELLO WAAPI";
      const suzukaPath =
        "M189.142857,4 C227.456875,4 248.420457,4.00974888 256.864191,4.00974888 C263.817211,4.00974888 271.61219,3.69583517 274.986231,6.63061513 C276.382736,7.84531176 279.193529,11.3814152 280.479499,13.4815847 C281.719344,15.5064248 284.841964,20.3571626 275.608629,20.3571626 C265.817756,20.3571626 247.262478,19.9013915 243.955117,19.9013915 C239.27946,19.9013915 235.350655,24.7304885 228.6344,24.7304885 C224.377263,24.7304885 219.472178,21.0304113 214.535324,21.0304113 C207.18393,21.0304113 200.882842,30.4798911 194.124187,30.4798911 C186.992968,30.4798911 182.652552,23.6245972 173.457298,23.6245972 C164.83277,23.6245972 157.191045,31.5424105 157.191045,39.1815359 C157.191045,48.466779 167.088672,63.6623005 166.666679,66.9065088 C166.378668,69.1206889 155.842137,79.2568633 151.508744,77.8570506 C145.044576,75.7689355 109.126667,61.6405346 98.7556561,52.9785141 C96.4766876,51.0750861 89.3680347,39.5769094 83.4195005,38.5221785 C80.6048001,38.0231057 73.0179337,38.7426555 74.4158694,42.6956376 C76.7088819,49.1796531 86.3280337,64.1214904 87.1781062,66.9065088 C88.191957,70.2280995 86.4690152,77.0567847 82.2060607,79.2503488 C79.2489435,80.7719756 73.1324132,82.8858479 64.7015706,83.0708761 C55.1604808,83.2802705 44.4254811,80.401884 39.1722168,80.401884 C25.7762119,80.401884 24.3280517,89.1260466 22.476679,94.4501705 C21.637667,96.8629767 20.4337535,108 33.2301959,108 C37.8976087,108 45.0757044,107.252595 53.4789069,103.876424 C61.8821095,100.500252 122.090049,78.119656 128.36127,75.3523302 C141.413669,69.5926477 151.190142,68.4987755 147.018529,52.0784879 C143.007818,36.291544 143.396957,23.4057975 145.221196,19.6589263 C146.450194,17.1346449 148.420955,14.8552817 153.206723,15.7880203 C155.175319,16.1716965 155.097637,15.0525421 156.757598,11.3860986 C158.417558,7.71965506 161.842736,4.00974888 167.736963,4.00974888 C177.205308,4.00974888 184.938832,4 189.142857,4 Z";

      const html = /* HTML */ `
        <ef-timegroup mode="sequence" class="w-[500px] h-[500px]">
          <!-- Section 1: SplitText + Stagger -->
          <ef-timegroup id="section1-timegroup" mode="fixed" duration="2s" loop autoplay class="w-full h-full">
            <div id="section1" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: ${themeColor}; color: white;">
              <h2 id="section1-text" class="text-4xl font-bold">${text1}</h2>
            </div>
          </ef-timegroup>

          <!-- Section 2: Timeline with shapes -->
          <ef-timegroup id="section2-timegroup" mode="fixed" duration="2.5s" loop autoplay class="w-full h-full">
            <div id="section2" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: flex-start; padding-left: 4rem; background-color: ${themeColor}; color: white;">
              <div class="flex flex-col gap-4 items-center">
                <div class="triangle" style="width: 0; height: 0; border-left: 2rem solid transparent; border-right: 2rem solid transparent; border-bottom: 3.5rem solid #93c5fd;"></div>
                <div class="square" style="width: 4rem; height: 4rem; background: #93c5fd;"></div>
                <div class="circle" style="width: 4rem; height: 4rem; background: #93c5fd; border-radius: 50%;"></div>
              </div>
            </div>
          </ef-timegroup>

          <!-- Section 3: WAAPI Demo -->
          <ef-timegroup id="section3-timegroup" mode="fixed" duration="2.4s" loop autoplay class="w-full h-full">
            <div id="section3" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: ${themeColor}; color: white;">
              <h2 id="section3-text" class="text-4xl font-bold">${text3}</h2>
            </div>
          </ef-timegroup>

          <!-- Section 4: SVG Motion Path -->
          <ef-timegroup id="section4-timegroup" mode="fixed" duration="5s" loop autoplay class="w-full h-full">
            <div id="section4" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: ${themeColor}; color: white;">
              <div class="relative" style="width: 304px; height: 112px;">
                <svg id="motion-path" viewBox="0 0 304 112" width="304" height="112">
                  <title>Suzuka</title>
                  <g stroke="none" fill="none" fill-rule="evenodd">
                    <path d="${suzukaPath}" stroke="currentColor" stroke-width="2" opacity="0.35"></path>
                    <path d="${suzukaPath}" id="suzuka" stroke="currentColor" stroke-width="2"></path>
                  </g>
                </svg>
                <div class="absolute top-0 left-0 w-full h-full pointer-events-none">
                  <div class="car absolute w-4 h-2 bg-blue-100 rounded" style="margin-left: -8px; margin-top: -4px; transform-origin: 50% 50%;"></div>
                </div>
              </div>
            </div>
          </ef-timegroup>
        </ef-timegroup>
      `;

      const scriptFile = /* TS */ `
        import { animate, splitText, stagger, createTimeline, waapi, svg } from "animejs";

        await customElements.whenDefined('ef-timegroup');

        // Section 1: SplitText + Stagger
        const section1Timegroup = document.querySelector('#section1-timegroup');
        const section1H2 = document.querySelector('#section1-text');
        if (section1Timegroup && section1H2) {
          section1Timegroup.clearFrameTasks?.();
          const { chars } = splitText(section1H2, { words: false, chars: true });
          const textAnimation = animate(chars, {
            y: [
              { to: "-2.75rem", ease: "outExpo", duration: 600 },
              { to: 0, ease: "outBounce", duration: 800, delay: 100 },
            ],
            rotate: {
              from: "-1turn",
              delay: 0,
            },
            delay: stagger(50),
            ease: "inOutCirc",
            autoplay: false,
          });
          const currentTime = section1Timegroup.ownCurrentTimeMs || 0;
          textAnimation.currentTime = currentTime;
          section1Timegroup.addFrameTask(({ ownCurrentTimeMs }) => {
            textAnimation.currentTime = ownCurrentTimeMs;
          });
        }

        // Section 2: Timeline with shapes
        const section2Timegroup = document.querySelector('#section2-timegroup');
        const section2Container = document.querySelector('#section2');
        if (section2Timegroup && section2Container) {
          section2Timegroup.clearFrameTasks?.();
          const square = section2Container.querySelector('.square');
          const circle = section2Container.querySelector('.circle');
          const triangle = section2Container.querySelector('.triangle');
          if (square && circle && triangle) {
            const timeline = createTimeline({
              defaults: { duration: 750 },
              autoplay: false,
            });
            timeline
              .label("start")
              .add(square, { x: "15rem" }, 500)
              .add(circle, { x: "15rem" }, "start")
              .add(triangle, { x: "15rem", rotate: "1turn" }, "<-=500");
            const currentTime = section2Timegroup.ownCurrentTimeMs || 0;
            timeline.currentTime = currentTime;
            section2Timegroup.addFrameTask(({ ownCurrentTimeMs }) => {
              timeline.currentTime = ownCurrentTimeMs;
            });
          }
        }

        // Section 3: WAAPI
        const section3Timegroup = document.querySelector('#section3-timegroup');
        const section3H2 = document.querySelector('#section3-text');
        if (section3Timegroup && section3H2) {
          section3Timegroup.clearFrameTasks?.();
          const { chars } = splitText(section3H2, { words: false, chars: true });
          const waapiAnimation = waapi.animate(chars, {
            translate: "0 -2rem",
            delay: stagger(100),
            duration: 600,
            alternate: true,
            loop: true,
            ease: "inOut(2)",
            autoplay: false,
          });
          const currentTime = section3Timegroup.ownCurrentTimeMs || 0;
          waapiAnimation.currentTime = currentTime;
          section3Timegroup.addFrameTask(({ ownCurrentTimeMs }) => {
            waapiAnimation.currentTime = ownCurrentTimeMs;
          });
        }

        // Section 4: SVG Motion Path
        const section4Timegroup = document.querySelector('#section4-timegroup');
        const section4Container = document.querySelector('#section4');
        if (section4Timegroup && section4Container) {
          section4Timegroup.clearFrameTasks?.();
          const car = section4Container.querySelector('.car');
          const suzukaPathEl = document.querySelector('#suzuka');
          if (car && suzukaPathEl) {
            const carAnimation = animate(car, {
              ease: "linear",
              duration: 5000,
              autoplay: false,
              ...svg.createMotionPath(suzukaPathEl),
            });
            const lineAnimation = animate(svg.createDrawable(suzukaPathEl), {
              draw: "0 1",
              ease: "linear",
              duration: 5000,
              autoplay: false,
            });
            const currentTime = section4Timegroup.ownCurrentTimeMs || 0;
            carAnimation.currentTime = currentTime;
            lineAnimation.currentTime = currentTime;
            section4Timegroup.addFrameTask(({ ownCurrentTimeMs }) => {
              carAnimation.currentTime = ownCurrentTimeMs;
              lineAnimation.currentTime = ownCurrentTimeMs;
            });
          }
        }
      `;

      const animejsRenderOutput = await renderWithElectronRPCAndScripts({
        html,
        scriptFiles: {
          "animejs-setup.ts": scriptFile,
        },
        testAgent,
        electronRpc: electronRPC,
        renderOptions: { renderSliceMs: 2000 },
        testTitle: "animejs-all-examples",
      });
      await use(animejsRenderOutput);
    },
    { scope: "worker" },
  ],
});

describe("AnimeJS Integration", () => {
  test("renders AnimeJS template with correct dimensions and duration", ({
    animejsRenderOutput,
    expect,
  }) => {
    const { renderInfo, finalVideoBuffer } = animejsRenderOutput;

    expect(renderInfo.width).toBe(500);
    expect(renderInfo.height).toBe(500);
    // Total duration should be sum of all sections: 2s + 2.5s + 2.4s + 5s = 11.9s
    expect(renderInfo.durationMs).toBeCloseTo(11900, 100);

    const expectedFrameCount = Math.ceil((renderInfo.durationMs / 1000) * 30);
    const actualFrameCount = extractFrameCountFromBuffer(finalVideoBuffer);

    expect(actualFrameCount).toBeGreaterThan(0);
    const tolerance = 6;
    expect(actualFrameCount).toBeGreaterThanOrEqual(
      expectedFrameCount - tolerance,
    );
    expect(actualFrameCount).toBeLessThanOrEqual(
      expectedFrameCount + tolerance,
    );
  }, 30000);

  test("passes visual regression test for AnimeJS animations", async ({
    animejsRenderOutput,
  }) => {
    const { videoPath, templateHash, testTitle } = animejsRenderOutput;
    await performVisualRegressionTest(videoPath, templateHash, testTitle);
  });

  test("validates animation content at key timepoints", async ({
    animejsRenderOutput,
    expect,
  }) => {
    const { videoPath, templateHash } = animejsRenderOutput;

    // Section 1 runs from 0s to 2s
    const frameAt1s = await extractFrameAtTime(videoPath, 1.0, templateHash);
    // Section 2 runs from 2s to 4.5s
    const frameAt3s = await extractFrameAtTime(videoPath, 3.0, templateHash);
    // Section 3 runs from 4.5s to 6.9s
    const frameAt5s = await extractFrameAtTime(videoPath, 5.0, templateHash);
    // Section 4 runs from 6.9s to 11.9s
    const frameAt9s = await extractFrameAtTime(videoPath, 9.0, templateHash);

    const analysis1s = analyzeBarsPattern(frameAt1s);
    const analysis3s = analyzeBarsPattern(frameAt3s);
    const analysis5s = analyzeBarsPattern(frameAt5s);
    const analysis9s = analyzeBarsPattern(frameAt9s);

    expect(analysis1s.brightness).toBeGreaterThan(0.1);
    expect(analysis3s.brightness).toBeGreaterThan(0.1);
    expect(analysis5s.brightness).toBeGreaterThan(0.1);
    expect(analysis9s.brightness).toBeGreaterThan(0.1);
  });
});
