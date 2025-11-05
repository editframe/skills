import type { Route } from "./+types/filters"
import { useState } from "react"
import { Timegroup, Preview, Video } from "@editframe/react"
import { WithEnv } from "~/components/WithEnv"
import { TimelineControls } from "./shared"


interface Filter {
  id: string
  name: string
  description: string
  cssFilter: string
}

const filters: Filter[] = [
  {
    id: 'none',
    name: 'Original',
    description: 'No filter applied',
    cssFilter: 'none'
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Warm sepia tones',
    cssFilter: 'sepia(0.6) contrast(1.2) brightness(1.1) saturate(0.8)'
  },
  {
    id: 'bw',
    name: 'Black & White',
    description: 'Classic monochrome',
    cssFilter: 'grayscale(1) contrast(1.1)'
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Enhanced colors',
    cssFilter: 'saturate(1.5) contrast(1.1) brightness(1.05)'
  },
  {
    id: 'cool',
    name: 'Cool',
    description: 'Blue/cyan tones',
    cssFilter: 'hue-rotate(15deg) saturate(1.2) brightness(1.05) contrast(1.05)'
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Orange/red tones',
    cssFilter: 'hue-rotate(-15deg) saturate(1.3) brightness(1.1) contrast(0.95)'
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    description: 'High contrast mood',
    cssFilter: 'contrast(1.4) brightness(0.9) saturate(1.2) hue-rotate(5deg)'
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Dreamy low contrast',
    cssFilter: 'contrast(0.8) brightness(1.1) saturate(0.9) blur(0.3px)'
  },
  {
    id: 'film',
    name: 'Film',
    description: 'Classic film grain effect',
    cssFilter: 'contrast(1.1) brightness(1.05) saturate(0.85) sepia(0.1)'
  },
  {
    id: 'sharp',
    name: 'Sharp',
    description: 'Enhanced detail and clarity',
    cssFilter: 'contrast(1.1) saturate(1.1)'
  },
  {
    id: 'portrait',
    name: 'Portrait',
    description: 'Soft with subtle vignette',
    cssFilter: 'brightness(1.05) saturate(1.1) contrast(0.95)'
  }
]

interface ManualFilterValues {
  brightness: number     // 0-200 (100 = normal)
  contrast: number       // 0-200 (100 = normal)
  saturate: number       // 0-300 (100 = normal)
  hueRotate: number      // 0-360 degrees
  sepia: number          // 0-100
  grayscale: number      // 0-100
  blur: number           // 0-10 pixels
  sharpen: number        // 0-100 (uses SVG filter)
  vignette: number       // 0-100 (uses SVG filter)
  opacity: number        // 0-100
}

// Convert manual filter values to CSS/SVG filter string
function manualValuesToFilter(values: ManualFilterValues, filterId: string): { css: string, needsSvg: boolean } {
  const cssFilters = []
  const needsSvgEffects = values.sharpen > 0 || values.vignette > 0

  if (values.brightness !== 100) cssFilters.push(`brightness(${values.brightness / 100})`)
  if (values.contrast !== 100) cssFilters.push(`contrast(${values.contrast / 100})`)
  if (values.saturate !== 100) cssFilters.push(`saturate(${values.saturate / 100})`)
  if (values.hueRotate !== 0) cssFilters.push(`hue-rotate(${values.hueRotate}deg)`)
  if (values.sepia !== 0) cssFilters.push(`sepia(${values.sepia / 100})`)
  if (values.grayscale !== 0) cssFilters.push(`grayscale(${values.grayscale / 100})`)
  if (values.blur !== 0) cssFilters.push(`blur(${values.blur}px)`)
  if (values.opacity !== 100) cssFilters.push(`opacity(${values.opacity / 100})`)

  // Add SVG filter reference if needed
  if (needsSvgEffects) {
    cssFilters.push(`url(#${filterId})`)
  }

  return {
    css: cssFilters.length > 0 ? cssFilters.join(' ') : 'none',
    needsSvg: needsSvgEffects
  }
}

// Generate SVG filter definition
function generateSvgFilter(values: ManualFilterValues, filterId: string): string {
  if (values.sharpen === 0 && values.vignette === 0) return ''

  const sharpenMatrix = values.sharpen > 0 ?
    `0 -${(values.sharpen / 100).toFixed(2)} 0
     -${(values.sharpen / 100).toFixed(2)} ${(1 + 4 * values.sharpen / 100).toFixed(2)} -${(values.sharpen / 100).toFixed(2)}
     0 -${(values.sharpen / 100).toFixed(2)} 0` :
    '0 0 0 0 1 0 0 0 0'

  const vignetteOpacity = 1 - (values.vignette / 100) * 0.8 // Max 80% darkening

  return `
    <filter id="${filterId}" x="0%" y="0%" width="100%" height="100%">
      ${values.sharpen > 0 ? `
        <feConvolveMatrix 
          kernelMatrix="${sharpenMatrix}"
          result="sharpen"
        />
      ` : '<feOffset result="sharpen" />'}
      ${values.vignette > 0 ? `
        <feFlood flood-color="black" flood-opacity="${1 - vignetteOpacity}" result="vignette-color" />
        <feComposite in="vignette-color" in2="SourceGraphic" operator="multiply" result="vignette" />
        <feGaussianBlur in="vignette" stdDeviation="${values.vignette / 10}" result="vignette-blur" />
        <feComposite in="sharpen" in2="vignette-blur" operator="multiply" />
      ` : ''}
    </filter>
  `
}

interface FilterSliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

