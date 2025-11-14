import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
}

export function SelectInput({ label, value, onChange, options }: SelectInputProps) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[10px] text-gray-500 w-11 font-normal flex-shrink-0">
        {label}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-5 px-1.5 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors appearance-none cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

