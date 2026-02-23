/**
 * Minimal GPU diagnostic for Cloud Run L4 instances.
 *
 * Tests from first principles:
 *   1. NVIDIA device access
 *   2. EGL display initialization (surfaceless, device)
 *   3. Vulkan ICD
 *   4. Bare Electron boot with GPU flags → GPU info dump
 *
 * No render pipeline, no RPC, no composition bundling.
 */

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function step(msg: string) {
  process.stdout.write(`\n[gpu-diag] === ${msg} ===\n`);
}

function log(msg: string) {
  process.stdout.write(`[gpu-diag] ${msg}\n`);
}

// ---------------------------------------------------------------------------
step("1. NVIDIA device access");
try {
  const { stdout } = await execFileAsync("ls", ["-la", "/dev/nvidia0", "/dev/nvidiactl", "/dev/nvidia-uvm"]);
  log(stdout.trim());
} catch (e: any) {
  log(`NVIDIA devices not found: ${e.message}`);
}
try {
  const { stdout } = await execFileAsync("ls", ["-la", "/dev/dri/"], { timeout: 3000 });
  log(`DRI devices: ${stdout.trim()}`);
} catch {
  log("No /dev/dri (expected on Cloud Run)");
}
try {
  const { stdout } = await execFileAsync("nvidia-smi", ["-L"], { timeout: 5000 });
  log(`nvidia-smi: ${stdout.trim()}`);
} catch (e: any) {
  log(`nvidia-smi: ${e.message}`);
}

// ---------------------------------------------------------------------------
step("2. EGL display test (native C)");
try {
  const { stdout, stderr } = await execFileAsync("egl_test", [], {
    timeout: 10000,
    env: { ...process.env },
  });
  log(stdout);
  if (stderr) log(`stderr: ${stderr}`);
} catch (e: any) {
  log(`egl_test failed: ${e.stdout || ""}\n${e.stderr || e.message}`);
}

// Also try with EGL_PLATFORM=surfaceless
try {
  const { stdout } = await execFileAsync("egl_test", [], {
    timeout: 10000,
    env: { ...process.env, EGL_PLATFORM: "surfaceless" },
  });
  log(`With EGL_PLATFORM=surfaceless:\n${stdout}`);
} catch (e: any) {
  log(`egl_test with surfaceless: ${e.stdout || ""}\n${e.stderr || e.message}`);
}

// ---------------------------------------------------------------------------
step("3. Vulkan ICD");
try {
  const { stdout } = await execFileAsync("vulkaninfo", ["--summary"], {
    timeout: 10000,
    env: { ...process.env, VK_ICD_FILENAMES: "/etc/vulkan/icd.d/nvidia_icd.json" },
  });
  log(stdout.trim());
} catch (e: any) {
  log(`vulkaninfo: ${e.stderr || e.message}`);
}

// ---------------------------------------------------------------------------
step("4. Bare Electron GPU boot");

/**
 * Spawn Electron with GPU flags, load about:blank, dump GPU info, exit.
 * This is the simplest possible Electron GPU test — no RPC, no render code.
 */
const electronScript = `
const { app } = require("electron");
const { BrowserWindow } = require("electron");

app.on("child-process-gone", (_event, details) => {
  process.stderr.write("[DIAG] child-process-gone: " + JSON.stringify(details) + "\\n");
});

app.whenReady().then(async () => {
  process.stderr.write("[DIAG] app ready\\n");

  // Wait for GPU info to settle
  await new Promise(r => setTimeout(r, 5000));

  try {
    const info = await app.getGPUInfo("complete");
    process.stderr.write("[DIAG] FULL_GPU_INFO: " + JSON.stringify(info) + "\\n");
  } catch (err) {
    process.stderr.write("[DIAG] getGPUInfo error: " + err.message + "\\n");
  }

  // Also try to create a window and check WebGL
  try {
    const win = new BrowserWindow({
      width: 320, height: 240,
      show: false,
      webPreferences: { offscreen: true },
    });
    await win.loadURL("data:text/html,<canvas id='c'></canvas><script>document.title=JSON.stringify({webgl:!!document.getElementById('c').getContext('webgl2'),renderer:document.getElementById('c').getContext('webgl2')?.getParameter(0x1F01)||'none'})</script>");
    await new Promise(r => setTimeout(r, 1000));
    const title = win.getTitle();
    process.stderr.write("[DIAG] WebGL test: " + title + "\\n");
    win.close();
  } catch (err) {
    process.stderr.write("[DIAG] WebGL test error: " + err.message + "\\n");
  }

  process.stderr.write("[DIAG] done\\n");
  app.quit();
});
`;