function FilterSlider({ label, value, min, max, step = 1, unit = "", onChange }: FilterSliderProps) {
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

export default function Filters(_props: Route.ComponentProps) {
  const [selectedFilter, setSelectedFilter] = useState(filters[0])
  const [filterMode, setFilterMode] = useState<'presets' | 'manual'>('presets')
  const [manualValues, setManualValues] = useState<ManualFilterValues>({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hueRotate: 0,
    sepia: 0,
    grayscale: 0,
    blur: 0,
    sharpen: 0,
    vignette: 0,
    opacity: 100
  })

  const updateManualValue = (key: keyof ManualFilterValues) => (value: number) => {
    setManualValues(prev => ({ ...prev, [key]: value }))
  }

  const manualFilter = manualValuesToFilter(manualValues, 'manual-filter')
  const activeSvgFilterDef = manualFilter.needsSvg ? generateSvgFilter(manualValues, 'manual-filter') : undefined

  const activeFilterCss = filterMode === 'presets' ? selectedFilter.cssFilter : manualFilter.css

  return (
    <Preview className="w-full h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-[360px_1fr] gap-1 min-h-0 overflow-hidden h-full">

        {/* Controls Panel */}
        <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 space-y-4 h-full overflow-y-auto">

            {/* Mode Toggle */}
            <div className="flex bg-white rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setFilterMode('presets')}
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${filterMode === 'presets'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Presets
              </button>
              <button
                onClick={() => setFilterMode('manual')}
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${filterMode === 'manual'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Manual
              </button>
            </div>

            {filterMode === 'presets' ? (
              /* Preset Filters */
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">Filter Presets</h3>
                <div className="grid grid-cols-3 gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedFilter(filter)}
                      className={`text-center group ${selectedFilter.id === filter.id ? 'text-blue-600' : 'text-gray-600'
                        }`}
                    >
                      <div className={`w-full aspect-square rounded border-2 overflow-hidden mb-1 transition-colors ${selectedFilter.id === filter.id
                        ? 'border-blue-500'
                        : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                        <ef-surface
                          target="filter-video"
                          className="w-full h-full"
                          style={{ filter: filter.cssFilter }}
                        />
                      </div>
                      <div className="text-xs font-medium truncate">
                        {filter.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Manual Controls */
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Manual Controls</h3>
                <FilterSlider
                  label="Brightness"
                  value={manualValues.brightness}
                  min={0}
                  max={200}
                  unit="%"
                  onChange={updateManualValue('brightness')}
                />
                <FilterSlider
                  label="Contrast"
                  value={manualValues.contrast}
                  min={0}
                  max={200}
                  unit="%"
                  onChange={updateManualValue('contrast')}
                />
                <FilterSlider
                  label="Saturation"
                  value={manualValues.saturate}
                  min={0}
                  max={300}
                  unit="%"
                  onChange={updateManualValue('saturate')}
                />
                <FilterSlider
                  label="Hue Rotate"
                  value={manualValues.hueRotate}
                  min={0}
                  max={360}
                  unit="°"
                  onChange={updateManualValue('hueRotate')}
                />
                <FilterSlider
                  label="Sepia"
                  value={manualValues.sepia}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={updateManualValue('sepia')}
                />
                <FilterSlider
                  label="Grayscale"
                  value={manualValues.grayscale}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={updateManualValue('grayscale')}
                />
                <FilterSlider
                  label="Blur"
                  value={manualValues.blur}
                  min={0}
                  max={10}
                  step={0.1}
                  unit="px"
                  onChange={updateManualValue('blur')}
                />
                <FilterSlider
                  label="Sharpen"
                  value={manualValues.sharpen}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={updateManualValue('sharpen')}
                />
                <FilterSlider
                  label="Vignette"
                  value={manualValues.vignette}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={updateManualValue('vignette')}
                />
                <FilterSlider
                  label="Opacity"
                  value={manualValues.opacity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={updateManualValue('opacity')}
                />
                <button
                  onClick={() => setManualValues({
                    brightness: 100,
                    contrast: 100,
                    saturate: 100,
                    hueRotate: 0,
                    sepia: 0,
                    grayscale: 0,
                    blur: 0,
                    sharpen: 0,
                    vignette: 0,
                    opacity: 100
                  })}
                  className="w-full py-2 px-3 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Current Filter Display */}
            <div className="p-3 bg-white rounded border border-gray-300">
              <h4 className="text-xs font-medium text-gray-700 mb-1">Current Filter:</h4>
              <code className="text-xs text-gray-600 break-all">{activeFilterCss}</code>
              {filterMode === 'manual' && manualFilter.needsSvg && (
                <div className="mt-2 text-xs text-orange-600">
                  ⚙️ Using SVG filters for sharpen/vignette effects
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Video Panel */}
        <section className="bg-gradient-to-br from-black to-gray-900 rounded-lg border border-gray-700 flex flex-col">
          {/* SVG Filter Definition */}
          {activeSvgFilterDef && (
            <svg className="absolute w-0 h-0">
              <defs dangerouslySetInnerHTML={{ __html: activeSvgFilterDef }} />
            </svg>
          )}

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <Timegroup
              mode="contain"
              className="relative w-full h-auto"
            >
              <Video
                id="filter-video"
                src="https://assets.editframe.com/bars-n-tone.mp4"
                className="w-full h-full"
                style={{ filter: activeFilterCss }}
              />
            </Timegroup>
          </div>
          <TimelineControls className="mx-2" />
        </section>
      </div>
    </Preview>
  )
}