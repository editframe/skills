import { Timegroup, Video, ThumbnailStrip, Preview, Scrubber, TimeDisplay, TogglePlay } from "@editframe/react";
import { useId, useState } from "react";
import { WithEnv } from "~/components/WithEnv";
import { PlayIcon, PauseIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from "@heroicons/react/24/outline";

export const VideoEditorExample = () => {
  const id = useId();
  const [zoomLevel, setZoomLevel] = useState(2); // 1 = normal, 4 = max zoom
  const [scrollPosition, setScrollPosition] = useState(0);

  // Calculate thumbnail width based on zoom level
  const baseThumbnailWidth = 60;
  const thumbnailWidth = baseThumbnailWidth * zoomLevel;

  // Calculate total strip width based on zoom (more zoom = wider strip)
  const baseStripWidth = 900;
  const totalStripWidth = baseStripWidth * zoomLevel;

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(4, prev + 0.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(1, prev - 0.5));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft);
  };

  return (
    <div className="max-w-6xl mx-auto bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
      {/* Editor Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Video Editor Interface</h3>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              Zoom: {zoomLevel.toFixed(1)}x
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-2 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MagnifyingGlassMinusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 4}
                className="p-2 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MagnifyingGlassPlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview */}
      <div className="p-6 bg-gray-850">
        <div className="flex justify-center">
          <Preview className="w-[720px] h-[400px] rounded-lg overflow-hidden shadow-lg bg-black">
            <Timegroup mode="contain" className="w-full h-full">
              <Video
                id={`${id}-editor-video`}
                src="https://assets.editframe.com/bars-n-tone.mp4"
                className="size-full object-contain"
              />
            </Timegroup>
          </Preview>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-gray-800 p-6 space-y-4">
        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-6 p-4 bg-gray-700 rounded-lg">
          <TogglePlay>
            <button
              slot="pause"
              className="p-3 bg-gray-600 hover:bg-gray-500 text-white rounded-full transition-colors"
            >
              <PauseIcon className="w-6 h-6" />
            </button>
            <button
              slot="play"
              className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors"
            >
              <PlayIcon className="w-6 h-6" />
            </button>
          </TogglePlay>

          <div className="flex-1 max-w-lg">
            <Scrubber className="w-full" />
          </div>

          <TimeDisplay className="text-sm font-mono text-gray-300 bg-gray-600 px-3 py-2 rounded" />
        </div>

        {/* Scrollable Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Timeline</h4>
            <div className="flex items-center space-x-3 text-xs text-gray-400">
              <span>Scroll Position: {Math.round(scrollPosition)}px</span>
              <span>•</span>
              <span>Strip Width: {totalStripWidth}px</span>
            </div>
          </div>

          {/* Scrollable Container */}
          <div
            className="overflow-x-auto bg-gray-700 rounded-lg p-4"
            onScroll={handleScroll}
            style={{ maxWidth: '100%' }}
          >
            <div style={{ width: `${totalStripWidth}px`, minWidth: '100%' }}>
              <ThumbnailStrip
                target={`${id}-editor-video`}
                thumbnail-width={thumbnailWidth}
                style={{
                  width: '100%',
                  height: '64px'
                }}
              />
            </div>
          </div>

          {/* Timeline Info */}
          <div className="flex justify-between text-xs text-gray-400 px-2">
            <span>Each thumbnail: {thumbnailWidth}px wide</span>
            <span>Total thumbnails: ~{Math.floor(totalStripWidth / (thumbnailWidth + 1))}</span>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h5 className="text-sm font-semibold text-gray-200 mb-2">Editor Usage Tips</h5>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• <strong>Zoom In:</strong> See frame-by-frame detail for precise editing</li>
            <li>• <strong>Zoom Out:</strong> Get overview of entire video timeline</li>
            <li>• <strong>Scroll:</strong> Navigate through long videos efficiently</li>
            <li>• <strong>Thumbnail Width:</strong> Controls both detail level and total strip width</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
