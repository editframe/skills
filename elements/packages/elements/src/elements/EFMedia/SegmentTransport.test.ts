import { describe, expect, it } from "vitest";
import type { TrackRef } from "./SegmentIndex.js";
import { createUrlTransport } from "./SegmentTransport.js";
import { CachedFetcher } from "./CachedFetcher.js";

function makeFetcher(): CachedFetcher {
  return new CachedFetcher(async () => new Response("ok"));
}

describe("createUrlTransport", () => {
  const templates = {
    initSegment:
      "http://localhost/api/v1/transcode/{rendition}/init.m4s?url=http%3A%2F%2Fexample.com%2Fvideo.mp4",
    mediaSegment:
      "http://localhost/api/v1/transcode/{rendition}/{segmentId}.m4s?url=http%3A%2F%2Fexample.com%2Fvideo.mp4",
  };

  const videoTrack: TrackRef = { role: "video", id: 1, src: "video.mp4" };
  const audioTrack: TrackRef = { role: "audio", id: 2, src: "video.mp4" };

  describe("segmentIdOffset", () => {
    it("applies segmentIdOffset=1 to convert 0-based fragment IDs to 1-based JIT IDs", () => {
      const transport = createUrlTransport({
        fetcher: makeFetcher(),
        src: "http://example.com/video.mp4",
        templates,
        audioTrackId: 2,
        videoTrackId: 1,
        segmentIdOffset: 1,
      });

      // isCached calls buildSegmentUrl internally — we can check the URL via cache miss behavior
      // Instead, test that segment 0 (0-based) maps to URL with segmentId=1
      expect(transport.isCached(0, videoTrack)).toBe(false);

      // The key test: fetch segment 0 and verify the URL contains "1.m4s" not "0.m4s"
      const fetchedUrls: string[] = [];
      const spyFetcher = new CachedFetcher(async (url) => {
        fetchedUrls.push(url);
        return new Response(new ArrayBuffer(8));
      });
      const spyTransport = createUrlTransport({
        fetcher: spyFetcher,
        src: "http://example.com/video.mp4",
        templates,
        audioTrackId: 2,
        videoTrackId: 1,
        segmentIdOffset: 1,
      });

      const signal = new AbortController().signal;
      spyTransport.fetchMediaSegment(0, videoTrack, signal);
      expect(fetchedUrls[0]).toContain("/1.m4s");
      expect(fetchedUrls[0]).not.toContain("/0.m4s");
    });

    it("does not apply offset to init segment", () => {
      const fetchedUrls: string[] = [];
      const spyFetcher = new CachedFetcher(async (url) => {
        fetchedUrls.push(url);
        return new Response(new ArrayBuffer(8));
      });
      const transport = createUrlTransport({
        fetcher: spyFetcher,
        src: "http://example.com/video.mp4",
        templates,
        audioTrackId: 2,
        videoTrackId: 1,
        segmentIdOffset: 1,
      });

      const signal = new AbortController().signal;
      transport.fetchInitSegment(videoTrack, signal);
      expect(fetchedUrls[0]).toContain("/init.m4s");
    });

    it("defaults to no offset when segmentIdOffset is not specified", () => {
      const fetchedUrls: string[] = [];
      const spyFetcher = new CachedFetcher(async (url) => {
        fetchedUrls.push(url);
        return new Response(new ArrayBuffer(8));
      });
      const transport = createUrlTransport({
        fetcher: spyFetcher,
        src: "http://example.com/video.mp4",
        templates,
        audioTrackId: 2,
        videoTrackId: 1,
      });

      const signal = new AbortController().signal;
      transport.fetchMediaSegment(0, videoTrack, signal);
      expect(fetchedUrls[0]).toContain("/0.m4s");
    });

    it("applies offset correctly for audio track", () => {
      const fetchedUrls: string[] = [];
      const spyFetcher = new CachedFetcher(async (url) => {
        fetchedUrls.push(url);
        return new Response(new ArrayBuffer(8));
      });
      const transport = createUrlTransport({
        fetcher: spyFetcher,
        src: "http://example.com/video.mp4",
        templates,
        audioTrackId: 2,
        videoTrackId: 1,
        segmentIdOffset: 1,
      });

      const signal = new AbortController().signal;
      transport.fetchMediaSegment(4, audioTrack, signal);
      // Segment 4 (0-based) → 5 (1-based) in URL
      expect(fetchedUrls[0]).toContain("/5.m4s");
      expect(fetchedUrls[0]).toContain("/audio/");
    });
  });
});
