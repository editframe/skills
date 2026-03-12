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
  // GPU flags that only affect the browser process (not forwarded to GPU subprocess).
  // Critical GPU flags like --use-angle are passed as CLI args in executeInElectron.ts
  // so they propagate to the GPU subprocess via Chromium's command-line copying.
  electronApp.commandLine.appendSwitch(
    "enable-features",
    "Vulkan,CanvasDrawElement",
  );
}

electronApp.commandLine.appendSwitch("enable-accelerated-2d-canvas");

// Log GPU renderer string to confirm the active backend.
electronApp.whenReady().then(() =>
  setTimeout(async () => {
    try {
      const info = await electronApp.getGPUInfo("complete");
      process.stderr.write(
        `[electron-gpu] FULL_GPU_INFO: ${JSON.stringify(info)}\n`,
      );
    } catch (err) {
      process.stderr.write(
        `[electron-gpu] getGPUInfo failed: ${err.message}\n`,
      );
    }
  }, 2000),
);

electronApp.on("gpu-info-update", () => {
  process.stderr.write(`[electron-gpu] gpu-info-update event fired\n`);
});

electronApp.on("child-process-gone", (event, details) => {
  process.stderr.write(
    `[electron-gpu] child-process-gone: type=${details.type} reason=${details.reason} exitCode=${details.exitCode} name=${details.name}\n`,
  );
});

if (process.env.DEBUG_ELECTRON || process.env.EF_GPU_RENDER) {
  electronApp.commandLine.appendSwitch("enable-logging");
  electronApp.commandLine.appendSwitch("v", "1");
  electronApp.commandLine.appendSwitch(
    "vmodule",
    "gpu_init=3,angle*=3,vulkan*=3,gpu_service*=3,command_buffer*=2,viz_main*=2,gpu_channel*=2,in_process_gpu*=3,gpu_process*=3,gpu_info*=3,gl_surface*=3,egl*=3,display*=3",
  );
}

if (process.env.DEBUG_ELECTRON) {
  electronApp.commandLine.appendSwitch("enable-crash-reporter");
}
