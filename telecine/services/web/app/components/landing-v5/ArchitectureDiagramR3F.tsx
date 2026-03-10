// @ts-nocheck - React Three Fiber JSX intrinsics
/**
 * R3F-heavy diagram components (Three.js + @react-three/fiber).
 * Split into a separate module so ArchitectureDiagram.tsx can lazy-import
 * these without pulling Three.js into the initial bundle.
 */

import { useId, useRef } from "react";
import {
  Preview,
  TimelineRoot,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";
import { ExportButton } from "./ExportButton";
import { ParallelFragmentsCanvas } from "./parallel-fragments-r3f";
import { JITStreamingTimeline } from "./JITStreamingTimeline";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PARALLEL FRAGMENTS — Three.js 3D visualization
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function FanOutContent() {
  return <ParallelFragmentsCanvas />;
}

export function FanOutDiagram() {
  const uid = useId();
  const rootId = `fanout-${uid}`;
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef}>
      <Preview id={rootId} loop>
        <TimelineRoot id={rootId} component={FanOutContent} />
      </Preview>

      <div
        className="flex items-center gap-0 bg-[#111] overflow-hidden"
        style={{ borderRadius: "0 0 3px 3px" }}
      >
        <TogglePlay target={rootId}>
          <button
            slot="play"
            aria-label="Play parallel fragments animation"
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <button
            slot="pause"
            aria-label="Pause parallel fragments animation"
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </button>
        </TogglePlay>

        <div className="flex-1 px-3 h-9 flex items-center border-l border-white/10">
          <Scrubber
            target={rootId}
            className="w-full h-1 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--poster-blue)] [&::part(progress)]:rounded-full [&::part(handle)]:bg-white [&::part(handle)]:w-2.5 [&::part(handle)]:h-2.5 [&::part(handle)]:rounded-full"
          />
        </div>

        <div className="px-3 border-l border-white/10 h-9 flex items-center">
          <TimeDisplay
            target={rootId}
            className="text-[10px] text-white/60 font-mono tabular-nums"
          />
        </div>

        <ExportButton
          compact
          getTarget={() =>
            containerRef.current?.querySelector("ef-timegroup") as HTMLElement
          }
          name="Parallel Rendering"
          fileName="editframe-parallel-rendering.mp4"
          className="border-l border-white/10"
        />
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   JIT STREAMING PLAYBACK — React Three Fiber visualization
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function JITStreamingDiagram() {
  const uid = useId();
  const rootId = `jit-streaming-${uid}`;
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef}>
      <Preview id={rootId} loop>
        <TimelineRoot id={rootId} component={JITStreamingTimeline} />
      </Preview>

      <div
        className="flex items-center gap-0 bg-[#111] overflow-hidden"
        style={{ borderRadius: "0 0 3px 3px" }}
      >
        <TogglePlay target={rootId}>
          <button
            slot="play"
            aria-label="Play JIT streaming animation"
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <button
            slot="pause"
            aria-label="Pause JIT streaming animation"
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </button>
        </TogglePlay>

        <div className="flex-1 px-3 h-9 flex items-center border-l border-white/10">
          <Scrubber
            target={rootId}
            className="w-full h-1 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--poster-red)] [&::part(progress)]:rounded-full [&::part(handle)]:bg-white [&::part(handle)]:w-2.5 [&::part(handle)]:h-2.5 [&::part(handle)]:rounded-full"
          />
        </div>

        <div className="px-3 border-l border-white/10 h-9 flex items-center">
          <TimeDisplay
            target={rootId}
            className="text-[10px] text-white/60 font-mono tabular-nums"
          />
        </div>

        <ExportButton
          compact
          getTarget={() =>
            containerRef.current?.querySelector("ef-timegroup") as HTMLElement
          }
          name="JIT Streaming"
          fileName="editframe-jit-streaming.mp4"
          className="border-l border-white/10"
        />
      </div>
    </div>
  );
}
