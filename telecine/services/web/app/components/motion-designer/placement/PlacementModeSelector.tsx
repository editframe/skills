import { ELEMENT_TYPES } from "~/lib/motion-designer/elementTypes";

interface PlacementModeSelectorProps {
  placementMode: string | null;
  onSetPlacementMode: (mode: string | null) => void;
}

export function PlacementModeSelector({
  placementMode,
  onSetPlacementMode,
}: PlacementModeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onSetPlacementMode(null)}
        className={`px-2 py-1 text-sm rounded ${
          placementMode === null
            ? "bg-gray-700"
            : "bg-gray-600 hover:bg-gray-700"
        }`}
        title="Select mode"
      >
        ←
      </button>
      {ELEMENT_TYPES.map(({ type, icon: IconComponent, label }) => (
        <button
          key={type}
          onClick={() =>
            onSetPlacementMode(
              placementMode === type ? null : type,
            )
          }
          className={`px-2 py-1 text-sm rounded ${
            placementMode === type
              ? "bg-gray-700"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
          title={label}
        >
          <IconComponent size={16} />
        </button>
      ))}
    </div>
  );
}
