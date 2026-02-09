/* ==============================================================================
   COMPONENT: TextOverlayTool
   
   Purpose: Text overlay tool demonstrating Editframe text animation features.
   Supports position, font size, split mode, stagger, and animation presets.
   
   Design: Swissted poster aesthetic - bold borders, strong colors, uppercase labels
   ============================================================================== */

import { useState, useEffect, useId } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Text,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";

type Position = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

type FontSize = 'small' | 'medium' | 'large';
type SplitMode = 'word' | 'char' | 'line';
type AnimationPreset = 'none' | 'fade-in' | 'slide-up' | 'typewriter';

const POSITION_STYLES: Record<Position, string> = {
  'top-left': 'top-4 left-4 text-left',
  'top-center': 'top-4 inset-x-4 text-center',
  'top-right': 'top-4 right-4 text-right',
  'center-left': 'top-1/2 left-4 -translate-y-1/2 text-left',
  'center': 'top-1/2 inset-x-4 -translate-y-1/2 text-center',
  'center-right': 'top-1/2 right-4 -translate-y-1/2 text-right',
  'bottom-left': 'bottom-4 left-4 text-left',
  'bottom-center': 'bottom-4 inset-x-4 text-center',
  'bottom-right': 'bottom-4 right-4 text-right',
};

const FONT_SIZES: Record<FontSize, string> = {
  small: 'text-sm',
  medium: 'text-xl',
  large: 'text-3xl',
};

const ANIMATION_PRESETS: Record<AnimationPreset, { label: string; staggerMs: number }> = {
  'none': { label: 'None', staggerMs: 0 },
  'fade-in': { label: 'Fade In', staggerMs: 120 },
  'slide-up': { label: 'Slide Up', staggerMs: 100 },
  'typewriter': { label: 'Typewriter', staggerMs: 60 },
};

const ANIMATION_STYLES = `
  @keyframes ef-landing-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes ef-landing-slide-up {
    from { opacity: 0; transform: translateY(100%); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ef-landing-typewriter {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }
`;

const ANIMATION_CLASSES: Record<AnimationPreset, string> = {
  'none': '',
  'fade-in': '[animation:ef-landing-fade-in_0.4s_ease-out_both]',
  'slide-up': '[animation:ef-landing-slide-up_0.4s_ease-out_both]',
  'typewriter': '[animation:ef-landing-typewriter_0.2s_ease-out_both]',
};

