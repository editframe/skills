#!/usr/bin/env node
/**
 * Waveform smoke tests — inserts renders directly into the DB and polls
 * for completion. Exercises all ef-waveform modes concurrently to stress-test
 * the FrameController abort race condition during seekForRender.
 *
 * Usage: ./scripts/run tsx scripts/smoke-test-waveform.ts
 *        ./scripts/run tsx scripts/smoke-test-waveform.ts --from <render-id>  # copies org/creator
 *        ./scripts/run tsx scripts/smoke-test-waveform.ts --timeout 180
 */

import { db } from "@/sql-client.server";

const args = process.argv.slice(2);
const fromIdx = args.indexOf("--from");
const fromRenderId = fromIdx !== -1 ? args[fromIdx + 1] : undefined;
const timeoutIdx = args.indexOf("--timeout");
const TIMEOUT_MS = (timeoutIdx !== -1 ? parseInt(args[timeoutIdx + 1]!) : 900) * 1000;

async function resolveOrgAndCreator(): Promise<{
  org_id: string;
  creator_id: string;
}> {
  if (fromRenderId) {
    const source = await db
      .selectFrom("video2.renders")
      .where("id", "=", fromRenderId)
      .select(["org_id", "creator_id"])
      .executeTakeFirstOrThrow();
    return { org_id: source.org_id, creator_id: source.creator_id! };
  }

  // Fall back to most recent render in the DB
  const latest = await db
    .selectFrom("video2.renders")
    .orderBy("created_at", "desc")
    .select(["org_id", "creator_id"])
    .executeTakeFirstOrThrow();
  return { org_id: latest.org_id, creator_id: latest.creator_id! };
}

async function createRender(
  html: string,
  org_id: string,
  creator_id: string,
): Promise<string> {
  const result = await db
    .insertInto("video2.renders")
    .values({
      org_id,
      creator_id,
      api_key_id: null,
      html,
      status: "created",
      strategy: "v1",
      fps: 30,
      output_config: { container: "mp4", video: { codec: "h264" }, audio: { codec: "aac" } },
      metadata: {},
      work_slice_ms: 4000,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return result.id;
}

async function pollRender(id: string): Promise<{ status: string; failure_detail: string | null }> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const row = await db
      .selectFrom("video2.renders")
      .where("id", "=", id)
      .select(["status", "failure_detail"])
      .executeTakeFirstOrThrow();
    if (row.status === "complete" || row.status === "failed") {
      return { status: row.status, failure_detail: row.failure_detail ? String(row.failure_detail) : null };
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return { status: "timeout", failure_detail: null };
}

async function runTest(
  name: string,
  html: string,
  org_id: string,
  creator_id: string,
): Promise<boolean> {
  process.stdout.write(`  ${name} ... `);
  const start = Date.now();
  try {
    const id = await createRender(html, org_id, creator_id);
    const result = await pollRender(id);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (result.status === "complete") {
      console.log(`✓ complete (${elapsed}s) [${id}]`);
      return true;
    } else {
      let detail = "";
      if (result.failure_detail) {
        try {
          const parsed = JSON.parse(result.failure_detail);
          detail = ` — ${parsed.message ?? result.failure_detail}`;
        } catch {
          detail = ` — ${result.failure_detail}`;
        }
      }
      console.log(`✗ ${result.status} (${elapsed}s) [${id}]${detail}`);
      return false;
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✗ error (${elapsed}s): ${(err as Error).message}`);
    return false;
  }
}

// 19s audio — produces 5 render fragments, maximising exposure to the
// FrameController abort race condition during seekForRender.
const BASE_HTML = (waveformAttrs: string) => `
  <ef-timegroup mode="contain" class="w-[1080px] h-[1080px] bg-[rgb(192,192,192)]">
    <ef-image class="w-full h-full absolute inset-0" src="https://storage.googleapis.com/editframe-assets-7ac794b/1080-cat.jpeg"></ef-image>
    <ef-audio fft-size="512" interpolate-frequencies src="https://storage.googleapis.com/editframe-assets-7ac794b/card-joker.mp3" id="sample-audio"></ef-audio>
    <div class="absolute inset-0 grid place-items-center">
      <ef-waveform target="sample-audio" ${waveformAttrs} class="w-full h-[1080px]" style="color: rgb(106, 90, 205)"></ef-waveform>
    </div>
  </ef-timegroup>`;

const TESTS: Array<{ name: string; html: string }> = [
  {
    name: "bars + interpolate-frequencies (fft)",
    html: BASE_HTML(`mode="bars" bar-spacing="2"`),
  },
  {
    name: "bars no interpolation (fft)",
    html: BASE_HTML(`mode="bars" bar-spacing="2"`).replace("interpolate-frequencies ", ""),
  },
  {
    name: "roundBars (fft)",
    html: BASE_HTML(`mode="roundBars" bar-spacing="3"`),
  },
  {
    name: "line (time-domain)",
    html: BASE_HTML(`mode="line" line-width="3"`),
  },
  {
    name: "curve (time-domain)",
    html: BASE_HTML(`mode="curve" line-width="3"`),
  },
];

async function main() {
  const { org_id, creator_id } = await resolveOrgAndCreator();

  console.log(`\nWaveform smoke tests`);
  console.log(`  org:     ${org_id}`);
  console.log(`  timeout: ${TIMEOUT_MS / 1000}s per render`);
  console.log(`  running: ${TESTS.length} tests concurrently\n`);

  const results = await Promise.all(
    TESTS.map((t) => runTest(t.name, t.html, org_id, creator_id)),
  );

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${TESTS.length} passed`);

  if (passed < TESTS.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
