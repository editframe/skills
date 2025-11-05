import { describe, test, expect } from "vitest";
import {
  renderFilePath,
  renderStillFilePath,
  renderAssetsMetadataFilePath,
  renderFragmentFilePath,
  isobmffIndexFilePath,
  isobmffTrackFilePath,
  imageFilePath,
  dataFilePath,
  captionsFilePath,
  cacheMetadataFilePath,
  cacheTranscodedSegmentFilePath
} from "./filePaths";

describe("filePaths", () => {
  const mockDescriptor = {
    org_id: "org-123",
    id: "file-456"
  };

  describe("renderFilePath", () => {
    test("generates correct render bundle path", () => {
      const path = renderFilePath(mockDescriptor);
      expect(path).toBe("video2/renders/org-123/file-456/bundle.tar.gz");
    });

    test("handles different org and file IDs", () => {
      const path = renderFilePath({ org_id: "different-org", id: "different-file" });
      expect(path).toBe("video2/renders/different-org/different-file/bundle.tar.gz");
    });
  });

  describe("renderStillFilePath", () => {
    test("generates correct still image paths for different formats", () => {
      const jpegPath = renderStillFilePath({ ...mockDescriptor, fileType: "jpeg" });
      expect(jpegPath).toBe("video2/renders/org-123/file-456/output.jpeg");

      const pngPath = renderStillFilePath({ ...mockDescriptor, fileType: "png" });
      expect(pngPath).toBe("video2/renders/org-123/file-456/output.png");

      const webpPath = renderStillFilePath({ ...mockDescriptor, fileType: "webp" });
      expect(webpPath).toBe("video2/renders/org-123/file-456/output.webp");

      const mp4Path = renderStillFilePath({ ...mockDescriptor, fileType: "mp4" });
      expect(mp4Path).toBe("video2/renders/org-123/file-456/output.mp4");
    });
  });

  describe("renderAssetsMetadataFilePath", () => {
    test("generates correct assets metadata path", () => {
      const path = renderAssetsMetadataFilePath(mockDescriptor);
      expect(path).toBe("video2/renders/org-123/file-456/assets.json");
    });

    test("maintains consistent structure with other render paths", () => {
      const renderPath = renderFilePath(mockDescriptor);
      const metadataPath = renderAssetsMetadataFilePath(mockDescriptor);

      // Should be in same directory
      const renderDir = renderPath.substring(0, renderPath.lastIndexOf('/'));
      const metadataDir = metadataPath.substring(0, metadataPath.lastIndexOf('/'));

      expect(metadataDir).toBe(renderDir);
    });

    test("uses .json extension", () => {
      const path = renderAssetsMetadataFilePath(mockDescriptor);
      expect(path.endsWith('.json')).toBe(true);
    });
  });

  describe("renderFragmentFilePath", () => {
    test("generates correct fragment paths", () => {
      const fragmentPath = renderFragmentFilePath({
        org_id: "org-123",
        id: "render-456",
        segmentId: 0,
        fileType: "fragment"
      });
      expect(fragmentPath).toBe("video2/renders/org-123/render-456/segment/0.m4s");
    });

    test("handles init segment", () => {
      const initPath = renderFragmentFilePath({
        org_id: "org-123",
        id: "render-456",
        segmentId: "init",
        fileType: "fragment"
      });
      expect(initPath).toBe("video2/renders/org-123/render-456/segment/init.m4s");
    });

    test("handles standalone file type", () => {
      const standalonePath = renderFragmentFilePath({
        org_id: "org-123",
        id: "render-456",
        segmentId: 5,
        fileType: "standalone"
      });
      expect(standalonePath).toBe("video2/renders/org-123/render-456/segment/5.mp4");
    });

    test("handles different segment IDs", () => {
      const path1 = renderFragmentFilePath({
        org_id: "org-123",
        id: "render-456",
        segmentId: 1,
        fileType: "fragment"
      });
      expect(path1).toBe("video2/renders/org-123/render-456/segment/1.m4s");

      const path999 = renderFragmentFilePath({
        org_id: "org-123",
        id: "render-456",
        segmentId: 999,
        fileType: "fragment"
      });
      expect(path999).toBe("video2/renders/org-123/render-456/segment/999.m4s");

      const pathString = renderFragmentFilePath({
        org_id: "org-123",
        id: "render-456",
        segmentId: "10000",
        fileType: "fragment"
      });
      expect(pathString).toBe("video2/renders/org-123/render-456/segment/10000.m4s");
    });

    test("defaults to fragment file type when not specified", () => {
      const defaultPath = renderFragmentFilePath({
        org_id: "org-123",
        id: "render-456",
        segmentId: 0
      });
      expect(defaultPath).toBe("video2/renders/org-123/render-456/segment/0.m4s");
    });
  });

  describe("isobmff paths", () => {
    test("generates correct index file path", () => {
      const path = isobmffIndexFilePath(mockDescriptor);
      expect(path).toBe("video2/org-123/file-456/tracks.json");
    });

    test("generates correct track file path", () => {
      const path = isobmffTrackFilePath({ ...mockDescriptor, track_id: 1 });
      expect(path).toBe("video2/org-123/file-456/track-1.mp4");
    });

    test("handles different track IDs", () => {
      const track2Path = isobmffTrackFilePath({ ...mockDescriptor, track_id: 2 });
      expect(track2Path).toBe("video2/org-123/file-456/track-2.mp4");

      const track99Path = isobmffTrackFilePath({ ...mockDescriptor, track_id: 99 });
      expect(track99Path).toBe("video2/org-123/file-456/track-99.mp4");
    });
  });

  describe("basic file paths", () => {
    test("generates correct data file path", () => {
      const path = dataFilePath(mockDescriptor);
      expect(path).toBe("video2/org-123/file-456/data");
    });

    test("generates correct captions file path", () => {
      const path = captionsFilePath(mockDescriptor);
      expect(path).toBe("video2/org-123/file-456/captions.json");
    });

    test("generates correct image file path", () => {
      const path = imageFilePath(mockDescriptor);
      // Image path should be same as data path
      expect(path).toBe(dataFilePath(mockDescriptor));
    });
  });

  describe("cache file paths", () => {
    test("generates deterministic metadata cache paths", () => {
      const url1 = "https://example.com/video.mp4";
      const url2 = "https://example.com/video.mp4"; // Same URL
      const url3 = "https://example.com/other.mp4"; // Different URL

      const path1 = cacheMetadataFilePath({ url: url1 });
      const path2 = cacheMetadataFilePath({ url: url2 });
      const path3 = cacheMetadataFilePath({ url: url3 });

      // Same URLs should generate same paths
      expect(path1).toBe(path2);

      // Different URLs should generate different paths
      expect(path1).not.toBe(path3);

      // Should be under cache directory
      expect(path1.startsWith('cache/')).toBe(true);
      expect(path1.endsWith('.mp4')).toBe(true);
    });

    test("normalizes URLs for consistent caching", () => {
      const url1 = "https://example.com/video.mp4";
      const url2 = "https://EXAMPLE.COM/video.mp4"; // Different case hostname
      const url3 = "https://example.com/video.mp4?utm_source=test"; // Tracking param (should be removed)
      const url4 = "https://example.com/video.mp4?utm_medium=email&utm_source=newsletter"; // Multiple tracking params

      const path1 = cacheMetadataFilePath({ url: url1 });
      const path2 = cacheMetadataFilePath({ url: url2 });
      const path3 = cacheMetadataFilePath({ url: url3 });
      const path4 = cacheMetadataFilePath({ url: url4 });

      // URL hostname normalization should make these the same
      expect(path1).toBe(path2);

      // Tracking params should be normalized away
      expect(path1).toBe(path3);
      expect(path1).toBe(path4);

      // Non-tracking query params should be preserved (create different hashes)
      const urlWithParam = "https://example.com/video.mp4?quality=720p";
      const pathWithParam = cacheMetadataFilePath({ url: urlWithParam });
      expect(path1).not.toBe(pathWithParam);
    });

    test("generates transcoded segment cache paths", () => {
      const path = cacheTranscodedSegmentFilePath({
        url: "https://example.com/video.mp4",
        preset: "720p",
        startTimeMs: 5000,
        extension: "mp4"
      });

      expect(path.startsWith('cache/')).toBe(true);
      expect(path.includes('/transcoded/720p/')).toBe(true);
      expect(path.includes('-5000.mp4')).toBe(true);
    });

    test("handles different extensions for transcoded segments", () => {
      const mp4Path = cacheTranscodedSegmentFilePath({
        url: "https://example.com/video.mp4",
        preset: "480p",
        startTimeMs: 1000,
        extension: "mp4"
      });

      const m4sPath = cacheTranscodedSegmentFilePath({
        url: "https://example.com/video.mp4",
        preset: "480p",
        startTimeMs: 1000,
        extension: "m4s"
      });

      expect(mp4Path.endsWith('.mp4')).toBe(true);
      expect(m4sPath.endsWith('.m4s')).toBe(true);

      // Should be in same directory, different extensions
      const mp4Dir = mp4Path.substring(0, mp4Path.lastIndexOf('.'));
      const m4sDir = m4sPath.substring(0, m4sPath.lastIndexOf('.'));
      expect(mp4Dir).toBe(m4sDir);
    });

    test("creates consistent paths for same parameters", () => {
      const params = {
        url: "https://example.com/video.mp4",
        preset: "1080p",
        startTimeMs: 2500
      };

      const path1 = cacheTranscodedSegmentFilePath(params);
      const path2 = cacheTranscodedSegmentFilePath(params);

      expect(path1).toBe(path2);
    });
  });

  describe("path security and validation", () => {
    test("handles special characters in IDs safely", () => {
      const specialDescriptor = {
        org_id: "org-with-dashes",
        id: "file_with_underscores"
      };

      const path = renderFilePath(specialDescriptor);
      expect(path).toBe("video2/renders/org-with-dashes/file_with_underscores/bundle.tar.gz");
    });

    test("generates filesystem-safe paths", () => {
      const paths = [
        renderFilePath(mockDescriptor),
        renderAssetsMetadataFilePath(mockDescriptor),
        isobmffIndexFilePath(mockDescriptor),
        dataFilePath(mockDescriptor)
      ];

      paths.forEach(path => {
        // Should not contain dangerous path traversal
        expect(path).not.toContain('../');
        expect(path).not.toContain('..\\');

        // Should use forward slashes (Unix-style)
        expect(path).not.toContain('\\');

        // Should not have double slashes
        expect(path).not.toMatch(/\/\//);
      });
    });
  });
});