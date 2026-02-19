#!/usr/bin/env node
/**
 * Production smoke tests for the telecine render pipeline.
 * Submits renders via the public API and polls until complete or failed.
 *
 * Usage: EF_TOKEN=<token> EF_HOST=https://editframe.com tsx scripts/smoke-test.ts
 *        EF_TOKEN=<token> EF_HOST=https://editframe.com tsx scripts/smoke-test.ts --timeout 120
 */

const EF_HOST = process.env.EF_HOST ?? "https://editframe.com";
const EF_TOKEN = process.env.EF_TOKEN;
const TIMEOUT_S = parseInt(
  process.argv[process.argv.indexOf("--timeout") + 1] ?? "180",
);

if (!EF_TOKEN) {
  console.error("EF_TOKEN environment variable is required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${EF_TOKEN}`,
  "Content-Type": "application/json",
};

interface RenderResult {
  id: string;
  status: string;
  [key: string]: unknown;
}

async function createRender(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${EF_HOST}/api/v1/renders`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to create render: ${res.status} ${res.statusText} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as RenderResult;
  return data.id;
}

async function pollRender(
  id: string,
  timeoutMs: number,
): Promise<RenderResult> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${EF_HOST}/api/v1/renders/${id}`, { headers });
    const data = (await res.json()) as RenderResult;
    if (data.status === "complete" || data.status === "failed") {
      return data;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Render ${id} timed out after ${timeoutMs / 1000}s`);
}

async function runTest(
  name: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  process.stdout.write(`  ${name} ... `);
  const start = Date.now();
  try {
    const id = await createRender(payload);
    const result = await pollRender(id, TIMEOUT_S * 1000);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (result.status === "complete") {
      console.log(`✓ complete (${elapsed}s) [${id}]`);
      return true;
    } else {
      console.log(`✗ failed (${elapsed}s) [${id}]`);
      return false;
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✗ error (${elapsed}s): ${(err as Error).message}`);
    return false;
  }
}

const MP4_OUTPUT = { container: "mp4", video: { codec: "h264" }, audio: { codec: "aac" } };
const PNG_OUTPUT = { container: "png" };
const JPEG_OUTPUT = { container: "jpeg" };

const COMMON = {
  strategy: "v1",
  fps: 30,
  work_slice_ms: 4000,
};

const TESTS: Array<{ name: string; payload: Record<string, unknown> }> = [
  {
    name: "text composition (mp4)",
    payload: {
      ...COMMON,
      output: MP4_OUTPUT,
      html: `<!DOCTYPE html><html><body>
        <ef-configuration>
          <ef-timegroup mode="fixed" duration="2s" class="aspect-[16/9] w-[1280px] h-[720px] bg-black flex items-center justify-center">
            <h1 style="color:white;font-size:72px;font-family:sans-serif;">Smoke Test</h1>
          </ef-timegroup>
        </ef-configuration>
      </body></html>`,
    },
  },
  {
    name: "text composition (png still)",
    payload: {
      ...COMMON,
      output: PNG_OUTPUT,
      html: `<!DOCTYPE html><html><body>
        <ef-configuration>
          <ef-timegroup mode="fixed" duration="1s" class="aspect-[16/9] w-[1280px] h-[720px] bg-white flex items-center justify-center">
            <h1 style="color:black;font-size:72px;font-family:sans-serif;">PNG Still</h1>
          </ef-timegroup>
        </ef-configuration>
      </body></html>`,
    },
  },
  {
    name: "text composition (jpeg still)",
    payload: {
      ...COMMON,
      output: JPEG_OUTPUT,
      html: `<!DOCTYPE html><html><body>
        <ef-configuration>
          <ef-timegroup mode="fixed" duration="1s" class="aspect-[16/9] w-[1280px] h-[720px] bg-blue-500 flex items-center justify-center">
            <h1 style="color:white;font-size:72px;font-family:sans-serif;">JPEG Still</h1>
          </ef-timegroup>
        </ef-configuration>
      </body></html>`,
    },
  },
  {
    name: "square mp4 (1:1 aspect ratio)",
    payload: {
      ...COMMON,
      output: MP4_OUTPUT,
      html: `<!DOCTYPE html><html><body>
        <ef-configuration>
          <ef-timegroup mode="fixed" duration="2s" class="aspect-[1/1] w-[500px] h-[500px] bg-purple-600 flex items-center justify-center">
            <h1 style="color:white;font-size:48px;font-family:sans-serif;">1:1</h1>
          </ef-timegroup>
        </ef-configuration>
      </body></html>`,
    },
  },
  {
    name: "vertical mp4 (9:16 aspect ratio)",
    payload: {
      ...COMMON,
      output: MP4_OUTPUT,
      html: `<!DOCTYPE html><html><body>
        <ef-configuration>
          <ef-timegroup mode="fixed" duration="2s" class="aspect-[9/16] w-[720px] h-[1280px] bg-green-600 flex items-center justify-center">
            <h1 style="color:white;font-size:48px;font-family:sans-serif;">9:16</h1>
          </ef-timegroup>
        </ef-configuration>
      </body></html>`,
    },
  },
  {
    name: "remote image + audio + waveform (mp4)",
    payload: {
      ...COMMON,
      output: MP4_OUTPUT,
      html: `<!DOCTYPE html><html><body>
        <ef-configuration>
          <ef-timegroup mode="contain" class="w-[1080px] h-[1080px] bg-[rgb(192,192,192)]">
            <ef-image class="w-full h-full absolute inset-0" src="https://storage.googleapis.com/editframe-assets-7ac794b/1080-cat.jpeg"></ef-image>
            <ef-audio fft-size="512" interpolate-frequencies src="https://storage.googleapis.com/editframe-assets-7ac794b/card-joker.mp3" id="sample-audio"></ef-audio>
            <div class="absolute inset-0 grid place-items-center">
              <ef-waveform target="sample-audio" mode="bars" bar-spacing="2" class="w-full h-[1080px]" style="color: rgb(106, 90, 205)"></ef-waveform>
            </div>
          </ef-timegroup>
        </ef-configuration>
      </body></html>`,
    },
  },
];

async function main() {
  console.log(`\nSmoke tests against ${EF_HOST}`);
  console.log(`Timeout: ${TIMEOUT_S}s per render\n`);

  const results = await Promise.all(
    TESTS.map((test) => runTest(test.name, test.payload)),
  );

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;

  console.log(`\n${passed}/${TESTS.length} passed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
