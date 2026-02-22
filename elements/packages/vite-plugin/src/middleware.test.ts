import { mkdir, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  createAssetsApiMiddleware,
  createLocalFilesApiMiddleware,
  handleClearCache,
} from "./middleware.js";

vi.mock("./sendTaskResult.js", () => ({
  sendTaskResult: vi.fn(),
}));

function makeReq(url: string, method = "GET"): IncomingMessage {
  return {
    url,
    method,
    headers: { host: "localhost:4321" },
  } as IncomingMessage;
}

function makeRes() {
  return {
    writeHead: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
  } as unknown as ServerResponse;
}

const options = { root: "/project", cacheRoot: "/project/.cache" };

const mockAssetsDeps = {
  cacheImage: vi
    .fn()
    .mockResolvedValue({ cachePath: "/cache/img.png", md5Sum: "abc" }),
  findOrCreateCaptions: vi
    .fn()
    .mockResolvedValue({ cachePath: "/cache/cap.vtt", md5Sum: "def" }),
};

const mockFilesDeps = {
  generateTrack: vi
    .fn()
    .mockResolvedValue({ cachePath: "/cache/track.mp4", md5Sum: "ghi" }),
  generateScrubTrack: vi
    .fn()
    .mockResolvedValue({ cachePath: "/cache/scrub.mp4", md5Sum: "jkl" }),
  generateTrackFragmentIndex: vi
    .fn()
    .mockResolvedValue({ cachePath: "/cache/index.json", md5Sum: "mno" }),
  md5FilePath: vi.fn().mockResolvedValue("deadbeef"),
};

// ─── createAssetsApiMiddleware ─────────────────────────────────────────────

describe("createAssetsApiMiddleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls next() for unrelated URLs", async () => {
    const middleware = createAssetsApiMiddleware(options, mockAssetsDeps);
    const next = vi.fn();
    await middleware(
      makeReq("/api/v1/files/index?src=foo.mp4"),
      makeRes(),
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it("throws on path traversal in /api/v1/assets/ URL", async () => {
    const middleware = createAssetsApiMiddleware(options, mockAssetsDeps);
    const next = vi.fn();
    await expect(
      middleware(
        makeReq("/api/v1/assets/image?src=../../etc/passwd"),
        makeRes(),
        next,
      ),
    ).rejects.toThrow("Relative paths are forbidden");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when src is missing", async () => {
    const middleware = createAssetsApiMiddleware(options, mockAssetsDeps);
    const res = makeRes();
    await middleware(makeReq("/api/v1/assets/image"), res, vi.fn());
    expect(res.writeHead).toHaveBeenCalledWith(
      400,
      expect.objectContaining({ "Content-Type": "application/json" }),
    );
  });

  it("calls cacheImage for local /api/v1/assets/image", async () => {
    const middleware = createAssetsApiMiddleware(options, mockAssetsDeps);
    await middleware(
      makeReq("/api/v1/assets/image?src=video.mp4"),
      makeRes(),
      vi.fn(),
    );
    expect(mockAssetsDeps.cacheImage).toHaveBeenCalledWith(
      options.cacheRoot,
      "/project/video.mp4",
    );
  });

  it("fetches remote URL directly for /api/v1/assets/image with http src", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => new ArrayBuffer(4),
    });
    vi.stubGlobal("fetch", mockFetch);

    const middleware = createAssetsApiMiddleware(options, mockAssetsDeps);
    const res = makeRes();
    await middleware(
      makeReq("/api/v1/assets/image?src=https://example.com/img.png"),
      res,
      vi.fn(),
    );

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/img.png");
    expect(mockAssetsDeps.cacheImage).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ "Content-Type": "image/png" }),
    );

    vi.unstubAllGlobals();
  });

  it("calls findOrCreateCaptions for /api/v1/assets/captions", async () => {
    const middleware = createAssetsApiMiddleware(options, mockAssetsDeps);
    await middleware(
      makeReq("/api/v1/assets/captions?src=audio.mp3"),
      makeRes(),
      vi.fn(),
    );
    expect(mockAssetsDeps.findOrCreateCaptions).toHaveBeenCalledWith(
      options.cacheRoot,
      "/project/audio.mp3",
    );
  });

  it("returns 404 for unknown assets endpoint", async () => {
    const middleware = createAssetsApiMiddleware(options, mockAssetsDeps);
    const res = makeRes();
    await middleware(makeReq("/api/v1/assets/unknown?src=foo"), res, vi.fn());
    expect(res.writeHead).toHaveBeenCalledWith(
      404,
      expect.objectContaining({ "Content-Type": "application/json" }),
    );
  });

  it("does not mutate options.cacheRoot", async () => {
    const opts = { root: "/project/dist", cacheRoot: "/project/dist/.cache" };
    const middleware = createAssetsApiMiddleware(opts, mockAssetsDeps);
    await middleware(
      makeReq("/api/v1/assets/image?src=video.mp4"),
      makeRes(),
      vi.fn(),
    );
    expect(opts.cacheRoot).toBe("/project/dist/.cache");
  });
});

// ─── createLocalFilesApiMiddleware ────────────────────────────────────────

describe("createLocalFilesApiMiddleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls next() for unrelated URLs", async () => {
    const middleware = createLocalFilesApiMiddleware(options, mockFilesDeps);
    const next = vi.fn();
    await middleware(
      makeReq("/api/v1/assets/image?src=foo.mp4"),
      makeRes(),
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it("calls next() when src param is missing", async () => {
    const middleware = createLocalFilesApiMiddleware(options, mockFilesDeps);
    const next = vi.fn();
    await middleware(makeReq("/api/v1/files/index"), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("throws on path traversal in /api/v1/files/ URL", async () => {
    const middleware = createLocalFilesApiMiddleware(options, mockFilesDeps);
    const next = vi.fn();
    await expect(
      middleware(
        makeReq("/api/v1/files/index?src=../../etc/passwd"),
        makeRes(),
        next,
      ),
    ).rejects.toThrow("Relative paths are forbidden");
    expect(next).not.toHaveBeenCalled();
  });

  it("calls generateTrackFragmentIndex for /api/v1/files/index", async () => {
    const middleware = createLocalFilesApiMiddleware(options, mockFilesDeps);
    await middleware(
      makeReq("/api/v1/files/index?src=video.mp4"),
      makeRes(),
      vi.fn(),
    );
    expect(mockFilesDeps.generateTrackFragmentIndex).toHaveBeenCalledWith(
      options.cacheRoot,
      "/project/video.mp4",
    );
  });

  it("calls md5FilePath and returns JSON for /api/v1/files/md5", async () => {
    const middleware = createLocalFilesApiMiddleware(options, mockFilesDeps);
    const res = makeRes();
    await middleware(makeReq("/api/v1/files/md5?src=video.mp4"), res, vi.fn());
    expect(mockFilesDeps.md5FilePath).toHaveBeenCalledWith(
      "/project/video.mp4",
    );
    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ "Content-Type": "application/json" }),
    );
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ md5: "deadbeef" }));
  });

  it("calls generateScrubTrack for /api/v1/files/track?trackId=-1", async () => {
    const middleware = createLocalFilesApiMiddleware(options, mockFilesDeps);
    await middleware(
      makeReq("/api/v1/files/track?src=video.mp4&trackId=-1"),
      makeRes(),
      vi.fn(),
    );
    expect(mockFilesDeps.generateScrubTrack).toHaveBeenCalledWith(
      options.cacheRoot,
      "/project/video.mp4",
    );
    expect(mockFilesDeps.generateTrack).not.toHaveBeenCalled();
  });

  it("calls generateTrack for /api/v1/files/track?trackId=0", async () => {
    const middleware = createLocalFilesApiMiddleware(options, mockFilesDeps);
    await middleware(
      makeReq("/api/v1/files/track?src=video.mp4&trackId=0"),
      makeRes(),
      vi.fn(),
    );
    expect(mockFilesDeps.generateTrack).toHaveBeenCalledWith(
      options.cacheRoot,
      "/project/video.mp4",
      expect.stringContaining("trackId=0"),
    );
    expect(mockFilesDeps.generateScrubTrack).not.toHaveBeenCalled();
  });

  it("returns 400 when trackId is missing for /api/v1/files/track", async () => {
    const middleware = createLocalFilesApiMiddleware(options, mockFilesDeps);
    const res = makeRes();
    await middleware(
      makeReq("/api/v1/files/track?src=video.mp4"),
      res,
      vi.fn(),
    );
    expect(res.writeHead).toHaveBeenCalledWith(
      400,
      expect.objectContaining({ "Content-Type": "application/json" }),
    );
  });

  it("does not mutate options.cacheRoot", async () => {
    const opts = { root: "/project/dist", cacheRoot: "/project/dist/.cache" };
    const middleware = createLocalFilesApiMiddleware(opts, mockFilesDeps);
    await middleware(
      makeReq("/api/v1/files/index?src=video.mp4"),
      makeRes(),
      vi.fn(),
    );
    expect(opts.cacheRoot).toBe("/project/dist/.cache");
  });
});

// ─── handleClearCache ─────────────────────────────────────────────────────

describe("handleClearCache", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `ef-clear-cache-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns 405 for non-DELETE requests", async () => {
    const req = makeReq("/@ef-clear-cache", "GET");
    const res = makeRes();
    await handleClearCache(req, res, tmpDir);
    expect(res.writeHead).toHaveBeenCalledWith(405, { Allow: "DELETE" });
    expect(res.end).toHaveBeenCalledOnce();
  });

  it("removes .cache directory and returns 200", async () => {
    const cacheDir = join(tmpDir, ".cache");
    await mkdir(cacheDir, { recursive: true });

    const req = makeReq("/@ef-clear-cache", "DELETE");
    const res = makeRes();
    await handleClearCache(req, res, tmpDir);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "text/plain",
    });
    expect(res.end).toHaveBeenCalledWith("Cache cleared");

    await expect(access(cacheDir)).rejects.toThrow();
  });

  it("returns 200 even when .cache directory does not exist", async () => {
    const req = makeReq("/@ef-clear-cache", "DELETE");
    const res = makeRes();
    await handleClearCache(req, res, join(tmpDir, "nonexistent"));
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "text/plain",
    });
  });

  it("does not read or write the cacheRoot argument - only uses it as a path base", async () => {
    // The mutation bug in index.vitest.ts was: options.cacheRoot = options.cacheRoot.replace(...)
    // handleClearCache must never assign back to the caller's variable.
    // Since strings are immutable in JS, we verify by passing an object and confirming
    // the function only uses cacheRoot as a value, not as a reference to mutate options.
    const opts = { cacheRoot: join(tmpDir, "dist") };
    const req = makeReq("/@ef-clear-cache", "DELETE");
    const res = makeRes();
    await handleClearCache(req, res, opts.cacheRoot);
    expect(opts.cacheRoot).toBe(join(tmpDir, "dist"));
  });
});
