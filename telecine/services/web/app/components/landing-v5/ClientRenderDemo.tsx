/* ==============================================================================
   COMPONENT: ClientRenderDemo
   
   Purpose: Demonstrate client-side video rendering capabilities.
   Shows composition preview with real-time export to MP4 in the browser.
   
   This is a KEY differentiator - no server needed for rendering!
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
      // Cleanup download URL on unmount
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
    
    // Reset state
    setRenderState("preparing");
    setProgress(null);
    setPreviewFrame(null);
    setDownloadUrl(null);
    setError(null);
    
    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      // Pause playback during render
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
          
          // Update frame preview
          if (prog.framePreviewCanvas) {
            setPreviewFrame(prog.framePreviewCanvas.toDataURL("image/jpeg", 0.8));
          }
        },
      });
      
      if (buffer) {
        // Create download URL
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
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full">
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--poster-red)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--poster-red)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            </div>
            <span className="text-white text-sm font-bold uppercase tracking-widest">
              Client-Side Export
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-xs font-mono uppercase">
              No server required
            </span>
            <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid md:grid-cols-2">
          {/* Preview Panel */}
          <div className="border-r-4 border-black dark:border-white">
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
                      RENDERED IN YOUR BROWSER
                    </Text>
                  </Timegroup>
                </Preview>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white/50 text-xs uppercase tracking-wider">
                    Loading...
                  </span>
                </div>
              )}
              
              {/* Render preview overlay */}
              {renderState === "rendering" && previewFrame && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <img 
                    src={previewFrame} 
                    alt="Render preview" 
                    className="max-w-full max-h-full object-contain opacity-80"
                  />
                </div>
              )}
            </div>
            
            {/* Playback Controls */}
            <div className="border-t-4 border-black dark:border-white bg-[#111]">
              {isClient && renderState === "idle" ? (
                <div className="flex items-center">
                  <TogglePlay target={previewId}>
                    <button
                      slot="pause"
                      className="w-12 h-12 flex items-center justify-center bg-[var(--poster-red)]"
                    >
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    </button>
                    <button
                      slot="play"
                      className="w-12 h-12 flex items-center justify-center bg-[var(--poster-blue)]"
                    >
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </TogglePlay>
                  
                  <div className="flex-1 px-4 h-12 flex items-center border-l-4 border-black dark:border-white">
                    <Scrubber
                      target={previewId}
                      className="w-full h-2 bg-white/20 cursor-pointer [&::part(progress)]:bg-[var(--poster-red)] [&::part(thumb)]:bg-white [&::part(thumb)]:w-4 [&::part(thumb)]:h-4"
                    />
                  </div>
                  
                  <div className="px-3 border-l-4 border-black dark:border-white h-12 flex items-center">
                    <TimeDisplay
                      target={previewId}
                      className="text-xs text-white font-mono tabular-nums"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center h-12">
                  <div className="w-12 h-12 flex items-center justify-center bg-[var(--poster-blue)]">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                    <div className="w-full h-2 bg-white/20" />
                  </div>
                  <div className="px-3 border-l-4 border-black dark:border-white h-12 flex items-center">
                    <span className="text-xs text-white font-mono">0:00</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Export Panel */}
          <div className="flex flex-col">
            {/* Export Header */}
            <div className="border-b-4 border-black dark:border-white px-4 py-2 bg-[var(--poster-gold)]">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Export to MP4
              </span>
            </div>
            
            {/* Export Content */}
            <div className="flex-1 p-4 flex flex-col justify-center">
              {renderState === "idle" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[var(--poster-red)]/10 dark:bg-[var(--poster-red)]/20 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-[var(--poster-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-sm text-black/60 dark:text-white/60 mb-4">
                      Export video directly in your browser.<br />
                      <span className="font-bold text-[var(--poster-red)]">No upload. No server. Instant.</span>
                    </p>
                  </div>
                  
                  <button
                    onClick={handleExport}
                    disabled={!isClient}
                    className="w-full py-4 bg-[var(--poster-red)] border-4 border-black dark:border-white text-white font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all disabled:opacity-50 shadow-poster-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  >
                    Export MP4
                  </button>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-black/5 dark:bg-white/5 p-2">
                      <div className="font-bold text-black dark:text-white">30 fps</div>
                      <div className="text-black/50 dark:text-white/50">Frame Rate</div>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 p-2">
                      <div className="font-bold text-black dark:text-white">H.264</div>
                      <div className="text-black/50 dark:text-white/50">Codec</div>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 p-2">
                      <div className="font-bold text-black dark:text-white">4 Mbps</div>
                      <div className="text-black/50 dark:text-white/50">Bitrate</div>
                    </div>
                  </div>
                </div>
              )}
              
              {renderState === "preparing" && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-4 border-4 border-[var(--poster-gold)] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
                    Preparing render...
                  </p>
                </div>
              )}
              
              {renderState === "rendering" && progress && (
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-black dark:text-white">Rendering</span>
                      <span className="text-[var(--poster-red)]">
                        {(progress.progress * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-[var(--poster-red)] transition-all duration-200"
                        style={{ width: `${progress.progress * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-black/5 dark:bg-white/5 p-2">
                      <div className="font-mono text-black dark:text-white">
                        {progress.currentFrame}/{progress.totalFrames}
                      </div>
                      <div className="text-black/50 dark:text-white/50 uppercase">Frames</div>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 p-2">
                      <div className="font-mono text-black dark:text-white">
                        {progress.speedMultiplier.toFixed(1)}x
                      </div>
                      <div className="text-black/50 dark:text-white/50 uppercase">Speed</div>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 p-2">
                      <div className="font-mono text-black dark:text-white">
                        {formatTime(progress.elapsedMs)}
                      </div>
                      <div className="text-black/50 dark:text-white/50 uppercase">Elapsed</div>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 p-2">
                      <div className="font-mono text-black dark:text-white">
                        ~{formatTime(progress.estimatedRemainingMs)}
                      </div>
                      <div className="text-black/50 dark:text-white/50 uppercase">Remaining</div>
                    </div>
                  </div>
                  
                  {/* Cancel Button */}
                  <button
                    onClick={handleCancel}
                    className="w-full py-2 border-2 border-black dark:border-white text-black dark:text-white font-bold uppercase tracking-wider text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              {renderState === "complete" && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-[#4CAF50] rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <div>
                    <p className="font-bold uppercase tracking-wider text-black dark:text-white mb-1">
                      Export Complete!
                    </p>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      Rendered entirely in your browser
                    </p>
                  </div>
                  
                  <button
                    onClick={handleDownload}
                    className="w-full py-4 bg-[#4CAF50] border-4 border-black dark:border-white text-white font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all shadow-poster-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  >
                    Download MP4
                  </button>
                  
                  <button
                    onClick={handleReset}
                    className="w-full py-2 border-2 border-black dark:border-white text-black dark:text-white font-bold uppercase tracking-wider text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                  >
                    Export Again
                  </button>
                </div>
              )}
              
              {renderState === "error" && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-[var(--poster-red)] rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[var(--poster-red)] mb-1">
                      Export Failed
                    </p>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      {error || "Something went wrong"}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleReset}
                    className="w-full py-3 border-2 border-black dark:border-white text-black dark:text-white font-bold uppercase tracking-wider text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t-4 border-black dark:border-white px-4 py-3 bg-black/5 dark:bg-white/5">
              <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Your video never leaves your browser</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientRenderDemo;
