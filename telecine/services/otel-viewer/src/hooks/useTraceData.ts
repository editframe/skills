import { useState, useEffect, useCallback, useMemo } from "react";

export interface SpanEvent {
  name: string;
  timeUnixNano: bigint;
  attributes: Array<{ key: string; value: any }>;
}

export interface Span {
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  name: string;
  startTime: bigint;
  endTime: bigint;
  duration: bigint;
  serviceName: string;
  attributes: Array<{ key: string; value: any }>;
  events: SpanEvent[];
  isError: boolean;
}

export interface LogRecord {
  timeUnixNano: bigint;
  severityText: string;
  severityNumber: number;
  body: string;
  attributes: Array<{ key: string; value: any }>;
  traceId?: string;
  spanId?: string;
}

export interface Trace {
  traceId: string;
  rootSpans: Span[];
  allSpans: Span[];
  logs: LogRecord[];
  minTime: bigint;
  maxTime: bigint;
  duration: bigint;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function useTraceData() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [spans, setSpans] = useState<Map<string, Span>>(new Map());
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [totalSpanCount, setTotalSpanCount] = useState(0);

  const processTraceEvent = useCallback((traceData: any) => {
    if (!traceData.resourceSpans) return;

    setSpans((prev) => {
      const newSpans = new Map(prev);
      let count = 0;

      for (const resourceSpan of traceData.resourceSpans) {
        const serviceName =
          resourceSpan.resource?.attributes?.find(
            (a: any) => a.key === "service.name",
          )?.value?.stringValue || "unknown";

        for (const scopeSpan of resourceSpan.scopeSpans || []) {
          for (const span of scopeSpan.spans || []) {
            const spanId = span.spanId;
            const traceId = span.traceId;
            const parentSpanId = span.parentSpanId || null;
            const name = span.name;
            const startTime = BigInt(span.startTimeUnixNano || 0);
            const endTime = BigInt(span.endTimeUnixNano || 0);
            const duration = endTime - startTime;
            const isError = span.status?.code === 2;

            const events: SpanEvent[] = (span.events || []).map((evt: any) => ({
              name: evt.name,
              timeUnixNano: BigInt(evt.timeUnixNano || 0),
              attributes: evt.attributes || [],
            }));

            newSpans.set(spanId, {
              spanId,
              traceId,
              parentSpanId,
              name,
              startTime,
              endTime,
              duration,
              serviceName,
              attributes: span.attributes || [],
              events,
              isError,
            });
            count++;
          }
        }
      }

      setTotalSpanCount((prev) => prev + count);
      return newSpans;
    });
  }, []);

  const processLogEvent = useCallback((logData: any) => {
    if (!logData.resourceLogs) return;

    setLogs((prev) => {
      const newLogs: LogRecord[] = [];
      const existingKeys = new Set(
        prev.map(
          (log) =>
            `${log.timeUnixNano}-${log.traceId}-${log.spanId}-${log.body}`,
        ),
      );

      for (const resourceLog of logData.resourceLogs) {
        for (const scopeLog of resourceLog.scopeLogs || []) {
          for (const logRecord of scopeLog.logRecords || []) {
            const body =
              logRecord.body?.stringValue ||
              logRecord.body?.value?.stringValue ||
              "";
            const timeUnixNano = BigInt(logRecord.timeUnixNano || 0);
            const severityText = logRecord.severityText || "UNSPECIFIED";
            const severityNumber = logRecord.severityNumber || 0;
            const attributes = logRecord.attributes || [];

            const traceId = logRecord.traceId || undefined;
            const spanId = logRecord.spanId || undefined;

            const logKey = `${timeUnixNano}-${traceId}-${spanId}-${body}`;

            if (!existingKeys.has(logKey)) {
              newLogs.push({
                timeUnixNano,
                severityText,
                severityNumber,
                body,
                attributes,
                traceId,
                spanId,
              });
              existingKeys.add(logKey);
            }
          }
        }
      }

      return [...prev, ...newLogs];
    });
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:4319/events");

    eventSource.onopen = () => {
      setStatus("connected");
    };

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === "trace") {
        processTraceEvent(parsed.data);
      } else if (parsed.type === "log") {
        processLogEvent(parsed.data);
      }
    };

    eventSource.onerror = () => {
      setStatus("disconnected");
      eventSource.close();
      setTimeout(() => {
        setStatus("connecting");
      }, 3000);
    };

    return () => {
      eventSource.close();
    };
  }, [processTraceEvent, processLogEvent]);

  const traces = useMemo(() => buildTraceTree(spans, logs), [spans, logs]);

  const clearData = useCallback(() => {
    setSpans(new Map());
    setLogs([]);
    setTotalSpanCount(0);
  }, []);

  return {
    status,
    spans,
    totalSpanCount,
    traces,
    clearData,
  };
}

function buildTraceTree(spans: Map<string, Span>, logs: LogRecord[]): Trace[] {
  const traces = new Map<string, Trace>();

  for (const span of spans.values()) {
    if (!traces.has(span.traceId)) {
      traces.set(span.traceId, {
        traceId: span.traceId,
        allSpans: [],
        rootSpans: [],
        logs: [],
        minTime: span.startTime,
        maxTime: span.endTime,
        duration: 0n,
      });
    }
    const trace = traces.get(span.traceId)!;
    trace.allSpans.push(span);
    if (span.startTime < trace.minTime) trace.minTime = span.startTime;
    if (span.endTime > trace.maxTime) trace.maxTime = span.endTime;
  }

  for (const log of logs) {
    if (log.traceId && traces.has(log.traceId)) {
      traces.get(log.traceId)!.logs.push(log);
    }
  }

  const result: Trace[] = [];
  for (const [traceId, trace] of traces.entries()) {
    const rootSpans = trace.allSpans.filter(
      (s) => !s.parentSpanId || !spans.has(s.parentSpanId),
    );
    result.push({
      traceId,
      rootSpans,
      allSpans: trace.allSpans,
      logs: trace.logs.sort((a, b) => Number(a.timeUnixNano - b.timeUnixNano)),
      minTime: trace.minTime,
      maxTime: trace.maxTime,
      duration: trace.maxTime - trace.minTime,
    });
  }

  return result.sort((a, b) => Number(b.minTime - a.minTime));
}
