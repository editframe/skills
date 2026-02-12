import "@editframe/react/styles.css";

interface TimelineControlsProps {
  target: string;
}

export function TimelineControls({ target }: TimelineControlsProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded">
      <button
        onClick={() => {
          const el = document.getElementById(target) as any;
          if (el) {
            el.paused = !el.paused;
          }
        }}
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
      >
        Play/Pause
      </button>
      <button
        onClick={() => {
          const el = document.getElementById(target) as any;
          if (el) {
            el.ownCurrentTimeMs = 0;
          }
        }}
        className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm font-medium"
      >
        Restart
      </button>
    </div>
  );
}
