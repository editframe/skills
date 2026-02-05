/* ==============================================================================
   COMPONENT: HeroDemo
   
   Purpose: The centerpiece of the hero. Shows the product in action using
   actual Editframe components with working playback controls.
   
   Design: International Typographic Style / Bauhaus / De Stijl
   - Bold black borders
   - Geometric grid layout
   - Primary color accents
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
    { num: 1, content: <><span className="text-[var(--destijl-red)]">import</span> {'{'} Timegroup, Video, Text {'}'} <span className="text-[var(--destijl-red)]">from</span> <span className="text-[var(--destijl-blue)]">'@editframe/react'</span>;</> },
    { num: 2, content: '' },
    { num: 3, content: <><span className="text-[var(--destijl-red)]">export function</span> <span className="text-[var(--destijl-yellow)]">Welcome</span>() {'{'}</> },
    { num: 4, content: <>&nbsp;&nbsp;<span className="text-[var(--destijl-red)]">return</span> (</> },
    { num: 5, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--destijl-blue)]">{'<Timegroup'}</span> <span className="opacity-60">mode</span>=<span className="text-[var(--destijl-blue)]">"contain"</span><span className="text-[var(--destijl-blue)]">{'>'}</span></> },
    { num: 6, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--destijl-blue)]">{'<Video'}</span> <span className="opacity-60">src</span>=<span className="text-[var(--destijl-blue)]">"bars.mp4"</span> <span className="text-[var(--destijl-blue)]">{'/>'}</span></> },
    { num: 7, content: '' },
    { num: 8, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--destijl-blue)]">{'<Text'}</span> <span className="opacity-60">className</span>=<span className="text-[var(--destijl-blue)]">"..."</span><span className="text-[var(--destijl-blue)]">{'>'}</span></> },
    { num: 9, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Build video with code</> },
    { num: 10, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--destijl-blue)]">{'</Text>'}</span></> },
    { num: 11, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[var(--destijl-blue)]">{'</Timegroup>'}</span></> },
    { num: 12, content: <>&nbsp;&nbsp;);</> },
    { num: 13, content: <>{'}'}<span className="animate-blink-cursor text-[var(--destijl-red)]">|</span></> },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Demo container - Bauhaus style with print texture */}
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#0a0a0a]">
        {/* Window chrome - minimal geometric with ink texture */}
        <div className="flex items-center border-b-4 border-black dark:border-white">
          <div className="flex">
            <div className="w-4 h-4 bg-[var(--destijl-red)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)'}} />
            <div className="w-4 h-4 bg-[var(--destijl-yellow)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.1)'}} />
            <div className="w-4 h-4 bg-[var(--destijl-blue)]" style={{boxShadow: 'inset 0 0 8px rgba(0,0,0,0.15)'}} />
          </div>
          <div className="flex-1 px-4 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">editframe dev</span>
          </div>
        </div>
        
        {/* Demo content */}
        <div className="grid md:grid-cols-2">
          {/* Code panel with subtle grain */}
          <div className="bg-black text-white font-mono text-xs overflow-hidden border-r-0 md:border-r-4 border-b-4 md:border-b-0 border-black dark:border-white relative">
            {/* File tab with ink texture */}
            <div className="flex items-center border-b-2 border-white/20">
              <div className="px-3 py-2 bg-[var(--destijl-blue)] text-white" style={{boxShadow: 'inset 0 0 20px rgba(0,0,0,0.15)'}}>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{textShadow: '0 0 0.5px currentColor'}}>composition.tsx</span>
              </div>
            </div>
            
            {/* Code content with line numbers */}
            <div className="flex text-[11px] leading-[1.7]">
              {/* Line numbers gutter */}
              <div className="flex-shrink-0 select-none border-r-2 border-white/20 bg-white/5 pr-2 pl-3 py-3">
                {codeLines.map((line) => (
                  <div key={line.num} className="text-right text-white/30 h-[1.7em]">
                    {line.num}
                  </div>
                ))}
              </div>
              
              {/* Code */}
              <div className="flex-1 py-3 px-3 min-w-0 overflow-x-auto">
                {codeLines.map((line) => (
                  <div key={line.num} className="text-white/90 h-[1.7em] whitespace-pre">
                    {line.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Live Preview panel - actual Editframe components */}
          <div className="bg-gray-100 dark:bg-[#111] flex flex-col min-h-[280px]">
            {isClient ? (
              <Preview id={previewId} loop className="flex-1 flex flex-col">
                {/* Video preview area */}
                <div className="flex-1 flex items-center justify-center p-3 bg-black">
                  <Timegroup 
                    mode="contain" 
                    className="w-full h-full max-w-[300px] max-h-[200px] relative bg-black"
                  >
                    <Video
                      id={videoId}
                      src="https://assets.editframe.com/bars-n-tone.mp4"
                      className="size-full object-contain"
                    />
                    <Text className="absolute bottom-3 inset-x-3 text-white text-sm font-black uppercase tracking-wider text-center [animation:fadeIn_0.5s_backwards]">
                      Build video with code
                    </Text>
                  </Timegroup>
                </div>
                
                {/* Filmstrip timeline */}
                <div className="h-14 bg-black border-t-2 border-white/20">
                  <Filmstrip 
                    autoScale 
                    className="w-full h-full"
                  />
                </div>
              </Preview>
            ) : (
              /* SSR fallback */
              <div className="flex-1 flex items-center justify-center bg-black">
                <div className="text-white/50 text-xs font-bold uppercase tracking-wider">Loading...</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Playback Controls - geometric style */}
        <div className="border-t-4 border-black dark:border-white bg-white dark:bg-[#0a0a0a]">
          {isClient ? (
            <div className="flex items-center">
              {/* Play/Pause toggle */}
              <TogglePlay target={previewId}>
                <button
                  slot="pause"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--destijl-red)] hover:bg-[var(--destijl-blue)] transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
                <button
                  slot="play"
                  className="w-12 h-12 flex items-center justify-center bg-[var(--destijl-blue)] hover:bg-[var(--destijl-red)] transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </TogglePlay>
              
              {/* Scrubber */}
              <div className="flex-1 px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <Scrubber 
                  target={previewId}
                  className="w-full h-2 bg-gray-200 dark:bg-white/20 cursor-pointer [&::part(progress)]:bg-[var(--destijl-red)] [&::part(thumb)]:bg-[var(--destijl-red)] [&::part(thumb)]:w-4 [&::part(thumb)]:h-4"
                />
              </div>
              
              {/* Time display */}
              <div className="px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <TimeDisplay 
                  target={previewId}
                  className="text-[10px] font-bold font-mono tabular-nums uppercase tracking-wider"
                />
              </div>
            </div>
          ) : (
            /* SSR fallback controls */
            <div className="flex items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--destijl-blue)]">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex-1 px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <div className="w-full h-2 bg-gray-200 dark:bg-white/20" />
              </div>
              <div className="px-4 border-l-4 border-black dark:border-white h-12 flex items-center">
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider">0:00 / 0:00</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeroDemo;
