/* ==============================================================================
   COMPONENT: CaptionEditor
   
   Purpose: Minimal caption editor tool demonstrating adding captions to video.
   Demo-focused component for the Editframe landing page.
   
   Design: Swissted poster aesthetic - bold borders, strong colors, uppercase labels
   ============================================================================== */

import { useState, useEffect, useId } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Text,
  Scrubber,
  TogglePlay,
  TimeDisplay,
} from "@editframe/react";

interface Caption {
  id: string;
  start: number;
  end: number;
  text: string;
}

const SAMPLE_CAPTIONS: Caption[] = [
  { id: "1", start: 0, end: 2000, text: "WELCOME TO EDITFRAME" },
  { id: "2", start: 2000, end: 4000, text: "BUILD VIDEO WITH CODE" },
  { id: "3", start: 4000, end: 6000, text: "PROGRAMMATIC CAPTIONS" },
];

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function CaptionEditor() {
  const id = useId();
  const previewId = `caption-editor-${id}`;

  const [isClient, setIsClient] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>(SAMPLE_CAPTIONS);
  const [selectedId, setSelectedId] = useState<string>("1");
  const [editText, setEditText] = useState(SAMPLE_CAPTIONS[0]?.text ?? "");

  useEffect(() => {
    setIsClient(true);
  }, []);

  const selectedCaption = captions.find((c) => c.id === selectedId);

  const handleSelect = (caption: Caption) => {
    setSelectedId(caption.id);
    setEditText(caption.text);
  };

  const handleTextChange = (value: string) => {
    setEditText(value);
    if (selectedId) {
      setCaptions((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, text: value } : c))
      );
    }
  };

  return (
    <div className="w-full">
      {/* Container with bold Swissted-style border */}
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a]">
        {/* Header */}
        <div className="border-b-4 border-black dark:border-white px-4 py-3 bg-[var(--accent-blue)]">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Caption Editor
          </h3>
        </div>

        {/* Main content */}
        <div className="grid md:grid-cols-2">
          {/* Video Preview */}
          <div className="border-r-4 border-black dark:border-white bg-black">
            {isClient ? (
              <Preview id={previewId} loop className="flex flex-col">
                <div className="aspect-video relative">
                  <Timegroup
                    mode="fixed"
                    duration="6s"
                    className="w-full h-full relative"
                  >
                    <Video
                      src="/samples/demo.mp4"
                      duration="6s"
                      className="size-full object-cover"
                    />
                    {/* Show selected caption as overlay */}
                    {selectedCaption && (
                      <Text className="absolute bottom-8 inset-x-4 text-white text-lg font-black uppercase text-center bg-black/80 px-4 py-2">
                        {selectedCaption.text}
                      </Text>
                    )}
                  </Timegroup>
                </div>
              </Preview>
            ) : (
              <div className="aspect-video bg-black flex items-center justify-center">
                <span className="text-white/50 text-xs uppercase tracking-wider">
                  Loading...
                </span>
              </div>
            )}

            {/* Playback controls */}
            <div className="border-t-4 border-black dark:border-white bg-[#111]">
              {isClient ? (
                <div className="flex items-center">
                  <TogglePlay target={previewId}>
                    <button
                      slot="pause"
                      className="w-12 h-12 flex items-center justify-center bg-[var(--accent-red)] border-r-4 border-black dark:border-white"
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
                      className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)] border-r-4 border-black dark:border-white"
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

                  <div className="flex-1 px-4 h-12 flex items-center">
                    <Scrubber
                      target={previewId}
                      className="w-full h-2 bg-white/20 cursor-pointer [&::part(progress)]:bg-[var(--accent-gold)] [&::part(thumb)]:bg-white [&::part(thumb)]:w-4 [&::part(thumb)]:h-4"
                    />
                  </div>

                  <div className="px-4 border-l-4 border-black dark:border-white h-12 flex items-center bg-black">
                    <TimeDisplay
                      target={previewId}
                      className="text-xs text-white font-mono tabular-nums uppercase"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)] border-r-4 border-black dark:border-white">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 px-4 h-12 flex items-center">
                    <div className="w-full h-2 bg-white/20" />
                  </div>
                  <div className="px-4 border-l-4 border-black dark:border-white h-12 flex items-center bg-black">
                    <span className="text-xs text-white font-mono">0:00</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Caption List & Editor */}
          <div className="flex flex-col">
            {/* Caption list header */}
            <div className="border-b-4 border-black dark:border-white px-4 py-2 bg-[var(--accent-gold)]">
              <span className="text-xs font-black uppercase tracking-wider text-black">
                Captions
              </span>
            </div>

            {/* Caption list */}
            <div className="flex-1 divide-y-2 divide-black dark:divide-white overflow-auto max-h-[200px]">
              {captions.map((caption) => (
                <button
                  key={caption.id}
                  onClick={() => handleSelect(caption)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selectedId === caption.id
                      ? "bg-[var(--accent-blue)] text-white"
                      : "bg-white dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#252525]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        selectedId === caption.id
                          ? "text-white/70"
                          : "text-black/50 dark:text-white/50"
                      }`}
                    >
                      {formatTime(caption.start)} - {formatTime(caption.end)}
                    </span>
                  </div>
                  <p
                    className={`text-sm font-bold uppercase mt-1 truncate ${
                      selectedId === caption.id
                        ? "text-white"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {caption.text}
                  </p>
                </button>
              ))}
            </div>

            {/* Editor section */}
            <div className="border-t-4 border-black dark:border-white">
              <div className="px-4 py-2 bg-[var(--accent-red)]">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Edit Caption
                </span>
              </div>
              <div className="p-4 bg-white dark:bg-[#1a1a1a]">
                {selectedCaption ? (
                  <div className="space-y-3">
                    <div className="flex gap-4 text-xs font-mono">
                      <span className="text-black/50 dark:text-white/50 uppercase">
                        Start: {formatTime(selectedCaption.start)}
                      </span>
                      <span className="text-black/50 dark:text-white/50 uppercase">
                        End: {formatTime(selectedCaption.end)}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      className="w-full px-3 py-2 border-4 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white font-bold uppercase text-sm focus:outline-none focus:border-[var(--accent-blue)]"
                      placeholder="ENTER CAPTION TEXT"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-black/50 dark:text-white/50 uppercase">
                    Select a caption to edit
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CaptionEditor;