function TextOverlayTool() {
  const id = useId();
  const previewId = `text-overlay-${id}`;
  
  const [isClient, setIsClient] = useState(false);
  const [textContent, setTextContent] = useState('YOUR TEXT HERE');
  const [position, setPosition] = useState<Position>('bottom-center');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [splitMode, setSplitMode] = useState<SplitMode>('word');
  const [animationPreset, setAnimationPreset] = useState<AnimationPreset>('fade-in');
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const positions: { id: Position; label: string }[] = [
    { id: 'top-left', label: '↖' },
    { id: 'top-center', label: '↑' },
    { id: 'top-right', label: '↗' },
    { id: 'center-left', label: '←' },
    { id: 'center', label: '●' },
    { id: 'center-right', label: '→' },
    { id: 'bottom-left', label: '↙' },
    { id: 'bottom-center', label: '↓' },
    { id: 'bottom-right', label: '↘' },
  ];
  
  const fontSizes: { id: FontSize; label: string }[] = [
    { id: 'small', label: 'S' },
    { id: 'medium', label: 'M' },
    { id: 'large', label: 'L' },
  ];

  const splitModes: { id: SplitMode; label: string }[] = [
    { id: 'word', label: 'Word' },
    { id: 'char', label: 'Char' },
    { id: 'line', label: 'Line' },
  ];

  const currentPreset = ANIMATION_PRESETS[animationPreset];
  const animClass = ANIMATION_CLASSES[animationPreset];

  return (
    <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a]">
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />
      
      {/* Header */}
      <div className="px-4 py-3 bg-black">
        <h3 className="text-xs font-bold tracking-widest text-white uppercase">
          Text Overlay
        </h3>
      </div>
      
      {/* Preview */}
      <div className="bg-neutral-900 aspect-video">
        {isClient ? (
          <Preview id={previewId} loop className="w-full h-full">
            <Timegroup mode="contain" className="w-full h-full relative">
              <Video 
                src={VIDEO_SRC}
                className="size-full object-cover"
              />
              <Text 
                split={animationPreset !== 'none' ? splitMode : undefined}
                staggerMs={animationPreset !== 'none' ? currentPreset.staggerMs : undefined}
                easing={animationPreset !== 'none' ? "ease-out" : undefined}
                className={`absolute ${POSITION_STYLES[position]} ${FONT_SIZES[fontSize]} font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${animClass}`}
              >
                {textContent || 'YOUR TEXT HERE'}
              </Text>
            </Timegroup>
          </Preview>
        ) : (
          <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
            <span className="text-neutral-500 text-xs uppercase tracking-wider">Loading...</span>
          </div>
        )}
      </div>
      
      {/* Playback Controls */}
      <div className="border-t-4 border-black dark:border-white">
        {isClient ? (
          <div className="flex items-center">
            <TogglePlay target={previewId}>
              <button 
                slot="pause" 
                className="w-12 h-12 flex items-center justify-center bg-[#E53935] hover:bg-[#C62828] transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              </button>
              <button 
                slot="play" 
                className="w-12 h-12 flex items-center justify-center bg-[#1E88E5] hover:bg-[#1565C0] transition-colors"
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
        ) : (
          <div className="flex items-center">
            <div className="w-12 h-12 flex items-center justify-center bg-[#1E88E5]">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className="flex-1 px-4 border-l-4 border-black dark:border-white h-12 flex items-center bg-neutral-100 dark:bg-[#252525]">
              <div className="w-full h-2 bg-neutral-300 dark:bg-white/20" />
            </div>
            <div className="px-3 border-l-4 border-black dark:border-white h-12 flex items-center bg-neutral-100 dark:bg-[#252525]">
              <span className="text-xs text-black dark:text-white font-mono font-bold">0:00</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="border-t-4 border-black dark:border-white p-4 space-y-4 min-h-[280px]">
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
            className="w-full px-3 py-2 border-2 border-black dark:border-white bg-white dark:bg-[#111] text-black dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:ring-offset-2"
          />
        </div>
        
        {/* Animation Preset */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-black dark:text-white uppercase mb-2">
            Animation
          </label>
          <div className="flex gap-1">
            {(Object.entries(ANIMATION_PRESETS) as [AnimationPreset, { label: string; staggerMs: number }][]).map(([presetId, preset]) => (
              <button
                key={presetId}
                onClick={() => setAnimationPreset(presetId)}
                className={`flex-1 py-2 text-xs font-bold border-2 transition-colors ${
                  animationPreset === presetId
                    ? 'bg-[#FFC107] text-black border-black dark:border-white'
                    : 'bg-white dark:bg-[#111] text-black dark:text-white border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-[#222]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Split Mode (only when animation is active) */}
        {animationPreset !== 'none' && (
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-black dark:text-white uppercase mb-2">
              Split By
            </label>
            <div className="flex gap-1">
              {splitModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSplitMode(mode.id)}
                  className={`flex-1 py-2 text-xs font-bold border-2 transition-colors ${
                    splitMode === mode.id
                      ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                      : 'bg-white dark:bg-[#111] text-black dark:text-white border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-[#222]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          {/* Font Size */}
          <div className="flex-1">
            <label className="block text-[10px] font-bold tracking-widest text-black dark:text-white uppercase mb-2">
              Font Size
            </label>
            <div className="flex gap-1">
              {fontSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setFontSize(size.id)}
                  className={`flex-1 py-2 text-sm font-bold border-2 transition-colors ${
                    fontSize === size.id
                      ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                      : 'bg-white dark:bg-[#111] text-black dark:text-white border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-[#222]'
                  }`}
                >
                  {size.label}
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
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setPosition(pos.id)}
                  className={`aspect-square flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    position === pos.id
                      ? 'bg-[#FFC107] text-black border-black dark:border-white'
                      : 'bg-white dark:bg-[#111] text-black dark:text-white border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-[#222]'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextOverlayTool;
export { TextOverlayTool };
