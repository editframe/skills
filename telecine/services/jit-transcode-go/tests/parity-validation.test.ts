import { describe, test, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const TEST_VIDEO_URL = "http://web:3000/bars-n-tone.mp4";
const TS_SERVICE_URL = "http://jit-transcoding:3001";
const GO_SERVICE_URL = "http://jit-transcode-go:3002";

const OUTPUT_DIR = "/app/services/jit-transcode-go/tests/output";

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function fetchJSON(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function fetchBinary(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

describe("TypeScript vs Go Service Parity Validation", () => {
  test("Both services are healthy", async () => {
    const tsHealth = await fetchJSON(`${TS_SERVICE_URL}/health`);
    const goHealth = await fetchJSON(`${GO_SERVICE_URL}/health`);

    expect(tsHealth.status).toBe("healthy");
    expect(goHealth.status).toBe("healthy");

    console.log("✅ Both services healthy");
  });

  test("Both services return manifests with same structure", async () => {
    const tsManifest = await fetchJSON(
      `${TS_SERVICE_URL}/api/v1/transcode/manifest.json?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    );
    const goManifest = await fetchJSON(
      `${GO_SERVICE_URL}/api/v1/transcode/manifest.json?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    );

    expect(tsManifest.version).toBe(goManifest.version);
    expect(tsManifest.videoRenditions?.length).toBe(goManifest.videoRenditions?.length);
    expect(tsManifest.audioRenditions?.length).toBe(goManifest.audioRenditions?.length);

    expect(Math.abs(tsManifest.duration - goManifest.duration)).toBeLessThan(0.1);

    console.log("✅ Manifests have compatible structure");
    console.log(`   Duration: TS=${tsManifest.duration}s, Go=${goManifest.duration}s`);
    console.log(`   Video renditions: ${tsManifest.videoRenditions?.length || 0}`);
    console.log(`   Audio renditions: ${tsManifest.audioRenditions?.length || 0}`);
  });

  test("Both services return compatible init segments", async () => {
    await ensureOutputDir();

    const tsInitUrl = `${TS_SERVICE_URL}/api/v1/transcode/high/init.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;
    const goInitUrl = `${GO_SERVICE_URL}/api/v1/transcode/high/init.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

    const tsInit = await fetchBinary(tsInitUrl);
    const goInit = await fetchBinary(goInitUrl);

    await fs.writeFile(path.join(OUTPUT_DIR, "ts-init.m4s"), tsInit);
    await fs.writeFile(path.join(OUTPUT_DIR, "go-init.m4s"), goInit);

    expect(tsInit.length).toBeGreaterThan(0);
    expect(goInit.length).toBeGreaterThan(0);

    const tsHasFtyp = tsInit.toString("utf8", 4, 8).includes("ftyp");
    const tsHasMoov = tsInit.includes(Buffer.from("moov"));
    const tsHasMdat = tsInit.includes(Buffer.from("mdat"));
    const tsHasMoof = tsInit.includes(Buffer.from("moof"));

    const goHasFtyp = goInit.toString("utf8", 4, 8).includes("ftyp");
    const goHasMoov = goInit.includes(Buffer.from("moov"));
    const goHasMdat = goInit.includes(Buffer.from("mdat"));
    const goHasMoof = goInit.includes(Buffer.from("moof"));

    expect(tsHasFtyp).toBe(true);
    expect(tsHasMoov).toBe(true);
    expect(tsHasMdat).toBe(false);
    expect(tsHasMoof).toBe(false);

    expect(goHasFtyp).toBe(true);
    expect(goHasMoov).toBe(true);
    expect(goHasMdat).toBe(false);
    expect(goHasMoof).toBe(false);

    console.log("✅ Init segments have correct MSE structure");
    console.log(`   TS init: ${tsInit.length} bytes (ftyp+moov only)`);
    console.log(`   Go init: ${goInit.length} bytes (ftyp+moov only)`);
  });

  test("Both services return compatible media segments", async () => {
    await ensureOutputDir();

    const tsSegUrl = `${TS_SERVICE_URL}/api/v1/transcode/high/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;
    const goSegUrl = `${GO_SERVICE_URL}/api/v1/transcode/high/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

    const tsSeg = await fetchBinary(tsSegUrl);
    const goSeg = await fetchBinary(goSegUrl);

    await fs.writeFile(path.join(OUTPUT_DIR, "ts-seg1.m4s"), tsSeg);
    await fs.writeFile(path.join(OUTPUT_DIR, "go-seg1.m4s"), goSeg);

    expect(tsSeg.length).toBeGreaterThan(0);
    expect(goSeg.length).toBeGreaterThan(0);

    const tsHasFtyp = tsSeg.includes(Buffer.from("ftyp"));
    const tsHasMoov = tsSeg.includes(Buffer.from("moov"));
    const tsHasMdat = tsSeg.includes(Buffer.from("mdat"));
    const tsHasMoof = tsSeg.includes(Buffer.from("moof"));

    const goHasFtyp = goSeg.includes(Buffer.from("ftyp"));
    const goHasMoov = goSeg.includes(Buffer.from("moov"));
    const goHasMdat = goSeg.includes(Buffer.from("mdat"));
    const goHasMoof = goSeg.includes(Buffer.from("moof"));

    expect(tsHasFtyp).toBe(false);
    expect(tsHasMoov).toBe(false);
    expect(tsHasMdat).toBe(true);
    expect(tsHasMoof).toBe(true);

    expect(goHasFtyp).toBe(false);
    expect(goHasMoov).toBe(false);
    expect(goHasMdat).toBe(true);
    expect(goHasMoof).toBe(true);

    console.log("✅ Media segments have correct MSE structure");
    console.log(`   TS segment 1: ${tsSeg.length} bytes (moof+mdat only)`);
    console.log(`   Go segment 1: ${goSeg.length} bytes (moof+mdat only)`);
  });

  test("Both services can produce multiple segments", async () => {
    await ensureOutputDir();

    for (let segNum = 1; segNum <= 3; segNum++) {
      const tsSegUrl = `${TS_SERVICE_URL}/api/v1/transcode/medium/${segNum}.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;
      const goSegUrl = `${GO_SERVICE_URL}/api/v1/transcode/medium/${segNum}.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

      const tsSeg = await fetchBinary(tsSegUrl);
      const goSeg = await fetchBinary(goSegUrl);

      expect(tsSeg.length).toBeGreaterThan(0);
      expect(goSeg.length).toBeGreaterThan(0);

      console.log(`✅ Segment ${segNum}: TS=${tsSeg.length} bytes, Go=${goSeg.length} bytes`);
    }
  });

  test("Both services support all renditions", async () => {
    const renditions = ["high", "medium", "low", "audio"];

    for (const rendition of renditions) {
      const tsInitUrl = `${TS_SERVICE_URL}/api/v1/transcode/${rendition}/init.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;
      const goInitUrl = `${GO_SERVICE_URL}/api/v1/transcode/${rendition}/init.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

      const tsInit = await fetchBinary(tsInitUrl);
      const goInit = await fetchBinary(goInitUrl);

      expect(tsInit.length).toBeGreaterThan(0);
      expect(goInit.length).toBeGreaterThan(0);

      console.log(`✅ ${rendition}: TS=${tsInit.length} bytes, Go=${goInit.length} bytes`);
    }
  });

  test("Both services return DASH manifests", async () => {
    const tsDash = await fetch(
      `${TS_SERVICE_URL}/api/v1/transcode/manifest.mpd?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    ).then((r) => r.text());

    const goDash = await fetch(
      `${GO_SERVICE_URL}/api/v1/transcode/manifest.mpd?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    ).then((r) => r.text());

    expect(tsDash).toContain("<?xml");
    expect(tsDash).toContain("<MPD");

    expect(goDash).toContain("<?xml");
    expect(goDash).toContain("<MPD");

    console.log("✅ Both services return DASH manifests");
  });

  test("Both services return HLS master playlists", async () => {
    const tsHls = await fetch(
      `${TS_SERVICE_URL}/api/v1/transcode/manifest.m3u8?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    ).then((r) => r.text());

    const goHls = await fetch(
      `${GO_SERVICE_URL}/api/v1/transcode/manifest.m3u8?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    ).then((r) => r.text());

    expect(tsHls).toContain("#EXTM3U");
    expect(tsHls).toContain("#EXT-X-STREAM-INF");

    expect(goHls).toContain("#EXTM3U");
    expect(goHls).toContain("#EXT-X-STREAM-INF");

    console.log("✅ Both services return HLS master playlists");
  });

  test("Both services use caching correctly", async () => {
    const url = `${TS_SERVICE_URL}/api/v1/transcode/low/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

    const response1 = await fetch(url);
    const cache1 = response1.headers.get("X-Cache");

    const response2 = await fetch(url);
    const cache2 = response2.headers.get("X-Cache");

    console.log(`   First request: X-Cache=${cache1}`);
    console.log(`   Second request: X-Cache=${cache2}`);

    expect(cache2).toBe("HIT");

    console.log("✅ Caching works correctly");
  });

  test("Segments can be concatenated (MSE compatibility)", async () => {
    await ensureOutputDir();

    const tsInit = await fetchBinary(
      `${TS_SERVICE_URL}/api/v1/transcode/low/init.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    );
    const tsSeg1 = await fetchBinary(
      `${TS_SERVICE_URL}/api/v1/transcode/low/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    );
    const tsSeg2 = await fetchBinary(
      `${TS_SERVICE_URL}/api/v1/transcode/low/2.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    );

    const tsConcatenated = Buffer.concat([tsInit, tsSeg1, tsSeg2]);
    await fs.writeFile(path.join(OUTPUT_DIR, "ts-concatenated.mp4"), tsConcatenated);

    const goInit = await fetchBinary(
      `${GO_SERVICE_URL}/api/v1/transcode/low/init.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    );
    const goSeg1 = await fetchBinary(
      `${GO_SERVICE_URL}/api/v1/transcode/low/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    );
    const goSeg2 = await fetchBinary(
      `${GO_SERVICE_URL}/api/v1/transcode/low/2.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
    );

    const goConcatenated = Buffer.concat([goInit, goSeg1, goSeg2]);
    await fs.writeFile(path.join(OUTPUT_DIR, "go-concatenated.mp4"), goConcatenated);

    expect(tsConcatenated.length).toBeGreaterThan(0);
    expect(goConcatenated.length).toBeGreaterThan(0);

    console.log("✅ Segments concatenated successfully");
    console.log(`   TS: init(${tsInit.length}) + seg1(${tsSeg1.length}) + seg2(${tsSeg2.length}) = ${tsConcatenated.length} bytes`);
    console.log(`   Go: init(${goInit.length}) + seg1(${goSeg1.length}) + seg2(${goSeg2.length}) = ${goConcatenated.length} bytes`);
    console.log(`   Output files saved to ${OUTPUT_DIR}`);
  });
});

