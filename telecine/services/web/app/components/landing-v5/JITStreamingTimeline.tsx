import React, { useState, useEffect, useRef } from "react";
import { Timegroup } from "@editframe/react";
import { JITStreamingCanvas } from "./jit-streaming-scene";

const JIT_SCENE_DUR = 42000;

/**
 * Timeline component for JIT Streaming visualization.
 * This component is re-created in render clones by TimelineRoot.
 * It manages its own time state via addFrameTask.
 */
export function JITStreamingTimeline({ id }: { id?: string } = {}) {
  const [sceneTime, setSceneTime] = useState(0);
  const [sceneDuration, setSceneDuration] = useState(JIT_SCENE_DUR);
  const containerRef = useRef<HTMLDivElement>(null);
  const timegroupRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(() => typeof window !== 'undefined');

  useEffect(() => { 
    setIsClient(true); 
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    let cancelled = false;
    let frameTaskCleanup: (() => void) | undefined;

    const setup = async () => {
      const tg = timegroupRef.current;
      if (!tg) return;

      if (tg.updateComplete) {
        await tg.updateComplete;
      }
      if (cancelled) return;

      // Wait for the timegroup to be adopted by Preview and get playbackController
      if (!tg.playbackController) {
        await new Promise<void>(resolve => {
          const check = () => {
            if (cancelled) { resolve(); return; }
            if (tg.playbackController) {
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          };
          check();
        });
      }
      if (cancelled) return;
      
      if (tg.addFrameTask) {
        frameTaskCleanup = tg.addFrameTask(({ currentTimeMs, durationMs }: any) => {
          setSceneTime(currentTimeMs);
          setSceneDuration(durationMs);
        });
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (frameTaskCleanup) {
        frameTaskCleanup();
      }
    };
  }, [isClient, id]);

  if (!isClient) {
    return (
      <Timegroup
        ref={timegroupRef}
        mode="fixed"
        duration="42s"
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16/10", background: "#1e2233" }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-[var(--warm-gray)]">Loading…</span>
        </div>
      </Timegroup>
    );
  }

  return (
    <Timegroup
      ref={timegroupRef}
      mode="fixed"
      duration="42s"
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "16/10", background: "#1e2233" }}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
        {/* React Three Fiber scene */}
        <div style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}>
          <React.Suspense fallback={<div>Loading scene...</div>}>
            <JITStreamingCanvas currentTimeMs={sceneTime} />
          </React.Suspense>
        </div>

        {/* ── Text overlays — narration pace ── */}

        {/* ACT 1 title */}
        <div className="ef-caption ef-caption-dim" style={{ top: "4%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 500ms 300ms backwards, efCaptionOut 400ms 2800ms forwards" }}>
          The traditional way
        </div>

        {/* Step: You have a file */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 500ms backwards, efCaptionOut 400ms 2800ms forwards" }}>
          You have a video file.
        </div>

        {/* Step: Upload */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 3000ms backwards, efCaptionOut 400ms 7500ms forwards" }}>
          Upload the entire thing to their servers.
        </div>

        {/* Step: Transcode */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 8000ms backwards, efCaptionOut 400ms 12000ms forwards" }}>
          Transcode every frame, every bitrate.
        </div>

        {/* Step: Variants */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 12500ms backwards, efCaptionOut 400ms 14500ms forwards" }}>
          1080p. 720p. 480p. Three complete copies, stored.
        </div>

        {/* Step: Play */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 15000ms backwards, efCaptionOut 400ms 16800ms forwards" }}>
          Only now can someone press play.
        </div>

        {/* TRANSITION */}
        <div className="ef-caption ef-caption-lg" style={{ top: "4%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 500ms 17200ms backwards, efCaptionOut 400ms 19200ms forwards" }}>
          What if you could skip all of that?
        </div>

        {/* ACT 2 title */}
        <div className="ef-caption ef-caption-brand" style={{ top: "4%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 500ms 19500ms backwards, efCaptionOut 400ms 21200ms forwards" }}>
          Editframe JIT
        </div>

        {/* Step: Same file, your server */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 19700ms backwards, efCaptionOut 400ms 21200ms forwards" }}>
          Same file. But it stays on your server.
        </div>

        {/* Step: Player needs a frame */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 21500ms backwards, efCaptionOut 400ms 22800ms forwards" }}>
          When the player needs a frame...
        </div>

        {/* Step: Highlight bytes */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 23000ms backwards, efCaptionOut 400ms 24200ms forwards" }}>
          ...it highlights just the bytes it needs.
        </div>

        {/* Step: Byte-range request */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 24500ms backwards, efCaptionOut 400ms 26300ms forwards" }}>
          A byte-range request fetches just that slice.
        </div>

        {/* Step: Transcode piece */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 27000ms backwards, efCaptionOut 400ms 28800ms forwards" }}>
          Same transcode — but just this piece.
        </div>

        {/* Step: Already playing */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 30000ms backwards, efCaptionOut 400ms 31800ms forwards" }}>
          Already playing.
        </div>

        {/* Step: Next segment */}
        <div className="ef-caption ef-caption-sub" style={{ bottom: "5%", left: "50%", transform: "translateX(-50%)", animation: "efCaptionIn 400ms 32000ms backwards, efCaptionOut 400ms 34800ms forwards" }}>
          Next segment. Different bitrate. Streamed on demand.
        </div>

        {/* ACT 3: Comparison */}
        <div className="ef-caption ef-caption-hero" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", animation: "efCaptionIn 800ms 37500ms backwards, efCaptionOut 600ms 41000ms forwards" }}>
          Same transcode work.<br />
          No upload. No ingest delay.
        </div>

        <style>{`
          .ef-caption {
            position: absolute;
            font-family: var(--font-mono);
            text-align: center;
            color: white;
            text-shadow: 0 2px 12px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5);
            white-space: nowrap;
            opacity: 0;
          }
          .ef-caption-lg { font-size: 18px; font-weight: 800; }
          .ef-caption-dim { color: rgba(255,255,255,0.4); font-size: 16px; }
          .ef-caption-brand { font-size: 16px; font-weight: 800; color: #ff5252; }
          .ef-caption-sub { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55); }
          .ef-caption-hero { font-size: 28px; font-weight: 900; color: #ff5252; text-shadow: 0 0 30px rgba(255,82,82,0.6), 0 2px 12px rgba(0,0,0,0.8); }
          @keyframes efCaptionIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes efCaptionOut {
            from { opacity: 1; }
            to   { opacity: 0; }
          }
        `}</style>
      </div>
    </Timegroup>
  );
}
