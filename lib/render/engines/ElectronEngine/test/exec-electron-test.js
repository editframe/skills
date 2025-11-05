const now = performance.now();

import electron from "electron";

import "../init-electron.js";

import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, createViteRuntime } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = fileURLToPath(dirname(import.meta.url));

const electronApp = electron.app;

electronApp.on("ready", async () => {
  console.log("Electron is ready", `${performance.now() - now}ms`);

  // Keep the main thread alive so the test runner can run on save
  // Otherwise, the test runner will exit when the last window is closed
  const _keepAlive = new electron.BrowserWindow({
    webPreferences: {
      offscreen: true,
    },
  });

  await _keepAlive.loadURL("about:blank?keepAlive=true");

  const server = await createServer({
    root: "/app",
    plugins: [tsconfigPaths()],
  });

  const runtime = await createViteRuntime(server);

  try {
    const execRenderPath = path.join(__dirname, "exec-electron-test.ts");
    console.log(`Running testsuite ${execRenderPath}`);
    await runtime.executeEntrypoint(execRenderPath);
  } catch (error) {
    console.log("Error running test suite", error);
  }
});
