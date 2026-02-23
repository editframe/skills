import electron from "electron";

// Electron exports a string path to the electron executable in ESM modules
// But we need access to the real electron to spawn offscreen windows.
// So, with regret, wet expose it on the global object.
global.electron = electron;

const electronApp = electron.app;
// electronApp.disableHardwareAcceleration();
// electronApp.disableDomainBlockingFor3DAPIs();

/** We don't want scrollbars to show up on top of rendered video */
electronApp.commandLine.appendSwitch("hide-scrollbars");
// electronApp.commandLine.appendSwitch("capture-page-surface-synchronize");
electronApp.commandLine.appendSwitch("no-sandbox");
electronApp.commandLine.appendSwitch("disable-dev-shm-usage");

// Additional synchronization flags to improve timing accuracy
electronApp.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
electronApp.commandLine.appendSwitch("disable-background-timer-throttling");
electronApp.commandLine.appendSwitch("disable-frame-rate-limit");
electronApp.commandLine.appendSwitch("disable-accelerated-video-decode");

if (process.env.EF_GPU_RENDER) {
  // On Cloud Run GPU instances (NVIDIA L4):
  // /dev/dri render nodes are absent, only /dev/nvidia0 + /dev/nvidiactl.
  // ANGLE's default backend tries X11 EGL and fails without a display.
  // The Vulkan backend handles headless/surfaceless natively via the
  // NVIDIA Vulkan ICD (libEGL_nvidia.so.0) which uses /dev/nvidia0 directly.
  // ozone-platform=headless is passed as a spawn arg in executeInElectron.ts.
  electronApp.commandLine.appendSwitch("use-angle", "vulkan");
  electronApp.commandLine.appendSwitch("enable-features", "Vulkan,CanvasDrawElement");
  electronApp.commandLine.appendSwitch("enable-gpu-rasterization");
  electronApp.commandLine.appendSwitch("enable-zero-copy");
  electronApp.commandLine.appendSwitch("ignore-gpu-blocklist");
  electronApp.commandLine.appendSwitch("disable-gpu-sandbox");
  electronApp.commandLine.appendSwitch("disable-vulkan-surface");
} else {
  // On CPU instances: software vsync is required with Xvfb.
  electronApp.commandLine.appendSwitch("disable-gpu-vsync");
  electronApp.commandLine.appendSwitch("disable-software-vsync");
  electronApp.commandLine.appendSwitch("use-angle", "default");
  electronApp.commandLine.appendSwitch("enable-features", "CanvasDrawElement");
}

electronApp.commandLine.appendSwitch("enable-accelerated-2d-canvas");

// Log GPU renderer string to confirm the active backend.
electronApp.whenReady().then(() => setTimeout(async () => {
  try {
    const info = await electronApp.getGPUInfo("complete");
    const glRenderer = info.auxAttributes?.glRenderer || "unknown";
    const glVendor = info.auxAttributes?.glVendor || "unknown";
    const gpuDevices = info.gpuDevice?.map(d => `${d.vendorId}:${d.deviceId} ${d.driverVersion}`) || [];
    process.stderr.write(`[electron-gpu] gl_renderer: ${glRenderer} / gl_vendor: ${glVendor} / devices: ${gpuDevices.join(", ")}\n`);
  } catch (err) {
    process.stderr.write(`[electron-gpu] getGPUInfo failed: ${err.message}\n`);
  }
}, 2000));

if (process.env.DEBUG_ELECTRON || process.env.EF_GPU_RENDER) {
  electronApp.commandLine.appendSwitch("enable-logging");
  electronApp.commandLine.appendSwitch("v", "1");
}

if (process.env.DEBUG_ELECTRON) {
  electronApp.commandLine.appendSwitch("enable-crash-reporter");
}
