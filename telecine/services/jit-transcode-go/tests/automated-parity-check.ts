#!/usr/bin/env tsx

import * as fs from "node:fs/promises";
import { execSync } from "node:child_process";

const TEST_VIDEO = "http://web:3000/bars-n-tone.mp4";
const TS = "http://jit-transcoding:3001";
const GO = "http://jit-transcode-go:3002";
const OUT = "/app/temp/parity";

type TestResult = { pass: boolean; message: string };

async function fetch$(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

async function ffprobe(file: string): Promise<any> {
  try {
    const out = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${file}"`,
      { encoding: "utf8" },
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
      maxBuffer: 10 * 1024 * 1024,
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
  console.log("Automated Parity Validation\n");

  let passed = 0;
  let total = 0;

  total++;
  if (
    await test("Init segments have correct MSE structure", async () => {
      const ts = await fetch$(
        `${TS}/api/v1/transcode/high/init.m4s?url=${encodeURIComponent(TEST_VIDEO)}`,
      );
      const go = await fetch$(
        `${GO}/api/v1/transcode/high/init.m4s?url=${encodeURIComponent(TEST_VIDEO)}`,
      );

      await fs.writeFile(`${OUT}/ts-init.m4s`, ts);
      await fs.writeFile(`${OUT}/go-init.m4s`, go);

      const tsDump = await mp4dump(`${OUT}/ts-init.m4s`);
      const goDump = await mp4dump(`${OUT}/go-init.m4s`);

      const tsHasFtyp = hasBox(tsDump, "ftyp");
      const tsHasMoov = hasBox(tsDump, "moov");
      const tsHasMdat = hasBox(tsDump, "mdat");
      const tsHasMoof = hasBox(tsDump, "moof");

      const goHasFtyp = hasBox(goDump, "ftyp");
      const goHasMoov = hasBox(goDump, "moov");
      const goHasMdat = hasBox(goDump, "mdat");
      const goHasMoof = hasBox(goDump, "moof");

      const tsValid = tsHasFtyp && tsHasMoov && !tsHasMdat && !tsHasMoof;
      const goValid = goHasFtyp && goHasMoov && !goHasMdat && !goHasMoof;

      if (tsValid && goValid) {
        return {
          pass: true,
          message: `Both have ftyp+moov only (TS:${ts.length}b, Go:${go.length}b)`,
        };
      }

      return {
        pass: false,
        message: `TS:${tsHasFtyp}/${tsHasMoov}/${!tsHasMdat}/${!tsHasMoof}, Go:${goHasFtyp}/${goHasMoov}/${!goHasMdat}/${!goHasMoof}`,
      };
    })
  )
    passed++;

  total++;
  if (
    await test("Media segments have correct MSE structure", async () => {
      const ts = await fetch$(
        `${TS}/api/v1/transcode/high/1.m4s?url=${encodeURIComponent(TEST_VIDEO)}`,
      );
      const go = await fetch$(
        `${GO}/api/v1/transcode/high/1.m4s?url=${encodeURIComponent(TEST_VIDEO)}`,
      );

      await fs.writeFile(`${OUT}/ts-seg1.m4s`, ts);
      await fs.writeFile(`${OUT}/go-seg1.m4s`, go);

      const tsDump = await mp4dump(`${OUT}/ts-seg1.m4s`);
      const goDump = await mp4dump(`${OUT}/go-seg1.m4s`);

      const tsHasMoof = hasBox(tsDump, "moof");
      const tsHasMdat = hasBox(tsDump, "mdat");
      const tsHasFtyp = hasBox(tsDump, "ftyp");
      const tsHasMoov = hasBox(tsDump, "moov");

      const goHasMoof = hasBox(goDump, "moof");
      const goHasMdat = hasBox(goDump, "mdat");
      const goHasFtyp = hasBox(goDump, "ftyp");
      const goHasMoov = hasBox(goDump, "moov");

      const tsValid = tsHasMoof && tsHasMdat && !tsHasFtyp && !tsHasMoov;
      const goValid = goHasMoof && goHasMdat && !goHasFtyp && !goHasMoov;

      if (tsValid && goValid) {
        return {
          pass: true,
          message: `Both have moof+mdat only (TS:${(ts.length / 1024 / 1024).toFixed(1)}MB, Go:${(go.length / 1024 / 1024).toFixed(1)}MB)`,
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
    await test("Init segments are parseable by ffprobe", async () => {
      const tsProbe = await ffprobe(`${OUT}/ts-init.m4s`);
      const goProbe = await ffprobe(`${OUT}/go-init.m4s`);

      if (!tsProbe || !goProbe) {
        return { pass: false, message: `TS:${!!tsProbe}, Go:${!!goProbe}` };
      }

      const tsCodec = tsProbe.streams?.[0]?.codec_name;
      const goCodec = goProbe.streams?.[0]?.codec_name;

      if (tsCodec === "h264" && goCodec === "h264") {
        return {
          pass: true,
          message: `Both h264 (TS:${tsProbe.streams[0].width}x${tsProbe.streams[0].height}, Go:${goProbe.streams[0].width}x${goProbe.streams[0].height})`,
        };
      }

      return { pass: false, message: `TS:${tsCodec}, Go:${goCodec}` };
    })
  )
    passed++;

  total++;
  if (
    await test("Segments can be concatenated", async () => {
      const tsInit = await fs.readFile(`${OUT}/ts-init.m4s`);
      const tsSeg1 = await fs.readFile(`${OUT}/ts-seg1.m4s`);
      const tsConcat = Buffer.concat([tsInit, tsSeg1]);
      await fs.writeFile(`${OUT}/ts-concat.mp4`, tsConcat);

      const goInit = await fs.readFile(`${OUT}/go-init.m4s`);
      const goSeg1 = await fs.readFile(`${OUT}/go-seg1.m4s`);
      const goConcat = Buffer.concat([goInit, goSeg1]);
      await fs.writeFile(`${OUT}/go-concat.mp4`, goConcat);

      const tsProbe = await ffprobe(`${OUT}/ts-concat.mp4`);
      const goProbe = await ffprobe(`${OUT}/go-concat.mp4`);

      if (tsProbe && goProbe) {
        return { pass: true, message: `Both concatenated files valid` };
      }

      return { pass: false, message: `TS:${!!tsProbe}, Go:${!!goProbe}` };
    })
  )
    passed++;

  total++;
  if (
    await test("Codecs match across services", async () => {
      const tsProbe = await ffprobe(`${OUT}/ts-init.m4s`);
      const goProbe = await ffprobe(`${OUT}/go-init.m4s`);

      if (!tsProbe?.streams?.[0] || !goProbe?.streams?.[0]) {
        return { pass: false, message: "Missing stream info" };
      }

      const match =
        tsProbe.streams[0].codec_name === goProbe.streams[0].codec_name &&
        tsProbe.streams[0].width === goProbe.streams[0].width &&
        tsProbe.streams[0].height === goProbe.streams[0].height;

      if (match) {
        return {
          pass: true,
          message: `${tsProbe.streams[0].codec_name} ${tsProbe.streams[0].width}x${tsProbe.streams[0].height}`,
        };
      }

      return {
        pass: false,
        message: `TS:${tsProbe.streams[0].codec_name} ${tsProbe.streams[0].width}x${tsProbe.streams[0].height}, Go:${goProbe.streams[0].codec_name} ${goProbe.streams[0].width}x${goProbe.streams[0].height}`,
      };
    })
  )
    passed++;

  console.log(`\n${passed}/${total} tests passed`);

  if (passed === total) {
    console.log("\n🎉 FULL PARITY VALIDATED!");
  } else {
    console.log(`\n⚠️  ${total - passed} tests failing - debugging needed`);
  }

  process.exit(passed === total ? 0 : 1);
}

main();
