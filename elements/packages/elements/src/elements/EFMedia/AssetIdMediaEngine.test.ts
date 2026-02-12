import type { TrackFragmentIndex } from "@editframe/assets";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UrlGenerator } from "../../transcoding/utils/UrlGenerator";
import type { EFMedia } from "../EFMedia";
import { FileMediaEngine, AssetIdMediaEngine } from "./FileMediaEngine";

describe("FileMediaEngine", () => {
  const mockApiHost = "https://api.example.com";
  const mockFileId = "test-asset-123";
  const mockUrlGenerator = new UrlGenerator(() => "https://api.example.com");

  const mockTrackFragmentData: Record<number, TrackFragmentIndex> = {
    1: {
      track: 1,
      type: "audio",
      duration: 15000,
      timescale: 1000,
      channel_count: 2,
      sample_rate: 44100,
      sample_size: 16,
      sample_count: 1000,
      codec: "mp4a.40.2",
      initSegment: {
        offset: 0,
        size: 1024,
      },
      segments: [
        {
          cts: 0,
          dts: 0,
          duration: 1000,
          offset: 1024,
          size: 2048,
        },
        {
          cts: 1000,
          dts: 1000,
          duration: 1000,
          offset: 3072,
          size: 2048,
        },
      ],
    },
    2: {
      track: 2,
      type: "video",
      duration: 15000,
      timescale: 1000,
      width: 1920,
      height: 1080,
      sample_count: 1500,
      codec: "avc1.640029",
      initSegment: {
        offset: 0,
        size: 2048,
      },
      segments: [
        {
          cts: 0,
          dts: 0,
          duration: 1000,
          offset: 7168,
          size: 4096,
        },
        {
          cts: 1000,
          dts: 1000,
          duration: 1000,
          offset: 11264,
          size: 4096,
        },
      ],
    },
  };

  let engine: FileMediaEngine;
  let host: EFMedia;

  beforeEach(() => {
    host = {
      fetch: vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockTrackFragmentData),
      }),
    } as any;
    engine = new FileMediaEngine(
      host,
      mockFileId,
      mockTrackFragmentData,
      mockApiHost,
      mockUrlGenerator,
    );
  });

  describe("constructor", () => {
    it("should initialize with correct duration", () => {
      expect(engine.durationMs).toBe(15000);
    });

    it("should set fileId correctly", () => {
      expect(engine.fileId).toBe(mockFileId);
    });

    it("should expose deprecated assetId as alias for fileId", () => {
      expect(engine.assetId).toBe(mockFileId);
    });

    it("should expose fileId as src for MediaEngine interface compatibility", () => {
      expect(engine.src).toBe(mockFileId);
    });
  });

  describe("backward compatibility", () => {
    it("should export AssetIdMediaEngine as alias for FileMediaEngine", () => {
      expect(AssetIdMediaEngine).toBe(FileMediaEngine);
    });

    it("should have fetchByAssetId as alias for fetchByFileId", () => {
      expect(FileMediaEngine.fetchByAssetId).toBe(FileMediaEngine.fetchByFileId);
    });
  });

  describe("track access", () => {
    it("should find audio track", () => {
      const audioTrack = engine.getAudioTrackIndex();
      expect(audioTrack).toBeDefined();
      expect(audioTrack?.type).toBe("audio");
      expect(audioTrack?.track).toBe(1);
    });

    it("should find video track", () => {
      const videoTrack = engine.getVideoTrackIndex();
      expect(videoTrack).toBeDefined();
      expect(videoTrack?.type).toBe("video");
      expect(videoTrack?.track).toBe(2);
    });

    it("should return correct audio rendition", () => {
      const audioRendition = engine.audioRendition;
      expect(audioRendition).toBeDefined();
      expect(audioRendition!.trackId).toBe(1);
      expect(audioRendition!.src).toBe(mockFileId);
    });

    it("should return correct video rendition", () => {
      const videoRendition = engine.videoRendition;
      expect(videoRendition).toBeDefined();
      expect(videoRendition!.trackId).toBe(2);
      expect(videoRendition!.src).toBe(mockFileId);
    });
  });

  describe("URL generation", () => {
    it("should generate correct init segment URLs using /api/v1/files/", () => {
      const url = engine.buildInitSegmentUrl(1);
      expect(url).toBe(`${mockApiHost}/api/v1/files/${mockFileId}/tracks/1`);
    });

    it("should generate correct media segment URLs using /api/v1/files/", () => {
      const url = engine.buildMediaSegmentUrl(1, 0);
      expect(url).toBe(`${mockApiHost}/api/v1/files/${mockFileId}/tracks/1`);
    });

    it("should return correct templates using /api/v1/files/", () => {
      const templates = engine.templates;
      expect(templates.initSegment).toBe(
        `${mockApiHost}/api/v1/files/${mockFileId}/tracks/{trackId}`,
      );
      expect(templates.mediaSegment).toBe(
        `${mockApiHost}/api/v1/files/${mockFileId}/tracks/{trackId}`,
      );
    });

    it("should return correct init segment paths using /api/v1/files/", () => {
      const paths = engine.getInitSegmentPaths();
      expect(paths.audio?.path).toBe(
        `${mockApiHost}/api/v1/files/${mockFileId}/tracks/1`,
      );
      expect(paths.video?.path).toBe(
        `${mockApiHost}/api/v1/files/${mockFileId}/tracks/2`,
      );
    });
  });

  describe("segment calculations", () => {
    it("should calculate audio segment ranges correctly", () => {
      const ranges = engine.calculateAudioSegmentRange(
        500,
        1500,
        { trackId: 1, src: mockFileId },
        15000,
      );
      expect(ranges).toHaveLength(2);
      expect(ranges[0]?.segmentId).toBe(0);
      expect(ranges[1]?.segmentId).toBe(1);
    });

    it("should compute segment ID correctly", () => {
      const segmentId = engine.computeSegmentId(500, {
        trackId: 1,
        src: mockFileId,
      });
      expect(segmentId).toBe(0);

      const segmentId2 = engine.computeSegmentId(1500, {
        trackId: 1,
        src: mockFileId,
      });
      expect(segmentId2).toBe(1);
    });
  });

  describe("static fetch method", () => {
    it("should create engine from API response using /api/v1/files/", async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue(mockTrackFragmentData),
        text: vi.fn().mockResolvedValue(JSON.stringify(mockTrackFragmentData)),
        clone: vi.fn().mockReturnThis(),
      };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);

      const mockHost = {
        fetch: mockFetch,
      } as any;

      const fetchedEngine = await FileMediaEngine.fetchByFileId(
        mockHost,
        mockUrlGenerator,
        mockFileId,
        mockApiHost,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiHost}/api/v1/files/${mockFileId}/index`,
        { signal: undefined },
      );
      expect(fetchedEngine.fileId).toBe(mockFileId);
      expect(fetchedEngine.assetId).toBe(mockFileId);
      expect(fetchedEngine.durationMs).toBe(15000);
      expect(fetchedEngine.getAudioTrackIndex()?.track).toBe(1);
    });

    it("should work via deprecated fetchByAssetId alias", async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue(mockTrackFragmentData),
        text: vi.fn().mockResolvedValue(JSON.stringify(mockTrackFragmentData)),
        clone: vi.fn().mockReturnThis(),
      };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);

      const mockHost = {
        fetch: mockFetch,
      } as any;

      const fetchedEngine = await FileMediaEngine.fetchByAssetId(
        mockHost,
        mockUrlGenerator,
        mockFileId,
        mockApiHost,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiHost}/api/v1/files/${mockFileId}/index`,
        { signal: undefined },
      );
      expect(fetchedEngine.fileId).toBe(mockFileId);
    });
  });
});
