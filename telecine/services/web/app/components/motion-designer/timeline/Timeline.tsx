import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import type {
  MotionDesignerState,
  ElementNode,
  Animation,
} from "~/lib/motion-designer/types";
import { getActiveRootTimegroupId } from "~/lib/motion-designer/utils";
import { TimelineControls } from "./TimelineControls";
import { TimelineRuler } from "@editframe/react";
import { calculateFrameIntervalMs, calculatePixelsPerFrame, shouldShowFrameMarkers } from "@editframe/elements";
import { Scrubber } from "@editframe/react";
import { FrameHighlight } from "./FrameHighlight";
import { AnimationTrack } from "./AnimationTrack";
import { VideoThumbnailTrack } from "./VideoThumbnailTrack";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";
import { useTimeManager } from "./useTimeManager";
import { useTimelineScrubbing } from "./useTimelineScrubbing";
import { useTimelineKeyboardNavigation } from "./useTimelineKeyboardNavigation";
import { timeToPixels, calculateContentWidth } from "./timelinePosition";

// Track data structure for separate label/strip rendering
interface TrackData {
  element: ElementNode;
  animation: Animation;
  isSelected: boolean;
}

// Core concept: Timeline layout data structure
interface TimelineLayout {
  snapPoints: number[];
  trackData: TrackData[];
  trackStrips: React.ReactNode[];
  videoTracks: React.ReactNode[];
  videoData: ElementNode[];
}

// Core concept: Track rendering context
interface TimelineTrackContext {
  durationMs: number;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  snapPoints: number[];
  currentTime: number;
  containerWidth: number;
  zoomScale: number;
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

// Mechanism: Collect track data for element tree
function collectTrackData(
  element: ElementNode,
  state: MotionDesignerState,
): TrackData[] {
  const tracks: TrackData[] = [];

  // Add one track per animation
  for (const animation of element.animations) {
    tracks.push({
      element,
      animation,
      isSelected: state.ui.selectedAnimationId === animation.id,
    });
  }

  // Recursively collect from children
  for (const childId of element.childIds) {
    const child = state.composition.elements[childId];
    if (child) {
      tracks.push(...collectTrackData(child, state));
    }
  }

  return tracks;
}

// Mechanism: Collect video elements from element tree
function collectVideoElements(
  element: ElementNode,
  state: MotionDesignerState,
): ElementNode[] {
  const videos: ElementNode[] = [];

  // Add this element if it's a video
  if (element.type === "video") {
    videos.push(element);
  }

  // Recursively collect from children
  for (const childId of element.childIds) {
    const child = state.composition.elements[childId];
    if (child) {
      videos.push(...collectVideoElements(child, state));
    }
  }

  return videos;
}

  // Mechanism: Render track elements for element tree
function renderAnimationTracks(
  element: ElementNode,
  state: MotionDesignerState,
  context: TimelineTrackContext,
  showLabel: boolean = true,
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
        containerWidth={context.containerWidth}
        showLabel={showLabel}
      />,
    );
  }

  // Recursively render tracks for children
  for (const childId of element.childIds) {
    const child = state.composition.elements[childId];
    if (child) {
      tracks.push(...renderAnimationTracks(child, state, context, showLabel));
    }
  }

  return tracks;
}

// Mechanism: Render video thumbnail tracks
function renderVideoTracks(
  videoElements: ElementNode[],
  context: TimelineTrackContext,
  scrollContainerRef: React.RefObject<HTMLDivElement>,
  showLabel: boolean = true,
): React.ReactNode[] {
  return videoElements.map((videoElement) => (
    <VideoThumbnailTrack
      key={videoElement.id}
      element={videoElement}
      durationMs={context.durationMs}
      timelineContainerRef={context.timelineContainerRef}
      zoomScale={context.zoomScale}
      containerWidth={context.containerWidth}
      scrollContainerRef={scrollContainerRef}
      showLabel={showLabel}
    />
  ));
}

