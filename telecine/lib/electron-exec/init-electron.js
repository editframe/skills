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
  // On GPU instances: no display server.
  // use-gl=egl: force Chromium to use the EGL path (not GLX). Required in
  //   Electron 32+; without it, Chromium selects GLX which routes through
  //   Xvfb/Mesa software GL even when NVIDIA EGL ICD is present.
  // use-angle=gles: ANGLE uses GLES2 via EGL — picks up NVIDIA's injected
  //   libEGL_nvidia.so via the GLVND dispatcher (libegl1).
  // ozone-platform=headless: no X11/Wayland display server needed.
  //   With DISPLAY unset, this prevents Chromium from trying to connect to X11.
  // ignore-gpu-blocklist: Cloud Run GPU nodes are on Chromium's headless blocklist.
  // disable-gpu-sandbox: required in containers (no kernel GPU sandbox).
  // ozone-platform=headless is passed as a spawn arg (not here) because
  // Ozone platform selection happens before the app is ready.
  electronApp.commandLine.appendSwitch("use-gl", "egl");
  electronApp.commandLine.appendSwitch("use-angle", "gles");
  electronApp.commandLine.appendSwitch("enable-gpu-rasterization");
  electronApp.commandLine.appendSwitch("enable-zero-copy");
  electronApp.commandLine.appendSwitch("ignore-gpu-blocklist");
  electronApp.commandLine.appendSwitch("disable-gpu-sandbox");
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

// Log GPU info after initialization to verify actual rasterization path.
// Delay 2s to allow the GPU process to fully initialize before querying.
electronApp.whenReady().then(() => setTimeout(async () => {
  const info = await electronApp.getGPUInfo("complete");
  const gpuDevices = (info.gpuDevice || []).map(d => `${d.vendorId}:${d.deviceId} driver=${d.driverVersion || "?"}`).join(", ");
  const status = electronApp.getGPUFeatureStatus();
  const glRenderer = info.auxAttributes?.glRenderer || "unknown";
  const glVendor = info.auxAttributes?.glVendor || "unknown";
  process.stderr.write(`[electron-gpu] devices: ${gpuDevices}\n`);
  process.stderr.write(`[electron-gpu] gl_renderer: ${glRenderer}\n`);
  process.stderr.write(`[electron-gpu] gl_vendor: ${glVendor}\n`);
  process.stderr.write(`[electron-gpu] gpu_compositing: ${status.gpu_compositing}\n`);
  process.stderr.write(`[electron-gpu] rasterization: ${status.rasterization}\n`);
  process.stderr.write(`[electron-gpu] webgl: ${status.webgl}\n`);
  // Log any feature status items that are "disabled" to understand why
  const disabled = Object.entries(status).filter(([, v]) => String(v).includes("disabled")).map(([k, v]) => `${k}:${v}`).join(", ");
  if (disabled) process.stderr.write(`[electron-gpu] disabled features: ${disabled}\n`);
}, 2000));

if (process.env.DEBUG_ELECTRON) {
  electronApp.commandLine.appendSwitch("enable-crash-reporter");
  electronApp.commandLine.appendSwitch("enable-logging");
  electronApp.commandLine.appendSwitch("v", "0");
}
