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
// Includes spacing options (space-between, space-around, space-evenly) in the grid
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
  { justify: "space-between", align: "flex-start", title: "Space Between - Top" },
  { justify: "space-around", align: "flex-start", title: "Space Around - Top" },
  { justify: "space-evenly", align: "flex-start", title: "Space Evenly - Top" },
  { justify: "space-between", align: "center", title: "Space Between - Center" },
  { justify: "space-around", align: "center", title: "Space Around - Center" },
  { justify: "space-evenly", align: "center", title: "Space Evenly - Center" },
  { justify: "space-between", align: "flex-end", title: "Space Between - Bottom" },
  { justify: "space-around", align: "flex-end", title: "Space Around - Bottom" },
  { justify: "space-evenly", align: "flex-end", title: "Space Evenly - Bottom" },
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
  { justify: "flex-start", align: "space-between", title: "Space Between - Left" },
  { justify: "flex-start", align: "space-around", title: "Space Around - Left" },
  { justify: "flex-start", align: "space-evenly", title: "Space Evenly - Left" },
  { justify: "center", align: "space-between", title: "Space Between - Center" },
  { justify: "center", align: "space-around", title: "Space Around - Center" },
  { justify: "center", align: "space-evenly", title: "Space Evenly - Center" },
  { justify: "flex-end", align: "space-between", title: "Space Between - Right" },
  { justify: "flex-end", align: "space-around", title: "Space Around - Right" },
  { justify: "flex-end", align: "space-evenly", title: "Space Evenly - Right" },
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

  const spacingValues = ["space-between", "space-around", "space-evenly"];

  const handleClick = (justify: string, align: string) => {
    // Always update both justify and align
    // The grid positions combine both values
    onJustifyChange(justify);
    onAlignChange(align);
  };

  const isActive = (justify: string, align: string) => {
    // Check if this position matches current values
    const justifyMatches = justifyContent === justify;
    const alignMatches = alignItems === align;
    
    // For spacing values, we need both to match
    if (spacingValues.includes(justify)) {
      return justifyMatches && alignMatches;
    }
    
    // For standard positions, both must match
    return justifyMatches && alignMatches;
  };

  // Group positions into rows for better visual organization
  // First 9 positions are the standard 3x3 grid
  // Remaining positions are spacing options
  const standardPositions = GRID_POSITIONS.slice(0, 9);
  const spacingPositions = GRID_POSITIONS.slice(9);

  return (
    <div className="flex items-start gap-1">
      <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0 pt-1">
        {label}
      </label>
      <div className="flex-1 space-y-1">
        {/* Standard 3x3 alignment grid */}
        <div className="grid grid-cols-3 gap-px w-fit">
          {standardPositions.map((pos, idx) => (
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
        {/* Spacing options row */}
        {spacingPositions.length > 0 && (
          <div className="grid grid-cols-3 gap-px w-fit">
            {spacingPositions.map((pos, idx) => (
              <button
                key={idx + 9}
                onClick={() => handleClick(pos.justify, pos.align)}
                title={pos.title}
                className={`w-5 h-5 flex items-center justify-center rounded-sm border transition-colors ${
                  isActive(pos.justify, pos.align)
                    ? "bg-blue-500/15 border-blue-500/50"
                    : "bg-gray-900/50 border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/50"
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <div
                    className={`w-0.5 h-0.5 rounded-full ${
                      isActive(pos.justify, pos.align) ? "bg-blue-400" : "bg-gray-600"
                    }`}
                  />
                  <div
                    className={`w-0.5 h-0.5 rounded-full ${
                      isActive(pos.justify, pos.align) ? "bg-blue-400" : "bg-gray-600"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

