/**
 * Asset-specific MSW handlers for testing
 * Provides pre-configured handlers for asset fragment indexes and track data
 */

import { HttpResponse, http } from "msw";

/**
 * Asset MSW handlers that redirect requests to real test assets
 * Use with MSW worker.use() to proxy asset requests to /test-assets/asset-mode/
 */
export const assetMSWHandlers = [
  // Fragment index handler - rewrite to test asset
  http.get("/@ef-track-fragment-index/*", async () => {
    const response = await fetch("/asset-mode/index.json");
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  // Track data handler - rewrite to test asset with proper range support
  http.get("/@ef-track/*", async ({ request }) => {
    const url = new URL(request.url);
    const trackId = url.searchParams.get("trackId");
    if (!trackId) {
      return new HttpResponse(null, { status: 400 });
    }

    const rangeHeader = request.headers.get("range");
    const response = await fetch(`/asset-mode/track-${trackId}.mp4`, {
      headers: {
        ...(rangeHeader && {
          range: rangeHeader,
        }),
      },
    });

    const contentRangeHeader = response.headers.get("Content-Range");
    return new HttpResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        ...(contentRangeHeader && {
          "Content-Range": contentRangeHeader,
        }),
      },
    });
  }),

  // Asset ID API handlers - these are needed when tests set assetId properties
  http.get("/api/v1/isobmff_files/:assetId/index", async () => {
    const mockIndex = {
      0: {
        duration: 10000,
        timescale: 1000,
        fragments: [
          {
            offset: 0,
            size: 1024,
            timestamp: 0,
            duration: 10000,
          },
        ],
      },
    };

    return HttpResponse.json(mockIndex, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),

  http.get("/api/v1/isobmff_tracks/:assetId/:trackId", async ({ request }) => {
    // Check if this is a range request
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      // Return a mock MP4 segment with proper range headers
      const mockData = new ArrayBuffer(1024); // 1KB mock data
      return new HttpResponse(mockData, {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Content-Range": rangeHeader,
          "Content-Length": "1024",
        },
      });
    }

    // Return the full mock track
    const mockData = new ArrayBuffer(1024);
    return new HttpResponse(mockData, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Length": "1024",
      },
    });
  }),
];
