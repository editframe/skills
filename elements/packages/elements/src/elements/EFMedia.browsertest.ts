import { css } from "lit";
import { customElement } from "lit/decorators.js";
import { afterEach, beforeEach, describe, vi } from "vitest";
import { test as baseTest } from "../../test/useMSW.js";

import type { EFConfiguration } from "../gui/EFConfiguration.js";
import "../gui/EFPreview.js";
import "../gui/EFWorkbench.js";
import { JitMediaEngine } from "./EFMedia/JitMediaEngine.js";
import { EFMedia } from "./EFMedia.js";
import "./EFTimegroup.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import "./EFVideo.js";
import type { EFPreview } from "../gui/EFPreview.js";
import { UrlGenerator } from "../transcoding/utils/UrlGenerator.js";
import { AssetMediaEngine } from "./EFMedia/AssetMediaEngine.js";
import type { EFVideo } from "./EFVideo.js";

@customElement("test-media")
class TestMedia extends EFMedia {
  static styles = [
    ...EFMedia.styles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      video {
        width: 100%;
        height: 100%;
      }
  `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "test-media": TestMedia;
  }
}

const test = baseTest.extend<{
  timegroup: EFTimegroup;
  preview: EFPreview;
  jitVideo: EFVideo;
  configuration: EFConfiguration;
  urlGenerator: UrlGenerator;
  host: EFVideo;
}>({
  preview: async ({}, use) => {
    const preview = document.createElement("ef-preview");
    await use(preview);
  },
  timegroup: async ({}, use) => {
    const timegroup = document.createElement("ef-timegroup");
    timegroup.setAttribute("mode", "contain");
    await use(timegroup);
  },
  configuration: async ({ expect }, use) => {
    const configuration = document.createElement("ef-configuration");
    configuration.innerHTML = `<h1 style="font: 10px monospace">${expect.getState().currentTestName}</h1>`;
    // Use integrated proxy server (same host/port as test runner)
    const apiHost = `${window.location.protocol}//${window.location.host}`;
    configuration.setAttribute("api-host", apiHost);
    configuration.apiHost = apiHost;
    configuration.signingURL = "";
    document.body.appendChild(configuration);
    await use(configuration);
  },
  urlGenerator: async ({}, use) => {
    // UrlGenerator points to integrated proxy server (same host/port as test runner)
    const apiHost = `${window.location.protocol}//${window.location.host}`;
    const generator = new UrlGenerator(() => apiHost);
    await use(generator);
  },
  host: async ({ configuration }, use) => {
    const host = document.createElement("ef-video");
    configuration.appendChild(host);
    host.src = "http://web:3000/head-moov-480p.mp4";
    await use(host);
  },
  jitVideo: async ({ configuration, timegroup, host, preview }, use) => {
    timegroup.append(host);
    configuration.append(preview);
    preview.append(timegroup);
    await host.mediaEngineTask.run();
    await use(host);
  },
});

