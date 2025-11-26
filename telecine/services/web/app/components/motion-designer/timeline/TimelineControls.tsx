import React from "react";
import { PlayLoopButton } from "../controls/PlayLoopButton";
import { PlayPauseButton } from "../controls/PlayPauseButton";

interface TimelineControlsProps {
  previewTargetId?: string;
  onRestart: () => void;
  zoomScale: number;
  onZoomChange: (zoomScale: number) => void;
}

export function TimelineControls({
  previewTargetId,
  onRestart,
  zoomScale,
  onZoomChange,
}: TimelineControlsProps) {
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 10;

  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1 border-r border-gray-700/70">
      {previewTargetId && (
        <>
          <PlayPauseButton
            targetId={previewTargetId}
            playButtonClassName="w-6 h-6 flex items-center justify-center hover:text-white text-gray-400 rounded"
            pauseButtonClassName="w-6 h-6 flex items-center justify-center hover:text-white text-gray-400 rounded"
            iconSize={14}
          />
          <PlayLoopButton
            targetId={previewTargetId}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors text-gray-400 hover:text-white border border-transparent"
            activeClassName="bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30 hover:text-blue-300"
            iconSize={14}
          />
        </>
      )}
      <div className="flex flex-col items-center gap-1 mt-2 pt-2 border-t border-gray-700/50">
        <label className="text-[10px] text-gray-500 font-medium">Zoom</label>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          value={zoomScale}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-[10px] text-gray-400">
          {zoomScale.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}
