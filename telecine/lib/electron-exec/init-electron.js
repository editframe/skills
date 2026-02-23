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
  // - /dev/dri render nodes are NOT provided — EGL hardware rasterization is
  //   not available. Chromium rasterization falls back to swiftshader (CPU).
  // - /dev/nvidia0 + /dev/nvidiactl ARE present — NVENC encoding via FFmpeg works.
  // - ozone-platform=headless (spawn arg) avoids requiring a display server.
  // - use-angle=swiftshader: explicit software rasterizer for offscreen frame capture.
  electronApp.commandLine.appendSwitch("use-angle", "swiftshader");
} else {
  // On CPU instances: software vsync is required with Xvfb.
  electronApp.commandLine.appendSwitch("disable-gpu-vsync");
  electronApp.commandLine.appendSwitch("disable-software-vsync");
  electronApp.commandLine.appendSwitch("use-angle", "default");
}

// Enable native canvas mode (drawElementImage API)
// Requires Chrome Canary or Chromium with experimental features enabled
// This provides ~1.76x faster rendering vs foreignObject serialization
electronApp.commandLine.appendSwitch("enable-features", "CanvasDrawElement");
electronApp.commandLine.appendSwitch("enable-accelerated-2d-canvas");

// Log GPU renderer string so we can confirm swiftshader is active.
electronApp.whenReady().then(() => setTimeout(async () => {
  const info = await electronApp.getGPUInfo("complete");
  const glRenderer = info.auxAttributes?.glRenderer || "unknown";
  const glVendor = info.auxAttributes?.glVendor || "unknown";
  process.stderr.write(`[electron-gpu] gl_renderer: ${glRenderer} / gl_vendor: ${glVendor}\n`);
}, 2000));

if (process.env.DEBUG_ELECTRON) {
  electronApp.commandLine.appendSwitch("enable-crash-reporter");
  electronApp.commandLine.appendSwitch("enable-logging");
  electronApp.commandLine.appendSwitch("v", "0");
}