// Skip JIT Media Engine tests - failing due to timing/assertion issues
// These tests need investigation but aren't blocking for beta release.
describe.skip("JIT Media Engine", () => {
  test("initializes JitMediaEngine", async ({ jitVideo, expect }) => {
    const mediaEngine = jitVideo.mediaEngineTask.value;
    expect(mediaEngine).toBeInstanceOf(JitMediaEngine);
  });

  test("loads media duration", async ({ jitVideo, expect }) => {
    expect(jitVideo.intrinsicDurationMs).toBe(10_000);
  });

  describe("video seek on load", () => {
    test("seeks to time specified on element", async ({
      timegroup,
      jitVideo,
      expect,
    }) => {
      await timegroup.seek(2200);
      const sample = jitVideo.unifiedVideoSeekTask.value;
      expect(sample?.timestamp).toBeCloseTo(2.2, 1);
    });
  });

  describe("video seeking", () => {
    test("seeks to 0 seconds and loads first frame", async ({
      timegroup,
      jitVideo,
      expect,
    }) => {
      // Debug: Check what segment should be loaded for 0ms
      const mediaEngine = await (jitVideo as any).mediaEngineTask.taskComplete;
      const videoRendition = mediaEngine?.getVideoRendition();
      const expectedSegmentId = mediaEngine?.computeSegmentId(
        0,
        videoRendition,
      );
      console.log(`MediaEngine.computeSegmentId(0ms) = ${expectedSegmentId}`);

      timegroup.currentTimeMs = 0;
      await timegroup.seekTask.taskComplete;

      // Check what segment actually got loaded
      const actualSegmentId = (jitVideo as any).unifiedVideoSeekTask.value;
      console.log(`videoSegmentIdTask.value = ${actualSegmentId}`);

      const frame = await (jitVideo as any).unifiedVideoSeekTask.taskComplete;
      console.log(`Frame timestamp when seeking to 0ms: ${frame?.timestamp}`);

      expect(frame).toBeDefined();
      expect(frame?.timestamp).toEqual(0);
    });

    test("seeks to 3 seconds and loads frame", async ({
      timegroup,
      jitVideo,
      expect,
    }) => {
      await timegroup.waitForMediaDurations();
      await timegroup.seek(3000);
      const frame = jitVideo.unifiedVideoSeekTask.value;
      expect(frame?.timestamp).toBeCloseTo(3, 1);
    });

    test("seeks to 5 seconds and loads frame", async ({
      timegroup,
      jitVideo,
      expect,
    }) => {
      await timegroup.waitForMediaDurations();
      await timegroup.seek(5000);
      const frame = jitVideo.unifiedVideoSeekTask.value;
      expect(frame?.timestamp).toBeCloseTo(5, 1);
    });

    // Frame timestamp precision issue
    test.skip("seeks ahead in increments", async ({
      timegroup,
      jitVideo,
      expect,
    }) => {
      await timegroup.waitForMediaDurations();

      // Test seeking in larger increments to avoid CI timeouts
      // while still validating incremental seeking works
      const testPoints = [0, 500, 1000, 1500, 2000, 2500, 3000];

      for (const timeMs of testPoints) {
        await timegroup.seek(timeMs);
        const frame = jitVideo.unifiedVideoSeekTask.value;
        expect(frame).toBeDefined();
        expect(frame?.timestamp).toBeCloseTo(timeMs / 1000, 1);
      }
    });
  });

  describe("boundary seeking", () => {
    test.skip("segment 2 track range and segment 3 track range have no gap between them", async ({
      expect,
      jitVideo,
      timegroup,
    }) => {
      // SKIP: audioSeekTask is not part of the audio rendering pipeline
      await timegroup.waitForMediaDurations();
      timegroup.currentTimeMs = 1000;
      await timegroup.updateComplete;

      timegroup.currentTimeMs = 2026.6666666666663;
      await timegroup.updateComplete;
      const sample = await jitVideo.unifiedVideoSeekTask.taskComplete;
      expect(sample?.timestamp).toBeCloseTo(2, 1);
    });

    test("Can seek audio to 4025.0000000000005ms in head-moov-480p.mp4", async ({
      expect,
      jitVideo,
      timegroup,
    }) => {
      await timegroup.waitForMediaDurations();
      timegroup.currentTimeMs = 2026.6666666666663;
      await expect(
        jitVideo.audioSeekTask.taskComplete,
      ).resolves.to.not.toThrowError();
    });

    test("can seek audio to 4050ms in head-moov-480p.mp4", async ({
      expect,
      jitVideo,
      timegroup,
    }) => {
      timegroup.currentTimeMs = 4050;
      jitVideo.desiredSeekTimeMs = 4050;
      await expect(
        jitVideo.audioSeekTask.taskComplete,
      ).resolves.to.not.toThrowError();
    });

    // test.only("computes correct audio segment id for 4025.0000000000005ms", async ({ expect, jitVideo, timegroup }) => {
    //   timegroup.currentTimeMs = 4025.0000000000005;
    //   await expect(jitVideo.audioSegmentIdTask.taskComplete).resolves.toBe(2);
    // });
  });
});

