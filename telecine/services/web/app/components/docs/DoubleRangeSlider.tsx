import { useState } from "react";

interface DoubleRangeSliderProps {
  min: number;
  max: number;
  step: number;
  startValue: number;
  endValue: number;
  onChange: (start: number, end: number) => void;
  disabled?: boolean;
  formatLabel?: (value: number) => string;
  className?: string;
}

export const DoubleRangeSlider = ({
  min,
  max,
  step,
  startValue,
  endValue,
  onChange,
  disabled = false,
  formatLabel = (value) => `${value}`,
  className = "",
}: DoubleRangeSliderProps) => {
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const handlePointerDown = (
    e: React.PointerEvent,
    handle: "start" | "end",
  ) => {
    if (disabled) return;
    e.preventDefault();
    setDragging(handle);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const rawValue = min + percentage * (max - min);
    const newValue = Math.round(rawValue / step) * step;

    if (dragging === "start") {
      const clampedStart = Math.max(min, Math.min(newValue, endValue - step));
      onChange(clampedStart, endValue);
    } else if (dragging === "end") {
      const clampedEnd = Math.max(startValue + step, Math.min(newValue, max));
      onChange(startValue, clampedEnd);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragging) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      setDragging(null);
    }
  };

  const startPercent = ((startValue - min) / (max - min)) * 100;
  const endPercent = ((endValue - min) / (max - min)) * 100;
  const rangePercent = endPercent - startPercent;

  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Range: {formatLabel(startValue)} - {formatLabel(endValue)}
        </label>

        {/* Custom Double Slider */}
        <div
          className={`relative h-12 px-2 select-none transition-opacity ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Track background */}
          <div className="absolute top-5 left-2 right-2 h-2 bg-gray-300 rounded" />

          {/* Selected range highlight */}
          <div
            className="absolute top-5 h-2 bg-blue-500 rounded"
            style={{
              left: `${2 + (startPercent * (100 - 4)) / 100}%`,
              width: `${(rangePercent * (100 - 4)) / 100}%`,
            }}
          />

          {/* Start handle */}
          <div
            className={`absolute top-3 w-6 h-6 bg-green-500 border-2 border-white rounded-full shadow-md cursor-grab ${dragging === "start" ? "scale-110" : "hover:scale-105"} transition-transform`}
            style={{
              left: `${startPercent}%`,
              transform: "translateX(-50%)",
            }}
            onPointerDown={(e) => handlePointerDown(e, "start")}
          />

          {/* End handle */}
          <div
            className={`absolute top-3 w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-md cursor-grab ${dragging === "end" ? "scale-110" : "hover:scale-105"} transition-transform`}
            style={{
              left: `${endPercent}%`,
              transform: "translateX(-50%)",
            }}
            onPointerDown={(e) => handlePointerDown(e, "end")}
          />

          {/* Time markers - evenly spaced within the track area */}
          <div
            className="absolute -bottom-1 text-xs text-gray-500"
            style={{ left: "8px" }}
          >
            {formatLabel(min)}
          </div>
          <div
            className="absolute -bottom-1 text-xs text-gray-500 transform -translate-x-1/2"
            style={{ left: "calc(8px + (100% - 16px) * 0.25)" }}
          >
            {formatLabel(min + (max - min) * 0.25)}
          </div>
          <div
            className="absolute -bottom-1 text-xs text-gray-500 transform -translate-x-1/2"
            style={{ left: "calc(8px + (100% - 16px) * 0.5)" }}
          >
            {formatLabel(min + (max - min) * 0.5)}
          </div>
          <div
            className="absolute -bottom-1 text-xs text-gray-500 transform -translate-x-1/2"
            style={{ left: "calc(8px + (100% - 16px) * 0.75)" }}
          >
            {formatLabel(min + (max - min) * 0.75)}
          </div>
          <div
            className="absolute -bottom-1 text-xs text-gray-500 transform -translate-x-full"
            style={{ left: "calc(100% - 8px)" }}
          >
            {formatLabel(max)}
          </div>
        </div>
      </div>
    </div>
  );
};
