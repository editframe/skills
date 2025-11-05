#!/usr/bin/env tsx

import * as fs from "node:fs/promises";
import { execSync } from "node:child_process";

const TS = "http://jit-transcoding:3001";
const GO = "http://jit-transcode-go:3002";
const OUT = "/app/temp/stream-comparison";
const TEST_VIDEO = "http://web:3000/bars-n-tone.mp4";

type ComparisonResult = {
  pass: boolean;
  message: string;
  details?: any;
};

async function fetch$(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

function ffprobeJson(file: string): any {
  try {
    const out = execSync(
      `ffprobe -v error -print_format json -show_format -show_streams -show_packets "${file}"`,
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
    );
    return JSON.parse(out);
  } catch (e) {
    return null;
  }
}

function mp4dumpJson(file: string): any {
  try {
    const out = execSync(`mp4dump --format json "${file}" 2>/dev/null`, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(out);
  } catch (e) {
    return null;
  }
}

function compareField(
  name: string,
  tsValue: any,
  goValue: any,
  tolerance?: number
): ComparisonResult {
  if (tolerance !== undefined && typeof tsValue === "number" && typeof goValue === "number") {
    const diff = Math.abs(tsValue - goValue);
    if (diff <= tolerance) {
      return {
        pass: true,
        message: `${name}: TS=${tsValue}, Go=${goValue} (±${diff}, tolerance=${tolerance})`,
      };
    }
    return {
      pass: false,
      message: `${name}: TS=${tsValue}, Go=${goValue} (diff=${diff}, exceeds tolerance=${tolerance})`,
    };
  }

  const match = JSON.stringify(tsValue) === JSON.stringify(goValue);
  if (match) {
    return { pass: true, message: `${name}: ${JSON.stringify(tsValue)}` };
  }

  return {
    pass: false,
    message: `${name}: TS=${JSON.stringify(tsValue)}, Go=${JSON.stringify(goValue)}`,
    details: { ts: tsValue, go: goValue },
  };
}

async function test(name: string, fn: () => Promise<ComparisonResult>): Promise<boolean> {
  try {
    const result = await fn();
    const icon = result.pass ? "✅" : "❌";
    console.log(`${icon} ${name}: ${result.message}`);
    if (!result.pass && result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
    return result.pass;
  } catch (e) {
    console.log(`❌ ${name}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  console.log("Detailed Stream Comparison\n");
  console.log("=".repeat(80) + "\n");

  let passed = 0;
  let total = 0;

  console.log("📦 Fetching segments...\n");

  const tsInit = await fetch$(`${TS}/api/v1/transcode/high/init.m4s?url=${encodeURIComponent(TEST_VIDEO)}`);
  const goInit = await fetch$(`${GO}/api/v1/transcode/high/init.m4s?url=${encodeURIComponent(TEST_VIDEO)}`);
  const tsSeg1 = await fetch$(`${TS}/api/v1/transcode/high/1.m4s?url=${encodeURIComponent(TEST_VIDEO)}`);
  const goSeg1 = await fetch$(`${GO}/api/v1/transcode/high/1.m4s?url=${encodeURIComponent(TEST_VIDEO)}`);

  await fs.writeFile(`${OUT}/ts-init.m4s`, tsInit);
  await fs.writeFile(`${OUT}/go-init.m4s`, goInit);
  await fs.writeFile(`${OUT}/ts-seg1.m4s`, tsSeg1);
  await fs.writeFile(`${OUT}/go-seg1.m4s`, goSeg1);

  const tsConcat = Buffer.concat([tsInit, tsSeg1]);
  const goConcat = Buffer.concat([goInit, goSeg1]);
  await fs.writeFile(`${OUT}/ts-concat.mp4`, tsConcat);
  await fs.writeFile(`${OUT}/go-concat.mp4`, goConcat);

  console.log("📊 Analyzing stream metadata...\n");

  const tsProbe = ffprobeJson(`${OUT}/ts-concat.mp4`);
  const goProbe = ffprobeJson(`${OUT}/go-concat.mp4`);
  const tsDump = mp4dumpJson(`${OUT}/ts-init.m4s`);
  const goDump = mp4dumpJson(`${OUT}/go-init.m4s`);
  const tsSegDump = mp4dumpJson(`${OUT}/ts-seg1.m4s`);
  const goSegDump = mp4dumpJson(`${OUT}/go-seg1.m4s`);

  console.log("🎬 Stream Metadata Comparison\n");

  const tsStream = tsProbe?.streams?.[0];
  const goStream = goProbe?.streams?.[0];

  total++;
  if (await test("Codec", async () => compareField("codec_name", tsStream?.codec_name, goStream?.codec_name)))
    passed++;

  total++;
  if (await test("Width", async () => compareField("width", tsStream?.width, goStream?.width))) passed++;

  total++;
  if (await test("Height", async () => compareField("height", tsStream?.height, goStream?.height))) passed++;

  total++;
  if (
    await test("Frame rate (r_frame_rate)", async () =>
      compareField("r_frame_rate", tsStream?.r_frame_rate, goStream?.r_frame_rate)
    )
  )
    passed++;

  total++;
  if (
    await test("Average frame rate", async () =>
      compareField("avg_frame_rate", tsStream?.avg_frame_rate, goStream?.avg_frame_rate)
    )
  )
    passed++;

  total++;
  if (await test("Time base", async () => compareField("time_base", tsStream?.time_base, goStream?.time_base)))
    passed++;

  console.log("\n📦 Init Segment Comparison\n");

  total++;
  if (await test("Init segment size", async () => compareField("size", tsInit.length, goInit.length, 100)))
    passed++;

  console.log("\n📦 Media Segment Comparison\n");

  total++;
  if (await test("Segment size", async () => compareField("size", tsSeg1.length, goSeg1.length, 500000)))
    passed++;

  console.log("\n⏱️  Packet Timing Analysis\n");

  const tsPackets = tsProbe?.packets?.filter((p: any) => p.stream_index === 0) || [];
  const goPackets = goProbe?.packets?.filter((p: any) => p.stream_index === 0) || [];

  total++;
  if (
    await test("Packet count", async () =>
      compareField("packets", tsPackets.length, goPackets.length, 5)
    )
  )
    passed++;

  if (tsPackets.length > 0 && goPackets.length > 0) {
    total++;
    if (
      await test("First packet PTS", async () => {
        const tsPts = Number.parseFloat(tsPackets[0].pts_time);
        const goPts = Number.parseFloat(goPackets[0].pts_time);
        return compareField("pts_time", tsPts, goPts, 0.005);
      })
    )
      passed++;

    total++;
    if (
      await test("PTS spacing (frames 1-5)", async () => {
        const tsSpacing = [];
        const goSpacing = [];

        for (let i = 1; i < Math.min(5, tsPackets.length); i++) {
          const tsPtsDiff =
            Number.parseFloat(tsPackets[i].pts_time) - Number.parseFloat(tsPackets[i - 1].pts_time);
          const goPtsDiff =
            Number.parseFloat(goPackets[i].pts_time) - Number.parseFloat(goPackets[i - 1].pts_time);
          tsSpacing.push(tsPtsDiff.toFixed(6));
          goSpacing.push(goPtsDiff.toFixed(6));
        }

        const expectedSpacing = (1 / 30).toFixed(6);
        const tsUniform = tsSpacing.every((s) => Math.abs(Number.parseFloat(s) - 1 / 30) < 0.001);
        const goUniform = goSpacing.every((s) => Math.abs(Number.parseFloat(s) - 1 / 30) < 0.001);

        if (tsUniform && goUniform) {
          return {
            pass: true,
            message: `Both uniform ~${expectedSpacing}s spacing (30fps)`,
          };
        }

        return {
          pass: false,
          message: `Non-uniform spacing detected`,
          details: {
            ts: tsSpacing,
            go: goSpacing,
            expected: expectedSpacing,
            tsUniform,
            goUniform,
          },
        };
      })
    )
      passed++;

    total++;
    if (
      await test("Last packet PTS", async () => {
        const tsLast = Number.parseFloat(tsPackets[tsPackets.length - 1].pts_time);
        const goLast = Number.parseFloat(goPackets[goPackets.length - 1].pts_time);
        return compareField("last_pts_time", tsLast, goLast, 0.1);
      })
    )
      passed++;
  }

  console.log("\n🎯 MP4 Box Structure Comparison\n");

  function findBox(dump: any[], name: string): any {
    for (const box of dump) {
      if (box.name === name || box.type === name) return box;
      if (box.children) {
        const found = findBox(box.children, name);
        if (found) return found;
      }
    }
    return null;
  }

  const tsMoof = findBox(tsSegDump, "moof");
  const goMoof = findBox(goSegDump, "moof");

  if (tsMoof && goMoof) {
    const tsTraf = findBox(tsMoof.children || [], "traf");
    const goTraf = findBox(goMoof.children || [], "traf");

    if (tsTraf && goTraf) {
      const tsTrun = findBox(tsTraf.children || [], "trun");
      const goTrun = findBox(goTraf.children || [], "trun");

      total++;
      if (
        await test("Trun sample count", async () =>
          compareField(
            "sample_count",
            tsTrun?.["sample count"] || tsTrun?.sample_count,
            goTrun?.["sample count"] || goTrun?.sample_count,
            2
          )
        )
      )
        passed++;
    }
  }

  console.log("\n📈 Frame Analysis\n");

  const tsFrames = tsProbe?.packets?.filter((p: any) => p.stream_index === 0 && p.flags?.includes("K")) || [];
  const goFrames = goProbe?.packets?.filter((p: any) => p.stream_index === 0 && p.flags?.includes("K")) || [];

  total++;
  if (
    await test("Keyframe count", async () =>
      compareField("keyframes", tsFrames.length, goFrames.length)
    )
  )
    passed++;

  console.log("\n" + "=".repeat(80));
  console.log(`\n📊 RESULTS: ${passed}/${total} tests passed`);

  const failRate = total - passed;
  if (failRate === 0) {
    console.log("\n🎉 PERFECT STREAM PARITY!");
  } else if (failRate <= 3) {
    console.log(`\n⚠️  ${failRate} minor discrepancies - review recommended`);
  } else {
    console.log(`\n❌ ${failRate} significant differences - fixes required`);
  }

  const passRate = ((passed / total) * 100).toFixed(1);
  console.log(`Pass rate: ${passRate}%\n`);

  if (failRate > 3) {
    console.log("🔍 CRITICAL ISSUES DETECTED:\n");

    if (tsStream?.r_frame_rate !== goStream?.r_frame_rate) {
      console.log(`  ❌ Frame rate mismatch: TS=${tsStream?.r_frame_rate}, Go=${goStream?.r_frame_rate}`);
      console.log(`     Impact: Incorrect playback speed\n`);
    }

    if (tsPackets.length > 0 && goPackets.length > 0) {
      const tsFirst = Number.parseFloat(tsPackets[0].pts_time);
      const goFirst = Number.parseFloat(goPackets[0].pts_time);
      if (Math.abs(tsFirst - goFirst) > 0.01) {
        console.log(`  ❌ Start time offset: TS=${tsFirst.toFixed(6)}s, Go=${goFirst.toFixed(6)}s`);
        console.log(`     Difference: ${Math.abs(tsFirst - goFirst).toFixed(6)}s`);
        console.log(`     Impact: ${Math.round(Math.abs(tsFirst - goFirst) * 30)} frame(s) offset\n`);
      }

      const tsSpacing = [];
      const goSpacing = [];
      for (let i = 1; i < Math.min(10, tsPackets.length, goPackets.length); i++) {
        tsSpacing.push(
          Number.parseFloat(tsPackets[i].pts_time) - Number.parseFloat(tsPackets[i - 1].pts_time)
        );
        goSpacing.push(
          Number.parseFloat(goPackets[i].pts_time) - Number.parseFloat(goPackets[i - 1].pts_time)
        );
      }

      const tsAvgSpacing = tsSpacing.reduce((a, b) => a + b, 0) / tsSpacing.length;
      const goAvgSpacing = goSpacing.reduce((a, b) => a + b, 0) / goSpacing.length;
      const tsVariance = Math.max(...tsSpacing) - Math.min(...tsSpacing);
      const goVariance = Math.max(...tsSpacing) - Math.min(...goSpacing);

      if (goVariance > 0.005) {
        console.log(`  ❌ Irregular frame spacing (Go)`);
        console.log(`     TS avg: ${(tsAvgSpacing * 1000).toFixed(2)}ms (variance: ${(tsVariance * 1000).toFixed(2)}ms)`);
        console.log(`     Go avg: ${(goAvgSpacing * 1000).toFixed(2)}ms (variance: ${(goVariance * 1000).toFixed(2)}ms)`);
        console.log(`     Expected: 33.33ms (30fps CFR)`);
        console.log(`     Impact: Jerky playback\n`);
      }
    }
  }

  process.exit(failRate > 3 ? 1 : 0);
}

main();

