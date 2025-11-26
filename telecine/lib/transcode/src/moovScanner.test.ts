import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { useMSW } from "TEST/util/useMSW";
import { useTestHttpServer } from "../tests/TestHttpServer.js";
import {
  fetchMoovAndFtyp,
  fetchLocalMoovAndFtyp,
  fetchMoovAndFtypUnified,
  buildFakeMp4,
  buildMp4FromSegment,
  createDummyMdat,
} from "./moovScanner.js";
import type { MoovCacheEntry } from "./moovScanner.js";

describe("MOOV Scanner", () => {
  const testServer = useTestHttpServer();
  const server = useMSW();

  // Test file constants
  const TEST_FILES = {
    headMoov720p: "head-moov-720p.mp4",
    tailMoov720p: "tail-moov-720p.mp4",
    headMoov1080p: "head-moov-1080p.mp4",
    tailMoov1080p: "tail-moov-1080p.mp4",
    headMoov480p: "head-moov-480p.mp4",
    tailMoov480p: "tail-moov-480p.mp4",
  };

  const getLocalPath = (filename: string) =>
    `/app/test-assets/transcode/${filename}`;
  const getFileUrl = (filename: string) => `file://${getLocalPath(filename)}`;

  describe("MOOV and FTYP Box Extraction", () => {
    describe("Head MOOV files", () => {
      test("extracts MOOV and FTYP from HTTP head-moov file", async () => {
        const url = testServer.getFileUrl(TEST_FILES.headMoov720p);
        const result = await fetchMoovAndFtyp(url);

        expect(result).toBeDefined();
        expect(result.url).toBe(url);
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
        expect(result.totalSize).toBeGreaterThan(0);
        expect(result.moov).toBeInstanceOf(Uint8Array);
        expect(result.ftyp).toBeInstanceOf(Uint8Array);
      });

      test("extracts MOOV and FTYP from local head-moov file", async () => {
        const path = getLocalPath(TEST_FILES.headMoov720p);
        const result = await fetchLocalMoovAndFtyp(path);

        expect(result).toBeDefined();
        expect(result.url).toBe(path);
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
        expect(result.totalSize).toBeGreaterThan(0);
        expect(result.moov).toBeInstanceOf(Uint8Array);
        expect(result.ftyp).toBeInstanceOf(Uint8Array);
      });

      test("extracts MOOV and FTYP from file:// URL", async () => {
        const fileUrl = getFileUrl(TEST_FILES.headMoov720p);
        const result = await fetchLocalMoovAndFtyp(fileUrl);

        expect(result).toBeDefined();
        expect(result.url).toBe(fileUrl);
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
        expect(result.totalSize).toBeGreaterThan(0);
      });
    });

    describe("Tail MOOV files", () => {
      test("extracts MOOV and FTYP from HTTP tail-moov file", async () => {
        const url = testServer.getFileUrl(TEST_FILES.tailMoov720p);
        const result = await fetchMoovAndFtyp(url);

        expect(result).toBeDefined();
        expect(result.url).toBe(url);
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
        expect(result.totalSize).toBeGreaterThan(0);
        expect(result.moov).toBeInstanceOf(Uint8Array);
        expect(result.ftyp).toBeInstanceOf(Uint8Array);
      });

      test("extracts MOOV and FTYP from local tail-moov file", async () => {
        const path = getLocalPath(TEST_FILES.tailMoov720p);
        const result = await fetchLocalMoovAndFtyp(path);

        expect(result).toBeDefined();
        expect(result.url).toBe(path);
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
        expect(result.totalSize).toBeGreaterThan(0);
        expect(result.moov).toBeInstanceOf(Uint8Array);
        expect(result.ftyp).toBeInstanceOf(Uint8Array);
      });
    });
  });

  describe("Input Source Handling", () => {
    describe("Unified scanner routing", () => {
      test("handles HTTP URLs through unified interface", async () => {
        const url = testServer.getFileUrl(TEST_FILES.headMoov720p);
        const result = await fetchMoovAndFtypUnified(url);

        expect(result).toBeDefined();
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
      });

      test("handles file:// URLs through unified interface", async () => {
        const fileUrl = getFileUrl(TEST_FILES.headMoov720p);
        const result = await fetchMoovAndFtypUnified(fileUrl);

        expect(result).toBeDefined();
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
      });

      test("handles absolute file paths through unified interface", async () => {
        const path = getLocalPath(TEST_FILES.headMoov720p);
        const result = await fetchMoovAndFtypUnified(path);

        expect(result).toBeDefined();
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
      });
    });
  });

  describe("Data Consistency", () => {
    test("HTTP and local access return identical MOOV boxes", async () => {
      const httpUrl = testServer.getFileUrl(TEST_FILES.headMoov720p);
      const localPath = getLocalPath(TEST_FILES.headMoov720p);

      const httpResult = await fetchMoovAndFtyp(httpUrl);
      const localResult = await fetchLocalMoovAndFtyp(localPath);

      expect(httpResult.moov).toEqual(localResult.moov);
    });

    test("HTTP and local access return identical FTYP boxes", async () => {
      const httpUrl = testServer.getFileUrl(TEST_FILES.headMoov720p);
      const localPath = getLocalPath(TEST_FILES.headMoov720p);

      const httpResult = await fetchMoovAndFtyp(httpUrl);
      const localResult = await fetchLocalMoovAndFtyp(localPath);

      expect(httpResult.ftyp).toEqual(localResult.ftyp);
    });

    test("HTTP and local access return same total file size", async () => {
      const httpUrl = testServer.getFileUrl(TEST_FILES.headMoov720p);
      const localPath = getLocalPath(TEST_FILES.headMoov720p);

      const httpResult = await fetchMoovAndFtyp(httpUrl);
      const localResult = await fetchLocalMoovAndFtyp(localPath);

      expect(httpResult.totalSize).toBe(localResult.totalSize);
    });

    test("unified scanner returns identical results for same file", async () => {
      const httpUrl = testServer.getFileUrl(TEST_FILES.headMoov720p);
      const localPath = getLocalPath(TEST_FILES.headMoov720p);

      const httpResult = await fetchMoovAndFtypUnified(httpUrl);
      const localResult = await fetchMoovAndFtypUnified(localPath);

      expect(httpResult.moov).toEqual(localResult.moov);
      expect(httpResult.ftyp).toEqual(localResult.ftyp);
      expect(httpResult.totalSize).toBe(localResult.totalSize);
    });
  });

  describe("Error Handling", () => {
    describe("HTTP errors", () => {
      test("throws error for 404 not found (no range request support)", async () => {
        const nonExistentUrl = testServer.getFileUrl("non-existent-file.mp4");

        // Now that we validate range request support, 404 responses should throw errors
        // because they don't return 206 Partial Content as required
        await expect(fetchMoovAndFtyp(nonExistentUrl)).rejects.toThrow(
          "Unexpected HEAD response for range request: 404 Not Found. Expected 206 Partial Content to confirm range request support.",
        );
      });

      test("handles network connection errors", async () => {
        // This test depends on the server implementation
        // For now, we'll test that our scanner handles the error gracefully
        const invalidUrl = "http://localhost:99999/non-existent";

        await expect(fetchMoovAndFtyp(invalidUrl)).rejects.toThrow();
      });
    });

    describe("File system errors", () => {
      test("handles non-existent files", async () => {
        const nonExistentPath =
          "/app/test-assets/transcode/non-existent-file.mp4";

        await expect(fetchLocalMoovAndFtyp(nonExistentPath)).rejects.toThrow();
      });

      test("handles directories instead of files", async () => {
        const directoryPath = "/app/test-assets/transcode";

        await expect(fetchLocalMoovAndFtyp(directoryPath)).rejects.toThrow(
          "Path is not a file",
        );
      });

      test("handles invalid file:// URLs", async () => {
        const invalidFileUrl = "file:///non-existent-path/file.mp4";

        await expect(fetchLocalMoovAndFtyp(invalidFileUrl)).rejects.toThrow();
      });
    });

    describe("Unified scanner error handling", () => {
      test("propagates HTTP 404 errors through unified interface", async () => {
        const nonExistentUrl = testServer.getFileUrl("non-existent-file.mp4");

        // Should behave the same as direct HTTP scanner - throw range request error
        await expect(fetchMoovAndFtypUnified(nonExistentUrl)).rejects.toThrow(
          "Unexpected HEAD response for range request: 404 Not Found. Expected 206 Partial Content to confirm range request support.",
        );
      });

      test("propagates file system errors through unified interface", async () => {
        const nonExistentPath =
          "/app/test-assets/transcode/non-existent-file.mp4";

        await expect(
          fetchMoovAndFtypUnified(nonExistentPath),
        ).rejects.toThrow();
      });
    });

    describe("Range request validation errors", () => {
      const TEST_URL = "https://example.com/test-video.mp4";

      test("throws error when HEAD request returns 200 instead of 206", async () => {
        server.use(
          http.head(TEST_URL, () => {
            return new HttpResponse(null, {
              status: 200,
              headers: {
                "content-length": "1000000",
                "content-type": "video/mp4",
              },
            });
          }),
        );

        await expect(fetchMoovAndFtyp(TEST_URL)).rejects.toThrow(
          "Server does not support HTTP range requests. HEAD request with Range header returned 200 instead of 206",
        );
      });

      test("throws error when HEAD request returns 400 bad request", async () => {
        server.use(
          http.head(TEST_URL, () => {
            return new HttpResponse(null, {
              status: 400,
              statusText: "Bad Request",
            });
          }),
        );

        await expect(fetchMoovAndFtyp(TEST_URL)).rejects.toThrow(
          "Unexpected HEAD response for range request: 400 Bad Request. Expected 206 Partial Content to confirm range request support.",
        );
      });

      test("throws error when HEAD request returns 416 range not satisfiable", async () => {
        server.use(
          http.head(TEST_URL, () => {
            return new HttpResponse(null, {
              status: 416,
              statusText: "Range Not Satisfiable",
            });
          }),
        );

        await expect(fetchMoovAndFtyp(TEST_URL)).rejects.toThrow(
          "Unexpected HEAD response for range request: 416 Range Not Satisfiable. Expected 206 Partial Content to confirm range request support.",
        );
      });

      test("returns failure result when GET request returns 200 instead of 206", async () => {
        server.use(
          // HEAD request properly supports ranges
          http.head(TEST_URL, () => {
            return new HttpResponse(null, {
              status: 206,
              headers: {
                "content-range": "bytes 0-1048575/1000000",
                "content-length": "1048576",
                "content-type": "video/mp4",
              },
            });
          }),
          // GET request ignores Range header and returns full content
          http.get(TEST_URL, () => {
            return new HttpResponse(new Uint8Array(1000000), {
              status: 200, // Should be 206 for range requests
              headers: {
                "content-length": "1000000",
                "content-type": "video/mp4",
              },
            });
          }),
        );

        // Error is caught and logged, but function returns failure result
        const result = await fetchMoovAndFtyp(TEST_URL);
        expect(result.ftyp).toBeNull();
        expect(result.moov).toBeNull();
        expect(result.totalSize).toBe(1000000);
      });

      test("returns failure result when GET request returns 206 but missing Content-Range header", async () => {
        server.use(
          // HEAD request properly supports ranges
          http.head(TEST_URL, () => {
            return new HttpResponse(null, {
              status: 206,
              headers: {
                "content-range": "bytes 0-1048575/1000000",
                "content-length": "1048576",
                "content-type": "video/mp4",
              },
            });
          }),
          // GET request returns 206 but missing Content-Range header
          http.get(TEST_URL, () => {
            return new HttpResponse(new Uint8Array(1048576), {
              status: 206,
              headers: {
                // Missing Content-Range header
                "content-length": "1048576",
                "content-type": "video/mp4",
              },
            });
          }),
        );

        // Error is caught and logged, but function returns failure result
        const result = await fetchMoovAndFtyp(TEST_URL);
        expect(result.ftyp).toBeNull();
        expect(result.moov).toBeNull();
        expect(result.totalSize).toBe(1000000);
      });

      test("returns failure result when GET request returns unexpected status", async () => {
        server.use(
          // HEAD request properly supports ranges
          http.head(TEST_URL, () => {
            return new HttpResponse(null, {
              status: 206,
              headers: {
                "content-range": "bytes 0-1048575/1000000",
                "content-length": "1048576",
                "content-type": "video/mp4",
              },
            });
          }),
          // GET request returns unexpected status
          http.get(TEST_URL, () => {
            return new HttpResponse(null, {
              status: 500,
              statusText: "Internal Server Error",
            });
          }),
        );

        // Error is caught and logged, but function returns failure result
        const result = await fetchMoovAndFtyp(TEST_URL);
        expect(result.ftyp).toBeNull();
        expect(result.moov).toBeNull();
        expect(result.totalSize).toBe(1000000);
      });

      test("extracts total file size from Content-Range header", async () => {
        const totalSize = 62956262; // Size similar to the real demo.mp4

        // Create minimal valid MP4 data with ftyp and moov boxes
        const ftypBox = new Uint8Array(32);
        const ftypView = new DataView(ftypBox.buffer);
        ftypView.setUint32(0, 32); // box size
        ftypBox.set(new TextEncoder().encode("ftyp"), 4); // box type

        const moovBox = new Uint8Array(1000);
        const moovView = new DataView(moovBox.buffer);
        moovView.setUint32(0, 1000); // box size
        moovBox.set(new TextEncoder().encode("moov"), 4); // box type

        const combinedData = new Uint8Array(ftypBox.length + moovBox.length);
        combinedData.set(ftypBox, 0);
        combinedData.set(moovBox, ftypBox.length);

        server.use(
          http.head(TEST_URL, () => {
            return new HttpResponse(null, {
              status: 206,
              headers: {
                "content-range": `bytes 0-1048575/${totalSize}`,
                "content-length": "1048576",
                "content-type": "video/mp4",
              },
            });
          }),
          http.get(TEST_URL, ({ request }) => {
            const range = request.headers.get("range");
            if (range?.includes("0-1048575")) {
              return new HttpResponse(combinedData, {
                status: 206,
                headers: {
                  "content-range": `bytes 0-1031/${totalSize}`,
                  "content-length": combinedData.length.toString(),
                  "content-type": "video/mp4",
                },
              });
            }
            return new HttpResponse(null, { status: 400 });
          }),
        );

        const result = await fetchMoovAndFtyp(TEST_URL);

        expect(result.totalSize).toBe(totalSize);
        expect(result.ftyp).toBeDefined();
        expect(result.moov).toBeDefined();
      });

      test("handles Content-Range header without total size", async () => {
        // Create minimal valid MP4 data
        const ftypBox = new Uint8Array(32);
        const ftypView = new DataView(ftypBox.buffer);
        ftypView.setUint32(0, 32);
        ftypBox.set(new TextEncoder().encode("ftyp"), 4);

        const moovBox = new Uint8Array(1000);
        const moovView = new DataView(moovBox.buffer);
        moovView.setUint32(0, 1000);
        moovBox.set(new TextEncoder().encode("moov"), 4);

        const combinedData = new Uint8Array(ftypBox.length + moovBox.length);
        combinedData.set(ftypBox, 0);
        combinedData.set(moovBox, ftypBox.length);

        server.use(
          http.head(TEST_URL, () => {
            return new HttpResponse(null, {
              status: 206,
              headers: {
                "content-range": "bytes 0-1048575/*", // No total size
                "content-length": "1048576",
                "content-type": "video/mp4",
              },
            });
          }),
          http.get(TEST_URL, () => {
            return new HttpResponse(combinedData, {
              status: 206,
              headers: {
                "content-range": "bytes 0-1031/*", // No total size
                "content-length": combinedData.length.toString(),
                "content-type": "video/mp4",
              },
            });
          }),
        );

        const result = await fetchMoovAndFtyp(TEST_URL);

        // Should fall back to content-length from HEAD request
        expect(result.totalSize).toBe(1048576);
        expect(result.ftyp).toBeDefined();
        expect(result.moov).toBeDefined();
      });
    });
  });

  describe("MP4 Box Structure Validation", () => {
    test("validates MOOV box structure", async () => {
      const path = getLocalPath(TEST_FILES.headMoov720p);
      const result = await fetchLocalMoovAndFtyp(path);

      expect(result.moov).toBeDefined();
      expect(result.moov!.length).toBeGreaterThan(8);

      // Check that MOOV box has valid header
      const view = new DataView(result.moov!.buffer);
      const boxSize = view.getUint32(0);
      expect(boxSize).toBe(result.moov!.length);

      // Check MOOV signature
      const signature = new TextDecoder().decode(result.moov!.slice(4, 8));
      expect(signature).toBe("moov");
    });

    test("validates FTYP box structure", async () => {
      const path = getLocalPath(TEST_FILES.headMoov720p);
      const result = await fetchLocalMoovAndFtyp(path);

      expect(result.ftyp).toBeDefined();
      expect(result.ftyp!.length).toBeGreaterThan(8);

      // Check that FTYP box has valid header
      const view = new DataView(result.ftyp!.buffer);
      const boxSize = view.getUint32(0);
      expect(boxSize).toBe(result.ftyp!.length);

      // Check FTYP signature
      const signature = new TextDecoder().decode(result.ftyp!.slice(4, 8));
      expect(signature).toBe("ftyp");
    });
  });

  describe("Multiple File Format Support", () => {
    test("handles different resolutions consistently", async () => {
      const files = [
        TEST_FILES.headMoov480p,
        TEST_FILES.headMoov720p,
        TEST_FILES.headMoov1080p,
      ];

      for (const filename of files) {
        const path = getLocalPath(filename);
        const result = await fetchLocalMoovAndFtyp(path);

        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
        expect(result.totalSize).toBeGreaterThan(0);

        // All should have valid box structures
        const moovSignature = new TextDecoder().decode(
          result.moov!.slice(4, 8),
        );
        const ftypSignature = new TextDecoder().decode(
          result.ftyp!.slice(4, 8),
        );
        expect(moovSignature).toBe("moov");
        expect(ftypSignature).toBe("ftyp");
      }
    });

    test("handles both head and tail MOOV files", async () => {
      const headFiles = [
        TEST_FILES.headMoov480p,
        TEST_FILES.headMoov720p,
        TEST_FILES.headMoov1080p,
      ];
      const tailFiles = [
        TEST_FILES.tailMoov480p,
        TEST_FILES.tailMoov720p,
        TEST_FILES.tailMoov1080p,
      ];

      // Test head MOOV files
      for (const filename of headFiles) {
        const path = getLocalPath(filename);
        const result = await fetchLocalMoovAndFtyp(path);
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
      }

      // Test tail MOOV files
      for (const filename of tailFiles) {
        const path = getLocalPath(filename);
        const result = await fetchLocalMoovAndFtyp(path);
        expect(result.moov).toBeDefined();
        expect(result.ftyp).toBeDefined();
      }
    });
  });

  describe("MP4 Construction Utilities", () => {
    describe("createDummyMdat", () => {
      test("creates valid MDAT box with default size", () => {
        const mdat = createDummyMdat();

        expect(mdat).toBeInstanceOf(Uint8Array);
        expect(mdat.length).toBe(8);

        // Check box size (first 4 bytes, big-endian)
        const view = new DataView(mdat.buffer);
        expect(view.getUint32(0)).toBe(8);

        // Check box type 'mdat' (bytes 4-7)
        expect(mdat[4]).toBe(0x6d); // 'm'
        expect(mdat[5]).toBe(0x64); // 'd'
        expect(mdat[6]).toBe(0x61); // 'a'
        expect(mdat[7]).toBe(0x74); // 't'
      });

      test("creates valid MDAT box with custom size", () => {
        const customSize = 1024;
        const mdat = createDummyMdat(customSize);

        expect(mdat).toBeInstanceOf(Uint8Array);
        expect(mdat.length).toBe(customSize);

        const view = new DataView(mdat.buffer);
        expect(view.getUint32(0)).toBe(customSize);
      });

      test("rejects invalid sizes less than 8 bytes", () => {
        expect(() => createDummyMdat(7)).toThrow(
          "mdat size must be at least 8 bytes",
        );
        expect(() => createDummyMdat(0)).toThrow(
          "mdat size must be at least 8 bytes",
        );
        expect(() => createDummyMdat(-1)).toThrow(
          "mdat size must be at least 8 bytes",
        );
      });
    });

    describe("buildFakeMp4", () => {
      test("constructs valid MP4 from FTYP and MOOV boxes", async () => {
        // Get real FTYP and MOOV boxes from a test file
        const path = getLocalPath(TEST_FILES.headMoov720p);
        const { ftyp, moov } = await fetchLocalMoovAndFtyp(path);

        const fakeMp4 = buildFakeMp4(ftyp!, moov!);

        expect(fakeMp4).toBeInstanceOf(Uint8Array);
        expect(fakeMp4.length).toBeGreaterThan(ftyp!.length + moov!.length);

        // Verify the structure starts with FTYP
        expect(fakeMp4.slice(0, ftyp!.length)).toEqual(ftyp);
      });

      test("creates MP4 with correct box order", async () => {
        const path = getLocalPath(TEST_FILES.headMoov720p);
        const { ftyp, moov } = await fetchLocalMoovAndFtyp(path);

        const fakeMp4 = buildFakeMp4(ftyp!, moov!);

        // Verify FTYP comes first
        expect(fakeMp4.slice(0, ftyp!.length)).toEqual(ftyp);

        // Verify MOOV comes second
        expect(
          fakeMp4.slice(ftyp!.length, ftyp!.length + moov!.length),
        ).toEqual(moov);

        // Verify MDAT comes last and has correct signature
        const mdatStart = ftyp!.length + moov!.length;
        const mdatSignature = new TextDecoder().decode(
          fakeMp4.slice(mdatStart + 4, mdatStart + 8),
        );
        expect(mdatSignature).toBe("mdat");
      });

      test("rejects missing required boxes", async () => {
        const path = getLocalPath(TEST_FILES.headMoov720p);
        const { ftyp, moov } = await fetchLocalMoovAndFtyp(path);

        expect(() => buildFakeMp4(null as any, moov!)).toThrow(
          "Both ftyp and moov boxes are required",
        );
        expect(() => buildFakeMp4(ftyp!, null as any)).toThrow(
          "Both ftyp and moov boxes are required",
        );
        expect(() => buildFakeMp4(null as any, null as any)).toThrow(
          "Both ftyp and moov boxes are required",
        );
      });
    });

    describe("buildMp4FromSegment", () => {
      test("reconstructs valid MP4 from segment data", async () => {
        const path = getLocalPath(TEST_FILES.headMoov720p);
        const { ftyp, moov } = await fetchLocalMoovAndFtyp(path);
        const segmentData = new Uint8Array([1, 2, 3, 4, 5]); // Dummy segment data

        const mp4 = buildMp4FromSegment(ftyp!, moov!, segmentData);

        expect(mp4).toBeInstanceOf(Uint8Array);
        expect(mp4.length).toBeGreaterThan(
          ftyp!.length + moov!.length + segmentData.length,
        );

        // Verify structure starts with FTYP
        expect(mp4.slice(0, ftyp!.length)).toEqual(ftyp);
      });

      test("creates proper MDAT header for segment data", async () => {
        const path = getLocalPath(TEST_FILES.headMoov720p);
        const { ftyp, moov } = await fetchLocalMoovAndFtyp(path);
        const segmentData = new Uint8Array([1, 2, 3, 4, 5]);

        const mp4 = buildMp4FromSegment(ftyp!, moov!, segmentData);

        // Find MDAT box
        const mdatStart = ftyp!.length + moov!.length;
        const mdatSizeView = new DataView(mp4.buffer, mdatStart, 4);
        const mdatSize = mdatSizeView.getUint32(0);

        expect(mdatSize).toBe(8 + segmentData.length); // 8 byte header + segment data

        // Verify MDAT signature
        const mdatSignature = new TextDecoder().decode(
          mp4.slice(mdatStart + 4, mdatStart + 8),
        );
        expect(mdatSignature).toBe("mdat");

        // Verify segment data is included
        const actualSegmentData = mp4.slice(
          mdatStart + 8,
          mdatStart + 8 + segmentData.length,
        );
        expect(actualSegmentData).toEqual(segmentData);
      });

      test("rejects missing required data", async () => {
        const path = getLocalPath(TEST_FILES.headMoov720p);
        const { ftyp, moov } = await fetchLocalMoovAndFtyp(path);
        const segmentData = new Uint8Array([1, 2, 3]);

        expect(() =>
          buildMp4FromSegment(null as any, moov!, segmentData),
        ).toThrow("Both ftyp and moov boxes are required");
        expect(() =>
          buildMp4FromSegment(ftyp!, null as any, segmentData),
        ).toThrow("Both ftyp and moov boxes are required");
        expect(() => buildMp4FromSegment(ftyp!, moov!, null as any)).toThrow(
          "Segment data is required",
        );
        expect(() =>
          buildMp4FromSegment(ftyp!, moov!, new Uint8Array(0)),
        ).toThrow("Segment data is required");
      });
    });
  });
});
