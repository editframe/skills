#!/usr/bin/env tsx

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { execSync } from "node:child_process";

const TEST_VIDEO_URL = "http://web:3000/bars-n-tone.mp4";
const TS_SERVICE_URL = "http://jit-transcoding:3001";
const GO_SERVICE_URL = "http://jit-transcode-go:3002";
const OUTPUT_DIR = "/app/temp/parity";

async function fetchBinary(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function analyzeBoxStructure(filePath: string, label: string) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${label}`);
  console.log("═".repeat(70));

  try {
    const mp4dump = execSync(`mp4dump --format json "${filePath}"`, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });

    const parsed = JSON.parse(mp4dump);

    function findBoxes(obj: any, type: string, depth = 0): any[] {
      const found: any[] = [];

      if (Array.isArray(obj)) {
        obj.forEach((item) => found.push(...findBoxes(item, type, depth)));
      } else if (typeof obj === "object" && obj !== null) {
        if (obj.type === type) {
          found.push({ ...obj, _depth: depth });
        }
        Object.values(obj).forEach((value) =>
          found.push(...findBoxes(value, type, depth + 1)),
        );
      }

      return found;
    }

    const ftypBoxes = findBoxes(parsed, "ftyp");
    const moovBoxes = findBoxes(parsed, "moov");
    const moofBoxes = findBoxes(parsed, "moof");
    const mdatBoxes = findBoxes(parsed, "mdat");
    const mfhdBoxes = findBoxes(parsed, "mfhd");
    const tfdtBoxes = findBoxes(parsed, "tfdt");

    console.log(`\n📦 Root Boxes:`);
    console.log(
      `   ftyp: ${ftypBoxes.length} (${ftypBoxes.length > 0 ? "✅" : "❌"})`,
    );
    console.log(
      `   moov: ${moovBoxes.length} (${moovBoxes.length > 0 ? "✅" : "❌"})`,
    );
    console.log(
      `   moof: ${moofBoxes.length} (${moofBoxes.length > 0 ? "✅" : "❌"})`,
    );
    console.log(
      `   mdat: ${mdatBoxes.length} (${mdatBoxes.length > 0 ? "✅" : "❌"})`,
    );

    if (mfhdBoxes.length > 0) {
      console.log(`\n🔢 Movie Fragment Header (mfhd):`);
      mfhdBoxes.forEach((mfhd: any) => {
        console.log(`   Sequence Number: ${mfhd.sequence_number || "N/A"}`);
      });
    }

    if (tfdtBoxes.length > 0) {
      console.log(`\n⏰ Track Fragment Decode Time (tfdt):`);
      tfdtBoxes.forEach((tfdt: any, i: number) => {
        console.log(
          `   Track ${i}: baseMediaDecodeTime = ${tfdt.baseMediaDecodeTime || "N/A"}`,
        );
      });
    }

    const mvhdBoxes = findBoxes(parsed, "mvhd");
    if (mvhdBoxes.length > 0) {
      console.log(`\n🎞️  Movie Header (mvhd):`);
      mvhdBoxes.forEach((mvhd: any) => {
        console.log(`   Duration: ${mvhd.duration || "N/A"}`);
        console.log(`   Timescale: ${mvhd.timescale || "N/A"}`);
      });
    }

    return parsed;
  } catch (error) {
    console.log(
      `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

async function main() {
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log("  Detailed Box Structure Analysis");
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const tests = [
    { service: "ts", url: TS_SERVICE_URL, label: "TypeScript Service" },
    { service: "go", url: GO_SERVICE_URL, label: "Go Service" },
  ];

  const segments = [
    {
      rendition: "high",
      segmentId: "init",
      description: "High Quality Init Segment",
    },
    {
      rendition: "high",
      segmentId: "1",
      description: "High Quality Segment 1",
    },
    {
      rendition: "high",
      segmentId: "2",
      description: "High Quality Segment 2",
    },
  ];

  for (const segment of segments) {
    console.log(`\n\n${"█".repeat(70)}`);
    console.log(`  ${segment.description}`);
    console.log("█".repeat(70));

    for (const test of tests) {
      const filename = `${test.service}-${segment.rendition}-${segment.segmentId}.m4s`;
      const filePath = path.join(OUTPUT_DIR, filename);

      try {
        const segmentUrl = `${test.url}/api/v1/transcode/${segment.rendition}/${segment.segmentId}.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

        console.log(`\n📥 Fetching from ${test.service}...`);
        const data = await fetchBinary(segmentUrl);

        await fs.writeFile(filePath, data);
        console.log(
          `   💾 Saved: ${filename} (${data.length.toLocaleString()} bytes)`,
        );

        await analyzeBoxStructure(
          filePath,
          `${test.label} - ${segment.description}`,
        );
      } catch (error) {
        console.log(
          `   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  console.log(`\n\n${"═".repeat(70)}`);
  console.log("  Analysis Complete");
  console.log("═".repeat(70));
  console.log(`\n📁 All files saved to: ${OUTPUT_DIR}`);

  const files = await fs.readdir(OUTPUT_DIR);
  console.log(`\n📊 Created ${files.length} files:`);
  files
    .sort()
    .slice(0, 20)
    .forEach((file) => console.log(`   - ${file}`));
  if (files.length > 20) {
    console.log(`   ... and ${files.length - 20} more`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
