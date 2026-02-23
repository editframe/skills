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

  await win.loadURL("data:text/html,<body style='background:red;margin:0'></body>");

  const image = await win.webContents.capturePage();
  const png = image.toPNG();
  win.destroy();

  return { byteLength: png.byteLength, width: image.getSize().width, height: image.getSize().height };
});

await keepalive.promise;
