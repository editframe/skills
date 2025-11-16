import { useRef, useEffect } from "react";
import type {
  MotionDesignerState,
  ElementNode,
  Animation,
} from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import { TimelineControls } from "./TimelineControls";
import { TimelineRuler } from "./TimelineRuler";
import { TimelinePlayhead } from "./TimelinePlayhead";
import { AnimationTrack } from "./AnimationTrack";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { useTimeManager } from "./useTimeManager";
import { useTimelineScrubbing } from "./useTimelineScrubbing";

// Core concept: Timeline layout data structure
interface TimelineLayout {
  snapPoints: number[];
  trackElements: React.ReactNode[];
}

// Core concept: Track rendering context
interface TimelineTrackContext {
  durationMs: number;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  snapPoints: number[];
  currentTime: number;
  actions: {
    updateAnimation: (
      elementId: string,
      animationId: string,
      updates: Partial<Animation>,
    ) => void;
    selectAnimation: (animationId: string | null, elementId: string | null) => void;
  };
}

// Evaluation: Collect snap points from element tree
function collectSnapPoints(element: ElementNode, state: MotionDesignerState): number[] {
  const snapPoints: number[] = [];

  // Add start and end times of all animations
  for (const animation of element.animations) {
    snapPoints.push(animation.delay);
    snapPoints.push(animation.delay + animation.duration);
  }

  // Recursively collect from children
  for (const childId of element.childIds) {
    const child = state.composition.elements[childId];
    if (child) {
      snapPoints.push(...collectSnapPoints(child, state));
    }
  }

  return snapPoints;
}

// Mechanism: Render track elements for element tree
function renderAnimationTracks(
  element: ElementNode,
  state: MotionDesignerState,
  context: TimelineTrackContext,
): React.ReactNode[] {
  const tracks: React.ReactNode[] = [];

  // Render one track per animation
  for (const animation of element.animations) {
    tracks.push(
      <AnimationTrack
        key={animation.id}
        element={element}
        animation={animation}
        durationMs={context.durationMs}
        timelineContainerRef={context.timelineContainerRef}
        snapPoints={context.snapPoints}
        currentTime={context.currentTime}
        isSelected={state.ui.selectedAnimationId === animation.id}
      />,
    );
  }

  // Recursively render tracks for children
  for (const childId of element.childIds) {
    const child = state.composition.elements[childId];
    if (child) {
      tracks.push(...renderAnimationTracks(child, state, context));
    }
  }

  return tracks;
}

// Evaluation: Calculate timeline layout data (what to render)
function calculateTimelineLayout(
  element: ElementNode,
  state: MotionDesignerState,
  context: TimelineTrackContext,
): TimelineLayout {
  // Step 1: Collect all snap points
  const rawSnapPoints = collectSnapPoints(element, state);
  const snapPoints = Array.from(new Set(rawSnapPoints)).sort((a, b) => a - b);
  
  // Step 2: Create track elements with final snap points
  const trackContextWithSnapPoints: TimelineTrackContext = {
    ...context,
    snapPoints,
  };
  const trackElements = renderAnimationTracks(element, state, trackContextWithSnapPoints);

  return {
    snapPoints,
    trackElements,
  };
}

interface TimelineProps {
  state: MotionDesignerState;
  isScrubbingRef?: React.MutableRefObject<boolean>;
}

interface TimelineActions {
  setCurrentTime: (time: number) => void;
  updateAnimation: (
    elementId: string,
    animationId: string,
    updates: Partial<Animation>,
  ) => void;
  selectAnimation: (animationId: string | null, elementId: string | null) => void;
}

// Mechanism: Synchronize current time from time manager to actions
function useTimeSync(
  currentTime: number,
  setCurrentTime: (time: number) => void,
): void {
  useEffect(() => {
    setCurrentTime(currentTime);
  }, [currentTime, setCurrentTime]);
}

// Mechanism: Synchronize scrubbing ref from time manager to external ref
function useRefSync(
  sourceRef: React.MutableRefObject<boolean>,
  targetRef?: React.MutableRefObject<boolean>,
): void {
  useEffect(() => {
    if (targetRef) {
      targetRef.current = sourceRef.current;
    }
  }, [sourceRef, targetRef]);
}

