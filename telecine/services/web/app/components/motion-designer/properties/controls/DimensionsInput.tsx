import React, { useState } from "react";
import { Lock, LockOpen, ArrowsIn, ArrowsOut, Ruler } from "@phosphor-icons/react";
import type { ElementSize, LegacyElementSize, FractionRatio } from "~/lib/motion-designer/sizingTypes";
import { isLegacySize, normalizeSize, FRACTION_RATIOS, fractionToString, isFractionRatio, SIZING_MODE_LABELS, fractionToDisplayString } from "~/lib/motion-designer/sizingTypes";
import type { SizingMode } from "~/lib/motion-designer/sizingTypes";

interface DimensionsInputProps {
  label: string;
  size: ElementSize | LegacyElementSize | undefined;
  onChange: (size: ElementSize) => void;
}

export function DimensionsInput({ label, size, onChange }: DimensionsInputProps) {
  const [locked, setLocked] = useState(false);
  
  // Always read from props (source of truth)
  // Default to responsive (fraction) mode for responsive-first design
  const normalizedSize = normalizeSize(size) || {
    widthMode: "fraction" as SizingMode,
    widthValue: { numerator: 1, denominator: 2 },
    heightMode: "fraction" as SizingMode,
    heightValue: { numerator: 1, denominator: 2 },
  };

  // Use normalized size directly - no local state needed for modes/values
  const widthMode = normalizedSize.widthMode;
  const widthValue = normalizedSize.widthValue;
  const heightMode = normalizedSize.heightMode;
  const heightValue = normalizedSize.heightValue;

  const handleWidthModeChange = (mode: SizingMode) => {
    let newWidthValue: number | FractionRatio;
    
    if (mode === "fraction") {
      // Default to 1/2 when switching to fraction
      newWidthValue = { numerator: 1, denominator: 2 };
    } else if (mode === "fixed") {
      // If current value is a fraction, convert to nearest pixel value
      if (isFractionRatio(widthValue)) {
        newWidthValue = 100; // Default fallback
      } else {
        newWidthValue = typeof widthValue === "number" ? widthValue : 100;
      }
    } else if (mode === "hug") {
      newWidthValue = 0;
    } else {
      // fill mode
      newWidthValue = typeof widthValue === "number" ? widthValue : 100;
    }
    
    if (locked && widthMode === "fixed" && heightMode === "fixed" && mode === "fixed") {
      // Maintain aspect ratio when locked and both are fixed
      const currentWidth = typeof widthValue === "number" ? widthValue : 100;
      const currentHeight = typeof heightValue === "number" ? heightValue : 100;
      const aspectRatio = currentWidth / currentHeight;
      const newHeightValue = Math.round((typeof newWidthValue === "number" ? newWidthValue : 100) / aspectRatio);
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
    let newHeightValue: number | FractionRatio;
    
    if (mode === "fraction") {
      // Default to 1/2 when switching to fraction
      newHeightValue = { numerator: 1, denominator: 2 };
    } else if (mode === "fixed") {
      // If current value is a fraction, convert to nearest pixel value
      if (isFractionRatio(heightValue)) {
        newHeightValue = 100; // Default fallback
      } else {
        newHeightValue = typeof heightValue === "number" ? heightValue : 100;
      }
    } else if (mode === "hug") {
      newHeightValue = 0;
    } else {
      // fill mode
      newHeightValue = typeof heightValue === "number" ? heightValue : 100;
    }
    
    if (locked && widthMode === "fixed" && heightMode === "fixed" && mode === "fixed") {
      // Maintain aspect ratio when locked and both are fixed
      const currentWidth = typeof widthValue === "number" ? widthValue : 100;
      const currentHeight = typeof heightValue === "number" ? heightValue : 100;
      const aspectRatio = currentWidth / currentHeight;
      const newWidthValue = Math.round((typeof newHeightValue === "number" ? newHeightValue : 100) * aspectRatio);
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
      const currentWidth = typeof widthValue === "number" ? widthValue : 100;
      const currentHeight = typeof heightValue === "number" ? heightValue : 100;
      const aspectRatio = currentWidth / currentHeight;
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

  const handleWidthFractionChange = (fraction: FractionRatio) => {
    onChange({
      widthMode,
      widthValue: fraction,
      heightMode,
      heightValue,
    });
  };

  const handleHeightValueChange = (newHeight: number) => {
    if (locked && widthMode === "fixed" && heightMode === "fixed") {
      const currentWidth = typeof widthValue === "number" ? widthValue : 100;
      const currentHeight = typeof heightValue === "number" ? heightValue : 100;
      const aspectRatio = currentWidth / currentHeight;
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

  const handleHeightFractionChange = (fraction: FractionRatio) => {
    onChange({
      widthMode,
      widthValue,
      heightMode,
      heightValue: fraction,
    });
  };

  const ModeButton = ({ 
    mode, 
    icon, 
    isActive, 
    onClick,
    isProminent = false,
  }: { 
    mode: SizingMode; 
    icon: React.ReactNode; 
    isActive: boolean; 
    onClick: () => void;
    isProminent?: boolean;
  }) => {
    const modeLabel = SIZING_MODE_LABELS[mode];
    return (
      <button
        onClick={onClick}
        className={`
          flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] font-medium
          transition-colors
          ${isProminent ? "flex-[1.2]" : "flex-1"}
          ${isActive 
            ? "bg-blue-600 text-white" 
            : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
          }
          ${isProminent && !isActive ? "ring-1 ring-gray-600/50" : ""}
        `}
        title={modeLabel}
      >
        {icon}
        <span className="hidden sm:inline">{modeLabel}</span>
      </button>
    );
  };

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
                  mode="fraction"
                  icon={<div className="w-2.5 h-2.5 flex flex-col items-center justify-center text-[8px] leading-none"><span>1</span><span className="border-t border-current w-full"></span><span>2</span></div>}
                  isActive={widthMode === "fraction"}
                  onClick={() => handleWidthModeChange("fraction")}
                  isProminent={true}
                />
                <ModeButton
                  mode="hug"
                  icon={<ArrowsIn className="w-2.5 h-2.5" />}
                  isActive={widthMode === "hug"}
                  onClick={() => handleWidthModeChange("hug")}
                />
                <ModeButton
                  mode="fill"
                  icon={<ArrowsOut className="w-2.5 h-2.5" />}
                  isActive={widthMode === "fill"}
                  onClick={() => handleWidthModeChange("fill")}
                />
                <ModeButton
                  mode="fixed"
                  icon={<Ruler className="w-2.5 h-2.5" />}
                  isActive={widthMode === "fixed"}
                  onClick={() => handleWidthModeChange("fixed")}
                />
              </div>
            </div>
            {widthMode === "fixed" && (
              <div className="flex items-center gap-1 pl-4">
                <input
                  type="number"
                  value={typeof widthValue === "number" ? widthValue : 0}
                  onChange={(e) => handleWidthValueChange(Number(e.target.value))}
                  className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-[8px] text-gray-500">px</span>
              </div>
            )}
            {widthMode === "fraction" && (
              <div className="flex items-center gap-1 pl-4">
                <select
                  value={isFractionRatio(widthValue) ? fractionToString(widthValue) : "1/2"}
                  onChange={(e) => {
                    const [num, den] = e.target.value.split("/").map(Number);
                    handleWidthFractionChange({ numerator: num, denominator: den });
                  }}
                  className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                >
                  {FRACTION_RATIOS.map((ratio) => (
                    <option key={fractionToString(ratio)} value={fractionToString(ratio)}>
                      {fractionToString(ratio)} ({fractionToDisplayString(ratio)})
                    </option>
                  ))}
                </select>
                {isFractionRatio(widthValue) && (
                  <span className="text-[8px] text-gray-400 font-medium">
                    {fractionToDisplayString(widthValue)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Lock Button - Integrated into size control */}
          <div className="flex items-center gap-1 pl-3">
            <button
              onClick={() => setLocked(!locked)}
              className={`
                w-4 h-4 flex items-center justify-center rounded
                transition-colors
                ${locked 
                  ? "text-blue-500 hover:text-blue-400 bg-blue-500/10" 
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
                  mode="fraction"
                  icon={<div className="w-2.5 h-2.5 flex flex-col items-center justify-center text-[8px] leading-none"><span>1</span><span className="border-t border-current w-full"></span><span>2</span></div>}
                  isActive={heightMode === "fraction"}
                  onClick={() => handleHeightModeChange("fraction")}
                  isProminent={true}
                />
                <ModeButton
                  mode="hug"
                  icon={<ArrowsIn className="w-2.5 h-2.5" />}
                  isActive={heightMode === "hug"}
                  onClick={() => handleHeightModeChange("hug")}
                />
                <ModeButton
                  mode="fill"
                  icon={<ArrowsOut className="w-2.5 h-2.5" />}
                  isActive={heightMode === "fill"}
                  onClick={() => handleHeightModeChange("fill")}
                />
                <ModeButton
                  mode="fixed"
                  icon={<Ruler className="w-2.5 h-2.5" />}
                  isActive={heightMode === "fixed"}
                  onClick={() => handleHeightModeChange("fixed")}
                />
              </div>
            </div>
            {heightMode === "fixed" && (
              <div className="flex items-center gap-1 pl-4">
                <input
                  type="number"
                  value={typeof heightValue === "number" ? heightValue : 0}
                  onChange={(e) => handleHeightValueChange(Number(e.target.value))}
                  className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-[8px] text-gray-500">px</span>
              </div>
            )}
            {heightMode === "fraction" && (
              <div className="flex items-center gap-1 pl-4">
                <select
                  value={isFractionRatio(heightValue) ? fractionToString(heightValue) : "1/2"}
                  onChange={(e) => {
                    const [num, den] = e.target.value.split("/").map(Number);
                    handleHeightFractionChange({ numerator: num, denominator: den });
                  }}
                  className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                >
                  {FRACTION_RATIOS.map((ratio) => (
                    <option key={fractionToString(ratio)} value={fractionToString(ratio)}>
                      {fractionToString(ratio)} ({fractionToDisplayString(ratio)})
                    </option>
                  ))}
                </select>
                {isFractionRatio(heightValue) && (
                  <span className="text-[8px] text-gray-400 font-medium">
                    {fractionToDisplayString(heightValue)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
