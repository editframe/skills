import { useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Trace, Span } from "../hooks/useTraceData";
import { formatDuration } from "../utils/format";

interface FlameChartProps {
  trace: Trace | undefined;
  onSelectSpan: (spanId: string) => void;
  zoomStart: number;
  zoomEnd: number;
  onZoomChange: (start: number, end: number) => void;
  hoveredLogIndex: number | null;
  onLogHover: (index: number | null) => void;
  isLiveMode?: boolean;
  spanFilters: Map<string, 'show' | 'hide'>;
  spanFiltersActive: boolean;
}

interface FlatSpan extends Span {
  level: number;
}

function flattenSpans(rootSpans: Span[], allSpans: Span[]): FlatSpan[] {
  const result: FlatSpan[] = [];

  const processSpan = (span: Span, level: number) => {
    result.push({ ...span, level });
    const children = allSpans
      .filter((s) => s.parentSpanId === span.spanId)
      .sort((a, b) => Number(a.startTime - b.startTime));
    children.forEach((child) => processSpan(child, level + 1));
  };

  rootSpans.forEach((root) => processSpan(root, 0));
  return result;
}

function renderTimeline(traceDuration: bigint, zoomStart: number, zoomEnd: number) {
  const totalDurationMs = Number(traceDuration) / 1_000_000;
  const visibleDurationMs = totalDurationMs * (zoomEnd - zoomStart) / 100;
  const offsetMs = totalDurationMs * (zoomStart / 100);

  const ticks = [];

  const targetTickCount = 8;
  const rawInterval = visibleDurationMs / targetTickCount;

  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
  const normalized = rawInterval / magnitude;

  let tickInterval: number;
  if (normalized <= 1) {
    tickInterval = magnitude;
  } else if (normalized <= 2) {
    tickInterval = 2 * magnitude;
  } else if (normalized <= 5) {
    tickInterval = 5 * magnitude;
  } else {
    tickInterval = 10 * magnitude;
  }

  const startTick = Math.floor(offsetMs / tickInterval) * tickInterval;

  for (let t = startTick; t <= offsetMs + visibleDurationMs; t += tickInterval) {
    if (t < offsetMs) continue;
    const percent = ((t - offsetMs) / visibleDurationMs) * 100;
    ticks.push(
      <div
        key={t}
        className="timeline-tick"
        style={{ left: `${percent}%` }}
      >
        {Math.round(t)}ms
      </div>
    );
  }

  return <div className="timeline-header">{ticks}</div>;
}