import { writeFile } from "node:fs/promises";
const scriptPath = "/tmp/gpu-diag-electron.cjs";
await writeFile(scriptPath, electronScript);

const electronProc = spawn(
  "node_modules/.bin/electron",
  [
    // GPU flags — must be CLI args so they propagate to the GPU subprocess.
    // --use-angle=default lets ANGLE pick the best backend (EGL/GLES on
    // NVIDIA with our headless EGL setup, since Vulkan layer is broken).
    // Do NOT set --use-gl=egl: it conflicts with --use-angle in Chromium's
    // GL implementation lookup table. Chromium auto-infers --use-gl=angle.
    "--use-angle=default",
    "--enable-features=Vulkan",
    "--enable-gpu-rasterization",
    "--enable-zero-copy",
    "--ignore-gpu-blocklist",
    "--disable-gpu-sandbox",
    "--disable-vulkan-surface",
    "--disable-gpu-process-crash-limit",
    "--disable-gpu-watchdog",
    "--ozone-platform=headless",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-seccomp-filter-sandbox",
    "--enable-logging=stderr",
    "--v=1",
    "--vmodule=gpu_init=3,angle*=3,vulkan*=3,egl*=3,gl_surface*=3,display*=3,gpu_process*=3,in_process_gpu*=3,gl_factory*=3,ozone*=3",
    scriptPath,
  ],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      __GLX_VENDOR_LIBRARY_NAME: "nvidia",
      LIBGL_ALWAYS_SOFTWARE: "0",
      VK_ICD_FILENAMES: "/etc/vulkan/icd.d/nvidia_icd.json",
      // Disable the NV optimus implicit layer — it fails to resolve
      // vkGetInstanceProcAddr on Cloud Run and is unnecessary (single GPU).
      DISABLE_LAYER_NV_OPTIMUS_1: "1",
      VK_LOADER_DEBUG: "all",
      LD_PRELOAD: "/usr/lib/x86_64-linux-gnu/fake_sysfs_access.so",
    },
    timeout: 60000,
  },
);

let stderr = "";
electronProc.stderr.on("data", (data: Buffer) => {
  const str = data.toString();
  stderr += str;
  // Filter: only log [DIAG] lines and Chromium ERROR/WARNING/gpu lines
  for (const line of str.split("\n")) {
    if (line.includes("[DIAG]") ||
        line.includes("ERROR") ||
        line.includes("WARNING") ||
        line.includes("gpu_init") ||
        line.includes("GpuInit") ||
        line.includes("ANGLE") ||
        line.includes("angle_") ||
        line.includes("egl") ||
        line.includes("EGL") ||
        line.includes("vulkan") ||
        line.includes("Vulkan") ||
        line.includes("CreateCommandBuffer") ||
        line.includes("ContextResult") ||
        line.includes("child-process-gone") ||
        line.includes("in_process") ||
        line.includes("InProcess") ||
        line.includes("gl_surface") ||
        line.includes("display")) {
      process.stdout.write(`[electron] ${line}\n`);
    }
  }
});

electronProc.stdout.on("data", (data: Buffer) => {
  process.stdout.write(`[electron-stdout] ${data.toString()}`);
});

const exitCode = await new Promise<number>((resolve) => {
  electronProc.on("close", (code) => resolve(code ?? 1));
  electronProc.on("error", () => resolve(1));
});

log(`Electron exited with code ${exitCode}`);

// Print full stderr if short enough, or if it contains key diagnostics
if (stderr.length < 5000) {
  log(`Full electron stderr:\n${stderr}`);
} else {
  // Extract just the [DIAG] lines
  const diagLines = stderr.split("\n").filter(l => l.includes("[DIAG]"));
  log(`Diagnostic lines:\n${diagLines.join("\n")}`);
}

// ---------------------------------------------------------------------------
process.stdout.write("\n[gpu-diag] All diagnostics completed.\n");
process.exit(0);
