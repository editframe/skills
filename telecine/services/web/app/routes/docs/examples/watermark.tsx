import type { Route } from "./+types/watermark"
import { useState } from "react"
import { Timegroup, Preview, Video, Image } from "@editframe/react"
import { WithEnv } from "~/components/WithEnv"
import { TimelineControls } from "./shared"

interface WatermarkSettings {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom'
  customX: number
  customY: number
  size: number
  opacity: number
  margin: number
  showGrid: boolean
  background: 'none' | 'circle' | 'box'
  backgroundColor: string
  backgroundOpacity: number
  backgroundPadding: number
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

function Slider({ label, value, min, max, step = 1, unit = "", onChange }: SliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-600 font-mono">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  )
}

export default function Watermark(_props: Route.ComponentProps) {
  const [settings, setSettings] = useState<WatermarkSettings>({
    position: 'bottom-right',
    customX: 50,
    customY: 50,
    size: 15,
    opacity: 70,
    margin: 20,
    showGrid: false,
    background: 'none',
    backgroundColor: '#000000',
    backgroundOpacity: 70,
    backgroundPadding: 8
  })

  const updateSetting = <K extends keyof WatermarkSettings>(key: K) => (value: WatermarkSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const getWatermarkPosition = () => {
    const margin = settings.margin
    switch (settings.position) {
      case 'top-left':
        return { left: margin, top: margin }
      case 'top-right':
        return { right: margin, top: margin }
      case 'bottom-left':
        return { left: margin, bottom: margin }
      case 'bottom-right':
        return { right: margin, bottom: margin }
      case 'center':
        return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
      case 'custom':
        return { left: `${settings.customX}%`, top: `${settings.customY}%`, transform: 'translate(-50%, -50%)' }
      default:
        return { right: margin, bottom: margin }
    }
  }

  const watermarkPosition = getWatermarkPosition()
  const watermarkSize = (600 * settings.size) / 100

  const applyPreset = (preset: Partial<WatermarkSettings>) => {
    setSettings(prev => ({ ...prev, ...preset }))
  }

  return (
    <Preview className="w-full h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-[360px_1fr] gap-1 min-h-0 overflow-hidden h-full">

        {/* Controls Panel */}
        <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 space-y-4 h-full overflow-y-auto">

            <h3 className="text-lg font-semibold text-gray-800">Watermark Controls</h3>
            <p className="text-sm text-gray-600">
              Position and customize watermark overlay with optional backgrounds.
            </p>

            {/* Position Controls */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800">Position</h4>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'top-left', name: 'Top Left', icon: '↖️' },
                  { id: 'top-right', name: 'Top Right', icon: '↗️' },
                  { id: 'bottom-left', name: 'Bottom Left', icon: '↙️' },
                  { id: 'bottom-right', name: 'Bottom Right', icon: '↘️' },
                  { id: 'center', name: 'Center', icon: '🎯' },
                  { id: 'custom', name: 'Custom', icon: '🎛️' }
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => updateSetting('position')(pos.id as any)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${settings.position === pos.id
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    {pos.icon} {pos.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Position */}
            {settings.position === 'custom' && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-800">Custom Position</h4>
                <Slider
                  label="X Position"
                  value={settings.customX}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={updateSetting('customX')}
                />
                <Slider
                  label="Y Position"
                  value={settings.customY}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={updateSetting('customY')}
                />
              </div>
            )}

            {/* Size and Appearance */}
            <div className="space-y-3">
              <Slider
                label="Size"
                value={settings.size}
                min={5}
                max={50}
                unit="%"
                onChange={updateSetting('size')}
              />
              <Slider
                label="Opacity"
                value={settings.opacity}
                min={10}
                max={100}
                step={5}
                unit="%"
                onChange={updateSetting('opacity')}
              />
              <Slider
                label="Margin"
                value={settings.margin}
                min={0}
                max={50}
                step={2}
                unit="px"
                onChange={updateSetting('margin')}
              />
            </div>

            {/* Background Shape */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800">Background</h4>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'none', name: 'None', icon: '🚫' },
                  { id: 'circle', name: 'Circle', icon: '⭕' },
                  { id: 'box', name: 'Box', icon: '⬜' }
                ].map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => updateSetting('background')(bg.id as any)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${settings.background === bg.id
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    {bg.icon} {bg.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Settings */}
            {settings.background !== 'none' && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-800">Background Settings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-gray-700">Color</label>
                    <input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => updateSetting('backgroundColor')(e.target.value)}
                      className="w-8 h-6 rounded border border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>
                <Slider
                  label="Background Opacity"
                  value={settings.backgroundOpacity}
                  min={10}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={updateSetting('backgroundOpacity')}
                />
                <Slider
                  label="Padding"
                  value={settings.backgroundPadding}
                  min={0}
                  max={20}
                  step={2}
                  unit="px"
                  onChange={updateSetting('backgroundPadding')}
                />
              </div>
            )}

            {/* Quick Presets */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800">Quick Presets</h4>
              <div className="space-y-1">
                <button
                  onClick={() => applyPreset({
                    position: 'bottom-right', size: 12, opacity: 60, margin: 16, background: 'none'
                  })}
                  className="w-full px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  📺 YouTube Style
                </button>
                <button
                  onClick={() => applyPreset({
                    position: 'top-left', size: 18, opacity: 90, margin: 20,
                    background: 'circle', backgroundColor: '#ffffff', backgroundOpacity: 90, backgroundPadding: 12
                  })}
                  className="w-full px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  📢 Brand Logo
                </button>
                <button
                  onClick={() => applyPreset({
                    position: 'bottom-left', size: 16, opacity: 85, margin: 16,
                    background: 'box', backgroundColor: '#000000', backgroundOpacity: 60, backgroundPadding: 8
                  })}
                  className="w-full px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  🛡️ TV Station
                </button>
              </div>
            </div>

            {/* Grid Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="grid-toggle"
                checked={settings.showGrid}
                onChange={(e) => updateSetting('showGrid')(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="grid-toggle" className="text-xs font-medium text-gray-700">
                Show Grid
              </label>
            </div>

            {/* Current Settings Display */}
            <div className="p-3 bg-white rounded border border-gray-300">
              <h4 className="text-xs font-medium text-gray-700 mb-1">Current Settings:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Position: {settings.position}</div>
                <div>Size: {settings.size}% • Opacity: {settings.opacity}%</div>
                <div>Background: {settings.background}</div>
                {settings.showGrid && <div>Grid: ON</div>}
              </div>
            </div>
          </div>
        </section>

        {/* Video Panel */}
        <section className="bg-gradient-to-br from-black to-gray-900 rounded-lg border border-gray-700 flex flex-col">
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="w-[600px] h-[400px] relative bg-black rounded border border-gray-600 overflow-hidden">
              <Timegroup
                mode="contain"
                className="w-full h-full relative"
              >
                <Video
                  src="https://assets.editframe.com/bars-n-tone.mp4"
                  className="size-full object-contain"
                />

                {/* Grid Overlay */}
                {settings.showGrid && (
                  <div className="absolute inset-0 z-5 pointer-events-none">
                    <svg className="w-full h-full">
                      <defs>
                        <pattern id="grid" width="33.33%" height="33.33%" patternUnits="objectBoundingBox">
                          <path d="M 33.33 0 L 33.33 33.33 M 0 33.33 L 33.33 33.33" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.4)" strokeDasharray="4 4" />
                    </svg>
                  </div>
                )}

                {/* Watermark */}
                {settings.background !== 'none' ? (
                  <div
                    className="absolute flex items-center justify-center z-10"
                    style={{
                      ...watermarkPosition,
                      width: watermarkSize + settings.backgroundPadding * 2,
                      height: watermarkSize + settings.backgroundPadding * 2,
                      backgroundColor: settings.backgroundColor,
                      opacity: settings.backgroundOpacity / 100,
                      borderRadius: settings.background === 'circle' ? '50%' : '6px'
                    }}
                  >
                    <Image
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/120px-React-icon.svg.png"
                      style={{
                        width: watermarkSize,
                        height: watermarkSize,
                        opacity: settings.opacity / 100,
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                ) : (
                  <Image
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/120px-React-icon.svg.png"
                    className="absolute z-10"
                    style={{
                      ...watermarkPosition,
                      width: watermarkSize,
                      height: watermarkSize,
                      opacity: settings.opacity / 100,
                      objectFit: 'contain'
                    }}
                  />
                )}
              </Timegroup>
            </div>
          </div>
          <TimelineControls className="mx-2" />
        </section>
      </div>
    </Preview>
  )
}