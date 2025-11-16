import React from "react";
import { TogglePlay } from "@editframe/react";
import { Play, Pause } from "@phosphor-icons/react";

interface PlayPauseButtonProps {
  targetId: string;
  playButtonClassName?: string;
  pauseButtonClassName?: string;
  iconSize?: number;
}

export function PlayPauseButton({
  targetId,
  playButtonClassName = "",
  pauseButtonClassName = "",
  iconSize = 14,
}: PlayPauseButtonProps) {
  return (
    <>
      <TogglePlay target={targetId}>
        <button
          slot="play"
          className={playButtonClassName}
          aria-label="Play"
        >
          <Play size={iconSize} weight="fill" />
        </button>
        <button
          slot="pause"
          className={pauseButtonClassName}
          aria-label="Pause"
        >
          <Pause size={iconSize} weight="fill" />
        </button>
      </TogglePlay>
    </>
  );
}

