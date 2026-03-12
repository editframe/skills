import { TraceExporter } from "@google-cloud/opentelemetry-cloud-trace-exporter";
import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";

import { Resource } from "@opentelemetry/resources";
import {
  ConsoleMetricExporter,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";

import { pinoInstrumentation } from "@/logging";
import { pgInstrumentation } from "@/sql-client.server/instrumentation";

interface InitializeInstrumentationOptions {
  serviceName: string;
}

export const initializeInstrumentation = ({
  serviceName,
}: InitializeInstrumentationOptions) => {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  const exportToGoogleCloud = process.env.GCLOUD_TRACE_EXPORT === "true";
  const otelEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://tracing:4318";

  const traceExporter = exportToGoogleCloud
    ? new TraceExporter()
    : new OTLPTraceExporter({
        url: `${otelEndpoint}/v1/traces`,
      });

  const logExporter = exportToGoogleCloud
    ? undefined
    : new OTLPLogExporter({
        url: `${otelEndpoint}/v1/logs`,
      });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      "host.name": process.env.HOSTNAME ?? "unknown",
      "cloud.run.revision": process.env.K_REVISION ?? "unknown",
    }),

    metricReader: new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),
    }),

    instrumentations: [pgInstrumentation, pinoInstrumentation],

    traceExporter,
    logExporter,
  });

  sdk.start();
};
