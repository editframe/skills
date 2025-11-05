import { test as baseTest, describe, vi } from "vitest";
import type {
  AudioRendition,
  MediaEngine,
  VideoRendition,
} from "../../../transcoding/types";
import { calculateSegmentRange, computeSegmentId } from "./RenditionHelpers";

const test = baseTest.extend<{
  mockMediaEngine: MediaEngine;
  mockVideoRendition: VideoRendition;
  mockAudioRendition: AudioRendition;
  mockMediaEngineWithoutAudio: MediaEngine;
  mockMediaEngineWithoutVideo: MediaEngine;
}>({
  mockMediaEngine: async ({}, use) => {
    const mockVideoRendition = {
      trackId: 1,
      src: "video-track.mp4",
      segmentDurationMs: 1000,
    } as VideoRendition;

    const mockAudioRendition = {
      trackId: 2,
      src: "audio-track.mp4",
      segmentDurationMs: 1000,
    } as AudioRendition;

    const mockMediaEngine = {
      durationMs: 10000,
      src: "https://example.com/media.mp4",
      videoRendition: mockVideoRendition,
      audioRendition: mockAudioRendition,
      getVideoRendition: () => mockVideoRendition,
      getAudioRendition: () => mockAudioRendition,
      fetchMediaSegment: vi.fn(),
    } as unknown as MediaEngine;
    await use(mockMediaEngine);
  },

  mockVideoRendition: async ({}, use) => {
    const mockVideoRendition = {
      trackId: 1,
      src: "video-track.mp4",
      segmentDurationMs: 1000,
    } as VideoRendition;
    await use(mockVideoRendition);
  },

  mockAudioRendition: async ({}, use) => {
    const mockAudioRendition = {
      trackId: 2,
      src: "audio-track.mp4",
      segmentDurationMs: 1000,
    } as AudioRendition;
    await use(mockAudioRendition);
  },

  mockMediaEngineWithoutAudio: async ({}, use) => {
    const videoRendition = {
      trackId: 1,
      src: "video-track.mp4",
      segmentDurationMs: 1000,
    } as VideoRendition;

    const mockMediaEngine = {
      durationMs: 10000,
      src: "https://example.com/media.mp4",
      videoRendition,
      audioRendition: undefined,
      getVideoRendition: () => videoRendition,
      getAudioRendition: () => undefined,
      fetchMediaSegment: vi.fn(),
    } as unknown as MediaEngine;
    await use(mockMediaEngine);
  },

  mockMediaEngineWithoutVideo: async ({}, use) => {
    const audioRendition = {
      trackId: 2,
      src: "audio-track.mp4",
      segmentDurationMs: 1000,
    } as AudioRendition;

    const mockMediaEngine = {
      durationMs: 10000,
      src: "https://example.com/media.mp4",
      videoRendition: undefined,
      audioRendition,
      getVideoRendition: () => undefined,
      getAudioRendition: () => audioRendition,
      fetchMediaSegment: vi.fn(),
    } as unknown as MediaEngine;
    await use(mockMediaEngine);
  },
});

