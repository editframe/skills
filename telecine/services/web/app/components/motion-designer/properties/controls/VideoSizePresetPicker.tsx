import React from "react";
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
  const handlePresetSelect = (preset: VideoSizePreset) => {
    onChange({
      widthMode: "fixed",
      widthValue: preset.width,
      heightMode: "fixed",
      heightValue: preset.height,
    });
  };

  // Normalize size and check if current size matches any preset
  const normalizedSize = normalizeSize(size);
  const currentPreset = normalizedSize && normalizedSize.widthMode === "fixed" && normalizedSize.heightMode === "fixed"
    ? COMMON_VIDEO_SIZES.find(
        (p) => p.width === normalizedSize.widthValue && p.height === normalizedSize.heightValue
      )
    : null;

  return (
    <div className="space-y-2">
      <label className="text-[10px] text-gray-500 font-normal">{label}</label>
      <div className="grid grid-cols-2 gap-1.5">
        {COMMON_VIDEO_SIZES.map((preset) => {
          const isSelected =
            currentPreset?.width === preset.width &&
            currentPreset?.height === preset.height;

          return (
            <button
              key={`${preset.width}x${preset.height}`}
              onClick={() => handlePresetSelect(preset)}
              className={`
                px-2 py-1.5 rounded text-[9px] font-medium text-left
                transition-colors
                ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
                }
              `}
              title={`${preset.label} (${preset.width}×${preset.height})`}
            >
              <div className="font-semibold">{preset.label}</div>
              <div className="text-[8px] opacity-75">
                {preset.width}×{preset.height}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

