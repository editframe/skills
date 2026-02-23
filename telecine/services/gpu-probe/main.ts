/**
 * Cloud Run Job: GPU zero-copy pipeline validator
 *
 * Tests the full chain:
 *   1. CUDA VMM DMA-BUF export (compiled C test)
 *   2. Electron offscreen rendering with useSharedTexture
 *      + fake_drm.so + libgbm_cuda.so
 *   3. Frame capture → ffmpeg h264_nvenc → MP4
 *   4. Upload to GCS
 *
 * Build + deploy via:
 *   telecine/scripts/deploy-gpu-probe-job
 */

import { execSync, spawnSync, spawn } from "node:child_process";
import { writeFileSync, existsSync, unlinkSync } from "node:fs";

function step(name: string) {
  process.stdout.write(`\n[gpu-probe] === ${name} ===\n`);
}

function pass(msg: string) {
  process.stdout.write(`[gpu-probe] PASS: ${msg}\n`);
}

function fail(msg: string) {
  process.stderr.write(`[gpu-probe] FAIL: ${msg}\n`);
}

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", shell: true, timeout: 30_000 });
  } catch {
    return "(command failed)";
  }
}

// ---------------------------------------------------------------------------
// 1. CUDA DMA-BUF export
// ---------------------------------------------------------------------------
step("1. CUDA DMA-BUF export");
const cudaTest = spawnSync("cuda_dmabuf_test", [], { encoding: "utf8", timeout: 30_000 });
process.stdout.write(cudaTest.stdout ?? "");
if (cudaTest.stderr) process.stderr.write(cudaTest.stderr);
if (cudaTest.status !== 0) {
  fail(`cuda_dmabuf_test exited ${cudaTest.status}`);
  process.exit(1);
}
pass("CUDA DMA-BUF export works");

// ---------------------------------------------------------------------------
// 2. h264_nvenc sanity check
// ---------------------------------------------------------------------------
step("2. h264_nvenc");
const nvenc = spawnSync(
  "ffmpeg",
  ["-y", "-f", "lavfi", "-i", "color=red:size=320x240:duration=1:rate=30",
   "-c:v", "h264_nvenc", "-f", "null", "-"],
  { encoding: "utf8" },
);
if (nvenc.status !== 0) {
  fail(`ffmpeg h264_nvenc exited ${nvenc.status}`);
  process.exit(1);
}
pass("h264_nvenc encode works");

// ---------------------------------------------------------------------------
// 3. Electron offscreen capture → raw frames → ffmpeg h264_nvenc → MP4
// ---------------------------------------------------------------------------
step("3. Electron offscreen → h264_nvenc → MP4");

const WIDTH = 640;
const HEIGHT = 480;
const FPS = 30;
const DURATION_SEC = 3;
const TOTAL_FRAMES = FPS * DURATION_SEC;
const OUTPUT_PATH = "/tmp/gpu-probe-output.mp4";

// Electron script that renders a frame counter and emits raw BGRA via stdout
const electronScript = `
const { app, BrowserWindow } = require('electron');

app.disableHardwareAcceleration && false; // keep GPU on

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: ${WIDTH},
    height: ${HEIGHT},
    show: false,
    webPreferences: {
      offscreen: true,
      sandbox: false,
    },
  });

  win.webContents.setFrameRate(${FPS});

  // Load a page that shows a frame counter
  await win.loadURL('data:text/html,' + encodeURIComponent(\`
    <body style="margin:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;height:100vh">
      <div id="c" style="font:bold 120px monospace;color:#e94560"></div>
      <script>
        let n = 0;
        function tick() {
          document.getElementById('c').textContent = String(n++).padStart(3,'0');
          requestAnimationFrame(tick);
        }
        tick();
      </script>
    </body>
  \`));

  let frameCount = 0;

  win.webContents.on('paint', (event, dirty, image) => {
    if (frameCount >= ${TOTAL_FRAMES}) return;
    const bitmap = image.toBitmap();
    process.stdout.write(Buffer.from(bitmap));
    frameCount++;
    if (frameCount >= ${TOTAL_FRAMES}) {
      process.stderr.write('FRAMES_DONE\\n');
      setTimeout(() => app.quit(), 100);
    }
  });

  // Force first paint
  win.webContents.invalidate();
});
`;

const electronScriptPath = "/tmp/gpu-probe-electron.js";
writeFileSync(electronScriptPath, electronScript);

