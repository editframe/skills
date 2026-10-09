import { FONT, type Aspect } from "../src/primitives";
import { CaptionLines, CaptionStudy } from "./shared/caption-studies";

export const duration = 10;
export const posterTime = 2.25;
export const aspect = "landscape" as const;

const palette = { background: "#14232c", color: "#fffdf5", accent: "#bccac9" };

/** Broadcast-style subtitles: whole cues on a dark translucent box. */
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const compact = frame !== "landscape";
  return (
    <CaptionStudy
      id={id}
      aspect={frame}
      name="classic"
      palette={palette}
      typography={{
        fontFamily: FONT.sans,
        fontSize: compact ? 57 : 64,
        fontWeight: 500,
        letterSpacing: "-.025em",
      }}
      renderCue={(cue, index, key) => (
        <CaptionLines
          cue={cue}
          index={index}
          cueKey={key}
          lineStyle={{ padding: "14px 27px", background: "#071014e8", borderRadius: 5 }}
          gap=".23em"
        />
      )}
    />
  );
}
