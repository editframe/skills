import { ELEMENT_TYPES, TOOL_CATEGORIES, getElementsByCategory } from "~/lib/motion-designer/elementTypes";
import { Cursor } from "@phosphor-icons/react";

interface PlacementModeSelectorProps {
  placementMode: string | null;
  onSetPlacementMode: (mode: string | null) => void;
}

export function PlacementModeSelector({
  placementMode,
  onSetPlacementMode,
}: PlacementModeSelectorProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 rounded border border-gray-700">
      {/* Select Tool */}
      <button
        onClick={() => onSetPlacementMode(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
          placementMode === null
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
        title="Select tool (V)"
      >
        <Cursor size={14} weight={placementMode === null ? "fill" : "regular"} />
        <span>Select</span>
        <span className="text-[10px] text-gray-400">V</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-700" />

      {/* Tool Categories */}
      {TOOL_CATEGORIES.map((category) => {
        const categoryTools = getElementsByCategory(category.id);
        if (categoryTools.length === 0) return null;

        return (
          <div key={category.id} className="flex items-center gap-1">
            {categoryTools.map(({ type, icon: IconComponent, label, shortcut }) => (
              <button
                key={type}
                onClick={() =>
                  onSetPlacementMode(
                    placementMode === type ? null : type,
                  )
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  placementMode === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                title={`${label} (${shortcut})`}
              >
                <IconComponent size={14} weight={placementMode === type ? "fill" : "regular"} />
                <span>{label}</span>
                <span className="text-[10px] text-gray-400">{shortcut}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
