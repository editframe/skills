interface ToolbarProps {
  status: "connecting" | "connected" | "disconnected";
  totalSpanCount: number;
  traceCount: number;
  onClear: () => void;
  autoSelectLatest: boolean;
  onToggleAutoSelect: () => void;
  pageTabs?: React.ReactNode;
}

export function Toolbar({
  status,
  totalSpanCount,
  traceCount,
  onClear,
  autoSelectLatest,
  onToggleAutoSelect,
  pageTabs,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className={`status ${status}`}>
          {status === "connected" && "Connected"}
          {status === "connecting" && "Connecting..."}
          {status === "disconnected" && "Disconnected"}
        </div>
        <span style={{ fontSize: 10, color: "#858585" }}>
          {totalSpanCount} spans • {traceCount} traces
        </span>
      </div>
      {pageTabs && <div className="toolbar-center">{pageTabs}</div>}
      <div className="toolbar-right">
        <button
          onClick={onToggleAutoSelect}
          className={autoSelectLatest ? "active" : ""}
          title="Toggle live mode"
        >
          {autoSelectLatest ? "● Live" : "○ Live"}
          <kbd className="kbd-shortcut">⌘⇧L</kbd>
        </button>
        <button onClick={onClear} title="Clear all data">
          Clear
          <kbd className="kbd-shortcut">⌘K</kbd>
        </button>
      </div>
    </div>
  );
}
