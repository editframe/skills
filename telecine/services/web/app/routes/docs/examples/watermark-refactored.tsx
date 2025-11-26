import type { Route } from "./+types/watermark";
import React, { useState } from "react";
import { Timegroup, Preview, Video, Image } from "@editframe/react";
import {
  DemoLayout,
  DemoSection,
  DemoOutput,
  DemoSlider,
  QuickPresets,
  ToggleGroup,
  ConditionalSection,
  SettingsDisplay,
  DocSection,
  SubSection,
  InfoGrid,
  ApplicationList,
  SliderStyles,
  type QuickPreset,
} from "./shared";

interface WatermarkSettings {
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center"
    | "custom";
  customX: number;
  customY: number;
  size: number;
  opacity: number;
  margin: number;
  showGrid: boolean;
  background: "none" | "circle" | "box";
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
}

function WatermarkControls({
  settings,
  onSettingsChange,
}: {
  settings: WatermarkSettings;
  onSettingsChange: (settings: WatermarkSettings) => void;
}) {
  const updateSetting =
    <K extends keyof WatermarkSettings>(key: K) =>
    (value: WatermarkSettings[K]) => {
      onSettingsChange({ ...settings, [key]: value });
    };

  const presets: QuickPreset<WatermarkSettings>[] = [
    {
      id: "youtube",
      name: "YouTube Style",
      description: "Bottom Right • Clean Logo",
      icon: "📺",
      colorScheme: "blue",
      settings: {
        ...settings,
        position: "bottom-right",
        size: 12,
        opacity: 60,
        margin: 16,
        background: "none",
        backgroundColor: "#000000",
        backgroundOpacity: 70,
        backgroundPadding: 8,
      },
    },
    {
      id: "brand",
      name: "Brand Logo",
      description: "Circle Background • High Contrast",
      icon: "📢",
      colorScheme: "green",
      settings: {
        ...settings,
        position: "top-left",
        size: 18,
        opacity: 90,
        margin: 20,
        background: "circle",
        backgroundColor: "#ffffff",
        backgroundOpacity: 90,
        backgroundPadding: 12,
      },
    },
    {
      id: "tv",
      name: "TV Station",
      description: "Box Background • Professional",
      icon: "🛡️",
      colorScheme: "purple",
      settings: {
        ...settings,
        position: "bottom-left",
        size: 16,
        opacity: 85,
        margin: 16,
        background: "box",
        backgroundColor: "#000000",
        backgroundOpacity: 60,
        backgroundPadding: 8,
      },
    },
  ];

  return (
    <div className="space-y-6">
      <SliderStyles />

      <ToggleGroup
        title="Watermark Position"
        options={[
          { id: "top-left", name: "Top Left", icon: "↖️" },
          { id: "top-right", name: "Top Right", icon: "↗️" },
          { id: "bottom-left", name: "Bottom Left", icon: "↙️" },
          { id: "bottom-right", name: "Bottom Right", icon: "↘️" },
          { id: "center", name: "Center", icon: "🎯" },
          { id: "custom", name: "Custom", icon: "🎛️" },
        ]}
        selected={settings.position}
        onSelect={updateSetting("position")}
        columns={2}
      />

      <ConditionalSection
        condition={settings.position === "custom"}
        title="Custom Position"
      >
        <DemoSlider
          label="X Position"
          value={settings.customX}
          min={0}
          max={100}
          unit="%"
          onChange={updateSetting("customX")}
        />
        <DemoSlider
          label="Y Position"
          value={settings.customY}
          min={0}
          max={100}
          unit="%"
          onChange={updateSetting("customY")}
        />
      </ConditionalSection>

      <div className="space-y-4">
        <DemoSlider
          label="Watermark Size"
          value={settings.size}
          min={5}
          max={50}
          unit="%"
          onChange={updateSetting("size")}
        />

        <DemoSlider
          label="Opacity"
          value={settings.opacity}
          min={10}
          max={100}
          step={5}
          unit="%"
          onChange={updateSetting("opacity")}
        />

        <DemoSlider
          label="Edge Margin"
          value={settings.margin}
          min={0}
          max={50}
          step={2}
          unit="px"
          onChange={updateSetting("margin")}
        />
      </div>

      <ToggleGroup
        title="Background Shape"
        options={[
          { id: "none", name: "None", icon: "🚫" },
          { id: "circle", name: "Circle", icon: "⭕" },
          { id: "box", name: "Box", icon: "⬜" },
        ]}
        selected={settings.background}
        onSelect={updateSetting("background")}
        columns={3}
      />

      <ConditionalSection
        condition={settings.background !== "none"}
        title="Background Settings"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-gray-700">
                Background Color
              </label>
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) =>
                  updateSetting("backgroundColor")(e.target.value)
                }
                className="w-8 h-6 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>

          <DemoSlider
            label="Background Opacity"
            value={settings.backgroundOpacity}
            min={10}
            max={100}
            step={5}
            unit="%"
            onChange={updateSetting("backgroundOpacity")}
          />

          <DemoSlider
            label="Padding"
            value={settings.backgroundPadding}
            min={0}
            max={20}
            step={2}
            unit="px"
            onChange={updateSetting("backgroundPadding")}
          />
        </div>
      </ConditionalSection>

      <QuickPresets
        presets={presets}
        onPresetApply={(preset) => onSettingsChange(preset.settings)}
        additionalControls={
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={(e) => updateSetting("showGrid")(e.target.checked)}
              className="rounded"
            />
            Show Grid
          </label>
        }
      />

      <SettingsDisplay
        settings={{
          position: settings.position,
          ...(settings.position === "custom" && {
            x: `${settings.customX}%`,
            y: `${settings.customY}%`,
          }),
          size: `${settings.size}% of video width`,
          opacity: settings.opacity / 100,
          margin: `${settings.margin}px`,
          background: settings.background,
          ...(settings.background !== "none" && {
            "bg-color": settings.backgroundColor,
            "bg-opacity": settings.backgroundOpacity / 100,
            padding: `${settings.backgroundPadding}px`,
          }),
          grid: settings.showGrid ? "visible" : "hidden",
        }}
      />
    </div>
  );
}

