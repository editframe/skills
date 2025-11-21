import React from "react";

export type AspectRatioScaling = "fit" | "cover" | "contain";

interface AspectRatioScalingControlProps {
  label: string;
  value: AspectRatioScaling | undefined;
  onChange: (value: AspectRatioScaling) => void;
}

export function AspectRatioScalingControl({
  label,
  value,
  onChange,
}: AspectRatioScalingControlProps) {
  const options: Array<{
    value: AspectRatioScaling;
    label: string;
    title: string;
  }> = [
    {
      value: "fit",
      label: "Fit",
      title: "Fit - Element fits within container, may have letterboxing",
    },
    {
      value: "cover",
      label: "Cover",
      title: "Cover - Element covers container, may crop",
    },
    {
      value: "contain",
      label: "Contain",
      title: "Contain - Element is contained within container",
    },
  ];

  const currentValue = value || "fit";

  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
        {label}
      </label>
      <div className="flex-1 flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            title={option.title}
            className={`
              flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] font-medium
              transition-colors flex-1
              ${currentValue === option.value
                ? "bg-blue-600 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
              }
            `}
          >
            <span className="hidden sm:inline">{option.label}</span>
            <span className="sm:hidden">{option.label.charAt(0)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}



