/* ==============================================================================
   COMPONENT: HeroDemo
   
   Purpose: The centerpiece of the hero. Shows the product in action using
   actual Editframe components with working playback controls.
   
   Design: Clean editor/preview split with subtle shadows
   ============================================================================== */

import { useId, useEffect, useState } from "react";
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

export function HeroDemo() {
  const id = useId();
  const previewId = `hero-demo-${id}`;
  const videoId = `hero-video-${id}`;
  
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const codeLines = [
    { num: 1, content: <><span className="text-[var(--accent-red)]">import</span> {'{'} Timegroup, Video, Text {'}'} <span className="text-[var(--accent-red)]">from</span> <span className="text-[var(--accent-blue)]">'@editframe/react'</span>;</> },
    { num: 2, content: '' },
    { num: 3, content: <><span className="text-[var(--accent-red)]">export function</span> <span className="text-[var(--accent-gold)]">Welcome</span>() {'{'}</> },
    { num: 4, content: <>&nbsp;&nbsp;<span className="text-[var(--accent-red)]">return</span> (</> },
    { num: 5, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--accent-blue)]">{'<Timegroup'}</span> <span className="opacity-60">mode</span>=<span className="text-[var(--accent-blue)]">"contain"</span><span className="text-[var(--accent-blue)]">{'>'}</span></> },
    { num: 6, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--accent-blue)]">{'<Video'}</span> <span className="opacity-60">src</span>=<span className="text-[var(--accent-blue)]">"bars.mp4"</span> <span className="text-[var(--accent-blue)]">{'/>'}</span></> },
    { num: 7, content: '' },
    { num: 8, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--accent-blue)]">{'<Text'}</span> <span className="opacity-60">className</span>=<span className="text-[var(--accent-blue)]">"..."</span><span className="text-[var(--accent-blue)]">{'>'}</span></> },
    { num: 9, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Build video with code</> },
    { num: 10, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--accent-blue)]">{'</Text>'}</span></> },
    { num: 11, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--accent-blue)]">{'</Timegroup>'}</span></> },
    { num: 12, content: <>&nbsp;&nbsp;);</> },
    { num: 13, content: <>{'}'}<span className="animate-pulse text-[var(--accent-red)]">|</span></> },
  ];

  return (
    <div className="w-full">
      <div className="bg-[#1a1a1a] rounded-lg overflow-hidden shadow-print-lg">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#252525] border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-4 text-xs text-white/50">composition.tsx</span>
        </div>
        
        {/* Demo content */}
        <div className="grid md:grid-cols-2">
          {/* Code panel */}
          <div className="text-white font-mono text-xs overflow-hidden border-r border-white/10">
            <div className="flex text-[11px] leading-[1.7]">
              {/* Line numbers */}
              <div className="flex-shrink-0 select-none border-r border-white/10 bg-white/5 pr-3 pl-4 py-4">
                {codeLines.map((line) => (
                  <div key={line.num} className="text-right text-white/30 h-[1.7em]">
                    {line.num}
                  </div>
                ))}
              </div>
              
              {/* Code */}
              <div className="flex-1 py-4 px-4 min-w-0 overflow-x-auto">
                {codeLines.map((line) => (
                  <div key={line.num} className="text-white/90 h-[1.7em] whitespace-pre">
                    {line.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Live Preview panel */}
          <div className="bg-[#111] flex flex-col min-h-[280px]">
            {isClient ? (
              <Preview id={previewId} loop className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center p-4 bg-black">
                  <Timegroup 
                    mode="contain" 
                    className="w-full h-full max-w-[300px] max-h-[200px] relative bg-black"
                  >
                    <Video
                      id={videoId}
                      src="https://assets.editframe.com/bars-n-tone.mp4"
                      className="size-full object-contain"
                    />
                    <Text className="absolute bottom-3 inset-x-3 text-white text-sm font-semibold text-center [animation:fadeIn_0.5s_backwards]">
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
