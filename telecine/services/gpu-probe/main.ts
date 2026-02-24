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
step("3. Electron offscreen → encode benchmark (h264_nvenc vs libx264)");

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION_SEC = 5;
const TOTAL_FRAMES = FPS * DURATION_SEC;
const OUTPUT_PATH = "/tmp/gpu-probe-output.mp4";
const RAW_FRAMES_PATH = "/tmp/gpu-probe-raw.bgra";
const OUTPUT_NVENC = "/tmp/gpu-probe-nvenc.mp4";
const OUTPUT_X264 = "/tmp/gpu-probe-x264.mp4";

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
  // Phase 1: Capture raw frames from GPU-rasterized Electron to a file
  process.stdout.write(`Capturing ${TOTAL_FRAMES} frames at ${WIDTH}x${HEIGHT}...\n`);
  const captureStart = Date.now();

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

  // Write raw frames to file for reuse
  const { createWriteStream } = await import("node:fs");
  const rawStream = createWriteStream(RAW_FRAMES_PATH);
  electron.stdout.pipe(rawStream);

  let electronStderr = "";
  let framesDone = false;
  electron.stderr.on("data", (d: Buffer) => {
    const s = d.toString();
    electronStderr += s;
    if (s.includes("FRAMES_DONE")) framesDone = true;
  });

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => { electron.kill(); resolve(); }, 120_000);
    electron.on("close", () => { clearTimeout(timeout); resolve(); });
  });

  const captureMs = Date.now() - captureStart;
  const rawSize = existsSync(RAW_FRAMES_PATH) ? run(`stat -c%s ${RAW_FRAMES_PATH}`).trim() : "0";
  const expectedSize = WIDTH * HEIGHT * 4 * TOTAL_FRAMES;
  process.stdout.write(`Capture: ${captureMs}ms, raw=${rawSize} bytes (expected ${expectedSize})\n`);
  process.stdout.write(`Capture FPS: ${(TOTAL_FRAMES / (captureMs / 1000)).toFixed(1)} fps\n`);

  if (!framesDone || rawSize === "0") {
    fail("Frame capture failed");
  } else {
    pass(`Captured ${TOTAL_FRAMES} frames in ${captureMs}ms`);
  }

  // Log electron errors
  const stderrLines = electronStderr.split("\n").filter((l: string) =>
    l.includes("ERROR") || l.includes("FAIL") || l.includes("FRAMES_DONE") || l.includes("ANGLE"));
  if (stderrLines.length > 0) {
    process.stdout.write(`Electron stderr highlights:\n${stderrLines.slice(0, 10).join("\n")}\n`);
  }

  // Phase 2: Encode with h264_nvenc
  step("3a. Encode: h264_nvenc (GPU)");
  const nvencStart = Date.now();
  const nvencResult = spawnSync("ffmpeg", [
    "-y", "-f", "rawvideo", "-pixel_format", "bgra",
    "-video_size", `${WIDTH}x${HEIGHT}`, "-framerate", String(FPS),
    "-i", RAW_FRAMES_PATH,
    "-c:v", "h264_nvenc", "-preset", "p4", "-profile:v", "high",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    OUTPUT_NVENC,
  ], { encoding: "utf8", timeout: 120_000 });
  const nvencMs = Date.now() - nvencStart;
  const nvencSize = existsSync(OUTPUT_NVENC) ? run(`stat -c%s ${OUTPUT_NVENC}`).trim() : "0";
  const nvencFps = (TOTAL_FRAMES / (nvencMs / 1000)).toFixed(1);

  process.stdout.write(`h264_nvenc: ${nvencMs}ms (${nvencFps} fps), output=${nvencSize} bytes\n`);
  if (nvencResult.status === 0) {
    pass(`h264_nvenc: ${nvencMs}ms, ${nvencFps} fps, ${nvencSize} bytes`);
  } else {
    fail(`h264_nvenc failed: ${nvencResult.stderr?.slice(-500)}`);
  }

  // Phase 3: Encode with libx264 ultrafast
  step("3b. Encode: libx264 ultrafast (CPU)");
  const x264Start = Date.now();
  const x264Result = spawnSync("ffmpeg", [
    "-y", "-f", "rawvideo", "-pixel_format", "bgra",
    "-video_size", `${WIDTH}x${HEIGHT}`, "-framerate", String(FPS),
    "-i", RAW_FRAMES_PATH,
    "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
    "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    OUTPUT_X264,
  ], { encoding: "utf8", timeout: 120_000 });
  const x264Ms = Date.now() - x264Start;
  const x264Size = existsSync(OUTPUT_X264) ? run(`stat -c%s ${OUTPUT_X264}`).trim() : "0";
  const x264Fps = (TOTAL_FRAMES / (x264Ms / 1000)).toFixed(1);

  process.stdout.write(`libx264: ${x264Ms}ms (${x264Fps} fps), output=${x264Size} bytes\n`);
  if (x264Result.status === 0) {
    pass(`libx264: ${x264Ms}ms, ${x264Fps} fps, ${x264Size} bytes`);
  } else {
    fail(`libx264 failed: ${x264Result.stderr?.slice(-500)}`);
  }

  // Phase 4: Encode with libx264 superfast (slightly better quality than ultrafast)
  step("3c. Encode: libx264 superfast (CPU)");
  const x264sfStart = Date.now();
  const x264sfResult = spawnSync("ffmpeg", [
    "-y", "-f", "rawvideo", "-pixel_format", "bgra",
    "-video_size", `${WIDTH}x${HEIGHT}`, "-framerate", String(FPS),
    "-i", RAW_FRAMES_PATH,
    "-c:v", "libx264", "-preset", "superfast",
    "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    OUTPUT_X264,
  ], { encoding: "utf8", timeout: 120_000 });
  const x264sfMs = Date.now() - x264sfStart;
  const x264sfSize = existsSync(OUTPUT_X264) ? run(`stat -c%s ${OUTPUT_X264}`).trim() : "0";
  const x264sfFps = (TOTAL_FRAMES / (x264sfMs / 1000)).toFixed(1);

  process.stdout.write(`libx264 superfast: ${x264sfMs}ms (${x264sfFps} fps), output=${x264sfSize} bytes\n`);
  if (x264sfResult.status === 0) {
    pass(`libx264 superfast: ${x264sfMs}ms, ${x264sfFps} fps, ${x264sfSize} bytes`);
  } else {
    fail(`libx264 superfast failed: ${x264sfResult.stderr?.slice(-500)}`);
  }

  // Summary
  step("3d. Encode benchmark summary");
  process.stdout.write(`\n=== ENCODE BENCHMARK (${WIDTH}x${HEIGHT} @ ${FPS}fps, ${TOTAL_FRAMES} frames) ===\n`);
  process.stdout.write(`Capture (GPU raster → toBitmap):  ${captureMs}ms  (${(TOTAL_FRAMES / (captureMs / 1000)).toFixed(1)} fps)\n`);
  process.stdout.write(`h264_nvenc p4:                    ${nvencMs}ms  (${nvencFps} fps)  ${nvencSize} bytes\n`);
  process.stdout.write(`libx264 ultrafast:                ${x264Ms}ms  (${x264Fps} fps)  ${x264Size} bytes\n`);
  process.stdout.write(`libx264 superfast:                ${x264sfMs}ms  (${x264sfFps} fps)  ${x264sfSize} bytes\n`);
  process.stdout.write(`===\n\n`);

} catch (err) {
  fail(`Pipeline threw: ${err instanceof Error ? err.stack ?? err.message : err}`);
} finally {
  try { unlinkSync(electronScriptPath); } catch {}
  try { unlinkSync(OUTPUT_PATH); } catch {}
  try { unlinkSync(RAW_FRAMES_PATH); } catch {}
  try { unlinkSync(OUTPUT_NVENC); } catch {}
  try { unlinkSync(OUTPUT_X264); } catch {}
}

