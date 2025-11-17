import React, { useState } from "react";
import { Lock, LockOpen, ArrowsIn, ArrowsOut, Ruler } from "@phosphor-icons/react";
import type { ElementSize, LegacyElementSize } from "~/lib/motion-designer/sizingTypes";
import { isLegacySize, normalizeSize } from "~/lib/motion-designer/sizingTypes";
import type { SizingMode } from "~/lib/motion-designer/sizingTypes";

interface DimensionsInputProps {
  label: string;
  size: ElementSize | LegacyElementSize | undefined;
  onChange: (size: ElementSize) => void;
}

export function DimensionsInput({ label, size, onChange }: DimensionsInputProps) {
  const [locked, setLocked] = useState(false);
  
  // Always read from props (source of truth)
  const normalizedSize = normalizeSize(size) || {
    widthMode: "fixed" as SizingMode,
    widthValue: 100,
    heightMode: "fixed" as SizingMode,
    heightValue: 100,
  };

  // Use normalized size directly - no local state needed for modes/values
  const widthMode = normalizedSize.widthMode;
  const widthValue = normalizedSize.widthValue;
  const heightMode = normalizedSize.heightMode;
  const heightValue = normalizedSize.heightValue;

  const handleWidthModeChange = (mode: SizingMode) => {
    // Preserve current value when switching modes (unless switching to hug, then use 0)
    const newWidthValue = mode === "fixed" ? (widthValue || 100) : (mode === "hug" ? 0 : (widthValue || 100));
    
    if (locked && widthMode === "fixed" && heightMode === "fixed" && mode === "fixed") {
      // Maintain aspect ratio when locked and both are fixed
      const aspectRatio = widthValue / heightValue;
      const newHeightValue = Math.round(newWidthValue / aspectRatio);
      onChange({
        widthMode: mode,
        widthValue: newWidthValue,
        heightMode: "fixed",
        heightValue: newHeightValue,
      });
    } else {
      onChange({
        widthMode: mode,
        widthValue: newWidthValue,
        heightMode,
        heightValue,
      });
    }
  };

  const handleHeightModeChange = (mode: SizingMode) => {
    // Preserve current value when switching modes (unless switching to hug, then use 0)
    const newHeightValue = mode === "fixed" ? (heightValue || 100) : (mode === "hug" ? 0 : (heightValue || 100));
    
    if (locked && widthMode === "fixed" && heightMode === "fixed" && mode === "fixed") {
      // Maintain aspect ratio when locked and both are fixed
      const aspectRatio = widthValue / heightValue;
      const newWidthValue = Math.round(newHeightValue * aspectRatio);
      onChange({
        widthMode: "fixed",
        widthValue: newWidthValue,
        heightMode: mode,
        heightValue: newHeightValue,
      });
    } else {
      onChange({
        widthMode,
        widthValue,
        heightMode: mode,
        heightValue: newHeightValue,
      });
    }
  };

  const handleWidthValueChange = (newWidth: number) => {
    if (locked && widthMode === "fixed" && heightMode === "fixed") {
      const aspectRatio = widthValue / heightValue;
      const newHeight = Math.round(newWidth / aspectRatio);
      onChange({
        widthMode,
        widthValue: newWidth,
        heightMode,
        heightValue: newHeight,
      });
    } else {
      onChange({
        widthMode,
        widthValue: newWidth,
        heightMode,
        heightValue,
      });
    }
  };

  const handleHeightValueChange = (newHeight: number) => {
    if (locked && widthMode === "fixed" && heightMode === "fixed") {
      const aspectRatio = widthValue / heightValue;
      const newWidth = Math.round(newHeight * aspectRatio);
      onChange({
        widthMode,
        widthValue: newWidth,
        heightMode,
        heightValue: newHeight,
      });
    } else {
      onChange({
        widthMode,
        widthValue,
        heightMode,
        heightValue: newHeight,
      });
    }
  };

  const ModeButton = ({ 
    mode, 
    icon, 
    label: modeLabel, 
    isActive, 
    onClick 
  }: { 
    mode: SizingMode; 
    icon: React.ReactNode; 
    label: string; 
    isActive: boolean; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] font-medium
        transition-colors flex-1
        ${isActive 
          ? "bg-blue-600 text-white" 
          : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
        }
      `}
      title={modeLabel}
    >
      {icon}
      <span className="hidden sm:inline">{modeLabel}</span>
    </button>
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">{label}</label>
        <div className="flex-1 space-y-1">
          {/* Width Controls */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-gray-600 font-bold uppercase w-3">W</span>
              <div className="flex-1 flex gap-1">
                <ModeButton
                  mode="hug"
                  icon={<ArrowsIn className="w-2.5 h-2.5" />}
                  label="Hug"
                  isActive={widthMode === "hug"}
                  onClick={() => handleWidthModeChange("hug")}
                />
                <ModeButton
                  mode="fill"
                  icon={<ArrowsOut className="w-2.5 h-2.5" />}
                  label="Fill"
                  isActive={widthMode === "fill"}
                  onClick={() => handleWidthModeChange("fill")}
                />
                <ModeButton
                  mode="fixed"
                  icon={<Ruler className="w-2.5 h-2.5" />}
                  label="Fixed"
                  isActive={widthMode === "fixed"}
                  onClick={() => handleWidthModeChange("fixed")}
                />
              </div>
            </div>
            {widthMode === "fixed" && (
              <div className="flex items-center gap-1 pl-4">
                <input
                  type="number"
                  value={widthValue}
                  onChange={(e) => handleWidthValueChange(Number(e.target.value))}
                  className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-[8px] text-gray-500">px</span>
              </div>
            )}
          </div>

          {/* Lock Button */}
          <div className="flex items-center justify-center pl-3">
            <button
              onClick={() => setLocked(!locked)}
              className={`
                w-4 h-4 flex items-center justify-center rounded
                transition-colors
                ${locked 
                  ? "text-blue-500 hover:text-blue-400" 
                  : "text-gray-600 hover:text-gray-400"
                }
              `}
              title={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
            >
              {locked ? <Lock className="w-2.5 h-2.5" /> : <LockOpen className="w-2.5 h-2.5" />}
            </button>
          </div>

          {/* Height Controls */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-gray-600 font-bold uppercase w-3">H</span>
              <div className="flex-1 flex gap-1">
                <ModeButton
                  mode="hug"
                  icon={<ArrowsIn className="w-2.5 h-2.5" />}
                  label="Hug"
                  isActive={heightMode === "hug"}
                  onClick={() => handleHeightModeChange("hug")}
                />
                <ModeButton
                  mode="fill"
                  icon={<ArrowsOut className="w-2.5 h-2.5" />}
                  label="Fill"
                  isActive={heightMode === "fill"}
                  onClick={() => handleHeightModeChange("fill")}
                />
                <ModeButton
                  mode="fixed"
                  icon={<Ruler className="w-2.5 h-2.5" />}
                  label="Fixed"
                  isActive={heightMode === "fixed"}
                  onClick={() => handleHeightModeChange("fixed")}
                />
              </div>
            </div>
            {heightMode === "fixed" && (
              <div className="flex items-center gap-1 pl-4">
                <input
                  type="number"
                  value={heightValue}
                  onChange={(e) => handleHeightValueChange(Number(e.target.value))}
                  className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-[8px] text-gray-500">px</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
