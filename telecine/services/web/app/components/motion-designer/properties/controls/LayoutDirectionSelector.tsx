import React from "react";
import { Columns, Rows } from "@phosphor-icons/react";

interface LayoutDirectionSelectorProps {
  label: string;
  value: "horizontal" | "vertical" | undefined;
  onChange: (value: "horizontal" | "vertical") => void;
}

export function LayoutDirectionSelector({
  label,
  value,
  onChange,
}: LayoutDirectionSelectorProps) {
  const currentValue = value || "vertical";

  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
        {label}
      </label>
      <div className="flex-1 flex gap-1">
        <button
          onClick={() => onChange("horizontal")}
          title="Horizontal"
          className={`
            flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] font-medium
            transition-colors flex-1
            ${
              currentValue === "horizontal"
                ? "bg-blue-600 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
            }
          `}
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Horizontal</span>
        </button>
        <button
          onClick={() => onChange("vertical")}
          title="Vertical"
          className={`
            flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] font-medium
            transition-colors flex-1
            ${
              currentValue === "vertical"
                ? "bg-blue-600 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
            }
          `}
        >
          <Rows className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vertical</span>
        </button>
      </div>
    </div>
  );
}
