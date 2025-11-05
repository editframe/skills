import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

process.env.CHUNK_SIZE_BYTES = "20";

// Initialize OpenTelemetry for test runner
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: "telecine-test-runner",
  }),
  spanProcessors: [
    new SimpleSpanProcessor(
      new OTLPTraceExporter({
        url: `${otelEndpoint}/v1/traces`,
      })
    ),
  ],
});

sdk.start();

// Ensure SDK is shutdown on exit
process.on("SIGTERM", async () => {
  await sdk.shutdown();
});

process.on("beforeExit", async () => {
  await sdk.shutdown();
});
