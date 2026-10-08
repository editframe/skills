import { FONT, type Aspect } from "../src/primitives";
import { CaptionLines, CaptionStudy, pct, type CaptionWord } from "./shared/caption-studies";

export const duration = 10;
export const posterTime = 2.25;
export const aspect = "landscape" as const;

const background = "#25243b";
const color = "#faf6ff";
const accent = "#d6f879";

/** The pill inverts the word for exactly its spoken window. */
const highlightPill = ({ key, start, end }: CaptionWord) =>
  `@keyframes ${key}{0%,${pct(start - 0.001)}{background:transparent;color:${color}}${pct(start)},${pct(end - 0.001)}{background:${accent};color:${background}}${pct(end)},100%{background:transparent;color:${color}}`;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const compact = frame !== "landscape";
  return (
    <CaptionStudy
      id={id}
      aspect={frame}
      name="highlight"
      palette={{ background, color, accent }}
      typography={{
        fontFamily: FONT.sans,
        fontSize: compact ? 88 : 102,
        fontWeight: 800,
        letterSpacing: "-.025em",
      }}
      renderCue={(cue, index, key) => (
        <CaptionLines
          cue={cue}
          index={index}
          cueKey={key}
          gap=".04em"
          wordStyle={{ padding: ".04em .15em", borderRadius: ".16em" }}
          wordKeyframes={highlightPill}
        />
      )}
    />
  );
}
