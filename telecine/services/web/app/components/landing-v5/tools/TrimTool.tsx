/* ==============================================================================
   COMPONENT: TrimTool
   
   Purpose: Minimal video trim tool demonstrating Editframe GUI components.
   Shows a video preview with scrubber and visual trim handles.
   
   Design: Swissted poster aesthetic - bold borders, strong colors, uppercase labels
   ============================================================================== */

import { useId, useEffect, useState, useRef, useCallback } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
}

export function TrimTool() {
  const id = useId();
  const previewId = `trim-tool-${id}`;

  const [isClient, setIsClient] = useState(false);
  const [duration] = useState(10000); // 10 seconds in ms
  const [inPoint, setInPoint] = useState(2000); // 2 seconds
  const [outPoint, setOutPoint] = useState(8000); // 8 seconds

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"in" | "out" | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePointerDown = useCallback(
    (handle: "in" | "out") => (e: React.PointerEvent) => {
      e.preventDefault();
      draggingRef.current = handle;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const time = Math.round((x / rect.width) * duration);

      if (draggingRef.current === "in") {
        setInPoint(Math.min(time, outPoint - 500));
      } else {
        setOutPoint(Math.max(time, inPoint + 500));
      }
    },
    [duration, inPoint, outPoint]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const inPercent = (inPoint / duration) * 100;
  const outPercent = (outPoint / duration) * 100;
  const selectedDuration = outPoint - inPoint;

  return (
    <div className="w-full max-w-xl">
      <div className="border-4 border-black bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-black px-4 py-2 flex items-center justify-between">
          <span className="text-white text-xs font-bold uppercase tracking-widest">
            Trim Tool
          </span>
          <span className="text-white/50 text-[10px] font-mono uppercase">
            Demo
          </span>
        </div>

        {/* Video Preview */}
        <div className="bg-[#111] aspect-video relative">
          {isClient ? (
            <Preview id={previewId} loop className="size-full">
              <Timegroup mode="fixed" duration="10s" className="size-full">
                <Video
                  src="/samples/demo.mp4"
                  duration="10s"
                  className="size-full object-contain"
                />
              </Timegroup>
            </Preview>
          ) : (
            <div className="size-full flex items-center justify-center">
              <div className="text-white/30 text-xs uppercase tracking-wider">
                Loading...
              </div>
            </div>
          )}
        </div>

        {/* Trim Track */}
        <div className="bg-[#1a1a1a] px-4 py-4 border-t-4 border-black">
          <div
            ref={trackRef}
            className="relative h-12 bg-[#333] rounded cursor-crosshair"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Selected region */}
            <div
              className="absolute top-0 bottom-0 bg-[var(--accent-blue)]/30 border-y-2 border-[var(--accent-blue)]"
              style={{
                left: `${inPercent}%`,
                width: `${outPercent - inPercent}%`,
              }}
            />

            {/* In handle */}
            <div
              className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize group z-10"
              style={{ left: `${inPercent}%` }}
              onPointerDown={handlePointerDown("in")}
            >
              <div className="size-full bg-[var(--accent-gold)] group-hover:bg-[var(--accent-red)] transition-colors" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--accent-gold)] group-hover:bg-[var(--accent-red)] text-black text-[9px] font-bold uppercase px-1.5 py-0.5 whitespace-nowrap transition-colors">
                In
              </div>
            </div>

            {/* Out handle */}
            <div
              className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize group z-10"
              style={{ left: `${outPercent}%` }}
              onPointerDown={handlePointerDown("out")}
            >
              <div className="size-full bg-[var(--accent-gold)] group-hover:bg-[var(--accent-red)] transition-colors" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--accent-gold)] group-hover:bg-[var(--accent-red)] text-black text-[9px] font-bold uppercase px-1.5 py-0.5 whitespace-nowrap transition-colors">
                Out
              </div>
            </div>

            {/* Track ticks */}
            <div className="absolute inset-x-0 bottom-0 h-2 flex">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-l border-white/20 first:border-l-0"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scrubber + Controls */}
        <div className="border-t-4 border-black bg-[#1a1a1a]">
          {isClient ? (
            <div className="flex items-center">
              <TogglePlay target={previewId}>
                <button
                  slot="pause"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--accent-red)] hover:brightness-110 transition-all"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
                <button
                  slot="play"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)] hover:brightness-110 transition-all"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </TogglePlay>

              <div className="flex-1 px-4 h-12 flex items-center border-l-4 border-black">
                <Scrubber
                  target={previewId}
                  className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--accent-red)] [&::part(progress)]:rounded-full [&::part(thumb)]:bg-white [&::part(thumb)]:w-3 [&::part(thumb)]:h-3 [&::part(thumb)]:rounded-full"
                />
              </div>

              <div className="px-4 border-l-4 border-black h-12 flex items-center">
                <TimeDisplay
                  target={previewId}
                  className="text-xs text-white/70 font-mono tabular-nums"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)]">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex-1 px-4 border-l-4 border-black h-12 flex items-center">
                <div className="w-full h-1.5 bg-white/20 rounded-full" />
              </div>
              <div className="px-4 border-l-4 border-black h-12 flex items-center">
                <span className="text-xs text-white/70 font-mono">
                  0:00 / 0:00
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Trim Info Panel */}
        <div className="border-t-4 border-black bg-[#f5f5f5] px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-black/50 mb-1">
                In Point
              </div>
              <div className="text-sm font-mono font-bold text-[var(--accent-blue)]">
                {formatTime(inPoint)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-black/50 mb-1">
                Duration
              </div>
              <div className="text-sm font-mono font-bold text-black">
                {formatTime(selectedDuration)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-black/50 mb-1">
                Out Point
              </div>
              <div className="text-sm font-mono font-bold text-[var(--accent-red)]">
                {formatTime(outPoint)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrimTool;
