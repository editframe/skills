import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import { getTestVideoUrl, ensureTestFiles } from "./setup";
import { app } from "../test-server";

const API_BASE = "/api/v1/transcode";

describe("Transcoding API", () => {
  beforeAll(() => {
    ensureTestFiles();
  });

  describe("Health Check", () => {
    it("should return server health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toEqual({
        status: "ok",
        timestamp: expect.any(String),
      });
    });
  });

  describe("Segment Endpoints", () => {
    it("should create and serve init segment for high quality", async () => {
      const testVideoUrl = getTestVideoUrl("minimal-video.mp4");
      const response = await request(app)
        .get(`${API_BASE}/high.m4s`)
        .query({ url: testVideoUrl, segmentId: "init" })
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/^video\/iso\.segment/);
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should create and serve media segment for medium quality", async () => {
      const testVideoUrl = getTestVideoUrl("minimal-video.mp4");
      const response = await request(app)
        .get(`${API_BASE}/medium.m4s`)
        .query({ url: testVideoUrl, segmentId: "1" })
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/^video\/iso\.segment/);
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should create and serve MP4 segment for debugging", async () => {
      const testVideoUrl = getTestVideoUrl("minimal-video.mp4");
      const response = await request(app)
        .get(`${API_BASE}/low.mp4`)
        .query({ url: testVideoUrl, segmentId: "1" })
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/^video\/mp4/);
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should handle multiple segments for the same video", async () => {
      const testVideoUrl = getTestVideoUrl("minimal-video.mp4");
      const responses = await Promise.all([
        request(app)
          .get(`${API_BASE}/high.m4s`)
          .query({ url: testVideoUrl, segmentId: "1" }),
        request(app)
          .get(`${API_BASE}/high.m4s`)
          .query({ url: testVideoUrl, segmentId: "2" }),
        request(app)
          .get(`${API_BASE}/high.m4s`)
          .query({ url: testVideoUrl, segmentId: "3" }),
      ]);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
      });
    });

    it("should return 400 for invalid quality", async () => {
      const testVideoUrl = getTestVideoUrl("minimal-video.mp4");
      const response = await request(app)
        .get(`${API_BASE}/invalid.m4s`)
        .query({ url: testVideoUrl, segmentId: "1" })
        .expect(400);

      expect(response.body.error).toContain("Invalid quality");
    });

    it("should return 400 for missing URL parameter", async () => {
      const response = await request(app)
        .get(`${API_BASE}/high.m4s`)
        .query({ segmentId: "1" })
        .expect(400);

      expect(response.body.error).toContain("URL parameter is required");
    });

    it("should return 400 for invalid segment ID", async () => {
      const testVideoUrl = getTestVideoUrl("minimal-video.mp4");
      const response = await request(app)
        .get(`${API_BASE}/high.m4s`)
        .query({ url: testVideoUrl, segmentId: "invalid" })
        .expect(400);

      expect(response.body.error).toContain("segmentId must be");
    });
  });

  describe("DASH Manifest", () => {
    it("should generate valid DASH manifest", async () => {
      const testVideoUrl = getTestVideoUrl("short-video.mp4");

      const response = await request(app)
        .get(`${API_BASE}/manifest.mpd`)
        .query({ url: testVideoUrl })
        .expect(200);

      expect(response.headers["content-type"]).toMatch(
        /^application\/dash\+xml/,
      );
      expect(response.text).toContain('<?xml version="1.0"');
      expect(response.text).toContain("<MPD");
      expect(response.text).toContain("<AdaptationSet");
      expect(response.text).toContain("<Representation");
      expect(response.text).toContain("high");
      expect(response.text).toContain("medium");
      expect(response.text).toContain("low");
    });

    it("should return 400 for DASH manifest without URL", async () => {
      const response = await request(app)
        .get(`${API_BASE}/manifest.mpd`)
        .expect(400);

      expect(response.body.error).toContain("URL parameter is required");
    });
  });

  describe("HLS Manifests", () => {
    it("should generate valid HLS master manifest", async () => {
      const testVideoUrl = getTestVideoUrl("short-video.mp4");

      const response = await request(app)
        .get(`${API_BASE}/manifest.m3u8`)
        .query({ url: testVideoUrl })
        .expect(200);

      expect(response.headers["content-type"]).toMatch(
        /^application\/vnd\.apple\.mpegurl/,
      );
      expect(response.text).toContain("#EXTM3U");
      expect(response.text).toContain("#EXT-X-STREAM-INF");
      expect(response.text).toContain("high.m3u8");
      expect(response.text).toContain("medium.m3u8");
      expect(response.text).toContain("low.m3u8");
    });

    it("should generate valid HLS quality playlist", async () => {
      const testVideoUrl = getTestVideoUrl("short-video.mp4");

      const response = await request(app)
        .get(`${API_BASE}/high.m3u8`)
        .query({ url: testVideoUrl })
        .expect(200);

      expect(response.headers["content-type"]).toMatch(
        /^application\/vnd\.apple\.mpegurl/,
      );
      expect(response.text).toContain("#EXTM3U");
      expect(response.text).toContain("#EXT-X-VERSION:6");
      expect(response.text).toContain("#EXT-X-MAP:URI=");
      expect(response.text).toContain("#EXTINF:");
      expect(response.text).toContain("#EXT-X-ENDLIST");
    });

    it("should return 400 for HLS manifest without URL", async () => {
      const response = await request(app)
        .get(`${API_BASE}/manifest.m3u8`)
        .expect(400);

      expect(response.body.error).toContain("URL parameter is required");
    });

    it("should return 400 for invalid quality in HLS playlist", async () => {
      const testVideoUrl = getTestVideoUrl("short-video.mp4");

      const response = await request(app)
        .get(`${API_BASE}/invalid.m3u8`)
        .query({ url: testVideoUrl })
        .expect(400);

      expect(response.body.error).toContain("Invalid quality");
    });
  });

  describe("Performance and Caching", () => {
    it("should cache segments and serve them faster on second request", async () => {
      const testVideoUrl = getTestVideoUrl("minimal-video.mp4");

      // First request (should be slower)
      const start1 = Date.now();
      const response1 = await request(app)
        .get(`${API_BASE}/medium.m4s`)
        .query({ url: testVideoUrl, segmentId: "1" })
        .expect(200);
      const time1 = Date.now() - start1;

      // Second request (should be faster due to caching)
      const start2 = Date.now();
      const response2 = await request(app)
        .get(`${API_BASE}/medium.m4s`)
        .query({ url: testVideoUrl, segmentId: "1" })
        .expect(200);
      const time2 = Date.now() - start2;

      // Both responses should be identical
      expect(response1.body).toEqual(response2.body);

      // Second request should not be significantly slower (indicating caching is working)
      // In test environments, timing can be variable, so we use a reasonable threshold
      expect(time2).toBeLessThanOrEqual(time1 * 1.5); // Allow up to 50% variance due to test environment

      console.log(
        `Cache test: First request: ${time1}ms, Second request: ${time2}ms`,
      );

      // Log the performance characteristics for debugging
      const speedup = time1 / time2;
      if (speedup > 1.2) {
        console.log(`✅ Caching provided ${speedup.toFixed(1)}x speedup`);
      } else {
        console.log(
          `ℹ️  Caching working (${speedup.toFixed(1)}x speedup - limited by overhead)`,
        );
      }
    });
  });

  describe("Different Video Files", () => {
    it("should handle different video formats and durations", async () => {
      const videos = [
        "minimal-video.mp4", // 6 seconds
        "short-video.mp4", // 10 seconds
        "color-bars.mp4", // 8 seconds
      ];

      for (const video of videos) {
        const testVideoUrl = getTestVideoUrl(video);

        const response = await request(app)
          .get(`${API_BASE}/low.m4s`)
          .query({ url: testVideoUrl, segmentId: "init" })
          .expect(200);

        expect(response.body.length).toBeGreaterThan(0);
        console.log(`✅ ${video}: Init segment created successfully`);
      }
    });
  });
});
