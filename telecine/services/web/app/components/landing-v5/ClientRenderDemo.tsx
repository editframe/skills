/* ==============================================================================
   COMPONENT: ClientRenderDemo
   
   Purpose: Demonstrate client-side video rendering capabilities.
   Shows composition preview with real-time export to MP4 in the browser.
   ============================================================================== */

import { useState, useEffect, useRef, useCallback, useId } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Text,
  TogglePlay,
  Scrubber,
  TimeDisplay,
} from "@editframe/react";

interface RenderProgress {
  progress: number;
  currentFrame: number;
  totalFrames: number;
  renderedMs: number;
  totalDurationMs: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  speedMultiplier: number;
  framePreviewCanvas?: HTMLCanvasElement;
}

type RenderState = "idle" | "preparing" | "rendering" | "complete" | "error";

export function ClientRenderDemo() {
  const id = useId();
  const previewId = `client-render-${id}`;
  
  const [isClient, setIsClient] = useState(false);
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const previewRef = useRef<HTMLElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    setIsClient(true);
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);
  
  const handleExport = useCallback(async () => {
    if (!previewRef.current) return;
    
    const timegroup = previewRef.current.querySelector("ef-timegroup") as any;
    if (!timegroup?.renderToVideo) {
      setError("Rendering not supported in this browser");
      return;
    }
    
    setRenderState("preparing");
    setProgress(null);
    setPreviewFrame(null);
    setDownloadUrl(null);
    setError(null);
    
    abortControllerRef.current = new AbortController();
    
    try {
      timegroup.pause?.();
      setRenderState("rendering");
      
      const buffer = await timegroup.renderToVideo({
        fps: 30,
        codec: "avc",
        bitrate: 4_000_000,
        scale: 1,
        includeAudio: true,
        returnBuffer: true,
        signal: abortControllerRef.current.signal,
        progressPreviewInterval: 30,
        onProgress: (prog: RenderProgress) => {
          setProgress(prog);
          if (prog.framePreviewCanvas) {
            setPreviewFrame(prog.framePreviewCanvas.toDataURL("image/jpeg", 0.8));
          }
        },
      });
      
      if (buffer) {
        const blob = new Blob([buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setRenderState("complete");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setRenderState("idle");
      } else {
        setError(err.message || "Render failed");
        setRenderState("error");
      }
    }
  }, []);
  
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setRenderState("idle");
  }, []);
  
  const handleDownload = useCallback(() => {
    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "editframe-export.mp4";
      a.click();
    }
  }, [downloadUrl]);
  
  const handleReset = useCallback(() => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setRenderState("idle");
    setProgress(null);
    setPreviewFrame(null);
    setDownloadUrl(null);
    setError(null);
  }, [downloadUrl]);

  return (
    <div className="w-full max-w-lg">
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] overflow-hidden shadow-poster-hard">
        {/* Video Preview */}
        <div className="bg-black aspect-video relative">
          {isClient ? (
            <Preview
              id={previewId}
              ref={previewRef as any}
              loop
              className="w-full h-full"
            >
              <Timegroup mode="fixed" duration="5s" className="w-full h-full relative">
                <Video
                  src="/samples/demo.mp4"
                  duration="5s"
                  className="w-full h-full object-cover"
                />
                <Text className="absolute bottom-6 inset-x-4 text-white text-xl font-bold text-center drop-shadow-lg">
                  RENDERED IN BROWSER
                </Text>
              </Timegroup>
            </Preview>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/50 text-xs uppercase tracking-wider">Loading...</span>
            </div>
          )}
          
          {/* Render preview overlay */}
          {renderState === "rendering" && previewFrame && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
              <img src={previewFrame} alt="Render preview" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          
          {/* Progress overlay */}
          {renderState === "rendering" && progress && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
              <div className="flex items-center justify-between text-xs text-white mb-2">
                <span className="font-bold uppercase tracking-wider">Rendering</span>
                <span className="font-mono">{(progress.progress * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-white/20 overflow-hidden">
                <div className="h-full bg-white transition-all duration-200" style={{ width: `${progress.progress * 100}%` }} />
              </div>
            </div>
          )}
          
          {/* Complete overlay */}
          {renderState === "complete" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-bold uppercase tracking-wider">Ready to download</p>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="border-t-4 border-black dark:border-white bg-[#111]">
          {isClient && renderState === "idle" ? (
            <div className="flex items-center">
              <TogglePlay target={previewId}>
                <button slot="pause" className="w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
                <button slot="play" className="w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </TogglePlay>
              
              <div className="flex-1 px-4 h-12 flex items-center">
                <Scrubber
                  target={previewId}
                  className="w-full h-1.5 bg-white/20 cursor-pointer [&::part(progress)]:bg-white [&::part(thumb)]:bg-white [&::part(thumb)]:w-3 [&::part(thumb)]:h-3"
                />
              </div>
              
              <div className="px-3 h-12 flex items-center border-l border-white/20">
                <TimeDisplay target={previewId} className="text-xs text-white/70 font-mono tabular-nums" />
              </div>
            </div>
          ) : (
            <div className="flex items-center h-12">
              <div className="w-12 h-12 flex items-center justify-center bg-white/10">
                <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex-1 px-4">
                <div className="w-full h-1.5 bg-white/20" />
              </div>
              <div className="px-3 border-l border-white/20 h-12 flex items-center">
                <span className="text-xs text-white/50 font-mono">0:00</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Export Button / Status */}
        <div className="border-t-4 border-black dark:border-white p-4 bg-white dark:bg-[#1a1a1a]">
          {renderState === "idle" && (
            <button
              onClick={handleExport}
              disabled={!isClient}
              className="w-full py-3 bg-[var(--poster-red)] text-white font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Export MP4
            </button>
          )}
          
          {renderState === "preparing" && (
            <div className="flex items-center justify-center gap-3 py-3">
              <div className="w-5 h-5 border-2 border-[var(--poster-gold)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">Preparing...</span>
            </div>
          )}
          
          {renderState === "rendering" && progress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-black/60 dark:text-white/60">
                  Frame {progress.currentFrame}/{progress.totalFrames}
                </span>
                <span className="font-mono text-black/60 dark:text-white/60">
                  {progress.speedMultiplier.toFixed(1)}x speed
                </span>
              </div>
              <button
                onClick={handleCancel}
                className="w-full py-2 border-2 border-black dark:border-white text-black dark:text-white font-bold uppercase tracking-wider text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          
          {renderState === "complete" && (
            <div className="space-y-2">
              <button
                onClick={handleDownload}
                className="w-full py-3 bg-[#4CAF50] text-white font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                Download MP4
              </button>
              <button
                onClick={handleReset}
                className="w-full py-2 text-black/50 dark:text-white/50 font-bold uppercase tracking-wider text-xs hover:text-black dark:hover:text-white transition-colors"
              >
                Export again
              </button>
            </div>
          )}
          
          {renderState === "error" && (
            <div className="space-y-2">
              <p className="text-center text-sm text-[var(--poster-red)] font-bold">{error || "Export failed"}</p>
              <button
                onClick={handleReset}
                className="w-full py-2 border-2 border-black dark:border-white text-black dark:text-white font-bold uppercase tracking-wider text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
        
        {/* Specs Footer */}
        <div className="border-t border-black/10 dark:border-white/10 px-4 py-2 bg-black/5 dark:bg-white/5">
          <div className="flex items-center justify-between text-[10px] text-black/40 dark:text-white/40 uppercase tracking-wider">
            <span>30fps • H.264 • 4Mbps</span>
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Local only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientRenderDemo;
