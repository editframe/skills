interface TimelineControlsProps {
  target: string;
}

export function TimelineControls({ target }: TimelineControlsProps) {
  return (
    <ef-controls
      target={target}
      className="flex items-center gap-3 p-2 bg-slate-900 border border-t-0 border-slate-700 rounded-b-lg"
    >
      <ef-toggle-play>
        <button
          slot="play"
          className="text-white hover:text-white/80 p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Play"
        >
          ▶
        </button>
        <button
          slot="pause"
          className="text-white hover:text-white/80 p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Pause"
        >
          ⏸
        </button>
      </ef-toggle-play>
      <ef-scrubber className="flex-1" />
      <ef-time-display className="text-xs text-slate-400 font-mono tabular-nums" />
    </ef-controls>
  );
}
