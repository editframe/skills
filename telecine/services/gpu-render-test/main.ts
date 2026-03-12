/**
 * GPU render test: runs the same composition twice on Cloud Run L4 —
 * once with CPU (swiftshader) and once with GPU (ANGLE Vulkan on NVIDIA L4).
 * Compares fragment timings and uploads both MP4s to GCS.
 *
 * Set RENDER_MODE=cpu or RENDER_MODE=gpu to run only one mode.
 * Default: run both.
 */

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Storage } from "@google-cloud/storage";

import { executeInElectronWithRpc } from "@/electron-exec/executeInElectron";
import { buildFragmentIds } from "@/queues/units-of-work/Render/fragments/buildFragmentIds";
import type { AssetsMetadataBundle } from "@/queues/units-of-work/Render/shared/assetMetadata";
import type { ElectronRPCClient } from "@/queues/units-of-work/Render/ElectronRPCServer";

const execFileAsync = promisify(execFile);

const BUCKET = process.env.STORAGE_BUCKET ?? "telecine-dot-dev-data-4fedc83";
const ORG_ID = "gpu-test-org";
const WORK_SLICE_MS = 2000;
const ELECTRON_RPC_SCRIPT =
  "/app/lib/queues/units-of-work/Render/ElectronRPCServer.ts";

const HTML = `
<ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="3s">
  <div class="w-full h-full flex items-center justify-center"
       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <span class="text-white font-bold" style="font-size: 48px;">GPU Render Test</span>
  </div>
</ef-timegroup>
`;

const RENDER_MODE = process.env.RENDER_MODE ?? "both";

function step(msg: string) {
  process.stdout.write(`\n[gpu-render-test] === ${msg} ===\n`);
}

function log(msg: string) {
  process.stdout.write(`[gpu-render-test] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Inline HTML bundling — avoids importing processHTML.ts (pulls in DB/Valkey)
// ---------------------------------------------------------------------------
async function bundleHTML(html: string, bundleDir: string): Promise<string> {
  const WEB_HOST = process.env.WEB_HOST ?? "http://localhost:3000";

  const viteAliases = JSON.stringify({
    "@editframe/elements/preview/renderTimegroupToVideo":
      "/app/node_modules/@editframe/elements/dist/preview/renderTimegroupToVideo.js",
    "@editframe/elements/preview/renderTimegroupToCanvas":
      "/app/node_modules/@editframe/elements/dist/preview/renderTimegroupToCanvas.js",
  });

  const files: Record<string, string> = {
    "index.ts": `
      import "@editframe/elements";
      import "@editframe/elements/styles.css";
      import { renderTimegroupToVideo } from "@editframe/elements/preview/renderTimegroupToVideo";
      import { captureTimegroupAtTime } from "@editframe/elements/preview/renderTimegroupToCanvas";
      (window as any).renderTimegroupToVideo = renderTimegroupToVideo;
      (window as any).captureTimegroupAtTime = captureTimegroupAtTime;
    `,
    "index.html": `
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="./index.ts"></script>
        <link rel="stylesheet" href="./styles.css">
      </head>
      <body>
        <ef-configuration api-host="${WEB_HOST}">
          ${html}
        </ef-configuration>
      </body>
      </html>
    `,
    "styles.css": `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
    `,
    "package.json": "{}",
    "vite.config.js": `
      import { viteSingleFile } from "vite-plugin-singlefile";
      export default {
        plugins: [viteSingleFile()],
        resolve: {
          alias: ${viteAliases},
        }
      };
    `,
    "postcss.config.cjs": `
      module.exports = {
        plugins: { tailwindcss: {} },
      };
    `,
    "tailwind.config.js": `
      module.exports = {
        content: ["./index.html"],
        theme: { extend: {} },
        plugins: [],
      };
    `,
  };

  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      writeFile(path.join(bundleDir, name), content),
    ),
  );

  const { stdout, stderr } = await execFileAsync(
    "node",
    ["/app/node_modules/vite/bin/vite.js", "build"],
    { cwd: bundleDir },
  );

  if (stdout) log(`vite stdout: ${stdout}`);
  if (stderr) log(`vite stderr: ${stderr}`);

  return path.join(bundleDir, "dist");
}

// ---------------------------------------------------------------------------
async function doRender(
  mode: "cpu" | "gpu",
  indexPath: string,
): Promise<{
  timings: Record<string, number>;
  totalBytes: number;
  gcsUrl: string;
}> {
  step(`RENDER [${mode.toUpperCase()}]`);

  // Both modes use headless ozone (hasGpu() returns true on Cloud Run because
  // NVIDIA_VISIBLE_DEVICES is always set by the container runtime).
  // The ANGLE backend controls whether rasterization uses the NVIDIA GPU
  // (vulkan) or Chromium's bundled software Vulkan (swiftshader).
  if (mode === "gpu") {
    process.env.EF_ANGLE_BACKEND = "vulkan";
  } else {
    process.env.EF_ANGLE_BACKEND = "swiftshader";
  }

  const renderStart = Date.now();

  log(`Spawning Electron RPC (${mode} mode)...`);
  const electronRpc = (await executeInElectronWithRpc(ELECTRON_RPC_SCRIPT)) as {
    processExit: Promise<number>;
    rpc: ElectronRPCClient;
  };
  const rpcReady = Date.now();
  log(`Electron RPC ready in ${rpcReady - renderStart}ms`);

  const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
    location: `file://${indexPath}`,
    orgId: ORG_ID,
  });
  log(
    `Render info: ${renderInfo.width}x${renderInfo.height} @ ${renderInfo.durationMs}ms`,
  );

  const assetsBundle: AssetsMetadataBundle = { fragmentIndexes: {} };
  const renderId = `gpu-test-${mode}-${Date.now()}`;
  const fragmentIds = buildFragmentIds({
    duration_ms: renderInfo.durationMs,
    work_slice_ms: WORK_SLICE_MS,
  });

  log(`Rendering ${fragmentIds.length} fragments (${fragmentIds.join(", ")})`);

  const timings: Record<string, number> = {};
  const segmentBuffers: Buffer[] = [];

  for (const fragmentId of fragmentIds) {
    const start = Date.now();
    const buffer = await electronRpc.rpc.call("renderFragment", {
      width: renderInfo.width,
      height: renderInfo.height,
      location: `file://${indexPath}`,
      orgId: ORG_ID,
      renderId,
      segmentDurationMs: WORK_SLICE_MS,
      segmentIndex: fragmentId,
      durationMs: renderInfo.durationMs,
      fps: 30,
      fileType: "fragment",
      assetsBundle,
    });
    const elapsed = Date.now() - start;
    timings[`fragment_${fragmentId}`] = elapsed;
    log(`Fragment ${fragmentId}: ${buffer.length} bytes in ${elapsed}ms`);
    segmentBuffers.push(Buffer.from(buffer));
  }

  await electronRpc.rpc.call("terminate");
  await electronRpc.processExit;
  log("Electron process exited cleanly");

  const totalRender = Date.now() - renderStart;
  timings["total"] = totalRender;
  timings["rpc_ready"] = rpcReady - renderStart;

  const finalBuffer = Buffer.concat(segmentBuffers);
  log(`Final MP4: ${finalBuffer.length} bytes, total time: ${totalRender}ms`);

  // Upload
  const gcsPath = `gpu-render-test/${renderId}/output.mp4`;
  const storage = new Storage();
  await storage.bucket(BUCKET).file(gcsPath).save(finalBuffer, {
    contentType: "video/mp4",
  });

  const [signedUrl] = await storage
    .bucket(BUCKET)
    .file(gcsPath)
    .getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

  log(`Uploaded: gs://${BUCKET}/${gcsPath}`);
  log(`URL: ${signedUrl}`);

  return { timings, totalBytes: finalBuffer.length, gcsUrl: signedUrl };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
