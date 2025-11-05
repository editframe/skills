import { Resource } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { BridgeSpanExporter } from "./BridgeSpanExporter.js";

let isInitialized = false;
let provider: WebTracerProvider | null = null;

interface BridgeWithSpanExport {
  exportSpans?: (endpoint: string, payload: string) => void;
}

export interface BrowserTracingConfig {
  otelEndpoint: string;
  serviceName?: string;
  bridge?: BridgeWithSpanExport;
  useBatching?: boolean;
}

export async function setupBrowserTracing(
  config: BrowserTracingConfig,
): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    if (!config.bridge) {
      throw new Error("Bridge is required for browser tracing");
    }

    const exporter = new BridgeSpanExporter(config.bridge, config.otelEndpoint);

    let spanProcessor: BatchSpanProcessor | SimpleSpanProcessor;
    if (config.useBatching) {
      spanProcessor = new BatchSpanProcessor(exporter, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 500,
      });
    } else {
      spanProcessor = new SimpleSpanProcessor(exporter);
    }

    provider = new WebTracerProvider({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: config.serviceName || "telecine-browser",
      }),
      spanProcessors: [spanProcessor],
    });

    // Dynamically import ZoneContextManager only when tracing is enabled
    // This prevents zone.js from being loaded for users who don't need tracing
    const { ZoneContextManager } = await import("@opentelemetry/context-zone");

    provider.register({
      contextManager: new ZoneContextManager(),
    });

    isInitialized = true;
  } catch (error) {
    console.error("Failed to initialize browser tracing:", error);
    throw error;
  }
}

export function isBrowserTracingInitialized(): boolean {
  return isInitialized;
}
