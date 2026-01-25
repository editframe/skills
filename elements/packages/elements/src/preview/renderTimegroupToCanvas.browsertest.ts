import { html, render } from "lit";
import { beforeAll, beforeEach, describe, expect } from "vitest";

import { test as baseTest } from "../../test/useMSW.js";
import { getApiHost } from "../../test/setup.js";
import {
  captureCanvasAsDataUrl,
  expectCanvasToMatchSnapshot,
  expectCanvasesToMatch,
} from "../../test/visualRegressionUtils.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import {
  captureTimegroupAtTime,
  ContentNotReadyError,
  renderToImageNative,
} from "./renderTimegroupToCanvas.js";
import { renderTimegroupToVideo } from "./renderTimegroupToVideo.js";
import {
  buildCloneStructure,
  syncStyles,
  collectDocumentStyles,
} from "./renderTimegroupPreview.js";
import {
  isNativeCanvasApiAvailable,
  setNativeCanvasApiEnabled,
} from "./previewSettings.js";
import { logger } from "./logger.js";
import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "../elements/EFPanZoom.js";
import "../gui/EFPreview.js";
import "../gui/EFWorkbench.js";
import "../gui/EFConfiguration.js";
import "../canvas/EFCanvas.js";

const THUMBNAIL_SCALE = 0.1; // Small scale like real thumbnail strip uses

beforeAll(async () => {
  console.clear();
  await fetch("/@ef-clear-cache", {
    method: "DELETE",
  });
});

beforeEach(() => {
  localStorage.clear();
});

