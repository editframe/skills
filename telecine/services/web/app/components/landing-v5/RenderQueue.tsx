import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ━━ Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  return `${seconds}s`;
}

/* ━━ Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface RenderStats {
  currentFrame: number;
  totalFrames: number;
  renderedMs: number;
  totalDurationMs: number;
  speedMultiplier: number;
  estimatedRemainingMs: number;
  elapsedMs: number;
}

interface RenderJob {
  id: string;
  name: string;
  fileName: string;
  status: "queued" | "rendering" | "complete" | "error";
  progress: number;
  stats: RenderStats | null;
  previewFrame: string | null;
  downloadUrl: string | null;
  error: string | null;
}

interface EnqueueOpts {
  name: string;
  fileName: string;
  target: HTMLElement & { renderToVideo?: (opts: Record<string, unknown>) => Promise<Uint8Array | null> };
  renderOpts?: Record<string, unknown>;
}

interface RenderQueueContextValue {
  jobs: RenderJob[];
  enqueue(opts: EnqueueOpts): void;
  cancel(id: string): void;
  remove(id: string): void;
  download(id: string): void;
}

/* ━━ Internal job state (not in React state — holds refs/fns) ━━━━━ */

interface InternalJob {
  id: string;
  fileName: string;
  target: HTMLElement & { renderToVideo?: (opts: Record<string, unknown>) => Promise<Uint8Array | null> };
  renderOpts: Record<string, unknown>;
  abortController: AbortController;
}

