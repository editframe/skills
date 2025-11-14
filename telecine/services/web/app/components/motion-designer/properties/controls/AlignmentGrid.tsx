import React from "react";

interface AlignmentGridProps {
  label: string;
  justifyContent: string | undefined;
  alignItems: string | undefined;
  flexDirection: string | undefined;
  onJustifyChange: (value: string) => void;
  onAlignChange: (value: string) => void;
}

// For flexDirection="row": justify=horizontal, align=vertical
// For flexDirection="column": justify=vertical, align=horizontal
const GRID_POSITIONS_ROW = [
  { justify: "flex-start", align: "flex-start", title: "Top Left" },
  { justify: "center", align: "flex-start", title: "Top Center" },
  { justify: "flex-end", align: "flex-start", title: "Top Right" },
  { justify: "flex-start", align: "center", title: "Center Left" },
  { justify: "center", align: "center", title: "Center" },
  { justify: "flex-end", align: "center", title: "Center Right" },
  { justify: "flex-start", align: "flex-end", title: "Bottom Left" },
  { justify: "center", align: "flex-end", title: "Bottom Center" },
  { justify: "flex-end", align: "flex-end", title: "Bottom Right" },
];

// For column, swap justify and align meanings
const GRID_POSITIONS_COLUMN = [
  { justify: "flex-start", align: "flex-start", title: "Top Left" },
  { justify: "flex-start", align: "center", title: "Top Center" },
  { justify: "flex-start", align: "flex-end", title: "Top Right" },
  { justify: "center", align: "flex-start", title: "Center Left" },
  { justify: "center", align: "center", title: "Center" },
  { justify: "center", align: "flex-end", title: "Center Right" },
  { justify: "flex-end", align: "flex-start", title: "Bottom Left" },
  { justify: "flex-end", align: "center", title: "Bottom Center" },
  { justify: "flex-end", align: "flex-end", title: "Bottom Right" },
];

export function AlignmentGrid({
  label,
  justifyContent,
  alignItems,
  flexDirection,
  onJustifyChange,
  onAlignChange,
}: AlignmentGridProps) {
  const isColumn = flexDirection === "column";
  const GRID_POSITIONS = isColumn ? GRID_POSITIONS_COLUMN : GRID_POSITIONS_ROW;

  const handleClick = (justify: string, align: string) => {
    onJustifyChange(justify);
    onAlignChange(align);
  };

  const isActive = (justify: string, align: string) => {
    return justifyContent === justify && alignItems === align;
  };

  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[10px] text-gray-500 w-11 font-normal flex-shrink-0">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-px w-fit">
        {GRID_POSITIONS.map((pos, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(pos.justify, pos.align)}
            title={pos.title}
            className={`w-5 h-5 flex items-center justify-center rounded-sm border transition-colors ${
              isActive(pos.justify, pos.align)
                ? "bg-blue-500/15 border-blue-500/50"
                : "bg-gray-900/50 border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/50"
            }`}
          >
            <div
              className={`w-0.5 h-0.5 rounded-full ${
                isActive(pos.justify, pos.align) ? "bg-blue-400" : "bg-gray-600"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