// Extend the base test with fixtures
const test = baseTest.extend<{
  htmlTimegroup: EFTimegroup;
  videoTimegroup: EFTimegroup;
  complexHtmlTimegroup: EFTimegroup;
  nestedAnimatedTimegroup: EFTimegroup;
}>({
  htmlTimegroup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="html-timegroup"
            style="width: 800px; height: 450px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; font-family: system-ui, sans-serif;">
              <h1 style="font-size: 48px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Hello World</h1>
              <p style="font-size: 24px; margin-top: 16px; opacity: 0.9;">Visual Regression Test</p>
            </div>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await use(timegroup);
    container.remove();
  },
  videoTimegroup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="video-timegroup"
            style="width: 800px; height: 450px; background: #1a1a2e;">
            <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();
    await use(timegroup);
    container.remove();
  },
  complexHtmlTimegroup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="complex-html-timegroup"
            style="width: 1920px; height: 1080px; background: linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%);">
            
            <!-- Header section -->
            <div style="position: absolute; top: 40px; left: 80px; right: 80px; display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 32px; font-weight: 700; color: #fff; letter-spacing: 2px;">BRAND</div>
              <div style="display: flex; gap: 40px; font-size: 18px; color: rgba(255,255,255,0.8);">
                <span>Home</span>
                <span>About</span>
                <span>Contact</span>
              </div>
            </div>
            
            <!-- Main content -->
            <div style="position: absolute; top: 50%; left: 80px; transform: translateY(-50%); max-width: 800px;">
              <h1 style="font-size: 72px; font-weight: 700; color: #fff; margin: 0; line-height: 1.1; text-shadow: 0 4px 24px rgba(0,0,0,0.3);">
                Complex HTML<br/>Content Test
              </h1>
              <p style="font-size: 24px; color: rgba(255,255,255,0.7); margin-top: 24px; line-height: 1.6;">
                This tests rendering of complex nested HTML structures with multiple styled elements, gradients, shadows, and typography.
              </p>
              <div style="display: flex; gap: 16px; margin-top: 40px;">
                <button style="padding: 16px 40px; font-size: 18px; font-weight: 600; color: #fff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);">
                  Primary Action
                </button>
                <button style="padding: 16px 40px; font-size: 18px; font-weight: 600; color: #fff; background: transparent; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; cursor: pointer;">
                  Secondary
                </button>
              </div>
            </div>
            
            <!-- Decorative elements -->
            <div style="position: absolute; top: 20%; right: 5%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%); border-radius: 50%;"></div>
            <div style="position: absolute; bottom: 10%; right: 15%; width: 200px; height: 200px; background: radial-gradient(circle, rgba(118, 75, 162, 0.4) 0%, transparent 70%); border-radius: 50%;"></div>
            
            <!-- Footer -->
            <div style="position: absolute; bottom: 40px; left: 80px; right: 80px; display: flex; justify-content: space-between; align-items: center; color: rgba(255,255,255,0.5); font-size: 14px;">
              <span>© 2024 Visual Regression Tests</span>
              <span>Frame captured at time: 0ms</span>
            </div>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await use(timegroup);
    container.remove();
  },
  nestedAnimatedTimegroup: async ({}, use) => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    // Complex example with nested timegroups, video, and CSS animations
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="sequence" id="nested-animated-timegroup"
            style="width: 1920px; height: 1080px; background: #0a0a1a;">
            
            <!-- First scene: Animated intro (0-5000ms) -->
            <ef-timegroup mode="fixed" duration="5s" style="width: 100%; height: 100%;">
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 120px;
                font-weight: 900;
                color: white;
                text-shadow: 0 0 60px rgba(102, 126, 234, 0.8);
                animation: pulse 2s ease-in-out infinite;
              ">
                INTRO
              </div>
              <div style="
                position: absolute;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                width: 600px;
                height: 4px;
                background: linear-gradient(90deg, transparent, #667eea, transparent);
                animation: scan 3s linear infinite;
              "></div>
            </ef-timegroup>
            
            <!-- Second scene: Video with overlay (5000-15000ms) -->
            <ef-timegroup mode="contain" style="width: 100%; height: 100%;">
              <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: cover;"></ef-video>
              <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.7) 100%);
              "></div>
              <div style="
                position: absolute;
                top: 40px;
                left: 60px;
                padding: 12px 24px;
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                border-radius: 8px;
                color: white;
                font-size: 18px;
                font-weight: 600;
                animation: fadeInSlide 0.5s ease-out;
              ">
                LIVE
              </div>
              <div style="
                position: absolute;
                bottom: 60px;
                left: 60px;
                right: 60px;
              ">
                <h2 style="
                  font-size: 48px;
                  color: white;
                  margin: 0;
                  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                  animation: slideUp 0.8s ease-out;
                ">Breaking News Title</h2>
                <p style="
                  font-size: 24px;
                  color: rgba(255,255,255,0.8);
                  margin-top: 12px;
                  animation: slideUp 0.8s ease-out 0.2s both;
                ">Subtitle with animated entrance effect</p>
              </div>
            </ef-timegroup>
            
            <!-- Third scene: Animated graphics (15000-25000ms) -->
            <ef-timegroup mode="fixed" duration="10s" style="width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
              <div style="
                position: absolute;
                top: 50%;
                left: 25%;
                transform: translate(-50%, -50%);
                width: 300px;
                height: 300px;
                border: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 10s linear infinite;
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 75%;
                transform: translate(-50%, -50%);
                width: 200px;
                height: 200px;
                background: linear-gradient(45deg, #667eea, #764ba2);
                animation: morph 4s ease-in-out infinite;
              "></div>
              <div style="
                position: absolute;
                bottom: 20%;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 20px;
              ">
                ${[0, 1, 2, 3, 4].map(
                  (i) => html`
                  <div style="
                    width: 20px;
                    height: 80px;
                    background: #667eea;
                    animation: wave 1s ease-in-out ${i * 0.1}s infinite;
                  "></div>
                `,
                )}
              </div>
            </ef-timegroup>
            
            <!-- Fourth scene: Another nested video (25000-35000ms) -->
            <ef-timegroup mode="contain" style="width: 100%; height: 100%;">
              <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
              <div style="
                position: absolute;
                top: 20px;
                right: 20px;
                padding: 8px 16px;
                background: rgba(255,0,0,0.8);
                color: white;
                font-weight: bold;
                border-radius: 4px;
                animation: blink 1s step-end infinite;
              ">REC</div>
            </ef-timegroup>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
      
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes scan {
          0% { transform: translateX(-50%) scaleX(0); }
          50% { transform: translateX(-50%) scaleX(1); }
          100% { transform: translateX(-50%) scaleX(0); }
        }
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes morph {
          0%, 100% { border-radius: 0; }
          50% { border-radius: 50%; }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      </style>
    `,
      container,
    );
    document.body.appendChild(container);
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();
    await use(timegroup);
    container.remove();
  },
});

function hasCanvasContent(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return imageData.data.some((value, index) => index % 4 !== 3 && value !== 0);
}

/**
 * Check if canvas has meaningful visual content (not just a solid color background).
 * This detects blank thumbnails that have a background but no actual rendered content.
 * 
 * Uses statistical analysis of pixel variance to detect solid-color frames.
 */
function hasMeaningfulContent(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d")!;
  const width = canvas.width;
  const height = canvas.height;
  
  if (width === 0 || height === 0) return false;
  
  // Sample a grid of pixels across the canvas
  const sampleSize = 20; // 20x20 grid = 400 samples
  const stepX = Math.max(1, Math.floor(width / sampleSize));
  const stepY = Math.max(1, Math.floor(height / sampleSize));
  
  const samples: Array<[number, number, number]> = [];
  
  for (let y = stepY; y < height - stepY; y += stepY) {
    for (let x = stepX; x < width - stepX; x += stepX) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      samples.push([pixel[0]!, pixel[1]!, pixel[2]!]);
    }
  }
  
  if (samples.length < 10) return false;
  
  // Calculate variance for each channel
  const calcVariance = (values: number[]): number => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  };
  
  const rVariance = calcVariance(samples.map(s => s[0]));
  const gVariance = calcVariance(samples.map(s => s[1]));
  const bVariance = calcVariance(samples.map(s => s[2]));
  
  // Total variance - sum of channel variances
  const totalVariance = rVariance + gVariance + bVariance;
  
  // A solid color (or near-solid gradient) will have very low variance
  // Blank JPG thumbnails (like those at 22500-32500ms) have ~1265 bytes
  // and near-zero variance. Real content has variance > 500 typically.
  // Use threshold of 100 to catch blank frames
  const VARIANCE_THRESHOLD = 100;
  
  const hasContent = totalVariance > VARIANCE_THRESHOLD;
  
  if (!hasContent) {
    // Log for debugging
    const avgColor = samples.reduce(
      (acc, s) => [acc[0] + s[0], acc[1] + s[1], acc[2] + s[2]],
      [0, 0, 0],
    ).map(c => Math.round(c / samples.length));
    console.log(
      `Low variance detected: ${totalVariance.toFixed(1)} (threshold: ${VARIANCE_THRESHOLD}), avg color: rgb(${avgColor.join(",")})`,
    );
  }
  
  return hasContent;
}

// Re-enabled 2026-01-24: Tests were passing when skipped for beta release
describe("renderTimegroupToCanvas", () => {
  test("native Canvas API (drawElementImage) is available", () => {
    expect(isNativeCanvasApiAvailable()).toBe(true);
  });

  describe("simple HTML content", () => {
    test("native: captures and matches baseline", async ({ htmlTimegroup }) => {
      setNativeCanvasApiEnabled(true);
      const canvas = await captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 1 });

      expect(hasCanvasContent(canvas)).toBe(true);
      await expectCanvasToMatchSnapshot(
        canvas,
        "renderTimegroupToCanvas",
        "simple-html-native",
        { threshold: 0.1, acceptableDiffPercentage: 0.5 },
      );
    });

    test("foreignObject: captures and matches baseline", async ({
      htmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const canvas = await captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 1 });

      expect(hasCanvasContent(canvas)).toBe(true);
      await expectCanvasToMatchSnapshot(
        canvas,
        "renderTimegroupToCanvas",
        "simple-html-foreign",
        { threshold: 0.1, acceptableDiffPercentage: 0.5 },
      );
    });

    test("cross-path: native vs foreignObject both render content", async ({
      htmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const foreignCanvas = await captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 1 });

      setNativeCanvasApiEnabled(true);
      const nativeCanvas = await captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 1 });

      expect(hasCanvasContent(foreignCanvas)).toBe(true);
      expect(hasCanvasContent(nativeCanvas)).toBe(true);
    });
  });

  describe("complex HTML content", () => {
    test("native: captures and matches baseline", async ({
      complexHtmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const canvas = await captureTimegroupAtTime(complexHtmlTimegroup, { timeMs: 0, scale: 1 });

      expect(hasCanvasContent(canvas)).toBe(true);
      await expectCanvasToMatchSnapshot(
        canvas,
        "renderTimegroupToCanvas",
        "complex-html-native",
        { threshold: 0.1, acceptableDiffPercentage: 0.5 },
      );
    });

    test("foreignObject: captures and matches baseline", async ({
      complexHtmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const canvas = await captureTimegroupAtTime(complexHtmlTimegroup, { timeMs: 0, scale: 1 });

      expect(hasCanvasContent(canvas)).toBe(true);
      await expectCanvasToMatchSnapshot(
        canvas,
        "renderTimegroupToCanvas",
        "complex-html-foreign",
        { threshold: 0.1, acceptableDiffPercentage: 0.5 },
      );
    });

    test("cross-path: native vs foreignObject both render content", async ({
      complexHtmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const foreignCanvas = await captureTimegroupAtTime(complexHtmlTimegroup, { timeMs: 0, scale: 0.5 });

      setNativeCanvasApiEnabled(true);
      const nativeCanvas = await captureTimegroupAtTime(complexHtmlTimegroup, { timeMs: 0, scale: 0.5 });

      expect(hasCanvasContent(foreignCanvas)).toBe(true);
      expect(hasCanvasContent(nativeCanvas)).toBe(true);
    });
  });

  describe("video frame capture", () => {
    test("native: captures and matches baseline", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const canvas = await captureTimegroupAtTime(videoTimegroup, { timeMs: 2000, scale: 1 });

      expect(hasCanvasContent(canvas)).toBe(true);
      await expectCanvasToMatchSnapshot(
        canvas,
        "renderTimegroupToCanvas",
        "video-frame-native",
        { threshold: 0.15, acceptableDiffPercentage: 1.0 },
      );
    });

    test("foreignObject: captures and matches baseline", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const canvas = await captureTimegroupAtTime(videoTimegroup, { timeMs: 2000, scale: 1 });

      expect(hasCanvasContent(canvas)).toBe(true);
      await expectCanvasToMatchSnapshot(
        canvas,
        "renderTimegroupToCanvas",
        "video-frame-foreign",
        { threshold: 0.15, acceptableDiffPercentage: 1.0 },
      );
    });

    test("cross-path: native vs foreignObject produce similar output", async ({
      videoTimegroup,
    }) => {
      // Use immediate mode - blocking mode takes too long waiting for video decode in render clones.
      // Video content may have a hole (transparent pixels), but the rendering paths should still
      // produce similar visual output for the HTML/CSS content around the video.
      setNativeCanvasApiEnabled(false);
      const foreignCanvas = await captureTimegroupAtTime(videoTimegroup, { 
        timeMs: 2000, 
        scale: 0.5,
      });

      setNativeCanvasApiEnabled(true);
      const nativeCanvas = await captureTimegroupAtTime(videoTimegroup, { 
        timeMs: 2000, 
        scale: 0.5,
      });

      await expectCanvasesToMatch(
        foreignCanvas,
        nativeCanvas,
        "renderTimegroupToCanvas",
        "video-cross-path",
        { threshold: 0.1, acceptableDiffPercentage: 5.0 },
      );
    });
  });

  describe("batch capture (thumbnail strip)", () => {
    const timestamps = [0, 1000, 2000, 3000, 4000, 5000];

    test("native: all thumbnails have content", async ({ videoTimegroup }) => {
      setNativeCanvasApiEnabled(true);
      const canvases = await videoTimegroup.captureBatch(timestamps, { scale: 0.25 });

      const blankIndices: number[] = [];
      for (let i = 0; i < canvases.length; i++) {
        if (!hasCanvasContent(canvases[i]!)) {
          blankIndices.push(i);
          console.log(`⚠️ Native: blank at ${timestamps[i]}ms`);
        }
      }
      expect(blankIndices.length).toBe(0);
    });

    test("foreignObject: all thumbnails have content", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const canvases = await videoTimegroup.captureBatch(timestamps, { scale: 0.25 });

      const blankIndices: number[] = [];
      for (let i = 0; i < canvases.length; i++) {
        if (!hasCanvasContent(canvases[i]!)) {
          blankIndices.push(i);
          console.log(`⚠️ ForeignObject: blank at ${timestamps[i]}ms`);
        }
      }
      expect(blankIndices.length).toBe(0);
    });

    test("cross-path: batch captures produce similar thumbnails", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const foreignCanvases = await videoTimegroup.captureBatch(timestamps, { scale: 0.25 });

      setNativeCanvasApiEnabled(true);
      const nativeCanvases = await videoTimegroup.captureBatch(timestamps, { scale: 0.25 });

      for (let i = 0; i < timestamps.length; i++) {
        await expectCanvasesToMatch(
          foreignCanvases[i]!,
          nativeCanvases[i]!,
          "renderTimegroupToCanvas",
          `batch-cross-path-${timestamps[i]}ms`,
          { threshold: 0.1, acceptableDiffPercentage: 6.0 },
        );
      }
    });
  });

  describe("scale factors", () => {
    const scales = [0.25, 0.5, 1];
    const expectedWidths = [200, 400, 800];

    test("native: captures at different scales", async ({ htmlTimegroup }) => {
      setNativeCanvasApiEnabled(true);
      const dpr = window.devicePixelRatio || 1;

      for (let i = 0; i < scales.length; i++) {
        const canvas = await captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: scales[i]! });
        expect(canvas.width).toBe(expectedWidths[i]! * dpr);
        expect(hasCanvasContent(canvas)).toBe(true);
      }
    });

    test("foreignObject: captures at different scales", async ({
      htmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const dpr = window.devicePixelRatio || 1;

      for (let i = 0; i < scales.length; i++) {
        const canvas = await captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: scales[i]! });
        expect(canvas.width).toBe(expectedWidths[i]! * dpr);
        expect(hasCanvasContent(canvas)).toBe(true);
      }
    });
  });

  describe("timing consistency", () => {
    test("native: consecutive captures are consistent", async ({
      htmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const captures = await Promise.all([
        captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 0.5 }),
        captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 0.5 }),
        captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 0.5 }),
      ]);

      const data0 = captureCanvasAsDataUrl(captures[0]!);
      const data1 = captureCanvasAsDataUrl(captures[1]!);
      const data2 = captureCanvasAsDataUrl(captures[2]!);

      expect(data0).toBe(data1);
      expect(data1).toBe(data2);
    });

    test("foreignObject: consecutive captures are consistent", async ({
      htmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const captures = await Promise.all([
        captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 0.5 }),
        captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 0.5 }),
        captureTimegroupAtTime(htmlTimegroup, { timeMs: 0, scale: 0.5 }),
      ]);

      const data0 = captureCanvasAsDataUrl(captures[0]!);
      const data1 = captureCanvasAsDataUrl(captures[1]!);
      const data2 = captureCanvasAsDataUrl(captures[2]!);

      expect(data0).toBe(data1);
      expect(data1).toBe(data2);
    });

    test("native: captures after rapid seeking are not blank", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const times = [0, 1000, 2000, 3000, 4000, 2000];

      for (const time of times) {
        videoTimegroup.currentTimeMs = time;
        await videoTimegroup.updateComplete;
      }

      const canvas = await captureTimegroupAtTime(videoTimegroup, { timeMs: 2000, scale: 1 });
      expect(hasCanvasContent(canvas)).toBe(true);
    });

    test("foreignObject: captures after rapid seeking are not blank", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const times = [0, 1000, 2000, 3000, 4000, 2000];

      for (const time of times) {
        videoTimegroup.currentTimeMs = time;
        await videoTimegroup.updateComplete;
      }

      const canvas = await captureTimegroupAtTime(videoTimegroup, { timeMs: 2000, scale: 1 });
      expect(hasCanvasContent(canvas)).toBe(true);
    });

    test("temporal culling: elements reappear after crossing time boundaries", async ({
      nestedAnimatedTimegroup,
    }) => {
      // This tests a regression where temporal culling would hide elements by setting
      // display:none, but the style cache wouldn't be invalidated. When scrubbing back
      // into the element's time range, it would stay hidden because the cache thought
      // display hadn't changed.
      setNativeCanvasApiEnabled(true);
      
      // The nested timegroup has:
      // - INTRO scene at 0-5000ms
      // - Video scene at 5000-15000ms (via sequence mode)
      // - Outro scene at 15000-20000ms
      
      // Build clone structure once (like the preview does)
      const { syncState } = buildCloneStructure(nestedAnimatedTimegroup);
      
      // Start at time 0 - INTRO should be visible
      syncStyles(syncState, 0);
      const canvas0 = await captureTimegroupAtTime(nestedAnimatedTimegroup, { timeMs: 0, scale: 0.5 });
      expect(hasCanvasContent(canvas0)).toBe(true);
      
      // Scrub to time 7500ms - past INTRO, into video scene
      // INTRO elements should now be hidden by temporal culling
      syncStyles(syncState, 7500);
      
      // Scrub back to time 2500ms - INTRO should be visible again
      // This would fail before the fix because display cache wasn't invalidated
      syncStyles(syncState, 2500);
      const canvas2500 = await captureTimegroupAtTime(nestedAnimatedTimegroup, { timeMs: 2500, scale: 0.5 });
      expect(hasCanvasContent(canvas2500)).toBe(true);
    });
  });

  describe("thumbnail strip simulation (many small thumbnails)", () => {
    const THUMBNAIL_COUNT = 30;

    function generateTimestamps(durationMs: number, count: number): number[] {
      const timestamps: number[] = [];
      for (let i = 0; i < count; i++) {
        timestamps.push((i / (count - 1)) * durationMs);
      }
      return timestamps;
    }

    async function captureAndAnalyze(
      timegroup: EFTimegroup,
      timestamps: number[],
      pathName: string,
    ): Promise<{
      blankIndices: number[];
      canvases: HTMLCanvasElement[];
    }> {
      const canvases = await timegroup.captureBatch(timestamps, { scale: THUMBNAIL_SCALE });
      const blankIndices: number[] = [];

      for (let i = 0; i < canvases.length; i++) {
        if (!hasCanvasContent(canvases[i]!)) {
          blankIndices.push(i);
          console.log(
            `⚠️ ${pathName}: blank thumbnail at index ${i} (${timestamps[i]?.toFixed(0)}ms)`,
          );
        }
      }

      return { blankIndices, canvases };
    }

    test("native: 30 thumbnails from video timegroup - none blank", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const video = videoTimegroup.querySelector("ef-video") as any;
      const durationMs = video?.intrinsicDurationMs || 10000;
      const timestamps = generateTimestamps(durationMs * 0.9, THUMBNAIL_COUNT);

      const { blankIndices } = await captureAndAnalyze(
        videoTimegroup,
        timestamps,
        "native",
      );

      expect(blankIndices.length).toBe(0);
    });

    test("foreignObject: 30 thumbnails from video timegroup - none blank", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const video = videoTimegroup.querySelector("ef-video") as any;
      const durationMs = video?.intrinsicDurationMs || 10000;
      const timestamps = generateTimestamps(durationMs * 0.9, THUMBNAIL_COUNT);

      const { blankIndices } = await captureAndAnalyze(
        videoTimegroup,
        timestamps,
        "foreignObject",
      );

      expect(blankIndices.length).toBe(0);
    });

    test("cross-path: both paths produce non-blank thumbnails", async ({
      videoTimegroup,
    }) => {
      const video = videoTimegroup.querySelector("ef-video") as any;
      const durationMs = video?.intrinsicDurationMs || 10000;
      const timestamps = generateTimestamps(durationMs * 0.9, THUMBNAIL_COUNT);

      setNativeCanvasApiEnabled(false);
      const { blankIndices: foreignBlanks } = await captureAndAnalyze(
        videoTimegroup,
        timestamps,
        "foreignObject",
      );

      setNativeCanvasApiEnabled(true);
      const { blankIndices: nativeBlanks } = await captureAndAnalyze(
        videoTimegroup,
        timestamps,
        "native",
      );

      // Both should have no blanks - this is the critical test
      expect(foreignBlanks.length).toBe(0);
      expect(nativeBlanks.length).toBe(0);
    });

    test("native: 30 thumbnails from complex HTML timegroup - none blank", async ({
      complexHtmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const durationMs = complexHtmlTimegroup.durationMs || 10000;
      const timestamps = generateTimestamps(durationMs, THUMBNAIL_COUNT);

      const { blankIndices } = await captureAndAnalyze(
        complexHtmlTimegroup,
        timestamps,
        "native",
      );

      expect(blankIndices.length).toBe(0);
    });

    test("foreignObject: 30 thumbnails from complex HTML timegroup - none blank", async ({
      complexHtmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const durationMs = complexHtmlTimegroup.durationMs || 10000;
      const timestamps = generateTimestamps(durationMs, THUMBNAIL_COUNT);

      const { blankIndices } = await captureAndAnalyze(
        complexHtmlTimegroup,
        timestamps,
        "foreignObject",
      );

      expect(blankIndices.length).toBe(0);
    });

    test("visual regression: sample thumbnails from strip", async ({
      videoTimegroup,
    }) => {
      const video = videoTimegroup.querySelector("ef-video") as any;
      const durationMs = video?.intrinsicDurationMs || 10000;
      const timestamps = generateTimestamps(durationMs * 0.9, THUMBNAIL_COUNT);

      // Test both paths and save baselines for sample thumbnails
      for (const useNative of [true, false]) {
        setNativeCanvasApiEnabled(useNative);
        const pathName = useNative ? "native" : "foreign";
        const canvases = await videoTimegroup.captureBatch(timestamps, { scale: THUMBNAIL_SCALE });

        // Save baselines for first, middle, and last thumbnails
        const sampleIndices = [0, Math.floor(THUMBNAIL_COUNT / 2), THUMBNAIL_COUNT - 1];
        for (const idx of sampleIndices) {
          await expectCanvasToMatchSnapshot(
            canvases[idx]!,
            "renderTimegroupToCanvas",
            `strip-thumb-${idx}-${pathName}`,
            { threshold: 0.15, acceptableDiffPercentage: 2.0 },
          );
        }
      }
    });
  });

  describe("nested animated timegroup (reproduction test)", () => {
    // 3 frames (beginning/middle/end) catches most timing issues while being fast
    // Increase for deeper investigation if needed
    const THUMBNAIL_COUNT = 3;

    function generateTimestamps(durationMs: number, count: number): number[] {
      const timestamps: number[] = [];
      for (let i = 0; i < count; i++) {
        timestamps.push((i / (count - 1)) * durationMs);
      }
      return timestamps;
    }

    async function captureAndReport(
      timegroup: EFTimegroup,
      timestamps: number[],
      pathName: string,
    ): Promise<{
      blankIndices: number[];
      canvases: HTMLCanvasElement[];
    }> {
      const canvases = await timegroup.captureBatch(timestamps, { scale: THUMBNAIL_SCALE });
      const blankIndices: number[] = [];

      for (let i = 0; i < canvases.length; i++) {
        // Use stricter check - hasMeaningfulContent detects solid-color blanks
        if (!hasMeaningfulContent(canvases[i]!)) {
          blankIndices.push(i);
          console.log(
            `⚠️ ${pathName}: BLANK thumbnail at index ${i} (${timestamps[i]?.toFixed(0)}ms)`,
          );
        }
      }

      if (blankIndices.length > 0) {
        console.log(
          `❌ ${pathName}: ${blankIndices.length}/${timestamps.length} blank thumbnails (${((blankIndices.length / timestamps.length) * 100).toFixed(1)}%)`,
        );
      } else {
        console.log(`✅ ${pathName}: All ${timestamps.length} thumbnails have meaningful content`);
      }

      return { blankIndices, canvases };
    }

    test("native: thumbnails from nested animated timegroup - none blank", async ({
      nestedAnimatedTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const durationMs = nestedAnimatedTimegroup.durationMs || 35000;
      const timestamps = generateTimestamps(durationMs, THUMBNAIL_COUNT);

      // Debug: Log the structure and timing of children
      const childTimegroups = Array.from(nestedAnimatedTimegroup.querySelectorAll(":scope > ef-timegroup"));
      console.log("=== Sequence timegroup structure ===");
      console.log(`Root duration: ${nestedAnimatedTimegroup.durationMs}ms`);
      console.log(`Mode: ${nestedAnimatedTimegroup.mode}`);
      for (let i = 0; i < childTimegroups.length; i++) {
        const child = childTimegroups[i] as any;
        console.log(`Child ${i}: start=${child.startTimeMs}ms, end=${child.endTimeMs}ms, duration=${child.durationMs}ms`);
      }

      const { blankIndices } = await captureAndReport(
        nestedAnimatedTimegroup,
        timestamps,
        "native",
      );

      expect(blankIndices.length).toBe(0);
    });

    test("foreignObject: thumbnails from nested animated timegroup - none blank", async ({
      nestedAnimatedTimegroup,
    }) => {
      setNativeCanvasApiEnabled(false);
      const durationMs = nestedAnimatedTimegroup.durationMs || 35000;
      const timestamps = generateTimestamps(durationMs, THUMBNAIL_COUNT);

      const { blankIndices } = await captureAndReport(
        nestedAnimatedTimegroup,
        timestamps,
        "foreignObject",
      );

      expect(blankIndices.length).toBe(0);
    });

    test("cross-path: both paths produce non-blank thumbnails for nested animated content", async ({
      nestedAnimatedTimegroup,
    }) => {
      const durationMs = nestedAnimatedTimegroup.durationMs || 35000;
      const timestamps = generateTimestamps(durationMs, THUMBNAIL_COUNT);

      setNativeCanvasApiEnabled(false);
      const { blankIndices: foreignBlanks } = await captureAndReport(
        nestedAnimatedTimegroup,
        timestamps,
        "foreignObject",
      );

      setNativeCanvasApiEnabled(true);
      const { blankIndices: nativeBlanks } = await captureAndReport(
        nestedAnimatedTimegroup,
        timestamps,
        "native",
      );

      // Both should have no blanks
      expect(foreignBlanks.length).toBe(0);
      expect(nativeBlanks.length).toBe(0);
    }, 30000);

    test("visual regression: sample thumbnails from nested animated timegroup", async ({
      nestedAnimatedTimegroup,
    }) => {

      // Sample thumbnails from each scene
      // Scene 1: 0-5000ms (intro), Scene 2: 5000-15000ms (video overlay),
      // Scene 3: 15000-25000ms (graphics), Scene 4: 25000-35000ms (video with REC)
      const sampleTimesMs = [
        1000, // Scene 1 - intro
        7500, // Scene 2 - video with overlay
        12500, // Scene 2 - video with overlay (different frame)
        17500, // Scene 3 - animated graphics
        22500, // Scene 3 - animated graphics (different state)
        27500, // Scene 4 - video with REC
        32500, // Scene 4 - video with REC (different frame)
      ];

      for (const useNative of [true, false]) {
        setNativeCanvasApiEnabled(useNative);
        const pathName = useNative ? "native" : "foreign";

        for (const timeMs of sampleTimesMs) {
          const canvas = await captureTimegroupAtTime(nestedAnimatedTimegroup, {
            timeMs,
            scale: THUMBNAIL_SCALE,
          });

          expect(hasCanvasContent(canvas)).toBe(true);

          await expectCanvasToMatchSnapshot(
            canvas,
            "renderTimegroupToCanvas",
            `nested-anim-${timeMs}ms-${pathName}`,
            { threshold: 0.15, acceptableDiffPercentage: 2.0 },
          );
        }
      }
    });
  });

  describe("contentReadyMode: immediate vs blocking", () => {
    /**
     * Check if video content within a canvas has been rendered.
     * Samples the area where video should be and checks for non-background pixels.
     */
    function hasVideoContentInCenter(canvas: HTMLCanvasElement): boolean {
      const ctx = canvas.getContext("2d")!;
      const width = canvas.width;
      const height = canvas.height;

      // Sample the center region where video should be
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);
      const sampleSize = Math.min(40, Math.floor(width / 4));

      // Get pixels from center region
      const imageData = ctx.getImageData(
        centerX - sampleSize / 2,
        centerY - sampleSize / 2,
        sampleSize,
        sampleSize,
      );
      const data = imageData.data;

      // Check if there's variation (video content) vs solid color (hole/background)
      let minR = 255, maxR = 0;
      let minG = 255, maxG = 0;
      let minB = 255, maxB = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minG = Math.min(minG, g);
        maxG = Math.max(maxG, g);
        minB = Math.min(minB, b);
        maxB = Math.max(maxB, b);
      }

      const rangeR = maxR - minR;
      const rangeG = maxG - minG;
      const rangeB = maxB - minB;
      const totalRange = rangeR + rangeG + rangeB;

      // Video content (bars and tone) has distinct color bars with high range
      // A "hole" (blank/background) would have very low range
      return totalRange > 50;
    }

    test("blocking mode waits for video content", async ({ videoTimegroup }) => {
      setNativeCanvasApiEnabled(true);

      // Seek to a different time to force video frame decode
      await videoTimegroup.seek(0);

      // Capture with blocking mode - should wait for video content
      const canvas = await captureTimegroupAtTime(videoTimegroup, {
        timeMs: 3000,
        scale: 0.5,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
      });

      expect(hasCanvasContent(canvas)).toBe(true);
      expect(hasVideoContentInCenter(canvas)).toBe(true);
    });

    test("ContentNotReadyError has correct structure", () => {
      const error = new ContentNotReadyError(1000, 5000, ["video1.mp4", "video2.mp4"]);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ContentNotReadyError");
      expect(error.timeMs).toBe(1000);
      expect(error.timeoutMs).toBe(5000);
      expect(error.blankVideos).toEqual(["video1.mp4", "video2.mp4"]);
      expect(error.message).toContain("1000ms");
      expect(error.message).toContain("5000ms");
      expect(error.message).toContain("video1.mp4");
    });

    test("immediate mode captures without waiting (may have video hole)", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);

      // Capture with immediate mode - should NOT wait for video content
      // This captures whatever is available NOW
      const startTime = performance.now();
      const canvas = await captureTimegroupAtTime(videoTimegroup, {
        timeMs: 5000,
        scale: 0.5,
        contentReadyMode: "immediate",
      });
      const captureTime = performance.now() - startTime;

      // Immediate mode should complete quickly (under 500ms typical)
      // It doesn't wait for video content polling
      expect(captureTime).toBeLessThan(2000);

      // Canvas should have SOME content (background, etc)
      expect(hasCanvasContent(canvas)).toBe(true);
    });

    test("blocking mode produces video content where immediate may not", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);

      // First reset to time 0
      await videoTimegroup.seek(0);

      // Force video canvas to be blank by invalidating it
      const efVideo = videoTimegroup.querySelector("ef-video") as any;
      const shadowCanvas = efVideo?.shadowRoot?.querySelector("canvas");
      if (shadowCanvas) {
        const ctx = shadowCanvas.getContext("2d");
        ctx?.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height);
      }

      // Immediate capture - should be fast but may have blank video
      const immediateCanvas = await captureTimegroupAtTime(videoTimegroup, {
        timeMs: 2000,
        scale: 0.5,
        contentReadyMode: "immediate",
      });

      // Now blocking capture at same time - should have video content
      const blockingCanvas = await captureTimegroupAtTime(videoTimegroup, {
        timeMs: 2000,
        scale: 0.5,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
      });

      // Both should have canvas content (background at minimum)
      expect(hasCanvasContent(immediateCanvas)).toBe(true);
      expect(hasCanvasContent(blockingCanvas)).toBe(true);

      // Blocking should definitely have video content
      expect(hasVideoContentInCenter(blockingCanvas)).toBe(true);
    });

    test("captureBatch uses immediate mode by default", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const timestamps = [0, 1000, 2000, 3000];

      // captureBatch should default to immediate mode
      const startTime = performance.now();
      const canvases = await videoTimegroup.captureBatch(timestamps, {
        scale: 0.25,
        // contentReadyMode defaults to "immediate"
      });
      const batchTime = performance.now() - startTime;

      // All canvases should have content
      expect(canvases.length).toBe(timestamps.length);
      for (const canvas of canvases) {
        expect(hasCanvasContent(canvas)).toBe(true);
      }

      // Batch capture should be relatively fast since it's not blocking
      logger.debug(`captureBatch (immediate) took ${batchTime.toFixed(0)}ms for ${timestamps.length} frames`);
    });

    test("captureBatch with blocking mode waits for video content", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const timestamps = [1000, 2000, 3000];

      // Reset position
      await videoTimegroup.seek(0);

      // captureBatch with explicit blocking mode
      const canvases = await videoTimegroup.captureBatch(timestamps, {
        scale: 0.25,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
      });

      // All canvases should have content INCLUDING video
      expect(canvases.length).toBe(timestamps.length);
      for (const canvas of canvases) {
        expect(hasCanvasContent(canvas)).toBe(true);
        expect(hasVideoContentInCenter(canvas)).toBe(true);
      }
    });

    test("visual regression: immediate vs blocking at same timestamp", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);
      const targetTime = 2000;

      // First ensure video is loaded and at a known state
      await videoTimegroup.seek(0);
      await new Promise((r) => setTimeout(r, 100));

      // Capture with blocking (ensures video content)
      const blockingCanvas = await captureTimegroupAtTime(videoTimegroup, {
        timeMs: targetTime,
        scale: 0.5,
        contentReadyMode: "blocking",
        blockingTimeoutMs: 5000,
      });

      // Save baseline for blocking mode capture
      await expectCanvasToMatchSnapshot(
        blockingCanvas,
        "renderTimegroupToCanvas",
        "content-ready-blocking-2000ms",
        { threshold: 0.15, acceptableDiffPercentage: 1.0 },
      );

      // Capture with immediate at same time
      const immediateCanvas = await captureTimegroupAtTime(videoTimegroup, {
        timeMs: targetTime,
        scale: 0.5,
        contentReadyMode: "immediate",
      });

      // Save baseline for immediate mode capture
      await expectCanvasToMatchSnapshot(
        immediateCanvas,
        "renderTimegroupToCanvas",
        "content-ready-immediate-2000ms",
        { threshold: 0.15, acceptableDiffPercentage: 1.0 },
      );
    });
  });

  describe("DOM vs Clone visual parity", () => {
    /**
     * Capture the original timegroup DOM directly to canvas (what DOM mode shows).
     * Uses native drawElementImage API to render the actual element.
     * 
     * The element is temporarily moved into a capture canvas, then restored to its
     * original position in the DOM. This captures exactly what the user sees in DOM mode.
     */
    async function captureDomDirectly(
      timegroup: EFTimegroup,
      scale: number = 1,
    ): Promise<HTMLCanvasElement> {
      const width = timegroup.offsetWidth || 1920;
      const height = timegroup.offsetHeight || 1080;
      const dpr = window.devicePixelRatio || 1;

      // Save original parent and position for restoration
      const originalParent = timegroup.parentElement;
      const originalNextSibling = timegroup.nextSibling;

      // Create output canvas
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = Math.floor(width * scale * dpr);
      outputCanvas.height = Math.floor(height * scale * dpr);

      try {
        // Capture using native API (this temporarily moves the element)
        const capturedCanvas = await renderToImageNative(
          timegroup,
          width,
          height,
          { waitForPaint: true },
        );

        // Draw to output canvas with scaling
        const ctx = outputCanvas.getContext("2d")!;
        ctx.scale(dpr * scale, dpr * scale);
        ctx.drawImage(capturedCanvas, 0, 0);
      } finally {
        // Restore element to original position
        if (originalParent) {
          // Check if nextSibling is still valid (it might have been removed)
          if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
            originalParent.insertBefore(timegroup, originalNextSibling);
          } else {
            originalParent.appendChild(timegroup);
          }
        }
      }

      return outputCanvas;
    }

    /**
     * Capture the clone structure to canvas (what Clone mode shows).
     * Uses buildCloneStructure + syncStyles (the same mechanism as EFWorkbench Clone mode).
     * This is the actual rendering path used in Clone mode.
     */
    async function captureClone(
      timegroup: EFTimegroup,
      scale: number = 1,
    ): Promise<HTMLCanvasElement> {
      const width = timegroup.offsetWidth || 1920;
      const height = timegroup.offsetHeight || 1080;
      const dpr = window.devicePixelRatio || 1;

      // Build clone structure (same as Clone mode in workbench)
      // Styles are synced during clone building in a single pass
      const { container, syncState } = buildCloneStructure(timegroup, timegroup.currentTimeMs ?? 0);

      // Create wrapper with proper dimensions (mimics renderTimegroupPreview)
      const previewContainer = document.createElement("div");
      previewContainer.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        position: relative;
        overflow: hidden;
        background: ${getComputedStyle(timegroup).background || "#000"};
      `;

      // Inject document styles (for CSS rules to work)
      const styleEl = document.createElement("style");
      styleEl.textContent = collectDocumentStyles();
      previewContainer.appendChild(styleEl);
      previewContainer.appendChild(container);

      // Ensure clone root is visible (mimic workbench's initCloneOverlay behavior)
      const cloneRoot = syncState.tree.root?.clone;
      if (cloneRoot) {
        cloneRoot.style.clipPath = "none";
        cloneRoot.style.opacity = "1";
        cloneRoot.style.position = "relative";
        cloneRoot.style.top = "0";
        cloneRoot.style.left = "0";
      }

      // Create output canvas
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = Math.floor(width * scale * dpr);
      outputCanvas.height = Math.floor(height * scale * dpr);

      // Capture the clone structure using native API
      const capturedCanvas = await renderToImageNative(
        previewContainer,
        width,
        height,
        { waitForPaint: true },
      );

      // Draw to output canvas with scaling
      const ctx = outputCanvas.getContext("2d")!;
      ctx.scale(dpr * scale, dpr * scale);
      ctx.drawImage(capturedCanvas, 0, 0);

      return outputCanvas;
    }

    test("simple HTML: DOM and Clone produce identical visual output", async ({
      htmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);

      const domCanvas = await captureDomDirectly(htmlTimegroup, 1);
      const cloneCanvas = await captureClone(htmlTimegroup, 1);

      expect(hasCanvasContent(domCanvas)).toBe(true);
      expect(hasCanvasContent(cloneCanvas)).toBe(true);

      // Compare DOM vs Clone - they should be identical
      await expectCanvasesToMatch(
        domCanvas,
        cloneCanvas,
        "dom-vs-clone",
        "simple-html",
        { threshold: 0.1, acceptableDiffPercentage: 1.0 },
      );
    });

    test("complex HTML: DOM and Clone produce identical visual output", async ({
      complexHtmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);

      const domCanvas = await captureDomDirectly(complexHtmlTimegroup, 0.5);
      const cloneCanvas = await captureClone(complexHtmlTimegroup, 0.5);

      expect(hasCanvasContent(domCanvas)).toBe(true);
      expect(hasCanvasContent(cloneCanvas)).toBe(true);

      await expectCanvasesToMatch(
        domCanvas,
        cloneCanvas,
        "dom-vs-clone",
        "complex-html",
        { threshold: 0.1, acceptableDiffPercentage: 1.0 },
      );
    });

    test("video: DOM and Clone produce identical visual output", async ({
      videoTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);

      // Seek to a specific time
      await videoTimegroup.seek(2000);

      const domCanvas = await captureDomDirectly(videoTimegroup, 0.5);
      const cloneCanvas = await captureClone(videoTimegroup, 0.5);

      expect(hasCanvasContent(domCanvas)).toBe(true);
      expect(hasCanvasContent(cloneCanvas)).toBe(true);

      await expectCanvasesToMatch(
        domCanvas,
        cloneCanvas,
        "dom-vs-clone",
        "video-frame",
        { threshold: 0.15, acceptableDiffPercentage: 2.0 },
      );
    });

    test("visual snapshots: DOM vs Clone for debugging", async ({
      htmlTimegroup,
    }) => {
      setNativeCanvasApiEnabled(true);

      const domCanvas = await captureDomDirectly(htmlTimegroup, 1);
      const cloneCanvas = await captureClone(htmlTimegroup, 1);

      // Save both as snapshots for visual debugging
      await expectCanvasToMatchSnapshot(
        domCanvas,
        "dom-vs-clone",
        "simple-html-dom-direct",
        { threshold: 0.1, acceptableDiffPercentage: 0.5 },
      );

      await expectCanvasToMatchSnapshot(
        cloneCanvas,
        "dom-vs-clone",
        "simple-html-clone",
        { threshold: 0.1, acceptableDiffPercentage: 0.5 },
      );
    });
  });

  describe("video export (reproduction test for blank frames)", () => {

    test("renderTimegroupToVideo with workbench-style timegroup produces non-blank frames", async () => {
      // Reproduce the exact workbench structure
      const container = document.createElement("div");
      const apiHost = getApiHost();
      
      render(
        html`
        <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
          <ef-workbench style="width: 800px; height: 600px;">
            <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
              <ef-canvas style="width: 480px; height: 320px; display: block;">
                <ef-timegroup id="video-export-test" mode="fixed" duration="1s" 
                  style="width: 480px; height: 320px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">
                  <div style="position: absolute; inset: 40px; background: #ff0000; border-radius: 8px;"></div>
                  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    font-size: 32px; color: white; font-weight: bold;">TEST CONTENT</div>
                </ef-timegroup>
              </ef-canvas>
            </ef-pan-zoom>
          </ef-workbench>
        </ef-configuration>
      `,
        container,
      );
      document.body.appendChild(container);

      const workbench = container.querySelector("ef-workbench") as any;
      const timegroup = container.querySelector("#video-export-test") as EFTimegroup;

      await workbench.updateComplete;
      await timegroup.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 500));

      // Render video using the same path as workbench
      const videoBuffer = await renderTimegroupToVideo(timegroup, {
        fps: 10,
        scale: 0.25,
        fromMs: 0,
        toMs: 500,
        returnBuffer: true,
        streaming: false,
      });

      expect(videoBuffer).toBeDefined();
      expect(videoBuffer!.length).toBeGreaterThan(1000);
      
      logger.debug(`[Workbench Video Export Test] Video buffer size: ${videoBuffer!.length} bytes`);
      
      // Decode first frame to verify it has content
      // Use VideoDecoder to check actual frame data
      const frameData = await decodeFirstFrame(videoBuffer!);
      expect(frameData.hasContent, "First frame should have non-black content").toBe(true);
      
      logger.debug(`[Workbench Video Export Test] First frame: ${frameData.width}x${frameData.height}, hasContent: ${frameData.hasContent}, samplePixel: rgba(${frameData.samplePixel.join(",")})`);

      container.remove();
    }, 30000);

    test("renderTimegroupToVideo with NESTED sequence timegroups (design-catalog structure) produces non-blank frames", async () => {
      // This reproduces the design-catalog structure which has:
      // - root-timegroup (mode="sequence")
      // - nested acts (mode="sequence" or "fixed")
      // - nested scenes (mode="fixed")
      const container = document.createElement("div");
      const apiHost = getApiHost();
      
      render(
        html`
        <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
          <ef-workbench style="width: 800px; height: 600px;">
            <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
              <ef-canvas style="width: 1920px; height: 1080px; display: block;">
                <ef-timegroup id="root-timegroup" mode="sequence" 
                  style="width: 1920px; height: 1080px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">
                  
                  <!-- Act 1: Fixed duration scene -->
                  <ef-timegroup mode="fixed" duration="2s" class="act-1"
                    style="width: 100%; height: 100%; background: #ff3333;">
                    <div style="position: absolute; inset: 100px; background: #ffffff; border-radius: 16px;">
                      <div style="padding: 40px; font-size: 48px; color: #333; font-weight: bold;">Scene 1: RED</div>
                    </div>
                  </ef-timegroup>
                  
                  <!-- Act 2: Another fixed scene -->
                  <ef-timegroup mode="fixed" duration="2s" class="act-2"
                    style="width: 100%; height: 100%; background: #33ff33;">
                    <div style="position: absolute; inset: 100px; background: #ffffff; border-radius: 16px;">
                      <div style="padding: 40px; font-size: 48px; color: #333; font-weight: bold;">Scene 2: GREEN</div>
                    </div>
                  </ef-timegroup>
                  
                  <!-- Act 3: Nested sequence -->
                  <ef-timegroup mode="sequence" duration="4s" class="act-3">
                    <ef-timegroup mode="fixed" duration="2s" class="scene-3a"
                      style="width: 100%; height: 100%; background: #3333ff;">
                      <div style="position: absolute; inset: 100px; background: #ffffff; border-radius: 16px;">
                        <div style="padding: 40px; font-size: 48px; color: #333; font-weight: bold;">Scene 3a: BLUE</div>
                      </div>
                    </ef-timegroup>
                    <ef-timegroup mode="fixed" duration="2s" class="scene-3b"
                      style="width: 100%; height: 100%; background: #ff33ff;">
                      <div style="position: absolute; inset: 100px; background: #ffffff; border-radius: 16px;">
                        <div style="padding: 40px; font-size: 48px; color: #333; font-weight: bold;">Scene 3b: MAGENTA</div>
                      </div>
                    </ef-timegroup>
                  </ef-timegroup>
                  
                </ef-timegroup>
              </ef-canvas>
            </ef-pan-zoom>
          </ef-workbench>
        </ef-configuration>
      `,
        container,
      );
      document.body.appendChild(container);

      const workbench = container.querySelector("ef-workbench") as any;
      const timegroup = container.querySelector("#root-timegroup") as EFTimegroup;

      await workbench.updateComplete;
      await timegroup.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 1000));
      

      // Render video using the same path as workbench
      const videoBuffer = await renderTimegroupToVideo(timegroup, {
        fps: 10,
        scale: 0.25, // 480x270 output
        fromMs: 0,
        toMs: 2000, // First 2 seconds = Scene 1 (RED)
        returnBuffer: true,
        streaming: false,
      });

      expect(videoBuffer).toBeDefined();
      expect(videoBuffer!.length).toBeGreaterThan(1000);
      
      
      // Decode first frame to verify it has content (should be RED scene)
      const frameData = await decodeFirstFrame(videoBuffer!);
      
      // First frame should have content
      expect(frameData.hasContent, "First frame should have non-black content").toBe(true);
      
      // First frame should be RED (from Act 1) - check that R channel is high
      expect(frameData.samplePixel[0]).toBeGreaterThan(100); // Red channel should be high

      container.remove();
    }, 30000);

    test("video export should output at logical dimensions and have correct content", async () => {
      // REGRESSION TEST: Verifies video export produces correct output:
      // 1. Output video dimensions should be logical pixels (1920x1080), not DPR-scaled
      // 2. Frame content should be non-black (actual rendered content)
      // 3. Performance should be reasonable (<100ms/frame at 1080p)
      //
      // Note: The capture canvas IS at DPR dimensions (required by drawElementImage),
      // but the output video is correctly scaled to logical dimensions.
      
      const container = document.createElement("div");
      const apiHost = getApiHost();
      
      render(
        html`
        <ef-configuration api-host="${apiHost}" signing-url="/@ef-sign-url">
          <ef-timegroup id="dpr-test" mode="fixed" duration="1s" 
            style="width: 1920px; height: 1080px; background: #ff0000;">
            <div style="position: absolute; inset: 40px; background: #ffffff;"></div>
          </ef-timegroup>
        </ef-configuration>
      `,
        container,
      );
      document.body.appendChild(container);

      const timegroup = container.querySelector("#dpr-test") as EFTimegroup;
      await timegroup.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 200));

      // Capture timing metrics during export
      const startTime = performance.now();
      
      const videoBuffer = await renderTimegroupToVideo(timegroup, {
        fps: 30,
        scale: 1, // Full resolution - no scaling
        fromMs: 0,
        toMs: 100, // Just 3 frames to keep test fast
        returnBuffer: true,
        streaming: false,
      });
      
      const elapsed = performance.now() - startTime;
      const frames = 3;
      const msPerFrame = elapsed / frames;
      
      logger.debug(`[DPR Test] ${frames} frames in ${elapsed.toFixed(0)}ms (${msPerFrame.toFixed(1)}ms/frame)`);
      
      // Performance check - should be reasonable even on high-DPI displays
      expect(msPerFrame).toBeLessThan(100);
      
      // Verify output dimensions match logical dimensions (not DPR-scaled)
      const frameData = await decodeFirstFrame(videoBuffer!);
      
      // Output should be at logical dimensions (1920x1080)
      expect(frameData.width).toBe(1920);
      expect(frameData.height).toBe(1080);
      
      // Output should have actual content (not black/blank)
      expect(frameData.hasContent, "Video output should have non-black content").toBe(true);
      
      logger.debug(`[DPR Test] Output: ${frameData.width}x${frameData.height}, hasContent: ${frameData.hasContent}`);

      container.remove();
    }, 30000);
  });

});

