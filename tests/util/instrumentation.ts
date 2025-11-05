import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NDJSONFileExporter } from "@/tracing/NDJSONFileExporter";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const traceFilePath = process.env.TRACE_FILE_PATH;
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
const isCloudRun = process.env.K_SERVICE !== undefined;

const spanProcessor = traceFilePath
  ? new SimpleSpanProcessor(new NDJSONFileExporter(traceFilePath, isCloudRun))
  : new SimpleSpanProcessor(new OTLPTraceExporter({ url: `${otelEndpoint}/v1/traces` }));

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: "telecine-test",
  }),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
  }),

  instrumentations: [
    new PgInstrumentation(),
    new PinoInstrumentation(),
  ],

  spanProcessors: [spanProcessor],
});

sdk.start();

process.on("SIGTERM", async () => {
  await sdk.shutdown();
});

process.on("beforeExit", async () => {
  await sdk.shutdown();
});