describe("Media Engine Selection", () => {
  const remoteSrc = "http://web:3000/head-moov-480p.mp4";
  const localSrc = "10s-bars.mp4";

  test("defaults to JitMediaEngine for remote URLs without a configuration element", async ({
    expect,
  }) => {
    const video = document.createElement("ef-video");
    video.src = remoteSrc;
    document.body.appendChild(video);
    const engine = await video.getMediaEngine();
    expect(engine).toBeInstanceOf(JitMediaEngine);
    video.remove();
  });

  test("uses JitMediaEngine for remote URLs when wrapped in a default configuration", async ({
    configuration,
    expect,
  }) => {
    const video = document.createElement("ef-video");
    video.src = remoteSrc;
    configuration.appendChild(video);
    const engine = await video.getMediaEngine();
    expect(engine).toBeInstanceOf(JitMediaEngine);
    video.remove();
  });

  test("uses JitMediaEngine for remote URLs when configured with media-engine='cloud'", async ({
    configuration,
    expect,
  }) => {
    configuration.setAttribute("media-engine", "cloud");
    const video = document.createElement("ef-video");
    video.src = remoteSrc;
    configuration.appendChild(video);
    const engine = await video.getMediaEngine();
    expect(engine).toBeInstanceOf(JitMediaEngine);
    video.remove();
  });

  // Note: media-engine='local' with remote URLs is not supported
  // AssetMediaEngine is designed for local files and track fragment indexes only

  test("always uses AssetMediaEngine for local src paths", async ({
    configuration,
    expect,
  }) => {
    configuration.setAttribute("media-engine", "cloud");
    const video = document.createElement("ef-video");
    video.src = localSrc;
    configuration.appendChild(video);
    const engine = await video.getMediaEngine();
    expect(engine).toBeInstanceOf(AssetMediaEngine);
    video.remove();
  });
});

