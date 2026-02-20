import { describe, it, expect, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createJitTranscodeMiddleware } from "./jitTranscodeMiddleware.js";

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

describe("createJitTranscodeMiddleware", () => {
  describe("remote URL handling", () => {
    it("calls next() for remote URLs when handleRemoteUrls is false (default)", async () => {
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
