import React from "react";

interface CheckboxInputProps {
  label: string;
  checked: boolean | undefined;
  onChange: (checked: boolean) => void;
}

export function CheckboxInput({ label, checked, onChange }: CheckboxInputProps) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="checkbox"
        checked={checked ?? false}
        onChange={(e) => onChange(e.target.checked)}
        className="w-2.5 h-2.5 rounded-sm border-gray-700/30 bg-gray-900/50 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-colors"
      />
      <label className="text-[10px] text-gray-500 cursor-pointer font-normal" onClick={() => onChange(!checked)}>
        {label}
      </label>
    </div>
  );
}