/**
 * Decode the first frame of an MP4 video and check if it has non-black content
 */
async function decodeFirstFrame(videoBuffer: Uint8Array): Promise<{
  width: number;
  height: number;
  hasContent: boolean;
  samplePixel: [number, number, number, number];
}> {
  // Create a video element and load the buffer
  const blob = new Blob([videoBuffer], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);
  
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  
  // Wait for video to load metadata
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
  });
  
  // Seek to first frame
  video.currentTime = 0;
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });
  
  // Draw video frame to canvas
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0);
  
  // Sample pixel at center
  const centerX = Math.floor(canvas.width / 2);
  const centerY = Math.floor(canvas.height / 2);
  const centerPixel = ctx.getImageData(centerX, centerY, 1, 1).data;
  
  // Check if frame has non-black content
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let nonBlackPixels = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i]!;
    const g = imageData.data[i + 1]!;
    const b = imageData.data[i + 2]!;
    // Consider non-black if any channel > 10
    if (r > 10 || g > 10 || b > 10) {
      nonBlackPixels++;
    }
  }
  
  const totalPixels = canvas.width * canvas.height;
  const hasContent = nonBlackPixels > totalPixels * 0.1; // At least 10% non-black
  
  // Clean up
  URL.revokeObjectURL(url);
  
  return {
    width: canvas.width,
    height: canvas.height,
    hasContent,
    samplePixel: [centerPixel[0]!, centerPixel[1]!, centerPixel[2]!, centerPixel[3]!],
  };
}

