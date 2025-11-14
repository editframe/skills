import React from "react";

interface PositionInputProps {
  label: string;
  x: number | undefined;
  y: number | undefined;
  onChange: (position: { x: number; y: number }) => void;
}

export function PositionInput({ label, x, y, onChange }: PositionInputProps) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[10px] text-gray-500 w-11 font-normal flex-shrink-0">{label}</label>
      <div className="flex flex-1 items-stretch gap-px">
        <div className="flex-1 flex items-center gap-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm hover:border-gray-600/50 focus-within:border-blue-500/50 focus-within:bg-gray-900 transition-colors">
          <span className="text-[7px] text-gray-600 font-bold uppercase">X</span>
          <input
            type="number"
            value={x ?? 0}
            onChange={(e) => onChange({ x: Number(e.target.value), y: y ?? 0 })}
            className="flex-1 bg-transparent text-[10px] text-white focus:outline-none w-0 min-w-0 p-0 m-0 border-0"
          />
        </div>
        <div className="flex-1 flex items-center gap-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm hover:border-gray-600/50 focus-within:border-blue-500/50 focus-within:bg-gray-900 transition-colors">
          <span className="text-[7px] text-gray-600 font-bold uppercase">Y</span>
          <input
            type="number"
            value={y ?? 0}
            onChange={(e) => onChange({ x: x ?? 0, y: Number(e.target.value) })}
            className="flex-1 bg-transparent text-[10px] text-white focus:outline-none w-0 min-w-0 p-0 m-0 border-0"
          />
        </div>
      </div>
    </div>
  );
}

