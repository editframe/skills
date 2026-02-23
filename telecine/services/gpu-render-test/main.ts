/**
 * Cloud Run Job: GPU render test
 *
 * Renders a simple HTML composition on the GPU worker (via EGL + h264_nvenc),
 * uploads the resulting MP4 to GCS, and prints a signed download URL.
 *
 * Deploy + run via:
 *   telecine/scripts/deploy-gpu-render-test-job
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
    [
      "/app/node_modules/rolldown-vite/bin/vite.js",
      "build",
    ],
    { cwd: bundleDir },
  );

  if (stdout) log(`vite stdout: ${stdout}`);
  if (stderr) log(`vite stderr: ${stderr}`);

  return path.join(bundleDir, "dist");
}

// ---------------------------------------------------------------------------
step("0. GPU diagnostics");

// 0a. Vulkan info — full output to capture extensions list
try {
  const { stdout: vkSummary } = await execFileAsync("vulkaninfo", ["--summary"], {
    timeout: 10000,
    env: {
      ...process.env,
      VK_ICD_FILENAMES: "/etc/vulkan/icd.d/nvidia_icd.json",
    },
  });
  log(`vulkaninfo --summary:\n${vkSummary}`);
} catch (e: any) {
  log(`vulkaninfo --summary failed: ${e.stderr || e.message}`);
}

// 0b. Check for VK_EXT_headless_surface specifically (critical for ANGLE headless Vulkan)
try {
  const { stdout: vkFull } = await execFileAsync("vulkaninfo", [], {
    timeout: 15000,
    env: {
      ...process.env,
      VK_ICD_FILENAMES: "/etc/vulkan/icd.d/nvidia_icd.json",
    },
  });
  const extensionLines = vkFull.split("\n").filter(l =>
    l.includes("headless") || l.includes("surface") || l.includes("display") ||
    l.includes("VK_KHR") || l.includes("VK_EXT") || l.includes("Instance Extensions")
  );
  log(`Vulkan extensions (surface/display related):\n${extensionLines.join("\n")}`);
} catch (e: any) {
  log(`vulkaninfo full failed: ${e.stderr || e.message}`);
}

// 0c. EGL info — check if NVIDIA EGL platform_device works
try {
  const { stdout: eglOut, stderr: eglErr } = await execFileAsync("eglinfo", [], {
    timeout: 10000,
    env: {
      ...process.env,
      // Force EGL device platform (headless, no X11/Wayland needed)
      EGL_PLATFORM: "device",
    },
  });
  log(`eglinfo:\n${eglOut}`);
  if (eglErr) log(`eglinfo stderr:\n${eglErr}`);
} catch (e: any) {
  log(`eglinfo failed: ${e.stderr || e.message}`);
}

// 0d. List /dev/nvidia* and /dev/dri* for reference
try {
  const { stdout: devList } = await execFileAsync("ls", ["-la", "/dev/nvidia0", "/dev/nvidiactl", "/dev/nvidia-uvm"], { timeout: 5000 });
  log(`NVIDIA devices:\n${devList}`);
} catch (e: any) {
  log(`NVIDIA device listing: ${e.message}`);
}
try {
  const { stdout: driList } = await execFileAsync("ls", ["-la", "/dev/dri/"], { timeout: 5000 });
  log(`DRI devices:\n${driList}`);
} catch (e: any) {
  log(`No /dev/dri: ${e.message}`);
}

// ---------------------------------------------------------------------------
step("1. Bundle HTML");
const templateHash = createHash("sha256").update(HTML).digest("hex").substring(0, 16);
// Use /app/temp so vite can resolve node_modules via normal parent-dir traversal
const bundleDir = `/app/temp/gpu-render-test-${templateHash}`;
await mkdir(bundleDir, { recursive: true });
const distDir = await bundleHTML(HTML, bundleDir);
const indexPath = path.join(distDir, "index.html");
log(`Bundle written to: ${distDir}`);

// ---------------------------------------------------------------------------
step("2. Spawn Electron RPC");
const electronRpc = await executeInElectronWithRpc(ELECTRON_RPC_SCRIPT) as {
  processExit: Promise<number>;
  rpc: ElectronRPCClient;
};
log("Electron RPC ready");

// ---------------------------------------------------------------------------
step("3. Get render info");
const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
  location: `file://${indexPath}`,
  orgId: ORG_ID,
});
log(`Render info: ${renderInfo.width}x${renderInfo.height} @ ${renderInfo.durationMs}ms`);

// Pure CSS/HTML render — no media assets
const assetsBundle: AssetsMetadataBundle = { fragmentIndexes: {} };

// ---------------------------------------------------------------------------
step("4. Render fragments");
const renderId = `gpu-test-${Date.now()}`;
const fragmentIds = buildFragmentIds({
  duration_ms: renderInfo.durationMs,
  work_slice_ms: WORK_SLICE_MS,
});

log(`Rendering ${fragmentIds.length} fragments (${fragmentIds.join(", ")})`);

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
  log(`Fragment ${fragmentId}: ${buffer.length} bytes in ${elapsed}ms`);
  segmentBuffers.push(Buffer.from(buffer));
}

await electronRpc.rpc.call("terminate");
await electronRpc.processExit;
log("Electron process exited cleanly");

// ---------------------------------------------------------------------------
step("5. Concatenate segments");
const finalBuffer = Buffer.concat(segmentBuffers);
log(`Final MP4: ${finalBuffer.length} bytes`);

// ---------------------------------------------------------------------------
step("6. Upload to GCS");
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

log(`Uploaded to gs://${BUCKET}/${gcsPath}`);
log(`Download URL (7-day signed):\n  ${signedUrl}`);

// ---------------------------------------------------------------------------
process.stdout.write("\n[gpu-render-test] All steps completed.\n");
process.exit(0);
