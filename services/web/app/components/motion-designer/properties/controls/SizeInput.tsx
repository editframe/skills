import React from "react";
import { Check } from "@phosphor-icons/react";

interface SizeInputProps {
  label: string;
  width: number | undefined;
  height: number | undefined;
  onChange: (width: number | undefined, height: number | undefined) => void;
}

export function SizeInput({ label, width, height, onChange }: SizeInputProps) {
  const widthEnabled = width !== undefined;
  const heightEnabled = height !== undefined;
  const currentWidth = width ?? 100;
  const currentHeight = height ?? 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
          {label}
        </label>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (widthEnabled) {
                  onChange(undefined, height);
                } else {
                  onChange(currentWidth, height);
                }
              }}
              className={`
                w-4 h-4 flex items-center justify-center rounded border transition-colors
                ${
                  widthEnabled
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-gray-800/50 border-gray-700/30 text-gray-600 hover:border-gray-600/50"
                }
              `}
              title={widthEnabled ? "Disable width" : "Enable width"}
            >
              {widthEnabled && <Check className="w-2.5 h-2.5" />}
            </button>
            <span className="text-[7px] text-gray-600 font-bold uppercase w-3">
              W
            </span>
            <input
              type="number"
              value={currentWidth}
              onChange={(e) => onChange(Number(e.target.value), height)}
              disabled={!widthEnabled}
              className={`flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50 ${
                !widthEnabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            <span className="text-[8px] text-gray-500">px</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (heightEnabled) {
                  onChange(width, undefined);
                } else {
                  onChange(width, currentHeight);
                }
              }}
              className={`
                w-4 h-4 flex items-center justify-center rounded border transition-colors
                ${
                  heightEnabled
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-gray-800/50 border-gray-700/30 text-gray-600 hover:border-gray-600/50"
                }
              `}
              title={heightEnabled ? "Disable height" : "Enable height"}
            >
              {heightEnabled && <Check className="w-2.5 h-2.5" />}
            </button>
            <span className="text-[7px] text-gray-600 font-bold uppercase w-3">
              H
            </span>
            <input
              type="number"
              value={currentHeight}
              onChange={(e) => onChange(width, Number(e.target.value))}
              disabled={!heightEnabled}
              className={`flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50 ${
                !heightEnabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            <span className="text-[8px] text-gray-500">px</span>
          </div>
        </div>
      </div>
    </div>
  );
}
