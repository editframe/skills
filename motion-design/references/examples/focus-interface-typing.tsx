import type { Aspect } from "../src/primitives";
import { FocusStudy, AppHeader, Box, Label, TypedText, motion, focus } from "./shared/FocusStudy";
export const duration = 9;
export const posterTime = 4.8;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <FocusStudy
      id={id}
      aspect={frame}
      duration={duration}
      title="Typing → a narrower result"
      note="Uneven keystrokes. A short pause. One matching page."
    >
      {(h, tall) => {
        const field = tall ? 100 : 72,
          result = field + (tall ? 112 : 85),
          step = tall ? 116 : 49,
          rowH = step - 9;
        return (
          <>
            <Box h={h} />
            <AppHeader section="Search workspace" />
            <Box x={28} y={field} w={664} h={60} fill="#fafbfe" />
            <rect
              x="28"
              y={field}
              width="664"
              height="60"
              rx="12"
              fill="none"
              stroke={focus.blue}
              strokeWidth="1.7"
              style={motion("fit-focus", duration)}
            />
            <g transform={`translate(53 ${field + 29})`}>
              <circle r="7" stroke={focus.muted} strokeWidth="1.5" fill="none" />
              <path d="m5 5 5 5" stroke={focus.muted} strokeWidth="1.5" />
            </g>
            <TypedText
              id={`${id}-query`}
              text="Roadmap"
              x={80}
              y={field + 38}
              size={21}
              duration={duration}
              times={[19, 21, 23.7, 28, 30.3, 32, 35]}
            />
            {[
              ["Roadmap", "Product · Today"],
              ["Release notes", "Engineering · Yesterday"],
              ["Brand guidelines", "Design · Sep 12"],
            ].map(([title, meta], i) => (
              <g
                key={title}
                transform={`translate(28 ${result + i * step})`}
                style={i ? motion(`fit-other-${i}`, duration) : undefined}
              >
                <Box
                  w={664}
                  h={rowH}
                  fill={i ? "#fff" : "#fafbfe"}
                  stroke={i ? "#edf0f5" : focus.line}
                />
                {i === 0 && (
                  <rect
                    width="664"
                    height={rowH}
                    rx="12"
                    fill={focus.lilac}
                    style={motion("fit-match", duration)}
                  />
                )}
                <rect
                  x="18"
                  y={rowH / 2 - 12}
                  width="18"
                  height="24"
                  rx="3"
                  fill="none"
                  stroke={focus.muted}
                  strokeWidth="1.2"
                />
                <path
                  d={`M 22 ${rowH / 2 - 5}h10 M22 ${rowH / 2}h10 M22 ${rowH / 2 + 5}h7`}
                  stroke={focus.muted}
                />
                <Label x={52} y={rowH / 2 + 6} size={16} weight={i ? 400 : 500}>
                  {title}
                </Label>
                <Label x={445} y={rowH / 2 + 5} size={12} color={focus.muted}>
                  {meta}
                </Label>
              </g>
            ))}
            <g style={motion("fit-match", duration)}>
              <Label x={30} y={result + rowH + 28} size={14} color={focus.muted}>
                1 result in Northstar
              </Label>
            </g>
            <path d={`M28 ${h - 30}H692`} stroke={focus.line} />
            <Label x={30} y={h - 12} size={11} color={focus.muted}>
              ↑ ↓ Navigate
            </Label>
            <Label x={155} y={h - 12} size={11} color={focus.muted}>
              ↵ Open page
            </Label>
            <Label x={626} y={h - 12} size={11} color={focus.muted}>
              esc Close
            </Label>
            <style>{`@keyframes fit-focus {0%,9%{opacity:0}12%,100%{opacity:1}} @keyframes fit-other-1 {0%,24%{opacity:1}27%,100%{opacity:0}} @keyframes fit-other-2 {0%,19%{opacity:1}22%,100%{opacity:0}} @keyframes fit-match {0%,40%{opacity:0}44%,100%{opacity:1}}`}</style>
          </>
        );
      }}
    </FocusStudy>
  );
}