describe("RenditionHelpers", () => {
  describe("MediaEngine Rendition Access", () => {
    test("mediaEngine.getAudioRendition() returns undefined for video-only assets", ({
      mockMediaEngineWithoutAudio,
      expect,
    }) => {
      const result = mockMediaEngineWithoutAudio.getAudioRendition();
      expect(result).toBeUndefined();
    });

    test("mediaEngine.getVideoRendition() returns undefined for audio-only assets", ({
      mockMediaEngineWithoutVideo,
      expect,
    }) => {
      const result = mockMediaEngineWithoutVideo.getVideoRendition();
      expect(result).toBeUndefined();
    });

    test("mediaEngine.getAudioRendition() returns rendition when available", ({
      mockMediaEngine,
      expect,
    }) => {
      const result = mockMediaEngine.getAudioRendition();
      expect(result).toBeDefined();
      expect(result?.trackId).toBe(2);
    });

    test("mediaEngine.getVideoRendition() returns rendition when available", ({
      mockMediaEngine,
      expect,
    }) => {
      const result = mockMediaEngine.getVideoRendition();
      expect(result).toBeDefined();
      expect(result?.trackId).toBe(1);
    });
  });

  describe("computeSegmentId", () => {
    test("calculates segment ID correctly for audio rendition", ({
      mockAudioRendition,
      expect,
    }) => {
      // Test various time points
      expect(computeSegmentId(0, mockAudioRendition)).toBe(1); // First segment
      expect(computeSegmentId(500, mockAudioRendition)).toBe(1); // Still first segment
      expect(computeSegmentId(999, mockAudioRendition)).toBe(1); // Still first segment
      expect(computeSegmentId(1000, mockAudioRendition)).toBe(2); // Second segment
      expect(computeSegmentId(1500, mockAudioRendition)).toBe(2); // Still second segment
      expect(computeSegmentId(2000, mockAudioRendition)).toBe(3); // Third segment
    });

    test("calculates segment ID correctly for video rendition", ({
      mockVideoRendition,
      expect,
    }) => {
      // Test various time points
      expect(computeSegmentId(0, mockVideoRendition)).toBe(1); // First segment
      expect(computeSegmentId(999, mockVideoRendition)).toBe(1); // Still first segment
      expect(computeSegmentId(1000, mockVideoRendition)).toBe(2); // Second segment
      expect(computeSegmentId(2500, mockVideoRendition)).toBe(3); // Third segment
    });

    test("returns undefined when segmentDurationMs is not available", ({
      expect,
    }) => {
      const renditionWithoutDuration = {
        trackId: 1,
        src: "test.mp4",
        segmentDurationMs: undefined,
      } as AudioRendition;

      expect(computeSegmentId(1000, renditionWithoutDuration)).toBeUndefined();
    });

    test("handles edge case of negative time", ({
      mockAudioRendition,
      expect,
    }) => {
      expect(computeSegmentId(-100, mockAudioRendition)).toBe(1); // Should clamp to segment 1
    });
  });

  describe("calculateSegmentRange", () => {
    test("calculates segment range for single segment", ({
      mockAudioRendition,
      expect,
    }) => {
      const result = calculateSegmentRange(100, 800, mockAudioRendition);
      expect(result).toEqual([1]);
    });

    test("calculates segment range spanning multiple segments", ({
      mockAudioRendition,
      expect,
    }) => {
      const result = calculateSegmentRange(500, 2500, mockAudioRendition);
      expect(result).toEqual([1, 2, 3]);
    });

    test("calculates segment range for exact segment boundaries", ({
      mockAudioRendition,
      expect,
    }) => {
      const result = calculateSegmentRange(1000, 2000, mockAudioRendition);
      expect(result).toEqual([2, 3]);
    });

    test("handles single time point (start equals end)", ({
      mockAudioRendition,
      expect,
    }) => {
      const result = calculateSegmentRange(1500, 1500, mockAudioRendition);
      expect(result).toEqual([2]);
    });

    test("returns empty array when segmentDurationMs is not available", ({
      expect,
    }) => {
      const renditionWithoutDuration = {
        trackId: 1,
        src: "test.mp4",
        segmentDurationMs: undefined,
      } as AudioRendition;

      const result = calculateSegmentRange(
        1000,
        2000,
        renditionWithoutDuration,
      );
      expect(result).toEqual([]);
    });

    test("works with video renditions too", ({
      mockVideoRendition,
      expect,
    }) => {
      const result = calculateSegmentRange(1500, 3500, mockVideoRendition);
      expect(result).toEqual([2, 3, 4]);
    });

    test("handles edge case where start time is negative", ({
      mockAudioRendition,
      expect,
    }) => {
      const result = calculateSegmentRange(-500, 1500, mockAudioRendition);
      expect(result).toEqual([1, 2]);
    });
  });
});
