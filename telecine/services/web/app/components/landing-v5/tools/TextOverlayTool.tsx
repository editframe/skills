/* ==============================================================================
   COMPONENT: TextOverlayTool
   
   Purpose: Title card maker demonstrating Editframe text animation features.
   Three orthogonal controls: Split (word/char/line), Animation (CSS entrance),
   and Speed (stagger timing).
   
   Design: Swissted poster aesthetic - bold borders, strong colors, uppercase labels
   ============================================================================== */

import { useState, useId, useRef } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Text,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";
import { useRenderQueue } from "../RenderQueue";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";

const POSITIONS = [
  { id: 'top-left', label: '↖', classes: 'top-4 left-4 text-left' },
  { id: 'top-center', label: '↑', classes: 'top-4 inset-x-4 text-center' },
  { id: 'top-right', label: '↗', classes: 'top-4 right-4 text-right' },
  { id: 'center-left', label: '←', classes: 'top-1/2 left-4 -translate-y-1/2 text-left' },
  { id: 'center', label: '●', classes: 'top-1/2 inset-x-4 -translate-y-1/2 text-center' },
  { id: 'center-right', label: '→', classes: 'top-1/2 right-4 -translate-y-1/2 text-right' },
  { id: 'bottom-left', label: '↙', classes: 'bottom-4 left-4 text-left' },
  { id: 'bottom-center', label: '↓', classes: 'bottom-4 inset-x-4 text-center' },
  { id: 'bottom-right', label: '↘', classes: 'bottom-4 right-4 text-right' },
] as const;

const FONT_SIZES = [
  { id: 'small', label: 'S', classes: 'text-sm' },
  { id: 'medium', label: 'M', classes: 'text-xl' },
  { id: 'large', label: 'L', classes: 'text-3xl' },
] as const;

const SPLITS = [
  { id: 'word', label: 'Word' },
  { id: 'char', label: 'Char' },
  { id: 'line', label: 'Line' },
] as const;

const ANIMATIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade', name: 'title-fade', duration: '0.4s' },
  { id: 'slide', label: 'Slide', name: 'title-slide', duration: '0.4s' },
  { id: 'scale', label: 'Scale', name: 'title-scale', duration: '0.3s' },
] as const;

const SPEEDS = [
  { id: 'slow', label: 'Slow', staggerMs: 150 },
  { id: 'medium', label: 'Medium', staggerMs: 80 },
  { id: 'fast', label: 'Fast', staggerMs: 40 },
] as const;

const btnClass = (active: boolean, accent?: boolean) =>
  `flex-1 py-2 text-xs font-bold border-2 transition-colors ${
    active
      ? accent
        ? 'bg-[var(--poster-gold)] text-black border-black dark:border-white'
        : 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
      : 'bg-white dark:bg-[#111] text-black dark:text-white border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-[#222]'
  }`;

