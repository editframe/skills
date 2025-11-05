#!/usr/bin/env tsx

import * as fs from "node:fs/promises";
import * as path from "node:path";

const TEST_VIDEO_URL = "http://web:3000/bars-n-tone.mp4";
const TS_SERVICE_URL = "http://jit-transcoding:3001";
const GO_SERVICE_URL = "http://jit-transcode-go:3002";
const OUTPUT_DIR = "/tmp/parity-test-output";

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

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  JIT Transcoding Service Parity Validation");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");

  await ensureOutputDir();

  let passed = 0;
  let failed = 0;

  try {
    await test("Health Check - TypeScript Service", async () => {
      const health = await fetchJSON(`${TS_SERVICE_URL}/health`);
      if (health.status !== "healthy") throw new Error("Service not healthy");
      console.log(`   Response: ${JSON.stringify(health)}`);
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("Health Check - Go Service", async () => {
      const health = await fetchJSON(`${GO_SERVICE_URL}/health`);
      if (health.status !== "healthy") throw new Error("Service not healthy");
      console.log(`   Response: ${JSON.stringify(health)}`);
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("Manifest Structure Comparison", async () => {
      const tsManifest = await fetchJSON(
        `${TS_SERVICE_URL}/api/v1/transcode/manifest.json?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );
      const goManifest = await fetchJSON(
        `${GO_SERVICE_URL}/api/v1/transcode/manifest.json?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );

      console.log(`   TS duration: ${tsManifest.duration}s`);
      console.log(`   Go duration: ${goManifest.duration}s`);
      console.log(`   TS video renditions: ${tsManifest.videoRenditions?.length || 0}`);
      console.log(`   Go video renditions: ${goManifest.videoRenditions?.length || 0}`);

      if (Math.abs(tsManifest.duration - goManifest.duration) > 0.1) {
        throw new Error("Duration mismatch");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("Init Segment MSE Structure - TypeScript", async () => {
      const tsInit = await fetchBinary(
        `${TS_SERVICE_URL}/api/v1/transcode/high/init.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );

      await fs.writeFile(path.join(OUTPUT_DIR, "ts-init.m4s"), tsInit);

      const hasFtyp = tsInit.toString("utf8", 4, 8).includes("ftyp");
      const hasMoov = tsInit.includes(Buffer.from("moov"));
      const hasMdat = tsInit.includes(Buffer.from("mdat"));
      const hasMoof = tsInit.includes(Buffer.from("moof"));

      console.log(`   Size: ${tsInit.length} bytes`);
      console.log(`   Has ftyp: ${hasFtyp}, moov: ${hasMoov}, mdat: ${hasMdat}, moof: ${hasMoof}`);

      if (!hasFtyp || !hasMoov || hasMdat || hasMoof) {
        throw new Error("Invalid init segment structure");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("Init Segment MSE Structure - Go", async () => {
      const goInit = await fetchBinary(
        `${GO_SERVICE_URL}/api/v1/transcode/high/init.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );

      await fs.writeFile(path.join(OUTPUT_DIR, "go-init.m4s"), goInit);

      const hasFtyp = goInit.toString("utf8", 4, 8).includes("ftyp");
      const hasMoov = goInit.includes(Buffer.from("moov"));
      const hasMdat = goInit.includes(Buffer.from("mdat"));
      const hasMoof = goInit.includes(Buffer.from("moof"));

      console.log(`   Size: ${goInit.length} bytes`);
      console.log(`   Has ftyp: ${hasFtyp}, moov: ${hasMoov}, mdat: ${hasMdat}, moof: ${hasMoof}`);

      if (!hasFtyp || !hasMoov || hasMdat || hasMoof) {
        throw new Error("Invalid init segment structure");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("Media Segment MSE Structure - TypeScript", async () => {
      const tsSeg = await fetchBinary(
        `${TS_SERVICE_URL}/api/v1/transcode/high/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );

      await fs.writeFile(path.join(OUTPUT_DIR, "ts-seg1.m4s"), tsSeg);

      const hasFtyp = tsSeg.includes(Buffer.from("ftyp"));
      const hasMoov = tsSeg.includes(Buffer.from("moov"));
      const hasMdat = tsSeg.includes(Buffer.from("mdat"));
      const hasMoof = tsSeg.includes(Buffer.from("moof"));

      console.log(`   Size: ${tsSeg.length} bytes`);
      console.log(`   Has ftyp: ${hasFtyp}, moov: ${hasMoov}, mdat: ${hasMdat}, moof: ${hasMoof}`);

      if (hasFtyp || hasMoov || !hasMdat || !hasMoof) {
        throw new Error("Invalid media segment structure");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("Media Segment MSE Structure - Go", async () => {
      const goSeg = await fetchBinary(
        `${GO_SERVICE_URL}/api/v1/transcode/high/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );

      await fs.writeFile(path.join(OUTPUT_DIR, "go-seg1.m4s"), goSeg);

      const hasFtyp = goSeg.includes(Buffer.from("ftyp"));
      const hasMoov = goSeg.includes(Buffer.from("moov"));
      const hasMdat = goSeg.includes(Buffer.from("mdat"));
      const hasMoof = goSeg.includes(Buffer.from("moof"));

      console.log(`   Size: ${goSeg.length} bytes`);
      console.log(`   Has ftyp: ${hasFtyp}, moov: ${hasMoov}, mdat: ${hasMdat}, moof: ${hasMoof}`);

      if (hasFtyp || hasMoov || !hasMdat || !hasMoof) {
        throw new Error("Invalid media segment structure");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("Cache Headers - TypeScript", async () => {
      const url = `${TS_SERVICE_URL}/api/v1/transcode/medium/1.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

      const response1 = await fetch(url);
      const cache1 = response1.headers.get("X-Cache");

      const response2 = await fetch(url);
      const cache2 = response2.headers.get("X-Cache");

      console.log(`   First request: X-Cache=${cache1}`);
      console.log(`   Second request: X-Cache=${cache2}`);

      if (cache2 !== "HIT") {
        throw new Error("Second request should be cache hit");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("Cache Headers - Go", async () => {
      const url = `${GO_SERVICE_URL}/api/v1/transcode/medium/2.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

      const response1 = await fetch(url);
      const cache1 = response1.headers.get("X-Cache");

      const response2 = await fetch(url);
      const cache2 = response2.headers.get("X-Cache");

      console.log(`   First request: X-Cache=${cache1}`);
      console.log(`   Second request: X-Cache=${cache2}`);

      if (cache2 !== "HIT") {
        throw new Error("Second request should be cache hit");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("DASH Manifest - TypeScript", async () => {
      const response = await fetch(
        `${TS_SERVICE_URL}/api/v1/transcode/manifest.mpd?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );
      const dash = await response.text();

      await fs.writeFile(path.join(OUTPUT_DIR, "ts-manifest.mpd"), dash);

      console.log(`   Length: ${dash.length} chars`);

      if (!dash.includes("<?xml") || !dash.includes("<MPD")) {
        throw new Error("Invalid DASH manifest");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("DASH Manifest - Go", async () => {
      const response = await fetch(
        `${GO_SERVICE_URL}/api/v1/transcode/manifest.mpd?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );
      const dash = await response.text();

      await fs.writeFile(path.join(OUTPUT_DIR, "go-manifest.mpd"), dash);

      console.log(`   Length: ${dash.length} chars`);

      if (!dash.includes("<?xml") || !dash.includes("<MPD")) {
        throw new Error("Invalid DASH manifest");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("HLS Master Playlist - TypeScript", async () => {
      const response = await fetch(
        `${TS_SERVICE_URL}/api/v1/transcode/manifest.m3u8?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );
      const hls = await response.text();

      await fs.writeFile(path.join(OUTPUT_DIR, "ts-master.m3u8"), hls);

      console.log(`   Length: ${hls.length} chars`);

      if (!hls.includes("#EXTM3U") || !hls.includes("#EXT-X-STREAM-INF")) {
        throw new Error("Invalid HLS manifest");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  try {
    await test("HLS Master Playlist - Go", async () => {
      const response = await fetch(
        `${GO_SERVICE_URL}/api/v1/transcode/manifest.m3u8?url=${encodeURIComponent(TEST_VIDEO_URL)}`
      );
      const hls = await response.text();

      await fs.writeFile(path.join(OUTPUT_DIR, "go-master.m3u8"), hls);

      console.log(`   Length: ${hls.length} chars`);

      if (!hls.includes("#EXTM3U") || !hls.includes("#EXT-X-STREAM-INF")) {
        throw new Error("Invalid HLS manifest");
      }
    });
    passed++;
  } catch (e) {
    failed++;
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`Output files saved to: ${OUTPUT_DIR}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

