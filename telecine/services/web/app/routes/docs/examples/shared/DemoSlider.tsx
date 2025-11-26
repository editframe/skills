import React from "react";

export interface DemoSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  className?: string;
}

export function DemoSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  className = "",
}: DemoSliderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-600 font-mono">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number.parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 demo-slider"
        />
        <div
          className="absolute top-0 left-0 h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg pointer-events-none"
          style={{
            width: `${((value - min) / (max - min)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

// Add global styles for slider thumbs
export const SliderStyles = () => (
  <style>{`
    .demo-slider::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: 2px solid #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .demo-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: 2px solid #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border: none;
    }
  `}</style>
);
