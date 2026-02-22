import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { TraceExporter } from "@google-cloud/opentelemetry-cloud-trace-exporter";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import pino from "pino";

const logger = pino({ name: "telecine-electron" });

logger.debug("Loading Electron instrumentation (bootloader)...");

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const exportToGoogleCloud = process.env.GCLOUD_TRACE_EXPORT === "true";
const otelEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://tracing:4318";

class LoggingTraceExporter extends OTLPTraceExporter {
  constructor(config) {
    super(config);
    this._url = config.url;
  }

  async export(spans, resultCallback) {
    logger.debug(
      { spanCount: spans.length, url: this._url },
      "Exporting spans",
    );
    try {
      await super.export(spans, (result) => {
        if (result.code === 0) {
          logger.debug(
            { spanCount: spans.length },
            "Successfully exported spans",
          );
        } else {
          logger.error({ error: result.error }, "Export failed");
        }
        resultCallback(result);
      });
    } catch (error) {
      logger.error({ error }, "Export error");
      throw error;
    }
  }
}

const traceExporter = exportToGoogleCloud
  ? new TraceExporter()
  : new LoggingTraceExporter({
      url: `${otelEndpoint}/v1/traces`,
    });

const spanProcessor = new SimpleSpanProcessor(traceExporter);

const logExporter = exportToGoogleCloud
  ? undefined
  : new OTLPLogExporter({
      url: `${otelEndpoint}/v1/logs`,
    });

logger.debug(
  { otelEndpoint, exportToGoogleCloud },
  "Creating NodeSDK for Electron subprocess",
);

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: "telecine-electron",
    "host.name": process.env.HOSTNAME ?? "unknown",
    "cloud.run.revision": process.env.K_REVISION ?? "unknown",
  }),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
  }),

  instrumentations: [new PgInstrumentation(), new PinoInstrumentation()],

  spanProcessors: [spanProcessor],
  logExporter,
});

logger.debug("Starting NodeSDK...");
try {
  sdk.start();
  logger.info("NodeSDK started successfully");
} catch (error) {
  logger.error({ error }, "Failed to start NodeSDK");
}

let isShuttingDown = false;

export async function flushElectronTraces() {
  if (isShuttingDown) {
    logger.debug("Already shutting down, skipping flush");
    return;
  }
  isShuttingDown = true;

  logger.debug("Flushing spans before exit...");
  try {
    await sdk.shutdown();
    logger.info("SDK shutdown complete, exported all spans");
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
  }
}

global.flushElectronTraces = flushElectronTraces;

async function flushAndExit(code = 0) {
  await flushElectronTraces();
  process.exit(code);
}

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received");
  await flushAndExit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received");
  await flushAndExit(0);
});
