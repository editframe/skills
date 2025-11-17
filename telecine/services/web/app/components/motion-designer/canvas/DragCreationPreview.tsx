import React from "react";

interface DragCreationPreviewProps {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  elementType: string;
}

export function DragCreationPreview({
  startX,
  startY,
  currentX,
  currentY,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  elementType,
}: DragCreationPreviewProps) {
  // Convert canvas coordinates to screen coordinates for overlay layer
  // The overlay layer already has translate applied, so we just need to scale
  const screenStartX = startX * canvasScale;
  const screenStartY = startY * canvasScale;
  const screenCurrentX = currentX * canvasScale;
  const screenCurrentY = currentY * canvasScale;

  const left = Math.min(screenStartX, screenCurrentX);
  const top = Math.min(screenStartY, screenCurrentY);
  const width = Math.abs(screenCurrentX - screenStartX);
  const height = Math.abs(screenCurrentY - screenStartY);

  // Don't show preview if too small
  if (width < 5 || height < 5) {
    return null;
  }

  return (
    <div
      className="absolute pointer-events-none border-2 border-dashed border-blue-500 bg-blue-500/10"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 100,
      }}
    >
      {/* Show dimensions in center if large enough */}
      {width > 80 && height > 30 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-blue-400 font-mono bg-blue-500/20">
          {Math.round(width / canvasScale)} × {Math.round(height / canvasScale)}
        </div>
      )}
    </div>
  );
}

