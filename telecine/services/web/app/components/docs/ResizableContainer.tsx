import React, { useState, useRef, useEffect, useCallback } from "react";
import { TransformHandles } from "@editframe/react";

interface ResizableContainerProps {
  initialWidth?: number;
  initialHeight?: number;
  minSize?: number;
  children: React.ReactNode;
  className?: string;
}

export function ResizableContainer({
  initialWidth = 400,
  initialHeight = 300,
  minSize = 150,
  children,
  className = "",
}: ResizableContainerProps) {
  const containerIdRef = useRef(`resizable-container-${Math.random().toString(36).substring(2, 9)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Update container size
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
  }, [width, height]);

  const handleBoundsChange = useCallback((e: CustomEvent<{ bounds: { x: number; y: number; width: number; height: number } }>) => {
    const newBounds = e.detail.bounds;
    // Update container size based on new bounds
    setWidth(Math.max(minSize, newBounds.width));
    setHeight(Math.max(minSize, newBounds.height));
  }, [minSize]);

  return (
    <div 
      ref={wrapperRef}
      className={`relative inline-block ${className}`} 
      style={{ position: "relative" }}
    >
      <div
        ref={containerRef}
        id={containerIdRef.current}
        style={{
          width: `${initialWidth}px`,
          height: `${initialHeight}px`,
          position: "relative",
        }}
        className="border-2 border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600"
      >
        {children}
      </div>
      <TransformHandles
        target={`#${containerIdRef.current}`}
        enableResize={true}
        enableDrag={false}
        enableRotation={false}
        minSize={minSize}
        onBoundsChange={handleBoundsChange as any}
      />
    </div>
  );
}

