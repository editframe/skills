/**
 * Electron-side probe script.
 *
 * Loaded inside the Electron process by gpu-probe/main.ts via executeInElectronWithRpc.
 * Opens an offscreen BrowserWindow, loads a solid red page, and captures a frame.
 * Returns the captured PNG byte length via the "captureFrame" RPC call so the
 * host process can verify that GPU-accelerated rendering produced real pixels.
 */
import electron from "electron";
import { registerRcpHandler, keepalive } from "./RPC";

const { BrowserWindow } = electron;

registerRcpHandler("captureFrame", async () => {
  const win = new BrowserWindow({
    width: 320,
    height: 240,
    show: false,
    webPreferences: {
      offscreen: true,
      sandbox: false,
      contextIsolation: true,
    },
  });

  // Subscribe to the paint event to start the offscreen rendering loop.
  // This is required with GPU-accelerated offscreen rendering — Chromium only
  // starts compositing frames once there is an active paint subscriber.
  const paintPromise = new Promise<void>((resolve) => {
    win.webContents.on("paint", () => resolve());
  });

  win.webContents.setFrameRate(60);
  await win.loadURL(
    "data:text/html,<body style='background:red;margin:0'></body>",
  );

  // Wait for at least one rendered frame before capturing.
  await paintPromise;

  const image = await win.webContents.capturePage();
  const png = image.toPNG();
  win.destroy();

  return {
    byteLength: png.byteLength,
    width: image.getSize().width,
    height: image.getSize().height,
  };
});

await keepalive.promise;
