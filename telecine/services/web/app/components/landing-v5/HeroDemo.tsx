/* ==============================================================================
   COMPONENT: HeroDemo
   
   Purpose: The centerpiece of the hero. Shows the product in action using
   actual Editframe components with working playback controls, paired with
   a syntax-highlighted code display via CodeBlock (read-only, no Monaco).
   
   Design: Clean editor/preview split with subtle shadows
   ============================================================================== */

import { useId, useEffect, useState, useRef } from "react";
import {
  Preview,
  FitScale,
  Timegroup,
  TimelineRoot,
  Video,
  Text,
  Scrubber,
  TogglePlay,
  TimeDisplay,
  Filmstrip,
} from "@editframe/react";
import { CodeBlock } from "~/components/CodeBlock";
import { ExportButton } from "./ExportButton";

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

/* ━━ Timeline content — rendered by TimelineRoot ━━━━━━━━━━━━━━━━━━━━━━━━ */
function HeroVideoContent() {
  const videoId = useId();
  return (
    <>
      <div className="flex-1 flex items-center justify-center p-4 bg-black">
        <FitScale>
          <Timegroup
            mode="fixed"
            className="relative bg-black"
            style={{ width: 960, height: 540 }}
          >
            <Video
              id={`hero-video-${videoId}`}
              src={VIDEO_SRC}
              className="size-full object-contain"
            />
            <Text className="absolute bottom-3 inset-x-3 text-white text-sm font-semibold text-center">
              Build video with code
            </Text>
          </Timegroup>
        </FitScale>
      </div>

      <div className="h-14 bg-black border-t border-white/10">
        <Filmstrip autoScale className="w-full h-full" />
      </div>
    </>
  );
}

export function HeroDemo() {
  const id = useId();
  const previewId = `hero-demo-${id}`;
  const previewRef = useRef<HTMLElement>(null);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
          {/* Code panel - syntax highlighted (read-only) */}
          <div className="border-r border-white/10 md:min-h-[280px] overflow-auto max-h-[200px] md:max-h-[280px]">
            <CodeBlock className="language-tsx">{HERO_CODE}</CodeBlock>
          </div>

          {/* Live Preview panel */}
          <div className="bg-[#111] flex flex-col md:min-h-[280px]">
            {isClient ? (
              <Preview id={previewId} ref={previewRef as any} loop className="flex-1 flex flex-col">
                <TimelineRoot id={previewId} component={HeroVideoContent} />
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
                  className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer [&::part(progress)]:bg-[var(--accent-red)] [&::part(progress)]:rounded-full [&::part(handle)]:bg-white [&::part(handle)]:w-3 [&::part(handle)]:h-3 [&::part(handle)]:rounded-full"
                />
              </div>
              
              <div className="px-4 border-l border-white/10 h-12 flex items-center">
                <TimeDisplay 
                  target={previewId}
                  className="text-xs text-white/70 font-mono tabular-nums"
                />
              </div>
              
              <ExportButton
                compact
                getTarget={() => previewRef.current?.querySelector("ef-timegroup") as HTMLElement}
                name="Hero Demo"
                fileName="hero-demo.mp4"
                renderOpts={{ includeAudio: true }}
                className="border-l border-white/10"
              />
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
