import React from "react";
import { GridFour, Rows, Columns, Square } from "@phosphor-icons/react";

export type LayoutType = "block" | "horizontal" | "vertical" | "grid";

interface LayoutTypeSelectorProps {
  label: string;
  display: string | undefined;
  flexDirection: string | undefined;
  onChange: (display: string, flexDirection?: string) => void;
}

export function LayoutTypeSelector({
  label,
  display,
  flexDirection,
  onChange,
}: LayoutTypeSelectorProps) {
  // Determine current layout type from display and flexDirection
  const getCurrentLayoutType = (): LayoutType => {
    if (display === "grid") return "grid";
    if (display === "flex") {
      if (flexDirection === "column") return "vertical";
      return "horizontal";
    }
    return "block";
  };

  const currentLayoutType = getCurrentLayoutType();

  const handleLayoutTypeChange = (layoutType: LayoutType) => {
    switch (layoutType) {
      case "block":
        onChange("block");
        break;
      case "horizontal":
        onChange("flex", "row");
        break;
      case "vertical":
        onChange("flex", "column");
        break;
      case "grid":
        onChange("grid");
        break;
    }
  };

  const layoutOptions: Array<{
    type: LayoutType;
    icon: React.ReactNode;
    label: string;
    title: string;
  }> = [
    {
      type: "block",
      icon: <Square className="w-3.5 h-3.5" />,
      label: "Block",
      title: "Block Layout",
    },
    {
      type: "horizontal",
      icon: <Columns className="w-3.5 h-3.5" />,
      label: "Horizontal",
      title: "Horizontal Layout",
    },
    {
      type: "vertical",
      icon: <Rows className="w-3.5 h-3.5" />,
      label: "Vertical",
      title: "Vertical Layout",
    },
    {
      type: "grid",
      icon: <GridFour className="w-3.5 h-3.5" />,
      label: "Grid",
      title: "Grid Layout",
    },
  ];

  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
        {label}
      </label>
      <div className="flex-1 flex gap-1">
        {layoutOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => handleLayoutTypeChange(option.type)}
            title={option.title}
            className={`
              flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] font-medium
              transition-colors flex-1
              ${currentLayoutType === option.type
                ? "bg-blue-600 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
              }
            `}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