// ============================================================================
// BENCHMARK: Parallel Image Loading Queue Depth
// ============================================================================

describe("benchmark: 2026 Chromium optimizations", () => {
  // Result: Blob URLs and createImageBitmap still taint canvas with foreignObject
  // Data URI remains the only viable option (as of 2025)
  test.skip("Blob URL vs Data URI vs createImageBitmap", async () => {
    const NUM_IMAGES = 20;
    const WIDTH = 1920;
    const HEIGHT = 1080;
    
    // Create test SVG with foreignObject
    function createTestSvg(index: number): string {
      const html = `
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(135deg,#667eea,#764ba2);font-family:sans-serif;">
          <h1 style="color:white;font-size:72px;margin:50px;">Frame ${index} - ${Date.now()}</h1>
          ${Array.from({length: 50}, (_, i) => `
            <div style="position:absolute;left:${(i%10)*180}px;top:${Math.floor(i/10)*200+150}px;width:160px;height:160px;background:hsl(${i*20},70%,50%);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;">
              Item ${i}
            </div>
          `).join('')}
        </div>
      `;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
    }
    
    const testCanvas = document.createElement("canvas");
    testCanvas.width = WIDTH;
    testCanvas.height = HEIGHT;
    const ctx = testCanvas.getContext("2d")!;
    
    // METHOD 1: Data URI (current approach)
    async function loadViaDataUri(svg: string): Promise<HTMLImageElement> {
      const base64 = btoa(unescape(encodeURIComponent(svg)));
      const dataUri = `data:image/svg+xml;base64,${base64}`;
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUri;
      });
    }
    
    // METHOD 2: Blob URL (2026 non-tainting improvement)
    async function loadViaBlobUrl(svg: string): Promise<HTMLImageElement> {
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(e);
        };
        img.src = url;
      });
    }
    
    // METHOD 3: createImageBitmap from loaded Image (GPU-ready texture)
    async function loadViaImageBitmap(svg: string): Promise<ImageBitmap> {
      // First load via blob URL, then create ImageBitmap for GPU transfer
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
      });
      URL.revokeObjectURL(url);
      // createImageBitmap creates a GPU-ready texture from the decoded image
      return createImageBitmap(img);
    }
    
    // Generate unique SVGs for each test
    const svgs1 = Array.from({length: NUM_IMAGES}, (_, i) => createTestSvg(i * 1000));
    const svgs2 = Array.from({length: NUM_IMAGES}, (_, i) => createTestSvg(i * 2000));
    const svgs3 = Array.from({length: NUM_IMAGES}, (_, i) => createTestSvg(i * 3000));
    
    // Test 1: Data URI
    let dataUriTaintError = false;
    const dataUriStart = performance.now();
    for (const svg of svgs1) {
      const img = await loadViaDataUri(svg);
      ctx.drawImage(img, 0, 0);
      try {
        ctx.getImageData(0, 0, 1, 1); // Test for tainting
      } catch (e) {
        dataUriTaintError = true;
      }
    }
    const dataUriTime = performance.now() - dataUriStart;
    
    // Test 2: Blob URL
    let blobUrlTaintError = false;
    const blobUrlStart = performance.now();
    for (const svg of svgs2) {
      const img = await loadViaBlobUrl(svg);
      ctx.drawImage(img, 0, 0);
      try {
        ctx.getImageData(0, 0, 1, 1); // Test for tainting
      } catch (e) {
        blobUrlTaintError = true;
      }
    }
    const blobUrlTime = performance.now() - blobUrlStart;
    
    // Test 3: createImageBitmap
    let imageBitmapTaintError = false;
    const imageBitmapStart = performance.now();
    for (const svg of svgs3) {
      const bitmap = await loadViaImageBitmap(svg);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close(); // Free GPU memory
      try {
        ctx.getImageData(0, 0, 1, 1); // Test for tainting
      } catch (e) {
        imageBitmapTaintError = true;
      }
    }
    const imageBitmapTime = performance.now() - imageBitmapStart;
    
    console.log(`\n========== 2026 CHROMIUM OPTIMIZATIONS BENCHMARK ==========`);
    console.log(`Images: ${NUM_IMAGES} @ ${WIDTH}x${HEIGHT}`);
    console.log(`-----------------------------------------------------------`);
    console.log(`Data URI:        ${dataUriTime.toFixed(0)}ms total, ${(dataUriTime/NUM_IMAGES).toFixed(1)}ms/frame, tainted: ${dataUriTaintError}`);
    console.log(`Blob URL:        ${blobUrlTime.toFixed(0)}ms total, ${(blobUrlTime/NUM_IMAGES).toFixed(1)}ms/frame, tainted: ${blobUrlTaintError}`);
    console.log(`createImageBitmap: ${imageBitmapTime.toFixed(0)}ms total, ${(imageBitmapTime/NUM_IMAGES).toFixed(1)}ms/frame, tainted: ${imageBitmapTaintError}`);
    console.log(`-----------------------------------------------------------`);
    console.log(`Blob URL vs Data URI: ${((dataUriTime/blobUrlTime - 1) * 100).toFixed(0)}% ${blobUrlTime < dataUriTime ? 'faster' : 'slower'}`);
    console.log(`ImageBitmap vs Data URI: ${((dataUriTime/imageBitmapTime - 1) * 100).toFixed(0)}% ${imageBitmapTime < dataUriTime ? 'faster' : 'slower'}`);
    console.log(`===========================================================\n`);
    
    // Data URI is the only method that doesn't taint (as of 2025)
    // Blob URLs and createImageBitmap still cause tainting with foreignObject
    expect(dataUriTaintError).toBe(false); // Data URI must work
    // Note: blobUrlTaintError and imageBitmapTaintError are expected to be true
    console.log(`[INFO] Blob URL tainting: ${blobUrlTaintError ? 'CONFIRMED (expected)' : 'NOT TAINTED (2026 improvement available!)'}`);
  }, 60000);
});

