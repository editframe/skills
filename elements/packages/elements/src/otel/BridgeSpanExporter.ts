import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

function toHex(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((b) => {
        const byte = typeof b === "number" ? b : 0;
        return byte.toString(16).padStart(2, "0");
      })
      .join("");
  }
  if (ArrayBuffer.isView(value)) {
    return Array.from(value as Uint8Array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return String(value);
}

interface OtlpAttributeValue {
  stringValue?: string;
  intValue?: number;
  doubleValue?: number;
  boolValue?: boolean;
  arrayValue?: { values: OtlpAttributeValue[] };
}

function convertAttribute(value: unknown): OtlpAttributeValue {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number")
    return Number.isInteger(value) ? { intValue: value } : { doubleValue: value };
  if (typeof value === "boolean") return { boolValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(convertAttribute) } };
  return { stringValue: String(value) };
}

interface BridgeWithSpanExport {
  exportSpans?: (endpoint: string, payload: string) => void;
}

export class BridgeSpanExporter implements SpanExporter {
  private bridge: BridgeWithSpanExport;
  private endpoint: string;

  constructor(bridge: BridgeWithSpanExport, endpoint: string) {
    this.bridge = bridge;
    this.endpoint = endpoint;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (!this.bridge?.exportSpans) {
      resultCallback({ code: ExportResultCode.FAILED });
      return;
    }

    try {
      const otlpPayload = {
        resourceSpans: [
          {
            resource: {
              attributes: Object.entries(spans[0]?.resource?.attributes || {}).map(
                ([key, value]) => ({
                  key,
                  value: convertAttribute(value),
                }),
              ),
            },
            scopeSpans: [
              {
                scope: {
                  name: "telecine-browser",
                  version: "1.0.0",
                },
                spans: spans.map((span) => {
                  const ctx = span.spanContext();
                  return {
                    traceId: toHex(ctx.traceId),
                    spanId: toHex(ctx.spanId),
                    parentSpanId: span.parentSpanId ? toHex(span.parentSpanId) : undefined,
                    name: span.name,
                    kind: span.kind,
                    startTimeUnixNano: String(
                      span.startTime[0] * 1_000_000_000 + span.startTime[1],
                    ),
                    endTimeUnixNano: String(span.endTime[0] * 1_000_000_000 + span.endTime[1]),
                    attributes: Object.entries(span.attributes).map(([key, value]) => ({
                      key,
                      value: convertAttribute(value),
                    })),
                    status: span.status,
                    events: span.events.map((event) => ({
                      timeUnixNano: String(event.time[0] * 1_000_000_000 + event.time[1]),
                      name: event.name,
                      attributes: Object.entries(event.attributes || {}).map(([key, value]) => ({
                        key,
                        value: convertAttribute(value),
                      })),
                    })),
                    links: span.links.map((link) => ({
                      traceId: toHex(link.context.traceId),
                      spanId: toHex(link.context.spanId),
                      attributes: Object.entries(link.attributes || {}).map(([key, value]) => ({
                        key,
                        value: convertAttribute(value),
                      })),
                    })),
                  };
                }),
              },
            ],
          },
        ],
      };

      const serializedPayload = JSON.stringify(otlpPayload);

      this.bridge.exportSpans(this.endpoint, serializedPayload);
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
