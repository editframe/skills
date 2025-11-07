import type { CSSProperties } from "react"
import { Scrubber, TimeDisplay, TogglePlay, Controls } from "@editframe/react"
import { Pause, Play } from "@phosphor-icons/react"

export interface TimelineControlsProps {
  className?: string
  style?: CSSProperties
  target?: string
}

export function TimelineControls({
  className = "",
  style = {},
  target,
}: TimelineControlsProps) {

  const controls = (
    <div
      className={`flex items-center gap-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${className}`}
      style={style}
    >
      <TogglePlay>
        <button
          slot="pause"
          className="text-gray-800 hover:text-gray-800/80 flex flex-col items-center p-1 rounded hover:bg-gray-800/10 transition-colors"
        >
          <Pause className="size-5" weight="fill" />
        </button>
        <button
          slot="play"
          className="text-gray-800 hover:text-gray-800/80 flex flex-col items-center p-1 rounded hover:bg-gray-800/10 transition-colors"
        >
          <Play className="size-5" weight="fill" />
        </button>
      </TogglePlay>

      <Scrubber />
      <TimeDisplay className="text-sm font-mono text-gray-600 pr-2" />
    </div>
  )

  if (target) {
    return (
      <Controls target={target}>
        {controls}
      </Controls>
    )
  }

  return controls
}
