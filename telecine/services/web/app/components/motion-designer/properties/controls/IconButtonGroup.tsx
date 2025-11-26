import React from "react";
import { IconButton } from "./IconButton";

interface IconButtonOption {
  value: string;
  icon: React.ReactNode;
  title: string;
}

interface IconButtonGroupProps {
  label: string;
  options: IconButtonOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function IconButtonGroup({
  label,
  options,
  value,
  onChange,
}: IconButtonGroupProps) {
  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
        {label}
      </label>
      <div className="flex gap-px">
        {options.map((option) => (
          <IconButton
            key={option.value}
            icon={option.icon}
            onClick={() => onChange(option.value)}
            active={value === option.value}
            title={option.title}
          />
        ))}
      </div>
    </div>
  );
}
