import React, { useState, useEffect } from "react";
import { Lock, LockOpen } from "@phosphor-icons/react";

interface PaddingValue {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface PaddingInputProps {
  label: string;
  value: PaddingValue | undefined;
  onChange: (value: PaddingValue) => void;
}

export function PaddingInput({ label, value, onChange }: PaddingInputProps) {
  const currentValue = value ?? {};
  const top = currentValue.top ?? 0;
  const right = currentValue.right ?? 0;
  const bottom = currentValue.bottom ?? 0;
  const left = currentValue.left ?? 0;

  // Initialize lock states - default to all locked for better UX
  const [allLocked, setAllLocked] = useState(true);
  const [verticalLocked, setVerticalLocked] = useState(true);
  const [horizontalLocked, setHorizontalLocked] = useState(true);

  // Sync lock states with actual values when value prop changes externally
  useEffect(() => {
    const hasValues = currentValue.top !== undefined || currentValue.right !== undefined || 
                      currentValue.bottom !== undefined || currentValue.left !== undefined;
    if (hasValues) {
      const allEqual = top === right && right === bottom && bottom === left;
      const verticalEqual = top === bottom;
      const horizontalEqual = left === right;
      
      // Only update if values suggest locks should be on (all equal means likely locked)
      if (allEqual) {
        setAllLocked(true);
      }
      if (verticalEqual && !allEqual) {
        setVerticalLocked(true);
      }
      if (horizontalEqual && !allEqual) {
        setHorizontalLocked(true);
      }
    }
  }, [currentValue.top, currentValue.right, currentValue.bottom, currentValue.left]);

  const handleChange = (side: keyof PaddingValue, newValue: number) => {
    const clampedValue = Math.max(0, newValue);
    const updates: PaddingValue = { ...currentValue };

    if (allLocked) {
      // All sides locked: update all four sides
      updates.top = clampedValue;
      updates.right = clampedValue;
      updates.bottom = clampedValue;
      updates.left = clampedValue;
    } else if (side === "top" || side === "bottom") {
      // Vertical side changed
      updates[side] = clampedValue;
      if (verticalLocked) {
        // Sync the other vertical side
        updates[side === "top" ? "bottom" : "top"] = clampedValue;
      }
    } else {
      // Horizontal side changed
      updates[side] = clampedValue;
      if (horizontalLocked) {
        // Sync the other horizontal side
        updates[side === "left" ? "right" : "left"] = clampedValue;
      }
    }

    onChange(updates);
  };

  const toggleAllLock = () => {
    const newAllLocked = !allLocked;
    setAllLocked(newAllLocked);
    
    if (newAllLocked) {
      // When locking all, sync all values to the first non-zero value or top
      const syncValue = top || right || bottom || left || 0;
      onChange({
        top: syncValue,
        right: syncValue,
        bottom: syncValue,
        left: syncValue,
      });
    }
  };

  const toggleVerticalLock = () => {
    const newVerticalLocked = !verticalLocked;
    setVerticalLocked(newVerticalLocked);
    
    if (newVerticalLocked) {
      // When locking vertical, sync bottom to top
      onChange({
        ...currentValue,
        bottom: top,
      });
    }
  };

  const toggleHorizontalLock = () => {
    const newHorizontalLocked = !horizontalLocked;
    setHorizontalLocked(newHorizontalLocked);
    
    if (newHorizontalLocked) {
      // When locking horizontal, sync right to left
      onChange({
        ...currentValue,
        right: left,
      });
    }
  };

  return (
    <div className="flex items-start gap-1">
      <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0 pt-1">
        {label}
      </label>
      <div className="flex-1">
        {/* Box layout: 3x3 grid with inputs positioned around edges */}
        <div className="relative" style={{ width: "140px", height: "100px" }}>
          {/* Top input - centered at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
            <span className="text-[7px] text-gray-600 font-bold uppercase">T</span>
            <input
              type="number"
              min="0"
              value={top}
              onChange={(e) => handleChange("top", Number(e.target.value))}
              className={`w-12 h-5 px-1 text-[10px] bg-gray-900/50 border rounded-sm text-white text-center hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors ${
                verticalLocked || allLocked
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-gray-700/30"
              }`}
              placeholder="0"
              title="Top padding"
            />
          </div>

          {/* Right input - centered on right side */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <input
              type="number"
              min="0"
              value={right}
              onChange={(e) => handleChange("right", Number(e.target.value))}
              className={`w-12 h-5 px-1 text-[10px] bg-gray-900/50 border rounded-sm text-white text-center hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors ${
                horizontalLocked || allLocked
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-gray-700/30"
              }`}
              placeholder="0"
              title="Right padding"
            />
            <span className="text-[7px] text-gray-600 font-bold uppercase">R</span>
          </div>

          {/* Bottom input - centered at bottom */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
            <span className="text-[7px] text-gray-600 font-bold uppercase">B</span>
            <input
              type="number"
              min="0"
              value={bottom}
              onChange={(e) => handleChange("bottom", Number(e.target.value))}
              className={`w-12 h-5 px-1 text-[10px] bg-gray-900/50 border rounded-sm text-white text-center hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors ${
                verticalLocked || allLocked
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-gray-700/30"
              }`}
              placeholder="0"
              title="Bottom padding"
            />
          </div>

          {/* Left input - centered on left side */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <span className="text-[7px] text-gray-600 font-bold uppercase">L</span>
            <input
              type="number"
              min="0"
              value={left}
              onChange={(e) => handleChange("left", Number(e.target.value))}
              className={`w-12 h-5 px-1 text-[10px] bg-gray-900/50 border rounded-sm text-white text-center hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors ${
                horizontalLocked || allLocked
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-gray-700/30"
              }`}
              placeholder="0"
              title="Left padding"
            />
          </div>

          {/* Visual connection lines for locked sides */}
          {allLocked && (
            <>
              {/* Vertical line connecting top and bottom */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/20" style={{ transform: "translateX(-50%)" }} />
              {/* Horizontal line connecting left and right */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/20" style={{ transform: "translateY(-50%)" }} />
            </>
          )}
          {!allLocked && verticalLocked && (
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/20" style={{ transform: "translateX(-50%)" }} />
          )}
          {!allLocked && horizontalLocked && (
            <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/20" style={{ transform: "translateY(-50%)" }} />
          )}

          {/* All-sides lock button - always shown, larger when locked */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10">
            <button
              onClick={toggleAllLock}
              className={`
                flex items-center justify-center rounded-md border-2 transition-all
                ${allLocked
                  ? "w-7 h-7 border-blue-500/50 bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 hover:border-blue-500 shadow-sm"
                  : "w-5 h-5 border-gray-700/30 bg-gray-800/30 text-gray-500 hover:border-gray-600/50 hover:text-gray-400 hover:bg-gray-800/50"
                }
              `}
              title={allLocked ? "Unlock all sides" : "Lock all sides"}
            >
              {allLocked ? <Lock className="w-4 h-4" weight="bold" /> : <LockOpen className="w-3 h-3" />}
            </button>
          </div>

          {/* Vertical lock button - only shown when all-sides is unlocked */}
          {!allLocked && (
            <div className="absolute left-1/2 top-1/2 flex items-center justify-center" style={{ transform: "translate(-50%, calc(-50% - 32px))" }}>
              <button
                onClick={toggleVerticalLock}
                className={`
                  w-6 h-6 flex items-center justify-center rounded-md border-2 transition-all
                  ${verticalLocked
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 hover:border-blue-500" 
                    : "border-gray-700/40 bg-gray-800/40 text-gray-500 hover:border-gray-600/60 hover:text-gray-400 hover:bg-gray-800/60"
                  }
                `}
                title={verticalLocked ? "Unlock top/bottom" : "Lock top/bottom"}
              >
                {verticalLocked ? <Lock className="w-3.5 h-3.5" weight="bold" /> : <LockOpen className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Horizontal lock button - only shown when all-sides is unlocked */}
          {!allLocked && (
            <div className="absolute left-1/2 top-1/2 flex items-center justify-center" style={{ transform: "translate(calc(-50% - 32px), -50%)" }}>
              <button
                onClick={toggleHorizontalLock}
                className={`
                  w-6 h-6 flex items-center justify-center rounded-md border-2 transition-all rotate-90
                  ${horizontalLocked
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 hover:border-blue-500" 
                    : "border-gray-700/40 bg-gray-800/40 text-gray-500 hover:border-gray-600/60 hover:text-gray-400 hover:bg-gray-800/60"
                  }
                `}
                title={horizontalLocked ? "Unlock left/right" : "Lock left/right"}
              >
                {horizontalLocked ? <Lock className="w-3.5 h-3.5" weight="bold" /> : <LockOpen className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