step("0. Quick GPU check");
try {
  const { stdout } = await execFileAsync("nvidia-smi", ["-L"], {
    timeout: 5000,
  });
  log(stdout.trim());
} catch (e: any) {
  log(`nvidia-smi: ${e.message}`);
}

step("1. Bundle HTML");
const templateHash = createHash("sha256")
  .update(HTML)
  .digest("hex")
  .substring(0, 16);
const bundleDir = `/app/temp/gpu-render-test-${templateHash}`;
await mkdir(bundleDir, { recursive: true });
const distDir = await bundleHTML(HTML, bundleDir);
const indexPath = path.join(distDir, "index.html");
log(`Bundle: ${distDir}`);

// ---------------------------------------------------------------------------
const results: Record<string, any> = {};

if (RENDER_MODE === "cpu" || RENDER_MODE === "both") {
  results.cpu = await doRender("cpu", indexPath);
}

if (RENDER_MODE === "gpu" || RENDER_MODE === "both") {
  results.gpu = await doRender("gpu", indexPath);
}

// ---------------------------------------------------------------------------
step("COMPARISON");

for (const [mode, res] of Object.entries(results)) {
  log(`\n${mode.toUpperCase()} timings:`);
  for (const [k, v] of Object.entries(res.timings)) {
    log(`  ${k}: ${v}ms`);
  }
  log(`  output size: ${res.totalBytes} bytes`);
}

if (results.cpu && results.gpu) {
  log("\n--- CPU vs GPU ---");
  const cpuFragments = Object.entries(results.cpu.timings)
    .filter(([k]) => k.startsWith("fragment_"))
    .map(([, v]) => v as number);
  const gpuFragments = Object.entries(results.gpu.timings)
    .filter(([k]) => k.startsWith("fragment_"))
    .map(([, v]) => v as number);

  const cpuTotal = cpuFragments.reduce((a, b) => a + b, 0);
  const gpuTotal = gpuFragments.reduce((a, b) => a + b, 0);

  log(`CPU fragment total: ${cpuTotal}ms`);
  log(`GPU fragment total: ${gpuTotal}ms`);
  log(`Speedup: ${(cpuTotal / gpuTotal).toFixed(2)}x`);
  log(`CPU total (incl. init): ${results.cpu.timings.total}ms`);
  log(`GPU total (incl. init): ${results.gpu.timings.total}ms`);
}

process.stdout.write("\n[gpu-render-test] Done.\n");
process.exit(0);
