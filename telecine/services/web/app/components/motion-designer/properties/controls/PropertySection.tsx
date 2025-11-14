import React, { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

interface PropertySectionProps {
  title: string;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function PropertySection({ title, defaultExpanded = true, icon, children }: PropertySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-gray-700/20 last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-gray-200 hover:bg-gray-750/30 active:bg-gray-750/50 transition-all"
      >
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-gray-400 opacity-80">{icon}</span>}
          <span className="tracking-tight">{title}</span>
        </div>
        <CaretDown
          className={`h-3 w-3 text-gray-500 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      <div
        className={`transition-all duration-150 overflow-hidden ${
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-3 pb-2.5 pt-0.5 space-y-1.5">
          {children}
        </div>
      </div>
    </div>
  );
}