describe("benchmark: parallel image loading queue depth", () => {
  // Benchmark shows: depth=2 optimal, deeper queues cause contention
  // Our current pipeline is effectively depth=2, so no benefit to going deeper
  test.skip("compare sequential vs parallel SVG image loading", async () => {
    const NUM_IMAGES = 30;
    const WIDTH = 1920;
    const HEIGHT = 1080;
    
    // Create realistic SVG foreignObject content (similar to actual render ~200KB)
    function createTestSvgDataUri(index: number): string {
      // Create HTML content with complexity similar to design-catalog
      // Target: ~200KB serialized size to match real-world renders
      const styles = Array.from({length: 50}, (_, i) => `
        .item-${i} { 
          position: absolute;
          width: ${50 + i * 2}px; 
          height: ${50 + i * 2}px; 
          background: linear-gradient(135deg, hsl(${(index * 30 + i * 7) % 360}, 70%, 50%), hsl(${(index * 30 + i * 7 + 60) % 360}, 70%, 40%));
          border-radius: ${i % 10}px;
          transform: translate(${(i % 10) * 100}px, ${Math.floor(i / 10) * 120}px) rotate(${i * 3}deg);
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          opacity: ${0.5 + (i % 5) * 0.1};
          filter: blur(${i % 3}px);
        }
      `).join('');
      
      const elements = Array.from({length: 100}, (_, i) => `
        <div class="item-${i % 50}" style="
          left: ${(i % 15) * 120}px;
          top: ${Math.floor(i / 15) * 150}px;
          width: ${80 + (i % 20) * 5}px;
          height: ${80 + (i % 20) * 5}px;
          background-color: rgb(${(index * 10 + i * 3) % 256}, ${(i * 7) % 256}, ${(i * 11) % 256});
          border: ${1 + i % 5}px solid rgba(255,255,255,0.${i % 10});
          font-family: Arial, sans-serif;
          font-size: ${12 + i % 8}px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          overflow: hidden;
        ">
          <span style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px;">
            Element ${i} - Frame ${index}
            <br/>Lorem ipsum dolor sit amet
          </span>
        </div>
      `).join('');
      
      const html = `
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(180deg, #0f0c29, #302b63, #24243e);position:relative;overflow:hidden;">
          <style>${styles}</style>
          ${elements}
          <div style="position:absolute;bottom:20px;right:20px;color:white;font-size:48px;font-weight:bold;text-shadow:0 2px 10px rgba(0,0,0,0.5);">
            Frame ${index}
          </div>
        </div>
      `;
      
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
      const base64 = btoa(unescape(encodeURIComponent(svg)));
      return `data:image/svg+xml;base64,${base64}`;
    }
    
    // Test function: load image and return it (we'll draw after to ensure decode)
    function loadImage(dataUri: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUri;
      });
    }
    
    // Create canvas for drawing (forces full decode)
    const testCanvas = document.createElement("canvas");
    testCanvas.width = WIDTH;
    testCanvas.height = HEIGHT;
    const testCtx = testCanvas.getContext("2d")!;
    
    // Draw image to canvas to ensure full decode
    function drawImage(img: HTMLImageElement): void {
      testCtx.clearRect(0, 0, testCanvas.width, testCanvas.height);
      testCtx.drawImage(img, 0, 0);
    }
    
    // Generate data URIs fresh for each test to prevent caching
    // Add timestamp to make each truly unique
    function generateFreshDataUris(): string[] {
      const timestamp = performance.now();
      return Array.from({length: NUM_IMAGES}, (_, i) => {
        // Add unique timestamp to prevent any caching
        return createTestSvgDataUri(i).replace('Frame ', `Frame ${timestamp.toFixed(3)}-`);
      });
    }
    
    const sampleUri = createTestSvgDataUri(0);
    console.log(`Generated SVG data URIs (~${(sampleUri.length / 1024).toFixed(1)}KB each)`);
    
    // SEQUENTIAL: Load one at a time, draw after each (fresh data URIs)
    const seqUris = generateFreshDataUris();
    const seqStart = performance.now();
    for (const uri of seqUris) {
      const img = await loadImage(uri);
      drawImage(img);
    }
    const seqTime = performance.now() - seqStart;
    const seqPerFrame = seqTime / NUM_IMAGES;
    
    // PARALLEL QUEUE DEPTH 2: Load 2 at a time, draw in order
    const q2Uris = generateFreshDataUris();
    const q2Start = performance.now();
    {
      const pending: Array<{idx: number, promise: Promise<HTMLImageElement>}> = [];
      let nextIdx = 0;
      let drawIdx = 0;
      const loaded: Map<number, HTMLImageElement> = new Map();
      
      // Fill initial queue
      while (pending.length < 2 && nextIdx < NUM_IMAGES) {
        const idx = nextIdx++;
        pending.push({idx, promise: loadImage(q2Uris[idx]!)});
      }
      
      // Process queue
      while (drawIdx < NUM_IMAGES) {
        // Wait for any pending to complete
        const completed = await Promise.race(pending.map(p => p.promise.then(img => ({idx: p.idx, img}))));
        loaded.set(completed.idx, completed.img);
        pending.splice(pending.findIndex(p => p.idx === completed.idx), 1);
        
        // Add next to queue
        if (nextIdx < NUM_IMAGES) {
          const idx = nextIdx++;
          pending.push({idx, promise: loadImage(q2Uris[idx]!)});
        }
        
        // Draw in order
        while (loaded.has(drawIdx)) {
          drawImage(loaded.get(drawIdx)!);
          loaded.delete(drawIdx);
          drawIdx++;
        }
      }
    }
    const q2Time = performance.now() - q2Start;
    const q2PerFrame = q2Time / NUM_IMAGES;
    
    // PARALLEL QUEUE DEPTH 4
    const q4Uris = generateFreshDataUris();
    const q4Start = performance.now();
    {
      const pending: Array<{idx: number, promise: Promise<HTMLImageElement>}> = [];
      let nextIdx = 0;
      let drawIdx = 0;
      const loaded: Map<number, HTMLImageElement> = new Map();
      
      while (pending.length < 4 && nextIdx < NUM_IMAGES) {
        const idx = nextIdx++;
        pending.push({idx, promise: loadImage(q4Uris[idx]!)});
      }
      
      while (drawIdx < NUM_IMAGES) {
        const completed = await Promise.race(pending.map(p => p.promise.then(img => ({idx: p.idx, img}))));
        loaded.set(completed.idx, completed.img);
        pending.splice(pending.findIndex(p => p.idx === completed.idx), 1);
        
        if (nextIdx < NUM_IMAGES) {
          const idx = nextIdx++;
          pending.push({idx, promise: loadImage(q4Uris[idx]!)});
        }
        
        while (loaded.has(drawIdx)) {
          drawImage(loaded.get(drawIdx)!);
          loaded.delete(drawIdx);
          drawIdx++;
        }
      }
    }
    const q4Time = performance.now() - q4Start;
    const q4PerFrame = q4Time / NUM_IMAGES;
    
    // PARALLEL QUEUE DEPTH 8
    const q8Uris = generateFreshDataUris();
    const q8Start = performance.now();
    {
      const pending: Array<{idx: number, promise: Promise<HTMLImageElement>}> = [];
      let nextIdx = 0;
      let drawIdx = 0;
      const loaded: Map<number, HTMLImageElement> = new Map();
      
      while (pending.length < 8 && nextIdx < NUM_IMAGES) {
        const idx = nextIdx++;
        pending.push({idx, promise: loadImage(q8Uris[idx]!)});
      }
      
      while (drawIdx < NUM_IMAGES) {
        const completed = await Promise.race(pending.map(p => p.promise.then(img => ({idx: p.idx, img}))));
        loaded.set(completed.idx, completed.img);
        pending.splice(pending.findIndex(p => p.idx === completed.idx), 1);
        
        if (nextIdx < NUM_IMAGES) {
          const idx = nextIdx++;
          pending.push({idx, promise: loadImage(q8Uris[idx]!)});
        }
        
        while (loaded.has(drawIdx)) {
          drawImage(loaded.get(drawIdx)!);
          loaded.delete(drawIdx);
          drawIdx++;
        }
      }
    }
    const q8Time = performance.now() - q8Start;
    const q8PerFrame = q8Time / NUM_IMAGES;
    
    // FULLY PARALLEL: Load all at once, draw in order
    const allUris = generateFreshDataUris();
    const allStart = performance.now();
    const allImages = await Promise.all(allUris.map(loadImage));
    for (const img of allImages) {
      drawImage(img);
    }
    const allTime = performance.now() - allStart;
    const allPerFrame = allTime / NUM_IMAGES;
    
    console.log(`\n========== PARALLEL IMAGE LOADING BENCHMARK ==========`);
    console.log(`Images: ${NUM_IMAGES} @ ${WIDTH}x${HEIGHT}`);
    console.log(`-------------------------------------------------------`);
    console.log(`Sequential (depth=1): ${seqTime.toFixed(0)}ms total, ${seqPerFrame.toFixed(1)}ms/frame`);
    console.log(`Queue depth=2:        ${q2Time.toFixed(0)}ms total, ${q2PerFrame.toFixed(1)}ms/frame (${((seqTime/q2Time - 1) * 100).toFixed(0)}% faster)`);
    console.log(`Queue depth=4:        ${q4Time.toFixed(0)}ms total, ${q4PerFrame.toFixed(1)}ms/frame (${((seqTime/q4Time - 1) * 100).toFixed(0)}% faster)`);
    console.log(`Queue depth=8:        ${q8Time.toFixed(0)}ms total, ${q8PerFrame.toFixed(1)}ms/frame (${((seqTime/q8Time - 1) * 100).toFixed(0)}% faster)`);
    console.log(`Fully parallel:       ${allTime.toFixed(0)}ms total, ${allPerFrame.toFixed(1)}ms/frame (${((seqTime/allTime - 1) * 100).toFixed(0)}% faster)`);
    console.log(`=======================================================\n`);
  }, 60000);
});

