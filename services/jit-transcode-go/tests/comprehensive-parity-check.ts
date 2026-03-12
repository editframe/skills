#!/usr/bin/env tsx

import * as fs from "node:fs/promises";
import { execSync } from "node:child_process";

const TS = "http://jit-transcoding:3001";
const GO = "http://jit-transcode-go:3002";
const OUT = "/app/temp/parity-comprehensive";

const TEST_VIDEOS = [
  {
    name: "bars-n-tone",
    url: "http://web:3000/bars-n-tone.mp4",
    description: "10s test pattern (moov at tail)",
  },
  {
    name: "head-moov-720p",
    url: "file:///app/test-assets/transcode/head-moov-720p.mp4",
    description: "720p with moov at head",
  },
  {
    name: "tail-moov-720p",
    url: "file:///app/test-assets/transcode/tail-moov-720p.mp4",
    description: "720p with moov at tail",
  },
  {
    name: "head-moov-480p",
    url: "file:///app/test-assets/transcode/head-moov-480p.mp4",
    description: "480p with moov at head",
  },
  {
    name: "tail-moov-480p",
    url: "file:///app/test-assets/transcode/tail-moov-480p.mp4",
    description: "480p with moov at tail",
  },
];

const RENDITIONS = ["low", "medium", "high"];
const SEGMENTS = ["init", "1", "2", "3"];

type TestResult = { pass: boolean; message: string };

