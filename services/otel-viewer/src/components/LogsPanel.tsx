import { memo, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { LogRecord } from "../hooks/useTraceData";

interface LogsPanelProps {
  logs: LogRecord[];
  hoveredLogIndex: number | null;
  expandedLogs: Set<number>;
  onLogHover: (index: number | null) => void;
  onLogExpand: (index: number) => void;
  panelHeight: number;
  searchText: string;
  searchMode: "highlight" | "filter";
  onSearchTextChange: (text: string) => void;
  onSearchModeChange: (mode: "highlight" | "filter") => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

export const LogsPanel = memo(function LogsPanel({
  logs,
  hoveredLogIndex,
  expandedLogs,
  onLogHover,
  onLogExpand,
  panelHeight,
  searchText,
  searchMode,
  onSearchTextChange,
  onSearchModeChange,
  searchInputRef,
}: LogsPanelProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    if (!searchText || searchMode !== "filter") {
      return logs.map((log, i) => ({ log, index: i }));
    }

    const lowerSearch = searchText.toLowerCase();
    return logs
      .map((log, i) => ({ log, index: i }))
      .filter(({ log }) => logMatchesSearch(log, lowerSearch));
  }, [logs, searchText, searchMode]);

  const matchingIndices = useMemo(() => {
    if (!searchText || searchMode !== "highlight") {
      return new Set<number>();
    }
    const lowerSearch = searchText.toLowerCase();
    const matches = new Set<number>();
    logs.forEach((log, i) => {
      if (logMatchesSearch(log, lowerSearch)) {
        matches.add(i);
      }
    });
    return matches;
  }, [logs, searchText, searchMode]);

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const { index: originalIndex } = filteredLogs[index];
      return expandedLogs.has(originalIndex) ? 80 : 20;
    },
    overscan: 5,
  });

  const matchCount = searchText ? filteredLogs.length : logs.length;

  return (
    <div className="logs-panel" style={{ height: `${panelHeight}px` }}>
      <div className="logs-panel-header">
        <span className="logs-panel-title">
          Logs (
          {searchText && searchMode === "filter"
            ? `${matchCount}/${logs.length}`
            : logs.length}
          )
        </span>
        <div className="logs-search-controls">
          <input
            ref={searchInputRef}
            type="text"
            className="logs-search-input"
            placeholder="Search logs..."
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
          />
          <div className="logs-search-mode-toggle">
            <button
              className={`logs-search-mode-btn ${searchMode === "highlight" ? "active" : ""}`}
              onClick={() => onSearchModeChange("highlight")}
              title="Highlight matching logs"
            >
              Highlight
              <kbd className="kbd-shortcut">⌘H</kbd>
            </button>
            <button
              className={`logs-search-mode-btn ${searchMode === "filter" ? "active" : ""}`}
              onClick={() => onSearchModeChange("filter")}
              title="Filter to matching logs"
            >
              Filter
              <kbd className="kbd-shortcut">⌘/</kbd>
            </button>
          </div>
        </div>
      </div>
      <div className="logs-panel-content" ref={parentRef}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const { log, index } = filteredLogs[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <LogItem
                  log={log}
                  index={index}
                  isHovered={hoveredLogIndex === index}
                  isExpanded={expandedLogs.has(index)}
                  onHover={onLogHover}
                  onExpand={onLogExpand}
                  isHighlighted={matchingIndices.has(index)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

function logMatchesSearch(log: LogRecord, lowerSearch: string): boolean {
  if (log.body.toLowerCase().includes(lowerSearch)) {
    return true;
  }

  if (log.severityText.toLowerCase().includes(lowerSearch)) {
    return true;
  }

  for (const attr of log.attributes) {
    if (attr.key.toLowerCase().includes(lowerSearch)) {
      return true;
    }

    const attrValue = getAttrValue(attr.value);
    if (attrValue.toLowerCase().includes(lowerSearch)) {
      return true;
    }
  }

  return false;
}

interface LogItemProps {
  log: LogRecord;
  index: number;
  isHovered: boolean;
  isExpanded: boolean;
  onHover: (index: number | null) => void;
  onExpand: (index: number) => void;
  isHighlighted: boolean;
}

const LogItem = memo(
  function LogItem({
    log,
    index,
    isHovered,
    isExpanded,
    onHover,
    onExpand,
    isHighlighted,
  }: LogItemProps) {
    const timestamp = useMemo(
      () => new Date(Number(log.timeUnixNano / 1_000_000n)),
      [log.timeUnixNano],
    );
    const severityClass = log.severityText.toLowerCase();

    const icon = useMemo(() => {
      switch (severityClass) {
        case "trace":
          return "○";
        case "debug":
          return "◐";
        case "info":
          return "●";
        case "warn":
          return "▲";
        case "error":
          return "✕";
        case "fatal":
          return "⬤";
        default:
          return "●";
      }
    }, [severityClass]);

    const relevantAttrs = useMemo(
      () =>
        log.attributes.filter(
          (attr) =>
            !attr.key.startsWith("service.") &&
            !attr.key.startsWith("logging.googleapis.com/"),
        ),
      [log.attributes],
    );

    return (
      <div
        className={`logs-panel-item log-${severityClass} ${isHovered ? "hovered" : ""} ${isExpanded ? "expanded" : ""} ${isHighlighted ? "search-highlighted" : ""}`}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onExpand(index)}
      >
        <span className={`log-icon log-${severityClass}`}>{icon}</span>
        <span className="log-timestamp">
          {timestamp.toLocaleTimeString()}.
          {String(timestamp.getMilliseconds()).padStart(3, "0")}
        </span>
        <span className="log-content">
          {relevantAttrs.length > 0 && (
            <span className="log-attrs">
              {relevantAttrs.map((attr, j) => (
                <span key={j} className="log-attr">
                  <span className="log-attr-key">{attr.key}</span>
                  <span className="log-attr-sep">=</span>
                  <span className="log-attr-val">
                    {getAttrValue(attr.value)}
                  </span>
                </span>
              ))}
              <span className="log-message-sep">→</span>
            </span>
          )}
          <span className="log-body">{log.body}</span>
        </span>
      </div>
    );
  },
  (prev, next) =>
    prev.log === next.log &&
    prev.isHovered === next.isHovered &&
    prev.isExpanded === next.isExpanded &&
    prev.isHighlighted === next.isHighlighted,
);

function getAttrValue(value: any): string {
  if (value?.stringValue !== undefined) return value.stringValue;
  if (value?.intValue !== undefined) return String(value.intValue);
  if (value?.doubleValue !== undefined) return String(value.doubleValue);
  if (value?.boolValue !== undefined) return String(value.boolValue);
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
