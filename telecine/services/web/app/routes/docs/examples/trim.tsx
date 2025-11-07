import type { Route } from "./+types/trim"
import { useState, useRef } from "react"
import { Timegroup, Preview, Video, Scrubber, TimeDisplay, TogglePlay, ThumbnailStrip } from "@editframe/react"
import { WithEnv } from "~/components/WithEnv"
import { Pause, Play } from "@phosphor-icons/react"

interface TrimState {
  startTime: number
  endTime: number
  trimMode: boolean
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function Trim(_props: Route.ComponentProps) {
  const [state, setState] = useState<TrimState>({
    startTime: 0,
    endTime: 59,
    trimMode: false
  })

  const timegroupRef = useRef<any>(null)

  const getVideoDuration = () => {
    const timegroup = timegroupRef.current
    const video = timegroup?.querySelector("ef-video")
    if (!video) throw new Error('Video not found');
    return video.intrinsicDurationMs / 1000
  }

  const handleTrimDrag = (e: React.PointerEvent, type: 'start' | 'end') => {
    e.preventDefault()
    e.stopPropagation()
    const timeline = e.currentTarget.parentElement as HTMLElement
    const startX = e.clientX
    const videoDuration = getVideoDuration()
    const originalValue = type === 'start' ? state.startTime : state.endTime
    const pointerId = e.pointerId

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      moveEvent.preventDefault()
      const deltaX = moveEvent.clientX - startX
      const timelineWidth = timeline.offsetWidth
      const deltaTime = (deltaX / timelineWidth) * videoDuration

      let newTime = originalValue + deltaTime

      if (type === 'start') {
        newTime = Math.max(0, Math.min(newTime, state.endTime - 0.1))
        setState(prev => ({ ...prev, startTime: newTime }))

        // When adjusting start time, seek to beginning of trimmed clip (currentTime=0 in trimmed coordinates)
        if (timegroupRef.current) {
          timegroupRef.current.currentTime = 0
        }
      } else {
        newTime = Math.min(videoDuration, Math.max(newTime, state.startTime + 0.1))
        setState(prev => ({ ...prev, endTime: newTime }))

        // When adjusting end time, seek to end of trimmed clip (currentTime=duration in trimmed coordinates)
        if (timegroupRef.current) {
          const trimmedDuration = newTime - state.startTime
          timegroupRef.current.currentTime = trimmedDuration
        }
      }
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return
      upEvent.preventDefault()
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove, { passive: false })
    document.addEventListener('pointerup', handlePointerUp, { passive: false })
  }

  const handleMiddleDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const timeline = e.currentTarget.parentElement as HTMLElement
    const startX = e.clientX
    const videoDuration = getVideoDuration()
    const originalStartTime = state.startTime
    const originalEndTime = state.endTime
    const trimDuration = originalEndTime - originalStartTime
    const pointerId = e.pointerId