function TextOverlayTool() {
  const id = useId();
  const previewId = `title-card-${id}`;
  const previewRef = useRef<HTMLElement>(null);
  const { enqueue } = useRenderQueue();
  
  const [textContent, setTextContent] = useState('YOUR TEXT HERE');
  const [position, setPosition] = useState('bottom-center');
  const [fontSize, setFontSize] = useState('medium');
  const [split, setSplit] = useState('word');
  const [animation, setAnimation] = useState('fade');
  const [speed, setSpeed] = useState('medium');

  const positionClasses = POSITIONS.find(p => p.id === position)?.classes ?? POSITIONS[7].classes;
  const fontSizeClasses = FONT_SIZES.find(f => f.id === fontSize)?.classes ?? FONT_SIZES[1].classes;
  const animationConfig = ANIMATIONS.find(a => a.id === animation);
  const staggerMs = SPEEDS.find(s => s.id === speed)?.staggerMs ?? 80;

  const animationStyle = animationConfig && 'name' in animationConfig
    ? {
        animationName: animationConfig.name,
        animationDuration: animationConfig.duration,
        animationTimingFunction: 'ease-out',
        animationFillMode: 'both' as const,
      }
    : undefined;

  return (
    <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a]">
      <style>{`
        @keyframes title-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes title-slide {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes title-scale {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      
      {/* Header */}
      <div className="px-4 py-3 bg-black">
        <h3 className="text-xs font-bold tracking-widest text-white uppercase">
          Title Card
        </h3>
      </div>
      
      {/* Preview */}
      <div className="bg-neutral-900 aspect-video">
        <Preview id={previewId} ref={previewRef as any} loop className="w-full h-full">
          <Timegroup mode="contain" className="w-full h-full relative">
            <Video 
              src={VIDEO_SRC}
              className="size-full object-cover"
            />
            <Text 
              key={`${animation}-${split}-${speed}`}
              split={animation !== 'none' ? split as 'word' | 'char' | 'line' : undefined}
              staggerMs={animation !== 'none' ? staggerMs : undefined}
              easing={animation !== 'none' ? "ease-out" : undefined}
              className={`absolute ${positionClasses} ${fontSizeClasses} font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
              style={animationStyle}
            >
              {textContent || 'YOUR TEXT HERE'}
            </Text>
          </Timegroup>
        </Preview>
      </div>
      
      {/* Playback Controls */}
      <div className="border-t-4 border-black dark:border-white">
        <div className="flex items-center">
          <TogglePlay target={previewId}>
            <button 
              slot="pause" 
              className="w-12 h-12 flex items-center justify-center bg-[var(--poster-red)] hover:brightness-90 transition-all"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </button>
            <button 
              slot="play" 
              className="w-12 h-12 flex items-center justify-center bg-[var(--poster-blue)] hover:brightness-90 transition-all"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </TogglePlay>
          
          <div className="flex-1 px-4 h-12 flex items-center border-l-4 border-black dark:border-white bg-neutral-100 dark:bg-[#252525]">
            <Scrubber 
              target={previewId}
              className="w-full h-2 bg-neutral-300 cursor-pointer [&::part(progress)]:bg-black [&::part(thumb)]:bg-black [&::part(thumb)]:w-4 [&::part(thumb)]:h-4 [&::part(thumb)]:rounded-none"
            />
          </div>
          
          <div className="px-3 border-l-4 border-black dark:border-white h-12 flex items-center bg-neutral-100 dark:bg-[#252525]">
            <TimeDisplay 
              target={previewId} 
              className="text-xs text-black dark:text-white font-mono font-bold tabular-nums"
            />
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="border-t-4 border-black dark:border-white p-4 space-y-4">
        {/* Text Input */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-black dark:text-white uppercase mb-2">
            Text Content
          </label>
          <input
            type="text"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Enter your text"
            className="w-full px-3 py-2 border-2 border-black dark:border-white bg-white dark:bg-[#111] text-black dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--poster-blue)] focus:ring-offset-2"
          />
        </div>
        
        {/* Split - What are the pieces? */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-black dark:text-white uppercase mb-2">
            Split
          </label>
          <div className="flex gap-1">
            {SPLITS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSplit(s.id)}
                className={btnClass(split === s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Animation - How does each piece enter? */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-black dark:text-white uppercase mb-2">
            Animation
          </label>
          <div className="flex gap-1">
            {ANIMATIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAnimation(a.id)}
                className={btnClass(animation === a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Speed - How fast do they cascade? */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-black dark:text-white uppercase mb-2">
            Speed
          </label>
          <div className="flex gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSpeed(s.id)}
                className={btnClass(speed === s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          {/* Font Size */}
          <div className="flex-1">
            <label className="block text-[10px] font-bold tracking-widest text-black dark:text-white uppercase mb-2">
              Font Size
            </label>
            <div className="flex gap-1">
              {FONT_SIZES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontSize(f.id)}
                  className={btnClass(fontSize === f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Position Grid */}
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-black dark:text-white uppercase mb-2">
              Position
            </label>
            <div className="grid grid-cols-3 gap-1 max-w-[90px]">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPosition(p.id)}
                  className={`aspect-square flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    position === p.id
                      ? 'bg-[var(--poster-gold)] text-black border-black dark:border-white'
                      : 'bg-white dark:bg-[#111] text-black dark:text-white border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-[#222]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            const tg = previewRef.current?.querySelector("ef-timegroup");
            if (tg) {
              enqueue({
                name: "Text Overlay",
                fileName: "text-overlay.mp4",
                target: tg as HTMLElement,
                renderOpts: { includeAudio: true },
              });
            }
          }}
          className="w-full border-t-4 border-black dark:border-white bg-[var(--poster-red)] py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:brightness-110"
        >
          Export MP4
        </button>
      </div>
    </div>
  );
}

export default TextOverlayTool;
export { TextOverlayTool };
