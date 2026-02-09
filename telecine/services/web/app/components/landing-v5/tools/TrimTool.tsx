/* ==============================================================================
   COMPONENT: TrimTool
   
   Purpose: Minimal video trim tool demonstrating Editframe GUI components.
   Shows a video preview with scrubber and visual trim handles that control
   the actual video playback range via sourcein/sourceout.
   
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
import { useRenderQueue } from "../RenderQueue";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";
const SOURCE_DURATION_MS = 10000;

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
  const [inPoint, setInPoint] = useState(2000);
  const [outPoint, setOutPoint] = useState(8000);

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"in" | "out" | "region" | null>(null);
  const dragStartRef = useRef<{ inPoint: number; outPoint: number; mouseX: number } | null>(null);
  const previewRef = useRef<HTMLElement>(null);
  const { enqueue } = useRenderQueue();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePointerDown = useCallback(
    (handle: "in" | "out" | "region") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = handle;
      if (handle === "region" && trackRef.current) {
        dragStartRef.current = {
          inPoint,
          outPoint,
          mouseX: e.clientX,
        };
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [inPoint, outPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const time = Math.round((x / rect.width) * SOURCE_DURATION_MS);

      if (draggingRef.current === "in") {
        const newInPoint = Math.min(time, outPoint - 500);
        setInPoint(newInPoint);
        // Seek to the new in-point
        const tg = previewRef.current?.querySelector("ef-timegroup") as any;
        if (tg) tg.currentTimeMs = 0; // Relative to trimmed duration
      } else if (draggingRef.current === "out") {
        const newOutPoint = Math.max(time, inPoint + 500);
        setOutPoint(newOutPoint);
        // Seek to the end of the new out-point
        const tg = previewRef.current?.querySelector("ef-timegroup") as any;
        if (tg) {
          const duration = newOutPoint - inPoint;
          tg.currentTimeMs = duration;
        }
      } else if (draggingRef.current === "region" && dragStartRef.current) {
        const deltaX = e.clientX - dragStartRef.current.mouseX;
        const deltaTime = Math.round((deltaX / rect.width) * SOURCE_DURATION_MS);
        const duration = dragStartRef.current.outPoint - dragStartRef.current.inPoint;
        
        let newInPoint = dragStartRef.current.inPoint + deltaTime;
        let newOutPoint = dragStartRef.current.outPoint + deltaTime;
        
        // Clamp to boundaries
        if (newInPoint < 0) {
          newInPoint = 0;
          newOutPoint = duration;
        } else if (newOutPoint > SOURCE_DURATION_MS) {
          newOutPoint = SOURCE_DURATION_MS;
          newInPoint = SOURCE_DURATION_MS - duration;
        }
        
        setInPoint(newInPoint);
        setOutPoint(newOutPoint);
      }
    },
    [inPoint, outPoint]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null;
    dragStartRef.current = null;
  }, []);

  const inPercent = (inPoint / SOURCE_DURATION_MS) * 100;
  const outPercent = (outPoint / SOURCE_DURATION_MS) * 100;
  const selectedDuration = outPoint - inPoint;
  const trimmedDurationStr = `${selectedDuration}ms`;

  const handleExport = useCallback(() => {
    // Create a hidden timegroup specifically for rendering
    const renderContainer = document.createElement("div");
    renderContainer.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 640px;
      height: 360px;
      pointer-events: none;
    `;
    
    const tg = document.createElement("ef-timegroup") as any;
    tg.setAttribute("mode", "fixed");
    tg.setAttribute("duration", trimmedDurationStr);
    tg.style.cssText = "width: 640px; height: 360px;";
    
    const video = document.createElement("ef-video");
    video.setAttribute("src", VIDEO_SRC);
    video.setAttribute("sourcein", `${inPoint}ms`);
    video.setAttribute("sourceout", `${outPoint}ms`);
    video.className = "size-full object-contain";
    
    tg.appendChild(video);
    renderContainer.appendChild(tg);
    document.body.appendChild(renderContainer);
    
    // Wait for the element to be ready, then enqueue
    requestAnimationFrame(() => {
      enqueue({
        name: "Trimmed Video",
        fileName: `trimmed-${formatTime(inPoint)}-${formatTime(outPoint)}.mp4`,
        timegroupEl: tg,
        renderOpts: { includeAudio: true },
      });
      
      // Clean up after render completes (the render queue will handle this)
      setTimeout(() => {
        renderContainer.remove();
      }, 1000);
    });
  }, [enqueue, inPoint, outPoint, trimmedDurationStr]);

  return (
    <div className="w-full max-w-xl">
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] overflow-hidden">
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
            <Preview id={previewId} ref={previewRef as any} className="size-full">
              <Timegroup mode="fixed" duration={trimmedDurationStr} className="size-full">
                <Video
                  src={VIDEO_SRC}
                  sourcein={`${inPoint}ms`}
                  sourceout={`${outPoint}ms`}
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
        <div className="bg-[#1a1a1a] px-4 py-3 border-t-4 border-black dark:border-white">
          <div
            ref={trackRef}
            className="relative h-10 bg-[#2a2a2a] border border-white/20 cursor-crosshair overflow-visible"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Unselected regions (grayed out) */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-black/50"
              style={{
                width: `${inPercent}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 right-0 bg-black/50"
              style={{
                width: `${100 - outPercent}%`,
              }}
            />

            {/* Selected region - draggable */}
            <div
              className="absolute top-0 bottom-0 bg-[var(--poster-blue)]/20 border-y border-[var(--poster-blue)] cursor-move hover:bg-[var(--poster-blue)]/30 transition-colors"
              style={{
                left: `${inPercent}%`,
                width: `${outPercent - inPercent}%`,
              }}
              onPointerDown={handlePointerDown("region")}
            />

            {/* In handle */}
            <div
              className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize group z-10"
              style={{ left: `${inPercent}%` }}
              onPointerDown={handlePointerDown("in")}
            >
              <div className="size-full bg-[var(--poster-gold)] group-hover:bg-[var(--poster-red)] transition-colors" />
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[var(--poster-gold)] group-hover:bg-[var(--poster-red)] text-black text-[8px] font-bold uppercase px-1 py-0.5 whitespace-nowrap transition-colors">
                In
              </div>
            </div>

            {/* Out handle */}
            <div
              className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize group z-10"
              style={{ left: `${outPercent}%` }}
              onPointerDown={handlePointerDown("out")}
            >
              <div className="size-full bg-[var(--poster-gold)] group-hover:bg-[var(--poster-red)] transition-colors" />
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[var(--poster-gold)] group-hover:bg-[var(--poster-red)] text-black text-[8px] font-bold uppercase px-1 py-0.5 whitespace-nowrap transition-colors">
                Out
              </div>
            </div>

            {/* Track ticks */}
            <div className="absolute inset-x-0 bottom-0 h-2 flex">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-l border-white/10 first:border-l-0"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scrubber + Controls */}
        <div className="border-t-4 border-black dark:border-white bg-[#1a1a1a]">
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

              <div className="flex-1 px-4 h-12 flex items-center border-l-4 border-black dark:border-white">
                <Scrubber
                  target={previewId}
                  className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer"
                  style={{
                    '--ef-scrubber-progress-color': 'var(--poster-red)',
                    '--ef-scrubber-handle-size': '12px',
                  } as React.CSSProperties}
                />
              </div>

              <div className="px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
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
              <div className="flex-1 px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <div className="w-full h-1.5 bg-white/20 rounded-full" />
              </div>
              <div className="px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <span className="text-xs text-white/70 font-mono">
                  0:00 / 0:00
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Trim Info Panel */}
        <div className="border-t-4 border-black dark:border-white bg-[#f5f5f5] dark:bg-[#111] px-4 py-2.5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1 text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 mb-0.5">
                In
              </div>
              <div className="text-xs font-mono font-bold text-[var(--poster-blue)]">
                {formatTime(inPoint)}
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 mb-0.5">
                Duration
              </div>
              <div className="text-xs font-mono font-bold text-black dark:text-white">
                {formatTime(selectedDuration)}
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 mb-0.5">
                Out
              </div>
              <div className="text-xs font-mono font-bold text-[var(--poster-red)]">
                {formatTime(outPoint)}
              </div>
            </div>
          </div>
          
          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={!isClient}
            className="w-full py-1.5 bg-[var(--poster-red)] border-2 border-black dark:border-white text-white font-bold uppercase tracking-wider text-[10px] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Clip
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrimTool;
