import type { Aspect } from "../src/primitives";
import {
  FocusStudy,
  AppHeader,
  Pointer,
  Box,
  Label,
  TypedText,
  motion,
  focus,
} from "./shared/FocusStudy";
export const duration = 12;
export const posterTime = 8.8;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <FocusStudy
      id={id}
      aspect={frame}
      duration={duration}
      title="Chat → one turn at a time"
      note="Compose. Send. A brief wait. An answer worth holding."
    >
      {(h, tall) => {
        const inputY = h - 72,
          questionY = tall ? 112 : 64,
          answerY = tall ? 242 : 143;
        const words = [
          ["Launch", "is", "planned", "for", "October", "8."],
          ["Design", "is", "approved.", "Copy", "review", "is", "next."],
        ];
        return (
          <>
            <Box h={h} />
            <AppHeader section="Page assistant" detail="Northstar / Launch brief" />
            <Box x={24} y={inputY} w={672} h={50} fill="#fafbfe" />
            <g style={motion("fct-input", duration)}>
              <TypedText
                id={`${id}-input`}
                text="Summarize this page."
                x={40}
                y={inputY + 32}
                size={20}
                duration={duration}
                times={[
                  8, 9.3, 10, 11.1, 12.5, 13.1, 14, 15.2, 16, 17.6, 19, 20, 21.4, 22, 23, 24, 25.3,
                  26, 27, 28,
                ]}
              />
            </g>
            <g style={motion("fct-placeholder", duration)}>
              <Label x={40} y={inputY + 32} size={17} color={focus.muted}>
                Ask a follow-up…
              </Label>
            </g>
            <circle cx="669" cy={inputY + 25} r="16" fill="#dbe1eb" />
            <circle
              cx="669"
              cy={inputY + 25}
              r="16"
              fill={focus.blue}
              style={motion("fct-send", duration)}
            />
            <path
              d={`M669 ${inputY + 32}V${inputY + 18}m-5 5 5-5 5 5`}
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <g style={motion("fct-question", duration)}>
              <Box x={375} y={questionY} w={319} h={49} fill="#eef2f8" stroke="#eef2f8" />
              <Label x={393} y={questionY + 31} size={17}>
                Summarize this page.
              </Label>
            </g>
            <g style={motion("fct-thinking", duration)}>
              <Box x={24} y={answerY} w={90} h={40} fill="#f3f5fa" stroke="#f3f5fa" />
              {[0, 1, 2].map((i) => (
                <circle
                  key={i}
                  cx={47 + i * 17}
                  cy={answerY + 20}
                  r="3.5"
                  fill={focus.muted}
                  style={{ animation: `fct-dot .6s ${i * 0.13}s ease-in-out infinite alternate` }}
                />
              ))}
            </g>
            <g style={motion("fct-response", duration)}>
              <Box x={24} y={answerY} w={575} h={104} fill="#fff" stroke="#edf0f5" />
              {words.map((line, l) => (
                <text key={l} x="42" y={answerY + 30 + l * 26} fontSize="18" fill={focus.ink}>
                  {line.map((word, i) => (
                    <tspan key={word + i} style={motion(`fct-word-${l}-${i}`, duration)}>
                      {word + " "}
                    </tspan>
                  ))}
                </text>
              ))}
            </g>
            <g style={motion("fct-source", duration)}>
              <rect x="42" y={answerY + 70} width="158" height="23" rx="5" fill="#f1f4f8" />
              <Label x={51} y={answerY + 86} size={11} color={focus.muted}>
                ↗ Launch brief · 1 source
              </Label>
            </g>
            <g style={motion("fct-pointer", duration)}>
              <Pointer />
            </g>
            <style>
              {`@keyframes fct-source {0%,74%{opacity:0}77%,100%{opacity:1}} @keyframes fct-pointer {0%,20%{opacity:0;transform:translate(608px,${inputY + 39}px)}22%{opacity:1;transform:translate(608px,${inputY + 39}px);animation-timing-function:cubic-bezier(.2,.7,.3,1)}27%,33%{opacity:1;transform:translate(669px,${inputY + 25}px)}38%,100%{opacity:0;transform:translate(687px,${inputY + 39}px)}} @keyframes fct-input {0%,31.9%{opacity:1}32%,100%{opacity:0}} @keyframes fct-placeholder {0%,33%{opacity:0}36%,100%{opacity:1}} @keyframes fct-send {0%,26%{opacity:0}28%,31%{opacity:1}32%,100%{opacity:0}} @keyframes fct-question {0%,32%{opacity:0;transform:translateY(12px);animation-timing-function:cubic-bezier(.2,.7,.3,1)}36%,100%{opacity:1;transform:translateY(0)}} @keyframes fct-thinking {0%,37%{opacity:0}39%,46%{opacity:1}47%,100%{opacity:0}} @keyframes fct-dot {from{transform:translateY(0);opacity:.4}to{transform:translateY(-3px);opacity:1}} @keyframes fct-response {0%,47%{opacity:0;transform:translateY(3px)}49%,100%{opacity:1;transform:translateY(0)}}` +
                words
                  .map((line, l) =>
                    line
                      .map((_, i) => {
                        const t = (l ? 61 : 49) + i * 1.7;
                        return `@keyframes fct-word-${l}-${i}{0%,${t - 0.001}%{opacity:0}${t}%,100%{opacity:1}}`;
                      })
                      .join(""),
                  )
                  .join("")}
            </style>
          </>
        );
      }}
    </FocusStudy>
  );
}
