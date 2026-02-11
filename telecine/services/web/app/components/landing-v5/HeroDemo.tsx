/* ==============================================================================
   COMPONENT: HeroDemo
   
   Purpose: The centerpiece of the hero. Shows the product in action using
   actual Editframe components with working playback controls, paired with
   a real syntax-highlighted code display via Monaco (read-only).
   
   Design: Clean editor/preview split with subtle shadows
   ============================================================================== */

import { useId, useEffect, useState, useRef } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Text,
  Scrubber,
  TogglePlay,
  TimeDisplay,
  Filmstrip,
} from "@editframe/react";
import { CodeEditor } from "~/components/CodeEditor";
import { useRenderQueue } from "./RenderQueue";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";

const HERO_CODE = `import { Timegroup, Video, Text } from '@editframe/react';

export function Welcome() {
  return (
    <Timegroup mode="contain">
      <Video src="video.mp4" />

      <Text className="absolute bottom-3 inset-x-3
                       text-white text-sm font-semibold
                       text-center">
        Build video with code
      </Text>
    </Timegroup>
  );
}`;

export function HeroDemo() {
  const id = useId();
  const previewId = `hero-demo-${id}`;
  const videoId = `hero-video-${id}`;
  const previewRef = useRef<HTMLElement>(null);
  const { enqueue } = useRenderQueue();
  
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleExport = () => {
    const tg = previewRef.current?.querySelector("ef-timegroup");
    if (tg) {
      enqueue({
        name: "Hero Demo",
        fileName: "hero-demo.mp4",
        target: tg as HTMLElement,
        renderOpts: { includeAudio: true },
      });
    }
  };

  return (
    <div className="w-full">
      <div className="bg-[#1a1a1a] rounded-lg overflow-hidden shadow-print-lg">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#252525] border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-[var(--poster-red)]" />
          <div className="w-3 h-3 rounded-full bg-[var(--poster-gold)]" />
          <div className="w-3 h-3 rounded-full bg-[var(--poster-green)]" />
          <span className="ml-4 text-xs text-white/50">composition.tsx</span>
        </div>
        
        {/* Demo content */}
        <div className="grid md:grid-cols-2">
          {/* Code panel - real Monaco editor (read-only) */}
          <div className="border-r border-white/10 min-h-[280px]">
            <CodeEditor
              code={HERO_CODE}
              language="typescript"
              onChange={() => {}}
              readOnly
              height={280}
              className="w-full h-[280px]"
            />
          </div>
          
          {/* Live Preview panel */}
          <div className="bg-[#111] flex flex-col min-h-[280px]">
            {isClient ? (
              <Preview id={previewId} ref={previewRef as any} loop className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center p-4 bg-black">
                  <Timegroup 
                    mode="contain" 
                    className="w-full h-full max-w-[300px] max-h-[200px] relative bg-black"
                  >
                    <Video
                      id={videoId}
                      src={VIDEO_SRC}
                      className="size-full object-contain"
                    />
                    <Text className="absolute bottom-3 inset-x-3 text-white text-sm font-semibold text-center">
                      Build video with code
                    </Text>
                  </Timegroup>
                </div>
                
                <div className="h-14 bg-black border-t border-white/10">
                  <Filmstrip autoScale className="w-full h-full" />
                </div>
              </Preview>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-black">
                <div className="text-white/50 text-xs">Loading...</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Playback Controls */}
        <div className="border-t border-white/10 bg-[#1a1a1a]">
          {isClient ? (
            <div className="flex items-center">
              <TogglePlay target={previewId}>
                <button
                  slot="pause"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--accent-red)] hover:brightness-110 transition-all"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
                <button
                  slot="play"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)] hover:brightness-110 transition-all"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </TogglePlay>
              
              <div className="flex-1 px-4 h-12 flex items-center border-l border-white/10">
                <Scrubber 
                  target={previewId}
                  className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--accent-red)] [&::part(progress)]:rounded-full [&::part(thumb)]:bg-white [&::part(thumb)]:w-3 [&::part(thumb)]:h-3 [&::part(thumb)]:rounded-full"
                />
              </div>
              
              <div className="px-4 border-l border-white/10 h-12 flex items-center">
                <TimeDisplay 
                  target={previewId}
                  className="text-xs text-white/70 font-mono tabular-nums"
                />
              </div>
              
              <button
                onClick={handleExport}
                className="px-4 h-12 flex items-center gap-2 border-l border-white/10 bg-[var(--poster-red)] hover:brightness-110 transition-all text-white text-xs font-bold uppercase tracking-wider"
                title="Export MP4"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                Export
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)]">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex-1 px-4 border-l border-white/10 h-12 flex items-center">
                <div className="w-full h-1.5 bg-white/20 rounded-full" />
              </div>
              <div className="px-4 border-l border-white/10 h-12 flex items-center">
                <span className="text-xs text-white/70 font-mono">0:00 / 0:00</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeroDemo;
