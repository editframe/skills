import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unlink } from "node:fs/promises";
import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";
import { context, propagation } from "@opentelemetry/api";

const tracer = opentelemetry.trace.getTracer("electron-exec");

import { createRpcClient } from "./RPC";
import { promiseWithResolvers } from "@/util/promiseWithResolvers";
import { raceTimeout } from "@/util/raceTimeout";
import { logger } from "@/logging";
import { hasGpu } from "@/util/gpuDetect";

const XVFB_DISPLAY = ":99";
let xvfbProcess: ChildProcess | null = null;

const ensureXvfb = async () => {
  if (xvfbProcess) return xvfbProcess;

  const span = tracer.startSpan("ensureXvfb");
  xvfbProcess = spawn(
    "Xvfb",
    [
      XVFB_DISPLAY,
      "-screen",
      "0",
      "1920x1080x24",
      "-nolisten",
      "tcp",
      "-dpi",
      "96",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  await new Promise<void>((resolve, reject) => {
    xvfbProcess!.on("spawn", () => {
      span.setStatus({ code: SpanStatusCode.OK });
      resolve();
    });
    xvfbProcess!.on("error", (error) => {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error);
      reject(error);
    });
  });

  return xvfbProcess;
};

const makeSocketPath = () => {
  const randomId = Math.random().toString(36).substring(7);
  return join(tmpdir(), `electron-rpc-${process.pid}-${randomId}.sock`);
};

export const executeInElectronWithRpc = async (script: string) => {
  const { electronProcess, processExit, socketPath } =
    await spawnElectronBootloader(script);
  const rpcReady = promiseWithResolvers<void>();
  const rpcReadySpan = tracer.startSpan("rpcReady");
  let stderrBuffer = "";

  const readyReader = (data: Buffer) => {
    const output = data.toString();
    stderrBuffer += output;

    logger.debug({ pid: electronProcess.pid, output }, "Electron stderr");

    if (stderrBuffer.includes("EF_RPC_READY")) {
      rpcReady.resolve();
      rpcReadySpan.setStatus({ code: SpanStatusCode.OK });
      rpcReadySpan.end();
      electronProcess.stderr.off("data", readyReader);
    }
  };

  electronProcess.stderr.on("data", readyReader);

  try {
    await raceTimeout(
      30_000,
      `RPC server in electron process PID ${electronProcess.pid} not ready within 30 seconds`,
      rpcReady.promise,
    );
  } catch (error) {
    logger.error(
      { pid: electronProcess.pid, stderr: stderrBuffer },
      "Electron stderr during timeout",
    );
    rpcReadySpan.setStatus({ code: SpanStatusCode.ERROR });
    rpcReadySpan.recordException(
      error instanceof Error ? error : new Error(String(error)),
    );
    rpcReadySpan.end();
    throw error;
  }

  processExit.finally(async () => {
    unlink(socketPath).catch((error) => {
      logger.warn({ socketPath, error }, "Failed to delete socket file");
    });
  });

  const rpc = createRpcClient(socketPath, {
    timeoutMs: 5_000,
    onKeepalive: (requestId) => {
      logger.debug({ requestId }, "RPC keepalive received");
    },
  });

  return {
    processExit,
    rpc,
  };
};

const spawnElectronBootloader = async (script: string) => {
  return await tracer.startActiveSpan(
    "spawnElectronBootloader",
    async (span) => {
      try {
        const gpuMode = hasGpu();
        if (!gpuMode) {
          await ensureXvfb();
        }
        const socketPath = makeSocketPath();

        const traceContext: Record<string, unknown> = {};
        propagation.inject(context.active(), traceContext);

        const spawnTime = Date.now();

        const gpuSpawnArgs = gpuMode
          ? [
              "--ozone-platform=headless",
              "--disable-vulkan-surface",
              "--enable-logging=stderr",
              "--disable-setuid-sandbox",
              "--disable-seccomp-filter-sandbox",
            ]
          : [];

        const electronProcess = spawn(
          "node_modules/.bin/electron",
          [
            "--no-sandbox",
            ...gpuSpawnArgs,
            "/app/lib/electron-exec/executeInElectron.bootloader.js",
          ],
          {
            stdio: ["ignore", "pipe", "pipe"],
            env: {
              ...process.env,
              ...(gpuMode
                // No DISPLAY in GPU mode: ozone-platform=headless bypasses X11.
                // EGL_PLATFORM=surfaceless prevents EGL from trying X11/Wayland.
                // VK_ICD_FILENAMES restricts the Vulkan loader to ONLY the NVIDIA ICD.
                // LD_PRELOAD: fake_sysfs_access.so intercepts access("/sys/bus/pci/")
                // so ANGLE's libpci loader proceeds to dlopen our fake libpci.so.3.
                ? {
                    EF_GPU_RENDER: "1",
                    EGL_PLATFORM: "surfaceless",
                    __GLX_VENDOR_LIBRARY_NAME: "nvidia",
                    LIBGL_ALWAYS_SOFTWARE: "0",
                    VK_ICD_FILENAMES: "/etc/vulkan/icd.d/nvidia_icd.json",
                    VK_LAYER_PATH: "/etc/vulkan/implicit_layer.d",
                    VK_LOADER_DEBUG: "error",
                    LD_PRELOAD: "/usr/lib/x86_64-linux-gnu/fake_sysfs_access.so",
                  }
                : { DISPLAY: XVFB_DISPLAY }),
              EF_ELECTRON_SCRIPT: script,
              EF_SOCKET_PATH: socketPath,
              OTEL_EXPORTER_OTLP_ENDPOINT:
                process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
                "http://tracing:4318",
              OTEL_SERVICE_NAME: "telecine-electron",
              OTEL_TRACE_CONTEXT: JSON.stringify(traceContext),
              ELECTRON_SPAWN_TIME: String(spawnTime),
              // Ensure FFmpeg libraries are found by native module
              LD_LIBRARY_PATH: `/usr/local/lib:${process.env.LD_LIBRARY_PATH || ""}`,
              // NOTE: LD_PRELOAD was removed because it causes Chromium's WebCodecs
              // VideoDecoder to crash with SIGABRT when decoding H.264 video.
              // The FFmpeg libraries being preloaded interfere with Chromium's
              // internal video decoding. Native FFmpeg functionality may need
              // an alternative approach if required.
              // LD_PRELOAD: `/usr/local/lib/libavcodec.so.61:/usr/local/lib/libavformat.so.61:/usr/local/lib/libavutil.so.59:/usr/local/lib/libavfilter.so.10:/usr/local/lib/libswscale.so.8`,
            },
          },
        );

        electronProcess.stdout.on("data", (data) => {
          const dataString = data.toString();
          const lines = dataString.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              const { msg, level, time, pid, hostname, name, ...rest } = parsed;
              logger.debug({ electronLog: rest }, msg ?? "Electron stdout");
            } catch {
              logger.debug({ electronLog: line }, "Electron stdout");
            }
          }
        });

        electronProcess.stderr.on("data", (data) => {
          const str = data.toString();
          if (str.includes("Failed to connect to the bus:")) return;
          if (str.includes("org.freedesktop.DBus.NameHasOwner")) return;
          process.stdout.write(`[electron-stderr] ${str}`);
          logger.info({ data: str }, "Electron stderr");
        });

        const processExit = new Promise((resolve, reject) => {
          electronProcess.on("close", (code) => {
            if (code !== null) {
              span.setAttributes({ code });
            }
            logger.debug({ code }, "Electron process closed");
            if (code !== 0) {
              span.setStatus({ code: SpanStatusCode.ERROR });
              const error = new Error(
                `Electron process exited with code ${code}`,
              );
              span.recordException(error);
              reject(error);
            } else {
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              resolve(code);
            }
          });

          electronProcess.on("error", (error) => {
            span.setStatus({ code: SpanStatusCode.ERROR });
            span.recordException(error);
            span.end();
            reject(error);
          });
        });

        await new Promise((resolve, reject) => {
          electronProcess.on("spawn", resolve);
          electronProcess.on("error", reject);
        });

        logger.debug("Electron process spawned");

        return {
          electronProcess,
          processExit,
          socketPath,
        };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : "unknown error",
        });
        throw error;
      }
    },
  );
};

export const executeInElectron = async (script: string) => {
  const { processExit } = await spawnElectronBootloader(script);
  return { processExit };
};
