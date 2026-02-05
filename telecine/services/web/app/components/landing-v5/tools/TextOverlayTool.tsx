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

type Position = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

type FontSize = 'small' | 'medium' | 'large';

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

function TextOverlayTool() {
  const id = useId();
  const previewId = `text-overlay-${id}`;
  
  const [isClient, setIsClient] = useState(false);
  const [textContent, setTextContent] = useState('YOUR TEXT HERE');
  const [position, setPosition] = useState<Position>('bottom-center');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  
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

  return (
    <div className="border-4 border-black bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-black">
        <h3 className="text-xs font-bold tracking-widest text-white uppercase">
          Text Overlay
        </h3>
      </div>
      
      {/* Preview */}
      <div className="bg-neutral-900">
        {isClient ? (
          <Preview id={previewId} loop className="aspect-video">
            <Timegroup mode="contain" className="w-full h-full relative">
              <Video 
                src="/samples/demo.mp4" 
                className="size-full object-cover"
              />
              <Text 
                className={`absolute ${POSITION_STYLES[position]} ${FONT_SIZES[fontSize]} font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
              >
                {textContent || 'YOUR TEXT HERE'}
              </Text>
            </Timegroup>
          </Preview>
        ) : (
          <div className="aspect-video bg-neutral-800 flex items-center justify-center">
            <span className="text-neutral-500 text-xs uppercase tracking-wider">Loading...</span>
          </div>
        )}
      </div>
      
      {/* Playback Controls */}
      <div className="border-t-4 border-black">
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
            
            <div className="flex-1 px-4 h-12 flex items-center border-l-4 border-black bg-neutral-100">
              <Scrubber 
                target={previewId}
                className="w-full h-2 bg-neutral-300 cursor-pointer [&::part(progress)]:bg-black [&::part(thumb)]:bg-black [&::part(thumb)]:w-4 [&::part(thumb)]:h-4 [&::part(thumb)]:rounded-none"
              />
            </div>
            
            <div className="px-3 border-l-4 border-black h-12 flex items-center bg-neutral-100">
              <TimeDisplay 
                target={previewId} 
                className="text-xs text-black font-mono font-bold tabular-nums"
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
            <div className="flex-1 px-4 border-l-4 border-black h-12 flex items-center bg-neutral-100">
              <div className="w-full h-2 bg-neutral-300" />
            </div>
            <div className="px-3 border-l-4 border-black h-12 flex items-center bg-neutral-100">
              <span className="text-xs text-black font-mono font-bold">0:00</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="border-t-4 border-black p-4 space-y-4">
        {/* Text Input */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-black uppercase mb-2">
            Text Content
          </label>
          <input
            type="text"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Enter your text"
            className="w-full px-3 py-2 border-2 border-black bg-white text-black font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:ring-offset-2"
          />
        </div>
        
        {/* Font Size */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-black uppercase mb-2">
            Font Size
          </label>
          <div className="flex gap-1">
            {fontSizes.map((size) => (
              <button
                key={size.id}
                onClick={() => setFontSize(size.id)}
                className={`flex-1 py-2 text-sm font-bold border-2 transition-colors ${
                  fontSize === size.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-neutral-100'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Position Grid */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-black uppercase mb-2">
            Position
          </label>
          <div className="grid grid-cols-3 gap-1 max-w-[120px]">
            {positions.map((pos) => (
              <button
                key={pos.id}
                onClick={() => setPosition(pos.id)}
                className={`aspect-square flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  position === pos.id
                    ? 'bg-[#FFC107] text-black border-black'
                    : 'bg-white text-black border-black hover:bg-neutral-100'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextOverlayTool;
export { TextOverlayTool };
