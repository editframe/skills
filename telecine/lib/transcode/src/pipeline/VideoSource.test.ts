import { describe, test, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { validateVideoSource, createVideoSource } from "./VideoSource";
import { useMSW } from "TEST/util/useMSW";
import * as fs from "node:fs";
import * as path from "node:path";

describe("VideoSource", () => {
  const server = useMSW();

  // Load real MP4 file for testing
  const getTestMp4Data = () => {
    const testFile = path.join(process.cwd(), "lib/transcode/test-assets/transcode/test-source-10s.mp4");
    return fs.readFileSync(testFile);
  };

  const TEST_URL = "https://example.com/test-video.mp4";

  test("loads metadata from remote URL with content-length", async () => {
    const mp4Data = getTestMp4Data();

    server.use(
      // Mock HEAD request with content-length
      http.head(TEST_URL, () => {
        return new HttpResponse(null, {
          headers: {
            "content-length": mp4Data.length.toString(),
            "accept-ranges": "bytes",
            "content-type": "video/mp4"
          }
        });
      }),

      // Mock range requests for head and tail scanning
      http.get(TEST_URL, ({ request }) => {
        const range = request.headers.get("range");
        if (range) {
          const match = range.match(/bytes=(\d+)-(\d*)/);
          if (match?.[1]) {
            const start = Number.parseInt(match[1], 10);
            const end = match[2] ? Number.parseInt(match[2], 10) : mp4Data.length - 1;
            const chunk = mp4Data.slice(start, end + 1);

            return new HttpResponse(chunk, {
              status: 206,
              headers: {
                "content-range": `bytes ${start}-${end}/${mp4Data.length}`,
                "content-length": chunk.length.toString(),
                "content-type": "video/mp4"
              }
            });
          }
        }

        return new HttpResponse(mp4Data, {
          headers: {
            "content-length": mp4Data.length.toString(),
            "content-type": "video/mp4"
          }
        });
      })
    );

    const result = await validateVideoSource({
      url: TEST_URL
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.streams).toBeDefined();
    expect(result.durationMs).toBeDefined();
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.streams!.length).toBeGreaterThan(0);
  }, 30000);

  test("loads metadata from remote URL without content-length (head-only scan)", async () => {
    const mp4Data = getTestMp4Data();

    server.use(
      // Mock HEAD request WITHOUT content-length header
      http.head(TEST_URL, () => {
        return new HttpResponse(null, {
          headers: {
            "accept-ranges": "bytes",
            "content-type": "video/mp4"
            // Deliberately omit content-length
          }
        });
      }),

      // Mock range requests for head scanning only
      http.get(TEST_URL, ({ request }) => {
        const range = request.headers.get("range");
        if (range) {
          const match = range.match(/bytes=(\d+)-(\d*)/);
          if (match?.[1]) {
            const start = Number.parseInt(match[1], 10);
            const end = match[2] ? Number.parseInt(match[2], 10) : Math.min(start + 1024 * 1024, mp4Data.length - 1);
            const chunk = mp4Data.slice(start, end + 1);

            return new HttpResponse(chunk, {
              status: 206,
              headers: {
                "content-range": `bytes ${start}-${end}/*`, // Use * since we don't know total size
                "content-length": chunk.length.toString(),
                "content-type": "video/mp4"
              }
            });
          }
        }

        return new HttpResponse(mp4Data, {
          headers: {
            "content-type": "video/mp4"
            // No content-length header
          }
        });
      })
    );

    using source = await createVideoSource({
      url: TEST_URL
    });

    expect(source.url).toBe(TEST_URL);
    expect(source.durationMs).toBeGreaterThan(0);
    expect(source.streams.length).toBeGreaterThan(0);
    expect(source.hasIndexEntries).toBe(true);
    expect(source.canReadPackets).toBe(false); // Should be false for synthetic MP4

    // Should have at least one video stream
    const videoStreams = source.streams.filter(s => s.codecType === 'video');
    expect(videoStreams.length).toBeGreaterThan(0);

    // Video stream should have expected properties
    const videoStream = videoStreams[0];
    expect(videoStream).toBeDefined();
    expect(videoStream!.width).toBeDefined();
    expect(videoStream!.height).toBeDefined();
    expect(videoStream!.duration).toBeGreaterThan(0);
    expect(videoStream!.codecName).toBeDefined();
  }, 30000);

  test("handles HEAD request failure gracefully", async () => {
    server.use(
      http.head(TEST_URL, () => {
        return HttpResponse.text("Network Error", { status: 500 });
      })
    );

    const result = await validateVideoSource({
      url: TEST_URL
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.streams).toBeUndefined();
    expect(result.durationMs).toBeUndefined();
  });

  test("throws error when ftyp+moov not found (unrecoverable)", async () => {
    // Create fake data without proper MP4 structure
    const fakeData = new Uint8Array(1024 * 1024); // 1MB of zeros

    server.use(
      http.head(TEST_URL, () => {
        return new HttpResponse(null, {
          headers: {
            "content-length": fakeData.length.toString(),
            "accept-ranges": "bytes",
            "content-type": "video/mp4"
          }
        });
      }),

      http.get(TEST_URL, ({ request }) => {
        const range = request.headers.get("range");
        if (range) {
          const match = range.match(/bytes=(\d+)-(\d*)/);
          if (match?.[1]) {
            const start = Number.parseInt(match[1], 10);
            const end = match[2] ? Number.parseInt(match[2], 10) : fakeData.length - 1;
            const chunk = fakeData.slice(start, end + 1);

            return new HttpResponse(chunk, {
              status: 206,
              headers: {
                "content-range": `bytes ${start}-${end}/${fakeData.length}`,
                "content-length": chunk.length.toString(),
                "content-type": "video/mp4"
              }
            });
          }
        }

        return new HttpResponse(fakeData, {
          headers: {
            "content-length": fakeData.length.toString(),
            "content-type": "video/mp4"
          }
        });
      })
    );

    // This should throw an error, not return a graceful failure
    await expect(createVideoSource({ url: TEST_URL })).rejects.toThrow("Failed to fetch video metadata");
  });

  test("handles invalid URL gracefully", async () => {
    const invalidUrl = "https://invalid.domain/nonexistent.mp4";

    server.use(
      http.head(invalidUrl, () => {
        return HttpResponse.text("Not Found", { status: 404 });
      })
    );

    const result = await validateVideoSource({
      url: invalidUrl
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.streams).toBeUndefined();
    expect(result.durationMs).toBeUndefined();
  });
}); 