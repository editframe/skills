import { Timegroup, Preview, Video } from "@editframe/react";
import { ResizableBox } from "@editframe/react";
import type { BoxBounds } from "@editframe/elements";

export interface CropHandle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Helper functions to convert between percentage and pixel coordinates
// Using consistent precision for both positioning and translation
function cropToPixelBounds(
  crop: CropHandle,
  containerWidth: number,
  containerHeight: number,
): BoxBounds {
  return {
    x: Math.round((crop.x * containerWidth) / 100),
    y: Math.round((crop.y * containerHeight) / 100),
    width: Math.round((crop.width * containerWidth) / 100),
    height: Math.round((crop.height * containerHeight) / 100),
  };
}

function pixelBoundsToCrop(
  bounds: BoxBounds,
  containerWidth: number,
  containerHeight: number,
): CropHandle {
  return {
    x: Math.round(((bounds.x * 100) / containerWidth) * 10) / 10, // Round to 1 decimal
    y: Math.round(((bounds.y * 100) / containerHeight) * 10) / 10,
    width: Math.round(((bounds.width * 100) / containerWidth) * 10) / 10,
    height: Math.round(((bounds.height * 100) / containerHeight) * 10) / 10,
  };
}

export interface VideoCropToolProps {
  crop: CropHandle;
  onCropChange: (crop: CropHandle) => void;
  src: string;
  currentTime: number;
  width?: number;
  height?: number;
  className?: string;
}

export function VideoCropTool({
  crop,
  onCropChange,
  src,
  width = 400,
  height = 300,
  className = "",
}: VideoCropToolProps) {
  // Convert percentage-based crop to pixel bounds for ResizableBox
  const pixelBounds = cropToPixelBounds(crop, width, height);

  const handleBoundsChange = (newBounds: BoxBounds) => {
    const newCrop = pixelBoundsToCrop(newBounds, width, height);
    onCropChange(newCrop);
  };

  return (
    <div
      className={`relative bg-black overflow-hidden border-2 border-gray-300 ${className}`}
      style={{ width, height }}
    >
      <Preview className="w-full h-full">
        <Timegroup mode="contain" className="w-full h-full">
          <Video src={src} className="w-full h-full object-contain" />

          {/* Crop overlay using ResizableBox */}
          <ResizableBox
            bounds={pixelBounds}
            onBounds-change={(e: CustomEvent<{ bounds: BoxBounds }>) =>
              handleBoundsChange(e.detail.bounds)
            }
            containerWidth={width}
            containerHeight={height}
            minSize={Math.min(width, height) * 0.1} // 10% of container size
          />
        </Timegroup>
      </Preview>
    </div>
  );
}