/**
 * Reproduction test for clone-timeline video rendition issue.
 * 
 * Validates hypothesis: cloned ef-video elements should have their media engine
 * with videoRendition available after createRenderClone() completes.
 */
describe("clone-timeline video rendition (reproduction)", () => {
  test("createRenderClone: cloned video has same media engine type and videoRendition as original", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" id="clone-test-timegroup"
          style="width: 800px; height: 450px; background: #1a1a2e;">
          <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();
    
    // Get original video and its media engine state
    const originalVideo = timegroup.querySelector("ef-video") as any;
    expect(originalVideo).toBeTruthy();
    
    const originalMediaEngine = originalVideo.mediaEngineTask?.value;
    expect(originalMediaEngine).toBeTruthy();
    
    const originalVideoRendition = originalMediaEngine.getVideoRendition();
    console.log("Original video rendition:", originalVideoRendition);
    console.log("Original media engine type:", originalMediaEngine.constructor.name);
    expect(originalVideoRendition).toBeTruthy();
    
    // Create render clone (this is what captureBatch uses)
    const { clone, cleanup } = await timegroup.createRenderClone();
    
    try {
      // Get cloned video
      const clonedVideo = clone.querySelector("ef-video") as any;
      expect(clonedVideo).toBeTruthy();
      
      // Verify cloned video has media engine
      const clonedMediaEngine = clonedVideo.mediaEngineTask?.value;
      console.log("Cloned media engine:", clonedMediaEngine);
      console.log("Cloned media engine type:", clonedMediaEngine?.constructor.name);
      expect(clonedMediaEngine).toBeTruthy();
      
      // KEY TEST: Does the clone have videoRendition?
      const clonedVideoRendition = clonedMediaEngine.getVideoRendition();
      console.log("Cloned video rendition:", clonedVideoRendition);
      
      // This is the assertion that should fail if the hypothesis is correct
      expect(clonedVideoRendition).toBeTruthy();
      
      // Verify same media engine type
      expect(clonedMediaEngine.constructor.name).toBe(originalMediaEngine.constructor.name);
      
      // Verify same rendition structure
      expect(clonedVideoRendition.trackId).toBe(originalVideoRendition.trackId);
      expect(clonedVideoRendition.src).toBe(originalVideoRendition.src);
    } finally {
      cleanup();
      container.remove();
    }
  });
  
  /**
   * Regression test: Clone preserves ef-configuration context
   * 
   * Ensures createRenderClone() wraps the clone in a cloned ef-configuration element,
   * so media elements can access configuration settings like media-engine via closest().
   * Without this, clones would use a different media engine type than the original.
   */
  test("createRenderClone preserves ef-configuration context (media-engine attribute)", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Use media-engine="local" to force AssetMediaEngine
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="" media-engine="local">
        <ef-timegroup mode="contain" id="config-loss-test"
          style="width: 800px; height: 450px; background: #1a1a2e;">
          <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();
    
    // Get original video's configuration context
    const originalVideo = timegroup.querySelector("ef-video") as any;
    const originalConfig = originalVideo.closest("ef-configuration");
    console.log("Original ef-configuration:", originalConfig);
    console.log("Original media-engine attribute:", originalConfig?.mediaEngine);
    expect(originalConfig).toBeTruthy();
    expect(originalConfig.mediaEngine).toBe("local");
    
    const originalMediaEngine = originalVideo.mediaEngineTask?.value;
    console.log("Original media engine type:", originalMediaEngine?.constructor.name);
    expect(originalMediaEngine.constructor.name).toBe("AssetMediaEngine");
    
    // Create render clone
    const { clone, cleanup } = await timegroup.createRenderClone();
    
    try {
      // Get cloned video's configuration context
      const clonedVideo = clone.querySelector("ef-video") as any;
      const clonedConfig = clonedVideo.closest("ef-configuration");
      
      console.log("Cloned ef-configuration:", clonedConfig);
      console.log("Cloned media-engine attribute:", clonedConfig?.mediaEngine);
      
      // Clone should have ef-configuration parent with same settings
      expect(clonedConfig).toBeTruthy();
      expect(clonedConfig.mediaEngine).toBe("local");
      
      const clonedMediaEngine = clonedVideo.mediaEngineTask?.value;
      console.log("Cloned media engine type:", clonedMediaEngine?.constructor.name);
      
      // Clone should use same media engine type as original
      expect(clonedMediaEngine.constructor.name).toBe("AssetMediaEngine")
      
    } finally {
      cleanup();
      container.remove();
    }
  });
  
  test("createRenderClone: seek on clone triggers unifiedVideoSeekTask without error", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" id="seek-test-timegroup"
          style="width: 800px; height: 450px; background: #1a1a2e;">
          <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();
    
    // Create render clone
    const { clone, cleanup } = await timegroup.createRenderClone();
    
    try {
      // Get cloned video
      const clonedVideo = clone.querySelector("ef-video") as any;
      
      // This seek should trigger unifiedVideoSeekTask - if the bug exists, this will error
      await clone.seek(1000);
      
      // Wait for video seek task to complete
      if (clonedVideo.unifiedVideoSeekTask) {
        await clonedVideo.unifiedVideoSeekTask.taskComplete;
      }
      
      // If we get here without error, the rendition was available
      expect(true).toBe(true);
    } finally {
      cleanup();
      container.remove();
    }
  });
  
  test("captureBatch: captures thumbnails without 'Video rendition unavailable' error", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-timegroup mode="contain" id="capture-test-timegroup"
          style="width: 800px; height: 450px; background: #1a1a2e;">
          <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();
    
    try {
      // This is what EFThumbnailStrip does - should not throw "Video rendition unavailable"
      const canvases = await timegroup.captureBatch([0, 1000, 2000], {
        scale: 0.25,
        contentReadyMode: "immediate",
      });
      
      expect(canvases.length).toBe(3);
      expect(canvases[0]).toBeInstanceOf(HTMLCanvasElement);
    } finally {
      container.remove();
    }
  });
  
  /**
   * Test that reproduces the local-remote.html configuration:
   * - media-engine="local" with a remote HTTP URL
   * - This forces AssetMediaEngine for remote URLs
   */
  test("createRenderClone with media-engine=local and remote URL", async () => {
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // This mimics local-remote.html: media-engine="local" + http:// src
    // The difference is we use a URL that our test infrastructure can serve
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="" media-engine="local">
        <ef-timegroup mode="contain" id="local-remote-test"
          style="width: 800px; height: 450px; background: #1a1a2e;">
          <ef-video src="${apiHost}/bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
        </ef-timegroup>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    
    // Get original video and check which media engine it uses
    const originalVideo = timegroup.querySelector("ef-video") as any;
    
    // Wait for media engine (this might fail if the URL isn't served with track index)
    try {
      await timegroup.waitForMediaDurations();
    } catch (e) {
      console.log("waitForMediaDurations error (expected for remote URL without track index):", e);
      container.remove();
      // Skip this test if the URL isn't served properly
      return;
    }
    
    const originalMediaEngine = originalVideo.mediaEngineTask?.value;
    console.log("Local-remote original media engine type:", originalMediaEngine?.constructor.name);
    console.log("Local-remote original src:", originalVideo.src);
    
    if (!originalMediaEngine) {
      console.log("No media engine - test infrastructure may not support this URL");
      container.remove();
      return;
    }
    
    const originalVideoRendition = originalMediaEngine.getVideoRendition();
    console.log("Local-remote original video rendition:", originalVideoRendition);
    
    // With media-engine="local", remote URLs use AssetMediaEngine which requires
    // the server to provide track fragment index at /@ef-track/<src>/index.json
    expect(originalMediaEngine.constructor.name).toBe("AssetMediaEngine");
    expect(originalVideoRendition).toBeTruthy();
    
    // Now test clone
    const { clone, cleanup } = await timegroup.createRenderClone();
    
    try {
      const clonedVideo = clone.querySelector("ef-video") as any;
      const clonedMediaEngine = clonedVideo.mediaEngineTask?.value;
      
      console.log("Local-remote cloned media engine type:", clonedMediaEngine?.constructor.name);
      
      const clonedVideoRendition = clonedMediaEngine?.getVideoRendition();
      console.log("Local-remote cloned video rendition:", clonedVideoRendition);
      
      expect(clonedMediaEngine).toBeTruthy();
      expect(clonedVideoRendition).toBeTruthy();
      
      // Seek should work
      await clone.seek(1000);
      
    } finally {
      cleanup();
      container.remove();
    }
  });
});

