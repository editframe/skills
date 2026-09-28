import { type Aspect } from "../src/primitives";
import {
  CaptionLines,
  CaptionStudy,
  visibleKeyframes,
  type CaptionCue,
  type CaptionWord,
} from "./shared/caption-studies";

export const duration = 10;
export const posterTime = 2.25;
export const aspect = "landscape" as const;

const palette = { background: "#f0e9da", color: "#302c26", accent: "#a35a36" };

/** Each word appears as it is spoken and stays until the cue ends. */
const paintOn = ({ key, start }: CaptionWord, cue: CaptionCue) =>
  visibleKeyframes(key, start, cue.end);

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const compact = frame !== "landscape";
  return (
    <CaptionStudy
      id={id}
      aspect={frame}
      name="paint"
      palette={palette}
      typography={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: compact ? 88 : 102,
        fontWeight: 400,
        letterSpacing: "-.035em",
      }}
      renderCue={(cue, index, key) => (
        <CaptionLines cue={cue} index={index} cueKey={key} gap=".23em" wordKeyframes={paintOn} />
      )}
    />
  );
}
