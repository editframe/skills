import { HttpResponse, http } from "msw";

export const assetMSWHandlers = [
  http.get("/api/v1/files/:id/index", async () => {
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

  http.get("/api/v1/files/:id/tracks/:trackId", async ({ request }) => {
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const mockData = new ArrayBuffer(1024);
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
