import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { SpanExporter } from "@opentelemetry/sdk-trace-base";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";

export class NDJSONFileExporter implements SpanExporter {
  private filePath: string;
  private buffer: string[] = [];
  private flushPromise: Promise<void> | null = null;
  private alsoLogToStdout: boolean;

  constructor(filePath: string, alsoLogToStdout = false) {
    this.filePath = filePath;
    this.alsoLogToStdout = alsoLogToStdout;
  }

  async export(
    spans: ReadableSpan[],
    resultCallback: (result: any) => void
  ): Promise<void> {
    try {
      await mkdir(dirname(this.filePath), { recursive: true });

      for (const span of spans) {
        const spanData = {
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          parentSpanId: span.parentSpanId,
          name: span.name,
          kind: span.kind,
          startTime: span.startTime,
          endTime: span.endTime,
          attributes: span.attributes,
          status: span.status,
          events: span.events,
          links: span.links,
          resource: span.resource.attributes,
        };

        const line = JSON.stringify(spanData);
        this.buffer.push(line);

        if (this.alsoLogToStdout) {
          console.log(`TRACE_EXPORT:${line}`);
        }
      }

      await this.flush();

      resultCallback({ code: 0 });
    } catch (error) {
      console.error("Failed to export spans:", error);
      resultCallback({
        code: 1,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    if (this.flushPromise) {
      await this.flushPromise;
    }

    const lines = this.buffer.splice(0, this.buffer.length);
    const content = lines.join("\n") + "\n";

    this.flushPromise = appendFile(this.filePath, content, "utf8");
    await this.flushPromise;
    this.flushPromise = null;
  }

  async shutdown(): Promise<void> {
    await this.flush();
  }

  async forceFlush(): Promise<void> {
    await this.flush();
  }
}