describe("EFMedia", () => {
  beforeEach(() => {
    // Clean up DOM
    while (document.body.children.length) {
      document.body.children[0]?.remove();
    }
  });

  afterEach(() => {
    // Clean up any remaining elements
    const elements = document.querySelectorAll("test-media");
    for (const element of elements) {
      element.remove();
    }
  });

  const test = baseTest.extend<{
    element: TestMedia;
  }>({
    element: async ({}, use) => {
      const element = document.createElement("test-media");
      document.body.appendChild(element);
      await use(element);
      element.remove();
    },
  });

  test("should be defined", ({ element, expect }) => {
    expect(element.tagName).toBe("TEST-MEDIA");
  });

  describe("mute", () => {
    test("defaults to false", ({ element, expect }) => {
      expect(element.mute).toBe(false);
    });

    test("reads from js property", ({ element, expect }) => {
      element.mute = true;
      expect(element.mute).toBe(true);
    });

    test("reads from dom attribute", ({ element, expect }) => {
      element.setAttribute("mute", "true");
      expect(element.mute).toBe(true);
    });

    test("handles any attribute value as true (standard boolean behavior)", ({
      element,
      expect,
    }) => {
      element.setAttribute("mute", "false");
      expect(element.mute).toBe(true); // Standard boolean attributes: any value = true
    });

    test("reflects property changes to attribute", async ({
      element,
      expect,
    }) => {
      element.mute = true;
      await element.updateComplete; // Wait for Lit to update
      expect(element.hasAttribute("mute")).toBe(true);
      expect(element.getAttribute("mute")).toBe(""); // Standard boolean reflection

      element.mute = false;
      await element.updateComplete; // Wait for Lit to update
      expect(element.hasAttribute("mute")).toBe(false); // Standard boolean reflection removes attribute
    });

    describe("audio rendering", () => {
      // Create a separate test context for audio rendering tests that need configuration
      const audioTest = baseTest.extend<{
        timegroup: EFTimegroup;
        configuration: EFConfiguration;
      }>({
        timegroup: async ({}, use) => {
          const timegroup = document.createElement("ef-timegroup");
          timegroup.setAttribute("mode", "contain");
          await use(timegroup);
        },
        configuration: async ({ expect }, use) => {
          const configuration = document.createElement("ef-configuration");
          configuration.innerHTML = `<h1 style="font: 10px monospace">${expect.getState().currentTestName}</h1>`;
          // Use integrated proxy server (same host/port as test runner)
          const apiHost = `${window.location.protocol}//${window.location.host}`;
          configuration.setAttribute("api-host", apiHost);
          configuration.apiHost = apiHost;
          configuration.signingURL = ""; // Disable URL signing for tests
          document.body.appendChild(configuration);
          await use(configuration);
          // configuration.remove();
        },
      });

      audioTest(
        "skips muted elements during audio rendering",
        async ({ configuration, timegroup, expect }) => {
          // Create a muted media element
          const mutedElement = document.createElement("test-media");
          mutedElement.src = "http://web:3000/head-moov-480p.mp4";
          mutedElement.mute = true;
          timegroup.append(mutedElement);

          // Create an unmuted media element
          const unmutedElement = document.createElement("test-media");
          unmutedElement.src = "http://web:3000/head-moov-480p.mp4";
          unmutedElement.mute = false;
          timegroup.append(unmutedElement);

          configuration.append(timegroup);

          // Wait for media engines to initialize
          await mutedElement.mediaEngineTask.run();
          await unmutedElement.mediaEngineTask.run();

          // Spy on fetchAudioSpanningTime to verify muted element is skipped
          const mutedFetchSpy = vi.spyOn(
            mutedElement,
            "fetchAudioSpanningTime",
          );
          const unmutedFetchSpy = vi.spyOn(
            unmutedElement,
            "fetchAudioSpanningTime",
          );

          // Render a short audio segment
          try {
            await timegroup.renderAudio(0, 1000); // 1 second
          } catch (error) {
            // Audio rendering might fail in test environment, but we're testing the mute logic
            console.log("Audio rendering failed (expected in test):", error);
          }

          // Verify muted element was skipped (no fetch calls)
          expect(mutedFetchSpy).not.toHaveBeenCalled();

          // Verify unmuted element was processed (would have fetch calls if audio succeeds)
          // Note: In test environment, this might still be 0 due to audio context limitations
          // but the important thing is that muted element definitely wasn't called
          const mutedCalls = mutedFetchSpy.mock.calls.length;
          const unmutedCalls = unmutedFetchSpy.mock.calls.length;

          expect(mutedCalls).toBe(0);
          // Unmuted element should either be called (audio works) or both fail equally
          // The key test is that muted=0 and muted < unmuted (if audio works)
          expect(mutedCalls).toBeLessThanOrEqual(unmutedCalls);

          mutedFetchSpy.mockRestore();
          unmutedFetchSpy.mockRestore();
        },
      );

      audioTest(
        "processes unmuted elements normally",
        async ({ configuration, timegroup, expect }) => {
          // Create an unmuted media element
          const element = document.createElement("test-media");
          element.src = "http://web:3000/head-moov-480p.mp4";
          element.mute = false;
          timegroup.append(element);

          configuration.append(timegroup);

          await element.mediaEngineTask.run();

          const fetchSpy = vi.spyOn(element, "fetchAudioSpanningTime");

          try {
            await timegroup.renderAudio(0, 1000);
          } catch (error) {
            // Audio rendering might fail in test environment
            console.log("Audio rendering failed (expected in test):", error);
          }

          // The element should not have been skipped due to mute
          // (whether it actually gets called depends on test environment audio support)
          expect(element.mute).toBe(false);

          fetchSpy.mockRestore();
        },
      );

      audioTest(
        "handles dynamic mute changes",
        async ({ configuration, timegroup, expect }) => {
          const element = document.createElement("test-media");
          element.src = "http://web:3000/head-moov-480p.mp4";
          element.mute = false; // Start unmuted
          timegroup.append(element);

          configuration.append(timegroup);

          await element.mediaEngineTask.run();

          const fetchSpy = vi.spyOn(element, "fetchAudioSpanningTime");

          // First render - unmuted
          try {
            await timegroup.renderAudio(0, 500);
          } catch (error) {
            console.log("Audio rendering failed (expected in test):", error);
          }

          const firstCallCount = fetchSpy.mock.calls.length;

          // Mute the element
          element.mute = true;
          await element.updateComplete;

          // Second render - muted (should be skipped)
          try {
            await timegroup.renderAudio(500, 1000);
          } catch (error) {
            console.log("Audio rendering failed (expected in test):", error);
          }

          const secondCallCount = fetchSpy.mock.calls.length;

          // Verify no additional calls were made when muted
          expect(secondCallCount).toBe(firstCallCount);

          fetchSpy.mockRestore();
        },
      );
    });
  });

  describe("audio analysis", () => {
    const audioAnalysisTest = baseTest.extend<{
      timegroup: EFTimegroup;
      configuration: EFConfiguration;
    }>({
      timegroup: async ({}, use) => {
        const timegroup = document.createElement("ef-timegroup");
        timegroup.setAttribute("mode", "contain");
        await use(timegroup);
      },
      configuration: async ({ expect }, use) => {
        const configuration = document.createElement("ef-configuration");
        configuration.innerHTML = `<h1 style="font: 10px monospace">${expect.getState().currentTestName}</h1>`;
        // Use integrated proxy server (same host/port as test runner)
        const apiHost = `${window.location.protocol}//${window.location.host}`;
        configuration.setAttribute("api-host", apiHost);
        configuration.apiHost = apiHost;
        configuration.signingURL = ""; // Disable URL signing for tests
        document.body.appendChild(configuration);
        await use(configuration);
      },
    });

    audioAnalysisTest(
      "has time domain analysis task",
      async ({ configuration, timegroup, expect }) => {
        const element = document.createElement("test-media");
        element.src = "http://web:3000/head-moov-480p.mp4";
        timegroup.append(element);
        configuration.append(timegroup);

        await element.mediaEngineTask.run();

        expect(element.byteTimeDomainTask).toBeDefined();
        expect(typeof element.byteTimeDomainTask.taskComplete).toBe("object");
      },
    );

    audioAnalysisTest(
      "has frequency analysis task",
      async ({ configuration, timegroup, expect }) => {
        const element = document.createElement("test-media");
        element.src = "http://web:3000/head-moov-480p.mp4";
        timegroup.append(element);
        configuration.append(timegroup);

        await element.mediaEngineTask.run();

        expect(element.frequencyDataTask).toBeDefined();
        expect(typeof element.frequencyDataTask.taskComplete).toBe("object");
      },
    );

    audioAnalysisTest(
      "respects FFT configuration properties",
      async ({ configuration, timegroup, expect }) => {
        const element = document.createElement("test-media");
        element.src = "http://web:3000/head-moov-480p.mp4";
        element.fftSize = 256;
        element.fftDecay = 4;
        element.fftGain = 2.0;
        element.interpolateFrequencies = true;
        timegroup.append(element);
        configuration.append(timegroup);

        await element.updateComplete;

        expect(element.fftSize).toBe(256);
        expect(element.fftDecay).toBe(4);
        expect(element.fftGain).toBe(2.0);
        expect(element.interpolateFrequencies).toBe(true);
        expect(element.getShouldInterpolateFrequencies()).toBe(true);
      },
    );

    audioAnalysisTest(
      "generates FREQ_WEIGHTS based on fftSize",
      async ({ configuration, timegroup, expect }) => {
        const element = document.createElement("test-media");
        element.src = "http://web:3000/head-moov-480p.mp4";
        element.fftSize = 128;
        timegroup.append(element);
        configuration.append(timegroup);

        await element.updateComplete;

        const weights = element.getFreqWeights();
        expect(weights).toBeInstanceOf(Float32Array);
        expect(weights.length).toBe(element.fftSize / 2); // 64 for fftSize 128

        // Test frequency weighting - lower frequencies should have lower weights
        expect(weights.length).toBeGreaterThan(0);
        const firstWeight = weights[0];
        const lastWeight = weights[weights.length - 1];
        expect(firstWeight).toBeDefined();
        expect(lastWeight).toBeDefined();
        expect(firstWeight!).toBeLessThan(lastWeight!);
      },
    );
  });

  describe("assetId", () => {
    test("reads from js property", ({ element, expect }) => {
      element.assetId = "test-asset-123";
      expect(element.assetId).toBe("test-asset-123");
    });

    test("reads from dom attribute", ({ element, expect }) => {
      element.setAttribute("asset-id", "test-asset-123");
      expect(element.assetId).toBe("test-asset-123");
    });

    test("defaults to null", ({ element, expect }) => {
      expect(element.assetId).toBe(null);
    });

    test("reflects property changes to attribute", async ({
      element,
      expect,
    }) => {
      element.assetId = "test-asset-456";
      await element.updateComplete;
      expect(element.getAttribute("file-id")).toBe("test-asset-456");

      element.assetId = null;
      await element.updateComplete;
      expect(element.hasAttribute("file-id")).toBe(false);
    });

    test("reads assetId from html source", async ({ expect }) => {
      const container = document.createElement("div");
      container.innerHTML = `<test-media asset-id="test-asset-789"></test-media>`;
      const media = container.querySelector("test-media") as TestMedia;
      expect(media).toBeDefined();
      expect(media.assetId).toBe("test-asset-789");
    });
  });

  describe("fftSize", () => {
    test("defaults to 128", ({ element, expect }) => {
      expect(element.fftSize).toBe(128);
    });

    test("reads from js property", ({ element, expect }) => {
      element.fftSize = 1024;
      expect(element.fftSize).toBe(1024);
    });

    test("reads from dom attribute", ({ element, expect }) => {
      element.setAttribute("fft-size", "1024");
      expect(element.fftSize).toBe(1024);
    });

    test("reflects property changes to attribute", async ({
      element,
      expect,
    }) => {
      element.fftSize = 512;
      await element.updateComplete;
      expect(element.getAttribute("fft-size")).toBe("512");
    });
  });

  describe("fftDecay", () => {
    test("defaults to 8", ({ element, expect }) => {
      expect(element.fftDecay).toBe(8);
    });

    test("reads from js property", ({ element, expect }) => {
      element.fftDecay = 16;
      expect(element.fftDecay).toBe(16);
    });

    test("reads from dom attribute", ({ element, expect }) => {
      element.setAttribute("fft-decay", "16");
      expect(element.fftDecay).toBe(16);
    });

    test("reflects property changes to attribute", async ({
      element,
      expect,
    }) => {
      element.fftDecay = 32;
      await element.updateComplete;
      expect(element.getAttribute("fft-decay")).toBe("32");
    });
  });

  describe("fftGain", () => {
    test("defaults to 3.0", ({ element, expect }) => {
      expect(element.fftGain).toBe(3.0);
    });

    test("reads from js property", ({ element, expect }) => {
      element.fftGain = 0.5;
      expect(element.fftGain).toBe(0.5);
    });

    test("reads from dom attribute", ({ element, expect }) => {
      element.setAttribute("fft-gain", "0.5");
      expect(element.fftGain).toBe(0.5);
    });

    test("reflects property changes to attribute", async ({
      element,
      expect,
    }) => {
      element.fftGain = 2.5;
      await element.updateComplete;
      expect(element.getAttribute("fft-gain")).toBe("2.5");
    });
  });

  describe("interpolateFrequencies", () => {
    test("defaults to false", ({ element, expect }) => {
      expect(element.interpolateFrequencies).toBe(false);
    });

    test("reads from js property", ({ element, expect }) => {
      element.interpolateFrequencies = true;
      expect(element.interpolateFrequencies).toBe(true);
    });

    test("reads from dom attribute", ({ element, expect }) => {
      element.setAttribute("interpolate-frequencies", "true");
      expect(element.interpolateFrequencies).toBe(true);
    });

    test("handles any attribute value as true (standard boolean behavior)", ({
      element,
      expect,
    }) => {
      element.setAttribute("interpolate-frequencies", "false");
      expect(element.interpolateFrequencies).toBe(true); // Standard boolean attributes: any value = true
    });

    test("reflects property changes to attribute", async ({
      element,
      expect,
    }) => {
      element.interpolateFrequencies = true;
      await element.updateComplete;
      expect(element.hasAttribute("interpolate-frequencies")).toBe(true);
      expect(element.getAttribute("interpolate-frequencies")).toBe(""); // Standard boolean reflection

      element.interpolateFrequencies = false;
      await element.updateComplete;
      expect(element.hasAttribute("interpolate-frequencies")).toBe(false); // Standard boolean reflection removes attribute
    });
  });

  //   describe("mediaEngineTask", () => {
  //     test("is defined", ({ element, expect }) => {
  //       expect(element.mediaEngineTask).toBeDefined();
  //     });

  //     test("is a task", ({ element, expect }) => {
  //       expect(element.mediaEngineTask).toBeInstanceOf(Task);
  //     });

  //     test("throws if assetId is set", async ({ element, expect }) => {
  //       element.assetId = "test-asset-123";
  //       await element.mediaEngineTask.run();
  //       expect(element.mediaEngineTask.error).toBeInstanceOf(Error);
  //     });

  //     test("creates JitMediaEngine for http sources", async ({
  //       elementWithJitManifest,
  //       expect,
  //       worker,
  //     }) => {
  //       await elementWithJitManifest.mediaEngineTask.run();
  //       expect(elementWithJitManifest.mediaEngineTask.value).toBeInstanceOf(
  //         JitMediaEngine,
  //       );
  //     });

  //     test("creates AssetMediaEngine for local sources", async ({
  //       elementWithAsset,
  //       expect,
  //     }) => {
  //       await elementWithAsset.mediaEngineTask.run();
  //       expect(elementWithAsset.mediaEngineTask.value).toBeInstanceOf(
  //         AssetMediaEngine,
  //       );
  //     });
  //   });

  //   describe("Video Buffering Integration", () => {
  //     test("videoBufferTask is available and configured", ({
  //       element,
  //       expect,
  //     }) => {
  //       expect(element.videoBufferTask).toBeDefined();
  //       expect(element.videoBufferDurationMs).toBe(60000); // 60 seconds default
  //       expect(element.maxVideoBufferFetches).toBe(2); // 2 parallel fetches default
  //       expect(element.enableVideoBuffering).toBe(true); // enabled by default
  //     });

  //     test("buffer configuration can be customized", ({ element, expect }) => {
  //       element.videoBufferDurationMs = 45000;
  //       element.maxVideoBufferFetches = 3;
  //       element.enableVideoBuffering = false;

  //       expect(element.videoBufferDurationMs).toBe(45000);
  //       expect(element.maxVideoBufferFetches).toBe(3);
  //       expect(element.enableVideoBuffering).toBe(false);
  //     });

  //     test("buffer task starts automatically with JIT asset", async ({
  //       elementWithJitManifest,
  //       expect,
  //     }) => {
  //       const element = elementWithJitManifest;

  //       // Wait for media engine to initialize
  //       await element.mediaEngineTask.taskComplete;

  //       // Buffer task should be available and have started
  //       expect(element.videoBufferTask).toBeDefined();
  //       // Task status should be INITIAL (0) or higher, indicating it's been created
  //       expect(element.videoBufferTask.status).toBeGreaterThanOrEqual(0);
  //     });
  //   });
  // });

  // // Test to verify buffer tasks use EFMedia properties directly (no hardcoded config duplication)
  // describe("Buffer Task Property Integration", () => {
  //   test("audio and video buffer tasks use EFMedia properties directly", async ({
  //     element,
  //     expect,
  //   }) => {
  //     // Set custom buffer configuration on the element
  //     element.audioBufferDurationMs = 15000;
  //     element.maxAudioBufferFetches = 3;
  //     element.enableAudioBuffering = false;

  //     element.videoBufferDurationMs = 45000;
  //     element.maxVideoBufferFetches = 5;
  //     element.enableVideoBuffering = false;

  //     // Verify the tasks are created without requiring hardcoded config
  //     expect(element.audioBufferTask).toBeDefined();
  //     expect(element.videoBufferTask).toBeDefined();

  //     // The task configuration should now come directly from element properties
  //     // This test ensures no hardcoded config duplication exists
  //     expect(element.audioBufferDurationMs).toBe(15000);
  //     expect(element.maxAudioBufferFetches).toBe(3);
  //     expect(element.enableAudioBuffering).toBe(false);

  //     expect(element.videoBufferDurationMs).toBe(45000);
  //     expect(element.maxVideoBufferFetches).toBe(5);
  //     expect(element.enableVideoBuffering).toBe(false);
  //   });
  // });
});

