import React, { useState } from "react";
import { Lock, LockOpen } from "@phosphor-icons/react";

interface DimensionsInputProps {
  label: string;
  width: number | undefined;
  height: number | undefined;
  onChange: (size: { width: number; height: number }) => void;
}

export function DimensionsInput({ label, width, height, onChange }: DimensionsInputProps) {
  const [locked, setLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const handleWidthChange = (newWidth: number) => {
    if (locked && aspectRatio && height) {
      const newHeight = Math.round(newWidth / aspectRatio);
      onChange({ width: newWidth, height: newHeight });
    } else {
      onChange({ width: newWidth, height: height ?? 100 });
      if (newWidth && height) {
        setAspectRatio(newWidth / height);
      }
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (locked && aspectRatio && width) {
      const newWidth = Math.round(newHeight * aspectRatio);
      onChange({ width: newWidth, height: newHeight });
    } else {
      onChange({ width: width ?? 100, height: newHeight });
      if (width && newHeight) {
        setAspectRatio(width / newHeight);
      }
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[10px] text-gray-500 w-11 font-normal flex-shrink-0">{label}</label>
      <div className="flex flex-1 items-stretch gap-px">
        <div className="flex-1 flex items-center gap-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm hover:border-gray-600/50 focus-within:border-blue-500/50 focus-within:bg-gray-900 transition-colors">
          <span className="text-[7px] text-gray-600 font-bold uppercase">W</span>
          <input
            type="number"
            value={width ?? 100}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="flex-1 bg-transparent text-[10px] text-white focus:outline-none w-0 min-w-0 p-0 m-0 border-0"
          />
        </div>
        <button
          onClick={() => setLocked(!locked)}
          className="w-4 h-5 flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
          title={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
        >
          {locked ? <Lock className="w-2 h-2" /> : <LockOpen className="w-2 h-2" />}
        </button>
        <div className="flex-1 flex items-center gap-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm hover:border-gray-600/50 focus-within:border-blue-500/50 focus-within:bg-gray-900 transition-colors">
          <span className="text-[7px] text-gray-600 font-bold uppercase">H</span>
          <input
            type="number"
            value={height ?? 100}
            onChange={(e) => handleHeightChange(Number(e.target.value))}
            className="flex-1 bg-transparent text-[10px] text-white focus:outline-none w-0 min-w-0 p-0 m-0 border-0"
          />
        </div>
      </div>
    </div>
  );
}

