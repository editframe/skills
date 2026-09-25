import type { CSSProperties } from "react";
import { Solo, FONT, type Aspect } from "../../src/primitives";

export type CaptionStyle = "classic" | "highlight" | "karaoke" | "pop" | "paint" | "rollup";
export const captionDuration = 10;
// Authored silent transcript. Replace these absolute word timestamps with aligned
// speech timings when using the styles over audio. Gaps intentionally stay empty.
export const captionCues = [
  {
    start: 0.5,
    end: 3.25,
    words: ["Find", "the", "quiet", "moments."],
    times: [0.5, 0.88, 1.13, 1.85],
    ends: [0.85, 1.1, 1.8, 2.65],
  },
  {
    start: 3.5,
    end: 6.25,
    words: ["Let", "the", "story", "breathe."],
    times: [3.5, 3.87, 4.12, 4.8],
    ends: [3.84, 4.08, 4.75, 5.65],
  },
  {
    start: 6.5,
    end: 9.3,
    words: ["Make", "every", "word", "matter."],
    times: [6.5, 6.95, 7.5, 8.05],
    ends: [6.9, 7.45, 8, 8.75],
  },
];
const pct = (seconds: number) => `${(seconds / captionDuration) * 100}%`;
const anim = (name: string): CSSProperties => ({
  animation: `${name} ${captionDuration}s linear both`,
});
const visible = (name: string, start: number, end: number) =>
  `@keyframes ${name}{0%,${pct(start - 0.001)}{visibility:hidden}${pct(start)},${pct(end - 0.001)}{visibility:visible}${pct(end)},100%{visibility:hidden}}`;
const palettes = {
  classic: ["#14232c", "#fffdf5", "#bccac9"],
  highlight: ["#25243b", "#faf6ff", "#d6f879"],
  karaoke: ["#332938", "#bdb0bd", "#ffdab0"],
  pop: ["#d6e5bc", "#fffef2", "#233629"],
  paint: ["#f0e9da", "#302c26", "#a35a36"],
  rollup: ["#132e2e", "#f0f2e8", "#a4d3b8"],
} as const;