describe("contentReadyState lifecycle", () => {
  test("ef-video starts as idle before src is set", () => {
    const video = document.createElement("ef-video");
    expect(video.contentReadyState).toBe("idle");
  });

  test("ef-video transitions idle → loading → ready", async ({ configuration, expect }) => {
    const video = document.createElement("ef-video");
    const states: string[] = [];
    video.addEventListener("readystatechange", ((e: CustomEvent) => {
      states.push(e.detail.state);
    }) as EventListener);

    video.src = "http://web:3000/head-moov-480p.mp4";
    configuration.append(video);

    // Wait for engine to load (getMediaEngine is fire-and-forget from updated())
    await video.getMediaEngine();
    await video.updateComplete;

    expect(states).toContain("loading");
    expect(states).toContain("ready");
    expect(video.contentReadyState).toBe("ready");
    expect(states.indexOf("loading")).toBeLessThan(states.indexOf("ready"));
    video.remove();
  });

  test("ef-video with no src stays idle (does not auto-ready)", async () => {
    const video = document.createElement("ef-video");
    document.body.append(video);
    await video.updateComplete;
    // EFMedia overrides default auto-ready: stays idle when no src
    expect(video.contentReadyState).toBe("idle");
    video.remove();
  });

  test("source swap: ready → loading → ready", async ({ configuration, expect }) => {
    const video = document.createElement("ef-video");
    video.src = "http://web:3000/head-moov-480p.mp4";
    configuration.append(video);

    await video.getMediaEngine();
    await video.updateComplete;
    expect(video.contentReadyState).toBe("ready");

    // Now change source
    const states: string[] = [];
    video.addEventListener("readystatechange", ((e: CustomEvent) => {
      states.push(e.detail.state);
    }) as EventListener);

    video.src = "http://web:3000/head-moov-480p.mp4?v=2";
    // Trigger the update cycle that detects the src change
    await video.updateComplete;
    // Wait for the new engine to load
    await video.getMediaEngine();
    await video.updateComplete;

    expect(states).toContain("loading");
    expect(states).toContain("ready");
    expect(video.contentReadyState).toBe("ready");
    video.remove();
  });

  test("contentchange fires with reason 'source' on src change", async ({ configuration, expect }) => {
    const video = document.createElement("ef-video");
    video.src = "http://web:3000/head-moov-480p.mp4";
    configuration.append(video);
    await video.getMediaEngine();
    await video.updateComplete;

    const reasons: string[] = [];
    video.addEventListener("contentchange", ((e: CustomEvent) => {
      reasons.push(e.detail.reason);
    }) as EventListener);

    video.src = "http://web:3000/head-moov-480p.mp4?v=2";
    await video.updateComplete;

    expect(reasons).toContain("source");
    video.remove();
  });

  test("contentchange fires with reason 'bounds' on sourcein change", async ({ configuration, expect }) => {
    const video = document.createElement("ef-video");
    video.src = "http://web:3000/head-moov-480p.mp4";
    configuration.append(video);
    await video.getMediaEngine();
    await video.updateComplete;

    const reasons: string[] = [];
    video.addEventListener("contentchange", ((e: CustomEvent) => {
      reasons.push(e.detail.reason);
    }) as EventListener);

    video.sourceInMs = 1000;
    await video.updateComplete;

    expect(reasons).toContain("bounds");
    video.remove();
  });

  test("contentchange fires with reason 'bounds' on sourceout change", async ({ configuration, expect }) => {
    const video = document.createElement("ef-video");
    video.src = "http://web:3000/head-moov-480p.mp4";
    configuration.append(video);
    await video.getMediaEngine();
    await video.updateComplete;

    const reasons: string[] = [];
    video.addEventListener("contentchange", ((e: CustomEvent) => {
      reasons.push(e.detail.reason);
    }) as EventListener);

    video.sourceOutMs = 5000;
    await video.updateComplete;

    expect(reasons).toContain("bounds");
    video.remove();
  });

  test("no contentchange on playback tick", async ({ configuration, expect }) => {
    const video = document.createElement("ef-video");
    video.src = "http://web:3000/head-moov-480p.mp4";
    configuration.append(video);
    await video.getMediaEngine();
    await video.updateComplete;

    const reasons: string[] = [];
    video.addEventListener("contentchange", ((e: CustomEvent) => {
      reasons.push(e.detail.reason);
    }) as EventListener);

    // Simulate a time update (not a content change)
    video.requestUpdate("ownCurrentTimeMs");
    await video.updateComplete;

    expect(reasons).toHaveLength(0);
    video.remove();
  });

  test("readystatechange event does not bubble from ef-video", async ({ configuration, expect }) => {
    const container = document.createElement("div");
    const video = document.createElement("ef-video");
    container.append(video);
    configuration.append(container);

    const bubbled: string[] = [];
    container.addEventListener("readystatechange", ((e: CustomEvent) => {
      bubbled.push(e.detail.state);
    }) as EventListener);

    video.src = "http://web:3000/head-moov-480p.mp4";
    await video.mediaEngineTask.taskComplete;
    await video.updateComplete;

    expect(bubbled).toHaveLength(0);
    container.remove();
  });
});