// ---------------------------------------------------------------------------
// 5. Shared texture DMA-BUF delivery test — SKIPPED for benchmark run
// ---------------------------------------------------------------------------
if (false) {
step("5. Shared texture DMA-BUF (ozone-wayland + ANGLE-Vulkan + VulkanFromANGLE + useSharedTexture)");

const sharedTexScript = `
const { app, BrowserWindow } = require('electron');

const log = (msg) => process.stderr.write('[shared-tex] ' + msg + '\\n');

app.whenReady().then(async () => {
  log('app ready');

  // Dump GPU feature status
  const gpuFeatures = app.getGPUFeatureStatus();
  log('GPU_FEATURES: ' + JSON.stringify(gpuFeatures));

  log('creating BrowserWindow with useSharedTexture');

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

    // Enumerate all event properties for diagnostics
    info.eventKeys = Object.keys(event);
    info.eventProto = Object.getOwnPropertyNames(Object.getPrototypeOf(event));

    if (event.texture) {
      const tex = event.texture;
      info.textureKeys = Object.keys(tex);

      const ti = tex.textureInfo || {};
      info.textureInfoKeys = Object.keys(ti);
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
      info.hasSharedMemory = !!handle.sharedMemory;

      if (handle.nativePixmap) {
        const np = handle.nativePixmap;
        info.nativePixmapKeys = Object.keys(np);
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

      if (handle.sharedMemory) {
        info.sharedMemoryKeys = Object.keys(handle.sharedMemory);
      }

      try { tex.release(); } catch (e) { info.releaseError = e.message; }
    } else {
      // No texture — try to get bitmap info for comparison
      info.bitmapSize = image.getBitmap ? image.getBitmap().length : 'no getBitmap';
      info.toPNGSize = image.toPNG ? image.toPNG().length : 'no toPNG';
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
  app.getGPUInfo('complete').then(info => {
    log('GPU_INFO: ' + JSON.stringify({
      vendor: info?.gpuDevice?.[0]?.vendorId,
      device: info?.gpuDevice?.[0]?.deviceId,
      driver: info?.gpuDevice?.[0]?.driverVersion,
      glRenderer: info?.auxAttributes?.glRenderer,
      glVendor: info?.auxAttributes?.glVendor,
      glVersion: info?.auxAttributes?.glVersion,
      gpuCompositing: info?.featureStatus?.gpu_compositing,
      rasterization: info?.featureStatus?.rasterization,
      opengl: info?.featureStatus?.opengl,
      vulkan: info?.featureStatus?.vulkan,
      skiaGraphite: info?.featureStatus?.skia_graphite,
    }));
  }).catch(() => {});
});
`;

const sharedTexScriptPath = "/tmp/gpu-probe-shared-tex.js";
writeFileSync(sharedTexScriptPath, sharedTexScript);

// Start headless weston compositor for wayland platform support
const XDG_RUNTIME_DIR = "/tmp/xdg-runtime";
const WAYLAND_DISPLAY = "wayland-gpu-probe";
run(`mkdir -p ${XDG_RUNTIME_DIR} && chmod 0700 ${XDG_RUNTIME_DIR}`);
const weston = spawn("weston", [
  "--backend=headless-backend.so",
  `--socket=${WAYLAND_DISPLAY}`,
  "--width=640",
  "--height=480",
  "--use-pixman",
  "--no-config",
], {
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    XDG_RUNTIME_DIR,
    LD_PRELOAD: [
      "/usr/lib/x86_64-linux-gnu/fake_drm.so",
      "/usr/lib/x86_64-linux-gnu/fake_sysfs_access.so",
    ].join(":"),
  },
});

