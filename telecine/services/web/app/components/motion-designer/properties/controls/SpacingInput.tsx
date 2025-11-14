import React from "react";

interface SpacingValue {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface SpacingInputProps {
  label: string;
  value: SpacingValue | undefined;
  onChange: (value: SpacingValue) => void;
}

export function SpacingInput({ label, value, onChange }: SpacingInputProps) {
  const currentValue = value ?? {};

  const handleChange = (side: keyof SpacingValue, newValue: number) => {
    onChange({
      ...currentValue,
      [side]: newValue,
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[10px] text-gray-500 w-11 font-normal flex-shrink-0">
        {label}
      </label>
      <div className="flex-1 grid grid-cols-4 gap-px">
        <input
          type="number"
          value={currentValue.top ?? 0}
          onChange={(e) => handleChange("top", Number(e.target.value))}
          className="h-5 px-0.5 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white text-center hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors"
          placeholder="T"
          title="Top"
        />
        <input
          type="number"
          value={currentValue.right ?? 0}
          onChange={(e) => handleChange("right", Number(e.target.value))}
          className="h-5 px-0.5 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white text-center hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors"
          placeholder="R"
          title="Right"
        />
        <input
          type="number"
          value={currentValue.bottom ?? 0}
          onChange={(e) => handleChange("bottom", Number(e.target.value))}
          className="h-5 px-0.5 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white text-center hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors"
          placeholder="B"
          title="Bottom"
        />
        <input
          type="number"
          value={currentValue.left ?? 0}
          onChange={(e) => handleChange("left", Number(e.target.value))}
          className="h-5 px-0.5 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white text-center hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors"
          placeholder="L"
          title="Left"
        />
      </div>
    </div>
  );
}

