import React from "react";
import { PlayLoopButton } from "../controls/PlayLoopButton";
import { PlayPauseButton } from "../controls/PlayPauseButton";

interface TimelineControlsProps {
  previewTargetId?: string;
  onRestart: () => void;
}

export function TimelineControls({ previewTargetId, onRestart }: TimelineControlsProps) {
  if (!previewTargetId) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1 border-r border-gray-700/70">
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
    </div>
  );
}

