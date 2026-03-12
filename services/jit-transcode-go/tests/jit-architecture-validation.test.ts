import { describe, test, expect } from "vitest";

const TEST_VIDEO_URL = "http://web:3000/bars-n-tone.mp4";
const GO_SERVICE_URL = "http://jit-transcode-go:3002";

async function fetchWithHeaders(url: string) {
  const response = await fetch(url);
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    data: await response.arrayBuffer(),
  };
}

describe("JIT Architecture Pattern Validation", () => {
  test("Go service validates range request support", async () => {
    const headResponse = await fetch(TEST_VIDEO_URL, { method: "HEAD" });

    const acceptRanges = headResponse.headers.get("Accept-Ranges");
    console.log(`   Test video Accept-Ranges: ${acceptRanges}`);

    expect(acceptRanges).toBeTruthy();
    console.log("✅ Test video supports range requests");
  });

  test("Go service can fetch metadata efficiently", async () => {
    const manifestUrl = `${GO_SERVICE_URL}/api/v1/transcode/manifest.json?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

    const start = Date.now();
    const response = await fetch(manifestUrl);
    const manifest = await response.json();
    const elapsed = Date.now() - start;

    expect(manifest.duration).toBeGreaterThan(0);
    expect(manifest.durationMs).toBeGreaterThan(0);

    console.log("✅ Metadata fetched successfully");
    console.log(
      `   Duration: ${manifest.duration}s (${manifest.durationMs}ms)`,
    );
    console.log(`   Time: ${elapsed}ms`);
    console.log(
      `   Video renditions: ${manifest.videoRenditions?.length || 0}`,
    );
    console.log(
      `   Audio renditions: ${manifest.audioRenditions?.length || 0}`,
    );

    if (manifest.videoRenditions?.length > 0) {
      const firstRendition = manifest.videoRenditions[0];
      console.log(
        `   First rendition: ${firstRendition.id} (${firstRendition.width}x${firstRendition.height})`,
      );
      console.log(
        `   Segment count: ${firstRendition.segmentDurationsMs?.length || 0}`,
      );
    }
  });

  test("Go service returns cache status headers", async () => {
    const segmentUrl = `${GO_SERVICE_URL}/api/v1/transcode/medium/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

    const response1 = await fetchWithHeaders(segmentUrl);
    const cache1 = response1.headers["x-cache"];

    const response2 = await fetchWithHeaders(segmentUrl);
    const cache2 = response2.headers["x-cache"];

    console.log(`   First request: X-Cache=${cache1}`);
    console.log(`   Second request: X-Cache=${cache2}`);

    expect(["HIT", "MISS"]).toContain(cache1);
    expect(cache2).toBe("HIT");

    if (response1.headers["x-transcode-time-ms"]) {
      console.log(
        `   Transcode time: ${response1.headers["x-transcode-time-ms"]}ms`,
      );
    }
    if (response1.headers["x-total-server-time-ms"]) {
      console.log(
        `   Total server time: ${response1.headers["x-total-server-time-ms"]}ms`,
      );
    }

    console.log("✅ Cache headers present and correct");
  });

  test("Go service supports scrub track (30s segments)", async () => {
    const manifestUrl = `${GO_SERVICE_URL}/api/v1/transcode/manifest.json?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

    const manifest = await fetch(manifestUrl).then((r) => r.json());

    const scrubRendition = manifest.videoRenditions?.find(
      (r: any) => r.id === "scrub",
    );

    expect(scrubRendition).toBeDefined();
    expect(scrubRendition.segmentDuration).toBe(30);
    expect(scrubRendition.segmentDurationMs).toBe(30000);
    expect(scrubRendition.frameRate).toBe(15);

    console.log("✅ Scrub track configured correctly");
    console.log(
      `   Resolution: ${scrubRendition.width}x${scrubRendition.height}`,
    );
    console.log(`   Frame rate: ${scrubRendition.frameRate}fps`);
    console.log(`   Segment duration: ${scrubRendition.segmentDuration}s`);
  });

  test("Go service validates renditions correctly", async () => {
    const invalidUrl = `${GO_SERVICE_URL}/api/v1/transcode/invalid-rendition/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

    const response = await fetch(invalidUrl);

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.error).toBeDefined();
    expect(error.error.code).toBeTruthy();

    console.log("✅ Invalid rendition rejected correctly");
    console.log(`   Error code: ${error.error.code}`);
  });

  test("Go service returns proper CORS headers", async () => {
    const response = await fetch(
      `${GO_SERVICE_URL}/api/v1/transcode/manifest.json?url=${encodeURIComponent(TEST_VIDEO_URL)}`,
    );

    const corsOrigin = response.headers.get("Access-Control-Allow-Origin");
    const corsMethods = response.headers.get("Access-Control-Allow-Methods");
    const corsHeaders = response.headers.get("Access-Control-Allow-Headers");

    expect(corsOrigin).toBe("*");
    expect(corsMethods).toContain("GET");
    expect(corsHeaders).toBeTruthy();

    console.log("✅ CORS headers configured correctly");
    console.log(`   Allow-Origin: ${corsOrigin}`);
    console.log(`   Allow-Methods: ${corsMethods}`);
  });

  test("Go service segment timing matches manifest", async () => {
    const manifestUrl = `${GO_SERVICE_URL}/api/v1/transcode/manifest.json?url=${encodeURIComponent(TEST_VIDEO_URL)}`;
    const manifest = await fetch(manifestUrl).then((r) => r.json());

    const highRendition = manifest.videoRenditions?.find(
      (r: any) => r.id === "high",
    );

    expect(highRendition).toBeDefined();
    expect(highRendition.segmentDurationsMs).toBeDefined();
    expect(highRendition.segmentDurationsMs.length).toBeGreaterThan(0);

    const totalDurationFromSegments = highRendition.segmentDurationsMs.reduce(
      (sum: number, d: number) => sum + d,
      0,
    );

    const manifestDurationMs = manifest.durationMs;

    expect(
      Math.abs(totalDurationFromSegments - manifestDurationMs),
    ).toBeLessThan(100);

    console.log("✅ Segment durations match manifest");
    console.log(`   Manifest duration: ${manifestDurationMs}ms`);
    console.log(`   Sum of segments: ${totalDurationFromSegments}ms`);
    console.log(
      `   Difference: ${Math.abs(totalDurationFromSegments - manifestDurationMs)}ms`,
    );
  });
});