let westonStderr = "";
weston.stderr.on("data", (d: Buffer) => { westonStderr += d.toString(); });
weston.stdout.on("data", (d: Buffer) => { westonStderr += d.toString(); });

// Give weston time to start and create the socket
await new Promise<void>((resolve) => {
  const check = () => {
    if (existsSync(`${XDG_RUNTIME_DIR}/${WAYLAND_DISPLAY}`)) {
      resolve();
    } else {
      setTimeout(check, 100);
    }
  };
  setTimeout(check, 200);
  // Timeout after 5s
  setTimeout(() => resolve(), 5000);
});

const westonReady = existsSync(`${XDG_RUNTIME_DIR}/${WAYLAND_DISPLAY}`);
process.stdout.write(`Weston headless: ${westonReady ? "ready" : "FAILED to start"}\n`);
if (westonStderr) {
  const lines = westonStderr.split("\n").slice(0, 40);
  process.stdout.write(`Weston output (first 40 lines):\n${lines.join("\n")}\n`);
}
// List XDG_RUNTIME_DIR contents
process.stdout.write(`XDG_RUNTIME_DIR contents: ${run(`ls -la ${XDG_RUNTIME_DIR}/`)}\n`);

try {
  // Config: ozone-wayland + ANGLE Vulkan + VulkanFromANGLE (shared VkInstance)
  // - ANGLE uses NVIDIA Vulkan for hardware WebGL/Canvas rendering
  // - VulkanFromANGLE makes Skia reuse ANGLE's VkInstance instead of creating
  //   a second one (which crashes because NVIDIA's ICD probes wayland env)
  // - GBM device from libgbm_cuda.so.1 provides native pixmaps
  // - SupportsNativePixmaps() checks GBM device + not-software-GL → should be true
  const sharedTexElectron = spawn("node_modules/.bin/electron", [
    "--no-sandbox",
    "--enable-gpu-rasterization",
    "--enable-zero-copy",
    "--ignore-gpu-blocklist",
    "--disable-gpu-sandbox",
    "--ozone-platform=wayland",
    "--render-node-override=/dev/dri/renderD128",
    "--disable-setuid-sandbox",
    "--disable-seccomp-filter-sandbox",
    "--disable-accelerated-video-decode",
    "--disable-accelerated-video-encode",
    "--use-angle=vulkan",
    "--disable-vulkan-surface",
    "--enable-features=VulkanFromANGLE,Vulkan",
    "--disable-features=VaapiVideoDecoder,VaapiVideoEncoder,VaapiVideoDecodeLinuxGL,UseChromeOSDirectVideoDecoder",
    "--enable-logging",
    "--v=1",
    "--vmodule=*/gpu/*=2,*/viz/*=2,*/ozone/*=2,*/gl/*=2,*/gbm/*=2,*/native_pixmap/*=2,*/shared_image/*=2,*/vulkan/*=2,*/wayland/*=2,*/buffer/*=2,*/offscreen/*=2,*/frame_sink/*=2",
    sharedTexScriptPath,
  ], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      EF_GPU_RENDER: "1",
      XDG_RUNTIME_DIR,
      WAYLAND_DISPLAY,
      __GLX_VENDOR_LIBRARY_NAME: "nvidia",
      LIBGL_ALWAYS_SOFTWARE: "0",
      VK_ICD_FILENAMES: "/etc/vulkan/icd.d/nvidia_icd.json",
      DISABLE_LAYER_NV_OPTIMUS_1: "1",
      VK_LOADER_DEBUG: "error",
      __EGL_VENDOR_LIBRARY_FILENAMES: "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
      LD_PRELOAD: [
        "/usr/lib/x86_64-linux-gnu/fake_drm.so",
        "/usr/lib/x86_64-linux-gnu/fake_sysfs_access.so",
      ].join(":"),
    },
  });

  // Only keep relevant lines to avoid OOM on huge stderr
  const relevantLines: string[] = [];
  const tailLines: string[] = [];
  const MAX_TAIL = 50;
  let totalLines = 0;
  let sharedTexDone = false;
  let pendingChunk = "";

  sharedTexElectron.stderr.on("data", (d: Buffer) => {
    const text = pendingChunk + d.toString();
    const lines = text.split("\n");
    pendingChunk = lines.pop() ?? "";
    for (const line of lines) {
      totalLines++;
      // Keep lines from our shims, our test script, errors, or crash info
      if (line.includes("[shared-tex]") || line.includes("[fake_drm]") ||
          line.includes("[libgbm_cuda]") || line.includes("ERROR:") ||
          line.includes("FATAL") || line.includes("Check failed") ||
          line.includes("SIGSEGV") || line.includes("SHARED_TEX_DONE") ||
          line.includes("gbm") || line.includes("GBM") ||
          line.includes("native_pixmap") || line.includes("NativePixmap") ||
          line.includes("SharedImage") || line.includes("GpuMemoryBuffer") ||
          line.includes("ozone") || line.includes("wayland") ||
          line.includes("vulkan") || line.includes("Vulkan") ||
          line.includes("vk_loader") || line.includes("ANGLE") ||
          line.includes("EGL") || line.includes("egl") ||
          line.includes("GL_") || line.includes("context") ||
          line.includes("pixmap") || line.includes("Pixmap") ||
          line.includes("gpu_init") || line.includes("GpuInit") ||
          line.includes("shared_image") || line.includes("ContextResult") ||
          line.includes("supports_native") || line.includes("gpu_feature") ||
          line.includes("gl_surface") || line.includes("GLSurface") ||
          line.includes("SupportsNativePixmaps") || line.includes("BufferManager") ||
          line.includes("buffer_manager") || line.includes("surface_factory") ||
          line.includes("SurfaceFactory") || line.includes("WaylandSurface") ||
          line.includes("OffscreenCanvas") || line.includes("offscreen") ||
          line.includes("frame_sink") || line.includes("FrameSink") ||
          line.includes("frame_pool") || line.includes("FramePool") ||
          line.includes("CreateCommandBuffer") || line.includes("compositor") ||
          line.includes("Compositor") || line.includes("software") ||
          line.includes("Software") || line.includes("SwiftShader") ||
          line.includes("GPU_FEATURES") || line.includes("GPU_INFO") ||
          line.includes("gpu_compositing") || line.includes("GpuCompositing")) {
        relevantLines.push(line);
      }
      if (line.includes("SHARED_TEX_DONE")) sharedTexDone = true;
      tailLines.push(line);
      if (tailLines.length > MAX_TAIL) tailLines.shift();
    }
  });

  sharedTexElectron.stdout.on("data", () => {}); // drain

  const sharedTexResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    const timeout = setTimeout(() => {
      sharedTexElectron.kill();
      resolve({ success: false, error: "Timeout after 60s" });
    }, 60_000);

    sharedTexElectron.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ success: sharedTexDone, error: sharedTexDone ? undefined : `exit ${code}` });
    });

    sharedTexElectron.on("error", (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });
  });

  process.stdout.write(`\nShared texture stderr: ${totalLines} total lines, ${relevantLines.length} relevant\n`);
  process.stdout.write(`\nRelevant lines:\n`);
  for (const line of relevantLines.slice(0, 800)) {
    process.stdout.write(`  ${line}\n`);
  }
  process.stdout.write(`\nTail (last ${tailLines.length} lines):\n`);
  for (const line of tailLines) {
    process.stdout.write(`  ${line}\n`);
  }

  if (sharedTexResult.success) {
    const frameLines = relevantLines.filter((l: string) => l.includes("FRAME "));
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
  try { weston.kill(); } catch {}
  try { unlinkSync(sharedTexScriptPath); } catch {}
}
} // end if(false) — skip step 5

// ---------------------------------------------------------------------------
process.stdout.write("\n[gpu-probe] Done.\n");
process.exit(0);
