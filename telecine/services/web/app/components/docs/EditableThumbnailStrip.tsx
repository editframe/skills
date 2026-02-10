import { Timegroup, Video, ThumbnailStrip, Preview } from "@editframe/react";
import { useId, useState } from "react";
import { WithEnv } from "~/components/WithEnv";
import { DoubleRangeSlider } from "./DoubleRangeSlider";
import { TimelineControls } from "~/routes/docs/examples/shared/TimelineControls";

export const EditableThumbnailStrip = () => {
  const id = useId();
  const [stripWidthPercent, setStripWidthPercent] = useState(100);
  const [stripHeight, setStripHeight] = useState(50);
  const [thumbnailWidth, setThumbnailWidth] = useState(100);
  const [startTimeMs, setStartTimeMs] = useState<number | undefined>(undefined);
  const [endTimeMs, setEndTimeMs] = useState<number | undefined>(undefined);
  const [useIntrinsicDuration, setUseIntrinsicDuration] = useState(false);
  const [videoTrimStartMs, setVideoTrimStartMs] = useState(2000);
  const [videoTrimEndMs, setVideoTrimEndMs] = useState(2000);

  // Constants for time range
  const videoDurationMs = 10000;
  const trimmedDurationMs = videoDurationMs - videoTrimStartMs - videoTrimEndMs;
  const effectiveStartMs = startTimeMs ?? 0;
  const effectiveEndMs = endTimeMs ?? trimmedDurationMs;

  const handleTimeRangeChange = (start: number, end: number) => {
    setStartTimeMs(start === 0 ? undefined : start);
    setEndTimeMs(end === trimmedDurationMs ? undefined : end);
  };

  const handleVideoTrimChange = (start: number, end: number) => {
    setVideoTrimStartMs(start);
    setVideoTrimEndMs(end);

    // Reset time range when video trimming changes since the available range changes
    setStartTimeMs(undefined);
    setEndTimeMs(undefined);
  };

  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="p-8 rounded-t-xl">
        <div className="space-y-6">
          <div className="flex justify-center">
            <Preview
              id={`${id}-preview`}
              className="h-[300px] aspect-[16/9] rounded-xl overflow-hidden shadow-2xl"
            >
              <Timegroup mode="contain" className="w-full h-full bg-black">
                <Video
                  id={`${id}-video`}
                  src="https://assets.editframe.com/bars-n-tone.mp4"
                  trimStartMs={videoTrimStartMs > 0 ? videoTrimStartMs : undefined}
                  trimEndMs={videoTrimEndMs > 0 ? videoTrimEndMs : undefined}
                  className="size-full object-contain"
                />
              </Timegroup>
            </Preview>
          </div>

          <div className="w-full flex justify-center">
            <div style={{ width: `${stripWidthPercent}%` }}>
              <ThumbnailStrip
                target={`${id}-video`}
                useIntrinsicDuration={useIntrinsicDuration}
                style={{ width: "100%", height: `${stripHeight}px` }}
              />
            </div>
          </div>

          <div className="mt-6">
            <TimelineControls className="p-4" target={`${id}-preview`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-xl space-y-6">
            <div className="space-y-2">
              <label className="flex justify-between text-sm font-medium text-gray-700">
                <span>Width</span>
                <span className="text-blue-600">{stripWidthPercent}%</span>
              </label>
              <input
                type="range"
                min="30"
                max="100"
                step="1"
                value={stripWidthPercent}
                onChange={(e) => setStripWidthPercent(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="flex justify-between text-sm font-medium text-gray-700">
                <span>Height</span>
                <span className="text-blue-600">{stripHeight}px</span>
              </label>
              <input
                type="range"
                min="32"
                max="100"
                step="1"
                value={stripHeight}
                onChange={(e) => setStripHeight(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="flex justify-between text-sm font-medium text-gray-700">
                <span>Thumbnail Width</span>
                <span className="text-blue-600">{thumbnailWidth}px</span>
              </label>
              <input
                type="range"
                min="20"
                max="120"
                step="1"
                value={thumbnailWidth}
                onChange={(e) => setThumbnailWidth(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 p-6 rounded-xl space-y-4">
            <DoubleRangeSlider
              min={0}
              max={videoDurationMs}
              step={100}
              startValue={videoTrimStartMs}
              endValue={videoDurationMs - videoTrimEndMs}
              onChange={(start, end) =>
                handleVideoTrimChange(start, videoDurationMs - end)
              }
              formatLabel={formatTime}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={useIntrinsicDuration}
                onChange={(e) => setUseIntrinsicDuration(e.target.checked)}
                className="rounded border-gray-300 w-4 h-4"
              />
              <span className="text-sm font-medium text-blue-800">
                Override: Show entire source video
              </span>
            </label>

            <DoubleRangeSlider
              min={0}
              max={useIntrinsicDuration ? videoDurationMs : trimmedDurationMs}
              step={100}
              startValue={effectiveStartMs}
              endValue={effectiveEndMs}
              onChange={handleTimeRangeChange}
              disabled={useIntrinsicDuration}
              formatLabel={formatTime}
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
          <button
            onClick={() => {
              setStripWidthPercent(100);
              setStripHeight(48);
              setThumbnailWidth(40);
              setStartTimeMs(undefined);
              setEndTimeMs(undefined);
              setUseIntrinsicDuration(false);
              setVideoTrimStartMs(2000);
              setVideoTrimEndMs(2000);
            }}
            className="px-8 py-3 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
          >
            Reset All Settings
          </button>
        </div>
      </div>
    </div>
  );
};
