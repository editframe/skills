import { createElement, createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export interface RenderStats {
  currentFrame: number;
  totalFrames: number;
  renderedMs: number;
  totalDurationMs: number;
  speedMultiplier: number;
  estimatedRemainingMs: number;
  elapsedMs: number;
}

export interface RenderJob {
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

export interface EnqueueOpts {
  name: string;
  fileName: string;
  target: HTMLElement & { renderToVideo?: (opts: Record<string, unknown>) => Promise<Uint8Array | null> };
  renderOpts?: Record<string, unknown>;
}

export interface RenderQueueContextValue {
  jobs: RenderJob[];
  enqueue(opts: EnqueueOpts): void;
  cancel(id: string): void;
  remove(id: string): void;
  download(id: string): void;
}

export const RenderQueueCtx = createContext<RenderQueueContextValue | null>(null);

export function useRenderQueue(): RenderQueueContextValue {
  const ctx = useContext(RenderQueueCtx);
  if (!ctx) throw new Error("useRenderQueue must be used within RenderQueueProvider");
  return ctx;
}

/* ━━ Internal job state (not in React state — holds refs/fns) ━━━━━ */

interface InternalJob {
  id: string;
  fileName: string;
  target: HTMLElement & { renderToVideo?: (opts: Record<string, unknown>) => Promise<Uint8Array | null> };
  renderOpts: Record<string, unknown>;
  abortController: AbortController;
}

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

  return createElement(RenderQueueCtx.Provider, { value }, children);
}
