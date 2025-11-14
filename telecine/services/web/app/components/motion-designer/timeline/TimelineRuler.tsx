interface TimelineRulerProps {
  durationMs: number;
}

export function TimelineRuler({ durationMs }: TimelineRulerProps) {
  if (durationMs <= 0) {
    return null;
  }

  // Calculate marker interval: every 1 second, or every 0.5s for durations < 5s
  const intervalMs = durationMs < 5000 ? 500 : 1000;
  
  // Generate time markers
  const markers: number[] = [];
  for (let timeMs = 0; timeMs <= durationMs; timeMs += intervalMs) {
    markers.push(timeMs);
  }

  return (
    <div className="absolute inset-0 flex pointer-events-none">
      {markers.map((timeMs) => {
        const positionPercent = (timeMs / durationMs) * 100;
        const timeSeconds = timeMs / 1000;
        const displayTime = timeSeconds % 1 === 0 ? `${timeSeconds}s` : `${timeSeconds.toFixed(1)}s`;
        
        return (
          <div
            key={timeMs}
            className="absolute top-0 bottom-0 flex flex-col items-start"
            style={{ left: `${positionPercent}%` }}
          >
            {/* Tick mark */}
            <div className="w-px h-full bg-gray-600" />
            {/* Time label */}
            <div className="text-xs text-gray-400 font-mono mt-0.5 whitespace-nowrap">
              {displayTime}
            </div>
          </div>
        );
      })}
    </div>
  );
}

