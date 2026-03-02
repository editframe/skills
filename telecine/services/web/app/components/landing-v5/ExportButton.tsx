import { useState, useCallback } from "react";
import { useRenderQueue } from "./RenderQueue";

interface ExportButtonProps {
  getTarget: () => HTMLElement | null;
  name: string;
  fileName: string;
  renderOpts?: Record<string, unknown>;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  getTarget,
  name,
  fileName,
  renderOpts,
  label = "Export MP4",
  compact = false,
  disabled = false,
  className = "",
}: ExportButtonProps) {
  const { enqueue } = useRenderQueue();
  const [queued, setQueued] = useState(false);

  const handleClick = useCallback(() => {
    const target = getTarget();
    if (!target) return;

    enqueue({
      name,
      fileName,
      target: target as HTMLElement & { renderToVideo?: (opts: Record<string, unknown>) => Promise<Uint8Array | null> },
      renderOpts,
    });

    setQueued(true);
    setTimeout(() => setQueued(false), 1500);
  }, [getTarget, name, fileName, renderOpts, enqueue]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled || queued}
      className={`
        group relative flex items-center justify-center gap-2 transition-all
        ${compact ? "px-3" : "w-full py-3"}
        ${queued
          ? "bg-[var(--poster-blue)]"
          : "hover:brightness-125"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      style={queued ? undefined : {
        background: "rgba(17,17,17,0.92)",
        backdropFilter: "blur(12px)",
      }}
      title={label}
    >
      {queued ? (
        <>
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Queued
          </span>
        </>
      ) : (
        <>
          {/* Film-frame icon — matches render queue panel header */}
          <svg className="w-4 h-4 text-[var(--poster-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4" />
          </svg>
          <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
            {label}
          </span>
        </>
      )}

      {/* Subtle top-edge accent line matching poster-blue */}
      {!compact && !queued && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--poster-blue)]"
        />
      )}
    </button>
  );
}