export function FlameChart({
  trace,
  onSelectSpan,
  zoomStart,
  zoomEnd,
  onZoomChange,
  hoveredLogIndex,
  onLogHover,
  isLiveMode,
  spanFilters,
  spanFiltersActive
}: FlameChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentZoomRef = useRef({ start: zoomStart, end: zoomEnd });

  currentZoomRef.current = { start: zoomStart, end: zoomEnd };

  const logIndexMap = useMemo(() => {
    if (!trace?.logs) return new Map<any, number>();
    const map = new Map<any, number>();
    trace.logs.forEach((log, i) => {
      map.set(log, i);
    });
    return map;
  }, [trace?.logs]);

  const timeline = useMemo(() => {
    if (!trace) return null;
    return renderTimeline(trace.duration, zoomStart, zoomEnd);
  }, [trace, zoomStart, zoomEnd]);

  const flatSpans = useMemo(() => {
    if (!trace) return [];
    return flattenSpans(trace.rootSpans, trace.allSpans);
  }, [trace]);

  const filteredSpans = useMemo(() => {
    if (!spanFiltersActive || spanFilters.size === 0) return flatSpans;

    const hasShowFilters = Array.from(spanFilters.values()).some(mode => mode === 'show');

    return flatSpans.filter(span => {
      const filterMode = spanFilters.get(span.name);

      if (filterMode === 'hide') {
        return false;
      }

      if (hasShowFilters) {
        return filterMode === 'show';
      }

      return true;
    });
  }, [flatSpans, spanFilters, spanFiltersActive]);

  const visibleSpans = useMemo(() => {
    if (!trace) return filteredSpans;

    return filteredSpans.filter(span => {
      const spanStart = (Number(span.startTime - trace.minTime) / Number(trace.duration)) * 100;
      const spanEnd = spanStart + (Number(span.duration) / Number(trace.duration)) * 100;

      return !(spanEnd < zoomStart || spanStart > zoomEnd);
    });
  }, [filteredSpans, trace, zoomStart, zoomEnd]);

  const ROW_HEIGHT = 19;

  const virtualizer = useVirtualizer({
    count: visibleSpans.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  useEffect(() => {
    if (!isLiveMode || !containerRef.current) return;

    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [trace?.allSpans.length, isLiveMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: globalThis.WheelEvent) => {
      if (!trace) return;

      if (e.ctrlKey || e.metaKey || e.deltaX !== 0) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.ctrlKey || e.metaKey) {
        const rect = container.getBoundingClientRect();
        const { start: currStart, end: currEnd } = currentZoomRef.current;

        const mouseX = e.clientX - rect.left - 200;
        const containerWidth = rect.width - 200;
        const mousePercent = (mouseX / containerWidth) * 100;
        const mousePositionInZoom = currStart + (mousePercent * (currEnd - currStart) / 100);

        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        const currentWidth = currEnd - currStart;
        const newWidth = Math.min(100, Math.max(0.5, currentWidth * zoomFactor));

        if (Math.abs(newWidth - currentWidth) < 0.01) {
          return;
        }

        const leftRatio = (mousePositionInZoom - currStart) / currentWidth;
        const rightRatio = (currEnd - mousePositionInZoom) / currentWidth;

        let newStart = mousePositionInZoom - (newWidth * leftRatio);
        let newEnd = mousePositionInZoom + (newWidth * rightRatio);

        if (newStart < 0) {
          newEnd = newEnd - newStart;
          newStart = 0;
        }
        if (newEnd > 100) {
          newStart = newStart - (newEnd - 100);
          newEnd = 100;
        }

        newStart = Math.max(0, newStart);
        newEnd = Math.min(100, newEnd);
        currentZoomRef.current = { start: newStart, end: newEnd };
        onZoomChange(newStart, newEnd);
        return;
      }

      const isVerticalScroll = !e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaX === 0;

      if (isVerticalScroll) {
        return;
      }

      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const { start: currStart, end: currEnd } = currentZoomRef.current;
        const currentWidth = currEnd - currStart;
        const delta = e.shiftKey ? e.deltaY : e.deltaX;
        const panAmount = (delta / 10) * (currentWidth / 100);

        let newStart = currStart + panAmount;
        let newEnd = currEnd + panAmount;

        if (newStart < 0) {
          newStart = 0;
          newEnd = currentWidth;
        } else if (newEnd > 100) {
          newEnd = 100;
          newStart = 100 - currentWidth;
        }

        currentZoomRef.current = { start: newStart, end: newEnd };
        onZoomChange(newStart, newEnd);
      }
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, [trace, onZoomChange]);


  if (!trace) {
    return (
      <div className="flame-chart">
        <div className="no-data">Select a trace</div>
      </div>
    );
  }

  const logsInTrace = trace.logs || [];

  return (
    <div className="flame-chart" ref={containerRef}>
      {timeline}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const span = visibleSpans[virtualItem.index];
          if (!span) return null;

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SpanRow
                span={span}
                trace={trace}
                zoomStart={zoomStart}
                zoomEnd={zoomEnd}
                onSelectSpan={onSelectSpan}
                logsInTrace={logsInTrace}
                logIndexMap={logIndexMap}
                hoveredLogIndex={hoveredLogIndex}
                onLogHover={onLogHover}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SpanRowProps {
  span: FlatSpan;
  trace: Trace;
  zoomStart: number;
  zoomEnd: number;
  onSelectSpan: (spanId: string) => void;
  logsInTrace: any[];
  logIndexMap: Map<any, number>;
  hoveredLogIndex: number | null;
  onLogHover: (index: number | null) => void;
}

function SpanRow({
  span,
  trace,
  zoomStart,
  zoomEnd,
  onSelectSpan,
  logsInTrace,
  logIndexMap,
  hoveredLogIndex,
  onLogHover
}: SpanRowProps) {
  const spanStart = (Number(span.startTime - trace.minTime) / Number(trace.duration)) * 100;
  const spanEnd = spanStart + (Number(span.duration) / Number(trace.duration)) * 100;

  const visibleStart = Math.max(spanStart, zoomStart);
  const visibleEnd = Math.min(spanEnd, zoomEnd);

  const relativeStart = ((visibleStart - zoomStart) / (zoomEnd - zoomStart)) * 100;
  const relativeWidth = ((visibleEnd - visibleStart) / (zoomEnd - zoomStart)) * 100;

  const levelClass = `level-${span.level % 6}`;
  const errorClass = span.isError ? " error" : "";
  const indentClass = `indent-${Math.min(span.level, 5)}`;

  const durationText = formatDuration(Number(span.duration));
  const minWidthForLabel = 3;
  const showLabelOutside = relativeWidth < minWidthForLabel;

  const spanLogs = useMemo(
    () => logsInTrace.filter(log => log.spanId === span.spanId),
    [logsInTrace, span.spanId]
  );

  return (
    <div
      className="span-row"
      onClick={() => onSelectSpan(span.spanId)}
    >
      <div className={`span-label ${indentClass}`} title={span.name}>
        {span.name}
      </div>
      <div className="span-chart">
        <div
          className={`span-bar ${levelClass}${errorClass}`}
          style={{ left: `${relativeStart}%`, width: `${relativeWidth}%` }}
          title={`${span.name} - ${durationText}`}
        >
          {!showLabelOutside && (
            <span className="span-text">
              {durationText}
            </span>
          )}
        </div>
        {showLabelOutside && (
          <span
            className="span-text-external"
            style={{ left: `calc(${relativeStart + relativeWidth}% + 2px)` }}
          >
            {durationText}
          </span>
        )}
        {spanLogs.map((log, logIdx) => {
          const logTime = (Number(log.timeUnixNano - trace.minTime) / Number(trace.duration)) * 100;

          if (logTime < zoomStart || logTime > zoomEnd) {
            return null;
          }

          const relativePosition = ((logTime - zoomStart) / (zoomEnd - zoomStart)) * 100;
          const severityClass = log.severityText.toLowerCase();
          const logIndex = logIndexMap.get(log) ?? -1;
          const isHovered = hoveredLogIndex === logIndex;

          return (
            <div
              key={logIdx}
              className={`span-log-marker log-${severityClass} ${isHovered ? 'hovered' : ''}`}
              style={{ left: `${relativePosition}%` }}
              title={`[${log.severityText}] ${log.body}`}
              onMouseEnter={() => onLogHover(logIndex)}
              onMouseLeave={() => onLogHover(null)}
            />
          );
        })}
      </div>
    </div>
  );
}
