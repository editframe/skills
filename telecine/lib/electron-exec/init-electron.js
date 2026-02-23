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
  // On GPU instances: --ozone-platform=headless (spawn arg) avoids X11.
  // EGL_PLATFORM=device (env) routes ANGLE's EGL calls through the NVIDIA device
  // extension (EGL_EXT_platform_device) — surfaceless, no X display needed.
  // use-gl=angle is the only allowed impl on this Electron build; use-angle=gles
  // makes ANGLE use OpenGL ES via EGL, which EGL_PLATFORM=device redirects to NVIDIA.
  electronApp.commandLine.appendSwitch("use-gl", "angle");
  electronApp.commandLine.appendSwitch("use-angle", "gles");
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

// Curent debugging flags

if (process.env.DEBUG_ELECTRON) {
  electronApp.commandLine.appendSwitch("enable-crash-reporter");
  electronApp.commandLine.appendSwitch("enable-logging");
  electronApp.commandLine.appendSwitch("v", "0");
}
