import electron from "electron";
import "./init-electron.js";
import "./instrumentation.mjs";

import opentelemetry, {
  SpanStatusCode,
  trace,
  context,
  propagation,
} from "@opentelemetry/api";
import { createServer } from "rolldown-vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { viteAliases } from "../util/viteAliases.js";

const tracer = opentelemetry.trace.getTracer("electron-bootloader");
const execPath = process.argv[3];

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

        // Create Vite dev server in middleware mode (no HTTP listener needed)
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

        // Load the script module via SSR (keeps module runner alive)
        const imported = await server.ssrLoadModule(execPath);

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
