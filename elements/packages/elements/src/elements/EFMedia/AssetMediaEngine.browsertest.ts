import { describe } from "vitest";
import { test as baseTest } from "../../../test/useMSW.js";

import { UrlGenerator } from "../../transcoding/utils/UrlGenerator";
import "../EFVideo.js";
import type { EFVideo } from "../EFVideo.js";
import { AssetMediaEngine } from "./AssetMediaEngine";

const test = baseTest.extend<{
  urlGenerator: UrlGenerator;
  mediaEngine: AssetMediaEngine;
  host: EFVideo;
}>({
  host: async ({}, use: any) => {
    const configuration = document.createElement("ef-configuration");
    const apiHost = `${window.location.protocol}//${window.location.host}`;
    configuration.setAttribute("api-host", apiHost);
    configuration.apiHost = apiHost;

    const host = document.createElement("ef-video");
    configuration.appendChild(host);
    host.src = "bars-n-tone.mp4";
    await use(host as EFVideo);
  },

  urlGenerator: async ({}, use: any) => {
    const apiHost = `${window.location.protocol}//${window.location.host}`;
    const generator = new UrlGenerator(() => apiHost);
    await use(generator);
  },

  mediaEngine: async ({ urlGenerator, host }, use: any) => {
    const engine = await AssetMediaEngine.fetch(host, urlGenerator, host.src);
    await use(engine);
  },
});

describe("AssetMediaEngine", () => {
  test("provides duration from fragment index data", async ({
    mediaEngine,
    expect,
  }) => {
    expect(mediaEngine.durationMs).toBeCloseTo(10031, 0); // Updated: improved mediabunny processing changed duration
  });

  test("provides source URL from constructor", async ({
    mediaEngine,
    host,
    expect,
  }) => {
    expect(mediaEngine.src).toBe(host.src);
  });

  test("returns audio rendition with correct properties", ({
    mediaEngine,
    host,
    expect,
  }) => {
    const audioRendition = mediaEngine.audioRendition;
    expect(audioRendition).toBeDefined();
    expect(audioRendition!.trackId).toBe(2);
    expect(audioRendition!.src).toBe(host.src);
  });

  test("returns video rendition with correct properties", ({
    mediaEngine,
    host,
    expect,
  }) => {
    const videoRendition = mediaEngine.videoRendition;
    expect(videoRendition).toBeDefined();
    expect(videoRendition!.trackId).toBe(1);
    expect(videoRendition!.src).toBe(host.src);
    expect(videoRendition!.startTimeOffsetMs).toBeCloseTo(66.6, 0);
  });

  test("provides templates for asset endpoints", ({ mediaEngine, expect }) => {
    expect(mediaEngine.templates).toEqual({
      initSegment: "/@ef-track/{src}?trackId={trackId}",
      mediaSegment: "/@ef-track/{src}?trackId={trackId}",
    });
  });

  test("builds init and media segment URLs", ({
    mediaEngine,
    host,
    expect,
  }) => {
    expect(mediaEngine.buildInitSegmentUrl(2)).toBe(
      `/@ef-track/${host.src}?trackId=2`,
    );
    expect(mediaEngine.buildMediaSegmentUrl(2, 5)).toBe(
      `/@ef-track/${host.src}?trackId=2&segmentId=5`,
    );
  });

  test("computes segment ID for audio (0-based)", ({ mediaEngine, expect }) => {
    const audio = mediaEngine.audioRendition;
    expect(mediaEngine.computeSegmentId(500, audio as any)).toBe(0);
    expect(mediaEngine.computeSegmentId(1500, audio as any)).toBe(0);
  });

  describe("bars n tone segment id computation", () => {
    test("computes 0ms is 0", ({ expect, mediaEngine }) => {
      const videoRendition = mediaEngine.getVideoRendition();
      expect(videoRendition).toBeDefined();
      expect(mediaEngine.computeSegmentId(0, videoRendition!)).toBe(0);
    });

    test("computes 2000 is 1", ({ expect, mediaEngine }) => {
      const videoRendition = mediaEngine.getVideoRendition();
      expect(videoRendition).toBeDefined();
      expect(mediaEngine.computeSegmentId(2000, videoRendition!)).toBe(1);
    });

    test("computes 4000 is 2", ({ expect, mediaEngine }) => {
      const videoRendition = mediaEngine.getVideoRendition();
      expect(videoRendition).toBeDefined();
      expect(mediaEngine.computeSegmentId(4000, videoRendition!)).toBe(2);
    });

    test("computes 6000 is 3", ({ expect, mediaEngine }) => {
      const videoRendition = mediaEngine.getVideoRendition();
      expect(videoRendition).toBeDefined();
      expect(mediaEngine.computeSegmentId(6000, videoRendition!)).toBe(3);
    });

    test("computes 8000 is 4", ({ expect, mediaEngine }) => {
      const videoRendition = mediaEngine.getVideoRendition();
      expect(videoRendition).toBeDefined();
      expect(mediaEngine.computeSegmentId(8000, videoRendition!)).toBe(4);
    });

    test("computes 7975 is  3", ({ expect, mediaEngine }) => {
      const videoRendition = mediaEngine.getVideoRendition();
      expect(videoRendition).toBeDefined();
      expect(mediaEngine.computeSegmentId(7975, videoRendition!)).toBe(3);
    });
  });
});
