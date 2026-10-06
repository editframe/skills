import { FONT, type Aspect } from "../src/primitives";
import { CaptionStudy, pct, visibleKeyframes } from "./shared/caption-studies";

export const duration = 10;
export const posterTime = 2.25;
export const aspect = "landscape" as const;

const palette = { background: "#d6e5bc", color: "#fffef2", accent: "#233629" };

/** One stacked word at a time; each replaces the last and overshoots its scale on arrival. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const compact = frame !== "landscape";
  return (
    <CaptionStudy
      id={id}
      aspect={frame}
      name="pop"
      palette={palette}
      typography={{
        fontFamily: FONT.sans,
        fontSize: compact ? 88 : 102,
        fontWeight: 800,
        letterSpacing: "-.025em",
      }}
      renderCue={(cue, index, key) =>
        cue.words.map((word, w) => {
          const wordKey = `${key}-word-${w}`;
          const end = cue.words[w + 1]?.start ?? cue.end;
          return (
            <span
              key={wordKey}
              data-caption-word={`${index}-${w}`}
              style={{
                position: "absolute",
                fontSize: compact ? 138 : 176,
                textTransform: "uppercase",
                WebkitTextStroke: `3px ${palette.accent}`,
                paintOrder: "stroke fill",
                textShadow: `0 7px 0 ${palette.accent}`,
                animation: `${wordKey}-visible 10s linear both, ${wordKey}-scale 10s linear both`,
              }}
            >
              {word.text}
              <style>
                {visibleKeyframes(`${wordKey}-visible`, word.start, end)}
                {`@keyframes ${wordKey}-scale{0%,${pct(word.start)}{transform:translateY(10px) scale(.88)}${pct(word.start + 0.11)}{transform:translateY(-2px) scale(1.045)}${pct(word.start + 0.23)},100%{transform:translateY(0) scale(1)}}`}
              </style>
            </span>
          );
        })
      }
    />
  );
}
