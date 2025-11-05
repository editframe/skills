import { useState, useRef, useEffect, MouseEvent, useMemo } from "react";
import type { Trace } from "../hooks/useTraceData";

interface MinimapProps {
  trace: Trace | undefined;
  zoomStart: number;
  zoomEnd: number;
  onZoomChange: (start: number, end: number) => void;
  hoveredLogIndex: number | null;
  onLogHover: (index: number | null) => void;
}

type DragMode = "none" | "selection" | "move" | "resize-start" | "resize-end";

export function Minimap({ trace, zoomStart, zoomEnd, onZoomChange, hoveredLogIndex, onLogHover }: MinimapProps) {
  const [dragMode, setDragMode] = useState<DragMode>("none");
  const [dragStartX, setDragStartX] = useState(0);
  const [initialZoomStart, setInitialZoomStart] = useState(0);
  const [initialZoomEnd, setInitialZoomEnd] = useState(100);
  const minimapRef = useRef<HTMLDivElement>(null);
  const currentZoomRef = useRef({ start: zoomStart, end: zoomEnd });

  currentZoomRef.current = { start: zoomStart, end: zoomEnd };

  useEffect(() => {
    const minimap = minimapRef.current;
    if (!minimap) return;

    const handleWheelNative = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        const rect = minimap.getBoundingClientRect();
        const { start: currStart, end: currEnd } = currentZoomRef.current;

        const mouseX = e.clientX - rect.left;
        const mousePercent = (mouseX / rect.width) * 100;

        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        const currentWidth = currEnd - currStart;
        const newWidth = Math.min(100, Math.max(0.5, currentWidth * zoomFactor));

        if (Math.abs(newWidth - currentWidth) < 0.01) {
          return;
        }

        const leftRatio = (mousePercent - currStart) / currentWidth;
        const rightRatio = (currEnd - mousePercent) / currentWidth;

        let newStart = mousePercent - (newWidth * leftRatio);
        let newEnd = mousePercent + (newWidth * rightRatio);

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
      } else {
        const { start: currStart, end: currEnd } = currentZoomRef.current;
        const currentWidth = currEnd - currStart;
        const delta = e.shiftKey ? e.deltaY : e.deltaX;
        const panAmount = (delta / 10);

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

    minimap.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
      minimap.removeEventListener('wheel', handleWheelNative);
    };
  }, [onZoomChange]);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;

    const handleSize = 8;
    const startPos = (zoomStart / 100) * rect.width;
    const endPos = (zoomEnd / 100) * rect.width;

    if (Math.abs(x - startPos) < handleSize) {
      setDragMode("resize-start");
    } else if (Math.abs(x - endPos) < handleSize) {
      setDragMode("resize-end");
    } else if (percent >= zoomStart && percent <= zoomEnd) {
      setDragMode("move");
    } else {
      setDragMode("selection");
      onZoomChange(percent, percent);
    }

    setDragStartX(percent);
    setInitialZoomStart(zoomStart);
    setInitialZoomEnd(zoomEnd);
  };

  useEffect(() => {
    if (dragMode === "none") return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!minimapRef.current) return;

      const rect = minimapRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));

      if (dragMode === "selection") {
        const start = Math.min(dragStartX, percent);
        const end = Math.max(dragStartX, percent);
        onZoomChange(start, end);
      } else if (dragMode === "move") {
        const delta = percent - dragStartX;
        const width = initialZoomEnd - initialZoomStart;
        let newStart = initialZoomStart + delta;
        let newEnd = initialZoomEnd + delta;

        if (newStart < 0) {
          newStart = 0;
          newEnd = width;
        } else if (newEnd > 100) {
          newEnd = 100;
          newStart = 100 - width;
        }

        onZoomChange(newStart, newEnd);
      } else if (dragMode === "resize-start") {
        const newStart = Math.min(percent, initialZoomEnd - 1);
        onZoomChange(Math.max(0, newStart), initialZoomEnd);
      } else if (dragMode === "resize-end") {
        const newEnd = Math.max(percent, initialZoomStart + 1);
        onZoomChange(initialZoomStart, Math.min(100, newEnd));
      }
    };

    const handleMouseUp = () => {
      setDragMode("none");
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragMode, dragStartX, initialZoomStart, initialZoomEnd, onZoomChange]);

  const rootSpans = useMemo(() => {
    if (!trace) return [];
    return trace.allSpans.filter(
      (s) => !s.parentSpanId || !trace.allSpans.find((p) => p.spanId === s.parentSpanId)
    );
  }, [trace]);

  const flattenSpans = useMemo(() => {
    if (!trace || rootSpans.length === 0) return [];

    const result: Array<{ span: typeof trace.allSpans[0]; level: number }> = [];

    const processSpan = (span: typeof trace.allSpans[0], level: number) => {
      result.push({ span, level });
      const children = trace.allSpans
        .filter((s) => s.parentSpanId === span.spanId)
        .sort((a, b) => Number(a.startTime - b.startTime));
      children.forEach((child) => processSpan(child, level + 1));
    };

    rootSpans
      .sort((a, b) => Number(a.startTime - b.startTime))
      .forEach((root) => processSpan(root, 0));

    return result;
  }, [trace, rootSpans]);

  const maxLevel = useMemo(() => {
    if (flattenSpans.length === 0) return 0;
    return Math.max(...flattenSpans.map((s) => s.level), 0);
  }, [flattenSpans]);

  const rowHeight = maxLevel > 0 ? 30 / (maxLevel + 1) : 30;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !trace) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const levelColors = [
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#f59e0b',
      '#10b981',
      '#06b6d4',
    ];
    const errorColor = '#ef4444';

    flattenSpans.forEach(({ span, level }) => {
      const relativeStart = (Number(span.startTime - trace.minTime) / Number(trace.duration));
      const relativeWidth = Math.max(0.0005, (Number(span.duration) / Number(trace.duration)));
      const topOffset = 10 + (level * rowHeight);
      const colorIndex = level % 6;

      ctx.fillStyle = span.isError ? errorColor : (levelColors[colorIndex] || levelColors[0]);
      ctx.fillRect(
        relativeStart * rect.width,
        topOffset,
        Math.max(1, relativeWidth * rect.width),
        Math.max(1, rowHeight - 0.5)
      );
    });
  }, [flattenSpans, trace, rowHeight]);

  if (!trace) {
    return null;
  }

  const selectionLeft = zoomStart;
  const selectionWidth = zoomEnd - zoomStart;
  const logsInTrace = trace.logs || [];

  return (
    <div className="minimap" ref={minimapRef} onMouseDown={handleMouseDown}>
      <div className="log-markers">
        {logsInTrace.map((log, i) => {
          const logTime = (Number(log.timeUnixNano - trace.minTime) / Number(trace.duration)) * 100;
          const severityClass = log.severityText.toLowerCase();
          const isHovered = hoveredLogIndex === i;

          return (
            <div
              key={i}
              className={`log-marker log-${severityClass} ${isHovered ? 'hovered' : ''}`}
              style={{ left: `${logTime}%` }}
              title={`[${log.severityText}] ${log.body}`}
              onMouseEnter={() => onLogHover(i)}
              onMouseLeave={() => onLogHover(null)}
            />
          );
        })}
      </div>
      <canvas ref={canvasRef} className="minimap-bars" style={{ width: '100%', height: '100%', position: 'absolute' }} />
      <div className="minimap-overlay-left" style={{ width: `${selectionLeft}%` }} />
      <div className="minimap-overlay-right" style={{ left: `${zoomEnd}%`, width: `${100 - zoomEnd}%` }} />
      <div
        className="minimap-selection"
        style={{
          left: `${selectionLeft}%`,
          width: `${selectionWidth}%`,
        }}
      >
        <div className="minimap-handle minimap-handle-start" />
        <div className="minimap-handle minimap-handle-end" />
      </div>
    </div>
  );
}
