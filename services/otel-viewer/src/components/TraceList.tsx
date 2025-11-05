import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { Trace } from "../hooks/useTraceData";
import { formatDuration } from "../utils/format";

interface TraceListProps {
  traces: Trace[];
  selectedTrace: string | null;
  onSelectTrace: (traceId: string) => void;
}

const ITEM_HEIGHT = 20;

export function TraceList({
  traces,
  selectedTrace,
  onSelectTrace,
}: TraceListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: traces.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
  });

  if (traces.length === 0) {
    return (
      <div className="trace-list">
        <div className="no-data" style={{ padding: 20 }}>
          No traces yet
        </div>
      </div>
    );
  }

  return (
    <div className="trace-list" ref={parentRef} style={{ overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const trace = traces[virtualItem.index];
          const selected = selectedTrace === trace.traceId;
          const rootSpan = trace.rootSpans[0];
          const rootName = rootSpan?.name || "Unknown";
          const serviceName = rootSpan?.serviceName || "unknown";
          const hasErrors = trace.allSpans.some((s) => s.isError);
          const timestamp = new Date(Number(trace.minTime / 1_000_000n)).toLocaleTimeString();

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={`trace-item${selected ? " selected" : ""}${hasErrors ? " has-error" : ""}`}
              onClick={() => onSelectTrace(trace.traceId)}
            >
              <span className="trace-name">{rootName}</span>
              {hasErrors && <span className="error-badge">ERR</span>}
              <span className="trace-meta">
                {serviceName} • {timestamp} • {trace.allSpans.length}sp • {formatDuration(Number(trace.duration))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
