#!/usr/bin/env tsx

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { execSync } from "node:child_process";

const TEST_VIDEO_URL = "http://web:3000/bars-n-tone.mp4";
const TS_SERVICE_URL = "http://jit-transcoding:3001";
const GO_SERVICE_URL = "http://jit-transcode-go:3002";
const OUTPUT_DIR = "/app/temp/parity";

interface SegmentAnalysis {
  service: string;
  rendition: string;
  segmentId: string;
  fileSize: number;
  ffprobeOutput?: any;
  mp4dumpOutput?: any;
  boxStructure?: string[];
  error?: string;
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

async function fetchBinary(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function runFFprobe(filePath: string): Promise<any> {
  try {
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      {
        encoding: "utf8",
      },
    );
    return JSON.parse(output);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function runMp4dump(filePath: string): Promise<any> {
  try {
    const output = execSync(`mp4dump --format json "${filePath}"`, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(output);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function extractBoxStructure(mp4dump: any): string[] {
  const boxes: string[] = [];

  function traverse(obj: any, depth = 0) {
    if (Array.isArray(obj)) {
      obj.forEach((item) => traverse(item, depth));
    } else if (typeof obj === "object" && obj !== null) {
      if (obj.type) {
        const indent = "  ".repeat(depth);
        boxes.push(
          `${indent}${obj.type}${obj.size ? ` (${obj.size} bytes)` : ""}`,
        );
      }
      Object.values(obj).forEach((value) => traverse(value, depth + 1));
    }
  }

  traverse(mp4dump);
  return boxes;
}

async function analyzeSegment(
  service: string,
  serviceUrl: string,
  rendition: string,
  segmentId: string,
): Promise<SegmentAnalysis> {
  const analysis: SegmentAnalysis = {
    service,
    rendition,
    segmentId,
    fileSize: 0,
  };

  try {
    const url = `${serviceUrl}/api/v1/transcode/${rendition}/${segmentId}.m4s?url=${encodeURIComponent(TEST_VIDEO_URL)}`;

    console.log(`\n📥 Fetching ${service} ${rendition}/${segmentId}...`);
    const data = await fetchBinary(url);
    analysis.fileSize = data.length;

    const filename = `${service}-${rendition}-${segmentId}.m4s`;
    const filePath = path.join(OUTPUT_DIR, filename);

    await fs.writeFile(filePath, data);
    console.log(`   💾 Saved to ${filename} (${data.length} bytes)`);

    console.log(`   🔍 Running ffprobe...`);
    analysis.ffprobeOutput = await runFFprobe(filePath);

    if (analysis.ffprobeOutput.error) {
      console.log(`   ⚠️  ffprobe error: ${analysis.ffprobeOutput.error}`);
    } else {
      const format = analysis.ffprobeOutput.format;
      const streams = analysis.ffprobeOutput.streams || [];

      console.log(`   📊 Format: ${format?.format_name || "unknown"}`);
      console.log(`   ⏱️  Duration: ${format?.duration || "N/A"}s`);
      console.log(`   🎬 Streams: ${streams.length}`);

      streams.forEach((stream: any, i: number) => {
        console.log(
          `      Stream ${i}: ${stream.codec_type} (${stream.codec_name})`,
        );
        if (stream.codec_type === "video") {
          console.log(`         Resolution: ${stream.width}x${stream.height}`);
          console.log(`         Frame rate: ${stream.r_frame_rate}`);
        }
      });
    }

    console.log(`   📦 Running mp4dump...`);
    analysis.mp4dumpOutput = await runMp4dump(filePath);

    if (analysis.mp4dumpOutput.error) {
      console.log(`   ⚠️  mp4dump error: ${analysis.mp4dumpOutput.error}`);
    } else {
      analysis.boxStructure = extractBoxStructure(analysis.mp4dumpOutput);
      console.log(`   📦 Box structure:`);
      analysis.boxStructure
        .slice(0, 10)
        .forEach((box) => console.log(`      ${box}`));
      if (analysis.boxStructure.length > 10) {
        console.log(
          `      ... and ${analysis.boxStructure.length - 10} more boxes`,
        );
      }
    }

    await fs.writeFile(
      path.join(
        OUTPUT_DIR,
        `${service}-${rendition}-${segmentId}-ffprobe.json`,
      ),
      JSON.stringify(analysis.ffprobeOutput, null, 2),
    );

    await fs.writeFile(
      path.join(
        OUTPUT_DIR,
        `${service}-${rendition}-${segmentId}-mp4dump.json`,
      ),
      JSON.stringify(analysis.mp4dumpOutput, null, 2),
    );
  } catch (error) {
    analysis.error = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Error: ${analysis.error}`);
  }

  return analysis;
}

async function compareSegments(
  tsAnalysis: SegmentAnalysis,
  goAnalysis: SegmentAnalysis,
): Promise<void> {
  console.log(
    `\n═══════════════════════════════════════════════════════════════`,
  );
  console.log(`  Comparing ${tsAnalysis.rendition}/${tsAnalysis.segmentId}`);
  console.log(
    `═══════════════════════════════════════════════════════════════`,
  );

  if (tsAnalysis.error || goAnalysis.error) {
    console.log(`❌ Cannot compare - one or both services failed`);
    if (tsAnalysis.error) console.log(`   TS error: ${tsAnalysis.error}`);
    if (goAnalysis.error) console.log(`   Go error: ${goAnalysis.error}`);
    return;
  }

  console.log(`\n📏 File Size:`);
  console.log(`   TypeScript: ${tsAnalysis.fileSize.toLocaleString()} bytes`);
  console.log(`   Go:         ${goAnalysis.fileSize.toLocaleString()} bytes`);
  console.log(
    `   Difference: ${Math.abs(tsAnalysis.fileSize - goAnalysis.fileSize).toLocaleString()} bytes`,
  );

  if (
    tsAnalysis.ffprobeOutput &&
    goAnalysis.ffprobeOutput &&
    !tsAnalysis.ffprobeOutput.error &&
    !goAnalysis.ffprobeOutput.error
  ) {
    console.log(`\n⏱️  Duration:`);
    console.log(
      `   TypeScript: ${tsAnalysis.ffprobeOutput.format?.duration || "N/A"}s`,
    );
    console.log(
      `   Go:         ${goAnalysis.ffprobeOutput.format?.duration || "N/A"}s`,
    );

    console.log(`\n🎬 Codec Info:`);
    const tsStream = tsAnalysis.ffprobeOutput.streams?.[0];
    const goStream = goAnalysis.ffprobeOutput.streams?.[0];

    if (tsStream && goStream) {
      console.log(
        `   TypeScript: ${tsStream.codec_name} ${tsStream.width || ""}x${tsStream.height || ""}`,
      );
      console.log(
        `   Go:         ${goStream.codec_name} ${goStream.width || ""}x${goStream.height || ""}`,
      );

      if (tsStream.codec_type === "video" && goStream.codec_type === "video") {
        console.log(
          `\n📐 Resolution Match: ${tsStream.width === goStream.width && tsStream.height === goStream.height ? "✅" : "❌"}`,
        );
        console.log(`   TS: ${tsStream.width}x${tsStream.height}`);
        console.log(`   Go: ${goStream.width}x${goStream.height}`);
      }
    }
  }

  if (tsAnalysis.boxStructure && goAnalysis.boxStructure) {
    console.log(`\n📦 Box Structure:`);
    console.log(`   TypeScript boxes: ${tsAnalysis.boxStructure.length}`);
    console.log(`   Go boxes:         ${goAnalysis.boxStructure.length}`);

    const tsBoxTypes = tsAnalysis.boxStructure
      .map((b) => b.trim().split(" ")[0])
      .filter(Boolean);
    const goBoxTypes = goAnalysis.boxStructure
      .map((b) => b.trim().split(" ")[0])
      .filter(Boolean);

    console.log(
      `   TS box types: ${tsBoxTypes.slice(0, 5).join(", ")}${tsBoxTypes.length > 5 ? "..." : ""}`,
    );
    console.log(
      `   Go box types: ${goBoxTypes.slice(0, 5).join(", ")}${goBoxTypes.length > 5 ? "..." : ""}`,
    );

    const tsRootBoxes = tsBoxTypes.filter((t) => !t.startsWith(" "));
    const goRootBoxes = goBoxTypes.filter((t) => !t.startsWith(" "));

    console.log(
      `   Root boxes match: ${JSON.stringify(tsRootBoxes) === JSON.stringify(goRootBoxes) ? "✅" : "❌"}`,
    );
    console.log(`   TS root: [${tsRootBoxes.join(", ")}]`);
    console.log(`   Go root: [${goRootBoxes.join(", ")}]`);
  }
}

async function main() {
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log("  JIT Transcoding Segment Validation");
  console.log("  Detailed Binary Analysis with ffprobe & mp4dump");
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );

  await ensureOutputDir();

  const testCases = [
    { rendition: "high", segmentId: "init" },
    { rendition: "high", segmentId: "1" },
    { rendition: "medium", segmentId: "init" },
    { rendition: "medium", segmentId: "1" },
    { rendition: "low", segmentId: "init" },
    { rendition: "low", segmentId: "1" },
    { rendition: "audio", segmentId: "init" },
    { rendition: "audio", segmentId: "1" },
  ];

  const results: { ts: SegmentAnalysis; go: SegmentAnalysis }[] = [];

  for (const testCase of testCases) {
    console.log(`\n${"=".repeat(67)}`);
    console.log(`Testing ${testCase.rendition}/${testCase.segmentId}`);
    console.log("=".repeat(67));

    const tsAnalysis = await analyzeSegment(
      "ts",
      TS_SERVICE_URL,
      testCase.rendition,
      testCase.segmentId,
    );
    const goAnalysis = await analyzeSegment(
      "go",
      GO_SERVICE_URL,
      testCase.rendition,
      testCase.segmentId,
    );

    results.push({ ts: tsAnalysis, go: goAnalysis });

    await compareSegments(tsAnalysis, goAnalysis);
  }

  console.log(`\n\n${"=".repeat(67)}`);
  console.log("  SUMMARY");
  console.log("=".repeat(67));

  let tsSuccesses = 0;
  let goSuccesses = 0;
  let bothSuccess = 0;

  results.forEach(({ ts, go }) => {
    if (!ts.error) tsSuccesses++;
    if (!go.error) goSuccesses++;
    if (!ts.error && !go.error) bothSuccess++;
  });

  console.log(
    `\nTypeScript Service: ${tsSuccesses}/${results.length} successful`,
  );
  console.log(
    `Go Service:         ${goSuccesses}/${results.length} successful`,
  );
  console.log(`Both Successful:    ${bothSuccess}/${results.length}`);

  console.log(`\n📁 All output files saved to: ${OUTPUT_DIR}`);
  console.log(`\nFiles created:`);
  const files = await fs.readdir(OUTPUT_DIR);
  files.sort().forEach((file) => console.log(`   - ${file}`));

  console.log(`\n✨ Validation complete!`);

  if (bothSuccess < results.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
