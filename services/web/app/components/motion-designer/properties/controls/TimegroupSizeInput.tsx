import React from "react";
import { CaretDown } from "@phosphor-icons/react";

interface VideoSizePreset {
  label: string;
  width: number;
  height: number;
}

const COMMON_VIDEO_SIZES: VideoSizePreset[] = [
  { label: "4K UHD", width: 3840, height: 2160 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "720p", width: 1280, height: 720 },
  { label: "480p", width: 854, height: 480 },
  { label: "Square", width: 1080, height: 1080 },
  { label: "Instagram Story", width: 1080, height: 1920 },
  { label: "Instagram Reel", width: 1080, height: 1920 },
  { label: "TikTok", width: 1080, height: 1920 },
  { label: "YouTube Shorts", width: 1080, height: 1920 },
  { label: "Twitter/X", width: 1200, height: 675 },
  { label: "Facebook Post", width: 1200, height: 630 },
  { label: "LinkedIn Post", width: 1200, height: 627 },
];

interface TimegroupSizeInputProps {
  label: string;
  width: number | undefined;
  height: number | undefined;
  onChange: (width: number, height: number) => void;
}

export function TimegroupSizeInput({
  label,
  width,
  height,
  onChange,
}: TimegroupSizeInputProps) {
  const currentWidth = width ?? 1920;
  const currentHeight = height ?? 1080;

  // Check if current size matches any preset
  const currentPreset = COMMON_VIDEO_SIZES.find(
    (p) => p.width === currentWidth && p.height === currentHeight,
  );

  const handlePresetSelect = (preset: VideoSizePreset) => {
    onChange(preset.width, preset.height);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
          {label}
        </label>
        <div className="flex-1">
          <select
            value={
              currentPreset
                ? `${currentPreset.width}x${currentPreset.height}`
                : "custom"
            }
            onChange={(e) => {
              if (e.target.value !== "custom") {
                const [w, h] = e.target.value.split("x").map(Number);
                onChange(w, h);
              }
            }}
            className="w-full h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="custom">Custom</option>
            {COMMON_VIDEO_SIZES.map((preset, index) => (
              <option
                key={`${preset.label}-${preset.width}x${preset.height}-${index}`}
                value={`${preset.width}x${preset.height}`}
              >
                {preset.label} ({preset.width}×{preset.height})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1 pl-11">
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[7px] text-gray-600 font-bold uppercase w-3">
            W
          </span>
          <input
            type="number"
            value={currentWidth}
            onChange={(e) => onChange(Number(e.target.value), currentHeight)}
            className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
          />
          <span className="text-[8px] text-gray-500">px</span>
        </div>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[7px] text-gray-600 font-bold uppercase w-3">
            H
          </span>
          <input
            type="number"
            value={currentHeight}
            onChange={(e) => onChange(currentWidth, Number(e.target.value))}
            className="flex-1 h-5 px-1.5 bg-gray-900/50 border border-gray-700/30 rounded-sm text-[10px] text-white focus:outline-none focus:border-blue-500/50"
          />
          <span className="text-[8px] text-gray-500">px</span>
        </div>
      </div>
    </div>
  );
}
