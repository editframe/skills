import type { Route } from "./+types/keyframes"
import { useState, useEffect, useRef } from "react"
import { Timegroup, Preview } from "@editframe/react"
import { WithEnv } from "~/components/WithEnv"
import {
  TimelineControls
} from "./shared"


interface KeyframeValue {
  timeMs: number;
  value: number;
  id: string;
}

interface AnimationTrack {
  property: 'translateX' | 'translateY' | 'rotate' | 'offset-distance';
  keyframes: KeyframeValue[];
  unit: string;
  color: string;
  easing: string;
  offsetPath?: string; // SVG path for curved motion
}

interface EasingOptions {
  type: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic' | 'custom';
  customCubicBezier?: string; // e.g., "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
}

interface KeyframeProps {
  keyframe: KeyframeValue;
  track: AnimationTrack;
  totalDuration: number;
  onDrag: (keyframe: KeyframeValue, newTimeMs: number) => void;
  onValueChange: (keyframe: KeyframeValue, newValue: number) => void;
  onDelete: (keyframe: KeyframeValue) => void;
  onJumpTo: (timeMs: number) => void;
  timelineWidth: number;
  currentTime: number;
}

function KeyframeMarker({ keyframe, track, totalDuration, onDrag, onValueChange, onDelete, onJumpTo, timelineWidth, currentTime }: KeyframeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);

  const position = `${Math.max(0, Math.min((keyframe.timeMs / totalDuration) * 100, 100))}%`;
  const isAtCurrentTime = Math.abs(keyframe.timeMs - currentTime) < 50; // 50ms tolerance

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setHasDragged(false);

    // Capture the timeline element at the start of drag
    const timelineElement = (e.target as HTMLElement).closest('[data-timeline-track]');
    if (!timelineElement) return;

    const startRect = timelineElement.getBoundingClientRect();

    const handlePointerMove = (e: PointerEvent) => {
      setHasDragged(true);
      // Use the captured timeline element and its original rect
      const relativeX = e.clientX - startRect.left;
      const clampedX = Math.max(0, Math.min(relativeX, startRect.width));
      const newTimeMs = (clampedX / startRect.width) * totalDuration;
      onDrag(keyframe, newTimeMs);
      // Don't move playhead while dragging keyframes
    };

    const handlePointerUp = () => {
      setTimeout(() => {
        setIsDragging(false);
        setHasDragged(false);
      }, 0);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging && !hasDragged) {
      onJumpTo(keyframe.timeMs);
    }
  };


  return (
    <div
      className={`absolute w-4 h-4 rounded-full border-2 border-white cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all shadow-sm ${isDragging ? 'scale-125 shadow-md' : 'hover:scale-110'
        } ${isAtCurrentTime ? 'ring-2 ring-red-400 scale-125 shadow-md' : ''}`}
      style={{
        left: position,
        top: '50%',
        backgroundColor: isAtCurrentTime ? '#EF4444' : track.color,
        zIndex: isDragging ? 20 : (isAtCurrentTime ? 15 : 10)
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      title={`${keyframe.timeMs}ms: ${keyframe.value}${track.unit} (click to jump, drag to move)`}
    />
  );
}


interface TimelineTrackProps {
  track: AnimationTrack;
  totalDuration: number;
  onKeyframeDrag: (track: AnimationTrack, keyframe: KeyframeValue, newTimeMs: number) => void;
  onKeyframeValueChange: (track: AnimationTrack, keyframe: KeyframeValue, newValue: number) => void;
  onKeyframeDelete: (track: AnimationTrack, keyframe: KeyframeValue) => void;
  onAddKeyframe: (track: AnimationTrack, timeMs: number) => void;
  onJumpTo: (timeMs: number) => void;
  currentTime: number;
}

function TimelineTrack({ track, totalDuration, onKeyframeDrag, onKeyframeValueChange, onKeyframeDelete, onAddKeyframe, onJumpTo, currentTime }: TimelineTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleTrackClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const timeMs = Math.max(0, Math.min((relativeX / rect.width) * totalDuration, totalDuration));
    onJumpTo(timeMs); // Jump playhead to clicked position
  };

  const handleTrackDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const timeMs = Math.max(0, Math.min((relativeX / rect.width) * totalDuration, totalDuration));
    onAddKeyframe(track, timeMs);
  };

  return (
    <div className="timeline-track-container">
      {/* Timeline track */}
      <div className="flex items-center gap-4 py-1 relative">
        <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
          {track.property === 'offset-distance' ? 'motion path' : track.property}
        </div>
        <div
          ref={trackRef}
          className="relative bg-gray-50 h-6 cursor-pointer hover:bg-gray-100 flex items-center border border-gray-200 rounded flex-1"
          onClick={handleTrackClick}
          onDoubleClick={handleTrackDoubleClick}
          data-timeline-track="true"
        >
          {/* Track line */}
          <div
            className="absolute top-1/2 left-0 right-0 h-1 transform -translate-y-1/2 rounded-full"
            style={{ backgroundColor: track.color, opacity: 0.7 }}
          />

          {/* Playhead line - positioned exactly like keyframes */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-30"
            style={{
              left: `${(currentTime / totalDuration) * 100}%`,
              opacity: 0.9
            }}
          />

          {/* Keyframe markers */}
          {track.keyframes.map((keyframe) => (
            <KeyframeMarker
              key={keyframe.id}
              keyframe={keyframe}
              track={track}
              totalDuration={totalDuration}
              onDrag={(kf, timeMs) => onKeyframeDrag(track, kf, timeMs)}
              onValueChange={(kf, value) => onKeyframeValueChange(track, kf, value)}
              onDelete={(kf) => onKeyframeDelete(track, kf)}
              onJumpTo={onJumpTo}
              timelineWidth={300}
              currentTime={currentTime}
            />
          ))}
        </div>
        <div className="text-xs text-gray-500 min-w-[48px] text-right">
          {track.keyframes.length} keys
        </div>
      </div>

      {/* Dedicated editor space for this track */}
      <div className="h-10 ml-24 mr-16 mt-1">
        {(() => {
          // Find keyframe at current time
          const activeKeyframe = track.keyframes.find(kf => Math.abs(kf.timeMs - currentTime) < 50);
          return activeKeyframe ? (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md h-full">
              <div className="flex items-center gap-3 h-full">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: track.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {track.property === 'offset-distance' ? 'motion path' : track.property}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Time:</label>
                  <span className="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded border">
                    {activeKeyframe.timeMs}ms
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Easing:</label>
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border">
                    {track.easing === 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' ? 'back-out' :
                      track.easing === 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' ? 'back-in-out' :
                        track.easing === 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' ? 'ease' : track.easing}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Value:</label>
                  <input
                    type="number"
                    value={activeKeyframe.value}
                    onChange={(e) => onKeyframeValueChange(track, activeKeyframe, parseFloat(e.target.value) || 0)}
                    className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-500">{track.unit}</span>
                </div>

                <button
                  onClick={() => {
                    onKeyframeDelete(track, activeKeyframe);
                  }}
                  className="ml-auto px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}

function generateKeyframesCSS(tracks: AnimationTrack[], duration: number, animationName: string): string {
  if (tracks.length === 0) return '';

  const animations: string[] = [];
  const animationNames: string[] = [];

  tracks.forEach(track => {
    if (track.keyframes.length === 0) return;

    const trackAnimationName = `${animationName}-${track.property}`;
    animationNames.push(trackAnimationName);

    // Generate keyframes only for times where this track has actual keyframes
    const keyframeRules = track.keyframes.map(kf => {
      const percentage = Math.round((kf.timeMs / duration) * 100);

      if (track.property === 'offset-distance') {
        return `  ${percentage}% { offset-distance: ${kf.value}${track.unit}; }`;
      } else {
        return `  ${percentage}% { transform: ${track.property}(${kf.value}${track.unit}); }`;
      }
    }).join('\n');

    animations.push(`@keyframes ${trackAnimationName} {\n${keyframeRules}\n}`);
  });

  // Generate the combined CSS with animation-composition and individual easing
  const animationDeclaration = tracks
    .filter(track => track.keyframes.length > 0)
    .map(track => {
      const trackAnimationName = `${animationName}-${track.property}`;
      return `${trackAnimationName} var(--ef-duration, ${duration}ms) ${track.easing} paused`;
    })
    .join(',\n    ');

  // Add offset-path if any track uses it
  const pathTrack = tracks.find(track => track.property === 'offset-distance');
  const offsetPathCSS = pathTrack?.offsetPath ? `\n  offset-path: ${pathTrack.offsetPath};` : '';

  return `${animations.join('\n\n')}\n\n.keyframe-demo-element {\n  animation:\n    ${animationDeclaration};\n  animation-composition: add;\n  animation-fill-mode: both;${offsetPathCSS}\n}`;
}

function getValueAtTime(track: AnimationTrack, timeMs: number): string {
  if (track.keyframes.length === 0) {
    return `0${track.unit}`;
  }

  const exact = track.keyframes.find(kf => kf.timeMs === timeMs);
  if (exact) return `${exact.value}${track.unit}`;

  let before = track.keyframes[0];
  let after = track.keyframes[track.keyframes.length - 1];

  for (let i = 0; i < track.keyframes.length - 1; i++) {
    if (track.keyframes[i].timeMs <= timeMs && track.keyframes[i + 1].timeMs >= timeMs) {
      before = track.keyframes[i];
      after = track.keyframes[i + 1];
      break;
    }
  }

  if (before === after) return `${before.value}${track.unit}`;

  const ratio = (timeMs - before.timeMs) / (after.timeMs - before.timeMs);
  const interpolated = before.value + (after.value - before.value) * ratio;

  return `${Math.round(interpolated * 100) / 100}${track.unit}`;
}

export default function Keyframes(_props: Route.ComponentProps) {
  const [duration] = useState(3000); // 3 seconds
  const [currentTime, setCurrentTime] = useState(0);
  const lastManualUpdateRef = useRef(0);
  const [tracks, setTracks] = useState<AnimationTrack[]>([
    {
      property: 'translateX',
      keyframes: [
        { timeMs: 0, value: 0, id: 'tx1' },
        { timeMs: 1500, value: 100, id: 'tx2' },
        { timeMs: 3000, value: 200, id: 'tx3' }
      ],
      unit: 'px',
      color: '#3B82F6',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' // Back easing for overshoot
    },
    {
      property: 'translateY',
      keyframes: [
        { timeMs: 0, value: 0, id: 'ty1' },
        { timeMs: 750, value: -50, id: 'ty2' },
        { timeMs: 2250, value: 25, id: 'ty3' },
        { timeMs: 3000, value: 0, id: 'ty4' }
      ],
      unit: 'px',
      color: '#10B981',
      easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' // OutBack for bouncy feel
    },
    {
      property: 'rotate',
      keyframes: [
        { timeMs: 0, value: 0, id: 'r1' },
        { timeMs: 1500, value: 180, id: 'r2' },
        { timeMs: 3000, value: 360, id: 'r3' }
      ],
      unit: 'deg',
      color: '#F59E0B',
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' // Ease for smooth rotation
    },
    {
      property: 'offset-distance',
      keyframes: [
        { timeMs: 0, value: 0, id: 'path1' },
        { timeMs: 3000, value: 100, id: 'path2' }
      ],
      unit: '%',
      color: '#8B5CF6',
      easing: 'ease-in-out',
      offsetPath: 'path("M 0,0 Q 50,-30 100,0 Q 150,30 200,0")' // Curved S-path
    }
  ]);

  const [generatedCSS, setGeneratedCSS] = useState('');
  const styleRef = useRef<HTMLStyleElement>();

  useEffect(() => {
    const animationName = 'keyframe-demo-animation';
    const css = generateKeyframesCSS(tracks, duration, animationName);
    setGeneratedCSS(css);

    // Apply CSS to the page
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      document.head.appendChild(styleRef.current);
    }

    styleRef.current.textContent = css;
  }, [tracks, duration]);

  // Update animation progress based on currentTime for manual scrubbing
  useEffect(() => {
    const element = document.querySelector('.keyframe-demo-element') as HTMLElement;
    if (element) {
      // Fallback: manually calculate values for precise scrubbing
      const transforms: string[] = [];
      let offsetDistance = '';
      let offsetPath = '';

      tracks.forEach(track => {
        const value = getValueAtTime(track, currentTime);
        if (track.property === 'translateX') {
          transforms.push(`translateX(${value})`);
        } else if (track.property === 'translateY') {
          transforms.push(`translateY(${value})`);
        } else if (track.property === 'rotate') {
          transforms.push(`rotate(${value})`);
        } else if (track.property === 'offset-distance') {
          offsetDistance = value;
          if (track.offsetPath) {
            offsetPath = track.offsetPath;
          }
        }
      });

      if (transforms.length > 0) {
        element.style.transform = transforms.join(' ');
      }

      if (offsetDistance) {
        element.style.setProperty('offset-distance', offsetDistance);
      }

      if (offsetPath) {
        element.style.setProperty('offset-path', offsetPath);
      }
    }
  }, [currentTime, tracks, duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, []);

  // Sync currentTime with timegroup (simplified approach)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only sync from timegroup if we haven't manually updated recently
      if (Date.now() - lastManualUpdateRef.current > 200) {
        const timegroupEl = document.getElementById('keyframe-demo') as any;
        if (timegroupEl && timegroupEl.currentTimeMs !== undefined) {
          setCurrentTime(timegroupEl.currentTimeMs);
        }
      }
    }, 50); // Check every 50ms

    return () => clearInterval(interval);
  }, []);

  const handleJumpTo = (timeMs: number) => {
    // Mark this as a manual update to prevent timegroup interference
    lastManualUpdateRef.current = Date.now();

    // Immediately update React state for instant UI response
    setCurrentTime(timeMs);

    // Also set currentTime on the DOM element for timegroup sync
    const timegroupEl = document.getElementById('keyframe-demo') as any;
    if (timegroupEl) {
      timegroupEl.currentTimeMs = timeMs;
    }
  };

  const handleKeyframeDrag = (track: AnimationTrack, keyframe: KeyframeValue, newTimeMs: number) => {
    setTracks(prevTracks =>
      prevTracks.map(t =>
        t === track
          ? {
            ...t,
            keyframes: t.keyframes.map(kf =>
              kf.id === keyframe.id
                ? { ...kf, timeMs: Math.round(newTimeMs) }
                : kf
            )
          }
          : t
      )
    );
  };

  const handleKeyframeValueChange = (track: AnimationTrack, keyframe: KeyframeValue, newValue: number) => {
    setTracks(prevTracks =>
      prevTracks.map(t =>
        t === track
          ? {
            ...t,
            keyframes: t.keyframes.map(kf =>
              kf.id === keyframe.id
                ? { ...kf, value: newValue }
                : kf
            )
          }
          : t
      )
    );
  };

  const handleKeyframeDelete = (track: AnimationTrack, keyframe: KeyframeValue) => {
    setTracks(prevTracks =>
      prevTracks.map(t =>
        t === track
          ? {
            ...t,
            keyframes: t.keyframes.filter(kf => kf.id !== keyframe.id)
          }
          : t
      )
    );
  };

  const handleAddKeyframe = (track: AnimationTrack, timeMs: number) => {
    const value = parseFloat(getValueAtTime(track, timeMs));
    const newKeyframe: KeyframeValue = {
      timeMs: Math.round(timeMs),
      value,
      id: `${track.property}-${Date.now()}`
    };

    setTracks(prevTracks =>
      prevTracks.map(t =>
        t === track
          ? {
            ...t,
            keyframes: [...t.keyframes, newKeyframe].sort((a, b) => a.timeMs - b.timeMs)
          }
          : t
      )
    );

    // Jump to newly created keyframe
    handleJumpTo(timeMs);
  };

  return (
    <Preview className="w-full h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-2 gap-6 p-6 min-h-0 overflow-hidden">

        {/* Animation Preview */}
        <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Animation Preview</h3>
            <p className="text-sm text-gray-600">CSS Motion Path + custom easing for curved motion</p>
            <div className="text-xs text-gray-500 mt-1">Purple dashed line shows offset-path • Element follows curved path naturally</div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <Timegroup
              mode="fixed"
              duration={`${duration}ms`}
              id="keyframe-demo"
              className="flex-1 flex items-center justify-center relative overflow-hidden"
            >
              {/* Curved path visualization */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg width="240" height="120" className="opacity-30">
                  <path
                    d="M 20,60 Q 80,30 140,60 Q 200,90 240,60"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                </svg>
              </div>

              <div className="w-16 h-16 bg-blue-500 rounded-lg keyframe-demo-element flex items-center justify-center text-white font-bold text-xs">
                DEMO
              </div>

              {/* Grid overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full opacity-20">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            </Timegroup>

            <TimelineControls className="mx-4 mb-4" />
          </div>
        </section>

        {/* Timeline Controls */}
        <section className="bg-white rounded-lg border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Keyframe Timeline</h3>
            <p className="text-sm text-gray-600">Interactive timeline with playhead synchronization</p>
            <div className="text-xs text-gray-500 mt-1 flex justify-between">
              <span>Duration: {duration}ms</span>
              <span className="font-mono">Current: {Math.round(currentTime)}ms ({Math.round((currentTime / duration) * 100)}%)</span>
            </div>
          </div>

          <div className="p-4 space-y-2 relative">

            {tracks.map((track) => (
              <TimelineTrack
                key={track.property}
                track={track}
                totalDuration={duration}
                onKeyframeDrag={handleKeyframeDrag}
                onKeyframeValueChange={handleKeyframeValueChange}
                onKeyframeDelete={handleKeyframeDelete}
                onAddKeyframe={handleAddKeyframe}
                onJumpTo={handleJumpTo}
                currentTime={currentTime}
              />
            ))}
          </div>

          <div className="mt-4 p-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Generated CSS (using animation-composition)</h4>
            <pre className="text-xs bg-gray-100 p-3 rounded border max-h-48 overflow-auto font-mono">
              {generatedCSS || '/* No keyframes defined */'}
            </pre>
            <p className="text-xs text-gray-500 mt-2">
              Demonstrates curved motion using CSS Motion Path (offset-path) + separate transform animations. No manual keyframe generation needed!
            </p>
          </div>

          <div className="p-4 border-t border-gray-200 text-xs text-gray-600">
            <div className="space-y-1">
              <div>• <strong>Click</strong> timeline tracks to jump playhead</div>
              <div>• <strong>Double-click</strong> timeline tracks to add keyframes</div>
              <div>• <strong>Click</strong> keyframes to jump playhead to that time</div>
              <div>• <strong>Drag</strong> keyframes to change timing</div>
              <div>• <strong>Editor appears automatically</strong> when playhead matches keyframe time</div>
              <div>• <strong>CSS Motion Path</strong> creates natural curved motion paths</div>
              <div>• <strong>offset-distance</strong> animates progress along the defined path</div>
              <div>• <strong>Separate transforms</strong> can still be applied (rotation, scaling)</div>
              <div>• <strong>No complex math</strong> - CSS handles all curve calculations</div>
              <div>• Much more intuitive than coordinating X/Y timing functions</div>
            </div>
          </div>
        </section>
      </div>
    </Preview>
  )
}
