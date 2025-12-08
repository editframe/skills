import type { MotionDesignerState } from "~/lib/motion-designer/types";
import { PlacementModeSelector } from "./placement/PlacementModeSelector";
import { exportState, importState } from "~/lib/motion-designer/persistence";
import { useMotionDesignerActions } from "./context/MotionDesignerContext";
import { usePanZoom } from "./context/PanZoomContext";

interface TopBarProps {
  state: MotionDesignerState;
}

export function TopBar({ state }: TopBarProps) {
  const actions = useMotionDesignerActions();
  const panZoom = usePanZoom();
  const zoomPercent = panZoom
    ? Math.round(panZoom.scale * 100)
    : 100;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-2">
        <PlacementModeSelector
          placementMode={state.ui.placementMode}
          onSetPlacementMode={actions.setPlacementMode}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">
          {state.ui.compositionName || "Untitled"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded">
          Share
        </button>
        <button
          onClick={() => {
            panZoom?.reset();
          }}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1"
          title="Reset pan/zoom"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset View
        </button>
        <select
          value={zoomPercent}
          onChange={(e) => {
            const scale = Number(e.target.value) / 100;
            if (panZoom) {
              panZoom.scale = scale;
            }
          }}
          className="px-2 py-1 text-sm bg-gray-700 rounded"
        >
          <option value="25">25%</option>
          <option value="50">50%</option>
          <option value="75">75%</option>
          <option value="100">100%</option>
          <option value="125">125%</option>
          <option value="150">150%</option>
          <option value="200">200%</option>
        </select>
        <button
          onClick={() => {
            const json = exportState(state);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "motion-designer-composition.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-1"
        >
          Export
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>
        <input
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const json = event.target?.result as string;
                try {
                  const importedState = importState(json);
                  actions.replaceState(importedState);
                } catch (error) {
                  console.error("Failed to import:", error);
                  alert(
                    "Failed to import composition. Please check the file format.",
                  );
                }
              };
              reader.readAsText(file);
            }
          }}
          className="hidden"
          id="import-file-input"
        />
        <label
          htmlFor="import-file-input"
          className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 rounded cursor-pointer"
        >
          Import
        </label>
      </div>
    </div>
  );
}
