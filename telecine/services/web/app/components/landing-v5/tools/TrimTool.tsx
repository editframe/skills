import { useId, useState, useRef, useCallback } from "react";
import {
  Preview, Timegroup, Video, ThumbnailStrip, TrimHandles, TogglePlay, useMediaInfo,
  type TrimChangeDetail,
} from "@editframe/react";
import type { EFTimegroup, EFVideo } from "@editframe/elements";
import { useRenderQueue } from "../RenderQueue";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";

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
  const videoRef = useRef<EFVideo>(null);
  const timegroupRef = useRef<EFTimegroup>(null);
  const { enqueue } = useRenderQueue();
  const { intrinsicDurationMs } = useMediaInfo(videoRef);

  const [trimStart, setTrimStart] = useState(2000);
  const [trimEnd, setTrimEnd] = useState(2000);

  const totalDuration = intrinsicDurationMs ?? 0;
  const keptDuration = totalDuration - trimStart - trimEnd;
  const inPoint = trimStart;
  const outPoint = totalDuration - trimEnd;

  const handleTrimChange = useCallback((e: CustomEvent<TrimChangeDetail>) => {
    const { type, trimStartMs, trimEndMs } = e.detail;
    setTrimStart(trimStartMs);
    setTrimEnd(trimEndMs);

    if (timegroupRef.current) {
      if (type === "end") {
        const duration = totalDuration - trimStartMs - trimEndMs;
        timegroupRef.current.currentTimeMs = duration;
      } else {
        timegroupRef.current.currentTimeMs = 0;
      }
    }
  }, [totalDuration]);

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
            <Timegroup ref={timegroupRef} mode="fixed" duration={`${keptDuration}ms`} className="size-full">
              <Video
                ref={videoRef}
                src={VIDEO_SRC}
                trimstart={`${trimStart}ms`}
                trimend={`${trimEnd}ms`}
                className="size-full object-contain"
              />
            </Timegroup>
          </Preview>
        </div>

        {/* Trim Bar */}
        <div className="border-t-4 border-black dark:border-white bg-[#111]">
          <div className="flex items-center">
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

            <div className="relative flex-1 h-16 overflow-hidden">
              <ThumbnailStrip
                targetElement={videoRef.current}
                use-intrinsic-duration
                thumbnail-height={64}
                className="absolute inset-0 pointer-events-none"
              />

              <TrimHandles
                trimStartMs={trimStart}
                trimEndMs={trimEnd}
                intrinsicDurationMs={totalDuration}
                onTrimChange={handleTrimChange}
                className="absolute inset-0"
                style={{
                  '--trim-handle-color': 'var(--poster-gold)',
                  '--trim-handle-active-color': 'var(--poster-gold)',
                  '--trim-overlay-color': 'rgba(0, 0, 0, 0.7)',
                } as React.CSSProperties}
              />
            </div>
          </div>
        </div>

        {/* Info Bar */}
        <div className="border-t-4 border-black dark:border-white bg-[#f5f5f5] dark:bg-[#111] px-4 py-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            {[
              { label: "In", value: inPoint, color: "text-[var(--poster-blue)]" },
              { label: "Duration", value: keptDuration, color: "text-black dark:text-white" },
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
