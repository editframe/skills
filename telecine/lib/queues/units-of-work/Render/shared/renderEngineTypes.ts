import type { FramegenEngine } from "@/render/engines/FramegenEngine";

// Minimal interface for render operations - avoids importing concrete engine types
export interface RenderEngineContext extends FramegenEngine {
  getRenderInfo(): Promise<{
    width: number;
    height: number;
    durationMs: number;
    fps: number;
    assets: { efMediaSrcs: string[]; efImageSrcs: string[] };
  }>;
  resize(width: number, height: number): Promise<void>;
}
