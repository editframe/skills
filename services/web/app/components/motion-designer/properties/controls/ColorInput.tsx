import React from "react";

interface ColorInputProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
}

export function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
        {label}
      </label>
      <div className="flex-1 h-5 relative rounded-sm overflow-hidden border border-gray-700/30 hover:border-gray-600/50 transition-colors">
        <input
          type="color"
          value={value ?? "#FFFFFF"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer"
          style={{ margin: 0, padding: 0, border: "none" }}
        />
      </div>
    </div>
  );
}
