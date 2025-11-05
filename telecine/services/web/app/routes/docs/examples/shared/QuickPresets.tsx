import React from "react"

export interface QuickPreset<T = any> {
  id: string
  name: string
  description?: string
  icon?: string
  settings: T
  colorScheme?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

export interface QuickPresetsProps<T> {
  title?: string
  presets: QuickPreset<T>[]
  onPresetApply: (preset: QuickPreset<T>) => void
  additionalControls?: React.ReactNode
}

export function QuickPresets<T>({
  title = "Quick Presets",
  presets,
  onPresetApply,
  additionalControls
}: QuickPresetsProps<T>) {
  const getColorClasses = (colorScheme: QuickPreset<T>['colorScheme'] = 'blue') => {
    const colorMap = {
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      green: 'bg-green-50 border-green-200 hover:bg-green-100',
      purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
      red: 'bg-red-50 border-red-200 hover:bg-red-100'
    }
    return colorMap[colorScheme]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{title}</h4>
        {additionalControls}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetApply(preset)}
            className={`p-2 text-left text-xs border rounded hover:transition-colors ${getColorClasses(preset.colorScheme)}`}
          >
            <div className="flex items-center gap-2">
              {preset.icon && <span>{preset.icon}</span>}
              <div className="flex-1">
                <div className="font-medium">{preset.name}</div>
                {preset.description && (
                  <div className="text-gray-600 mt-1">{preset.description}</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export interface ToggleGroupProps<T> {
  title: string
  options: Array<{ id: T, name: string, icon?: string }>
  selected: T
  onSelect: (value: T) => void
  columns?: number
}

export function ToggleGroup<T extends string>({
  title,
  options,
  selected,
  onSelect,
  columns = 2
}: ToggleGroupProps<T>) {
  return (
    <div>
      <h4 className="font-medium text-sm mb-3">{title}</h4>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`p-2 text-center rounded-lg border-2 transition-colors ${selected === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
          >
            {option.icon && <div>{option.icon}</div>}
            <div className="text-xs font-medium">{option.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export interface SettingsDisplayProps {
  title?: string
  settings: Record<string, any>
  formatters?: Record<string, (value: any) => string>
}

export function SettingsDisplay({
  title = "Current Settings",
  settings,
  formatters = {}
}: SettingsDisplayProps) {
  return (
    <div className="p-3 bg-gray-100 rounded-lg">
      <h4 className="font-medium text-sm mb-2">{title}:</h4>
      <div className="text-xs font-mono space-y-1">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key}>
            {key}: {formatters[key] ? formatters[key](value) : String(value)}
          </div>
        ))}
      </div>
    </div>
  )
}