    // Set currentTime to 0 immediately when starting middle drag
    if (timegroupRef.current) {
      timegroupRef.current.currentTime = 0
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      moveEvent.preventDefault()
      const deltaX = moveEvent.clientX - startX
      const timelineWidth = timeline.offsetWidth
      const deltaTime = (deltaX / timelineWidth) * videoDuration

      let newStartTime = originalStartTime + deltaTime
      let newEndTime = originalEndTime + deltaTime

      // Ensure we don't go outside bounds while maintaining trim duration
      if (newStartTime < 0) {
        newStartTime = 0
        newEndTime = trimDuration
      } else if (newEndTime > videoDuration) {
        newEndTime = videoDuration
        newStartTime = videoDuration - trimDuration
      }

      setState(prev => ({
        ...prev,
        startTime: newStartTime,
        endTime: newEndTime
      }))

      // Keep currentTime at 0 during middle drag
      if (timegroupRef.current) {
        timegroupRef.current.currentTime = 0
      }
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return
      upEvent.preventDefault()
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove, { passive: false })
    document.addEventListener('pointerup', handlePointerUp, { passive: false })
  }

  return (
    <Preview className="w-full h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-[300px_1fr] gap-1 min-h-0 overflow-hidden h-full">

        {/* Controls Panel */}
        <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 space-y-4 h-full overflow-y-auto">

            <h3 className="text-lg font-semibold text-gray-800">Video Trim</h3>

            {/* Quick Presets */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800">Quick Presets</h4>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setState({ startTime: 0, endTime: 3, trimMode: false })
                    // Seek to beginning of trimmed clip
                    if (timegroupRef.current) {
                      timegroupRef.current.currentTime = 0
                    }
                  }}
                  className="w-full px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  ⏱️ First 3 seconds
                </button>
                <button
                  onClick={() => {
                    const duration = getVideoDuration()
                    const startTime = Math.max(0, duration - 3)
                    setState({ startTime, endTime: duration, trimMode: false })
                    // Seek to beginning of trimmed clip
                    if (timegroupRef.current) {
                      timegroupRef.current.currentTime = 0
                    }
                  }}
                  className="w-full px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  🎬 Last 3 seconds
                </button>
                <button
                  onClick={() => {
                    const duration = getVideoDuration()
                    setState({ startTime: 0, endTime: duration, trimMode: false })
                    // Seek to beginning (full video)
                    if (timegroupRef.current) {
                      timegroupRef.current.currentTime = 0
                    }
                  }}
                  className="w-full px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* Trim Info */}
            <div className="p-3 bg-white rounded border border-gray-300">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Current Trim</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Start:</span>
                  <span className="font-mono">{formatTime(state.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>End:</span>
                  <span className="font-mono">{formatTime(state.endTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-mono">{formatTime(state.endTime - state.startTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Video Panel */}
        <section className="bg-gradient-to-br from-black to-gray-900 rounded-lg border border-gray-700 flex flex-col">
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="w-[600px] h-[400px] relative bg-black rounded border border-gray-600 overflow-hidden">
              <Timegroup
                ref={timegroupRef}
                mode="contain"
                className="w-full h-full"
              >
                <Video
                  id="bbb-trim-video"
                  src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  sourcein={`${state.startTime}s`}
                  sourceout={`${state.endTime}s`}
                  className="w-full h-full object-contain"
                />
              </Timegroup>
            </div>
          </div>

          {/* Timeline Controls */}
          <div className="mx-2 mb-2">
            {!state.trimMode ? (
              /* Normal Mode */
              <div className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden px-2 py-2">
                <TogglePlay>
                  <button
                    slot="pause"
                    className="text-gray-800 hover:text-gray-800/80 flex flex-col items-center p-1 rounded hover:bg-gray-800/10 transition-colors"
                  >
                    <Pause className="size-5" weight="fill" />
                  </button>
                  <button
                    slot="play"
                    className="text-gray-800 hover:text-gray-800/80 flex flex-col items-center p-1 rounded hover:bg-gray-800/10 transition-colors"
                  >
                    <Play className="size-5" weight="fill" />
                  </button>
                </TogglePlay>
                <Scrubber />
                <TimeDisplay className="text-sm font-mono text-gray-600 pr-2" />
                <button
                  onClick={() => setState(prev => ({ ...prev, trimMode: true }))}
                  className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  ✂️ Trim
                </button>
              </div>
            ) : (
              /* Trim Mode */
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
                {/* Filmstrip with overlaid trim controls - QuickTime style */}
                <div className="relative mb-3">
                  <ThumbnailStrip
                    target="bbb-trim-video"
                    thumbnailWidth={80}
                    useIntrinsicDuration
                    className="w-full h-12 rounded-md"
                  />

                  {/* Overlay trim controls directly on filmstrip */}
                  <div className="absolute inset-0">
                    {/* Trimmed region overlay - semi-transparent highlight */}
                    <div
                      className="absolute top-0 bottom-0 bg-yellow-400 bg-opacity-25 border-2 border-yellow-400 border-opacity-50 cursor-move hover:bg-yellow-400 hover:bg-opacity-30 transition-colors"
                      style={{
                        left: `${(state.startTime / getVideoDuration()) * 100}%`,
                        width: `${((state.endTime - state.startTime) / getVideoDuration()) * 100}%`
                      }}
                      onPointerDown={handleMiddleDrag}
                    >
                      {/* Drag indicator in center */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex space-x-0.5 opacity-70">
                          <div className="w-0.5 h-6 bg-yellow-600 rounded" />
                          <div className="w-0.5 h-6 bg-yellow-600 rounded" />
                          <div className="w-0.5 h-6 bg-yellow-600 rounded" />
                        </div>
                      </div>
                    </div>

                    {/* Start handle - green */}
                    <div
                      className="absolute top-0 w-3 h-full bg-green-500 cursor-ew-resize hover:bg-green-600 transition-colors z-20 rounded-l shadow-lg border-r-2 border-green-600"
                      style={{ left: `${(state.startTime / getVideoDuration()) * 100}%` }}
                      onPointerDown={(e) => handleTrimDrag(e, 'start')}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-0.5 h-8 bg-white rounded opacity-90" />
                      </div>
                    </div>

                    {/* End handle - red */}
                    <div
                      className="absolute top-0 w-3 h-full bg-red-500 cursor-ew-resize hover:bg-red-600 transition-colors z-20 rounded-r shadow-lg border-l-2 border-red-600"
                      style={{ left: `calc(${(state.endTime / getVideoDuration()) * 100}% - 0.75rem)` }}
                      onPointerDown={(e) => handleTrimDrag(e, 'end')}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-0.5 h-8 bg-white rounded opacity-90" />
                      </div>
                    </div>

                    {/* Dimmed regions outside trim selection */}
                    {/* Left dimmed area */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-black bg-opacity-50 pointer-events-none"
                      style={{
                        width: `${(state.startTime / getVideoDuration()) * 100}%`
                      }}
                    />

                    {/* Right dimmed area */}
                    <div
                      className="absolute top-0 bottom-0 right-0 bg-black bg-opacity-50 pointer-events-none"
                      style={{
                        width: `${((getVideoDuration() - state.endTime) / getVideoDuration()) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <div>In: {formatTime(state.startTime)} • Out: {formatTime(state.endTime)} • Duration: {formatTime(state.endTime - state.startTime)}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      Drag green/red handles to trim • Drag yellow area to move • View thumbnails while trimming
                    </div>
                  </div>
                  <button
                    onClick={() => setState(prev => ({ ...prev, trimMode: false }))}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Preview>
  )
}