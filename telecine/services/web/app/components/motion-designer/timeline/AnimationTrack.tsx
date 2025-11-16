import React, { useState, useRef, useEffect } from "react";
import type { MotionDesignerState, ElementNode, Animation } from "~/lib/motion-designer/types";
import { useMotionDesignerActions } from "../context/MotionDesignerContext";

interface AnimationTrackProps {
  element: ElementNode;
  animation: Animation;
  durationMs: number;
  timelineContainerRef: React.RefObject<HTMLDivElement>;
  snapPoints: number[];
  currentTime: number;
  isSelected: boolean;
}

interface AnimationBarProps {
  animation: Animation;
  element: ElementNode;
  durationMs: number;
  trackContainerRef: React.RefObject<HTMLDivElement>;
  onUpdate: (updates: Partial<Animation>) => void;
  snapPoints: number[];
  currentTime: number;
  onSelect: () => void;
  isSelected: boolean;
}

function AnimationBar({
  animation,
  element,
  durationMs,
  trackContainerRef,
  onUpdate,
  snapPoints,
  currentTime,
  onSelect,
  isSelected,
}: AnimationBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; time: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const leftPercent = durationMs > 0 ? (animation.delay / durationMs) * 100 : 0;
  const widthPercent = durationMs > 0 ? (animation.duration / durationMs) * 100 : 0;

  // Helper to snap a time value to nearby snap points (snaps by default, shift disables)
  const snapToNearestPoint = (timeMs: number, shiftPressed: boolean): number => {
    // If shift is pressed, disable snapping for arbitrary precision
    if (shiftPressed) return timeMs;
    
    // Include playhead as a snap point
    const allSnapPoints = [...snapPoints, currentTime];
    // Use a small threshold so snapping only happens when very close to a snap point
    // This allows precise placement at exact times like 0, 1000, 2000ms
    const snapThresholdMs = 5;
    
    // Find the nearest snap point within threshold
    let nearestSnapPoint: number | null = null;
    let minDistance = snapThresholdMs;
    
    for (const snapPoint of allSnapPoints) {
      const distance = Math.abs(timeMs - snapPoint);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSnapPoint = snapPoint;
      }
    }
    
    return nearestSnapPoint ?? timeMs;
  };

  const handleMouseDown = (e: React.MouseEvent, resizeType: "left" | "right" | "move") => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!trackContainerRef.current) return;

    const rect = trackContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const currentTimeMs = (x / rect.width) * durationMs;

    if (resizeType === "left") {
      setIsResizingLeft(true);
      setDragStart({ x, time: animation.delay });
    } else if (resizeType === "right") {
      setIsResizingRight(true);
      setDragStart({ x, time: animation.delay + animation.duration });
    } else {
      setIsDragging(true);
      setDragStart({ x, time: animation.delay });
    }
  };

  useEffect(() => {
    if (!isDragging && !isResizingLeft && !isResizingRight) return;
    if (!dragStart || !trackContainerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackContainerRef.current) return;

      const rect = trackContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const deltaX = x - dragStart.x;
      const deltaTime = (deltaX / rect.width) * durationMs;

      if (isResizingLeft) {
        // Resize from left - change delay and duration
        let newDelay = Math.max(0, Math.min(dragStart.time + deltaTime, animation.delay + animation.duration - 10));
        newDelay = snapToNearestPoint(newDelay, e.shiftKey);
        const newDuration = (animation.delay + animation.duration) - newDelay;
        onUpdate({ delay: newDelay, duration: newDuration });
      } else if (isResizingRight) {
        // Resize from right - change duration only
        let newEndTime = Math.max(animation.delay + 10, Math.min(dragStart.time + deltaTime, durationMs));
        newEndTime = snapToNearestPoint(newEndTime, e.shiftKey);
        const newDuration = newEndTime - animation.delay;
        onUpdate({ duration: newDuration });
      } else if (isDragging) {
        // Move the whole animation - change delay only
        let newDelay = Math.max(0, Math.min(dragStart.time + deltaTime, durationMs - animation.duration));
        newDelay = snapToNearestPoint(newDelay, e.shiftKey);
        onUpdate({ delay: newDelay });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizingLeft(false);
      setIsResizingRight(false);
      setDragStart(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizingLeft, isResizingRight, dragStart, durationMs, animation, onUpdate]);

  const elementName = `${element.type} ${element.id.slice(0, 4)}`;

  const handleClick = (e: React.MouseEvent) => {
    // If we didn't drag, treat as a click to select
    if (!isDragging && !isResizingLeft && !isResizingRight) {
      e.stopPropagation();
      onSelect();
    }
  };

  return (
    <div
      ref={barRef}
      className={`group absolute top-0 bottom-0 rounded-sm cursor-move z-20 ${isSelected ? 'ring-2 ring-white ring-inset' : ''}`}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        minWidth: "40px",
        backgroundColor: isSelected ? "rgb(160, 150, 255)" : "rgb(180, 170, 255)",
      }}
      onMouseDown={(e) => handleMouseDown(e, "move")}
      onClick={handleClick}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-300/60 cursor-col-resize hover:bg-white hover:w-1 transition-all"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleMouseDown(e, "left");
        }}
      />
      
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-0.5 bg-purple-300/60 cursor-col-resize hover:bg-white hover:w-1 transition-all"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleMouseDown(e, "right");
        }}
      />
      
      {/* Animation label */}
      <div className="absolute inset-0 flex items-center gap-1 px-2 pointer-events-none">
        <span className="text-[10px] text-purple-900 font-medium truncate opacity-70">
          {animation.name}
        </span>
      </div>
    </div>
  );
}

export function AnimationTrack({
  element,
  animation,
  durationMs,
  timelineContainerRef,
  snapPoints,
  currentTime,
  isSelected,
}: AnimationTrackProps) {
  const actions = useMotionDesignerActions();
  const elementName = `${element.type} ${element.id.slice(0, 4)}`;

  return (
    <div className="flex items-center border-b border-gray-700/50 h-8 hover:bg-gray-800/30">
      <div className="text-xs text-gray-400 truncate px-2 flex items-center gap-1 min-w-[60px]">
        <span className="text-gray-500 text-[10px]">›</span>
        <span className="truncate font-light">{animation.name}</span>
      </div>
      <div className="flex-1 relative h-full bg-gray-900/20">
        <AnimationBar
          animation={animation}
          element={element}
          durationMs={durationMs}
          trackContainerRef={timelineContainerRef}
          onUpdate={(updates) => {
            actions.updateAnimation(element.id, animation.id, updates);
          }}
          snapPoints={snapPoints}
          currentTime={currentTime}
          onSelect={() => actions.selectAnimation(animation.id, element.id)}
          isSelected={isSelected}
        />
      </div>
    </div>
  );
}

