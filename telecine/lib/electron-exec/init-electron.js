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
  // On GPU instances: Xvfb provides DISPLAY; EGL lets Chromium talk directly
  // to the NVIDIA driver without a full X11/GLX stack.
  // NVIDIA_DRIVER_CAPABILITIES=graphics causes the container toolkit to inject
  // libEGL_nvidia.so, which libegl1 (the Khronos loader) discovers automatically.
  // --ignore-gpu-blocklist overrides Chromium's cloud/headless GPU blocklist.
  // --disable-gpu-sandbox is required in containers — no kernel sandbox available.
  electronApp.commandLine.appendSwitch("use-gl", "egl");
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

// Log GPU info on ready to verify actual rasterization path
electronApp.whenReady().then(async () => {
  const info = await electronApp.getGPUInfo("complete");
  const gpuDevices = (info.gpuDevice || []).map(d => `${d.vendorId}:${d.deviceId} ${d.driverVersion || ""}`).join(", ");
  const status = electronApp.getGPUFeatureStatus();
  process.stderr.write(`[electron-gpu] devices: ${gpuDevices}\n`);
  process.stderr.write(`[electron-gpu] gpu_compositing: ${status.gpu_compositing}\n`);
  process.stderr.write(`[electron-gpu] rasterization: ${status.rasterization}\n`);
  process.stderr.write(`[electron-gpu] webgl: ${status.webgl}\n`);
});

if (process.env.DEBUG_ELECTRON) {
  electronApp.commandLine.appendSwitch("enable-crash-reporter");
  electronApp.commandLine.appendSwitch("enable-logging");
  electronApp.commandLine.appendSwitch("v", "0");
}
