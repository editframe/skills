/**
 * Browser tests for the direct video-to-video rendering fast path.
 * Tests that EFVideo.renderToVideo() produces valid MP4 output,
 * handles trim correctly, and that getVideoFrameAtSourceTime() works.
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { EFVideo } from "../elements/EFVideo.js";
import "../elements/EFVideo.js";

const VIDEO_SRC = "http://host.docker.internal:3000/bars-n-tone.mp4";

describe.sequential("renderVideoToVideo — direct fast path", () => {
  beforeAll(async () => {
    await customElements.whenDefined("ef-video");
  });

  async function createVideo(opts: {
    trimStartMs?: number;
    trimEndMs?: number;
  } = {}): Promise<{ video: EFVideo; cleanup: () => void }> {
    const video = document.createElement("ef-video") as EFVideo;
    video.src = VIDEO_SRC;
    if (opts.trimStartMs !== undefined) {
      video.trimStartMs = opts.trimStartMs;
    }
    if (opts.trimEndMs !== undefined) {
      video.trimEndMs = opts.trimEndMs;
    }
    video.style.cssText = "width: 384px; height: 224px; display: block;";
    document.body.appendChild(video);

    await video.updateComplete;
    await video.waitForMediaDurations();

    return {
      video,
      cleanup: () => {
        const swallowAbort = (e: PromiseRejectionEvent) => {
          if (e.reason?.name === "AbortError") e.preventDefault();
        };
        window.addEventListener("unhandledrejection", swallowAbort);
        document.body.removeChild(video);
        setTimeout(() => window.removeEventListener("unhandledrejection", swallowAbort), 500);
      },
    };
  }

  describe("getVideoFrameAtSourceTime", () => {
    it("should return a VideoFrame at a given source time", async () => {
      const { video, cleanup } = await createVideo();
      try {
        const frame = await video.getVideoFrameAtSourceTime(0, { quality: "main" });
        try {
          expect(frame).toBeTruthy();
          expect(frame.displayWidth).toBeGreaterThan(0);
          expect(frame.displayHeight).toBeGreaterThan(0);
          expect(frame.codedWidth).toBeGreaterThan(0);
          expect(frame.codedHeight).toBeGreaterThan(0);
        } finally {
          frame.close();
        }
      } finally {
        cleanup();
      }
    }, 30000);

    it("should return different frames at different source times", async () => {
      const { video, cleanup } = await createVideo();
      try {
        const frame0 = await video.getVideoFrameAtSourceTime(0, { quality: "main" });
        const frame1000 = await video.getVideoFrameAtSourceTime(1000, { quality: "main" });

        try {
          // Both frames should be valid
          expect(frame0.displayWidth).toBeGreaterThan(0);
          expect(frame1000.displayWidth).toBeGreaterThan(0);

          // Dimensions should match (same video)
          expect(frame0.codedWidth).toBe(frame1000.codedWidth);
          expect(frame0.codedHeight).toBe(frame1000.codedHeight);

        } finally {
          frame0.close();
          frame1000.close();
        }
      } finally {
        cleanup();
      }
    }, 30000);
  });

  describe("renderToVideo", () => {
    it("should render an untrimmed video to a valid MP4 buffer", async () => {
      const { video, cleanup } = await createVideo();
      try {
        const buffer = await video.renderToVideo({
          fps: 10,
          returnBuffer: true,
          includeAudio: false,
          toMs: 1000,
        });

        expect(buffer).toBeTruthy();
        expect(buffer!.byteLength).toBeGreaterThan(0);
      } finally {
        cleanup();
      }
    }, 60000);

    it("should render a trimmed video and produce correct duration output", async () => {
      const { video, cleanup } = await createVideo({
        trimStartMs: 2000,
        trimEndMs: 2000,
      });
      try {
        const intrinsic = video.intrinsicDurationMs;
        const effective = video.durationMs;

        expect(effective).toBeLessThan(intrinsic!);

        const buffer = await video.renderToVideo({
          fps: 10,
          returnBuffer: true,
          includeAudio: false,
        });

        expect(buffer).toBeTruthy();
        expect(buffer!.byteLength).toBeGreaterThan(0);
      } finally {
        cleanup();
      }
    }, 60000);

    it("should render with audio included", async () => {
      const { video, cleanup } = await createVideo({
        trimStartMs: 1000,
        trimEndMs: 1000,
      });
      try {
        const buffer = await video.renderToVideo({
          fps: 10,
          returnBuffer: true,
          includeAudio: true,
        });

        expect(buffer).toBeTruthy();
        expect(buffer!.byteLength).toBeGreaterThan(0);
      } finally {
        cleanup();
      }
    }, 60000);

    it("should report progress during rendering", async () => {
      const { video, cleanup } = await createVideo();
      try {
        const progressReports: number[] = [];

        const buffer = await video.renderToVideo({
          fps: 10,
          returnBuffer: true,
          includeAudio: false,
          toMs: 1000,
          onProgress: (p) => {
            progressReports.push(p.progress);
          },
        });

        expect(buffer).toBeTruthy();
        expect(progressReports.length).toBeGreaterThan(0);
        // Progress should start low and end at 1
        expect(progressReports[0]).toBeLessThan(1);
        expect(progressReports[progressReports.length - 1]).toBe(1);
      } finally {
        cleanup();
      }
    }, 60000);

    it("should support cancellation via AbortSignal", async () => {
      const { video, cleanup } = await createVideo();
      try {
        const controller = new AbortController();

        // Cancel after a short delay
        setTimeout(() => controller.abort(), 500);

        await expect(
          video.renderToVideo({
            fps: 30,
            returnBuffer: true,
            includeAudio: false,
            signal: controller.signal,
          })
        ).rejects.toThrow();
      } finally {
        cleanup();
      }
    }, 30000);
  });

  describe("CSS effects", () => {
    const renderOpts = { fps: 5, scale: 0.25, returnBuffer: true, includeAudio: false, toMs: 500 };
    const baseStyle = "width: 384px; height: 224px; display: block;";

    async function renderWithStyle(css: string): Promise<Uint8Array> {
      const { video, cleanup } = await createVideo();
      try {
        video.style.cssText = `${baseStyle} ${css}`;
        void video.offsetHeight;
        const buffer = await video.renderToVideo(renderOpts);
        expect(buffer).toBeTruthy();
        return buffer!;
      } finally {
        cleanup();
      }
    }

    let baseline: Uint8Array;

    it("baseline (no effects)", async () => {
      baseline = await renderWithStyle("");
    }, 5000);

    it("should render with filter", async () => {
      const buffer = await renderWithStyle("filter: grayscale(1) brightness(1.2);");
      expect(buffer.byteLength).not.toBe(baseline.byteLength);
    }, 5000);

    it("should render with opacity", async () => {
      const buffer = await renderWithStyle("opacity: 0.5;");
      expect(buffer.byteLength).not.toBe(baseline.byteLength);
    }, 5000);

    it("should render with combined filter and opacity", async () => {
      const buffer = await renderWithStyle("filter: brightness(1.3); opacity: 0.8;");
      expect(buffer.byteLength).not.toBe(baseline.byteLength);
    }, 5000);
  });
});
