/**
 * Transcode API MSW handlers for testing
 * Provides handlers for transcode API endpoints including URL signing
 */

import { HttpResponse, http } from "msw";

/**
 * MSW handlers for transcode API endpoints
 * These handlers mock the API responses needed for tests
 */
export const transcodeMSWHandlers = [
  // URL signing endpoint handler
  // This mocks the /@ef-sign-url endpoint used by the Vite plugin
  http.post("/@ef-sign-url", async () => {
    // Return a mock JWT token
    // The token format is: header.payload.signature
    // We create a simple mock token that will pass basic validation
    const mockToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJodHRwOi8vd2ViOjMwMDAvaGVhZC1tb292LTQ4MHAubXA0IiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature";

    return HttpResponse.json(
      { token: mockToken },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }),

  // URL token endpoint handler (for proxied requests from vite plugin)
  // The vite plugin proxies /@ef-sign-url to /api/v1/url-token
  http.post("/api/v1/url-token", async () => {
    // Return the same mock JWT token as /@ef-sign-url
    const mockToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJodHRwOi8vd2ViOjMwMDAvaGVhZC1tb292LTQ4MHAubXA0IiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature";

    return HttpResponse.json(
      { token: mockToken },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }),

  // Transcode manifest endpoint handler
  // This mocks the manifest.json endpoint used by JitMediaEngine
  http.get("/api/v1/transcode/manifest.json", async ({ request }) => {
    const url = new URL(request.url);
    const sourceUrl = url.searchParams.get("url");

    if (!sourceUrl) {
      return HttpResponse.json({ error: "url parameter is required" }, { status: 400 });
    }

    // Return a mock manifest response
    const manifest = {
      version: "1.0",
      type: "cmaf",
      duration: 10,
      durationMs: 10000,
      segmentDuration: 2000,
      baseUrl: `${url.origin}/api/v1/transcode`,
      sourceUrl: sourceUrl,
      audioRenditions: [
        {
          id: "audio",
          src: sourceUrl,
          segmentDurationMs: 2000,
        },
      ],
      videoRenditions: [
        {
          id: "high",
          src: sourceUrl,
          segmentDurationMs: 2000,
        },
      ],
      endpoints: {
        initSegment: `${url.origin}/api/v1/transcode/{rendition}/init.m4s?url=${encodeURIComponent(sourceUrl)}`,
        mediaSegment: `${url.origin}/api/v1/transcode/{rendition}/{segmentId}.m4s?url=${encodeURIComponent(sourceUrl)}`,
      },
      jitInfo: {
        parallelTranscodingSupported: true,
        expectedTranscodeLatency: 1000,
        segmentCount: 5,
      },
    };

    return HttpResponse.json(manifest, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),

  // Transcode init segment endpoint handler
  http.get("/api/v1/transcode/:rendition/init.m4s", async () => {
    // Return a minimal valid MP4 init segment
    // This is a very basic ftyp + moov box structure
    const initSegment = new Uint8Array([
      // ftyp box
      0x00,
      0x00,
      0x00,
      0x20, // box size
      0x66,
      0x74,
      0x79,
      0x70, // 'ftyp'
      0x69,
      0x73,
      0x6f,
      0x6d, // major brand 'isom'
      0x00,
      0x00,
      0x02,
      0x00, // minor version
      0x69,
      0x73,
      0x6f,
      0x6d, // compatible brand 'isom'
      0x69,
      0x73,
      0x6f,
      0x32, // compatible brand 'iso2'
      0x6d,
      0x70,
      0x34,
      0x31, // compatible brand 'mp41'
      // moov box (minimal)
      0x00,
      0x00,
      0x00,
      0x08, // box size
      0x6d,
      0x6f,
      0x6f,
      0x76, // 'moov'
    ]);

    return HttpResponse.arrayBuffer(initSegment.buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
      },
    });
  }),

  // Transcode media segment endpoint handler
  http.get("/api/v1/transcode/:rendition/:segmentId.m4s", async () => {
    // Return a minimal valid MP4 media segment
    // This is a very basic moof + mdat box structure
    const mediaSegment = new Uint8Array([
      // moof box (minimal)
      0x00,
      0x00,
      0x00,
      0x08, // box size
      0x6d,
      0x6f,
      0x6f,
      0x66, // 'moof'
      // mdat box (minimal)
      0x00,
      0x00,
      0x00,
      0x08, // box size
      0x6d,
      0x64,
      0x61,
      0x74, // 'mdat'
    ]);

    return HttpResponse.arrayBuffer(mediaSegment.buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
      },
    });
  }),
];
