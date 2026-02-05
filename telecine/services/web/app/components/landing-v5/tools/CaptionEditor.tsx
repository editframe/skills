/* ==============================================================================
   COMPONENT: CaptionEditor
   
   Purpose: Caption editor tool demonstrating time-synced captions using
   EFCaptions for real playback-driven display with word-level highlighting.
   
   Design: Swissted poster aesthetic - bold borders, strong colors, uppercase labels
   ============================================================================== */

import { useState, useEffect, useId, useRef, useCallback } from "react";
import {
  Preview,
  Timegroup,
  Video,
  Captions,
  CaptionsSegment,
  CaptionsActiveWord,
  CaptionsBeforeActiveWord,
  CaptionsAfterActiveWord,
  Scrubber,
  TogglePlay,
  TimeDisplay,
  useTimingInfo,
} from "@editframe/react";
import type { EFTimegroup } from "@editframe/elements";

const VIDEO_SRC = "https://assets.editframe.com/bars-n-tone.mp4";

interface CaptionEntry {
  id: string;
  start: number;
  end: number;
  text: string;
}

const INITIAL_CAPTIONS: CaptionEntry[] = [
  { id: "1", start: 0, end: 2, text: "WELCOME TO EDITFRAME" },
  { id: "2", start: 2, end: 4, text: "BUILD VIDEO WITH CODE" },
  { id: "3", start: 4, end: 6, text: "PROGRAMMATIC CAPTIONS" },
];

function buildCaptionsData(captions: CaptionEntry[]) {
  return {
    segments: captions.map((c) => ({ start: c.start, end: c.end, text: c.text })),
    word_segments: captions.flatMap((c) => {
      const words = c.text.split(/\s+/);
      const segDuration = c.end - c.start;
      const wordDuration = segDuration / words.length;
      return words.map((word, i) => ({
        start: c.start + i * wordDuration,
        end: c.start + (i + 1) * wordDuration,
        text: word,
      }));
    }),
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function CaptionEditorInner({ previewId }: { previewId: string }) {
  const timegroupRef = useRef<EFTimegroup>(null);
  const { ownCurrentTimeMs } = useTimingInfo(timegroupRef);

  const [captions, setCaptions] = useState<CaptionEntry[]>(INITIAL_CAPTIONS);
  const [selectedId, setSelectedId] = useState<string>("1");
  const [editText, setEditText] = useState(INITIAL_CAPTIONS[0]?.text ?? "");

  const captionsData = buildCaptionsData(captions);
  const currentTimeSec = ownCurrentTimeMs / 1000;

  const activeCaption = captions.find(
    (c) => currentTimeSec >= c.start && currentTimeSec < c.end
  );

  const selectedCaption = captions.find((c) => c.id === selectedId);

  const handleSelect = useCallback((caption: CaptionEntry) => {
    setSelectedId(caption.id);
    setEditText(caption.text);
  }, []);

  const handleTextChange = useCallback((value: string) => {
    setEditText(value);
    setSelectedId((currentId) => {
      setCaptions((prev) =>
        prev.map((c) => (c.id === currentId ? { ...c, text: value } : c))
      );
      return currentId;
    });
  }, []);

  return (
    <div className="grid md:grid-cols-2">
      {/* Video Preview */}
      <div className="border-r-4 border-black dark:border-white bg-black">
        <Preview id={previewId} loop className="flex flex-col">
          <div className="aspect-video relative">
            <Timegroup
              ref={timegroupRef}
              mode="fixed"
              duration="6s"
              className="w-full h-full relative"
            >
              <Video
                src={VIDEO_SRC}
                duration="6s"
                className="size-full object-cover"
              />
              <Captions
                captionsData={captionsData}
                duration="6s"
                className="absolute bottom-4 inset-x-4 text-center"
              >
                <CaptionsSegment className="hidden" />
                <CaptionsBeforeActiveWord className="text-white/60 text-lg font-black uppercase" />
                <CaptionsActiveWord className="text-white text-lg font-black uppercase mx-1" />
                <CaptionsAfterActiveWord className="text-white/60 text-lg font-black uppercase" />
              </Captions>
            </Timegroup>
          </div>
        </Preview>

        {/* Playback controls */}
        <div className="border-t-4 border-black dark:border-white bg-[#111]">
          <div className="flex items-center">
            <TogglePlay target={previewId}>
              <button
                slot="pause"
                className="w-12 h-12 flex items-center justify-center bg-[var(--accent-red)] border-r-4 border-black dark:border-white"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              </button>
              <button
                slot="play"
                className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)] border-r-4 border-black dark:border-white"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
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
          {captions.map((caption) => {
            const isActive = activeCaption?.id === caption.id;
            const isSelected = selectedId === caption.id;
            return (
              <button
                key={caption.id}
                onClick={() => handleSelect(caption)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "bg-[var(--accent-blue)] text-white"
                    : isActive
                    ? "bg-[var(--accent-gold)]/20"
                    : "bg-white dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#252525]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isActive && !isSelected && (
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-gold)] animate-pulse" />
                  )}
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      isSelected
                        ? "text-white/70"
                        : "text-black/50 dark:text-white/50"
                    }`}
                  >
                    {formatTime(caption.start)} - {formatTime(caption.end)}
                  </span>
                </div>
                <p
                  className={`text-sm font-bold uppercase mt-1 truncate ${
                    isSelected
                      ? "text-white"
                      : "text-black dark:text-white"
                  }`}
                >
                  {caption.text}
                </p>
              </button>
            );
          })}
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
  );
}

export function CaptionEditor() {
  const id = useId();
  const previewId = `caption-editor-${id}`;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="w-full">
      <div className="border-4 border-black dark:border-white bg-white dark:bg-[#1a1a1a]">
        {/* Header */}
        <div className="border-b-4 border-black dark:border-white px-4 py-3 bg-[var(--accent-blue)]">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Caption Editor
          </h3>
        </div>

        {isClient ? (
          <CaptionEditorInner previewId={previewId} />
        ) : (
          <div className="grid md:grid-cols-2">
            <div className="border-r-4 border-black dark:border-white bg-black">
              <div className="aspect-video flex items-center justify-center">
                <span className="text-white/50 text-xs uppercase tracking-wider">
                  Loading...
                </span>
              </div>
              <div className="border-t-4 border-black dark:border-white bg-[#111]">
                <div className="flex items-center">
                  <div className="w-12 h-12 flex items-center justify-center bg-[var(--accent-blue)] border-r-4 border-black dark:border-white">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
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
              </div>
            </div>
            <div className="flex flex-col">
              <div className="border-b-4 border-black dark:border-white px-4 py-2 bg-[var(--accent-gold)]">
                <span className="text-xs font-black uppercase tracking-wider text-black">Captions</span>
              </div>
              <div className="flex-1 p-4">
                <span className="text-sm text-black/50 dark:text-white/50 uppercase">Loading...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CaptionEditor;