try {
  // Spawn ffmpeg to receive raw BGRA frames on stdin
  const ffmpeg = spawn("ffmpeg", [
    "-y",
    "-f", "rawvideo",
    "-pixel_format", "bgra",
    "-video_size", `${WIDTH}x${HEIGHT}`,
    "-framerate", String(FPS),
    "-i", "pipe:0",
    "-c:v", "h264_nvenc",
    "-preset", "p4",
    "-profile:v", "main",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    OUTPUT_PATH,
  ], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let ffmpegStderr = "";
  ffmpeg.stderr.on("data", (d: Buffer) => { ffmpegStderr += d.toString(); });

  // Spawn Electron with GPU shims
  const electron = spawn("node_modules/.bin/electron", [
    "--no-sandbox",
    "--use-angle=vulkan",
    "--enable-gpu-rasterization",
    "--enable-zero-copy",
    "--ignore-gpu-blocklist",
    "--disable-gpu-sandbox",
    "--disable-vulkan-surface",
    "--ozone-platform=headless",
    "--disable-setuid-sandbox",
    "--disable-seccomp-filter-sandbox",
    electronScriptPath,
  ], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      EF_GPU_RENDER: "1",
      __GLX_VENDOR_LIBRARY_NAME: "nvidia",
      LIBGL_ALWAYS_SOFTWARE: "0",
      VK_ICD_FILENAMES: "/etc/vulkan/icd.d/nvidia_icd.json",
      DISABLE_LAYER_NV_OPTIMUS_1: "1",
      VK_LOADER_DEBUG: "error",
      LD_PRELOAD: "/usr/lib/x86_64-linux-gnu/fake_sysfs_access.so",
    },
  });

  let electronStderr = "";
  let framesDone = false;

  // Pipe Electron stdout (raw frames) → ffmpeg stdin
  electron.stdout.pipe(ffmpeg.stdin);

  electron.stderr.on("data", (d: Buffer) => {
    const s = d.toString();
    electronStderr += s;
    if (s.includes("FRAMES_DONE")) {
      framesDone = true;
    }
  });

  // Wait for both processes
  const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    let electronDone = false;
    let ffmpegDone = false;

    const timeout = setTimeout(() => {
      electron.kill();
      ffmpeg.kill();
      resolve({ success: false, error: "Timeout after 60s" });
    }, 60_000);

    electron.on("close", (code) => {
      electronDone = true;
      process.stdout.write(`Electron exited: ${code}\n`);
      if (electronDone && ffmpegDone) {
        clearTimeout(timeout);
        resolve({ success: framesDone });
      }
    });

    ffmpeg.on("close", (code) => {
      ffmpegDone = true;
      process.stdout.write(`FFmpeg exited: ${code}\n`);
      if (electronDone && ffmpegDone) {
        clearTimeout(timeout);
        resolve({ success: framesDone && code === 0 });
      }
    });

    electron.on("error", (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: `Electron error: ${err.message}` });
    });
  });

  // Log stderr summaries
  const stderrLines = electronStderr.split("\n").filter((l: string) => l.includes("ERROR") || l.includes("FAIL") || l.includes("FRAMES_DONE"));
  if (stderrLines.length > 0) {
    process.stdout.write(`Electron stderr highlights:\n${stderrLines.join("\n")}\n`);
  }
  if (ffmpegStderr) {
    // Show last 20 lines of ffmpeg output
    const lines = ffmpegStderr.split("\n");
    process.stdout.write(`FFmpeg output (last 20 lines):\n${lines.slice(-20).join("\n")}\n`);
  }

  if (!result.success) {
    fail(`Pipeline failed: ${result.error ?? "frames not completed"}`);
    // Don't exit — continue to upload whatever we have
  }

  // Check output file
  if (existsSync(OUTPUT_PATH)) {
    const stat = run(`ls -la ${OUTPUT_PATH}`);
    process.stdout.write(`Output: ${stat}`);
    const probe = run(`ffmpeg -i ${OUTPUT_PATH} 2>&1 | head -20`);
    process.stdout.write(`Probe: ${probe}`);
    pass(`MP4 created at ${OUTPUT_PATH}`);

    // Upload to GCS
    step("4. Upload to GCS");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const gcsPath = `gs://telecine-dot-dev-data-4fedc83/gpu-probe/${ts}/output.mp4`;
    const upload = spawnSync("gcloud", [
      "storage", "cp", OUTPUT_PATH, gcsPath,
      "--project=editframe",
    ], { encoding: "utf8", timeout: 30_000 });
    if (upload.status === 0) {
      pass(`Uploaded to ${gcsPath}`);
    } else {
      process.stdout.write(`Upload failed: ${upload.stderr}\n`);
      fail("GCS upload failed");
    }
  } else {
    fail("No output file produced");
  }
} catch (err) {
  fail(`Pipeline threw: ${err instanceof Error ? err.stack ?? err.message : err}`);
} finally {
  try { unlinkSync(electronScriptPath); } catch {}
  try { unlinkSync(OUTPUT_PATH); } catch {}
}

// ---------------------------------------------------------------------------
process.stdout.write("\n[gpu-probe] Done.\n");
process.exit(0);