async function fetch$(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

async function ffprobe(file: string): Promise<any> {
  try {
    const out = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams -show_packets "${file}"`,
      {
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024,
      },
    );
    return JSON.parse(out);
  } catch {
    return null;
  }
}

async function mp4dump(file: string): Promise<any> {
  try {
    const out = execSync(`mp4dump --format json "${file}" 2>/dev/null`, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function hasBox(dump: any, type: string): boolean {
  const s = JSON.stringify(dump);
  return s.includes(`"type":"${type}"`) || s.includes(`"name":"${type}"`);
}

function findBox(dump: any[], boxName: string): any {
  for (const box of dump) {
    if (box.name === boxName || box.type === boxName) {
      return box;
    }
    if (box.children) {
      const found = findBox(box.children, boxName);
      if (found) return found;
    }
  }
  return null;
}

function extractTrunSampleCount(dump: any[]): number | null {
  const moof = findBox(dump, "moof");
  if (!moof?.children) return null;

  const traf = findBox(moof.children, "traf");
  if (!traf?.children) return null;

  const trun = findBox(traf.children, "trun");
  return trun?.["sample count"] || trun?.sample_count || null;
}

function extractSequenceNumber(dump: any[]): number | null {
  const moof = findBox(dump, "moof");
  if (!moof?.children) return null;

  const mfhd = findBox(moof.children, "mfhd");
  return mfhd?.["sequence number"] || mfhd?.sequence_number || null;
}

function extractBaseMediaDecodeTime(dump: any[]): number | null {
  const moof = findBox(dump, "moof");
  if (!moof?.children) return null;

  const traf = findBox(moof.children, "traf");
  if (!traf?.children) return null;

  const tfdt = findBox(traf.children, "tfdt");
  return (
    tfdt?.["base media decode time"] || tfdt?.base_media_decode_time || null
  );
}

async function test(
  name: string,
  fn: () => Promise<TestResult>,
): Promise<boolean> {
  try {
    const result = await fn();
    console.log(`${result.pass ? "✅" : "❌"} ${name}: ${result.message}`);
    return result.pass;
  } catch (e) {
    console.log(`❌ ${name}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  console.log("Comprehensive Parity Validation\n");
  console.log("=".repeat(80) + "\n");

  let passed = 0;
  let total = 0;

  for (const video of TEST_VIDEOS) {
    console.log(`\n📹 Testing: ${video.name} (${video.description})`);
    console.log("-".repeat(80));

    for (const rendition of RENDITIONS) {
      const testPrefix = `${video.name}-${rendition}`;

      total++;
      if (
        await test(`[${testPrefix}] Init segment structure`, async () => {
          const ts = await fetch$(
            `${TS}/api/v1/transcode/${rendition}/init.m4s?url=${encodeURIComponent(video.url)}`,
          );
          const go = await fetch$(
            `${GO}/api/v1/transcode/${rendition}/init.m4s?url=${encodeURIComponent(video.url)}`,
          );

          await fs.writeFile(`${OUT}/${testPrefix}-ts-init.m4s`, ts);
          await fs.writeFile(`${OUT}/${testPrefix}-go-init.m4s`, go);

          const tsDump = await mp4dump(`${OUT}/${testPrefix}-ts-init.m4s`);
          const goDump = await mp4dump(`${OUT}/${testPrefix}-go-init.m4s`);

          const tsValid =
            hasBox(tsDump, "ftyp") &&
            hasBox(tsDump, "moov") &&
            !hasBox(tsDump, "mdat") &&
            !hasBox(tsDump, "moof");
          const goValid =
            hasBox(goDump, "ftyp") &&
            hasBox(goDump, "moov") &&
            !hasBox(goDump, "mdat") &&
            !hasBox(goDump, "moof");

          if (tsValid && goValid) {
            return {
              pass: true,
              message: `ftyp+moov only (TS:${ts.length}b, Go:${go.length}b)`,
            };
          }

          return {
            pass: false,
            message: `TS valid:${tsValid}, Go valid:${goValid}`,
          };
        })
      )
        passed++;

      total++;
      if (
        await test(`[${testPrefix}] Init codec parameters`, async () => {
          const tsProbe = await ffprobe(`${OUT}/${testPrefix}-ts-init.m4s`);
          const goProbe = await ffprobe(`${OUT}/${testPrefix}-go-init.m4s`);

          if (!tsProbe || !goProbe) {
            return {
              pass: false,
              message: `Missing probe (TS:${!!tsProbe}, Go:${!!goProbe})`,
            };
          }

          const tsCodec = tsProbe.streams?.[0]?.codec_name;
          const goCodec = goProbe.streams?.[0]?.codec_name;
          const tsRes = `${tsProbe.streams?.[0]?.width}x${tsProbe.streams?.[0]?.height}`;
          const goRes = `${goProbe.streams?.[0]?.width}x${goProbe.streams?.[0]?.height}`;

          if (tsCodec === goCodec && tsRes === goRes) {
            return { pass: true, message: `${tsCodec} ${tsRes}` };
          }

          return {
            pass: false,
            message: `TS:${tsCodec} ${tsRes}, Go:${goCodec} ${goRes}`,
          };
        })
      )
        passed++;

      for (const segId of ["1", "2", "3"]) {
        total++;
        if (
          await test(`[${testPrefix}] Segment ${segId} structure`, async () => {
            const ts = await fetch$(
              `${TS}/api/v1/transcode/${rendition}/${segId}.m4s?url=${encodeURIComponent(video.url)}`,
            );
            const go = await fetch$(
              `${GO}/api/v1/transcode/${rendition}/${segId}.m4s?url=${encodeURIComponent(video.url)}`,
            );

            await fs.writeFile(`${OUT}/${testPrefix}-ts-seg${segId}.m4s`, ts);
            await fs.writeFile(`${OUT}/${testPrefix}-go-seg${segId}.m4s`, go);

            const tsDump = await mp4dump(
              `${OUT}/${testPrefix}-ts-seg${segId}.m4s`,
            );
            const goDump = await mp4dump(
              `${OUT}/${testPrefix}-go-seg${segId}.m4s`,
            );

            const tsValid =
              hasBox(tsDump, "moof") &&
              hasBox(tsDump, "mdat") &&
              !hasBox(tsDump, "ftyp") &&
              !hasBox(tsDump, "moov");
            const goValid =
              hasBox(goDump, "moof") &&
              hasBox(goDump, "mdat") &&
              !hasBox(goDump, "ftyp") &&
              !hasBox(goDump, "moov");

            if (tsValid && goValid) {
              return { pass: true, message: `moof+mdat only` };
            }

            return { pass: false, message: `TS:${tsValid}, Go:${goValid}` };
          })
        )
          passed++;

        total++;
        if (
          await test(`[${testPrefix}] Segment ${segId} playable`, async () => {
            const tsProbe = await ffprobe(
              `${OUT}/${testPrefix}-ts-seg${segId}.m4s`,
            );
            const goProbe = await ffprobe(
              `${OUT}/${testPrefix}-go-seg${segId}.m4s`,
            );

            if (!tsProbe || !goProbe) {
              return {
                pass: false,
                message: `Not parseable (TS:${!!tsProbe}, Go:${!!goProbe})`,
              };
            }

            const tsCodec = tsProbe.streams?.[0]?.codec_name;
            const goCodec = goProbe.streams?.[0]?.codec_name;

            if (tsCodec === "h264" && goCodec === "h264") {
              return { pass: true, message: `Both h264` };
            }

            return { pass: false, message: `TS:${tsCodec}, Go:${goCodec}` };
          })
        )
          passed++;

        total++;
        if (
          await test(`[${testPrefix}] Segment ${segId} sample count`, async () => {
            const tsDump = await mp4dump(
              `${OUT}/${testPrefix}-ts-seg${segId}.m4s`,
            );
            const goDump = await mp4dump(
              `${OUT}/${testPrefix}-go-seg${segId}.m4s`,
            );

            const tsSamples = extractTrunSampleCount(tsDump);
            const goSamples = extractTrunSampleCount(goDump);

            if (tsSamples === null || goSamples === null) {
              return {
                pass: false,
                message: `Missing sample count (TS:${tsSamples}, Go:${goSamples})`,
              };
            }

            const withinTolerance = Math.abs(tsSamples - goSamples) <= 5;

            if (withinTolerance) {
              return {
                pass: true,
                message: `TS:${tsSamples}, Go:${goSamples} (±${Math.abs(tsSamples - goSamples)})`,
              };
            }

            return {
              pass: false,
              message: `TS:${tsSamples}, Go:${goSamples} (diff:${Math.abs(tsSamples - goSamples)})`,
            };
          })
        )
          passed++;

        total++;
        if (
          await test(`[${testPrefix}] Segment ${segId} sequence number`, async () => {
            const tsDump = await mp4dump(
              `${OUT}/${testPrefix}-ts-seg${segId}.m4s`,
            );
            const goDump = await mp4dump(
              `${OUT}/${testPrefix}-go-seg${segId}.m4s`,
            );

            const tsSeq = extractSequenceNumber(tsDump);
            const goSeq = extractSequenceNumber(goDump);

            const expectedSeq = Number.parseInt(segId);

            if (tsSeq === expectedSeq && goSeq === expectedSeq) {
              return { pass: true, message: `Both seq=${expectedSeq}` };
            }

            return {
              pass: false,
              message: `TS:${tsSeq}, Go:${goSeq}, expected:${expectedSeq}`,
            };
          })
        )
          passed++;

        total++;
        if (
          await test(`[${testPrefix}] Segment ${segId} base decode time`, async () => {
            const tsDump = await mp4dump(
              `${OUT}/${testPrefix}-ts-seg${segId}.m4s`,
            );
            const goDump = await mp4dump(
              `${OUT}/${testPrefix}-go-seg${segId}.m4s`,
            );

            const tsBDT = extractBaseMediaDecodeTime(tsDump);
            const goBDT = extractBaseMediaDecodeTime(goDump);

            if (tsBDT === null || goBDT === null) {
              return {
                pass: false,
                message: `Missing BDT (TS:${tsBDT}, Go:${goBDT})`,
              };
            }

            const tolerance = 2000;
            const withinTolerance = Math.abs(tsBDT - goBDT) <= tolerance;

            if (withinTolerance) {
              return {
                pass: true,
                message: `TS:${tsBDT}, Go:${goBDT} (±${Math.abs(tsBDT - goBDT)})`,
              };
            }

            return {
              pass: false,
              message: `TS:${tsBDT}, Go:${goBDT} (diff:${Math.abs(tsBDT - goBDT)})`,
            };
          })
        )
          passed++;
      }

      total++;
      if (
        await test(`[${testPrefix}] Concatenated playback`, async () => {
          const init = await fs.readFile(`${OUT}/${testPrefix}-go-init.m4s`);
          const seg1 = await fs.readFile(`${OUT}/${testPrefix}-go-seg1.m4s`);
          const seg2 = await fs.readFile(`${OUT}/${testPrefix}-go-seg2.m4s`);
          const concat = Buffer.concat([init, seg1, seg2]);
          await fs.writeFile(`${OUT}/${testPrefix}-go-concat.mp4`, concat);

          const probe = await ffprobe(`${OUT}/${testPrefix}-go-concat.mp4`);

          if (probe?.streams?.[0]?.codec_name === "h264") {
            const duration = Number.parseFloat(probe.format?.duration || "0");
            return {
              pass: true,
              message: `Valid h264, ${duration.toFixed(1)}s`,
            };
          }

          return { pass: false, message: `Invalid or missing video stream` };
        })
      )
        passed++;

      total++;
      if (
        await test(`[${testPrefix}] Standalone .mp4 output`, async () => {
          try {
            const mp4 = await fetch$(
              `${GO}/api/v1/transcode/${rendition}/1.mp4?url=${encodeURIComponent(video.url)}&fragmented=false`,
            );
            await fs.writeFile(`${OUT}/${testPrefix}-go-standalone.mp4`, mp4);

            const probe = await ffprobe(
              `${OUT}/${testPrefix}-go-standalone.mp4`,
            );

            if (probe?.streams?.[0]?.codec_name === "h264") {
              const size = (mp4.length / 1024 / 1024).toFixed(2);
              return { pass: true, message: `Valid h264, ${size}MB` };
            }

            return { pass: false, message: `Invalid video` };
          } catch (e) {
            return { pass: false, message: `${e}` };
          }
        })
      )
        passed++;
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(`\n📊 RESULTS: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log("\n🎉 FULL COMPREHENSIVE PARITY VALIDATED!");
  } else {
    console.log(`\n⚠️  ${total - passed} tests failing - review needed`);
  }

  const passRate = ((passed / total) * 100).toFixed(1);
  console.log(`Pass rate: ${passRate}%`);

  process.exit(passed === total ? 0 : 1);
}

main();
