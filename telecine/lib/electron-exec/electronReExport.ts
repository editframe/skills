import type { App } from "electron";

console.log("[ELECTRON_REEXPORT] Loading electronReExport...");
console.log(
  "[ELECTRON_REEXPORT] global.electron available?",
  typeof (global as any).electron,
);

if (typeof (global as any).electron === "undefined") {
  console.error("❌ [ELECTRON_REEXPORT] global.electron is not defined!");
  throw new Error(
    "global.electron is not defined - init-electron.js may not have loaded correctly",
  );
}

// @ts-expect-error we are re-exporting to get around TS errors
export const electronApp = (global as any).electron.app as App;

// @ts-expect-error this was set on global in `server.js` due to cjs/esm issues
export const protocol = (global as any).electron
  .protocol as typeof import("electron").protocol;

// @ts-expect-error we are re-exporting to get around TS errors
export const session = (global as any).electron
  .session as typeof import("electron").session;

export const BrowserWindow =
  // @ts-expect-error this was set on global in `server.js` due to cjs/esm issues
  (global as any).electron
    .BrowserWindow as typeof import("electron").BrowserWindow;

// @ts-expect-error this was set on global in `server.js` due to cjs/esm issues
export const ipcMain = (global as any).electron
  .ipcMain as typeof import("electron").ipcMain;

export const webContents =
  // @ts-expect-error electron was set on globel in server.js due to cjs/esm issues
  (global as any).electron.webContents as typeof import("electron").webContents;

console.log("[ELECTRON_REEXPORT] All electron APIs exported successfully");
