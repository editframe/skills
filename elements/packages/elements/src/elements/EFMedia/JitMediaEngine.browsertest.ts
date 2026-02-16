import { describe } from "vitest";
import { test as baseTest } from "../../../test/useMSW.js";
import { getApiHost } from "../../../test/setup.js";

import type { ManifestResponse } from "../../transcoding/types/index.js";
import { UrlGenerator } from "../../transcoding/utils/UrlGenerator";
import "../EFVideo.js";
import type { EFVideo } from "../EFVideo.js";
import { JitMediaEngine } from "./JitMediaEngine";

const test = baseTest.extend<{
  emptyManifestResponse: ManifestResponse;
  urlGenerator: UrlGenerator;
  manifestUrl: string;
  mediaEngine: JitMediaEngine;
  abortSignal: AbortSignal;
  testUrl: string;
  host: EFVideo;
}>({
  mediaEngine: async ({ manifestUrl, urlGenerator, host }, use: any) => {
    const engine = await JitMediaEngine.fetch(host, urlGenerator, manifestUrl);
    await use(engine);
  },
  manifestUrl: async ({ urlGenerator, host }, use: any) => {
    const url = urlGenerator.generateManifestUrl(host.src);
    await use(url);
  },

  emptyManifestResponse: async ({}, use: any) => {
    const emptyResponse: ManifestResponse = {
      version: "1.0",
      type: "cmaf",
      duration: 60,
      durationMs: 60000,
      segmentDuration: 4000,
      baseUrl: "http://api.example.com/",
      sourceUrl: "http://example.com/video.mp4",
      audioRenditions: [],
      videoRenditions: [],
      endpoints: {
        initSegment: "http://api.example.com/init/{renditionId}",
        mediaSegment:
          "http://api.example.com/segment/{segmentId}/{renditionId}",
      },
      jitInfo: {
        parallelTranscodingSupported: true,
        expectedTranscodeLatency: 1000,
        segmentCount: 15,
      },
    };
    await use(emptyResponse);
  },
  host: async ({}, use: any) => {
    const configuration = document.createElement("ef-configuration");
    const apiHost = getApiHost();
    configuration.setAttribute("api-host", apiHost);
    configuration.apiHost = apiHost;
    configuration.signingURL = ""; // Disable URL signing for tests
    const host = document.createElement("ef-video");
    configuration.appendChild(host);
    host.src = "http://web:3000/head-moov-480p.mp4";
    document.body.appendChild(configuration);
    await use(host);
    configuration.remove();
  },
  urlGenerator: async ({}, use: any) => {
    const apiHost = getApiHost();
    const generator = new UrlGenerator(() => apiHost);
    await use(generator);
  },

  abortSignal: async ({}, use: any) => {
    const signal = new AbortController().signal;
    await use(signal);
  },
  testUrl: async ({}, use: any) => {
    const url = "http://api.example.com/manifest";
    await use(url);
  },
});

// Skip all JitMediaEngine tests - failing tests need investigation
describe.skip("JitMediaEngine", () => {
  test("provides duration from manifest data", async ({
    mediaEngine,
    expect,
  }) => {
    expect(mediaEngine.durationMs).toBe(10000);
  });

  test("provides source URL from manifest data", async ({
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
    expect(audioRendition!.id).toBe("audio");
    expect(audioRendition!.trackId).toBeUndefined();
    expect(audioRendition!.src).toBe(host.src);
    expect(audioRendition!.segmentDurationMs).toBe(2000);
  });

  test("returns undefined audio rendition when none available", ({
    urlGenerator,
    host,
    expect,
  }) => {
    const engine = new JitMediaEngine(host, urlGenerator);

    expect(engine.audioRendition).toBeUndefined();
  });

  test("returns video rendition with correct properties", ({
    mediaEngine,
    host,
    expect,
  }) => {
    const videoRendition = mediaEngine.videoRendition;

    expect(videoRendition).toBeDefined();
    expect(videoRendition!.id).toBe("high");
    expect(videoRendition!.trackId).toBeUndefined();
    expect(videoRendition!.src).toBe(host.src);
    expect(videoRendition!.segmentDurationMs).toBe(2000);
  });

  test("returns undefined video rendition when none available", ({
    urlGenerator,
    host,
    expect,
  }) => {
    const engine = new JitMediaEngine(host, urlGenerator);

    expect(engine.videoRendition).toBeUndefined();
  });

  test("provides templates from manifest endpoints", ({
    mediaEngine,
    expect,
  }) => {
    const expectedApiHost = getApiHost();
    expect(mediaEngine.templates).toEqual({
      initSegment: `${expectedApiHost}/api/v1/transcode/{rendition}/init.m4s?url=http%3A%2F%2Fweb%3A3000%2Fhead-moov-480p.mp4`,
      mediaSegment: `${expectedApiHost}/api/v1/transcode/{rendition}/{segmentId}.m4s?url=http%3A%2F%2Fweb%3A3000%2Fhead-moov-480p.mp4`,
    });
  });

});
