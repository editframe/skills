import { type Aspect } from "../src/primitives";
import {
  CaptionLines,
  CaptionStudy,
  captionAnimation,
  pct,
  type CaptionWord,
} from "./shared/caption-studies";

export const duration = 10;
export const posterTime = 2.25;
export const aspect = "landscape" as const;

const palette = { background: "#332938", color: "#bdb0bd", accent: "#ffdab0" };

/** An accent copy of the word laid over it, wiped in left to right. */
const fill = (word: CaptionWord) => (
  <span
    aria-hidden="true"
    data-caption-fill
    style={{
      position: "absolute",
      inset: 0,
      color: palette.accent,
      ...captionAnimation(`${word.key}-fill`),
    }}
  >
    {word.text}
  </span>
);

/** The wipe spans the word's spoken window. */
const fillWipe = ({ key, start, end }: CaptionWord) =>
  `@keyframes ${key}-fill{0%,${pct(start)}{clip-path:inset(0 100% 0 0)}${pct(end)},100%{clip-path:inset(0 0% 0 0)}}`;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const compact = frame !== "landscape";
  return (
    <CaptionStudy
      id={id}
      aspect={frame}
      name="karaoke"
      palette={palette}
      typography={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: compact ? 88 : 102,
        fontWeight: 400,
        letterSpacing: "-.035em",
      }}
      renderCue={(cue, index, key) => (
        <CaptionLines
          cue={cue}
          index={index}
          cueKey={key}
          gap=".23em"
          wordStyle={{ fontStyle: "italic" }}
          wordOverlay={fill}
          wordKeyframes={fillWipe}
        />
      )}
    />
  );
}