function WatermarkedVideo({
  videoSrc,
  currentTime,
  settings,
  watermarkSrc,
  width = 600,
  height = 400,
}: {
  videoSrc: string;
  currentTime: number;
  settings: WatermarkSettings;
  watermarkSrc: string;
  width?: number;
  height?: number;
}) {
  const getWatermarkPosition = () => {
    const margin = settings.margin;

    switch (settings.position) {
      case "top-left":
        return { left: margin, top: margin };
      case "top-right":
        return { right: margin, top: margin };
      case "bottom-left":
        return { left: margin, bottom: margin };
      case "bottom-right":
        return { right: margin, bottom: margin };
      case "center":
        return {
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        };
      case "custom":
        return {
          left: `${settings.customX}%`,
          top: `${settings.customY}%`,
          transform: "translate(-50%, -50%)",
        };
      default:
        return { right: margin, bottom: margin };
    }
  };

  const watermarkPosition = getWatermarkPosition();
  const watermarkSize = (width * settings.size) / 100;

  return (
    <div
      className="bg-black overflow-hidden border-2 border-gray-300"
      style={{ width, height }}
    >
      <Preview className="w-full h-full">
        <Timegroup
          mode="contain"
          className="w-full h-full"
          currentTime={currentTime}
          style={{ position: "relative" }}
        >
          <Video src={videoSrc} className="w-full h-full object-contain" />

          {settings.showGrid && (
            <div className="absolute inset-0 z-5 pointer-events-none">
              <svg className="w-full h-full">
                <defs>
                  <pattern
                    id="grid"
                    width="33.33%"
                    height="33.33%"
                    patternUnits="objectBoundingBox"
                  >
                    <path
                      d="M 33.33 0 L 33.33 33.33 M 0 33.33 L 33.33 33.33"
                      fill="none"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <line
                  x1="50%"
                  y1="0%"
                  x2="50%"
                  y2="100%"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <line
                  x1="0%"
                  y1="50%"
                  x2="100%"
                  y2="50%"
                  stroke="rgba(255,255,255,0.4)"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
          )}

          {settings.background !== "none" ? (
            <div
              className="absolute flex items-center justify-center"
              style={{
                ...watermarkPosition,
                width: watermarkSize + settings.backgroundPadding * 2,
                height: watermarkSize + settings.backgroundPadding * 2,
                backgroundColor: settings.backgroundColor,
                opacity: settings.backgroundOpacity / 100,
                borderRadius: settings.background === "circle" ? "50%" : "6px",
                zIndex: 10,
              }}
            >
              <Image
                src={watermarkSrc}
                style={{
                  width: watermarkSize,
                  height: watermarkSize,
                  opacity: settings.opacity / 100,
                  objectFit: "contain",
                }}
              />
            </div>
          ) : (
            <Image
              src={watermarkSrc}
              className="absolute z-10"
              style={{
                ...watermarkPosition,
                width: watermarkSize,
                height: watermarkSize,
                opacity: settings.opacity / 100,
                objectFit: "contain",
              }}
            />
          )}
        </Timegroup>
      </Preview>
    </div>
  );
}

export default function WatermarkRefactored(_props: Route.ComponentProps) {
  const [settings, setSettings] = useState<WatermarkSettings>({
    position: "bottom-right",
    customX: 50,
    customY: 50,
    size: 15,
    opacity: 70,
    margin: 20,
    showGrid: false,
    background: "none",
    backgroundColor: "#000000",
    backgroundOpacity: 70,
    backgroundPadding: 8,
  });

  return (
    <DemoLayout
      title="Video Watermark Demonstration (Refactored)"
      description="Professional watermark positioning with background shapes using shared UI components"
    >
      <>
        <DemoSection
          title="Watermark Controls"
          description="Position and customize the watermark overlay with optional background shapes and grid assistance."
          badges={[
            {
              text: "🏷️ Professional watermark positioning with rule-of-thirds grid",
              color: "text-green-600",
            },
            {
              text: "📋 Quick presets for common watermark scenarios",
              color: "text-blue-600",
            },
            {
              text: "🎛️ Fine-tune size, opacity, positioning, and background shapes",
              color: "text-purple-600",
            },
            {
              text: "⭕ Circle and box backgrounds for better visibility",
              color: "text-orange-600",
            },
          ]}
        >
          <WatermarkControls
            settings={settings}
            onSettingsChange={setSettings}
          />
        </DemoSection>

        <DemoOutput
          title="Watermarked Video Output"
          description="Image overlay with optional background shapes positioned using absolute CSS positioning."
          statusText={`🏷️ Position: ${settings.position} • Size: ${settings.size}% • Background: ${settings.background} ${settings.background !== "none" && `(${settings.backgroundColor})`} ${settings.showGrid && "• Grid: ON"}`}
        >
          <WatermarkedVideo
            videoSrc="https://assets.editframe.com/bars-n-tone.mp4"
            currentTime={0}
            settings={settings}
            watermarkSrc="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/120px-React-icon.svg.png"
            width={600}
            height={400}
          />
        </DemoOutput>
      </>
    </DemoLayout>
  );
}
