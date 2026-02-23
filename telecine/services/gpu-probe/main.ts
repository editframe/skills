/**
 * Cloud Run Job: GPU probe
 *
 * Runs three checks and exits 0 only if all pass:
 *   1. nvidia-smi — confirms the NVIDIA driver + GPU are visible to the container
 *   2. Electron EGL capture — launches Electron via EF_GPU_RENDER=1 (EGL, no Xvfb),
 *      renders a solid-red offscreen page, capturePage() → verifies non-zero PNG bytes
 *   3. h264_nvenc — ffmpeg lavfi color source encoded with h264_nvenc to /dev/null
 *
 * Build + deploy via:
 *   telecine/scripts/build-and-push gpu-probe
 *   telecine/scripts/deploy-gpu-probe-job
 */

import { execSync, spawnSync } from "node:child_process";
import { executeInElectronWithRpc } from "@/electron-exec/executeInElectron";

const PROBE_ELECTRON_SCRIPT = "/app/lib/electron-exec/probe-electron.ts";

function step(name: string) {
  process.stdout.write(`\n[gpu-probe] === ${name} ===\n`);
}

function pass(msg: string) {
  process.stdout.write(`[gpu-probe] PASS: ${msg}\n`);
}

function fail(msg: string) {
  process.stderr.write(`[gpu-probe] FAIL: ${msg}\n`);
}

// ---------------------------------------------------------------------------
// 1. nvidia-smi
// ---------------------------------------------------------------------------
step("1. nvidia-smi");
try {
  const out = execSync("nvidia-smi", { encoding: "utf8" });
  process.stdout.write(out);
  pass("nvidia-smi exited 0");
} catch (err) {
  fail(`nvidia-smi failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Electron EGL capture
// ---------------------------------------------------------------------------
step("2. Electron EGL offscreen capture");
try {
  const { rpc, processExit } = await executeInElectronWithRpc(PROBE_ELECTRON_SCRIPT);

  const result = await rpc.call("captureFrame") as { byteLength: number; width: number; height: number };
  await rpc.call("terminate");
  await processExit;

  if (!result || result.byteLength === 0) {
    fail(`captureFrame returned ${result?.byteLength ?? 0} bytes`);
    process.exit(1);
  }

  pass(`captureFrame returned ${result.byteLength} bytes (${result.width}x${result.height} PNG)`);
} catch (err) {
  fail(`Electron EGL capture threw: ${err instanceof Error ? err.stack ?? err.message : err}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. h264_nvenc
// ---------------------------------------------------------------------------
step("3. h264_nvenc encode");
const nvenc = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-f", "lavfi",
    "-i", "color=red:size=64x64:duration=1:rate=30",
    "-c:v", "h264_nvenc",
    "-f", "null",
    "-",
  ],
  { encoding: "utf8" },
);

process.stdout.write(nvenc.stdout ?? "");
process.stderr.write(nvenc.stderr ?? "");

if (nvenc.status !== 0) {
  fail(`ffmpeg h264_nvenc exited ${nvenc.status}`);
  process.exit(1);
}

pass("h264_nvenc encode succeeded");

// ---------------------------------------------------------------------------
process.stdout.write("\n[gpu-probe] All checks passed.\n");
process.exit(0);
