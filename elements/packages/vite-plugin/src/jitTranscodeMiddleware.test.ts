import { writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createJitTranscodeMiddleware,
  generateLocalJitManifest,
  type TrackFragmentIndex,
} from "./jitTranscodeMiddleware.js";

function makeReq(url: string): IncomingMessage {
  return {
    url,
    method: "GET",
    headers: { host: "localhost:4321" },
  } as IncomingMessage;
}

function makeRes(): ServerResponse {
  const res = {
    writeHead: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  } as unknown as ServerResponse;
  return res;
}

const noopAssetFunctions = {
  generateTrack: vi.fn(),
  generateScrubTrack: vi.fn(),
  generateTrackFragmentIndex: vi.fn(),
};

function makeFragmentIndex(
  overrides?: Record<string, unknown>,
): TrackFragmentIndex {
  return {
    track: 0,
    type: "video",
    codec: "avc1.640029",
    duration: 30,
    timescale: 90000,
    sample_count: 2,
    startTimeOffsetMs: 0,
    initSegment: { offset: 0, size: 1024 },
    segments: [
      { offset: 1024, size: 2048, duration: 9000, cts: 0, dts: 0 },
      { offset: 3072, size: 2048, duration: 9000, cts: 9000, dts: 9000 },
    ],
    width: 1920,
    height: 1080,
    ...overrides,
  } as TrackFragmentIndex;
}

describe("generateLocalJitManifest", () => {
  let tmpDir: string;
  let indexPath: string;

  beforeEach(async () => {
    tmpDir = path.join(tmpdir(), `ef-jit-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    indexPath = path.join(tmpDir, "fragment-index.json");
    const fragmentIndex = {
      1: makeFragmentIndex(),
      2: makeFragmentIndex({
        type: "audio",
        codec: "mp4a.40.2",
        width: undefined,
        height: undefined,
      }),
    };
    await writeFile(indexPath, JSON.stringify(fragmentIndex));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("generates audio rendition for audio-only files where audio track is at index 1", async () => {
    const audioOnlyIndexPath = path.join(tmpDir, "audio-only-index.json");
    const audioOnlyIndex = {
      1: makeFragmentIndex({
        type: "audio",
        codec: "mp4a.40.2",
        width: undefined,
        height: undefined,
      }),
    };
    await writeFile(audioOnlyIndexPath, JSON.stringify(audioOnlyIndex));

    const mockAssetFunctions = {
      generateTrack: vi.fn(),
      generateScrubTrack: vi.fn(),
      generateTrackFragmentIndex: vi.fn().mockResolvedValue({
        cachePath: audioOnlyIndexPath,
        md5Sum: "mock-md5-audio",
      }),
    };

    const manifest = await generateLocalJitManifest(
      "/local/audio.mp3",
      "https://example.com/audio.mp3",
      "http://localhost:4321",
      tmpDir,
      mockAssetFunctions,
    );

    expect(manifest.audioRenditions).toHaveLength(1);
    expect(manifest.audioRenditions[0]!.codec).toBe("mp4a.40.2");
    expect(manifest.videoRenditions).toHaveLength(0);
    expect(manifest.durationMs).toBeGreaterThan(0);
  });

  it("uses .m4s extensions in endpoint templates so MSE SourceBuffer receives only moof+mdat per append", async () => {
    const mockAssetFunctions = {
      generateTrack: vi.fn(),
      generateScrubTrack: vi.fn(),
      generateTrackFragmentIndex: vi.fn().mockResolvedValue({
        cachePath: indexPath,
        md5Sum: "mock-md5",
      }),
    };

    const manifest = await generateLocalJitManifest(
      "/local/video.mp4",
      "https://example.com/video.mp4",
      "http://localhost:4321",
      tmpDir,
      mockAssetFunctions,
    );

    expect(manifest.endpoints.initSegment).toMatch(/init\.m4s/);
    expect(manifest.endpoints.mediaSegment).toMatch(/\.m4s/);
    expect(manifest.endpoints.initSegment).not.toMatch(/init\.mp4/);
    expect(manifest.endpoints.mediaSegment).not.toMatch(/[0-9]+\.mp4/);
  });
});

describe("createJitTranscodeMiddleware", () => {
  describe("remote URL handling", () => {
    it("calls next() for remote URLs when handleRemoteUrls is false", async () => {
      const middleware = createJitTranscodeMiddleware(
        { root: "/tmp", cacheRoot: "/tmp/cache", handleRemoteUrls: false },
        noopAssetFunctions,
      );

      const req = makeReq(
        "/api/v1/transcode/manifest.json?url=https%3A%2F%2Fexample.com%2Fvideo.mp4",
      );
      const res = makeRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.writeHead).not.toHaveBeenCalled();
    });

    it("does not call next() for remote URLs when handleRemoteUrls is true", async () => {
      const middleware = createJitTranscodeMiddleware(
        { root: "/tmp", cacheRoot: "/tmp/cache", handleRemoteUrls: true },
        noopAssetFunctions,
      );

      const req = makeReq(
        "/api/v1/transcode/manifest.json?url=https%3A%2F%2Fexample.com%2Fvideo.mp4",
      );
      const res = makeRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });
});
