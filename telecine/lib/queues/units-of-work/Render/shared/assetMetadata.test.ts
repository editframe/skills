import { describe, test, expect, vi } from "vitest";
import type { AssetsMetadataBundle } from "./assetMetadata";

// Mock storage provider for testing
vi.mock("@/util/storageProvider.server", () => ({
  storageProvider: {
    readFile: vi.fn(),
    createReadStream: vi.fn(),
    pathExists: vi.fn()
  }
}));

// Mock logger
vi.mock("@/logging", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    trace: vi.fn()
  }
}));

// Mock tracing
vi.mock("@/tracing", () => ({
  executeSpan: vi.fn(async (_name: string, fn: (span?: any) => Promise<any>) => {
    return fn();
  }),
  setSpanAttributes: vi.fn()
}));

describe("assetMetadata", () => {
  const mockAssetId = "123e4567-e89b-12d3-a456-426614174000";
  const mockOrgId = "test-org-123";

  describe("AssetsMetadataBundle Structure", () => {
    test("contains only fragment indexes", () => {
      // Test that the bundle interface only contains fragment indexes
      const mockBundle: AssetsMetadataBundle = {
        fragmentIndexes: {
          "test-asset-id": {
            1: {
              type: "video",
              duration_ms: 30000,
              codec: "h264",
              width: 1920,
              height: 1080,
              timescale: 30000,
              fragments: [
                {
                  sequence_number: 0,
                  start_time: 0,
                  duration: 1000,
                  byte_offset: 0,
                  byte_size: 12345
                }
              ]
            },
            2: {
              type: "audio",
              duration_ms: 30000,
              codec: "aac",
              sample_rate: 48000,
              channel_count: 2,
              timescale: 48000,
              fragments: []
            }
          }
        }
      };

      // Verify structure exists and contains fragment data
      expect(mockBundle.fragmentIndexes).toBeDefined();
      expect(mockBundle.fragmentIndexes["test-asset-id"]).toBeDefined();

      // Verify fragment index contains track data
      const trackIndex = mockBundle.fragmentIndexes["test-asset-id"];
      expect(trackIndex).toBeDefined();
      expect(trackIndex![1].type).toBe("video");
      expect(trackIndex![1].duration_ms).toBe(30000);
      expect(trackIndex![2].type).toBe("audio");
      expect(trackIndex![2].sample_rate).toBe(48000);
    });

    test("handles empty bundle gracefully", () => {
      const emptyBundle: AssetsMetadataBundle = {
        fragmentIndexes: {}
      };

      expect(Object.keys(emptyBundle.fragmentIndexes)).toHaveLength(0);
    });
  });

  describe("createAssetsMetadataBundle", () => {
    test("extracts media asset IDs and ignores image assets", async () => {
      const { createAssetsMetadataBundle } = await import("./assetMetadata");
      const { storageProvider } = await import("@/util/storageProvider.server");

      const mockFragmentIndex = {
        1: { type: "video", duration_ms: 30000 },
        2: { type: "audio", duration_ms: 30000 }
      };

      // Mock the storage provider to return a fragment index
      vi.mocked(storageProvider.readFile).mockResolvedValue(
        Buffer.from(JSON.stringify(mockFragmentIndex))
      );

      const assets = {
        efMediaSrcs: [`asset-id=${mockAssetId}`, "src=https://example.com/video.mp4"],
        efImageSrcs: ["asset-id=image-123", "src=https://example.com/image.jpg"]
      };

      const bundle = await createAssetsMetadataBundle(assets, mockOrgId);

      // Should only process media asset IDs, not image assets or src URLs
      expect(bundle.fragmentIndexes[mockAssetId]).toBeDefined();
      expect(bundle.fragmentIndexes["image-123"]).toBeUndefined();
      expect(bundle.fragmentIndexes).not.toHaveProperty("https://example.com/video.mp4");
    });

    test("handles empty asset arrays", async () => {
      const { createAssetsMetadataBundle } = await import("./assetMetadata");

      const assets = {
        efMediaSrcs: [],
        efImageSrcs: []
      };

      const bundle = await createAssetsMetadataBundle(assets, mockOrgId);

      expect(bundle.fragmentIndexes).toEqual({});
    });

    test("filters out src= entries and keeps only asset-id entries", async () => {
      const { createAssetsMetadataBundle } = await import("./assetMetadata");
      const { storageProvider } = await import("@/util/storageProvider.server");

      const mockFragmentIndex = {
        1: { type: "video", duration_ms: 15000 }
      };

      vi.mocked(storageProvider.readFile).mockResolvedValue(
        Buffer.from(JSON.stringify(mockFragmentIndex))
      );

      const assets = {
        efMediaSrcs: [
          "src=https://example.com/video1.mp4",
          `asset-id=${mockAssetId}`,
          "src=https://example.com/video2.mp4"
        ],
        efImageSrcs: []
      };

      const bundle = await createAssetsMetadataBundle(assets, mockOrgId);

      // Should only have the asset-id entry
      expect(Object.keys(bundle.fragmentIndexes)).toHaveLength(1);
      expect(bundle.fragmentIndexes[mockAssetId]).toBeDefined();
    });

    test("handles fragment index loading errors gracefully", async () => {
      const { createAssetsMetadataBundle } = await import("./assetMetadata");
      const { storageProvider } = await import("@/util/storageProvider.server");

      // Mock storage provider to throw error
      vi.mocked(storageProvider.readFile).mockRejectedValue(new Error("File not found"));

      const assets = {
        efMediaSrcs: [`asset-id=${mockAssetId}`],
        efImageSrcs: []
      };

      const bundle = await createAssetsMetadataBundle(assets, mockOrgId);

      // Should return empty fragment indexes when loading fails
      expect(bundle.fragmentIndexes).toEqual({});
    });

    test("loads multiple fragment indexes", async () => {
      const { createAssetsMetadataBundle } = await import("./assetMetadata");
      const { storageProvider } = await import("@/util/storageProvider.server");

      const mockFragmentIndex1 = {
        1: { type: "video", duration_ms: 30000 }
      };
      const mockFragmentIndex2 = {
        1: { type: "audio", duration_ms: 45000 }
      };

      const secondAssetId = "234e5678-e89b-12d3-a456-426614174001";

      let callCount = 0;
      vi.mocked(storageProvider.readFile).mockImplementation(async (_path: string) => {
        callCount++;
        const index = callCount === 1 ? mockFragmentIndex1 : mockFragmentIndex2;
        return Buffer.from(JSON.stringify(index));
      });

      const assets = {
        efMediaSrcs: [`asset-id=${mockAssetId}`, `asset-id=${secondAssetId}`],
        efImageSrcs: []
      };

      const bundle = await createAssetsMetadataBundle(assets, mockOrgId);

      expect(Object.keys(bundle.fragmentIndexes)).toHaveLength(2);
      expect(bundle.fragmentIndexes[mockAssetId]).toEqual(mockFragmentIndex1);
      expect(bundle.fragmentIndexes[secondAssetId]).toEqual(mockFragmentIndex2);
    });

    test("calls storage provider with correct index file paths", async () => {
      const { createAssetsMetadataBundle } = await import("./assetMetadata");
      const { storageProvider } = await import("@/util/storageProvider.server");
      const { isobmffIndexFilePath } = await import("@/util/filePaths");

      const mockFragmentIndex = { 1: { type: "video" } };

      vi.mocked(storageProvider.readFile).mockResolvedValue(
        Buffer.from(JSON.stringify(mockFragmentIndex))
      );

      const assets = {
        efMediaSrcs: [`asset-id=${mockAssetId}`],
        efImageSrcs: []
      };

      await createAssetsMetadataBundle(assets, mockOrgId);

      const expectedPath = isobmffIndexFilePath({
        org_id: mockOrgId,
        id: mockAssetId
      });

      expect(storageProvider.readFile).toHaveBeenCalledWith(expectedPath);
    });
  });
});
