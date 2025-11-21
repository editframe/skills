import React from "react";
import { AlignLeft, AlignCenterHorizontal, AlignRight, AlignTop, AlignCenterVertical, AlignBottom } from "@phosphor-icons/react";

interface ContainerAlignmentControlProps {
  label: string;
  justifyItems: string | undefined;
  alignItems: string | undefined;
  onChange: (justifyItems: string, alignItems: string) => void;
}

export function ContainerAlignmentControl({
  label,
  justifyItems,
  alignItems,
  onChange,
}: ContainerAlignmentControlProps) {
  const currentJustify = justifyItems || "start";
  const currentAlign = alignItems || "start";

  const justifyOptions = [
    { value: "start", icon: <AlignLeft className="w-3.5 h-3.5" />, title: "Start" },
    { value: "center", icon: <AlignCenterHorizontal className="w-3.5 h-3.5" />, title: "Center" },
    { value: "end", icon: <AlignRight className="w-3.5 h-3.5" />, title: "End" },
  ];

  const alignOptions = [
    { value: "start", icon: <AlignTop className="w-3.5 h-3.5" />, title: "Start" },
    { value: "center", icon: <AlignCenterVertical className="w-3.5 h-3.5" />, title: "Center" },
    { value: "end", icon: <AlignBottom className="w-3.5 h-3.5" />, title: "End" },
  ];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
          {label}
        </label>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-[7px] text-gray-600 font-bold uppercase w-3">H</span>
            <div className="flex-1 flex gap-1">
              {justifyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onChange(option.value, currentAlign)}
                  title={option.title}
                  className={`
                    flex items-center justify-center px-2 py-1 rounded text-[9px] font-medium
                    transition-colors flex-1
                    ${currentJustify === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
                    }
                  `}
                >
                  {option.icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] text-gray-600 font-bold uppercase w-3">V</span>
            <div className="flex-1 flex gap-1">
              {alignOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onChange(currentJustify, option.value)}
                  title={option.title}
                  className={`
                    flex items-center justify-center px-2 py-1 rounded text-[9px] font-medium
                    transition-colors flex-1
                    ${currentAlign === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
                    }
                  `}
                >
                  {option.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



