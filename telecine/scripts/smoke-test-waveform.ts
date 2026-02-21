#!/usr/bin/env node
export {};
/**
 * Waveform smoke tests — submits renders via the public API and polls for
 * completion. Exercises all ef-waveform modes concurrently to stress-test
 * the FrameController abort race condition during seekForRender.
 *
 * Usage: telecine/scripts/run tsx scripts/smoke-test-waveform.ts
 *        EF_HOST=https://editframe.com EF_TOKEN=<token> telecine/scripts/run tsx scripts/smoke-test-waveform.ts
 *        telecine/scripts/run tsx scripts/smoke-test-waveform.ts --timeout 300
 */

const EF_HOST = process.env.EF_HOST ?? "http://web:3000";
const EF_TOKEN = process.env.EF_TOKEN;
const args = process.argv.slice(2);
const timeoutIdx = args.indexOf("--timeout");
const TIMEOUT_MS = (timeoutIdx !== -1 ? parseInt(args[timeoutIdx + 1]!) : 900) * 1000;

if (!EF_TOKEN) {
  console.error("EF_TOKEN environment variable is required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${EF_TOKEN}`,
  "Content-Type": "application/json",
};

async function createRender(html: string): Promise<string> {
  const res = await fetch(`${EF_HOST}/api/v1/renders`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      strategy: "v1",
      fps: 30,
      work_slice_ms: 4000,
      output: { container: "mp4", video: { codec: "h264" }, audio: { codec: "aac" } },
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create render: ${res.status} ${res.statusText} ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function pollRender(id: string): Promise<{ status: string; error?: string }> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${EF_HOST}/api/v1/renders/${id}`, { headers });
    const data = (await res.json()) as { status: string; error?: string };
    if (data.status === "complete" || data.status === "failed") return data;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return { status: "timeout" };
}

async function runTest(name: string, html: string): Promise<boolean> {
  process.stdout.write(`  ${name} ... `);
  const start = Date.now();
  try {
    const id = await createRender(html);
    const result = await pollRender(id);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (result.status === "complete") {
      console.log(`✓ complete (${elapsed}s) [${id}]`);
      return true;
    } else {
      const detail = result.error ? ` — ${result.error}` : "";
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
  { name: "bars + interpolate-frequencies (fft)", html: BASE_HTML(`mode="bars" bar-spacing="2"`) },
  { name: "bars no interpolation (fft)",          html: BASE_HTML(`mode="bars" bar-spacing="2"`).replace("interpolate-frequencies ", "") },
  { name: "roundBars (fft)",                      html: BASE_HTML(`mode="roundBars" bar-spacing="3"`) },
  { name: "line (time-domain)",                   html: BASE_HTML(`mode="line" line-width="3"`) },
  { name: "curve (time-domain)",                  html: BASE_HTML(`mode="curve" line-width="3"`) },
];

async function main() {
  console.log(`\nWaveform smoke tests against ${EF_HOST}`);
  console.log(`  timeout: ${TIMEOUT_MS / 1000}s per render`);
  console.log(`  running: ${TESTS.length} tests concurrently\n`);

  const results = await Promise.all(TESTS.map((t) => runTest(t.name, t.html)));

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${TESTS.length} passed`);
  if (passed < TESTS.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
