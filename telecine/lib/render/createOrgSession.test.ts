import { describe, test, expect, vi, beforeEach } from "vitest";
import { Readable } from "node:stream";
import { getMimeTypeFromPath } from "./getMimeTypeFromPath.js";
import type { AssetProvider } from "./AssetProvider.js";

// Mock the Electron session and other dependencies
vi.mock("@/electron-exec/electronReExport", () => ({
  session: {
    fromPartition: vi.fn(() => ({
      clearStorageData: vi.fn().mockResolvedValue(undefined),
      protocol: {
        isProtocolHandled: vi.fn().mockReturnValue(false),
        handle: vi.fn(),
      },
    })),
  },
}));

vi.mock("@react-router/node", () => ({
  createReadableStreamFromReadable: vi.fn((stream) => stream),
}));

vi.mock("@/util/getStorageKeyForPath", () => ({
  getStorageKeyForPath: vi.fn((path: string) => {
    // Mock file path resolution - unified /api/v1/files/ routes
    if (path.includes("/files/") && path.includes("/tracks/")) {
      return `video2/org123/id456/track-1.mp4`;
    }
    if (path.includes("/files/") && path.includes("/index")) {
      return `video2/org123/id456/tracks.json`;
    }
    if (path.includes("/files/") && path.includes("/transcription")) {
      return `video2/org123/id101/captions.json`;
    }
    // Legacy routes
    if (path.includes("isobmff_tracks")) {
      return `video2/org123/id456/track-1.mp4`;
    }
    if (path.includes("image_files")) {
      return `video2/org123/id789/data`;
    }
    if (path.includes("caption_files")) {
      return `video2/org123/id101/captions.json`;
    }
    // Unified files data path
    if (path.includes("/files/")) {
      return `video2/org123/id789/data`;
    }
    return null;
  }),
}));

describe("createOrgSession MIME type detection", () => {
  test("getMimeTypeFromPath detects MIME types for common file paths", () => {
    // Test the paths that getStorageKeyForPath returns
    expect(getMimeTypeFromPath("video2/org123/id456/track-1.mp4")).toBe(
      "video/mp4",
    );
    expect(getMimeTypeFromPath("video2/org123/id456/track-2.m4s")).toBe(
      "video/iso.segment",
    );
    expect(getMimeTypeFromPath("video2/org123/id101/captions.json")).toBe(
      "application/json",
    );

    // Image files use "data" without extension - should return null
    expect(getMimeTypeFromPath("video2/org123/id789/data")).toBeNull();

    // Fallback to application/octet-stream for unknown extensions
    expect(getMimeTypeFromPath("video2/org123/id999/unknown.xyz")).toBeNull();
  });

  test("MIME type detection handles paths with query parameters", () => {
    expect(
      getMimeTypeFromPath("video2/org123/id456/track-1.mp4?range=0-1000"),
    ).toBe("video/mp4");
    expect(
      getMimeTypeFromPath("video2/org123/id101/captions.json?version=1"),
    ).toBe("application/json");
  });

  test("MIME type detection works for all supported file types used in createOrgSession", () => {
    // Video tracks (ISO BMFF)
    expect(getMimeTypeFromPath("video2/org123/id456/track-0.mp4")).toBe(
      "video/mp4",
    );
    expect(getMimeTypeFromPath("video2/org123/id456/track-1.m4s")).toBe(
      "video/iso.segment",
    );

    // Caption files
    expect(getMimeTypeFromPath("video2/org123/id456/captions.json")).toBe(
      "application/json",
    );

    // Fragment indexes
    expect(getMimeTypeFromPath("video2/org123/id456/tracks.json")).toBe(
      "application/json",
    );
  });
});
