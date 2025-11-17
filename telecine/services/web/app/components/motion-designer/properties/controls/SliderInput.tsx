import React from "react";

interface SliderInputProps {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  displayMultiplier?: number;
  unit?: string;
}

export function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  displayMultiplier = 1,
  unit = "",
}: SliderInputProps) {
  const defaultValue = displayMultiplier === 100 ? 1 : 0;
  const displayValue = Math.round((value ?? defaultValue) * displayMultiplier);

  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onChange={(e) => onChange(Number(e.target.value) / displayMultiplier)}
        className="flex-1 h-1 bg-gray-900 rounded-full appearance-none cursor-pointer accent-blue-500/80"
        style={{
          WebkitAppearance: "none",
          MozAppearance: "none",
        }}
      />
      <span className="text-[9px] text-gray-500 w-8 text-right font-medium tabular-nums">
        {displayValue}{unit}
      </span>
    </div>
  );
}

