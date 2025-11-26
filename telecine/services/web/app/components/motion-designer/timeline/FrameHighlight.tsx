import { useMemo } from "react";
import { timeToPixels, calculateContentWidth } from "./timelinePosition";
import { quantizeToFrameTimeMs } from "@editframe/elements";

interface FrameHighlightProps {
  currentTime: number;
  durationMs: number;
  zoomScale: number;
  containerWidth: number;
  fps: number;
  showFrameMarkers: boolean;
}

/**
 * Highlights the current frame as a rectangle to show that frames have duration,
 * not just instant points in time.
 */
export function FrameHighlight({
  currentTime,
  durationMs,
  zoomScale,
  containerWidth,
  fps,
  showFrameMarkers,
}: FrameHighlightProps) {
  // Only show when frame markers are visible
  if (!showFrameMarkers || fps <= 0 || durationMs <= 0) {
    return null;
  }

  // Calculate current frame bounds using same quantization logic
  const quantizedTimeMs = quantizeToFrameTimeMs(currentTime, fps);
  const frameDurationMs = 1000 / fps;
  const frameStartMs = quantizedTimeMs;
  const frameEndMs = Math.min(frameStartMs + frameDurationMs, durationMs);

  // Calculate pixel positions - timeToPixels doesn't actually use containerWidth,
  // it calculates based on zoomScale and durationMs (pixels per second)
  // This matches how TimelineRuler and TimelinePlayhead calculate positions
  const startPixels = timeToPixels(
    frameStartMs,
    durationMs,
    containerWidth,
    zoomScale,
  );
  const endPixels = timeToPixels(
    frameEndMs,
    durationMs,
    containerWidth,
    zoomScale,
  );
  const widthPixels = endPixels - startPixels;

  // Don't render if width is too small or invalid
  if (widthPixels <= 0 || startPixels < 0) {
    return null;
  }

  // Debug logging (remove after confirming it works)
  console.log("FrameHighlight render:", {
    currentTime,
    quantizedTimeMs,
    frameStartMs,
    frameEndMs,
    startPixels,
    endPixels,
    widthPixels,
    showFrameMarkers,
    fps,
  });

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        left: `${startPixels}px`,
        width: `${widthPixels}px`,
        backgroundColor: "rgba(59, 130, 246, 0.4)", // blue-500 with 40% opacity - very visible for testing
        borderLeft: "2px solid rgba(59, 130, 246, 0.8)",
        zIndex: 5, // Higher z-index to ensure visibility
      }}
    />
  );
}
