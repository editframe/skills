import React from "react";
import { PlayLoopButton } from "../controls/PlayLoopButton";
import { PlayPauseButton } from "../controls/PlayPauseButton";

interface TimelineControlsProps {
  previewTargetId?: string;
  onRestart: () => void;
  zoomScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function TimelineControls({ 
  previewTargetId, 
  onRestart,
  zoomScale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
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
      <div className="border-t border-gray-700/70 pt-1 mt-1 flex flex-col gap-1">
        <button
          onClick={onZoomIn}
          disabled={zoomScale >= MAX_ZOOM}
          className="w-6 h-6 flex items-center justify-center hover:text-white text-gray-400 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom in"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          onClick={onZoomOut}
          disabled={zoomScale <= MIN_ZOOM}
          className="w-6 h-6 flex items-center justify-center hover:text-white text-gray-400 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom out"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          onClick={onResetZoom}
          className="w-6 h-6 flex items-center justify-center hover:text-white text-gray-400 rounded text-xs"
          title="Reset zoom"
        >
          1x
        </button>
      </div>
    </div>
  );
}

