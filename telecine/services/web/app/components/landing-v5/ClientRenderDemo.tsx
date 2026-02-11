/* ==============================================================================
   COMPONENT: ClientRenderDemo
   
   Purpose: Demonstrate client-side video rendering capabilities.
   Shows composition preview with animated text overlay. Export
   is handled by the shared RenderQueue.
   ============================================================================== */

import { useState, useEffect, useId, useRef } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Text,
  TogglePlay,
  Scrubber,
  TimeDisplay,
} from "@editframe/react";
import { ExportButton } from "./ExportButton";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";

export function ClientRenderDemo() {
  const id = useId();
  const previewId = `client-render-${id}`;
  const [isClient, setIsClient] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  
  useEffect(() => { setIsClient(true); }, []);

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
                  src={VIDEO_SRC}
                  duration="5s"
                  className="w-full h-full object-cover"
                />
                <Text
                  split="word"
                  staggerMs={150}
                  easing="ease-out"
                  className="absolute bottom-6 inset-x-4 text-white text-xl font-bold text-center drop-shadow-lg"
                >
                  RENDERED IN BROWSER
                </Text>
              </Timegroup>
            </Preview>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/50 text-xs uppercase tracking-wider">Loading...</span>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="border-t-4 border-black dark:border-white bg-[#111]">
          {isClient ? (
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
        
        {/* Export Button — enqueues to shared render queue */}
        <ExportButton
          getTarget={() => previewRef.current?.querySelector("ef-timegroup") as HTMLElement}
          name="Client Export"
          fileName="editframe-client-export.mp4"
          renderOpts={{ includeAudio: true }}
          disabled={!isClient}
        />
        
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
