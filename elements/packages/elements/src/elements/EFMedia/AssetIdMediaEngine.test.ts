import type { TrackFragmentIndex } from "@editframe/assets";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UrlGenerator } from "../../transcoding/utils/UrlGenerator";
import type { EFMedia } from "../EFMedia";
import { AssetIdMediaEngine } from "./AssetIdMediaEngine";

describe("AssetIdMediaEngine", () => {
  const mockApiHost = "https://api.example.com";
  const mockAssetId = "test-asset-123";
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

  let engine: AssetIdMediaEngine;
  let host: EFMedia;

  beforeEach(() => {
    // Create a mock host instead of instantiating EFMedia directly
    host = {
      fetch: vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockTrackFragmentData),
      }),
    } as any;
    engine = new AssetIdMediaEngine(
      host,
      mockAssetId,
      mockTrackFragmentData,
      mockApiHost,
    );
  });

  describe("constructor", () => {
    it("should initialize with correct duration", () => {
      expect(engine.durationMs).toBe(15000);
    });

    it("should set assetId correctly", () => {
      expect(engine.assetId).toBe(mockAssetId);
    });

    it("should expose assetId as src for MediaEngine interface compatibility", () => {
      expect(engine.src).toBe(mockAssetId);
    });
  });

  describe("track access", () => {
    it("should find audio track", () => {
      const audioTrack = engine.audioTrackIndex;
      expect(audioTrack).toBeDefined();
      expect(audioTrack?.type).toBe("audio");
      expect(audioTrack?.track).toBe(1);
    });

    it("should find video track", () => {
      const videoTrack = engine.videoTrackIndex;
      expect(videoTrack).toBeDefined();
      expect(videoTrack?.type).toBe("video");
      expect(videoTrack?.track).toBe(2);
    });

    it("should return correct audio rendition", () => {
      const audioRendition = engine.audioRendition;
      expect(audioRendition).toBeDefined();
      expect(audioRendition!.trackId).toBe(1);
      expect(audioRendition!.src).toBe(mockAssetId);
    });

    it("should return correct video rendition", () => {
      const videoRendition = engine.videoRendition;
      expect(videoRendition).toBeDefined();
      expect(videoRendition!.trackId).toBe(2);
      expect(videoRendition!.src).toBe(mockAssetId);
    });
  });

  describe("URL generation", () => {
    it("should generate correct init segment URLs", () => {
      const url = engine.buildInitSegmentUrl(1);
      expect(url).toBe(`${mockApiHost}/api/v1/isobmff_tracks/${mockAssetId}/1`);
    });

    it("should generate correct media segment URLs", () => {
      const url = engine.buildMediaSegmentUrl(1, 0);
      expect(url).toBe(`${mockApiHost}/api/v1/isobmff_tracks/${mockAssetId}/1`);
    });

    it("should return correct templates", () => {
      const templates = engine.templates;
      expect(templates.initSegment).toBe(
        `${mockApiHost}/api/v1/isobmff_tracks/${mockAssetId}/{trackId}`,
      );
      expect(templates.mediaSegment).toBe(
        `${mockApiHost}/api/v1/isobmff_tracks/${mockAssetId}/{trackId}`,
      );
    });

    it("should return correct init segment paths", () => {
      const paths = engine.getInitSegmentPaths();
      expect(paths.audio?.path).toBe(
        `${mockApiHost}/api/v1/isobmff_tracks/${mockAssetId}/1`,
      );
      expect(paths.video?.path).toBe(
        `${mockApiHost}/api/v1/isobmff_tracks/${mockAssetId}/2`,
      );
    });
  });

  describe("segment calculations", () => {
    it("should calculate audio segment ranges correctly", () => {
      const ranges = engine.calculateAudioSegmentRange(
        500,
        1500,
        { trackId: 1, src: mockAssetId },
        15000,
      );
      expect(ranges).toHaveLength(2);
      expect(ranges[0]?.segmentId).toBe(0);
      expect(ranges[1]?.segmentId).toBe(1);
    });

    it("should compute segment ID correctly", () => {
      const segmentId = engine.computeSegmentId(500, {
        trackId: 1,
        src: mockAssetId,
      });
      expect(segmentId).toBe(0);

      const segmentId2 = engine.computeSegmentId(1500, {
        trackId: 1,
        src: mockAssetId,
      });
      expect(segmentId2).toBe(1);
    });
  });

  describe("static fetch method", () => {
    it("should create engine from API response", async () => {
      // Mock the host's fetch method
      // The implementation calls response.text() for error handling, so we need to mock it
      const mockResponse = {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue(mockTrackFragmentData),
        text: vi.fn().mockResolvedValue(JSON.stringify(mockTrackFragmentData)),
      };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);

      const mockHost = {
        fetch: mockFetch,
      } as any;

      const fetchedEngine = await AssetIdMediaEngine.fetchByAssetId(
        mockHost,
        mockUrlGenerator,
        mockAssetId,
        mockApiHost,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiHost}/api/v1/isobmff_files/${mockAssetId}/index`,
        { signal: undefined },
      );
      expect(fetchedEngine.assetId).toBe(mockAssetId);
      expect(fetchedEngine.durationMs).toBe(15000);
      expect(fetchedEngine.audioTrackIndex?.track).toBe(1);
    });
  });
});