describe("captions rendering in foreignObject path", () => {
  test("foreignObject: captions data loads in render clone (captions-src)", async () => {
    // This test verifies that when createRenderClone() is called, it waits for
    // captions data to load before returning. This is critical for video export
    // because the foreignObject path needs the captions text to be present when
    // buildCloneStructure() is called.
    
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Import captions elements
    await import("../elements/EFCaptions.js");
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="captions-src-test"
            style="width: 800px; height: 450px; background: #1a1a2e;">
            <ef-captions captions-src="test-captions-simple.json" style="position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); font-size: 32px; color: white;">
              <ef-captions-active-word></ef-captions-active-word>
            </ef-captions>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    await timegroup.waitForMediaDurations();
    
    // Wait for original captions to load
    const originalCaptions = container.querySelector("ef-captions") as any;
    await originalCaptions.unifiedCaptionsDataTask?.taskComplete;
    
    // Create a render clone - this should wait for captions data
    const { clone, cleanup } = await timegroup.createRenderClone();
    
    try {
      // Verify the clone's captions have data loaded
      const cloneCaptions = clone.querySelector("ef-captions") as any;
      expect(cloneCaptions).toBeTruthy();
      
      const cloneCaptionsData = cloneCaptions.unifiedCaptionsDataTask?.value;
      console.log(`Clone captions data loaded: ${!!cloneCaptionsData}`);
      console.log(`Clone captions segments: ${cloneCaptionsData?.segments?.length || 0}`);
      
      // The clone should have captions data
      expect(cloneCaptionsData).toBeTruthy();
      expect(cloneCaptionsData.segments?.length).toBeGreaterThan(0);
      
      // Seek to a time with caption text and verify text is present
      await clone.seek(500);
      const cloneActiveWord = clone.querySelector("ef-captions-active-word") as any;
      await cloneActiveWord?.updateComplete;
      
      const cloneWordText = cloneActiveWord?.shadowRoot?.textContent?.trim();
      console.log(`Clone caption text at 500ms: "${cloneWordText}"`);
      expect(cloneWordText).toBeTruthy();
      
    } finally {
      cleanup();
      container.remove();
    }
  });

  test("foreignObject: captions data copies to render clone (captionsData JS property)", async () => {
    // This test verifies that when captionsData is set via JavaScript property
    // (not captions-src attribute), it gets copied to the render clone.
    // cloneNode() only copies attributes, not JS properties, so we must handle this.
    
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Import captions elements
    await import("../elements/EFCaptions.js");
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="captions-js-test"
            style="width: 800px; height: 450px; background: #1a1a2e;">
            <ef-captions id="test-captions-js" style="position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); font-size: 32px; color: white;">
              <ef-captions-active-word></ef-captions-active-word>
            </ef-captions>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    await timegroup.updateComplete;
    
    // Set captions data via JavaScript property (simulating user code like improv-edit.html)
    const originalCaptions = container.querySelector("ef-captions") as any;
    originalCaptions.captionsData = {
      segments: [
        { start: 0, end: 1, text: "First segment" },
        { start: 1, end: 2, text: "Second segment" },
      ],
      word_segments: [
        { start: 0.2, end: 0.8, text: "JSWord1" },
        { start: 1.2, end: 1.8, text: "JSWord2" },
      ],
    };
    
    // Wait for the task to process the new data
    await originalCaptions.updateComplete;
    if (originalCaptions.unifiedCaptionsDataTask?.status === 0) { // INITIAL
      originalCaptions.unifiedCaptionsDataTask.run().catch(() => {
        // AbortErrors are expected during cleanup
      });
    }
    await originalCaptions.unifiedCaptionsDataTask?.taskComplete;
    
    // Create a render clone - this should copy captionsData
    const { clone, cleanup } = await timegroup.createRenderClone();
    
    try {
      // Verify the clone's captions have the JS-set data
      const cloneCaptions = clone.querySelector("ef-captions") as any;
      expect(cloneCaptions).toBeTruthy();
      
      // The key test: captionsData should be copied to the clone
      expect(cloneCaptions.captionsData).toBeTruthy();
      console.log(`Clone captionsData copied: ${!!cloneCaptions.captionsData}`);
      console.log(`Clone captionsData segments: ${cloneCaptions.captionsData?.segments?.length || 0}`);
      
      expect(cloneCaptions.captionsData.segments?.length).toBe(2);
      expect(cloneCaptions.captionsData.word_segments?.length).toBe(2);
      expect(cloneCaptions.captionsData.word_segments[0].text).toBe("JSWord1");
      
      // Wait for unified task to use the copied data
      if (cloneCaptions.unifiedCaptionsDataTask?.status === 0) {
        cloneCaptions.unifiedCaptionsDataTask.run().catch(() => {
          // AbortErrors are expected during cleanup
        });
      }
      await cloneCaptions.unifiedCaptionsDataTask?.taskComplete;
      
      // Seek to a time with caption text and verify
      await clone.seek(500);
      const cloneActiveWord = clone.querySelector("ef-captions-active-word") as any;
      await cloneActiveWord?.updateComplete;
      
      const cloneWordText = cloneActiveWord?.shadowRoot?.textContent?.trim();
      console.log(`Clone caption text at 500ms (JS data): "${cloneWordText}"`);
      expect(cloneWordText).toBe("JSWord1");
      
    } finally {
      cleanup();
      container.remove();
    }
  });
  
  test("foreignObject: syncs shadow DOM text content for caption elements", async () => {
    // This test verifies that caption elements (which render text in shadow DOM)
    // have their text content properly synced when using the foreignObject path.
    // 
    // The issue: buildCloneStructure captures initial shadow DOM text, but
    // syncStyles only syncs light DOM childNodes[0], not shadow DOM text.
    // When caption text changes (e.g., wordText updates), clones don't get updated.
    
    const container = document.createElement("div");
    const apiHost = getApiHost();
    
    // Import captions elements
    await import("../elements/EFCaptions.js");
    
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="captions-test-timegroup"
            style="width: 800px; height: 450px; background: #1a1a2e;">
            <ef-captions style="position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); font-size: 32px; color: white;">
              <ef-captions-active-word></ef-captions-active-word>
            </ef-captions>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
      `,
      container,
    );
    document.body.appendChild(container);
    
    const timegroup = container.querySelector("ef-timegroup") as EFTimegroup;
    const captions = container.querySelector("ef-captions") as any;
    const activeWord = container.querySelector("ef-captions-active-word") as any;
    
    await timegroup.updateComplete;
    
    // Set captions data with multiple words at different times
    captions.captionsData = {
      segments: [{ start: 0, end: 4, text: "Hello World Test" }],
      word_segments: [
        { text: "Hello", start: 0, end: 1 },
        { text: "World", start: 1, end: 2 },
        { text: "Test", start: 2, end: 4 },
      ],
    };
    
    await captions.updateComplete;
    await captions.unifiedCaptionsDataTask?.taskComplete;
    
    // Force foreignObject path
    setNativeCanvasApiEnabled(false);
    
    // Helper to properly seek and wait for captions to update (from existing captions tests)
    const seekAndWait = async (timeMs: number) => {
      timegroup.currentTimeMs = timeMs;
      timegroup.seekTask.run().catch(() => {
        // AbortErrors are expected during cleanup
      });
      await timegroup.seekTask.taskComplete;
      captions.frameTask.run().catch(() => {
        // AbortErrors are expected during cleanup
      });
      await captions.frameTask.taskComplete;
      await activeWord.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await activeWord.updateComplete;
    };
    
    // Seek to time where "Hello" should be visible
    await seekAndWait(500);
    
    // Verify the source element has correct text in shadow DOM
    const sourceText = activeWord.shadowRoot?.textContent?.trim();
    console.log(`Source element text at 500ms: "${sourceText}"`);
    expect(sourceText).toBe("Hello");
    
    // Build clone structure at this time
    const { container: cloneContainer, syncState } = buildCloneStructure(timegroup, 500);
    
    // Find the cloned active word element (it becomes a div in the clone)
    // The clone should have the text "Hello"
    const cloneText = cloneContainer.textContent?.trim();
    console.log(`Clone text content at 500ms: "${cloneText}"`);
    
    // This should contain "Hello" from the initial clone building
    expect(cloneText).toContain("Hello");
    
    // Now seek to a different time where "World" should be visible
    await seekAndWait(1500);
    
    // Verify source element now has "World"
    const sourceText2 = activeWord.shadowRoot?.textContent?.trim();
    console.log(`Source element text at 1500ms: "${sourceText2}"`);
    expect(sourceText2).toBe("World");
    
    // Sync styles to update the clone
    syncStyles(syncState, 1500);
    
    // The clone should now have "World" - THIS IS THE BUG!
    // Currently syncStyles only syncs light DOM text, not shadow DOM text,
    // so the clone will still have "Hello"
    const cloneText2 = cloneContainer.textContent?.trim();
    console.log(`Clone text content at 1500ms after sync: "${cloneText2}"`);
    
    // This assertion will FAIL with the current implementation,
    // proving the bug exists
    expect(cloneText2).toContain("World");
    
    // Re-enable native for other tests
    setNativeCanvasApiEnabled(true);
    container.remove();
  });
});
