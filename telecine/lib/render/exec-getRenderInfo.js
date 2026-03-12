const now = performance.now();

import electron from "electron";

// tsconfigPaths are not available in this file.
import "/app/lib/util/init-electron.js";
import { logger } from "/app/lib/logging";

import { createServer, createViteRuntime } from "vite";

const execRenderPath = "/app/lib/render/engines/ElectronEngine/exec-render.ts";

const electronApp = electron.app;

electronApp.on("ready", async () => {
  logger.info(`Electron is ready ${performance.now() - now}ms`);

  const server = await createServer({
    root: "/app",
    resolve: { tsconfigPaths: true },
  });

  const runtime = await createViteRuntime(server);

  try {
    logger.info("Executing exec-render.ts");
    await runtime.executeEntrypoint(execRenderPath);
    logger.info("Executed exec-render.ts");
  } catch (error) {
    logger.error("Error in exec-render.ts", error);
  }
});
