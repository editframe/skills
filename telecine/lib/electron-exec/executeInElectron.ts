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
    timeoutMs: 30_000,
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
        await ensureXvfb();
        const socketPath = makeSocketPath();

        const traceContext: Record<string, unknown> = {};
        propagation.inject(context.active(), traceContext);

        const spawnTime = Date.now();

        const electronProcess = spawn(
          "node_modules/.bin/electron",
          [
            "--no-sandbox",
            "/app/lib/electron-exec/executeInElectron.bootloader.js",
            script,
          ],
          {
            stdio: ["ignore", "pipe", "pipe"],
            env: {
              ...process.env,
              DISPLAY: XVFB_DISPLAY,
              EF_SOCKET_PATH: socketPath,
              OTEL_EXPORTER_OTLP_ENDPOINT:
                process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
                "http://tracing:4318",
              OTEL_TRACE_CONTEXT: JSON.stringify(traceContext),
              ELECTRON_SPAWN_TIME: String(spawnTime),
            },
          },
        );

        electronProcess.stdout.on("data", (data) => {
          const dataString = data.toString();
          const lines = dataString.split("\n");
          for (const line of lines) {
            try {
              logger.debug(JSON.parse(line), "Electron stdout");
            } catch (error) {
              logger.debug(line);
            }
          }
        });

        electronProcess.stderr.on("data", (data) => {
          if (data.toString().includes("Failed to connect to the bus:")) {
            return;
          }

          if (data.toString().includes("org.freedesktop.DBus.NameHasOwner")) {
            return;
          }

          if (
            data
              .toString()
              .includes(
                "Exiting GPU process due to errors during initialization",
              )
          ) {
            return;
          }

          logger.debug({ data: data.toString() }, "Electron stderr");
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