/* ━━ Context ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const RenderQueueCtx = createContext<RenderQueueContextValue | null>(null);

export function useRenderQueue(): RenderQueueContextValue {
  const ctx = useContext(RenderQueueCtx);
  if (!ctx) throw new Error("useRenderQueue must be used within RenderQueueProvider");
  return ctx;
}

/* ━━ Provider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const MAX_CONCURRENT = 2;
let nextId = 0;

export function RenderQueueProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const internalsRef = useRef<Map<string, InternalJob>>(new Map());
  const processingRef = useRef(false);

  const updateJob = useCallback((id: string, patch: Partial<RenderJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const enqueue = useCallback((opts: EnqueueOpts) => {
    const id = `render-${++nextId}`;
    const abortController = new AbortController();

    internalsRef.current.set(id, {
      id,
      fileName: opts.fileName,
      target: opts.target,
      renderOpts: opts.renderOpts ?? {},
      abortController,
    });

    setJobs((prev) => [
      ...prev,
      {
        id,
        name: opts.name,
        fileName: opts.fileName,
        status: "queued",
        progress: 0,
        stats: null,
        previewFrame: null,
        downloadUrl: null,
        error: null,
      },
    ]);
  }, []);

  const cancel = useCallback((id: string) => {
    const internal = internalsRef.current.get(id);
    if (internal) {
      internal.abortController.abort();
      internalsRef.current.delete(id);
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const remove = useCallback((id: string) => {
    setJobs((prev) => {
      const job = prev.find((j) => j.id === id);
      if (job?.downloadUrl) URL.revokeObjectURL(job.downloadUrl);
      return prev.filter((j) => j.id !== id);
    });
    internalsRef.current.delete(id);
  }, []);

  const download = useCallback((id: string) => {
    setJobs((prev) => {
      const job = prev.find((j) => j.id === id);
      if (job?.downloadUrl) {
        const a = document.createElement("a");
        a.href = job.downloadUrl;
        a.download = job.fileName;
        a.click();
      }
      return prev;
    });
  }, []);

  // Process queue: start next queued job if under concurrency limit
  useEffect(() => {
    if (processingRef.current) return;

    const rendering = jobs.filter((j) => j.status === "rendering").length;
    const nextQueued = jobs.find((j) => j.status === "queued");

    if (rendering >= MAX_CONCURRENT || !nextQueued) return;

    const internal = internalsRef.current.get(nextQueued.id);
    if (!internal) return;

    processingRef.current = true;
    updateJob(nextQueued.id, { status: "rendering", progress: 0 });

    const tg = internal.target as HTMLElement & {
      pause?: () => void;
      renderToVideo?: (opts: Record<string, unknown>) => Promise<ArrayBuffer | null>;
    };

    if (!tg?.renderToVideo) {
      updateJob(nextQueued.id, {
        status: "error",
        error: "Element does not support rendering. Expected an <ef-timegroup> or <ef-video> element.",
      });
      processingRef.current = false;
      return;
    }

    tg.pause?.();

    const jobId = nextQueued.id;
    let lastProgressFlush = 0;
    let pendingPatch: Partial<RenderJob> | null = null;
    let pendingPreviewCanvas: HTMLCanvasElement | null = null;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const PROGRESS_THROTTLE_MS = 200;

    const flushProgress = () => {
      flushTimer = null;
      if (pendingPatch) {
        // Only encode thumbnail when actually flushing to React state
        // (toDataURL is expensive — avoid calling it 30x/sec)
        if (pendingPreviewCanvas) {
          pendingPatch.previewFrame = pendingPreviewCanvas.toDataURL("image/jpeg", 0.5);
          pendingPreviewCanvas = null;
        }
        updateJob(jobId, pendingPatch);
        pendingPatch = null;
        lastProgressFlush = performance.now();
      }
    };

    tg.renderToVideo({
      fps: 30,
      codec: "avc",
      bitrate: 4_000_000,
      scale: 1,
      filename: internal.fileName,
      returnBuffer: true,
      streaming: false,
      signal: internal.abortController.signal,
      progressPreviewInterval: 15,
      onProgress: (p: {
        progress: number;
        currentFrame: number;
        totalFrames: number;
        renderedMs: number;
        totalDurationMs: number;
        elapsedMs: number;
        estimatedRemainingMs: number;
        speedMultiplier: number;
        framePreviewCanvas?: HTMLCanvasElement;
      }) => {
        const patch: Partial<RenderJob> = {
          progress: p.progress,
          stats: {
            currentFrame: p.currentFrame,
            totalFrames: p.totalFrames,
            renderedMs: p.renderedMs,
            totalDurationMs: p.totalDurationMs,
            speedMultiplier: p.speedMultiplier,
            estimatedRemainingMs: p.estimatedRemainingMs,
            elapsedMs: p.elapsedMs,
          },
        };
        if (p.framePreviewCanvas) {
          pendingPreviewCanvas = p.framePreviewCanvas;
        }
        pendingPatch = patch;

        const now = performance.now();
        if (now - lastProgressFlush >= PROGRESS_THROTTLE_MS) {
          flushProgress();
        } else if (!flushTimer) {
          flushTimer = setTimeout(flushProgress, PROGRESS_THROTTLE_MS - (now - lastProgressFlush));
        }
      },
      ...internal.renderOpts,
    })
      .then((buffer) => {
        if (flushTimer) clearTimeout(flushTimer);
        if (buffer) {
          const url = URL.createObjectURL(new Blob([buffer], { type: "video/mp4" }));
          updateJob(jobId, { status: "complete", progress: 1, downloadUrl: url });
        }
      })
      .catch((err: Error) => {
        if (flushTimer) clearTimeout(flushTimer);
        if (err.name !== "AbortError") {
          updateJob(jobId, { status: "error", error: err.message || "Render failed" });
        }
      })
      .finally(() => {
        processingRef.current = false;
      });
  }, [jobs, updateJob]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      for (const job of jobs) {
        if (job.downloadUrl) URL.revokeObjectURL(job.downloadUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: RenderQueueContextValue = { jobs, enqueue, cancel, remove, download };

  return <RenderQueueCtx.Provider value={value}>{children}</RenderQueueCtx.Provider>;
}

/* ━━ Floating Panel ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function RenderQueuePanel() {
  const { jobs, cancel, remove, download } = useRenderQueue();
  const [minimized, setMinimized] = useState(false);

  if (jobs.length === 0) return null;

  const activeCount = jobs.filter((j) => j.status === "rendering" || j.status === "queued").length;
  const completedCount = jobs.filter((j) => j.status === "complete").length;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-72 overflow-hidden"
      style={{
        background: "rgba(17,17,17,0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setMinimized((m) => !m)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4" />
          </svg>
          <span className="text-xs font-semibold text-white/90 tracking-wide">Browser Renders</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold text-white bg-[var(--poster-blue)] px-1.5 py-0.5 rounded-full leading-none">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 text-white/50 transition-transform ${minimized ? "" : "rotate-180"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Job list */}
      {!minimized && (
        <div className="border-t border-white/10">
          {jobs.map((job) => (
            <div key={job.id} className={`px-3 py-2.5 border-b border-white/5 last:border-b-0 ${job.status === "complete" ? "bg-[#4CAF50]/10" : ""}`}>

              {/* ── Queued ─────────────────────────────────────────── */}
              {job.status === "queued" && (
                <>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-medium text-white/80 truncate flex-1 mr-2">{job.name}</span>
                    <span className="text-[10px] text-white/40">Queued</span>
                  </div>
                  <div className="text-[9px] text-white/30 truncate mb-1">{job.fileName}</div>
                  <div className="h-1 bg-white/10 rounded-full" />
                </>
              )}

              {/* ── Rendering ──────────────────────────────────────── */}
              {job.status === "rendering" && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-white/80 truncate flex-1 mr-2">{job.name}</span>
                    {job.progress >= 0.99 ? (
                      <span className="text-[10px] text-[var(--poster-gold)] font-semibold animate-pulse">Finishing...</span>
                    ) : (
                      <span className="text-[10px] text-[var(--poster-blue)] font-mono tabular-nums">
                        {(job.progress * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {job.previewFrame && (
                    <div className="mb-1.5 rounded overflow-hidden bg-black/30">
                      <img src={job.previewFrame} alt="" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  {job.stats && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-1.5 font-mono text-[10px] tabular-nums">
                      <div>
                        <div className="text-white/30">Frames</div>
                        <div className="text-white/70">{job.stats.currentFrame} / {job.stats.totalFrames}</div>
                      </div>
                      <div>
                        <div className="text-white/30">Time</div>
                        <div className="text-white/70">{formatTime(job.stats.renderedMs)} / {formatTime(job.stats.totalDurationMs)}</div>
                      </div>
                      <div>
                        <div className="text-white/30">Speed</div>
                        <div className={job.stats.speedMultiplier >= 1 ? "text-green-400" : "text-amber-400"}>
                          {job.stats.speedMultiplier.toFixed(2)}x
                        </div>
                      </div>
                      <div>
                        <div className="text-white/30">ETA</div>
                        <div className="text-white/70">{formatTime(job.stats.estimatedRemainingMs)}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${job.progress >= 0.99 ? "bg-[var(--poster-gold)]" : "bg-[var(--poster-blue)]"}`}
                        style={{ width: `${job.progress * 100}%` }}
                      />
                    </div>
                    <button
                      onClick={() => cancel(job.id)}
                      className="text-white/30 hover:text-white/70 transition-colors"
                      title="Cancel"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </>
              )}

              {/* ── Complete — prominent success state ─────────────── */}
              {job.status === "complete" && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-[#4CAF50] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <span className="text-[11px] font-semibold text-[#4CAF50] truncate flex-1">{job.name}</span>
                    <button
                      onClick={() => remove(job.id)}
                      className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
                      title="Remove"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Play in browser */}
                    {job.downloadUrl && (
                      <a
                        href={job.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-white/10 hover:bg-white/15 transition-colors text-[10px] font-semibold text-white/80"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        Play
                      </a>
                    )}
                    {/* Download */}
                    <button
                      onClick={() => download(job.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-[#4CAF50] hover:bg-[#43A047] transition-colors text-[10px] font-bold text-white"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                      </svg>
                      Download .mp4
                    </button>
                  </div>
                </>
              )}

              {/* ── Error ──────────────────────────────────────────── */}
              {job.status === "error" && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-red-400 truncate flex-1 mr-2">{job.name}</span>
                    <button
                      onClick={() => remove(job.id)}
                      className="text-white/20 hover:text-white/50 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <span className="text-[10px] text-red-400/60">{job.error}</span>
                </>
              )}
            </div>
          ))}

          {/* Clear completed */}
          {completedCount > 0 && (
            <div className="px-3 py-1.5 border-t border-white/10">
              <button
                onClick={() => {
                  jobs.filter((j) => j.status === "complete").forEach((j) => remove(j.id));
                }}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                Clear completed
              </button>
            </div>
          )}

          {/* Browser indicator + cloud upsell */}
          <div className="px-3 py-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3 h-3 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-[9px] text-white/30 leading-tight">
                Rendering locally in your browser via WebCodecs
              </span>
            </div>
            <a
              href="/skills"
              className="block w-full text-center py-1.5 rounded text-[10px] font-semibold bg-[var(--poster-blue)]/20 text-[var(--poster-blue)] hover:bg-[var(--poster-blue)]/30 transition-colors"
            >
              {"Upgrade to cloud \u2192 render in parallel"}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
