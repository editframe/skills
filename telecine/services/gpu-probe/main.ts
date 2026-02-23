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
// 5. Shared texture DMA-BUF delivery test (ozone-drm + fake_drm + libgbm_cuda)
// ---------------------------------------------------------------------------
step("5. Shared texture DMA-BUF delivery (ozone-drm + useSharedTexture)");

const sharedTexScript = `
const { app, BrowserWindow } = require('electron');

const log = (msg) => process.stderr.write('[shared-tex] ' + msg + '\\n');

app.whenReady().then(async () => {
  log('app ready, creating BrowserWindow with useSharedTexture');

  let win;
  try {
    win = new BrowserWindow({
      width: ${WIDTH},
      height: ${HEIGHT},
      show: false,
      webPreferences: {
        offscreen: { useSharedTexture: true },
        sandbox: false,
      },
    });
  } catch (err) {
    log('FAIL BrowserWindow creation: ' + err.message);
    process.exit(1);
  }

  log('BrowserWindow created, loading page');
  win.webContents.setFrameRate(${FPS});

  await win.loadURL('data:text/html,' + encodeURIComponent(\`
    <body style="margin:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;height:100vh">
      <div id="c" style="font:bold 120px monospace;color:#e94560">000</div>
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

  log('page loaded, waiting for paint events');

  let frameCount = 0;
  const MAX_FRAMES = 10;

  win.webContents.on('paint', (event, dirty, image) => {
    if (frameCount >= MAX_FRAMES) return;
    frameCount++;

    const info = {};
    info.hasTexture = !!event.texture;
    info.dirty = dirty;
    info.imageEmpty = image.isEmpty();
    info.imageSize = image.getSize();

    if (event.texture) {
      const tex = event.texture;
      const ti = tex.textureInfo || {};
      info.widgetType = ti.widgetType;
      info.pixelFormat = ti.pixelFormat;
      info.codedSize = ti.codedSize;
      info.visibleRect = ti.visibleRect;
      info.contentRect = ti.contentRect;
      info.timestamp = ti.timestamp;

      const handle = ti.handle || {};
      info.handleKeys = Object.keys(handle);
      info.hasNativePixmap = !!handle.nativePixmap;
      info.hasNtHandle = !!handle.ntHandle;
      info.hasIoSurface = !!handle.ioSurface;

      if (handle.nativePixmap) {
        const np = handle.nativePixmap;
        info.modifier = np.modifier;
        info.supportsZeroCopy = np.supportsZeroCopyWebGpuImport;
        info.planeCount = np.planes ? np.planes.length : 0;
        if (np.planes) {
          info.planes = np.planes.map((p, i) => ({
            index: i,
            fd: p.fd,
            stride: p.stride,
            offset: p.offset,
            size: p.size,
          }));
        }
      }

      try { tex.release(); } catch (e) { info.releaseError = e.message; }
    }

    log('FRAME ' + frameCount + ': ' + JSON.stringify(info));

    if (frameCount >= MAX_FRAMES) {
      log('SHARED_TEX_DONE');
      setTimeout(() => app.quit(), 200);
    }
  });

  win.webContents.invalidate();
});

app.on('gpu-info-update', () => {
  const gpuInfo = app.getGPUInfo('complete').then(info => {
    log('GPU_INFO: ' + JSON.stringify({
      vendor: info?.gpuDevice?.[0]?.vendorId,
      device: info?.gpuDevice?.[0]?.deviceId,
      driver: info?.gpuDevice?.[0]?.driverVersion,
      glRenderer: info?.auxAttributes?.glRenderer,
      glVendor: info?.auxAttributes?.glVendor,
    }));
  }).catch(() => {});
});
`;

const sharedTexScriptPath = "/tmp/gpu-probe-shared-tex.js";
writeFileSync(sharedTexScriptPath, sharedTexScript);

