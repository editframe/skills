import { useId, useState, useRef } from "react";
import {
  Video, ThumbnailStrip, TrimHandles, TogglePlay, useMediaInfo,
  type TrimValue,
} from "@editframe/react";
import type { EFVideo } from "@editframe/elements";
import { useRenderQueue } from "../RenderQueue";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
}

const chevronStart = (
  <svg slot="handle-start" className="w-2 h-6 text-black/60" viewBox="0 0 8 24">
    <path d="M6 4L2 12L6 20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

const chevronEnd = (
  <svg slot="handle-end" className="w-2 h-6 text-black/60" viewBox="0 0 8 24">
    <path d="M2 4L6 12L2 20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

const playIcon = (
  <svg slot="play" className="w-4 h-4 text-white" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const pauseIcon = (
  <svg slot="pause" className="w-4 h-4 text-white" viewBox="0 0 24 24">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

const trimHandleStyles = {
  '--trim-handle-width': '16px',
  '--trim-handle-color': 'var(--poster-gold)',
  '--trim-handle-active-color': 'var(--poster-gold)',
  '--trim-handle-border-radius-start': '4px 0 0 4px',
  '--trim-handle-border-radius-end': '0 4px 4px 0',
  '--trim-overlay-color': 'rgba(0, 0, 0, 0.7)',
  '--trim-selected-border-color': 'var(--poster-gold)',
  '--trim-selected-border-width': '3px',
} as React.CSSProperties;

export function TrimTool() {
  const id = useId();
  const videoId = `trim-video-${id}`;
  const videoRef = useRef<EFVideo>(null);
  const { enqueue } = useRenderQueue();
  const { intrinsicDurationMs } = useMediaInfo(videoRef);

  const [trim, setTrim] = useState<TrimValue>({ startMs: 2000, endMs: 2000 });

  const totalDuration = intrinsicDurationMs ?? 0;
  const keptDuration = totalDuration - trim.startMs - trim.endMs;
  const inPoint = trim.startMs;
  const outPoint = totalDuration - trim.endMs;

  return (
    <div className="w-full max-w-xl">
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] overflow-hidden">
        {/* Header */}
        <div className="bg-black px-4 py-2 flex items-center justify-between">
          <span className="text-white text-xs font-bold uppercase tracking-widest">Trim Tool</span>
          <span className="text-white/50 text-[10px] font-mono uppercase">Demo</span>
        </div>

        {/* Video */}
        <div className="bg-[#111] aspect-video relative">
          <Video
            id={videoId}
            ref={videoRef}
            src={VIDEO_SRC}
            loop
            trimstart={`${trim.startMs}ms`}
            trimend={`${trim.endMs}ms`}
            className="size-full object-contain"
          />
        </div>

        {/* Trim Bar */}
        <div className="border-t-4 border-black dark:border-white bg-[#111]">
          <div className="flex items-center">
            <TogglePlay target={videoId}>
              <button slot="pause" className="w-10 h-16 flex items-center justify-center bg-black/80 hover:bg-black transition-colors border-r border-white/10">
                {pauseIcon}
              </button>
              <button slot="play" className="w-10 h-16 flex items-center justify-center bg-black/80 hover:bg-black transition-colors border-r border-white/10">
                {playIcon}
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
                value={trim}
                intrinsicDurationMs={totalDuration}
                seekTarget={videoId}
                onTrimChange={(e: Event) => setTrim((e as CustomEvent).detail.value)}
                className="absolute inset-0"
                style={trimHandleStyles}
              >
                {chevronStart}
                {chevronEnd}
              </TrimHandles>
            </div>
          </div>
        </div>

        {/* Info Bar */}
        <div className="border-t-4 border-black dark:border-white bg-[#f5f5f5] dark:bg-[#111] px-4 py-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1 text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 mb-0.5">In</div>
              <div className="text-xs font-mono font-bold text-[var(--poster-blue)]">{formatTime(inPoint)}</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 mb-0.5">Duration</div>
              <div className="text-xs font-mono font-bold text-black dark:text-white">{formatTime(keptDuration)}</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 mb-0.5">Out</div>
              <div className="text-xs font-mono font-bold text-[var(--poster-red)]">{formatTime(outPoint)}</div>
            </div>
          </div>

          <button
            onClick={() => {
              if (videoRef.current) {
                enqueue({
                  name: "Trimmed Video",
                  fileName: `trimmed-${formatTime(inPoint)}-${formatTime(outPoint)}.mp4`,
                  timegroupEl: videoRef.current as unknown as HTMLElement,
                  renderOpts: { includeAudio: true },
                });
              }
            }}
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
