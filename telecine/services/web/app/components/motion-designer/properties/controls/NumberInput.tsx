import React from "react";

interface NumberInputProps {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInput({
  label,
  value,
  onChange,
  unit,
  placeholder,
  min,
  max,
  step = 1,
}: NumberInputProps) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[10px] text-gray-500 w-11 font-normal flex-shrink-0">
        {label}
      </label>
      <div className="relative flex-1">
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-5 px-1.5 pr-5 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white placeholder:text-gray-700 hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors"
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
        />
        {unit && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 pointer-events-none font-bold uppercase">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

