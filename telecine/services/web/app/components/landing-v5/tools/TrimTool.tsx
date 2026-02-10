import { useId, useState, useRef } from "react";
import {
  Video,
  ThumbnailStrip,
  TrimHandles,
  TogglePlay,
  useMediaInfo,
  type TrimValue,
} from "@editframe/react";
import type { EFVideo, TrimChangeDetail } from "@editframe/elements";
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
      <div className="overflow-hidden border-4 border-black bg-white dark:border-white dark:bg-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center justify-between bg-black px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-widest text-white">
            Trim Tool
          </span>
          <span className="font-mono text-[10px] uppercase text-white/50">
            Demo
          </span>
        </div>

        {/* Video */}
        <div className="aspect-video relative bg-[#111]">
          <Video
            id={videoId}
            ref={videoRef}
            src={VIDEO_SRC}
            loop
            trimStartMs={trim.startMs}
            trimEndMs={trim.endMs}
            className="size-full object-contain"
          />
        </div>

        {/* Trim Bar */}
        <div className="border-t-4 border-black bg-[#111] dark:border-white">
          <div className="flex items-center">
            <TogglePlay target={videoId}>
              <button
                slot="pause"
                className="flex h-16 w-10 items-center justify-center border-r border-white/10 bg-black/80 transition-colors hover:bg-black"
              >
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              </button>
              <button
                slot="play"
                className="flex h-16 w-10 items-center justify-center border-r border-white/10 bg-black/80 transition-colors hover:bg-black"
              >
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </TogglePlay>

            <div className="relative h-16 flex-1 overflow-hidden">
              <ThumbnailStrip
                targetElement={videoRef.current}
                useIntrinsicDuration
                thumbnailHeight={64}
                className="pointer-events-none absolute inset-0"
              />

              <TrimHandles
                value={trim}
                intrinsicDurationMs={totalDuration}
                seekTarget={videoId}
                onTrimChange={(event) =>
                  setTrim(event.detail.value)
                }
                className="absolute inset-0"
                style={
                  {
                    "--trim-handle-width": "16px",
                    "--trim-handle-color": "var(--poster-gold)",
                    "--trim-handle-active-color": "var(--poster-gold)",
                    "--trim-handle-border-radius-start": "4px 0 0 4px",
                    "--trim-handle-border-radius-end": "0 4px 4px 0",
                    "--trim-overlay-color": "rgba(0, 0, 0, 0.7)",
                    "--trim-selected-border-color": "var(--poster-gold)",
                    "--trim-selected-border-width": "3px",
                  } as React.CSSProperties
                }
              >
                <svg
                  slot="handle-start"
                  className="h-6 w-2 text-black/60"
                  viewBox="0 0 8 24"
                >
                  <path
                    d="M6 4L2 12L6 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <svg
                  slot="handle-end"
                  className="h-6 w-2 text-black/60"
                  viewBox="0 0 8 24"
                >
                  <path
                    d="M2 4L6 12L2 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </TrimHandles>
            </div>
          </div>
        </div>

        {/* Info Bar */}
        <div className="border-t-4 border-black bg-[#f5f5f5] px-4 py-2 dark:border-white dark:bg-[#111]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                In
              </div>
              <div className="font-mono text-xs font-bold text-[var(--poster-blue)]">
                {formatTime(inPoint)}
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                Duration
              </div>
              <div className="font-mono text-xs font-bold text-black dark:text-white">
                {formatTime(keptDuration)}
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                Out
              </div>
              <div className="font-mono text-xs font-bold text-[var(--poster-red)]">
                {formatTime(outPoint)}
              </div>
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
            className="w-full border-2 border-black bg-[var(--poster-red)] py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white"
          >
            Export Clip
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrimTool;
