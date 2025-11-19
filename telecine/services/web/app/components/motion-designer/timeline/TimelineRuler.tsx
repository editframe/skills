import { useRef, useState, useEffect, useMemo } from "react";
import { timeToPixels } from "./timelinePosition";

interface TimelineRulerProps {
  durationMs: number;
  zoomScale: number;
  containerWidth: number;
  fps?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

const MIN_SPACING_PX = 100;
const MIN_FRAME_SPACING_PX = 5;

export function calculateOptimalInterval(
  width: number,
  durationMs: number,
  minSpacing: number,
): number {
  if (width <= 0 || durationMs <= 0) {
    return 1000; // fallback to 1 second
  }

  const maxMarkers = Math.floor(width / minSpacing);
  if (maxMarkers <= 0) {
    return durationMs; // if container is too small, show only start and end
  }

  const minIntervalMs = durationMs / maxMarkers;
  
  // Use the calculated interval directly (prioritize visual clarity over round numbers)
  return minIntervalMs;
}

export function calculateFrameIntervalMs(fps: number): number {
  if (fps <= 0) return 1000 / 30; // fallback to 30fps
  return 1000 / fps;
}

export function calculatePixelsPerFrame(frameIntervalMs: number, zoomScale: number): number {
  const BASE_PIXELS_PER_SECOND = 100;
  return (frameIntervalMs / 1000) * BASE_PIXELS_PER_SECOND * zoomScale;
}

export function shouldShowFrameMarkers(pixelsPerFrame: number, minSpacing: number = MIN_FRAME_SPACING_PX): boolean {
  return pixelsPerFrame >= minSpacing;
}

/**
 * Quantize a time value to the nearest frame boundary using the same logic as PlaybackController.
 * This ensures frame markers align perfectly with playhead position.
 * 
 * Matches: PlaybackController.currentTime getter quantization logic
 * - Quantizes in seconds: Math.round(timeSeconds / frameDurationS) * frameDurationS
 * - Then converts to milliseconds: frameTimeSeconds * 1000
 */
export function quantizeToFrameTimeMs(timeMs: number, fps: number): number {
  if (!fps || fps <= 0) return timeMs;
  const frameDurationS = 1 / fps;
  const timeSeconds = timeMs / 1000;
  const quantizedSeconds = Math.round(timeSeconds / frameDurationS) * frameDurationS;
  return quantizedSeconds * 1000;
}

function renderFrameMarkers(
  canvas: HTMLCanvasElement,
  scrollLeft: number,
  viewportWidth: number,
  frameIntervalMs: number,
  durationMs: number,
  zoomScale: number,
  containerWidth: number,
  fps: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate visible pixel range
  const visibleStartPx = scrollLeft;
  const visibleEndPx = scrollLeft + viewportWidth;

  // Calculate which frames are visible
  const BASE_PIXELS_PER_SECOND = 100;
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomScale;
  
  // Convert visible pixel range to time range
  const visibleStartTimeMs = Math.max(0, (visibleStartPx / pixelsPerSecond) * 1000 - frameIntervalMs);
  const visibleEndTimeMs = Math.min(durationMs, (visibleEndPx / pixelsPerSecond) * 1000 + frameIntervalMs);

  // Find first frame in visible range
  const firstFrameIndex = Math.floor(visibleStartTimeMs / frameIntervalMs);
  const lastFrameIndex = Math.ceil(visibleEndTimeMs / frameIntervalMs);

  // Set drawing style for frame markers (smaller and lighter than time markers)
  ctx.strokeStyle = "rgb(107, 114, 128)"; // gray-500, lighter than time markers (gray-600)
  ctx.lineWidth = 1;

  // Draw frame markers
  // Calculate frame times using the exact same calculation path as PlaybackController
  // This ensures perfect alignment with playhead position
  // PlaybackController: quantizes in seconds, then converts to ms
  // We do the same: frameTimeSeconds = frameIndex / fps, then * 1000
  const frameDurationS = 1 / fps;
  for (let frameIndex = firstFrameIndex; frameIndex <= lastFrameIndex; frameIndex++) {
    // Calculate frame time in seconds (same as playhead quantization would produce)
    const frameTimeSeconds = frameIndex * frameDurationS;
    // Quantize using same logic as PlaybackController.currentTime getter
    // For integer frameIndex, this is a no-op but ensures same calculation path
    const quantizedSeconds = Math.round(frameTimeSeconds / frameDurationS) * frameDurationS;
    // Convert to milliseconds using same method as EFTimegroup.currentTimeMs getter
    const frameTimeMs = quantizedSeconds * 1000;
    
    if (frameTimeMs < 0 || frameTimeMs > durationMs) continue;

    const x = timeToPixels(frameTimeMs, durationMs, containerWidth, zoomScale);
    
    // Only draw if within visible range
    if (x >= visibleStartPx - 1 && x <= visibleEndPx + 1) {
      // Draw shorter line (50% of container height, which is 8 * 4 = 32px, so 16px)
      const lineHeight = canvas.height * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, lineHeight);
      ctx.stroke();
    }
  }
}