export function Timeline({ state, isScrubbingRef }: TimelineProps) {
  const actions = useMotionDesignerActions();
  const activeRootTimegroupId = getActiveRootTimegroupId(state);
  const activeRootTimegroup = activeRootTimegroupId
    ? state.composition.elements[activeRootTimegroupId]
    : null;
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  
  const { currentTime: scrubberCurrentTime, duration: durationMs, isScrubbingRef: timeManagerScrubbingRef } = useTimeManager(activeRootTimegroupId, state);

  // Synchronization: Sync time and refs
  useTimeSync(scrubberCurrentTime, actions.setCurrentTime);
  useRefSync(timeManagerScrubbingRef, isScrubbingRef);

  // Handle seek from playhead - update current time immediately and seek timegroup element
  const handleSeek = (time: number) => {
    // Update React state
    actions.setCurrentTime(time);
    
    // Seek the actual timegroup element in the DOM
    if (activeRootTimegroupId) {
      let timegroupElement: any = null;
      
      // Strategy 1: Find by ID directly
      timegroupElement = document.getElementById(activeRootTimegroupId) as any;
      
      // Strategy 2: Find via wrapper div
      if (!timegroupElement) {
        const wrapper = document.querySelector(`[data-timegroup-id="${activeRootTimegroupId}"]`);
        if (wrapper) {
          // Try with ID first
          timegroupElement = wrapper.querySelector(`ef-timegroup#${activeRootTimegroupId}`) as any;
          // Fallback to any ef-timegroup in wrapper
          if (!timegroupElement) {
            timegroupElement = wrapper.querySelector('ef-timegroup') as any;
          }
        }
      }
      
      // Strategy 3: Fallback to querySelector by tag (if only one active timegroup)
      if (!timegroupElement) {
        const allTimegroups = document.querySelectorAll('ef-timegroup');
        if (allTimegroups.length === 1) {
          timegroupElement = allTimegroups[0] as any;
        }
      }
      
      if (timegroupElement && typeof timegroupElement.seek === 'function') {
        // Pause if playing
        if (timegroupElement.playbackController?.playing) {
          timegroupElement.playbackController.pause();
        }
        // Seek to the new time
        timegroupElement.seek(time);
      }
    }
  };

  // Shared scrubbing hook for ruler area
  const rulerScrubbing = useTimelineScrubbing({
    timelineContainerRef,
    durationMs,
    onSeek: handleSeek,
    isScrubbingRef: timeManagerScrubbingRef,
  });

  // Shared scrubbing hook for tracks area
  // Only enabled when clicking on empty space (not animation bars)
  const tracksScrubbing = useTimelineScrubbing({
    timelineContainerRef,
    durationMs,
    onSeek: handleSeek,
    isScrubbingRef: timeManagerScrubbingRef,
  });

  // Check if click target is an animation bar or resize handle
  const isAnimationBarClick = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    
    // Check if clicked element is or is inside an animation bar
    const animationBar = target.closest('.absolute.rounded-sm.cursor-move');
    if (animationBar) return true;
    
    // Check if clicked element is a resize handle
    const resizeHandle = target.closest('.cursor-col-resize');
    if (resizeHandle) return true;
    
    return false;
  };

  // Handle mouse down on tracks area - only scrub if not clicking on animation bar
  const handleTracksMouseDown = (e: React.MouseEvent) => {
    // Don't scrub if clicking on an animation bar or resize handle
    if (isAnimationBarClick(e.target)) {
      return;
    }
    
    // Use the shared scrubbing handler
    tracksScrubbing.handleMouseDown(e);
  };

  if (!activeRootTimegroup) {
    return (
      <div className="h-48 bg-gray-800 border-t border-gray-700 flex items-center justify-center text-gray-500">
        <p className="text-sm">No active root timegroup</p>
      </div>
    );
  }

  // Duration comes from useTimeManager hook
  const trackContext: TimelineTrackContext = {
    durationMs,
    timelineContainerRef,
    snapPoints: [], // Will be populated by calculateTimelineLayout
    currentTime: scrubberCurrentTime,
    actions: {
      updateAnimation: actions.updateAnimation,
      selectAnimation: actions.selectAnimation,
    },
  };

  // Evaluation: Calculate what to render (snap points and track elements)
  const layout = calculateTimelineLayout(activeRootTimegroup, state, trackContext);

  return (
    <div className="h-48 bg-gray-900 border-t border-gray-700/70 flex">
      <TimelineControls
        previewTargetId={activeRootTimegroupId || undefined}
        onRestart={() => actions.setCurrentTime(0)}
      />
      <div className="flex-1 flex flex-col relative">
          {/* Ruler area */}
          <div className="flex h-8 border-b border-gray-700/70 bg-gray-850">
            <div 
              ref={timelineContainerRef}
              className="flex-1 relative cursor-pointer" 
              style={{ minWidth: 0 }}
              onMouseDown={rulerScrubbing.handleMouseDown}
            >
              <TimelineRuler durationMs={durationMs} />
            </div>
          </div>
          
          {/* Tracks area - uses same width as ruler via flex-1 */}
          <div 
            ref={tracksContainerRef}
            className="flex-1 overflow-y-auto relative cursor-pointer"
            onMouseDown={handleTracksMouseDown}
          >
            {layout.trackElements}
          </div>
          
          {/* Playhead spans both ruler and tracks */}
          <div className="absolute inset-0 pointer-events-none flex">
            <div className="flex-1 relative">
              <TimelinePlayhead
                currentTime={scrubberCurrentTime}
                durationMs={durationMs}
                timelineContainerRef={timelineContainerRef}
                onSeek={handleSeek}
                isScrubbingRef={timeManagerScrubbingRef}
                activeTimegroupId={activeRootTimegroupId}
              />
            </div>
          </div>
      </div>
    </div>
  );
}