try {
  const sharedTexElectron = spawn("node_modules/.bin/electron", [
    "--no-sandbox",
    "--use-angle=vulkan",
    "--enable-gpu-rasterization",
    "--enable-zero-copy",
    "--ignore-gpu-blocklist",
    "--disable-gpu-sandbox",
    "--disable-vulkan-surface",
    "--ozone-platform=drm",
    "--disable-setuid-sandbox",
    "--disable-seccomp-filter-sandbox",
    "--enable-logging",
    "--v=1",
    sharedTexScriptPath,
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
      LD_PRELOAD: [
        "/usr/lib/x86_64-linux-gnu/fake_drm.so",
        "/usr/lib/x86_64-linux-gnu/fake_sysfs_access.so",
      ].join(":"),
    },
  });

  let sharedTexStderr = "";
  let sharedTexStdout = "";

  sharedTexElectron.stderr.on("data", (d: Buffer) => {
    sharedTexStderr += d.toString();
  });
  sharedTexElectron.stdout.on("data", (d: Buffer) => {
    sharedTexStdout += d.toString();
  });

  const sharedTexResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    const timeout = setTimeout(() => {
      sharedTexElectron.kill();
      resolve({ success: false, error: "Timeout after 60s" });
    }, 60_000);

    sharedTexElectron.on("close", (code) => {
      clearTimeout(timeout);
      const done = sharedTexStderr.includes("SHARED_TEX_DONE");
      resolve({ success: done, error: done ? undefined : `exit ${code}` });
    });

    sharedTexElectron.on("error", (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });
  });

  // Print all shared-tex log lines from stderr
  const sharedTexLines = sharedTexStderr.split("\n").filter((l: string) =>
    l.includes("[shared-tex]") || l.includes("ERROR") || l.includes("FATAL") ||
    l.includes("Check failed") || l.includes("gbm") || l.includes("GBM") ||
    l.includes("drm") || l.includes("DRM") || l.includes("dri") ||
    l.includes("ozone") || l.includes("Ozone") || l.includes("pixmap") ||
    l.includes("native_pixmap") || l.includes("NativePixmap") ||
    l.includes("SharedImage") || l.includes("shared_image") ||
    l.includes("GpuMemoryBuffer") || l.includes("gpu_memory_buffer")
  );
  process.stdout.write(`Shared texture stderr (${sharedTexLines.length} relevant lines):\n`);
  for (const line of sharedTexLines.slice(0, 100)) {
    process.stdout.write(`  ${line}\n`);
  }

  // Also dump the last 30 lines of full stderr for context
  const allStderrLines = sharedTexStderr.split("\n");
  process.stdout.write(`\nFull stderr tail (last 30 lines of ${allStderrLines.length}):\n`);
  for (const line of allStderrLines.slice(-30)) {
    process.stdout.write(`  ${line}\n`);
  }

  if (sharedTexResult.success) {
    // Check if any frame had real DMA-BUF fds
    const frameLines = sharedTexStderr.split("\n").filter((l: string) => l.includes("FRAME "));
    const hasDmaBuf = frameLines.some((l: string) => {
      try {
        const json = l.substring(l.indexOf("{"));
        const info = JSON.parse(json);
        return info.hasNativePixmap && info.planeCount > 0 &&
               info.planes?.some((p: { fd: number }) => p.fd > 0);
      } catch { return false; }
    });

    if (hasDmaBuf) {
      pass("Shared texture delivers real DMA-BUF fds");
    } else {
      fail("Shared texture paint events received but no DMA-BUF fds found");
    }
  } else {
    fail(`Shared texture test failed: ${sharedTexResult.error}`);
  }
} catch (err) {
  fail(`Shared texture test threw: ${err instanceof Error ? err.stack ?? err.message : err}`);
} finally {
  try { unlinkSync(sharedTexScriptPath); } catch {}
}

// ---------------------------------------------------------------------------
process.stdout.write("\n[gpu-probe] Done.\n");
process.exit(0);
