import electron from "electron";
import "./init-electron.js";
import "./instrumentation.mjs";

import { existsSync } from "node:fs";
import opentelemetry, {
  SpanStatusCode,
  trace,
  context,
  propagation,
} from "@opentelemetry/api";

const tracer = opentelemetry.trace.getTracer("electron-bootloader");
const execPath = process.env.EF_ELECTRON_SCRIPT ?? process.argv[3];

// Derive a pre-built bundle path: replace .ts extension with .electron.js
const prebuiltPath = execPath?.replace(/\.ts$/, ".electron.js");
const usePrebuilt = prebuiltPath && existsSync(prebuiltPath);

let parentContext = context.active();
if (process.env.OTEL_TRACE_CONTEXT) {
  try {
    const traceContext = JSON.parse(process.env.OTEL_TRACE_CONTEXT);
    parentContext = propagation.extract(context.active(), traceContext);
  } catch (error) {
    console.error("[BOOTLOADER] Failed to extract trace context:", error);
  }
}

const spawnTime = process.env.ELECTRON_SPAWN_TIME
  ? Number(process.env.ELECTRON_SPAWN_TIME)
  : Date.now();
const scriptStartTime = Date.now();

const processInitSpan = tracer.startSpan(
  "electron-process-init",
  {
    startTime: spawnTime,
  },
  parentContext,
);
processInitSpan.setAttributes({
  script: execPath,
  initDurationMs: scriptStartTime - spawnTime,
});
processInitSpan.end();

const startupSpan = tracer.startSpan(
  "electron-startup",
  undefined,
  parentContext,
);
const startupContext = trace.setSpan(parentContext, startupSpan);

electron.app.on("window-all-closed", () => {});

electron.app.on("ready", async () => {
  await context.with(startupContext, async () => {
    await tracer.startActiveSpan("executeScript", async (span) => {
      let exitCode = 0;
      let server;

      try {
        span.setAttribute("script.path", execPath);
        span.setAttribute("usePrebuilt", usePrebuilt ?? false);

        let imported;
        if (usePrebuilt) {
          process.stderr.write(`[BOOTLOADER] Loading pre-built bundle: ${prebuiltPath}\n`);
          imported = await import(prebuiltPath);
        } else {
          process.stderr.write(`[BOOTLOADER] No pre-built bundle found, starting Vite for: ${execPath}\n`);
          const { createServer } = await import("rolldown-vite");
          const { default: tsconfigPaths } = await import("vite-tsconfig-paths");
          const { viteAliases } = await import("../util/viteAliases.js");

          server = await createServer({
            root: "/app",
            plugins: [tsconfigPaths()],
            resolve: { alias: viteAliases },
            optimizeDeps: {
              exclude: ["@editframe/elements"],
            },
            server: {
              middlewareMode: true,
              hmr: false,
            },
          });

          imported = await server.ssrLoadModule(execPath);
        }

        // Wait for the RPC server to complete (keeps process alive for RPC calls)
        if (imported?.rpcServerReady) {
          await imported.rpcServerReady;
        } else {
          console.warn("[BOOTLOADER] No rpcServerReady export found");
        }
      } catch (error) {
        exitCode = 1;
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : "unknown error",
        });
        console.error("[BOOTLOADER] Error:", error);
      } finally {
        // Clean up
        if (server) {
          await server.close();
        }

        span.end();
        startupSpan.end();

        if (global.flushElectronTraces) {
          await global.flushElectronTraces();
        }

        electron.app.exit(exitCode);
      }
    });
  });
});
