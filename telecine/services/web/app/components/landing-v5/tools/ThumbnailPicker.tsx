/* ==============================================================================
   COMPONENT: ThumbnailPicker
   
   Purpose: Thumbnail picker tool demonstrating frame selection from video.
   Uses a single Preview and captures the canvas for the selected frame.
   
   Design: Swissted poster aesthetic - bold borders, strong colors, uppercase labels
   ============================================================================== */

import { useId, useEffect, useState, useRef, useCallback } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Filmstrip,
  Scrubber,
  TogglePlay,
} from "@editframe/react";
import { ExportButton } from "../ExportButton";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";

export function ThumbnailPicker() {
  const id = useId();
  const previewId = `thumbnail-picker-${id}`;

  const [isClient, setIsClient] = useState(false);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [selectedTimeLabel, setSelectedTimeLabel] = useState<string | null>(null);
  const previewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const frames = Math.floor((ms % 1000) / (1000 / 30));
    return `${seconds}:${frames.toString().padStart(2, "0")}`;
  };

  const handleSelectThumbnail = useCallback(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const timegroup = preview.querySelector("ef-timegroup") as any;
    if (!timegroup) return;

    const currentTimeMs = timegroup.currentTimeMs ?? 0;
    setSelectedTimeLabel(formatTime(currentTimeMs));

    timegroup.pause?.();

    // Canvas is inside the shadow DOM of ef-video
    const video = preview.querySelector("ef-video");
    const canvas = video?.shadowRoot?.querySelector("canvas");
    if (canvas) {
      setThumbnailDataUrl(canvas.toDataURL("image/jpeg", 0.9));
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!thumbnailDataUrl) return;
    const a = document.createElement("a");
    a.href = thumbnailDataUrl;
    a.download = `thumbnail-${selectedTimeLabel?.replace(":", "-")}.jpg`;
    a.click();
  }, [thumbnailDataUrl, selectedTimeLabel]);

  return (
    <div className="w-full max-w-lg">
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a]">
        {/* Header */}
        <div className="bg-black px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Thumbnail Picker
          </span>
        </div>

        {/* Video Preview */}
        <div className="border-b-4 border-black dark:border-white bg-[#1a1a1a]">
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
                    src={VIDEO_SRC}
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
        <div className="border-b-4 border-black dark:border-white bg-[#252525] p-4">
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
                className="flex-1 h-2 bg-white/20 cursor-pointer [&::part(progress)]:bg-[var(--accent-gold,#f4a261)] [&::part(handle)]:bg-white [&::part(handle)]:w-4 [&::part(handle)]:h-4 [&::part(handle)]:border-2 [&::part(handle)]:border-black"
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
        <div className="border-b-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-4">
          <button
            onClick={handleSelectThumbnail}
            disabled={!isClient}
            className="w-full py-3 bg-[var(--accent-red,#e63946)] border-4 border-black dark:border-white text-white font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Capture Thumbnail
          </button>
        </div>

        {/* Selected Thumbnail Preview */}
        <div className="bg-[#f8f8f8] dark:bg-[#111] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-3">
            Selected Thumbnail
          </div>

          <div className="flex items-center gap-4">
            <div className="w-24 h-14 bg-black border-2 border-black dark:border-white flex items-center justify-center overflow-hidden">
              {thumbnailDataUrl ? (
                <img src={thumbnailDataUrl} alt="Selected thumbnail" className="w-full h-full object-contain" />
              ) : (
                <span className="text-white/50 text-[10px] uppercase">
                  None
                </span>
              )}
            </div>

            <div className="flex-1">
              {selectedTimeLabel ? (
                <div className="space-y-2">
                  <div className="font-mono text-sm font-bold text-black dark:text-white">
                    {selectedTimeLabel}
                  </div>
                  {thumbnailDataUrl && (
                    <button
                      onClick={handleDownload}
                      className="text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)] hover:underline"
                    >
                      Download
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-black/50 dark:text-white/50 uppercase">
                  Scrub to frame, then capture
                </div>
              )}
            </div>
          </div>
        </div>

        <ExportButton
          getTarget={() => previewRef.current?.querySelector("ef-timegroup") as HTMLElement}
          name="Thumbnail Video"
          fileName="thumbnail-video.mp4"
          renderOpts={{ includeAudio: true }}
          disabled={!isClient}
        />
      </div>
    </div>
  );
}

export default ThumbnailPicker;
