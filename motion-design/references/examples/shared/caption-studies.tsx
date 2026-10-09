import type { CSSProperties, ReactNode } from "react";
import { Solo, type Aspect } from "../../src/primitives";

const captionDuration = 10;
type TranscriptWord = { text: string; start: number; end: number };
export type CaptionCue = { start: number; end: number; words: TranscriptWord[] };
/** A transcript word inside a rendered cue; `key` names its element and its keyframes. */
export type CaptionWord = TranscriptWord & { key: string };
// Authored silent transcript. Replace these absolute word timestamps with aligned
// speech timings when using the styles over audio. Gaps intentionally stay empty.
export const captionCues: CaptionCue[] = [
  {
    start: 0.5,
    end: 3.25,
    words: [
      { text: "Find", start: 0.5, end: 0.85 },
      { text: "the", start: 0.88, end: 1.1 },
      { text: "quiet", start: 1.13, end: 1.8 },
      { text: "moments.", start: 1.85, end: 2.65 },
    ],
  },
  {
    start: 3.5,
    end: 6.25,
    words: [
      { text: "Let", start: 3.5, end: 3.84 },
      { text: "the", start: 3.87, end: 4.08 },
      { text: "story", start: 4.12, end: 4.75 },
      { text: "breathe.", start: 4.8, end: 5.65 },
    ],
  },
  {
    start: 6.5,
    end: 9.3,
    words: [
      { text: "Make", start: 6.5, end: 6.9 },
      { text: "every", start: 6.95, end: 7.45 },
      { text: "word", start: 7.5, end: 8 },
      { text: "matter.", start: 8.05, end: 8.75 },
    ],
  },
];

export const pct = (seconds: number) => `${(seconds / captionDuration) * 100}%`;
export const captionAnimation = (name: string): CSSProperties => ({
  animation: `${name} ${captionDuration}s linear both`,
});
export const visibleKeyframes = (name: string, start: number, end: number) =>
  `@keyframes ${name}{0%,${pct(start - 0.001)}{visibility:hidden}${pct(start)},${pct(end - 0.001)}{visibility:visible}${pct(end)},100%{visibility:hidden}}`;

type CaptionPalette = { background: string; color: string; accent: string };
type CaptionTypography = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: string;
};
/** Vertical placement of the caption block inside the frame. */
type CaptionArea = Pick<CSSProperties, "top" | "bottom" | "height" | "overflow">;
/** Placement of each cue inside the caption block. */
type CueLayout = Pick<CSSProperties, "inset" | "top" | "justifyContent" | "textAlign">;

const centeredCue: CueLayout = { inset: 0, justifyContent: "center", textAlign: "center" };

export function CaptionStudy({
  id,
  aspect,
  name,
  palette: { background, color, accent },
  typography,
  area,
  cueLayout = centeredCue,
  renderCue,
  cueKeyframes = (key, cue) => visibleKeyframes(key, cue.start, cue.end),
}: {
  id: string;
  aspect: Aspect;
  /** Marks the root and prefixes every keyframe name, so it must be unique per item. */
  name: string;
  palette: CaptionPalette;
  typography: CaptionTypography;
  /** Defaults to a subtitle block anchored above the bottom edge. */
  area?: CaptionArea;
  cueLayout?: CueLayout;
  renderCue: (cue: CaptionCue, index: number, key: string) => ReactNode;
  /** Defaults to showing each cue for its transcript window. */
  cueKeyframes?: (key: string, cue: CaptionCue, index: number) => string;
}) {
  const tall = aspect === "portrait";
  const prefix = `caption-study-${name}`;
  const { top, bottom, height, overflow }: CaptionArea = area ?? {
    bottom: tall ? "25%" : "19%",
    height: typography.fontSize * 3.3,
    overflow: "visible",
  };
  return (
    <Solo id={id} aspect={aspect} duration={captionDuration} background={background}>
      <div
        data-caption-style={name}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          background,
          color,
          fontFamily: typography.fontFamily,
        }}
      >
        {/* Original, static scenery keeps the caption's reading rhythm in focus. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1000 500"
          preserveAspectRatio="xMidYMid slice"
          style={{
            position: "absolute",
            left: "10%",
            top: tall ? "18%" : "10%",
            width: "80%",
            height: tall ? "36%" : "44%",
            opacity: 0.36,
          }}
        >
          <circle cx="500" cy="230" r="143" fill="none" stroke={accent} strokeWidth="1.5" />
          <circle cx="500" cy="230" r="108" fill={accent} opacity=".16" />
          <path d="M 0 360 Q 260 200 500 310 T 1000 265 V 500 H 0 Z" fill={accent} opacity=".14" />
          <path
            d="M 0 395 Q 250 330 520 380 T 1000 350"
            fill="none"
            stroke={accent}
            strokeWidth="1.5"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: "9%",
            right: "9%",
            top,
            bottom,
            height,
            overflow,
          }}
        >
          {captionCues.map((cue, index) => {
            const key = `${prefix}-cue-${index}`;
            return (
              <div
                key={key}
                data-caption-cue={index}
                style={{
                  position: "absolute",
                  inset: cueLayout.inset,
                  left: 0,
                  right: 0,
                  top: cueLayout.top,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: cueLayout.justifyContent,
                  flexDirection: "column",
                  fontSize: typography.fontSize,
                  fontWeight: typography.fontWeight,
                  letterSpacing: typography.letterSpacing,
                  textAlign: cueLayout.textAlign,
                  lineHeight: 1.3,
                  ...captionAnimation(key),
                }}
              >
                {renderCue(cue, index, key)}
                <style>{cueKeyframes(key, cue, index)}</style>
              </div>
            );
          })}
        </div>
      </div>
    </Solo>
  );
}

/** A cue set as two centered rows of two words; each word is its own animation target. */
export function CaptionLines({
  cue,
  index,
  cueKey,
  lineStyle = { padding: 0, borderRadius: 0 },
  gap,
  wordStyle,
  wordOverlay,
  wordKeyframes,
}: {
  cue: CaptionCue;
  index: number;
  cueKey: string;
  lineStyle?: CSSProperties;
  gap: string;
  wordStyle?: CSSProperties;
  wordOverlay?: (word: CaptionWord) => ReactNode;
  wordKeyframes?: (word: CaptionWord, cue: CaptionCue) => string;
}) {
  return (
    <div data-caption-line style={lineStyle}>
      {[0, 1].map((line) => (
        <div
          key={line}
          style={{
            display: "flex",
            justifyContent: "center",
            gap,
            whiteSpace: "nowrap",
          }}
        >
          {cue.words.slice(line * 2, line * 2 + 2).map((spoken, local) => {
            const w = line * 2 + local;
            const word: CaptionWord = { ...spoken, key: `${cueKey}-word-${w}` };
            return (
              <span
                key={word.key}
                data-caption-word={`${index}-${w}`}
                style={{
                  position: "relative",
                  display: "inline-block",
                  ...wordStyle,
                  ...captionAnimation(word.key),
                }}
              >
                {word.text}
                {wordOverlay?.(word)}
                <style>{wordKeyframes?.(word, cue)}</style>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
