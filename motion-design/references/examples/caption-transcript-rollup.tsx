import { FONT, type Aspect } from "../src/primitives";
import { CaptionStudy, captionCues, pct, type CaptionCue } from "./shared/caption-studies";

export const duration = 10;
export const posterTime = 5.25;
export const aspect = "landscape" as const;

const palette = { background: "#132e2e", color: "#f0f2e8", accent: "#a4d3b8" };

/**
 * Each cue enters on the lower line, climbs to the upper line and dims when the next cue
 * arrives, then leaves over the top edge; the last two lines hold until the transcript ends.
 */
function rollUp(key: string, cue: CaptionCue, index: number, lineHeight: number) {
  const next = captionCues[index + 1];
  const afterNext = captionCues[index + 2];
  const toUpperLine = next
    ? `${pct(next.start)}{transform:translateY(${lineHeight}px);opacity:1}` +
      `${pct(next.start + 0.2)}{transform:translateY(0);opacity:.65}`
    : "";
  const overTop = afterNext
    ? `${pct(afterNext.start)}{transform:translateY(0);opacity:.65}` +
      `${pct(afterNext.start + 0.2)}{transform:translateY(${-lineHeight}px);opacity:0}`
    : "";
  const held = `transform:translateY(${(index - 1) * lineHeight}px);opacity:${index === 0 ? 0 : index === 1 ? 0.65 : 1}`;
  return (
    `@keyframes ${key}{` +
    `0%,${pct(cue.start - 0.001)}{visibility:hidden;transform:translateY(${lineHeight * 2}px);opacity:1}` +
    `${pct(cue.start)}{visibility:visible;transform:translateY(${lineHeight * 2}px);opacity:1}` +
    `${pct(cue.start + 0.2)}{visibility:visible;transform:translateY(${lineHeight}px);opacity:1}` +
    toUpperLine +
    overTop +
    `${pct(9.3)}{visibility:visible;${held}}` +
    `${pct(9.5)},100%{visibility:hidden;${held}}}`
  );
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const compact = frame !== "landscape";
  const lineHeight = compact ? 150 : 162;
  return (
    <CaptionStudy
      id={id}
      aspect={frame}
      name="rollup"
      palette={palette}
      typography={{
        fontFamily: FONT.mono,
        fontSize: compact ? 48 : 60,
        fontWeight: 500,
        letterSpacing: "-.025em",
      }}
      area={{ top: "58%", height: lineHeight * 2, overflow: "hidden" }}
      cueLayout={{ top: 0, justifyContent: "flex-start", textAlign: "left" }}
      renderCue={(cue) => (
        <div
          data-caption-line
          style={{
            width: "100%",
            minHeight: lineHeight,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 24,
            borderLeft: `3px solid ${palette.accent}`,
          }}
        >
          <span
            style={{
              fontSize: 22,
              color: palette.accent,
              letterSpacing: ".12em",
              marginBottom: 12,
            }}
          >
            NARRATOR
          </span>
          <span>{cue.words.map((word) => word.text).join(" ")}</span>
        </div>
      )}
      cueKeyframes={(key, cue, index) => rollUp(key, cue, index, lineHeight)}
    />
  );
}
