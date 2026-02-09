import { useId, useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import { Preview, Timegroup, Video, Filmstrip, TogglePlay } from "@editframe/react";
import type { EFTimegroup } from "@editframe/elements";
import { useRenderQueue } from "../RenderQueue";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";
const VIDEO_DURATION_MS = 10000;
const MIN_DURATION_MS = 500;

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
  const timegroupId = `trim-tg-${id}`;
  const filmstripTgId = `trim-filmstrip-tg-${id}`;
  const [isClient, setIsClient] = useState(false);
  const [inPoint, setInPoint] = useState(2000);
  const [outPoint, setOutPoint] = useState(8000);
  const [trackWidth, setTrackWidth] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"in" | "out" | "region" | null>(null);
  const dragStartRef = useRef<{ inPoint: number; outPoint: number; mouseX: number } | null>(null);
  const timegroupRef = useRef<EFTimegroup>(null);
  const { enqueue } = useRenderQueue();

  useEffect(() => setIsClient(true), []);

  // Measure track width so we can compute pixels-per-ms for the filmstrip
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setTrackWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!isClient || !draggingRef.current || !timegroupRef.current) return;
    if (draggingRef.current === "out") {
      timegroupRef.current.currentTimeMs = outPoint - inPoint;
    } else {
      timegroupRef.current.currentTimeMs = 0;
    }
  }, [isClient, inPoint, outPoint]);

  const handlePointerDown = useCallback(
    (handle: "in" | "out" | "region") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = handle;
      if (handle === "region") {
        dragStartRef.current = { inPoint, outPoint, mouseX: e.clientX };
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
      const time = Math.round((x / rect.width) * VIDEO_DURATION_MS);

      if (draggingRef.current === "in") {
        setInPoint(Math.min(time, outPoint - MIN_DURATION_MS));
      } else if (draggingRef.current === "out") {
        setOutPoint(Math.max(time, inPoint + MIN_DURATION_MS));
      } else if (draggingRef.current === "region" && dragStartRef.current) {
        const deltaX = e.clientX - dragStartRef.current.mouseX;
        const deltaTime = Math.round((deltaX / rect.width) * VIDEO_DURATION_MS);
        const duration = dragStartRef.current.outPoint - dragStartRef.current.inPoint;

        let newInPoint = dragStartRef.current.inPoint + deltaTime;
        let newOutPoint = dragStartRef.current.outPoint + deltaTime;

        if (newInPoint < 0) {
          newInPoint = 0;
          newOutPoint = duration;
        } else if (newOutPoint > VIDEO_DURATION_MS) {
          newOutPoint = VIDEO_DURATION_MS;
          newInPoint = VIDEO_DURATION_MS - duration;
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

  const handleExport = useCallback(() => {
    if (timegroupRef.current) {
      enqueue({
        name: "Trimmed Video",
        fileName: `trimmed-${formatTime(inPoint)}-${formatTime(outPoint)}.mp4`,
        timegroupEl: timegroupRef.current as unknown as HTMLElement,
        renderOpts: { includeAudio: true },
      });
    }
  }, [enqueue, inPoint, outPoint]);

  const inPercent = (inPoint / VIDEO_DURATION_MS) * 100;
  const outPercent = (outPoint / VIDEO_DURATION_MS) * 100;
  const duration = outPoint - inPoint;
  const filmstripPxPerMs = trackWidth > 0 ? trackWidth / VIDEO_DURATION_MS : 0.04;

  if (!isClient) {
    return (
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a]">
        <div className="bg-black px-4 py-2">
          <span className="text-white text-xs font-bold uppercase tracking-widest">Trim Tool</span>
        </div>
        <div className="bg-[#111] aspect-video flex items-center justify-center">
          <span className="text-white/30 text-xs uppercase tracking-wider">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] overflow-hidden">
        {/* Header */}
        <div className="bg-black px-4 py-2 flex items-center justify-between">
          <span className="text-white text-xs font-bold uppercase tracking-widest">Trim Tool</span>
          <span className="text-white/50 text-[10px] font-mono uppercase">Demo</span>
        </div>

        {/* Video Preview */}
        <div className="bg-[#111] aspect-video relative">
          <Preview id={previewId} loop className="size-full">
            <Timegroup ref={timegroupRef} id={timegroupId} mode="fixed" duration={`${duration}ms`} className="size-full">
              <Video
                src={VIDEO_SRC}
                sourcein={`${inPoint}ms`}
                sourceout={`${outPoint}ms`}
                className="size-full object-contain"
              />
            </Timegroup>
          </Preview>
        </div>

        {/* Hidden full-duration timegroup for filmstrip thumbnails */}
        <Timegroup id={filmstripTgId} mode="fixed" duration={`${VIDEO_DURATION_MS}ms`} style={{ display: 'none' }}>
          <Video src={VIDEO_SRC} />
        </Timegroup>

        {/* Unified Trim Bar */}
        <div className="border-t-4 border-black dark:border-white bg-[#111]">
          <div className="flex items-center">
            {/* Play/Pause */}
            <TogglePlay target={previewId}>
              <button slot="pause" className="w-10 h-16 flex items-center justify-center bg-black/80 hover:bg-black transition-colors border-r border-white/10">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              </button>
              <button slot="play" className="w-10 h-16 flex items-center justify-center bg-black/80 hover:bg-black transition-colors border-r border-white/10">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </TogglePlay>

            {/* Trim track with filmstrip */}
            <div
              ref={trackRef}
              className="relative flex-1 h-16 cursor-crosshair overflow-hidden"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Filmstrip background - full source video duration */}
              <Filmstrip
                target={filmstripTgId}
                hide-playhead
                pixels-per-ms={filmstripPxPerMs}
                className="absolute inset-0 pointer-events-none"
                style={{ '--ef-thumbnail-strip-height': '64px' } as React.CSSProperties}
              />

              {/* Dimmed regions outside trim */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-black/70 z-10 pointer-events-none"
                style={{ width: `${inPercent}%` }}
              />
              <div
                className="absolute top-0 bottom-0 right-0 bg-black/70 z-10 pointer-events-none"
                style={{ width: `${100 - outPercent}%` }}
              />

              {/* Top/bottom border on selected region */}
              <div
                className="absolute top-0 h-[3px] bg-[var(--poster-gold)] z-20 pointer-events-none"
                style={{ left: `${inPercent}%`, width: `${outPercent - inPercent}%` }}
              />
              <div
                className="absolute bottom-0 h-[3px] bg-[var(--poster-gold)] z-20 pointer-events-none"
                style={{ left: `${inPercent}%`, width: `${outPercent - inPercent}%` }}
              />

              {/* Draggable selected region */}
              <div
                className="absolute top-0 bottom-0 cursor-move z-20"
                style={{ left: `calc(${inPercent}% + 16px)`, width: `calc(${outPercent - inPercent}% - 32px)` }}
                onPointerDown={handlePointerDown("region")}
              />

              {/* In handle */}
              <div
                className="absolute top-0 bottom-0 w-4 cursor-ew-resize z-30"
                style={{ left: `${inPercent}%` }}
                onPointerDown={handlePointerDown("in")}
              >
                <div className="size-full bg-[var(--poster-gold)] rounded-l-[4px] flex items-center justify-center">
                  <svg className="w-2 h-6 text-black/60" viewBox="0 0 8 24">
                    <path d="M6 4L2 12L6 20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Out handle */}
              <div
                className="absolute top-0 bottom-0 w-4 cursor-ew-resize z-30"
                style={{ left: `${outPercent}%`, transform: 'translateX(-100%)' }}
                onPointerDown={handlePointerDown("out")}
              >
                <div className="size-full bg-[var(--poster-gold)] rounded-r-[4px] flex items-center justify-center">
                  <svg className="w-2 h-6 text-black/60" viewBox="0 0 8 24">
                    <path d="M2 4L6 12L2 20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Bar */}
        <div className="border-t-4 border-black dark:border-white bg-[#f5f5f5] dark:bg-[#111] px-4 py-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            {[
              { label: "In", value: inPoint, color: "text-[var(--poster-blue)]" },
              { label: "Duration", value: duration, color: "text-black dark:text-white" },
              { label: "Out", value: outPoint, color: "text-[var(--poster-red)]" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex-1 text-center">
                <div className="text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 mb-0.5">
                  {label}
                </div>
                <div className={`text-xs font-mono font-bold ${color}`}>
                  {formatTime(value)}
                </div>
              </div>
            ))}
          </div>

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
