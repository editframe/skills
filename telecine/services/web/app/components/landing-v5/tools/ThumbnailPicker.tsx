import { useId, useEffect, useState, useRef } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Filmstrip,
  Scrubber,
  TogglePlay,
} from "@editframe/react";

export function ThumbnailPicker() {
  const id = useId();
  const previewId = `thumbnail-picker-${id}`;

  const [isClient, setIsClient] = useState(false);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const previewRef = useRef<HTMLElement>(null);
  const selectedTimegroupRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (selectedTime !== null && selectedTimegroupRef.current) {
      const tg = selectedTimegroupRef.current as any;
      tg.pause?.();
      tg.seek?.(selectedTime);
    }
  }, [selectedTime]);

  const handleSelectThumbnail = () => {
    const preview = previewRef.current;
    if (preview) {
      const timegroup = preview.querySelector("ef-timegroup");
      if (timegroup) {
        setSelectedTime((timegroup as any).currentTimeMs ?? 0);
      }
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const frames = Math.floor((ms % 1000) / (1000 / 30));
    return `${seconds}:${frames.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-lg">
      <div className="border-4 border-black bg-white">
        {/* Header */}
        <div className="bg-black px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Thumbnail Picker
          </span>
        </div>

        {/* Video Preview */}
        <div className="border-b-4 border-black bg-[#1a1a1a]">
          {isClient ? (
            <Preview
              id={previewId}
              ref={previewRef as any}
              className="flex flex-col"
            >
              <div className="aspect-video bg-black flex items-center justify-center">
                <Timegroup
                  mode="fixed"
                  duration="10s"
                  className="w-full h-full"
                >
                  <Video
                    src="/samples/demo.mp4"
                    className="size-full object-contain"
                  />
                </Timegroup>
              </div>

              {/* Filmstrip */}
              <div className="h-16 bg-black border-t-2 border-white/20">
                <Filmstrip autoScale className="w-full h-full" />
              </div>
            </Preview>
          ) : (
            <div className="aspect-video bg-black flex items-center justify-center">
              <span className="text-white/50 text-xs uppercase tracking-wider">
                Loading...
              </span>
            </div>
          )}
        </div>

        {/* Scrubber */}
        <div className="border-b-4 border-black bg-[#252525] p-4">
          {isClient ? (
            <div className="flex items-center gap-4">
              <TogglePlay target={previewId}>
                <button
                  slot="pause"
                  className="w-10 h-10 flex items-center justify-center bg-[var(--accent-red,#e63946)] border-2 border-black"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                </button>
                <button
                  slot="play"
                  className="w-10 h-10 flex items-center justify-center bg-[var(--accent-blue,#1d3557)] border-2 border-black"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </TogglePlay>

              <Scrubber
                target={previewId}
                className="flex-1 h-2 bg-white/20 cursor-pointer [&::part(progress)]:bg-[var(--accent-gold,#f4a261)] [&::part(thumb)]:bg-white [&::part(thumb)]:w-4 [&::part(thumb)]:h-4 [&::part(thumb)]:border-2 [&::part(thumb)]:border-black"
              />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[var(--accent-blue,#1d3557)] border-2 border-black" />
              <div className="flex-1 h-2 bg-white/20" />
            </div>
          )}
        </div>

        {/* Select Button */}
        <div className="border-b-4 border-black bg-white p-4">
          <button
            onClick={handleSelectThumbnail}
            disabled={!isClient}
            className="w-full py-3 bg-[var(--accent-red,#e63946)] border-4 border-black text-white font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select Thumbnail
          </button>
        </div>

        {/* Selected Thumbnail Preview */}
        <div className="bg-[#f8f8f8] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-black mb-3">
            Selected Thumbnail
          </div>

          <div className="flex items-center gap-4">
            <div className="w-24 h-14 bg-black border-2 border-black flex items-center justify-center overflow-hidden">
              {selectedTime !== null && isClient ? (
                <Preview id={`${previewId}-selected`} className="w-full h-full">
                  <Timegroup
                    ref={selectedTimegroupRef as any}
                    mode="fixed"
                    duration="10s"
                    className="w-full h-full"
                  >
                    <Video
                      src="/samples/demo.mp4"
                      className="size-full object-contain"
                    />
                  </Timegroup>
                </Preview>
              ) : (
                <span className="text-white/50 text-[10px] uppercase">
                  None
                </span>
              )}
            </div>

            <div className="flex-1">
              {selectedTime !== null ? (
                <div className="font-mono text-sm font-bold">
                  {formatTime(selectedTime)}
                </div>
              ) : (
                <div className="text-xs text-black/50 uppercase">
                  Scrub to frame, then select
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThumbnailPicker;
