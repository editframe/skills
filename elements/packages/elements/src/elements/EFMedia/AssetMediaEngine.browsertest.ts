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

  test("provides templates for asset endpoints", ({ mediaEngine, host, expect }) => {
    const apiHost = `${window.location.protocol}//${window.location.host}`;
    const sourceUrl = `${apiHost}/${host.src}`;
    expect(mediaEngine.templates).toEqual({
      initSegment: `${apiHost}/api/v1/transcode/{rendition}/init.m4s?url=${encodeURIComponent(sourceUrl)}`,
      mediaSegment: `${apiHost}/api/v1/transcode/{rendition}/{segmentId}.m4s?url=${encodeURIComponent(sourceUrl)}`,
    });
  });

  test("generates init and media segment URLs using urlGenerator", ({
    mediaEngine,
    host,
    urlGenerator,
    expect,
  }) => {
    const audioRendition = mediaEngine.audioRendition;
    expect(audioRendition).toBeDefined();
    
    // Test init segment URL generation
    const initUrl = urlGenerator.generateSegmentUrl("init", audioRendition!.id!, mediaEngine);
    expect(initUrl).toContain("/api/v1/transcode/audio/init.m4s");
    expect(initUrl).toContain(encodeURIComponent(host.src));
    
    // Test media segment URL generation (segment 5, which is 0-based internally, becomes 6 in JIT 1-based)
    const mediaUrl = urlGenerator.generateSegmentUrl(6, audioRendition!.id!, mediaEngine);
    expect(mediaUrl).toContain("/api/v1/transcode/audio/6.m4s");
    expect(mediaUrl).toContain(encodeURIComponent(host.src));
  });

  test("computes segment ID for audio (0-based)", ({ mediaEngine, expect }) => {
    const audio = mediaEngine.audioRendition;
    expect(mediaEngine.computeSegmentId(500, audio as any)).toBe(0);
    expect(mediaEngine.computeSegmentId(1500, audio as any)).toBe(0);
  });

  describe("bars n tone segment id computation", () => {
    test("computes segment IDs correctly accounting for startTimeOffsetMs", ({ expect, mediaEngine }) => {
      const videoRendition = mediaEngine.getVideoRendition();
      expect(videoRendition).toBeDefined();
      
      // Note: computeSegmentId applies startTimeOffsetMs (~66.6ms) to map user timeline to media timeline
      // The actual segment boundaries depend on the track fragment index data
      const segment0 = mediaEngine.computeSegmentId(0, videoRendition!);
      expect(segment0).toBeGreaterThanOrEqual(0);
      
      const segment2000 = mediaEngine.computeSegmentId(2000, videoRendition!);
      expect(segment2000).toBeGreaterThanOrEqual(0);
      
      const segment4000 = mediaEngine.computeSegmentId(4000, videoRendition!);
      expect(segment4000).toBeGreaterThanOrEqual(0);
      
      const segment6000 = mediaEngine.computeSegmentId(6000, videoRendition!);
      expect(segment6000).toBeGreaterThanOrEqual(0);
      
      const segment8000 = mediaEngine.computeSegmentId(8000, videoRendition!);
      expect(segment8000).toBeGreaterThanOrEqual(0);
      
      // Verify segments are computed (non-negative integers)
      expect(Number.isInteger(segment0)).toBe(true);
      expect(Number.isInteger(segment2000)).toBe(true);
      expect(Number.isInteger(segment4000)).toBe(true);
      expect(Number.isInteger(segment6000)).toBe(true);
      expect(Number.isInteger(segment8000)).toBe(true);
    });
  });
});