export function CaptionStudy({
  id,
  aspect,
  variant,
}: {
  id: string;
  aspect: Aspect;
  variant: CaptionStyle;
}) {
  const tall = aspect === "portrait";
  const compact = aspect !== "landscape";
  const [background, color, accent] = palettes[variant];
  const prefix = `caption-study-${variant}`;
  const serif = variant === "karaoke" || variant === "paint";
  const size =
    variant === "classic"
      ? compact
        ? 57
        : 64
      : variant === "rollup"
        ? compact
          ? 48
          : 60
        : compact
          ? 88
          : 102;
  const lineHeight = variant === "rollup" ? (compact ? 150 : 162) : size * 1.35;
  return (
    <Solo id={id} aspect={aspect} duration={captionDuration} background={background}>
      <div
        data-caption-style={variant}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          background,
          color,
          fontFamily: serif
            ? "Georgia, 'Times New Roman', serif"
            : variant === "rollup"
              ? FONT.mono
              : FONT.sans,
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
            top: variant === "rollup" ? "58%" : undefined,
            bottom: variant === "rollup" ? undefined : tall ? "25%" : "19%",
            height: variant === "rollup" ? lineHeight * 2 : size * 3.3,
            overflow: variant === "rollup" ? "hidden" : "visible",
          }}
        >
          {captionCues.map((cue, index) => {
            const key = `${prefix}-cue-${index}`;
            const roll = variant === "rollup";
            const pop = variant === "pop";
            return (
              <div
                key={key}
                data-caption-cue={index}
                style={{
                  position: "absolute",
                  inset: roll ? undefined : 0,
                  left: 0,
                  right: 0,
                  top: roll ? 0 : undefined,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: roll ? "flex-start" : "center",
                  flexDirection: "column",
                  fontSize: size,
                  fontWeight: serif ? 400 : variant === "classic" || roll ? 500 : 800,
                  letterSpacing: serif ? "-.035em" : "-.025em",
                  textAlign: roll ? "left" : "center",
                  lineHeight: 1.3,
                  ...anim(key),
                }}
              >
                {roll ? (
                  <div
                    data-caption-line
                    style={{
                      width: "100%",
                      minHeight: lineHeight,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      paddingLeft: 24,
                      borderLeft: `3px solid ${accent}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                        color: accent,
                        letterSpacing: ".12em",
                        marginBottom: 12,
                      }}
                    >
                      NARRATOR
                    </span>
                    <span>{cue.words.join(" ")}</span>
                  </div>
                ) : pop ? (
                  cue.words.map((word, w) => {
                    const wordKey = `${key}-word-${w}`;
                    const end = cue.times[w + 1] ?? cue.end;
                    return (
                      <span
                        key={wordKey}
                        data-caption-word={`${index}-${w}`}
                        style={{
                          position: "absolute",
                          fontSize: compact ? 138 : 176,
                          textTransform: "uppercase",
                          WebkitTextStroke: `3px ${accent}`,
                          paintOrder: "stroke fill",
                          textShadow: `0 7px 0 ${accent}`,
                          animation: `${wordKey}-visible 10s linear both, ${wordKey}-scale 10s linear both`,
                        }}
                      >
                        {word}
                        <style>
                          {visible(`${wordKey}-visible`, cue.times[w], end)}
                          {`@keyframes ${wordKey}-scale{0%,${pct(cue.times[w])}{transform:translateY(10px) scale(.88)}${pct(cue.times[w] + 0.11)}{transform:translateY(-2px) scale(1.045)}${pct(cue.times[w] + 0.23)},100%{transform:translateY(0) scale(1)}}`}
                        </style>
                      </span>
                    );
                  })
                ) : (
                  <div
                    data-caption-line
                    style={{
                      padding: variant === "classic" ? "14px 27px" : 0,
                      background: variant === "classic" ? "#071014e8" : undefined,
                      borderRadius: variant === "classic" ? 5 : 0,
                    }}
                  >
                    {[0, 1].map((line) => (
                      <div
                        key={line}
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: variant === "highlight" ? ".04em" : ".23em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cue.words.slice(line * 2, line * 2 + 2).map((word, local) => {
                          const w = line * 2 + local;
                          const wordKey = `${key}-word-${w}`;
                          const start = cue.times[w],
                            end = cue.ends[w];
                          return (
                            <span
                              key={wordKey}
                              data-caption-word={`${index}-${w}`}
                              style={{
                                position: "relative",
                                display: "inline-block",
                                padding: variant === "highlight" ? ".04em .15em" : undefined,
                                borderRadius: variant === "highlight" ? ".16em" : undefined,
                                fontStyle: variant === "karaoke" ? "italic" : undefined,
                                ...anim(wordKey),
                              }}
                            >
                              {word}
                              {variant === "karaoke" && (
                                <span
                                  aria-hidden="true"
                                  data-caption-fill
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    color: accent,
                                    ...anim(`${wordKey}-fill`),
                                  }}
                                >
                                  {word}
                                </span>
                              )}
                              <style>
                                {variant === "highlight"
                                  ? `@keyframes ${wordKey}{0%,${pct(start - 0.001)}{background:transparent;color:${color}}${pct(start)},${pct(end - 0.001)}{background:${accent};color:${background}}${pct(end)},100%{background:transparent;color:${color}}`
                                  : variant === "karaoke"
                                    ? `@keyframes ${wordKey}-fill{0%,${pct(start)}{clip-path:inset(0 100% 0 0)}${pct(end)},100%{clip-path:inset(0 0% 0 0)}}`
                                    : variant === "paint"
                                      ? visible(wordKey, start, cue.end)
                                      : ""}
                              </style>
                            </span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
                <style>
                  {roll
                    ? `@keyframes ${key}{0%,${pct(cue.start - 0.001)}{visibility:hidden;transform:translateY(${lineHeight * 2}px);opacity:1}${pct(cue.start)}{visibility:visible;transform:translateY(${lineHeight * 2}px);opacity:1}${pct(cue.start + 0.2)}{visibility:visible;transform:translateY(${lineHeight}px);opacity:1}${index < 2 ? `${pct(captionCues[index + 1].start)}{transform:translateY(${lineHeight}px);opacity:1}${pct(captionCues[index + 1].start + 0.2)}{transform:translateY(0);opacity:.65}` : ""}${index === 0 ? `${pct(captionCues[2].start)}{transform:translateY(0);opacity:.65}${pct(captionCues[2].start + 0.2)}{transform:translateY(${-lineHeight}px);opacity:0}` : ""}${pct(9.3)}{visibility:visible;transform:translateY(${(index - 1) * lineHeight}px);opacity:${index === 0 ? 0 : index === 1 ? 0.65 : 1}}${pct(9.5)},100%{visibility:hidden;transform:translateY(${(index - 1) * lineHeight}px);opacity:${index === 0 ? 0 : index === 1 ? 0.65 : 1}}}`
                    : visible(key, cue.start, cue.end)}
                </style>
              </div>
            );
          })}
        </div>
      </div>
    </Solo>
  );
}
