import {
  ELEMENT_TYPES,
  TOOL_CATEGORIES,
  getElementsByCategory,
} from "~/lib/motion-designer/elementTypes";
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
    <div className="flex items-center gap-1 px-1.5 py-1 bg-gray-800 rounded border border-gray-700">
      {/* Select Tool */}
      <button
        onClick={() => onSetPlacementMode(null)}
        className={`flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors relative ${
          placementMode === null
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
        title="Select tool (V)"
      >
        <Cursor
          size={16}
          weight={placementMode === null ? "fill" : "regular"}
        />
        <span className="text-[9px] text-gray-400 font-normal absolute -bottom-0.5 right-0.5 leading-none">
          V
        </span>
      </button>

      {/* Divider */}
      <div className="w-px h-7 bg-gray-700 mx-0.5" />

      {/* Tool Categories */}
      {TOOL_CATEGORIES.map((category) => {
        const categoryTools = getElementsByCategory(category.id);
        if (categoryTools.length === 0) return null;

        return (
          <div key={category.id} className="flex items-center gap-0.5">
            {categoryTools.map(
              ({ type, icon: IconComponent, label, shortcut }) => (
                <button
                  key={type}
                  onClick={() =>
                    onSetPlacementMode(placementMode === type ? null : type)
                  }
                  className={`flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors relative ${
                    placementMode === type
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                  title={`${label} (${shortcut})`}
                >
                  <IconComponent
                    size={16}
                    weight={placementMode === type ? "fill" : "regular"}
                  />
                  <span className="text-[9px] text-gray-400 font-normal absolute -bottom-0.5 right-0.5 leading-none">
                    {shortcut}
                  </span>
                </button>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