// Evaluation: Calculate timeline layout data (what to render)
function calculateTimelineLayout(
  element: ElementNode,
  state: MotionDesignerState,
  context: TimelineTrackContext,
  scrollContainerRef: React.RefObject<HTMLDivElement>,
): TimelineLayout {
  // Step 1: Collect all snap points
  const rawSnapPoints = collectSnapPoints(element, state);
  const snapPoints = Array.from(new Set(rawSnapPoints)).sort((a, b) => a - b);
  
  // Step 2: Collect track data for labels
  const trackData = collectTrackData(element, state);
  
  // Step 3: Collect video elements
  const videoData = collectVideoElements(element, state);
  
  // Step 4: Create track strips (without labels) with final snap points
  const trackContextWithSnapPoints: TimelineTrackContext = {
    ...context,
    snapPoints,
  };
  const trackStrips = renderAnimationTracks(element, state, trackContextWithSnapPoints, false);
  
  // Step 5: Create video thumbnail tracks (without labels)
  const videoTracks = renderVideoTracks(videoData, trackContextWithSnapPoints, scrollContainerRef, false);

  return {
    snapPoints,
    trackData,
    trackStrips,
    videoTracks,
    videoData,
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
  // Sync on every render to catch ref changes
  if (targetRef) {
    targetRef.current = sourceRef.current;
  }
  
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
  const labelsContainerRef = useRef<HTMLDivElement>(null);
  const videoTracksContainerRef = useRef<HTMLDivElement>(null);
  const videoLabelsContainerRef = useRef<HTMLDivElement>(null);
  const contentScrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0);
  
  const { currentTime: scrubberCurrentTime, duration: durationMs, isScrubbingRef: timeManagerScrubbingRef } = useTimeManager(activeRootTimegroupId, state);

  // Calculate if frame markers should be shown (for frame highlight)
  const fps = activeRootTimegroup?.props?.fps ?? 30;
  const showFrameMarkers = useMemo(() => {
    if (fps <= 0) return false;
    const frameIntervalMs = calculateFrameIntervalMs(fps);
    const pixelsPerFrame = calculatePixelsPerFrame(frameIntervalMs, zoomScale);
    return shouldShowFrameMarkers(pixelsPerFrame);
  }, [fps, zoomScale]);

  // Measure container width
  useEffect(() => {
    const measureWidth = () => {
      if (contentScrollContainerRef.current) {
        const rect = contentScrollContainerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
      }
    };

    measureWidth();

    if (!contentScrollContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setContainerWidth(width);
    });

    resizeObserver.observe(contentScrollContainerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Synchronization: Sync time and refs
  useTimeSync(scrubberCurrentTime, actions.setCurrentTime);
  useRefSync(timeManagerScrubbingRef, isScrubbingRef);

  // Synchronize vertical scrolling between labels and tracks
  useEffect(() => {
    const tracksContainer = tracksContainerRef.current;
    const labelsContainer = labelsContainerRef.current;
    
    if (!tracksContainer || !labelsContainer) return;

    const handleTracksScroll = () => {
      if (labelsContainer.scrollTop !== tracksContainer.scrollTop) {
        labelsContainer.scrollTop = tracksContainer.scrollTop;
      }
    };

    const handleLabelsScroll = () => {
      if (tracksContainer.scrollTop !== labelsContainer.scrollTop) {
        tracksContainer.scrollTop = labelsContainer.scrollTop;
      }
    };

    tracksContainer.addEventListener('scroll', handleTracksScroll);
    labelsContainer.addEventListener('scroll', handleLabelsScroll);

    return () => {
      tracksContainer.removeEventListener('scroll', handleTracksScroll);
      labelsContainer.removeEventListener('scroll', handleLabelsScroll);
    };
  }, []);

  // Synchronize vertical scrolling between video labels and video tracks
  useEffect(() => {
    const videoTracksContainer = videoTracksContainerRef.current;
    const videoLabelsContainer = videoLabelsContainerRef.current;
    
    if (!videoTracksContainer || !videoLabelsContainer) return;

    const handleVideoTracksScroll = () => {
      if (videoLabelsContainer.scrollTop !== videoTracksContainer.scrollTop) {
        videoLabelsContainer.scrollTop = videoTracksContainer.scrollTop;
      }
    };

    const handleVideoLabelsScroll = () => {
      if (videoTracksContainer.scrollTop !== videoLabelsContainer.scrollTop) {
        videoTracksContainer.scrollTop = videoLabelsContainer.scrollTop;
      }
    };

    videoTracksContainer.addEventListener('scroll', handleVideoTracksScroll);
    videoLabelsContainer.addEventListener('scroll', handleVideoLabelsScroll);

    return () => {
      videoTracksContainer.removeEventListener('scroll', handleVideoTracksScroll);
      videoLabelsContainer.removeEventListener('scroll', handleVideoLabelsScroll);
    };
  }, []);

  // Handle wheel events for scrolling
  useEffect(() => {
    const scrollContainer = contentScrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal scrolling
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        const scrollDelta = e.deltaX;
        scrollContainer.scrollLeft += scrollDelta;
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
    };
  }, []);


  // Handle seek from playhead - update current time immediately and seek timegroup element
  // Memoized to prevent recreation and ensure stable reference
  const handleSeek = useCallback((time: number) => {
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
  }, [actions, activeRootTimegroupId]);

  // Shared scrubbing hook for ruler area
  const rulerScrubbing = useTimelineScrubbing({
    timelineContainerRef,
    durationMs,
    onSeek: handleSeek,
    isScrubbingRef: timeManagerScrubbingRef,
    zoomScale,
    containerWidth,
    scrollContainerRef: contentScrollContainerRef,
    fps: activeRootTimegroup?.props?.fps ?? 30,
  });

  // Shared scrubbing hook for tracks area
  // Only enabled when clicking on empty space (not animation bars)
  const tracksScrubbing = useTimelineScrubbing({
    timelineContainerRef,
    durationMs,
    onSeek: handleSeek,
    isScrubbingRef: timeManagerScrubbingRef,
    zoomScale,
    containerWidth,
    fps: activeRootTimegroup?.props?.fps ?? 30,
    scrollContainerRef: contentScrollContainerRef,
  });

  // Keyboard navigation hook for arrow keys
  useTimelineKeyboardNavigation({
    currentTime: scrubberCurrentTime,
    durationMs,
    fps: activeRootTimegroup?.props?.fps ?? 30,
    onSeek: handleSeek,
    containerRef: contentScrollContainerRef,
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

  // Calculate content width (must be before early return to follow Rules of Hooks)
  const contentWidth = useMemo(() => {
    if (durationMs <= 0 || containerWidth <= 0) return 0;
    return calculateContentWidth(durationMs, containerWidth, zoomScale);
  }, [durationMs, containerWidth, zoomScale]);

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
    containerWidth,
    zoomScale,
    actions: {
      updateAnimation: actions.updateAnimation,
      selectAnimation: actions.selectAnimation,
    },
  };

  // Evaluation: Calculate what to render (snap points and track elements)
  const layout = calculateTimelineLayout(activeRootTimegroup, state, trackContext, contentScrollContainerRef);

  return (
    <div className="h-48 bg-gray-900 border-t border-gray-700/70 flex">
      <TimelineControls
        previewTargetId={activeRootTimegroupId || undefined}
        onRestart={() => actions.setCurrentTime(0)}
        zoomScale={zoomScale}
        onZoomChange={setZoomScale}
      />
      <div className="flex-1 flex flex-col relative">
        {/* Two-column layout: labels column (fixed) + content column (flex) */}
        <div className="flex flex-1 relative">
          {/* Labels column - fixed width, contains all layer labels */}
          <div className="w-[60px] flex flex-col border-r border-gray-700/70">
            {/* Label spacer for ruler row */}
            <div className="h-8 border-b border-gray-700/70 bg-gray-850" />
            {/* Video labels container - scrolls in sync with video tracks */}
            {layout.videoData.length > 0 && (
              <div ref={videoLabelsContainerRef} className="overflow-y-auto border-b border-gray-700/70">
                {layout.videoData.map((video) => (
                  <div key={video.id} className="h-12 border-b border-gray-700/50 flex items-center px-2">
                    <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                      <span className="text-gray-500 text-[10px]">›</span>
                      <span className="truncate font-light">video {video.id.slice(0, 4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Animation labels container - scrolls in sync with tracks */}
            <div ref={labelsContainerRef} className="flex-1 overflow-y-auto">
              {layout.trackData.map((track, index) => (
                <div key={`${track.element.id}-${track.animation.id}`} className="h-8 border-b border-gray-700/50 flex items-center px-2">
                  <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                    <span className="text-gray-500 text-[10px]">›</span>
                    <span className="truncate font-light">{track.animation.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Content column - ruler and track strips share this space with horizontal scrolling */}
          <div 
            ref={contentScrollContainerRef}
            tabIndex={0}
            className="flex-1 flex flex-col relative overflow-x-auto overflow-y-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            style={{ minWidth: 0 }}
          >
            {/* Inner container with calculated width */}
            <div 
              className="flex flex-col relative"
              style={{ 
                width: contentWidth > 0 ? `${contentWidth}px` : '100%',
                minWidth: '100%' 
              }}
            >
              {/* Ruler area - spans full content width */}
              <div 
                ref={timelineContainerRef}
                className="h-8 border-b border-gray-700/70 bg-gray-850/80 relative cursor-pointer"
                onMouseDown={rulerScrubbing.handleMouseDown}
              >
                <TimelineRuler 
                  durationMs={durationMs}
                  zoomScale={zoomScale}
                  containerWidth={containerWidth}
                  fps={activeRootTimegroup?.props?.fps ?? 30}
                  scrollContainerRef={contentScrollContainerRef}
                />
              </div>
              
              {/* Video tracks area - strips only, no labels */}
              {layout.videoTracks.length > 0 && (
                <div 
                  ref={videoTracksContainerRef}
                  className="overflow-y-auto border-b border-gray-700/70 relative cursor-pointer"
                  style={{ 
                    maxHeight: `${layout.videoTracks.length * 48}px`
                  }}
                  onMouseDown={handleTracksMouseDown}
                >
                  {layout.videoTracks}
                </div>
              )}
              
              {/* Animation tracks area - strips only, no labels */}
              <div 
                ref={tracksContainerRef}
                className="flex-1 overflow-y-auto relative cursor-pointer"
                onMouseDown={handleTracksMouseDown}
              >
                {layout.trackStrips}
              </div>
              
              {/* Frame highlight and playhead span full content column */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Frame highlight - shows current frame as a rectangle */}
                <FrameHighlight
                  currentTime={scrubberCurrentTime}
                  durationMs={durationMs}
                  zoomScale={zoomScale}
                  containerWidth={containerWidth}
                  fps={fps}
                  showFrameMarkers={showFrameMarkers}
                />
                {/* Playhead */}
                <Scrubber
                  orientation="vertical"
                  currentTimeMs={scrubberCurrentTime}
                  durationMs={durationMs}
                  zoomScale={zoomScale}
                  containerWidth={containerWidth}
                  scrollContainerRef={contentScrollContainerRef}
                  rawScrubTimeMs={rulerScrubbing.rawScrubTime ?? tracksScrubbing.rawScrubTime ?? null}
                  fps={activeRootTimegroup?.props?.fps ?? 30}
                  isScrubbingRef={timeManagerScrubbingRef}
                  onSeek={handleSeek}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