export function TimelineRuler({ durationMs, zoomScale, containerWidth, fps = 30, scrollContainerRef }: TimelineRulerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Initialize width from getBoundingClientRect on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMeasuredWidth(rect.width);
    }
  }, []);

  // Use ResizeObserver to track container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setMeasuredWidth(width);
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Track scroll position for virtual rendering with requestAnimationFrame optimization
  useEffect(() => {
    if (!scrollContainerRef?.current) return;

    let rafId: number | null = null;
    let needsUpdate = false;

    const updateScrollLeft = () => {
      needsUpdate = true;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setScrollLeft(scrollContainerRef.current?.scrollLeft ?? 0);
          rafId = null;
          needsUpdate = false;
        });
      }
    };

    updateScrollLeft();
    scrollContainerRef.current.addEventListener("scroll", updateScrollLeft, { passive: true });
    return () => {
      scrollContainerRef.current?.removeEventListener("scroll", updateScrollLeft);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [scrollContainerRef]);

  // Calculate optimal interval based on actual content width (not container width)
  // Content width = duration in seconds * pixels per second at current zoom
  const BASE_PIXELS_PER_SECOND = 100;
  const contentWidth = useMemo(() => {
    if (durationMs <= 0) return 0;
    return (durationMs / 1000) * BASE_PIXELS_PER_SECOND * zoomScale;
  }, [durationMs, zoomScale]);

  const intervalMs = useMemo(() => {
    if (contentWidth <= 0) {
      // Fallback to current logic when width not yet calculated
      return durationMs < 5000 ? 500 : 1000;
    }
    return calculateOptimalInterval(contentWidth, durationMs, MIN_SPACING_PX);
  }, [contentWidth, durationMs]);

  // Calculate frame marker visibility
  const frameIntervalMs = useMemo(() => calculateFrameIntervalMs(fps), [fps]);
  const pixelsPerFrame = useMemo(() => calculatePixelsPerFrame(frameIntervalMs, zoomScale), [frameIntervalMs, zoomScale]);
  const showFrameMarkers = useMemo(() => shouldShowFrameMarkers(pixelsPerFrame), [pixelsPerFrame]);

  // Render frame markers on canvas
  useEffect(() => {
    if (!canvasRef.current || !showFrameMarkers || durationMs <= 0) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!container) return;

    // Set canvas size to match content width (full timeline width, not just viewport)
    const rect = container.getBoundingClientRect();
    canvas.width = contentWidth > 0 ? contentWidth : rect.width;
    canvas.height = rect.height;

    // Get viewport width from scroll container or container
    const viewportWidth = scrollContainerRef?.current?.clientWidth ?? container.clientWidth;
    const currentScrollLeft = scrollContainerRef?.current?.scrollLeft ?? scrollLeft;

    renderFrameMarkers(
      canvas,
      currentScrollLeft,
      viewportWidth,
      frameIntervalMs,
      durationMs,
      zoomScale,
      containerWidth,
      fps,
    );
  }, [showFrameMarkers, scrollLeft, frameIntervalMs, durationMs, zoomScale, containerWidth, scrollContainerRef, contentWidth]);

  if (durationMs <= 0) {
    return null;
  }

  // Generate time markers
  // When frame markers are visible, align time markers to frame boundaries
  const markers: number[] = useMemo(() => {
    if (showFrameMarkers && fps > 0) {
      // Find frame boundaries that align with nice time intervals
      // We want to show time markers at frame boundaries that correspond to round seconds
      const frameDurationS = 1 / fps;
      
      // Find a nice interval in frames (e.g., every N frames = round seconds)
      // Try to find frames that align with whole seconds, half seconds, quarter seconds, etc.
      const niceIntervals = [1, 0.5, 0.25, 0.1, 0.05]; // seconds
      let selectedIntervalS = niceIntervals[0];
      
      // Find the largest nice interval that gives us at least MIN_SPACING_PX spacing
      const BASE_PIXELS_PER_SECOND = 100;
      const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomScale;
      for (const intervalS of niceIntervals) {
        const pixelsPerInterval = intervalS * pixelsPerSecond;
        if (pixelsPerInterval >= MIN_SPACING_PX) {
          selectedIntervalS = intervalS;
          break;
        }
      }
      
      // Calculate how many frames equal the selected interval
      const framesPerInterval = Math.max(1, Math.round(selectedIntervalS / frameDurationS));
      
      // Generate markers at frame boundaries using same quantization logic as frame markers
      const frameMarkers: number[] = [];
      for (let frameIndex = 0; ; frameIndex += framesPerInterval) {
        const frameTimeSeconds = frameIndex * frameDurationS;
        // Quantize using same logic as PlaybackController and frame markers
        const quantizedSeconds = Math.round(frameTimeSeconds / frameDurationS) * frameDurationS;
        const frameTimeMs = quantizedSeconds * 1000;
        
        if (frameTimeMs > durationMs) break;
        frameMarkers.push(frameTimeMs);
      }
      
      return frameMarkers;
    } else {
      // Normal time markers when frame markers are not visible
      const normalMarkers: number[] = [];
      for (let timeMs = 0; timeMs <= durationMs; timeMs += intervalMs) {
        normalMarkers.push(timeMs);
      }
      return normalMarkers;
    }
  }, [showFrameMarkers, fps, intervalMs, durationMs, zoomScale]);

  return (
    <div ref={containerRef} className="absolute inset-0 flex pointer-events-none">
      {/* Canvas for frame markers - positioned behind time markers */}
      {showFrameMarkers && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
        />
      )}
      {/* Time markers - positioned above canvas */}
      <div className="relative" style={{ zIndex: 1 }}>
        {markers.map((timeMs) => {
          // Use pixel-based positioning with zoom
          const positionPixels = timeToPixels(timeMs, durationMs, containerWidth, zoomScale);
          const timeSeconds = timeMs / 1000;
          const displayTime = timeSeconds % 1 === 0 ? `${timeSeconds}s` : `${timeSeconds.toFixed(1)}s`;
          
          return (
            <div
              key={timeMs}
              className="absolute top-0 bottom-0 flex flex-col items-start"
              style={{ left: `${positionPixels}px` }}
            >
              {/* Tick mark */}
              <div className="w-px h-full bg-gray-600" />
              {/* Time label */}
              <div className="text-xs text-gray-400 font-mono mt-0.5 whitespace-nowrap">
                {displayTime}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

