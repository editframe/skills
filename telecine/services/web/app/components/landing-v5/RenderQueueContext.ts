import { createContext, useContext } from "react";

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
