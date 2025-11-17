import React, { useState, useRef, useEffect } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { ElementSize, LegacyElementSize } from "~/lib/motion-designer/sizingTypes";
import { normalizeSize } from "~/lib/motion-designer/sizingTypes";

interface VideoSizePreset {
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
}

const COMMON_VIDEO_SIZES: VideoSizePreset[] = [
  { label: "4K UHD", width: 3840, height: 2160, aspectRatio: "16:9" },
  { label: "1080p", width: 1920, height: 1080, aspectRatio: "16:9" },
  { label: "720p", width: 1280, height: 720, aspectRatio: "16:9" },
  { label: "480p", width: 854, height: 480, aspectRatio: "16:9" },
  { label: "Square", width: 1080, height: 1080, aspectRatio: "1:1" },
  { label: "Instagram Story", width: 1080, height: 1920, aspectRatio: "9:16" },
  { label: "Instagram Reel", width: 1080, height: 1920, aspectRatio: "9:16" },
  { label: "TikTok", width: 1080, height: 1920, aspectRatio: "9:16" },
  { label: "YouTube Shorts", width: 1080, height: 1920, aspectRatio: "9:16" },
  { label: "Twitter/X", width: 1200, height: 675, aspectRatio: "16:9" },
  { label: "Facebook Post", width: 1200, height: 630, aspectRatio: "1.91:1" },
  { label: "LinkedIn Post", width: 1200, height: 627, aspectRatio: "1.91:1" },
];

interface VideoSizePresetPickerProps {
  label: string;
  size: ElementSize | LegacyElementSize | undefined;
  onChange: (size: ElementSize) => void;
}

export function VideoSizePresetPicker({ label, size, onChange }: VideoSizePresetPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handlePresetSelect = (preset: VideoSizePreset) => {
    onChange({
      widthMode: "fixed",
      widthValue: preset.width,
      heightMode: "fixed",
      heightValue: preset.height,
    });
    setIsOpen(false);
  };

  // Normalize size and check if current size matches any preset
  const normalizedSize = normalizeSize(size);
  const currentPreset = normalizedSize && normalizedSize.widthMode === "fixed" && normalizedSize.heightMode === "fixed"
    ? COMMON_VIDEO_SIZES.find(
        (p) => p.width === normalizedSize.widthValue && p.height === normalizedSize.heightValue
      )
    : null;

  const displayText = currentPreset
    ? `${currentPreset.label} (${currentPreset.width}×${currentPreset.height})`
    : "Select size preset";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className="flex items-center gap-1" ref={dropdownRef}>
      <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
        {label}
      </label>
      <div className="flex-1 relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-5 px-1.5 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors flex items-center justify-between"
        >
          <span className="truncate">{displayText}</span>
          <CaretDown
            className={`h-3 w-3 text-gray-500 transition-transform flex-shrink-0 ml-1 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700/50 rounded-sm shadow-lg max-h-64 overflow-y-auto">
            {COMMON_VIDEO_SIZES.map((preset) => {
              const isSelected =
                currentPreset?.width === preset.width &&
                currentPreset?.height === preset.height;

              return (
                <button
                  key={`${preset.width}x${preset.height}`}
                  onClick={() => handlePresetSelect(preset)}
                  className={`
                    w-full px-2 py-1.5 text-left text-[10px] transition-colors
                    ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
                    }
                  `}
                >
                  <div className="font-semibold">{preset.label}</div>
                  <div className="text-[9px] opacity-75">
                    {preset.width}×{preset.height}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

