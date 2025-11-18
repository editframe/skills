import React from "react";

interface GridLayoutControlsProps {
  columns: number | "auto" | undefined;
  rows: number | "auto" | undefined;
  gap: number | undefined;
  onColumnsChange: (value: number | "auto") => void;
  onRowsChange: (value: number | "auto") => void;
  onGapChange: (value: number) => void;
}

export function GridLayoutControls({
  columns,
  rows,
  gap,
  onColumnsChange,
  onRowsChange,
  onGapChange,
}: GridLayoutControlsProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
          Columns
        </label>
        <div className="flex-1 flex gap-1">
          <select
            value={columns === "auto" ? "auto" : columns?.toString() || "1"}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "auto") {
                onColumnsChange("auto");
              } else {
                onColumnsChange(Number(value));
              }
            }}
            className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="auto">Auto</option>
            {[1, 2, 3, 4, 5, 6, 8, 12].map((num) => (
              <option key={num} value={num.toString()}>
                {num}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
          Rows
        </label>
        <div className="flex-1 flex gap-1">
          <select
            value={rows === "auto" ? "auto" : rows?.toString() || "auto"}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "auto") {
                onRowsChange("auto");
              } else {
                onRowsChange(Number(value));
              }
            }}
            className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="auto">Auto</option>
            {[1, 2, 3, 4, 5, 6, 8, 12].map((num) => (
              <option key={num} value={num.toString()}>
                {num}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
          Gap
        </label>
        <div className="flex-1 flex gap-1">
          <input
            type="number"
            value={gap ?? 0}
            onChange={(e) => onGapChange(Number(e.target.value))}
            className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
            placeholder="0"
          />
          <span className="text-[8px] text-gray-500">px</span>
        </div>
      </div>
    </div>
  );
}

